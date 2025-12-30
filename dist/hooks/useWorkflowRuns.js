'use client';
import { useCallback, useEffect, useState } from 'react';
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getAuthHeaders() {
    if (typeof window === 'undefined')
        return {};
    const token = localStorage.getItem('hit_token');
    if (token)
        return { Authorization: `Bearer ${token}` };
    return {};
}
class WorkflowApiError extends Error {
    constructor(status, detail) {
        super(detail);
        this.name = 'WorkflowApiError';
        this.status = status;
        this.detail = detail;
    }
}
async function fetchWorkflowApi(path, init) {
    const url = `/api/workflows${path}`;
    const res = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...(init?.headers || {}),
        },
        ...init,
    });
    if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
            throw new WorkflowApiError(res.status, `Endpoint not found: ${path}`);
        }
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        const detail = body.detail || body.message || body.error || `Request failed: ${res.status}`;
        throw new WorkflowApiError(res.status, detail);
    }
    return res.json();
}
// ─────────────────────────────────────────────────────────────────────────────
// useAllWorkflowRuns - list runs across all workflows (or optionally for one)
// ─────────────────────────────────────────────────────────────────────────────
export function useAllWorkflowRuns(opts = {}) {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // If workflowId is provided, use the workflow-specific endpoint
            // Otherwise we'd need a global runs endpoint - for now we'll use a placeholder
            const limit = opts.limit ?? 100;
            const offset = opts.offset ?? 0;
            if (opts.workflowId) {
                const data = await fetchWorkflowApi(`/${opts.workflowId}/runs?limit=${limit}&offset=${offset}`);
                setRuns(Array.isArray(data?.runs) ? data.runs : []);
            }
            else {
                // For global runs, we need to fetch all workflows first and then their runs
                // This is MVP - a proper global endpoint would be added later
                const workflowsData = await fetchWorkflowApi('');
                const workflows = Array.isArray(workflowsData?.workflows) ? workflowsData.workflows : [];
                const allRuns = [];
                for (const wf of workflows.slice(0, 10)) {
                    // Limit to first 10 workflows for MVP
                    try {
                        const runsData = await fetchWorkflowApi(`/${wf.id}/runs?limit=20&offset=0`);
                        const wfRuns = Array.isArray(runsData?.runs) ? runsData.runs : [];
                        allRuns.push(...wfRuns.map((r) => ({ ...r, workflowName: wf.name })));
                    }
                    catch {
                        // Skip workflows we can't access
                    }
                }
                // Sort by startedAt descending
                allRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
                setRuns(allRuns.slice(0, limit));
            }
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load workflow runs'));
        }
        finally {
            setLoading(false);
        }
    }, [opts.workflowId, opts.limit, opts.offset]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { runs, loading, error, refresh };
}
// ─────────────────────────────────────────────────────────────────────────────
// useWorkflowRun - get a single run's detail
// ─────────────────────────────────────────────────────────────────────────────
export function useWorkflowRun(runId) {
    const [run, setRun] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!runId)
            return;
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWorkflowApi(`/runs/${runId}`);
            setRun(data?.run ?? null);
            setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load workflow run'));
        }
        finally {
            setLoading(false);
        }
    }, [runId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { run, tasks, loading, error, refresh };
}
// ─────────────────────────────────────────────────────────────────────────────
// useWorkflowRunEvents - get run event timeline
// ─────────────────────────────────────────────────────────────────────────────
export function useWorkflowRunEvents(runId) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!runId)
            return;
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWorkflowApi(`/runs/${runId}/events`);
            setEvents(Array.isArray(data?.events) ? data.events : []);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load run events'));
        }
        finally {
            setLoading(false);
        }
    }, [runId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { events, loading, error, refresh };
}
// ─────────────────────────────────────────────────────────────────────────────
// useWorkflowRunTasks - get tasks for a run
// ─────────────────────────────────────────────────────────────────────────────
export function useWorkflowRunTasks(runId) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        if (!runId)
            return;
        try {
            setLoading(true);
            setError(null);
            const data = await fetchWorkflowApi(`/runs/${runId}/tasks`);
            setTasks(Array.isArray(data?.items) ? data.items : []);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load run tasks'));
        }
        finally {
            setLoading(false);
        }
    }, [runId]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    // Actions
    const approveTask = useCallback(async (taskId, comment) => {
        if (!runId)
            return;
        await fetchWorkflowApi(`/runs/${runId}/tasks/${taskId}/approve`, {
            method: 'POST',
            body: JSON.stringify(comment ? { comment } : {}),
        });
        await refresh();
    }, [runId, refresh]);
    const denyTask = useCallback(async (taskId, comment) => {
        if (!runId)
            return;
        await fetchWorkflowApi(`/runs/${runId}/tasks/${taskId}/deny`, {
            method: 'POST',
            body: JSON.stringify(comment ? { comment } : {}),
        });
        await refresh();
    }, [runId, refresh]);
    return { tasks, loading, error, refresh, approveTask, denyTask };
}
// ─────────────────────────────────────────────────────────────────────────────
// useMyWorkflowTasks - tasks assigned to current user (global inbox)
// ─────────────────────────────────────────────────────────────────────────────
export function useMyWorkflowTasks(opts = {}) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (opts.includeResolved)
                params.set('includeResolved', 'true');
            const data = await fetchWorkflowApi(`/tasks?${params.toString()}`);
            setTasks(Array.isArray(data?.items) ? data.items : []);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load tasks'));
        }
        finally {
            setLoading(false);
        }
    }, [opts.includeResolved]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { tasks, loading, error, refresh };
}
