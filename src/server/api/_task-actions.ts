import { and, eq, sql } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { resolveUserPrincipals } from '@/lib/acl-utils';

import { getDb } from '@/lib/db';
import { workflowRunEvents, workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun, hasWorkflowAclAccess, isAdmin } from './_workflow-access';
import { publishWorkflowEvent, publishWorkflowInboxEvent } from '../utils/publish-event';

type ApplyAction = {
  kind?: 'api';
  method?: string;
  path?: string;
  body?: Record<string, unknown>;
};

function parseApplyAction(task: any): ApplyAction | null {
  const prompt = task?.prompt && typeof task.prompt === 'object' ? task.prompt : null;
  const apply = prompt && typeof (prompt as any).applyAction === 'object' ? (prompt as any).applyAction : null;
  if (!apply) return null;
  const kind = typeof apply.kind === 'string' ? apply.kind : 'api';
  const method = typeof apply.method === 'string' ? apply.method.toUpperCase() : 'POST';
  const path = typeof apply.path === 'string' ? apply.path : null;
  const body = apply.body && typeof apply.body === 'object' ? apply.body : undefined;
  if (!path) return null;
  return { kind: kind as any, method, path, body };
}

async function callApplyAction(request: NextRequest, action: ApplyAction, extraBody: Record<string, unknown>) {
  const url = new URL(request.url);
  const target = new URL(String(action.path), url.origin);
  const auth = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');

  const res = await fetch(target.toString(), {
    method: action.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ ...(action.body || {}), ...extraBody }),
  });

  const text = await res.text().catch(() => '');
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { ok: res.ok, status: res.status, json, text };
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

function toTargets(assignedTo: any): Array<{ type: 'user' | 'group' | 'role'; id: string }> {
  const roles = Array.isArray(assignedTo?.roles) ? assignedTo.roles : [];
  const users = Array.isArray(assignedTo?.users) ? assignedTo.users : [];
  const groups = Array.isArray(assignedTo?.groups) ? assignedTo.groups : [];
  return [
    ...roles.map((id: any) => ({ type: 'role' as const, id: String(id) })),
    ...groups.map((id: any) => ({ type: 'group' as const, id: String(id) })),
    ...users.map((id: any) => ({ type: 'user' as const, id: String(id) })),
  ].filter((t) => t.id && t.id.trim());
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

  // Atomic update: only one approver should win for group/role fan-out tasks.
  // If another actor already decided, this will update 0 rows and we return 409.
  const [updated] = await db
    .update(workflowTasks)
    .set({
      status: newStatus,
      decision: { action: newStatus, comment: comment || undefined },
      decidedByUserId: user.sub,
      decidedAt,
    })
    .where(and(eq(workflowTasks.id, taskId), eq(workflowTasks.status, 'open')))
    .returning();
  if (!updated) {
    return { ok: false, status: 409, body: { error: 'Task was already decided by someone else' } };
  }

  // Apply (optional): if this task carries an applyAction, run it on approve.
  // This is how lifecycle gates become "real workflows": approve -> apply the mutation.
  const applyAction = action === 'approve' ? parseApplyAction(task as any) : null;
  let runStatus: string = action === 'approve' ? 'running' : 'failed';
  let applyResult: any = null;
  let applyError: any = null;

  if (applyAction?.kind === 'api') {
    const result = await callApplyAction(request, applyAction, { workflowRunId: runId, workflowTaskId: taskId });
    applyResult = { status: result.status, ok: result.ok, json: result.json ?? undefined };
    if (result.ok) {
      runStatus = 'succeeded';
    } else {
      runStatus = 'failed';
      applyError = {
        status: result.status,
        body: result.json ?? undefined,
        text: result.json ? undefined : result.text?.slice(0, 2000),
      };
    }
  }

  await db
    .update(workflowRuns)
    .set({
      status: runStatus as any,
      ...(runStatus === 'succeeded' || runStatus === 'failed'
        ? {
            endedAt: decidedAt,
            ...(applyError ? { error: applyError } : {}),
            ...(applyResult && runStatus === 'succeeded' ? { output: applyResult } : {}),
          }
        : {}),
    } as any)
    .where(eq(workflowRuns.id, runId));

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
      name:
        action === 'approve'
          ? applyAction
            ? runStatus === 'succeeded'
              ? 'apply.succeeded'
              : 'apply.failed'
            : 'run.resumed'
          : 'run.failed',
      level:
        action === 'approve'
          ? applyAction
            ? runStatus === 'succeeded'
              ? 'info'
              : 'error'
            : 'info'
          : 'error',
      nodeId: task.nodeId || undefined,
      data: applyAction ? { taskId, applyResult: applyResult || undefined, applyError: applyError || undefined } : { reason: 'human_task', taskId },
    },
    ...(action === 'approve' && applyAction && (runStatus === 'succeeded' || runStatus === 'failed')
      ? [
          {
            runId,
            seq: baseSeq + 3,
            tMs: nowMs,
            name: runStatus === 'succeeded' ? 'run.succeeded' : 'run.failed',
            level: runStatus === 'succeeded' ? 'info' : 'error',
            nodeId: task.nodeId || undefined,
            data: { taskId },
          },
        ]
      : []),
  ]);

  // Best-effort real-time update so inboxes refresh immediately
  const updatePayload = {
    runId,
    taskId,
    workflowId,
    status: newStatus,
    runStatus,
    decidedAt: decidedAt.toISOString(),
    decidedByUserId: user.sub,
    comment: comment || undefined,
    assignedTo: (task as any).assignedTo || undefined,
  };

  publishWorkflowEvent('workflows.task.updated', updatePayload).catch(() => {});
  publishWorkflowInboxEvent(
    { kind: 'task.updated' },
    {
      task: {
        id: taskId,
        runId,
        status: newStatus,
        type: (task as any).type,
        nodeId: (task as any).nodeId,
        assignedTo: (task as any).assignedTo,
        prompt: (task as any).prompt,
        decision: { action: newStatus, comment: comment || undefined },
        decidedAt: decidedAt.toISOString(),
        decidedByUserId: user.sub,
      },
    },
    toTargets((task as any).assignedTo || {})
  ).catch(() => {});

  return {
    ok: true,
    status: 200,
    body: { success: true, runId, taskId, status: newStatus, runStatus, applyResult: applyResult || undefined, applyError: applyError || undefined },
  };
}

