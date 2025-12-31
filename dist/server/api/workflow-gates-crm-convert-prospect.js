import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { extractUserFromRequest } from '../auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const WORKFLOW_SLUG = 'crm-company-convert-prospect';
const PERM_APPROVE = 'APPROVE';
function isAdmin(roles) {
    return Array.isArray(roles) && roles.includes('admin');
}
function normalizeEntries(entries) {
    if (!Array.isArray(entries))
        return [];
    const out = [];
    for (const e of entries) {
        if (!e || typeof e !== 'object')
            continue;
        const o = e;
        const principalType = o.principalType;
        const principalId = typeof o.principalId === 'string' ? o.principalId.trim() : '';
        const permissions = Array.isArray(o.permissions) ? o.permissions.map((p) => String(p)).filter(Boolean) : [];
        if ((principalType !== 'user' && principalType !== 'group' && principalType !== 'role') || !principalId)
            continue;
        const perms = permissions.includes(PERM_APPROVE) ? [PERM_APPROVE] : [];
        if (perms.length === 0)
            continue;
        out.push({ principalType, principalId, permissions: perms });
    }
    const seen = new Set();
    return out.filter((e) => {
        const k = `${e.principalType}:${e.principalId}`;
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
async function getWorkflowId(db, userId) {
    const now = new Date();
    const existing = await db.execute(sql `select id from "workflows" where slug = ${WORKFLOW_SLUG} limit 1`);
    const wid = existing?.rows?.[0]?.id ?? null;
    if (wid)
        return String(wid);
    const ins = await db.execute(sql `
    insert into "workflows" (name, slug, description, owner_user_id, created_at, updated_at)
    values (
      'CRM: Convert Prospect → Company',
      ${WORKFLOW_SLUG},
      'Approval gate for promoting a prospect into an active company.',
      ${userId},
      ${now},
      ${now}
    )
    returning id
  `);
    const newId = ins?.rows?.[0]?.id ?? null;
    if (!newId)
        throw new Error('Failed to create workflow');
    return String(newId);
}
async function getLatestPublishedDefinition(db, workflowId) {
    const res = await db.execute(sql `
    select id, version, definition
    from "workflow_versions"
    where workflow_id = ${workflowId}
      and status = 'published'
    order by version desc
    limit 1
  `);
    const row = res?.rows?.[0] ?? null;
    if (!row)
        return null;
    return { id: String(row.id), version: Number(row.version || 0), definition: row.definition ?? {} };
}
function getGateEntriesFromDefinition(definition) {
    const raw = definition?.gateKeeperAcl ?? definition?.gate_keeper_acl ?? null;
    const entries = Array.isArray(raw) ? raw : [];
    return normalizeEntries(entries.map((e) => ({
        principalType: e?.principalType ?? e?.principal_type,
        principalId: e?.principalId ?? e?.principal_id,
        permissions: e?.permissions,
    })));
}
/**
 * GET /api/workflows/gates/crm-convert-prospect
 */
export async function GET(request) {
    try {
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!isAdmin(user.roles))
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        const db = getDb();
        const workflowId = await getWorkflowId(db, user.sub);
        const latest = await getLatestPublishedDefinition(db, workflowId);
        const entries = latest && latest.definition
            ? getGateEntriesFromDefinition(latest.definition)
            : [{ principalType: 'role', principalId: 'admin', permissions: [PERM_APPROVE] }];
        return NextResponse.json({
            workflowId,
            workflowVersionId: latest?.id,
            workflowVersion: latest?.version,
            entries,
        });
    }
    catch (error) {
        console.error('[workflows] gate GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch gate config' }, { status: 500 });
    }
}
/**
 * PUT /api/workflows/gates/crm-convert-prospect
 */
export async function PUT(request) {
    try {
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!isAdmin(user.roles))
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
        const body = (await request.json().catch(() => null));
        const entries = normalizeEntries(body?.entries);
        if (entries.length === 0) {
            return NextResponse.json({ error: 'Gate must have at least one approver principal.' }, { status: 400 });
        }
        const db = getDb();
        const workflowId = await getWorkflowId(db, user.sub);
        const latest = await getLatestPublishedDefinition(db, workflowId);
        const nextVersion = (latest?.version || 0) + 1;
        const now = new Date();
        const nextDefinition = {
            ...(latest?.definition || { kind: 'lifecycle_gate', gate: 'crm.company.convertProspect' }),
            kind: 'lifecycle_gate',
            gate: 'crm.company.convertProspect',
            gateKeeperAcl: entries,
            updatedAt: now.toISOString(),
        };
        const ins = await db.execute(sql `
      insert into "workflow_versions" (workflow_id, version, status, definition, created_by_user_id, created_at)
      values (
        ${workflowId},
        ${nextVersion},
        'published',
        ${JSON.stringify(nextDefinition)}::jsonb,
        ${user.sub},
        ${now}
      )
      returning id
    `);
        const workflowVersionId = ins?.rows?.[0]?.id ?? null;
        if (!workflowVersionId)
            return NextResponse.json({ error: 'Failed to save gate config' }, { status: 500 });
        return NextResponse.json({ ok: true, workflowId, workflowVersionId: String(workflowVersionId), workflowVersion: nextVersion });
    }
    catch (error) {
        console.error('[workflows] gate PUT error:', error);
        return NextResponse.json({ error: 'Failed to update gate config' }, { status: 500 });
    }
}
