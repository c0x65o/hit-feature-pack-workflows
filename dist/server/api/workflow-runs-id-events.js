import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflowRunEvents, workflows } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getWorkflowIdForRun } from './_workflow-access';
import { resolveWorkflowCoreScopeMode } from '../lib/scope-mode';
function extractRunId(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/workflows/runs/{runId}/events
    const idx = parts.findIndex((p) => p === 'runs');
    if (idx >= 0 && parts[idx + 1])
        return parts[idx + 1];
    return null;
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * GET /api/workflows/runs/[runId]/events
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
    }
    catch (error) {
        console.error('[workflows] Get run events error:', error);
        return NextResponse.json({ error: 'Failed to fetch run events' }, { status: 500 });
    }
}
