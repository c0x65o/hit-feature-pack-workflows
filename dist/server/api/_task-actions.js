import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflowRunEvents, workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun, hasWorkflowAclAccess, isAdmin } from './_workflow-access';
import { publishWorkflowEvent } from '../utils/publish-event';
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
    }).catch(() => { });
    return { ok: true, status: 200, body: { success: true, runId, taskId, status: newStatus, runStatus } };
}
