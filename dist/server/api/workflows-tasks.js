import { NextResponse } from 'next/server';
import { and, desc, eq, gt, inArray, or } from 'drizzle-orm';
import { resolveUserPrincipals } from '@hit/feature-pack-auth-core/server/lib/acl-utils';
import { getDb } from '@/lib/db';
import { workflows, workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { hasWorkflowAclAccess, isAdmin } from './_workflow-access';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function asBool(x) {
    if (!x)
        return false;
    const v = x.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}
function asInt(x, def) {
    const n = x ? Number.parseInt(x, 10) : Number.NaN;
    return Number.isFinite(n) ? n : def;
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
    // If nothing specified, treat as unassigned (not visible in "inbox").
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
/**
 * GET /api/workflows/tasks
 *
 * Query:
 * - page: number (optional)
 * - pageSize: number (optional)
 * - limit: number (default 50, max 200)
 * - includeResolved: boolean (default false)
 * - resolvedWithinHours: number (default 24)
 *
 * Behavior:
 * - Admins: see all open tasks (+ optionally recently resolved).
 * - Non-admins: only tasks that (a) match assignment and (b) user has WORKFLOWS_APPROVE on the workflow.
 */
export async function GET(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const url = new URL(request.url);
        const pageParam = url.searchParams.get('page');
        const pageSizeParam = url.searchParams.get('pageSize');
        const usePaging = Boolean(pageParam || pageSizeParam);
        const page = Math.max(1, asInt(pageParam, 1));
        const pageSize = Math.min(Math.max(asInt(pageSizeParam, 25), 1), 200);
        const limit = Math.min(Math.max(asInt(url.searchParams.get('limit'), pageSize), 1), 200);
        const effectiveLimit = usePaging ? pageSize : limit;
        const offset = usePaging ? (page - 1) * pageSize : 0;
        const includeResolved = asBool(url.searchParams.get('includeResolved'));
        const resolvedWithinHours = Math.min(Math.max(asInt(url.searchParams.get('resolvedWithinHours'), 24), 1), 24 * 30);
        const since = new Date(Date.now() - resolvedWithinHours * 60 * 60 * 1000);
        const admin = isAdmin(user.roles);
        const where = includeResolved
            ? or(eq(workflowTasks.status, 'open'), and(inArray(workflowTasks.status, ['approved', 'denied']), gt(workflowTasks.decidedAt, since)))
            : eq(workflowTasks.status, 'open');
        const baseQuery = db
            .select({
            task: workflowTasks,
            runWorkflowId: workflowRuns.workflowId,
            workflowName: workflows.name,
        })
            .from(workflowTasks)
            .innerJoin(workflowRuns, eq(workflowTasks.runId, workflowRuns.id))
            .leftJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
            .where(where)
            .orderBy(desc(workflowTasks.createdAt));
        const fetchLimit = Math.min(2000, Math.max(effectiveLimit * 4, offset + effectiveLimit));
        const rows = admin
            ? await baseQuery.limit(effectiveLimit).offset(offset)
            : await baseQuery.limit(fetchLimit);
        if (rows.length === 0)
            return NextResponse.json({ items: [] });
        const typedRows = rows;
        const mapRow = (r) => {
            const task = r.task || {};
            const prompt = task?.prompt && typeof task.prompt === 'object' ? task.prompt : {};
            const title = typeof prompt?.title === 'string'
                ? prompt.title
                : task?.type === 'approval'
                    ? 'Approval required'
                    : 'Workflow task';
            const message = typeof prompt?.message === 'string'
                ? prompt.message
                : typeof prompt?.text === 'string'
                    ? prompt.text
                    : 'A workflow task is waiting for action.';
            const viewUrl = typeof prompt?.viewUrl === 'string'
                ? prompt.viewUrl
                : typeof prompt?.view_url === 'string'
                    ? prompt.view_url
                    : null;
            return {
                ...task,
                workflowId: r.runWorkflowId,
                workflowName: r.workflowName || null,
                title,
                message,
                viewUrl,
            };
        };
        if (admin) {
            return NextResponse.json({
                items: typedRows.map(mapRow),
                pagination: usePaging ? { page, pageSize, total: undefined, totalPages: undefined } : undefined,
            });
        }
        const principals = await resolveUserPrincipals({
            request,
            user: { sub: user.sub, email: user.email || '', roles: user.roles || [] },
        });
        // Filter by assignment first.
        const assigned = typedRows.filter((r) => matchesAssignment(parseAssignedTo(r.task.assignedTo), principals));
        if (assigned.length === 0)
            return NextResponse.json({ items: [] });
        // ACL filter per workflow.
        const workflowIds = Array.from(new Set(assigned.map((r) => String(r.runWorkflowId))));
        const canApproveByWorkflowId = new Map();
        for (const wid of workflowIds) {
            const ok = await hasWorkflowAclAccess(db, wid, request, WORKFLOW_PERMISSIONS.WORKFLOWS_APPROVE);
            canApproveByWorkflowId.set(wid, ok);
        }
        const out = assigned
            .filter((r) => canApproveByWorkflowId.get(String(r.runWorkflowId)) === true)
            .map(mapRow);
        const paged = usePaging ? out.slice(offset, offset + effectiveLimit) : out.slice(0, effectiveLimit);
        return NextResponse.json({
            items: paged,
            pagination: usePaging ? { page, pageSize, total: out.length, totalPages: Math.ceil(out.length / pageSize) } : undefined,
        });
    }
    catch (error) {
        console.error('[workflows] List global tasks error:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}
