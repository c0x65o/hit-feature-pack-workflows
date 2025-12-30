import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid, varchar, } from 'drizzle-orm/pg-core';
/**
 * Principal Types for ACL
 * Shared enum used across all feature packs (forms, vault, notepad, etc.)
 */
export const principalTypeEnum = pgEnum('principal_type', ['user', 'group', 'role']);
/**
 * Workflow permissions (ACL keys)
 *
 * Admin override rule (enforced in API layer):
 * - admins always can
 * - if workflow has zero ACL entries, only admins can access
 */
export const WORKFLOW_PERMISSIONS = {
    WORKFLOWS_VIEW: 'WORKFLOWS_VIEW',
    WORKFLOWS_EDIT: 'WORKFLOWS_EDIT',
    WORKFLOWS_PUBLISH: 'WORKFLOWS_PUBLISH',
    WORKFLOWS_RUN: 'WORKFLOWS_RUN',
    WORKFLOWS_VIEW_RUNS: 'WORKFLOWS_VIEW_RUNS',
    WORKFLOWS_CANCEL_RUN: 'WORKFLOWS_CANCEL_RUN',
    WORKFLOWS_MANAGE_ACL: 'WORKFLOWS_MANAGE_ACL',
    WORKFLOWS_APPROVE: 'WORKFLOWS_APPROVE',
};
/**
 * Workflows table - identity + metadata (definitions live in versions).
 */
export const workflows = pgTable('workflows', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    ownerUserId: varchar('owner_user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    slugIdx: index('workflows_slug_idx').on(table.slug),
    ownerIdx: index('workflows_owner_user_id_idx').on(table.ownerUserId),
}));
/**
 * Workflow versions table - immutable definitions (draft vs published).
 */
export const workflowVersions = pgTable('workflow_versions', {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
        .notNull()
        .references(() => workflows.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('draft'), // draft | published | archived
    definition: jsonb('definition').$type().notNull().default({}),
    createdByUserId: varchar('created_by_user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    workflowIdx: index('workflow_versions_workflow_id_idx').on(table.workflowId),
    workflowStatusIdx: index('workflow_versions_workflow_status_idx').on(table.workflowId, table.status),
    workflowVersionUnique: unique('workflow_versions_workflow_version_unique').on(table.workflowId, table.version),
}));
/**
 * Workflow ACL entries - controls who can view/run/edit/etc.
 */
export const workflowAcls = pgTable('workflow_acls', {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
        .notNull()
        .references(() => workflows.id, { onDelete: 'cascade' }),
    principalType: principalTypeEnum('principal_type').notNull(), // user | group | role
    principalId: varchar('principal_id', { length: 255 }).notNull(),
    permissions: jsonb('permissions').$type().notNull(),
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    workflowIdx: index('workflow_acls_workflow_idx').on(table.workflowId),
    principalIdx: index('workflow_acls_principal_idx').on(table.principalType, table.principalId),
    workflowPrincipalUnique: unique('workflow_acls_workflow_principal_unique').on(table.workflowId, table.principalType, table.principalId),
}));
/**
 * Workflow runs - an execution instance of a workflow version.
 *
 * Note: we store trigger/input/output/error as JSON for flexibility.
 */
export const workflowRuns = pgTable('workflow_runs', {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id')
        .notNull()
        .references(() => workflows.id, { onDelete: 'cascade' }),
    workflowVersionId: uuid('workflow_version_id')
        .notNull()
        .references(() => workflowVersions.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 32 }).notNull().default('queued'), // queued | running | waiting | succeeded | failed | cancelled
    trigger: jsonb('trigger').$type().notNull().default({}),
    input: jsonb('input').$type(),
    output: jsonb('output').$type(),
    error: jsonb('error').$type(),
    correlationId: varchar('correlation_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    createdByUserId: varchar('created_by_user_id', { length: 255 }),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    workflowIdx: index('workflow_runs_workflow_id_idx').on(table.workflowId),
    workflowStatusIdx: index('workflow_runs_workflow_status_idx').on(table.workflowId, table.status),
    createdAtIdx: index('workflow_runs_created_at_idx').on(table.createdAt),
    correlationIdx: index('workflow_runs_correlation_id_idx').on(table.correlationId),
    idempotencyIdx: index('workflow_runs_idempotency_key_idx').on(table.idempotencyKey),
}));
/**
 * Workflow run events - append-only timeline.
 */
export const workflowRunEvents = pgTable('workflow_run_events', {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
        .notNull()
        .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    tMs: integer('t_ms').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    level: varchar('level', { length: 16 }).notNull().default('info'), // info | warn | error
    nodeId: varchar('node_id', { length: 255 }),
    data: jsonb('data').$type(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    runIdx: index('workflow_run_events_run_id_idx').on(table.runId),
    runSeqUnique: unique('workflow_run_events_run_seq_unique').on(table.runId, table.seq),
    runTimeIdx: index('workflow_run_events_run_time_idx').on(table.runId, table.tMs),
}));
/**
 * Workflow tasks - durable "human steps" (approvals/input/review).
 */
export const workflowTasks = pgTable('workflow_tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
        .notNull()
        .references(() => workflowRuns.id, { onDelete: 'cascade' }),
    nodeId: varchar('node_id', { length: 255 }).notNull(),
    type: varchar('type', { length: 32 }).notNull().default('approval'), // approval | input | review
    status: varchar('status', { length: 32 }).notNull().default('open'), // open | approved | denied | cancelled | expired
    assignedTo: jsonb('assigned_to').$type().notNull().default({}),
    prompt: jsonb('prompt').$type(),
    decision: jsonb('decision').$type(),
    createdByUserId: varchar('created_by_user_id', { length: 255 }),
    decidedByUserId: varchar('decided_by_user_id', { length: 255 }),
    decidedAt: timestamp('decided_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    runIdx: index('workflow_tasks_run_id_idx').on(table.runId),
    statusIdx: index('workflow_tasks_status_idx').on(table.status),
    runStatusIdx: index('workflow_tasks_run_status_idx').on(table.runId, table.status),
}));
