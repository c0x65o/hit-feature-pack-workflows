import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflowAcls, workflows } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { resolveWorkflowCoreScopeMode } from '../lib/scope-mode';
function extractWorkflowId(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // /api/workflows/{id}/acl
    const idx = parts.findIndex((p) => p === 'workflows');
    if (idx >= 0 && parts[idx + 1])
        return parts[idx + 1];
    return null;
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * GET /api/workflows/[id]/acl
 */
export async function GET(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const workflowId = extractWorkflowId(request);
        if (!workflowId)
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        // Check workflow exists and user has write access (ACL management requires write permission)
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
        const entries = await db.select().from(workflowAcls).where(eq(workflowAcls.workflowId, workflowId));
        return NextResponse.json({ items: entries });
    }
    catch (error) {
        console.error('[workflows] ACL list error:', error);
        return NextResponse.json({ error: 'Failed to fetch workflow ACLs' }, { status: 500 });
    }
}
/**
 * POST /api/workflows/[id]/acl
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
        // Check workflow exists and user has write access (ACL management requires write permission)
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
        const body = await request.json().catch(() => ({}));
        const principalType = body.principalType;
        const principalId = body.principalId;
        const permissions = Array.isArray(body.permissions) ? body.permissions : [];
        if (!principalType || !principalId) {
            return NextResponse.json({ error: 'Missing principalType or principalId' }, { status: 400 });
        }
        if (!Array.isArray(permissions) || permissions.length === 0) {
            return NextResponse.json({ error: 'At least one permission is required' }, { status: 400 });
        }
        // Prevent duplicates
        const [existing] = await db
            .select()
            .from(workflowAcls)
            .where(and(eq(workflowAcls.workflowId, workflowId), eq(workflowAcls.principalType, principalType), eq(workflowAcls.principalId, principalId)))
            .limit(1);
        if (existing) {
            return NextResponse.json({ error: 'ACL entry already exists' }, { status: 400 });
        }
        const [created] = await db
            .insert(workflowAcls)
            .values({
            workflowId,
            principalType,
            principalId,
            permissions,
            createdBy: user.sub,
        })
            .returning();
        return NextResponse.json(created, { status: 201 });
    }
    catch (error) {
        console.error('[workflows] ACL create error:', error);
        return NextResponse.json({ error: 'Failed to create workflow ACL entry' }, { status: 500 });
    }
}
