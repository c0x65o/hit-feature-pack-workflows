import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun, hasWorkflowAclAccess, isAdmin } from './_workflow-access';
function extractRunId(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/workflows/runs/{runId}
    const idx = parts.findIndex((p) => p === 'runs');
    if (idx >= 0 && parts[idx + 1])
        return parts[idx + 1];
    return null;
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * GET /api/workflows/runs/[runId]
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
        const [run] = await db.select().from(workflowRuns).where(eq(workflowRuns.id, runId)).limit(1);
        if (!run)
            return NextResponse.json({ error: 'Run not found' }, { status: 404 });
        const tasks = await db
            .select()
            .from(workflowTasks)
            .where(eq(workflowTasks.runId, runId))
            .orderBy(desc(workflowTasks.createdAt));
        return NextResponse.json({ run, tasks });
    }
    catch (error) {
        console.error('[workflows] Get run error:', error);
        return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
    }
}
