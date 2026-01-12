import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows
 *
 * Lists workflows based on scope mode:
 * - none: deny all access (return empty)
 * - own: only workflows owned by current user
 * - ldd: workflows owned by current user (workflows don't have LDD fields yet, so behaves like own)
 * - any: all workflows
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    items: any;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>>;
/**
 * POST /api/workflows
 *
 * Creates:
 * - workflows row
 * - initial draft version (v1)
 * - creator ACL entry (full permissions) to keep default-closed behavior
 *
 * Requires workflow-core.workflows.create permission.
 */
export declare function POST(request: NextRequest): Promise<NextResponse<any>>;
//# sourceMappingURL=workflows.d.ts.map