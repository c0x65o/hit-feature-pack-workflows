import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflowRunEvents, workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS, } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun, hasWorkflowAclAccess, isAdmin } from './_workflow-access';
import { publishWorkflowEvent, publishWorkflowInboxEvent } from '../utils/publish-event';
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
function extractRunId(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/workflows/runs/{runId}/tasks
    const idx = parts.findIndex((p) => p === 'runs');
    if (idx >= 0 && parts[idx + 1])
        return parts[idx + 1];
    return null;
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * GET /api/workflows/runs/[runId]/tasks
 */
export async function GET(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const runId = extractRunId(request);
        if (!runId)
            return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
        const workflowId = await getWorkflowIdForRun(db, runId);
        if (!workflowId)
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        const canView = isAdmin(user.roles) || (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_VIEW_RUNS));
        if (!canView)
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        const tasks = await db
            .select()
            .from(workflowTasks)
            .where(eq(workflowTasks.runId, runId))
            .orderBy(desc(workflowTasks.createdAt));
        return NextResponse.json({ items: tasks });
    }
    catch (error) {
        console.error('[workflows] List tasks error:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}
/**
 * POST /api/workflows/runs/[runId]/tasks
 *
 * MVP/bootstrapping:
 * - creates a task
 * - marks run as waiting
 * - appends events
 *
 * Long-term: tasks should be created by the workflow executor, not arbitrarily by clients.
 */
export async function POST(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const runId = extractRunId(request);
        if (!runId)
            return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
        const workflowId = await getWorkflowIdForRun(db, runId);
        if (!workflowId)
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        // Creating tasks should require edit permissions for now (admin can always).
        const canCreate = isAdmin(user.roles) || (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_EDIT));
        if (!canCreate)
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        const body = await request.json().catch(() => ({}));
        const nodeId = typeof body?.nodeId === 'string' ? body.nodeId : 'approval';
        const type = typeof body?.type === 'string' ? body.type : 'approval';
        const assignedTo = body?.assignedTo && typeof body.assignedTo === 'object' ? body.assignedTo : {};
        const prompt = body?.prompt && typeof body.prompt === 'object' ? body.prompt : undefined;
        const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : undefined;
        const nowMs = Date.now();
        const [task] = await db
            .insert(workflowTasks)
            .values({
            runId,
            nodeId,
            type,
            status: 'open',
            assignedTo,
            prompt,
            createdByUserId: user.sub,
            expiresAt,
        })
            .returning();
        // Mark run waiting
        await db.update(workflowRuns).set({ status: 'waiting' }).where(eq(workflowRuns.id, runId));
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
                name: 'task.created',
                level: 'info',
                nodeId,
                data: { taskId: task.id, type, assignedTo },
            },
            {
                runId,
                seq: baseSeq + 2,
                tMs: nowMs,
                name: 'run.waiting',
                level: 'info',
                nodeId,
                data: { reason: 'human_task', taskId: task.id },
            },
        ]);
        // Best-effort real-time notification (global + targeted inbox channels)
        const evtPayload = {
            runId,
            taskId: task.id,
            workflowId,
            status: 'open',
            type,
            nodeId,
            assignedTo,
            createdAt: task.createdAt,
            createdByUserId: user.sub,
            // Include enough for clients to render without a follow-up fetch
            prompt: task.prompt || undefined,
            decision: task.decision || undefined,
            decidedAt: task.decidedAt || undefined,
            decidedByUserId: task.decidedByUserId || undefined,
        };
        publishWorkflowEvent('workflows.task.created', evtPayload).catch(() => { });
        publishWorkflowInboxEvent({ kind: 'task.created' }, { task: { id: task.id, runId, status: 'open', type, nodeId, assignedTo, prompt: task.prompt, createdAt: task.createdAt, decidedAt: task.decidedAt, decidedByUserId: task.decidedByUserId, decision: task.decision } }, toTargets(assignedTo)).catch(() => { });
        return NextResponse.json({ task }, { status: 201 });
    }
    catch (error) {
        console.error('[workflows] Create task error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
