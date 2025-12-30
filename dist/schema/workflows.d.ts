/**
 * Principal Types for ACL
 * Shared enum used across all feature packs (forms, vault, notepad, etc.)
 */
export declare const principalTypeEnum: import("drizzle-orm/pg-core").PgEnum<["user", "group", "role"]>;
/**
 * Workflow permissions (ACL keys)
 *
 * Admin override rule (enforced in API layer):
 * - admins always can
 * - if workflow has zero ACL entries, only admins can access
 */
export declare const WORKFLOW_PERMISSIONS: {
    readonly WORKFLOWS_VIEW: "WORKFLOWS_VIEW";
    readonly WORKFLOWS_EDIT: "WORKFLOWS_EDIT";
    readonly WORKFLOWS_PUBLISH: "WORKFLOWS_PUBLISH";
    readonly WORKFLOWS_RUN: "WORKFLOWS_RUN";
    readonly WORKFLOWS_VIEW_RUNS: "WORKFLOWS_VIEW_RUNS";
    readonly WORKFLOWS_CANCEL_RUN: "WORKFLOWS_CANCEL_RUN";
    readonly WORKFLOWS_MANAGE_ACL: "WORKFLOWS_MANAGE_ACL";
    readonly WORKFLOWS_APPROVE: "WORKFLOWS_APPROVE";
};
export type WorkflowPermission = (typeof WORKFLOW_PERMISSIONS)[keyof typeof WORKFLOW_PERMISSIONS];
/**
 * Workflows table - identity + metadata (definitions live in versions).
 */
export declare const workflows: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "workflows";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "workflows";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "workflows";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        slug: import("drizzle-orm/pg-core").PgColumn<{
            name: "slug";
            tableName: "workflows";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "workflows";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        ownerUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "owner_user_id";
            tableName: "workflows";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "workflows";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "workflows";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Workflow versions table - immutable definitions (draft vs published).
 */
export declare const workflowVersions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "workflow_versions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "workflow_versions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        workflowId: import("drizzle-orm/pg-core").PgColumn<{
            name: "workflow_id";
            tableName: "workflow_versions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        version: import("drizzle-orm/pg-core").PgColumn<{
            name: "version";
            tableName: "workflow_versions";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "workflow_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        definition: import("drizzle-orm/pg-core").PgColumn<{
            name: "definition";
            tableName: "workflow_versions";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdByUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by_user_id";
            tableName: "workflow_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "workflow_versions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Workflow ACL entries - controls who can view/run/edit/etc.
 */
export declare const workflowAcls: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "workflow_acls";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "workflow_acls";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        workflowId: import("drizzle-orm/pg-core").PgColumn<{
            name: "workflow_id";
            tableName: "workflow_acls";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        principalType: import("drizzle-orm/pg-core").PgColumn<{
            name: "principal_type";
            tableName: "workflow_acls";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "role" | "group" | "user";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["user", "group", "role"];
            baseColumn: never;
        }, {}, {}>;
        principalId: import("drizzle-orm/pg-core").PgColumn<{
            name: "principal_id";
            tableName: "workflow_acls";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        permissions: import("drizzle-orm/pg-core").PgColumn<{
            name: "permissions";
            tableName: "workflow_acls";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "workflow_acls";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "workflow_acls";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Workflow runs - an execution instance of a workflow version.
 *
 * Note: we store trigger/input/output/error as JSON for flexibility.
 */
export declare const workflowRuns: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "workflow_runs";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "workflow_runs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        workflowId: import("drizzle-orm/pg-core").PgColumn<{
            name: "workflow_id";
            tableName: "workflow_runs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        workflowVersionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "workflow_version_id";
            tableName: "workflow_runs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "workflow_runs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        trigger: import("drizzle-orm/pg-core").PgColumn<{
            name: "trigger";
            tableName: "workflow_runs";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        input: import("drizzle-orm/pg-core").PgColumn<{
            name: "input";
            tableName: "workflow_runs";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        output: import("drizzle-orm/pg-core").PgColumn<{
            name: "output";
            tableName: "workflow_runs";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        error: import("drizzle-orm/pg-core").PgColumn<{
            name: "error";
            tableName: "workflow_runs";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        correlationId: import("drizzle-orm/pg-core").PgColumn<{
            name: "correlation_id";
            tableName: "workflow_runs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        idempotencyKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "idempotency_key";
            tableName: "workflow_runs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdByUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by_user_id";
            tableName: "workflow_runs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        startedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "started_at";
            tableName: "workflow_runs";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        endedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "ended_at";
            tableName: "workflow_runs";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        durationMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "duration_ms";
            tableName: "workflow_runs";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "workflow_runs";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Workflow run events - append-only timeline.
 */
export declare const workflowRunEvents: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "workflow_run_events";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "workflow_run_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        runId: import("drizzle-orm/pg-core").PgColumn<{
            name: "run_id";
            tableName: "workflow_run_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        seq: import("drizzle-orm/pg-core").PgColumn<{
            name: "seq";
            tableName: "workflow_run_events";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "t_ms";
            tableName: "workflow_run_events";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "workflow_run_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        level: import("drizzle-orm/pg-core").PgColumn<{
            name: "level";
            tableName: "workflow_run_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        nodeId: import("drizzle-orm/pg-core").PgColumn<{
            name: "node_id";
            tableName: "workflow_run_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        data: import("drizzle-orm/pg-core").PgColumn<{
            name: "data";
            tableName: "workflow_run_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "workflow_run_events";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Workflow tasks - durable "human steps" (approvals/input/review).
 */
export declare const workflowTasks: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "workflow_tasks";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "workflow_tasks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        runId: import("drizzle-orm/pg-core").PgColumn<{
            name: "run_id";
            tableName: "workflow_tasks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        nodeId: import("drizzle-orm/pg-core").PgColumn<{
            name: "node_id";
            tableName: "workflow_tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "workflow_tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "workflow_tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        assignedTo: import("drizzle-orm/pg-core").PgColumn<{
            name: "assigned_to";
            tableName: "workflow_tasks";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        prompt: import("drizzle-orm/pg-core").PgColumn<{
            name: "prompt";
            tableName: "workflow_tasks";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        decision: import("drizzle-orm/pg-core").PgColumn<{
            name: "decision";
            tableName: "workflow_tasks";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, unknown>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdByUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by_user_id";
            tableName: "workflow_tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        decidedByUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "decided_by_user_id";
            tableName: "workflow_tasks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        decidedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "decided_at";
            tableName: "workflow_tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        expiresAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "expires_at";
            tableName: "workflow_tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "workflow_tasks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;
export type WorkflowVersion = typeof workflowVersions.$inferSelect;
export type InsertWorkflowVersion = typeof workflowVersions.$inferInsert;
export type WorkflowAcl = typeof workflowAcls.$inferSelect;
export type InsertWorkflowAcl = typeof workflowAcls.$inferInsert;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type InsertWorkflowRun = typeof workflowRuns.$inferInsert;
export type WorkflowRunEvent = typeof workflowRunEvents.$inferSelect;
export type InsertWorkflowRunEvent = typeof workflowRunEvents.$inferInsert;
export type WorkflowTask = typeof workflowTasks.$inferSelect;
export type InsertWorkflowTask = typeof workflowTasks.$inferInsert;
//# sourceMappingURL=workflows.d.ts.map