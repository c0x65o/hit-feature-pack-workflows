import { sql, and, eq, inArray, or } from 'drizzle-orm';
import { resolveUserPrincipals } from '@hit/acl-utils';
import { extractUserFromRequest } from '../auth';
import { workflowAcls, workflowRuns, workflows, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
export function isAdmin(roles) {
    const rs = roles || [];
    return rs.some((r) => String(r || '').toLowerCase() === 'admin');
}
export async function getRequestUserOrThrow(request) {
    const user = extractUserFromRequest(request);
    if (!user?.sub) {
        return { error: 'Unauthorized', status: 401, user: null };
    }
    return { error: null, status: 200, user };
}
export async function getPrincipals(request, user) {
    return await resolveUserPrincipals({
        request,
        user: { sub: user.sub, email: user.email, roles: user.roles || [] },
    });
}
/**
 * Default-closed + admin override:
 * - admins always have access
 * - if workflow has zero ACL entries, only admins have access
 */
export async function hasWorkflowAclAccess(db, workflowId, request, requiredPermission) {
    const user = extractUserFromRequest(request);
    if (!user?.sub)
        return false;
    if (isAdmin(user.roles))
        return true;
    // If no ACL entries exist, default-closed means deny.
    const [countRow] = await db
        .select({ count: sql `count(*)` })
        .from(workflowAcls)
        .where(eq(workflowAcls.workflowId, workflowId));
    const aclCount = Number(countRow?.count || 0);
    if (aclCount === 0)
        return false;
    const principals = await getPrincipals(request, user);
    const userIds = [];
    if (principals.userId)
        userIds.push(principals.userId);
    if (principals.userEmail)
        userIds.push(principals.userEmail);
    const conds = [];
    if (userIds.length > 0) {
        conds.push(and(eq(workflowAcls.principalType, 'user'), inArray(workflowAcls.principalId, userIds)));
    }
    if (principals.roles.length > 0) {
        conds.push(and(eq(workflowAcls.principalType, 'role'), inArray(workflowAcls.principalId, principals.roles)));
    }
    if (principals.groupIds.length > 0) {
        conds.push(and(eq(workflowAcls.principalType, 'group'), inArray(workflowAcls.principalId, principals.groupIds)));
    }
    if (conds.length === 0)
        return false;
    // Use JSONB containment to check required permission.
    // Note: this assumes permissions stored as JSON array of strings.
    const rows = await db
        .select()
        .from(workflowAcls)
        .where(and(eq(workflowAcls.workflowId, workflowId), or(...conds), sql `${workflowAcls.permissions}::jsonb @> ${JSON.stringify([requiredPermission])}::jsonb`))
        .limit(1);
    return rows.length > 0;
}
export async function getWorkflowIdForRun(db, runId) {
    const [run] = await db
        .select({ workflowId: workflowRuns.workflowId })
        .from(workflowRuns)
        .where(eq(workflowRuns.id, runId))
        .limit(1);
    return run?.workflowId ? String(run.workflowId) : null;
}
export async function workflowExists(db, workflowId) {
    const [wf] = await db.select({ id: workflows.id }).from(workflows).where(eq(workflows.id, workflowId)).limit(1);
    return Boolean(wf?.id);
}
export const DEFAULT_CREATOR_PERMISSIONS = [
    WORKFLOW_PERMISSIONS.WORKFLOWS_VIEW,
    WORKFLOW_PERMISSIONS.WORKFLOWS_EDIT,
    WORKFLOW_PERMISSIONS.WORKFLOWS_PUBLISH,
    WORKFLOW_PERMISSIONS.WORKFLOWS_RUN,
    WORKFLOW_PERMISSIONS.WORKFLOWS_VIEW_RUNS,
    WORKFLOW_PERMISSIONS.WORKFLOWS_CANCEL_RUN,
    WORKFLOW_PERMISSIONS.WORKFLOWS_MANAGE_ACL,
    WORKFLOW_PERMISSIONS.WORKFLOWS_APPROVE,
];
