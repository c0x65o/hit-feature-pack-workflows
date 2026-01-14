import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflowRunEvents, workflowRuns, workflowTasks, workflows, } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun } from './_workflow-access';
import { resolveWorkflowCoreScopeMode } from '../lib/scope-mode';
// Old events module integration removed (websocket-core is the new path).
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
        // Check workflow exists and user has read access
        const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
        if (!wf)
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        // Apply scope-based access check (explicit branching on none/own/ldd/any)
        const mode = await resolveWorkflowCoreScopeMode(request, { entity: 'workflows', verb: 'read' });
        if (mode === 'none') {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        }
        else if (mode === 'own') {
            if (wf.ownerUserId !== user.sub) {
                return NextResponse.json({ error: 'Run not found' }, { status: 404 });
            }
        }
        else if (mode === 'ldd') {
            // Workflows don't have LDD fields yet, so ldd behaves like own
            if (wf.ownerUserId !== user.sub) {
                return NextResponse.json({ error: 'Run not found' }, { status: 404 });
            }
        }
        else if (mode === 'any') {
            // Allow access to all workflows
        }
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
        // Check workflow exists and user has write access (creating tasks requires write permission)
        const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
        if (!wf)
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        // Apply scope-based access check (explicit branching on none/own/ldd/any)
        const mode = await resolveWorkflowCoreScopeMode(request, { entity: 'workflows', verb: 'write' });
        if (mode === 'none') {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        }
        else if (mode === 'own') {
            if (wf.ownerUserId !== user.sub) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
        }
        else if (mode === 'ldd') {
            // Workflows don't have LDD fields yet, so ldd behaves like own
            if (wf.ownerUserId !== user.sub) {
                return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
            }
        }
        else if (mode === 'any') {
            // Allow access to all workflows
        }
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
        // Realtime publish intentionally removed.
        return NextResponse.json({ task }, { status: 201 });
    }
    catch (error) {
        console.error('[workflows] Create task error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
