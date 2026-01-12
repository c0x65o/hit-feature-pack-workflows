import { NextRequest, NextResponse } from 'next/server';
import { asc, desc, eq, inArray, like, or, sql, type AnyColumn, and } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { workflows, workflowAcls, workflowVersions } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { DEFAULT_CREATOR_PERMISSIONS } from './_workflow-access';
import { resolveWorkflowCoreScopeMode } from '../lib/scope-mode';
import { checkWorkflowCoreAction } from '../lib/require-action';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * GET /api/workflows
 *
 * Lists workflows based on scope mode:
 * - none: deny all access (return empty)
 * - own: only workflows owned by current user
 * - ldd: workflows owned by current user (workflows don't have LDD fields yet, so behaves like own)
 * - any: all workflows
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const offset = (page - 1) * pageSize;
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';

    const sortColumns: Record<string, AnyColumn> = {
      name: workflows.name,
      slug: workflows.slug,
      createdAt: workflows.createdAt,
      updatedAt: workflows.updatedAt,
    };
    const orderCol = sortColumns[sortBy] ?? workflows.updatedAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);

    const conditions = [];
    if (search) {
      conditions.push(or(like(workflows.name, `%${search}%`), like(workflows.slug, `%${search}%`))!);
    }

    // Apply scope-based filtering (explicit branching on none/own/ldd/any)
    const mode = await resolveWorkflowCoreScopeMode(request, { entity: 'workflows', verb: 'read' });
    
    if (mode === 'none') {
      // Explicit deny: return empty results (fail-closed but non-breaking for list UI)
      return NextResponse.json({
        items: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      });
    } else if (mode === 'own') {
      // Only show workflows owned by the current user
      conditions.push(eq(workflows.ownerUserId, user.sub));
    } else if (mode === 'ldd') {
      // Workflows don't have LDD fields yet, so ldd behaves like own
      conditions.push(eq(workflows.ownerUserId, user.sub));
    } else if (mode === 'any') {
      // No scoping - show all workflows
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflows)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    const items = await db
      .select()
      .from(workflows)
      .where(whereClause)
      .orderBy(orderDirection)
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('[workflows] List error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

/**
 * POST /api/workflows
 *
 * Creates:
 * - workflows row
 * - initial draft version (v1)
 * - creator ACL entry (full permissions) to keep default-closed behavior
 *
 * Requires workflow-core.workflows.create permission.
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check create permission
    const createCheck = await checkWorkflowCoreAction(request, 'workflow-core.workflows.create');
    if (!createCheck.ok) {
      return NextResponse.json({ error: 'Not authorized to create workflows' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = typeof body?.slug === 'string' && body.slug.trim() ? slugify(body.slug) : slugify(name);
    const description = typeof body?.description === 'string' ? body.description.trim() : null;

    const [created] = await db
      .insert(workflows)
      .values({
        name,
        slug,
        description: description || null,
        ownerUserId: user.sub,
      })
      .returning();

    // Create initial draft version
    await db.insert(workflowVersions).values({
      workflowId: created.id,
      version: 1,
      status: 'draft',
      definition: {},
      createdByUserId: user.sub,
    });

    // Creator ACL: full permissions
    await db.insert(workflowAcls).values({
      workflowId: created.id,
      principalType: 'user',
      principalId: user.sub,
      permissions: DEFAULT_CREATOR_PERMISSIONS,
      createdBy: user.sub,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[workflows] Create error:', error);
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
  }
}

