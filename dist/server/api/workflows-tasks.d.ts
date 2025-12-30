import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/tasks
 *
 * Query:
 * - limit: number (default 50, max 200)
 * - includeResolved: boolean (default false)
 * - resolvedWithinHours: number (default 24)
 *
 * Behavior:
 * - Admins: see all open tasks (+ optionally recently resolved).
 * - Non-admins: only tasks that (a) match assignment and (b) user has WORKFLOWS_APPROVE on the workflow.
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    items: any[];
}>>;
//# sourceMappingURL=workflows-tasks.d.ts.map