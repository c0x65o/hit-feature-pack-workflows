import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { resolveUserPrincipals } from '@hit/feature-pack-auth-core/server/lib/acl-utils';

import { getDb } from '@/lib/db';
import { workflows, workflowRuns, workflowTasks, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { hasWorkflowAclAccess, isAdmin } from './_workflow-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AssignedToShape = {
  users?: string[];
  roles?: string[];
  groups?: string[];
};

function parseAssignedTo(x: unknown): AssignedToShape {
  if (!x || typeof x !== 'object') return {};
  const o = x as any;
  return {
    users: Array.isArray(o.users) ? o.users.map((u: any) => String(u)).filter(Boolean) : undefined,
    roles: Array.isArray(o.roles) ? o.roles.map((r: any) => String(r)).filter(Boolean) : undefined,
    groups: Array.isArray(o.groups) ? o.groups.map((g: any) => String(g)).filter(Boolean) : undefined,
  };
}

function matchesAssignment(
  assignedTo: AssignedToShape,
  principals: { userId: string; userEmail: string; roles: string[]; groupIds: string[] }
): boolean {
  const users = assignedTo.users || [];
  const roles = assignedTo.roles || [];
  const groups = assignedTo.groups || [];
  if (users.length === 0 && roles.length === 0 && groups.length === 0) return false;
  const userIds = [principals.userId, principals.userEmail].filter(Boolean);
  if (users.length > 0 && userIds.some((u) => users.includes(u))) return true;
  if (roles.length > 0 && principals.roles.some((r) => roles.includes(r))) return true;
  if (groups.length > 0 && principals.groupIds.some((g) => groups.includes(g))) return true;
  return false;
}

function mapRow(row: any) {
  const prompt = row?.prompt && typeof row.prompt === 'object' ? row.prompt : {};
  const title =
    typeof prompt?.title === 'string'
      ? prompt.title
      : row?.type === 'approval'
        ? 'Approval required'
        : 'Workflow task';
  const message =
    typeof prompt?.message === 'string'
      ? prompt.message
      : typeof prompt?.text === 'string'
        ? prompt.text
        : 'A workflow task is waiting for action.';
  const viewUrl =
    typeof prompt?.viewUrl === 'string'
      ? prompt.viewUrl
      : typeof prompt?.view_url === 'string'
        ? prompt.view_url
        : null;

  return {
    ...row,
    title,
    message,
    viewUrl,
  };
}

/**
 * GET /api/workflows/tasks/[id]
 */
export async function GET(request: NextRequest, ctx: { params: { id: string } }) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const taskId = String(ctx?.params?.id || '').trim();
    if (!taskId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const rows = await db
      .select({
        task: workflowTasks,
        runWorkflowId: workflowRuns.workflowId,
        workflowName: workflows.name,
      })
      .from(workflowTasks)
      .innerJoin(workflowRuns, eq(workflowTasks.runId, workflowRuns.id))
      .leftJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
      .where(eq(workflowTasks.id, taskId))
      .limit(1);

    const row = rows[0];
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const admin = isAdmin(user.roles);
    if (!admin) {
      const principals = await resolveUserPrincipals({
        request,
        user: { sub: user.sub, email: user.email || '', roles: user.roles || [] },
      });
      const assigned = matchesAssignment(parseAssignedTo(row.task?.assignedTo), principals);
      if (!assigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const canApprove = await hasWorkflowAclAccess(db, String(row.runWorkflowId), request, WORKFLOW_PERMISSIONS.WORKFLOWS_APPROVE);
      if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const out = mapRow({
      ...row.task,
      workflowId: row.runWorkflowId,
      workflowName: row.workflowName || null,
    });

    return NextResponse.json(out);
  } catch (error) {
    console.error('[workflows] Task detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}
