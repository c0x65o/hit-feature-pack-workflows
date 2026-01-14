import { checkActionPermission, requireActionPermission, } from '@hit/feature-pack-auth-core/server/lib/action-check';
export async function checkWorkflowCoreAction(request, actionKey) {
    return checkActionPermission(request, actionKey, { logPrefix: 'Workflow-Core' });
}
export async function requireWorkflowCoreAction(request, actionKey) {
    return requireActionPermission(request, actionKey, { logPrefix: 'Workflow-Core' });
}
