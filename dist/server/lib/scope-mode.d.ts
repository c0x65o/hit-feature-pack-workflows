import type { NextRequest } from 'next/server';
export type ScopeMode = 'none' | 'own' | 'ldd' | 'any';
export type ScopeVerb = 'read' | 'write' | 'delete';
export type ScopeEntity = 'workflows';
/**
 * Resolve effective scope mode using a tree:
 * - entity override: workflow-core.{entity}.{verb}.scope.{mode}
 * - workflow-core default: workflow-core.{verb}.scope.{mode}
 * - fallback: own
 *
 * Precedence if multiple are granted: most restrictive wins.
 */
export declare function resolveWorkflowCoreScopeMode(request: NextRequest, args: {
    entity?: ScopeEntity;
    verb: ScopeVerb;
}): Promise<ScopeMode>;
//# sourceMappingURL=scope-mode.d.ts.map