import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/gates/crm-convert-prospect
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    workflowId: string;
    workflowVersionId: string | undefined;
    workflowVersion: number | undefined;
    entries: {
        principalType: string;
        principalId: string;
        permissions: string[];
    }[];
}>>;
/**
 * PUT /api/workflows/gates/crm-convert-prospect
 */
export declare function PUT(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    ok: boolean;
    workflowId: string;
    workflowVersionId: string;
    workflowVersion: number;
}>>;
//# sourceMappingURL=workflow-gates-crm-convert-prospect.d.ts.map