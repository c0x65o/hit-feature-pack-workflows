import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/runs/[runId]/events
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    events: any;
    limit: number;
    offset: number;
}>>;
//# sourceMappingURL=workflow-runs-id-events.d.ts.map