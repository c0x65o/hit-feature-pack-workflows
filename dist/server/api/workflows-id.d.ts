import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/[id]
 * Returns workflow + latest draft version (if any).
 *
 * Checks scope mode to determine access:
 * - none: deny access
 * - own: only if workflow.ownerUserId === current user sub
 * - ldd: only if workflow.ownerUserId === current user sub (workflows don't have LDD fields yet)
 * - any: allow access
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    workflow: any;
    draft: any;
}>>;
/**
 * PUT /api/workflows/[id]
 * Updates workflow metadata and draft definition.
 *
 * Checks scope mode to determine access:
 * - none: deny access
 * - own: only if workflow.ownerUserId === current user sub
 * - ldd: only if workflow.ownerUserId === current user sub (workflows don't have LDD fields yet)
 * - any: allow access
 */
export declare function PUT(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    workflow: any;
    draft: any;
}>>;
//# sourceMappingURL=workflows-id.d.ts.map