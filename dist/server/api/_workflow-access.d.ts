import type { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
export declare function isAdmin(roles: string[] | undefined | null): boolean;
export declare function getRequestUserOrThrow(request: NextRequest): Promise<{
    error: string;
    status: 401;
    user: null;
} | {
    error: null;
    status: 200;
    user: import("../auth").User;
}>;
export declare function getPrincipals(request: NextRequest, user: {
    sub: string;
    email?: string;
    roles?: string[];
}): Promise<import("@hit/acl-utils").ResolvedUserPrincipals>;
/**
 * Default-closed + admin override:
 * - admins always have access
 * - if workflow has zero ACL entries, only admins have access
 */
export declare function hasWorkflowAclAccess(db: ReturnType<typeof getDb>, workflowId: string, request: NextRequest, requiredPermission: string): Promise<boolean>;
export declare function getWorkflowIdForRun(db: ReturnType<typeof getDb>, runId: string): Promise<string | null>;
export declare function workflowExists(db: ReturnType<typeof getDb>, workflowId: string): Promise<boolean>;
export declare const DEFAULT_CREATOR_PERMISSIONS: string[];
//# sourceMappingURL=_workflow-access.d.ts.map