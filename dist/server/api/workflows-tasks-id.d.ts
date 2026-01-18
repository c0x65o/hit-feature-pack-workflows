import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/tasks/[id]
 */
export declare function GET(request: NextRequest, ctx: {
    params: {
        id: string;
    };
}): Promise<NextResponse<any>>;
//# sourceMappingURL=workflows-tasks-id.d.ts.map