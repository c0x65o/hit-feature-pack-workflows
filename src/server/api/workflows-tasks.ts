import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gt, inArray, or } from 'drizzle-orm';
import { resolveUserPrincipals } from '@hit/acl-utils';

import { getDb } from '@/lib/db';
import { workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { hasWorkflowAclAccess, isAdmin } from './_workflow-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function asBool(x: string | null): boolean {
  if (!x) return false;
  const v = x.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}

function asInt(x: string | null, def: number): number {
  const n = x ? Number.parseInt(x, 10) : Number.NaN;
  return Number.isFinite(n) ? n : def;
}

type AssignedToShape = {
  users?: string[];
  roles?: string[];
  groups?: string[];
};

function parseAssignedTo(x: unknown): AssignedToShape {
  if (!x || typeof x !== 'object') return {};
  const o = x as any;
  return {
    users: Array.isArray(o.users) ? o.users.map((u: any) => String(u)).filter(Boolean) : undefined,
    roles: Array.isArray(o.roles) ? o.roles.map((r: any) => String(r)).filter(Boolean) : undefined,
    groups: Array.isArray(o.groups) ? o.groups.map((g: any) => String(g)).filter(Boolean) : undefined,
  };
}

function matchesAssignment(assignedTo: AssignedToShape, principals: { userId: string; userEmail: string; roles: string[]; groupIds: string[] }): boolean {
  const users = assignedTo.users || [];
  const roles = assignedTo.roles || [];
  const groups = assignedTo.groups || [];

  // If nothing specified, treat as unassigned (not visible in "inbox").
  if (users.length === 0 && roles.length === 0 && groups.length === 0) return false;

  const userIds = [principals.userId, principals.userEmail].filter(Boolean);
  if (users.length > 0 && userIds.some((u) => users.includes(u))) return true;
  if (roles.length > 0 && principals.roles.some((r) => roles.includes(r))) return true;
  if (groups.length > 0 && principals.groupIds.some((g) => groups.includes(g))) return true;
  return false;
}

/**
 * GET /api/workflows/tasks
 *
 * Query:
 * - limit: number (default 50, max 200)
 * - includeResolved: boolean (default false)
 * - resolvedWithinHours: number (default 24)
 *
 * Behavior:
 * - Admins: see all open tasks (+ optionally recently resolved).
 * - Non-admins: only tasks that (a) match assignment and (b) user has WORKFLOWS_APPROVE on the workflow.
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.min(Math.max(asInt(url.searchParams.get('limit'), 50), 1), 200);
    const includeResolved = asBool(url.searchParams.get('includeResolved'));
    const resolvedWithinHours = Math.min(Math.max(asInt(url.searchParams.get('resolvedWithinHours'), 24), 1), 24 * 30);
    const since = new Date(Date.now() - resolvedWithinHours * 60 * 60 * 1000);

    const admin = isAdmin(user.roles);

    const where = includeResolved
      ? or(
          eq(workflowTasks.status, 'open'),
          and(inArray(workflowTasks.status, ['approved', 'denied']), gt(workflowTasks.decidedAt, since))
        )
      : eq(workflowTasks.status, 'open');

    const rows = await db
      .select({
        task: workflowTasks,
        runWorkflowId: workflowRuns.workflowId,
      })
      .from(workflowTasks)
      .innerJoin(workflowRuns, eq(workflowTasks.runId, workflowRuns.id))
      .where(where as any)
      .orderBy(desc(workflowTasks.createdAt))
      .limit(limit * 4); // fetch more to allow filtering

    if (rows.length === 0) return NextResponse.json({ items: [] });

    type Row = { task: any; runWorkflowId: string };
    const typedRows = rows as unknown as Row[];

    if (admin) {
      return NextResponse.json({
        items: typedRows.slice(0, limit).map((r: Row) => ({ ...r.task, workflowId: r.runWorkflowId })),
      });
    }

    const principals = await resolveUserPrincipals({
      request,
      user: { sub: user.sub, email: user.email || '', roles: user.roles || [] },
    });

    // Filter by assignment first.
    const assigned = typedRows.filter((r: Row) => matchesAssignment(parseAssignedTo(r.task.assignedTo), principals));
    if (assigned.length === 0) return NextResponse.json({ items: [] });

    // ACL filter per workflow.
    const workflowIds: string[] = Array.from(new Set(assigned.map((r: Row) => String(r.runWorkflowId))));
    const canApproveByWorkflowId = new Map<string, boolean>();
    for (const wid of workflowIds) {
      const ok = await hasWorkflowAclAccess(db, wid, request, WORKFLOW_PERMISSIONS.WORKFLOWS_APPROVE);
      canApproveByWorkflowId.set(wid, ok);
    }

    const out = assigned
      .filter((r: Row) => canApproveByWorkflowId.get(String(r.runWorkflowId)) === true)
      .slice(0, limit)
      .map((r: Row) => ({ ...r.task, workflowId: r.runWorkflowId }));

    return NextResponse.json({ items: out });
  } catch (error) {
    console.error('[workflows] List global tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

