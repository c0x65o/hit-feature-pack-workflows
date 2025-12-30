import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  workflowRuns,
  workflowVersions,
  WORKFLOW_PERMISSIONS,
  workflowRunEvents,
} from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { hasWorkflowAclAccess, isAdmin, workflowExists } from './_workflow-access';

function extractWorkflowId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/workflows/{id}/runs
  const idx = parts.findIndex((p) => p === 'workflows');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/workflows/[id]/runs
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workflowId = extractWorkflowId(request);
    if (!workflowId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const canViewRuns =
      isAdmin(user.roles) ||
      (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_VIEW_RUNS));
    if (!canViewRuns) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '50', 10), 200));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowRuns)
      .where(eq(workflowRuns.workflowId, workflowId));
    const total = Number(countRow?.count || 0);

    const items = await db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.workflowId, workflowId))
      .orderBy(desc(workflowRuns.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ items, total, limit, offset });
  } catch (error) {
    console.error('[workflows] List runs error:', error);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}

/**
 * POST /api/workflows/[id]/runs
 *
 * MVP behavior:
 * - creates a run in running state
 * - appends a run.start event
 * - optional: if body.createApprovalTask is true, immediately creates a waiting approval task (for early gating use-cases)
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workflowId = extractWorkflowId(request);
    if (!workflowId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // If workflow doesn't exist, still avoid leakage by returning 404.
    if (!(await workflowExists(db, workflowId))) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const canRun =
      isAdmin(user.roles) || (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_RUN));
    if (!canRun) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const input = body?.input && typeof body.input === 'object' ? body.input : null;
    const correlationId = typeof body?.correlationId === 'string' ? body.correlationId : null;
    const idempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : null;

    // Choose version: explicit workflowVersionId, else latest published, else latest draft.
    let workflowVersionId: string | null = typeof body?.workflowVersionId === 'string' ? body.workflowVersionId : null;
    if (!workflowVersionId) {
      const [published] = await db
        .select()
        .from(workflowVersions)
        .where(and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.status, 'published')))
        .orderBy(desc(workflowVersions.version))
        .limit(1);
      const [draft] = await db
        .select()
        .from(workflowVersions)
        .where(and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.status, 'draft')))
        .orderBy(desc(workflowVersions.version))
        .limit(1);
      workflowVersionId = (published?.id || draft?.id) ?? null;
    }

    if (!workflowVersionId) {
      return NextResponse.json({ error: 'No workflow version found (publish or create a draft first)' }, { status: 400 });
    }

    const startedAt = new Date();
    const nowMs = Date.now();

    const [run] = await db
      .insert(workflowRuns)
      .values({
        workflowId,
        workflowVersionId,
        status: 'running',
        trigger: { type: 'api' },
        input: input || undefined,
        correlationId: correlationId || undefined,
        idempotencyKey: idempotencyKey || undefined,
        createdByUserId: user.sub,
        startedAt,
      })
      .returning();

    await db.insert(workflowRunEvents).values({
      runId: run.id,
      seq: 1,
      tMs: nowMs,
      name: 'run.start',
      level: 'info',
      data: {
        workflowId,
        workflowVersionId,
        trigger: { type: 'api' },
        createdByUserId: user.sub,
      },
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error('[workflows] Create run error:', error);
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 });
  }
}

