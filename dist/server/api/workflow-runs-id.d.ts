import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/runs/[runId]
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    run: any;
    tasks: any;
}>>;
//# sourceMappingURL=workflow-runs-id.d.ts.map