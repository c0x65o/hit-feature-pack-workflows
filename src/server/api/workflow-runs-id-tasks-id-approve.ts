import { NextRequest, NextResponse } from 'next/server';
import { actOnTask } from './_task-actions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/workflows/runs/[runId]/tasks/[taskId]/approve
 */
export async function POST(request: NextRequest) {
  const res = await actOnTask(request, { action: 'approve' });
  return NextResponse.json(res.body, { status: res.status });
}

