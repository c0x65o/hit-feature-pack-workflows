import { checkWorkflowCoreAction } from './require-action';
/**
 * Resolve effective scope mode using a tree:
 * - entity override: workflow-core.{entity}.{verb}.scope.{mode}
 * - workflow-core default: workflow-core.{verb}.scope.{mode}
 * - fallback: own
 *
 * Precedence if multiple are granted: most restrictive wins.
 */
export async function resolveWorkflowCoreScopeMode(request, args) {
    const { entity, verb } = args;
    const entityPrefix = entity ? `workflow-core.${entity}.${verb}.scope` : `workflow-core.${verb}.scope`;
    const globalPrefix = `workflow-core.${verb}.scope`;
    // Most restrictive wins (first match returned).
    const modes = ['none', 'own', 'ldd', 'any'];
    for (const m of modes) {
        const res = await checkWorkflowCoreAction(request, `${entityPrefix}.${m}`);
        if (res.ok)
            return m;
    }
    for (const m of modes) {
        const res = await checkWorkflowCoreAction(request, `${globalPrefix}.${m}`);
        if (res.ok)
            return m;
    }
    return 'own';
}
