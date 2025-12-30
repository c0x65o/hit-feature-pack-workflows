import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { workflowRunEvents, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun, hasWorkflowAclAccess, isAdmin } from './_workflow-access';

function extractRunId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/workflows/runs/{runId}/events
  const idx = parts.findIndex((p) => p === 'runs');
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return null;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/workflows/runs/[runId]/events
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const runId = extractRunId(request);
    if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 });

    const workflowId = await getWorkflowIdForRun(db, runId);
    if (!workflowId) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

    const canView =
      isAdmin(user.roles) || (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_VIEW_RUNS));
    if (!canView) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const events = await db
      .select()
      .from(workflowRunEvents)
      .where(eq(workflowRunEvents.runId, runId))
      .orderBy(asc(workflowRunEvents.seq))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ events, limit, offset });
  } catch (error) {
    console.error('[workflows] Get run events error:', error);
    return NextResponse.json({ error: 'Failed to fetch run events' }, { status: 500 });
  }
}

