export type WorkflowRunStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
export type WorkflowTaskStatus = 'open' | 'approved' | 'denied' | 'cancelled' | 'expired';
export type WorkflowTaskType = 'approval' | 'input' | 'review';
export interface WorkflowRunSummary {
    id: string;
    workflowId: string;
    workflowName?: string;
    status: WorkflowRunStatus;
    triggerType?: string | null;
    triggerRef?: string | null;
    startedByUserId?: string | null;
    startedAt: string;
    completedAt?: string | null;
    lastUpdatedAt?: string | null;
}
export interface WorkflowRunDetail {
    id: string;
    workflowId: string;
    versionId?: string | null;
    status: WorkflowRunStatus;
    triggerType?: string | null;
    triggerRef?: string | null;
    input?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
    startedByUserId?: string | null;
    startedAt: string;
    completedAt?: string | null;
    lastUpdatedAt?: string | null;
    workflow?: {
        id: string;
        name: string;
        slug?: string;
    } | null;
}
export interface WorkflowRunEvent {
    id: string;
    runId: string;
    seq: number;
    tMs: number;
    name: string;
    level: 'info' | 'warn' | 'error' | string;
    nodeId?: string | null;
    data?: Record<string, unknown> | null;
    createdAt: string;
}
export interface WorkflowTaskView {
    id: string;
    runId: string;
    nodeId: string;
    type: WorkflowTaskType;
    status: WorkflowTaskStatus;
    assignedTo?: Record<string, unknown>;
    prompt?: Record<string, unknown> | null;
    decision?: Record<string, unknown> | null;
    createdByUserId?: string | null;
    decidedByUserId?: string | null;
    decidedAt?: string | null;
    expiresAt?: string | null;
    createdAt: string;
}
export declare function useAllWorkflowRuns(opts?: {
    workflowId?: string;
    limit?: number;
    offset?: number;
}): {
    runs: WorkflowRunSummary[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useWorkflowRun(runId: string | null): {
    run: WorkflowRunDetail | null;
    tasks: WorkflowTaskView[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useWorkflowRunEvents(runId: string | null): {
    events: WorkflowRunEvent[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
export declare function useWorkflowRunTasks(runId: string | null): {
    tasks: WorkflowTaskView[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    approveTask: (taskId: string, comment?: string) => Promise<void>;
    denyTask: (taskId: string, comment?: string) => Promise<void>;
};
export declare function useMyWorkflowTasks(opts?: {
    includeResolved?: boolean;
    limit?: number;
    resolvedWithinHours?: number;
}): {
    tasks: WorkflowTaskView[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
//# sourceMappingURL=useWorkflowRuns.d.ts.map