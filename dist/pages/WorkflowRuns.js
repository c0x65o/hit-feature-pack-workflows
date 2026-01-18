'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useAllWorkflowRuns } from '../hooks/useWorkflowRuns';
function formatDateTime(value) {
    if (!value)
        return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return String(value);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
function statusVariant(status) {
    if (status === 'completed')
        return 'success';
    if (status === 'failed')
        return 'error';
    if (status === 'waiting')
        return 'warning';
    if (status === 'running')
        return 'info';
    return 'default';
}
export default function WorkflowRunsPage() {
    const { Page, Card, Button, Badge, Alert, DataTable } = useUi();
    const { runs, loading, error, refresh } = useAllWorkflowRuns({ limit: 200 });
    const rows = useMemo(() => {
        return (runs || []).map((run) => ({
            id: run.id,
            workflowName: run.workflowName || run.workflowId,
            status: run.status,
            triggerType: run.triggerType || '—',
            triggerRef: run.triggerRef || '—',
            startedAt: run.startedAt,
            completedAt: run.completedAt || null,
        }));
    }, [runs]);
    return (_jsxs(Page, { title: "Workflow Runs", description: "Recent workflow executions across the system.", actions: _jsxs(Button, { variant: "secondary", size: "sm", onClick: () => refresh(), disabled: loading, children: [_jsx(RefreshCw, { size: 14, className: "mr-2" }), "Refresh"] }), children: [error ? _jsx(Alert, { variant: "error", children: error.message }) : null, _jsx(Card, { children: _jsx(DataTable, { columns: [
                        {
                            key: 'workflowName',
                            label: 'Workflow',
                            render: (value) => _jsx("span", { className: "font-medium", children: String(value || '—') }),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (value) => (_jsx(Badge, { variant: statusVariant(String(value || '')), children: String(value || '—') })),
                        },
                        { key: 'triggerType', label: 'Trigger' },
                        { key: 'triggerRef', label: 'Ref' },
                        {
                            key: 'startedAt',
                            label: 'Started',
                            render: (value) => formatDateTime(String(value || '')),
                        },
                        {
                            key: 'completedAt',
                            label: 'Completed',
                            render: (value) => formatDateTime(value ? String(value) : null),
                        },
                    ], data: rows, loading: loading, emptyMessage: "No workflow runs yet.", onRefresh: refresh }) })] }));
}
