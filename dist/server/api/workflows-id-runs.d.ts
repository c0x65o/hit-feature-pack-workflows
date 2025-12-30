import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/[id]/runs
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    items: any;
    total: number;
    limit: number;
    offset: number;
}>>;
/**
 * POST /api/workflows/[id]/runs
 *
 * MVP behavior:
 * - creates a run in running state
 * - appends a run.start event
 * - optional: if body.createApprovalTask is true, immediately creates a waiting approval task (for early gating use-cases)
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    run: any;
}>>;
//# sourceMappingURL=workflows-id-runs.d.ts.map