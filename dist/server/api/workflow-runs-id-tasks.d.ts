import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/runs/[runId]/tasks
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    items: any;
}>>;
/**
 * POST /api/workflows/runs/[runId]/tasks
 *
 * MVP/bootstrapping:
 * - creates a task
 * - marks run as waiting
 * - appends events
 *
 * Long-term: tasks should be created by the workflow executor, not arbitrarily by clients.
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    task: any;
}>>;
//# sourceMappingURL=workflow-runs-id-tasks.d.ts.map