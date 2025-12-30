export type WorkflowRunStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
export type WorkflowTaskStatus = 'pending' | 'approved' | 'denied' | 'completed' | 'cancelled';
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
    eventType: string;
    payload?: Record<string, unknown> | null;
    timestamp: string;
    sequence: number;
}
export interface WorkflowTask {
    id: string;
    runId: string;
    nodeId: string;
    taskType: 'approval' | 'human_input';
    status: WorkflowTaskStatus;
    assignedToPrincipalType?: string | null;
    assignedToPrincipalId?: string | null;
    metadata?: Record<string, unknown> | null;
    completedByUserId?: string | null;
    completedAt?: string | null;
    createdAt: string;
    updatedAt?: string | null;
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
    tasks: WorkflowTask[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
    approveTask: (taskId: string) => Promise<void>;
    denyTask: (taskId: string, reason?: string) => Promise<void>;
};
export declare function useMyWorkflowTasks(opts?: {
    includeResolved?: boolean;
}): {
    tasks: WorkflowTask[];
    loading: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
};
//# sourceMappingURL=useWorkflowRuns.d.ts.map