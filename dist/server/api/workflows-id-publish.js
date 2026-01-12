import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflowVersions, workflows } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { resolveWorkflowCoreScopeMode } from '../lib/scope-mode';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function extractWorkflowId(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/workflows/{id}/publish
    const idx = parts.findIndex((p) => p === 'workflows');
    if (idx >= 0 && parts[idx + 1])
        return parts[idx + 1];
    return null;
}
/**
 * POST /api/workflows/[id]/publish
 *
 * Creates a new immutable published version from the current draft definition.
 */
export async function POST(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const workflowId = extractWorkflowId(request);
        if (!workflowId)
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        // Check workflow exists and user has write access (publish requires write permission)
        const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
        if (!wf)
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
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
        const [draft] = await db
            .select()
            .from(workflowVersions)
            .where(and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.status, 'draft')))
            .orderBy(desc(workflowVersions.version))
            .limit(1);
        if (!draft) {
            return NextResponse.json({ error: 'No draft version found' }, { status: 400 });
        }
        // Next version = max(version)+1 across all versions for this workflow.
        const [maxRow] = await db
            .select({ max: sql `max(${workflowVersions.version})` })
            .from(workflowVersions)
            .where(eq(workflowVersions.workflowId, workflowId));
        const nextVersion = Number(maxRow?.max || 0) + 1;
        const [published] = await db
            .insert(workflowVersions)
            .values({
            workflowId,
            version: nextVersion,
            status: 'published',
            definition: draft.definition || {},
            createdByUserId: user.sub,
        })
            .returning();
        return NextResponse.json({ published }, { status: 201 });
    }
    catch (error) {
        console.error('[workflows] Publish error:', error);
        return NextResponse.json({ error: 'Failed to publish workflow' }, { status: 500 });
    }
}
