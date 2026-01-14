import { and, eq, sql } from 'drizzle-orm';
import { resolveUserPrincipals } from '@hit/feature-pack-auth-core/server/lib/acl-utils';
import { getDb } from '@/lib/db';
import { workflowRunEvents, workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun, hasWorkflowAclAccess, isAdmin } from './_workflow-access';
function parseApplyAction(task) {
    const prompt = task?.prompt && typeof task.prompt === 'object' ? task.prompt : null;
    const apply = prompt && typeof prompt.applyAction === 'object' ? prompt.applyAction : null;
    if (!apply)
        return null;
    const kind = typeof apply.kind === 'string' ? apply.kind : 'api';
    const method = typeof apply.method === 'string' ? apply.method.toUpperCase() : 'POST';
    const path = typeof apply.path === 'string' ? apply.path : null;
    const body = apply.body && typeof apply.body === 'object' ? apply.body : undefined;
    if (!path)
        return null;
    return { kind: kind, method, path, body };
}
async function callApplyAction(request, action, extraBody) {
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
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        json = null;
    }
    return { ok: res.ok, status: res.status, json, text };
}
function parseAssignedTo(x) {
    if (!x || typeof x !== 'object')
        return {};
    const o = x;
    return {
        users: Array.isArray(o.users) ? o.users.map((u) => String(u)).filter(Boolean) : undefined,
        roles: Array.isArray(o.roles) ? o.roles.map((r) => String(r)).filter(Boolean) : undefined,
        groups: Array.isArray(o.groups) ? o.groups.map((g) => String(g)).filter(Boolean) : undefined,
    };
}
function matchesAssignment(assignedTo, principals) {
    const users = assignedTo.users || [];
    const roles = assignedTo.roles || [];
    const groups = assignedTo.groups || [];
    // If nothing specified, treat as unassigned (nobody can act).
    if (users.length === 0 && roles.length === 0 && groups.length === 0)
        return false;
    const userIds = [principals.userId, principals.userEmail].filter(Boolean);
    if (users.length > 0 && userIds.some((u) => users.includes(u)))
        return true;
    if (roles.length > 0 && principals.roles.some((r) => roles.includes(r)))
        return true;
    if (groups.length > 0 && principals.groupIds.some((g) => groups.includes(g)))
        return true;
    return false;
}
function toTargets(assignedTo) {
    const roles = Array.isArray(assignedTo?.roles) ? assignedTo.roles : [];
    const users = Array.isArray(assignedTo?.users) ? assignedTo.users : [];
    const groups = Array.isArray(assignedTo?.groups) ? assignedTo.groups : [];
    return [
        ...roles.map((id) => ({ type: 'role', id: String(id) })),
        ...groups.map((id) => ({ type: 'group', id: String(id) })),
        ...users.map((id) => ({ type: 'user', id: String(id) })),
    ].filter((t) => t.id && t.id.trim());
}
export async function actOnTask(request, opts) {
    const { action } = opts;
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub)
        return { ok: false, status: 401, body: { error: 'Unauthorized' } };
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/workflows/runs/{runId}/tasks/{taskId}/{action}
    const runIdx = parts.findIndex((p) => p === 'runs');
    const taskIdx = parts.findIndex((p) => p === 'tasks');
    const runId = runIdx >= 0 ? parts[runIdx + 1] || null : null;
    const taskId = taskIdx >= 0 ? parts[taskIdx + 1] || null : null;
    if (!runId || !taskId)
        return { ok: false, status: 400, body: { error: 'Missing runId or taskId' } };
    const workflowId = await getWorkflowIdForRun(db, runId);
    if (!workflowId)
        return { ok: false, status: 404, body: { error: 'Run not found' } };
    const canApprove = isAdmin(user.roles) || (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_APPROVE));
    if (!canApprove)
        return { ok: false, status: 403, body: { error: 'Not authorized' } };
    const [task] = await db
        .select()
        .from(workflowTasks)
        .where(and(eq(workflowTasks.id, taskId), eq(workflowTasks.runId, runId)))
        .limit(1);
    if (!task)
        return { ok: false, status: 404, body: { error: 'Task not found' } };
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
        const assignedTo = parseAssignedTo(task.assignedTo);
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
    const applyAction = action === 'approve' ? parseApplyAction(task) : null;
    let runStatus = action === 'approve' ? 'running' : 'failed';
    let applyResult = null;
    let applyError = null;
    if (applyAction?.kind === 'api') {
        const result = await callApplyAction(request, applyAction, { workflowRunId: runId, workflowTaskId: taskId });
        applyResult = { status: result.status, ok: result.ok, json: result.json ?? undefined };
        if (result.ok) {
            runStatus = 'succeeded';
        }
        else {
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
        status: runStatus,
        ...(runStatus === 'succeeded' || runStatus === 'failed'
            ? {
                endedAt: decidedAt,
                ...(applyError ? { error: applyError } : {}),
                ...(applyResult && runStatus === 'succeeded' ? { output: applyResult } : {}),
            }
            : {}),
    })
        .where(eq(workflowRuns.id, runId));
    // Append events
    const [maxRow] = await db
        .select({ max: sql `max(${workflowRunEvents.seq})` })
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
            name: action === 'approve'
                ? applyAction
                    ? runStatus === 'succeeded'
                        ? 'apply.succeeded'
                        : 'apply.failed'
                    : 'run.resumed'
                : 'run.failed',
            level: action === 'approve'
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
    // Realtime publish intentionally removed.
    const updatePayload = {
        runId,
        taskId,
        workflowId,
        status: newStatus,
        runStatus,
        decidedAt: decidedAt.toISOString(),
        decidedByUserId: user.sub,
        comment: comment || undefined,
        assignedTo: task.assignedTo || undefined,
    };
    // (previous publishWorkflowEvent / publishWorkflowInboxEvent removed)
    return {
        ok: true,
        status: 200,
        body: { success: true, runId, taskId, status: newStatus, runStatus, applyResult: applyResult || undefined, applyError: applyError || undefined },
    };
}
