import { and, eq, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { resolveUserPrincipals } from '@hit/acl-utils';

import { getDb } from '@/lib/db';
import { workflowRunEvents, workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun, hasWorkflowAclAccess, isAdmin } from './_workflow-access';
import { publishWorkflowEvent } from '../utils/publish-event';

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

function matchesAssignment(
  assignedTo: AssignedToShape,
  principals: { userId: string; userEmail: string; roles: string[]; groupIds: string[] }
): boolean {
  const users = assignedTo.users || [];
  const roles = assignedTo.roles || [];
  const groups = assignedTo.groups || [];

  // If nothing specified, treat as unassigned (nobody can act).
  if (users.length === 0 && roles.length === 0 && groups.length === 0) return false;

  const userIds = [principals.userId, principals.userEmail].filter(Boolean);
  if (users.length > 0 && userIds.some((u) => users.includes(u))) return true;
  if (roles.length > 0 && principals.roles.some((r) => roles.includes(r))) return true;
  if (groups.length > 0 && principals.groupIds.some((g) => groups.includes(g))) return true;
  return false;
}

export async function actOnTask(
  request: NextRequest,
  opts: { action: 'approve' | 'deny' }
): Promise<{ ok: boolean; status: number; body: any }> {
  const { action } = opts;
  const db = getDb();
  const user = extractUserFromRequest(request);
  if (!user?.sub) return { ok: false, status: 401, body: { error: 'Unauthorized' } };

  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/workflows/runs/{runId}/tasks/{taskId}/{action}
  const runIdx = parts.findIndex((p) => p === 'runs');
  const taskIdx = parts.findIndex((p) => p === 'tasks');
  const runId = runIdx >= 0 ? parts[runIdx + 1] || null : null;
  const taskId = taskIdx >= 0 ? parts[taskIdx + 1] || null : null;

  if (!runId || !taskId) return { ok: false, status: 400, body: { error: 'Missing runId or taskId' } };

  const workflowId = await getWorkflowIdForRun(db, runId);
  if (!workflowId) return { ok: false, status: 404, body: { error: 'Run not found' } };

  const canApprove =
    isAdmin(user.roles) || (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_APPROVE));
  if (!canApprove) return { ok: false, status: 403, body: { error: 'Not authorized' } };

  const [task] = await db
    .select()
    .from(workflowTasks)
    .where(and(eq(workflowTasks.id, taskId), eq(workflowTasks.runId, runId)))
    .limit(1);
  if (!task) return { ok: false, status: 404, body: { error: 'Task not found' } };

  if (task.status !== 'open') {
    return { ok: false, status: 409, body: { error: `Task is not open (status=${task.status})` } };
  }

  // Enforce assignment match (admins bypass). Prefer roles for org-wide approvals, e.g.:
  // - assignedTo.roles = ['admin'] => any user with the 'admin' role can approve
  if (!isAdmin(user.roles)) {
    const principals = await resolveUserPrincipals({
      request,
      user: { sub: user.sub, email: user.email || '', roles: user.roles || [] },
    });
    const assignedTo = parseAssignedTo((task as any).assignedTo);
    if (!matchesAssignment(assignedTo, principals)) {
      return { ok: false, status: 403, body: { error: 'Not assigned to this task' } };
    }
  }

  const body = await request.json().catch(() => ({}));
  const comment = typeof body?.comment === 'string' ? body.comment : null;

  const decidedAt = new Date();
  const nowMs = Date.now();
  const newStatus = action === 'approve' ? 'approved' : 'denied';

  await db
    .update(workflowTasks)
    .set({
      status: newStatus,
      decision: { action: newStatus, comment: comment || undefined },
      decidedByUserId: user.sub,
      decidedAt,
    })
    .where(eq(workflowTasks.id, taskId));

  // Resume run (MVP): mark running on approve; mark failed on deny.
  const runStatus = action === 'approve' ? 'running' : 'failed';
  await db.update(workflowRuns).set({ status: runStatus }).where(eq(workflowRuns.id, runId));

  // Append events
  const [maxRow] = await db
    .select({ max: sql<number>`max(${workflowRunEvents.seq})` })
    .from(workflowRunEvents)
    .where(eq(workflowRunEvents.runId, runId));
  const baseSeq = Number(maxRow?.max || 0);

  await db.insert(workflowRunEvents).values([
    {
      runId,
      seq: baseSeq + 1,
      tMs: nowMs,
      name: `task.${newStatus}`,
      level: action === 'approve' ? 'info' : 'warn',
      nodeId: task.nodeId || undefined,
      data: { taskId, decidedByUserId: user.sub, comment: comment || undefined },
    },
    {
      runId,
      seq: baseSeq + 2,
      tMs: nowMs,
      name: action === 'approve' ? 'run.resumed' : 'run.failed',
      level: action === 'approve' ? 'info' : 'error',
      nodeId: task.nodeId || undefined,
      data: { reason: 'human_task', taskId },
    },
  ]);

  // Best-effort real-time update so inboxes refresh immediately
  publishWorkflowEvent('workflows.task.updated', {
    runId,
    taskId,
    workflowId,
    status: newStatus,
    runStatus,
    decidedAt: decidedAt.toISOString(),
    decidedByUserId: user.sub,
    comment: comment || undefined,
  }).catch(() => {});

  return { ok: true, status: 200, body: { success: true, runId, taskId, status: newStatus, runStatus } };
}

