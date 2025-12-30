'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useUi } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import { RefreshCw, Play, Clock, CheckCircle2, XCircle, Pause } from 'lucide-react';
import { useAllWorkflowRuns } from '../hooks/useWorkflowRuns';
function getStatusIcon(status) {
    switch (status) {
        case 'running':
            return _jsx(Play, { size: 14, className: "text-blue-500" });
        case 'waiting':
            return _jsx(Pause, { size: 14, className: "text-amber-500" });
        case 'completed':
            return _jsx(CheckCircle2, { size: 14, className: "text-emerald-500" });
        case 'failed':
            return _jsx(XCircle, { size: 14, className: "text-red-500" });
        case 'cancelled':
            return _jsx(XCircle, { size: 14, className: "text-gray-500" });
        default:
            return _jsx(Clock, { size: 14, className: "text-gray-400" });
    }
}
function getStatusVariant(status) {
    switch (status) {
        case 'running':
            return 'info';
        case 'waiting':
            return 'warning';
        case 'completed':
            return 'success';
        case 'failed':
            return 'error';
        case 'cancelled':
            return 'default';
        default:
            return 'default';
    }
}
export function WorkflowRunsList({ onNavigate }) {
    const { Page, Card, Button, DataTable, Alert, Badge } = useUi();
    const { runs, loading, error, refresh } = useAllWorkflowRuns({ limit: 100 });
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    return (_jsxs(Page, { title: "Workflow Runs", description: "View execution history and timeline for all workflows", actions: _jsx("div", { className: "flex gap-2 items-center", children: _jsxs(Button, { variant: "primary", onClick: refresh, disabled: loading, children: [_jsx(RefreshCw, { size: 16, className: "mr-2" }), "Refresh"] }) }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading workflow runs", children: error.message })), _jsx(Card, { children: _jsx(DataTable, { loading: loading, data: runs, emptyMessage: "No workflow runs yet. Workflow runs will appear here as they are executed.", columns: [
                        {
                            key: 'startedAt',
                            label: 'Started',
                            sortable: true,
                            render: (value) => {
                                const iso = typeof value === 'string' ? value : null;
                                if (!iso)
                                    return _jsx("span", { className: "text-gray-500", children: "\u2014" });
                                return (_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-medium", children: formatRelativeTime(iso) }), _jsx("span", { className: "text-xs text-gray-500", children: formatDateTime(iso) })] }));
                            },
                        },
                        {
                            key: 'id',
                            label: 'Run ID',
                            render: (value, row) => (_jsxs("span", { role: "button", tabIndex: 0, className: "font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer", onClick: () => navigate(`/workflows/runs/${encodeURIComponent(String(value))}`), onKeyDown: (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        navigate(`/workflows/runs/${encodeURIComponent(String(value))}`);
                                    }
                                }, children: [String(value).slice(0, 8), "..."] })),
                        },
                        {
                            key: 'workflowName',
                            label: 'Workflow',
                            render: (value, row) => {
                                const name = value || row?.workflow?.name;
                                return name ? (_jsx("span", { className: "font-medium", children: String(name) })) : (_jsx("span", { className: "text-gray-500 font-mono text-xs", children: String(row?.workflowId || '').slice(0, 8) }));
                            },
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            sortable: true,
                            render: (value) => {
                                const status = value;
                                return (_jsxs("div", { className: "flex items-center gap-2", children: [getStatusIcon(status), _jsx(Badge, { variant: getStatusVariant(status), children: status })] }));
                            },
                        },
                        {
                            key: 'triggerType',
                            label: 'Trigger',
                            render: (value) => value ? (_jsx(Badge, { variant: "default", children: String(value) })) : (_jsx("span", { className: "text-gray-500", children: "\u2014" })),
                        },
                        {
                            key: 'completedAt',
                            label: 'Duration',
                            render: (value, row) => {
                                const startedAt = row?.startedAt;
                                const completedAt = value;
                                if (!startedAt)
                                    return _jsx("span", { className: "text-gray-500", children: "\u2014" });
                                const start = new Date(startedAt).getTime();
                                const end = completedAt ? new Date(completedAt).getTime() : Date.now();
                                const durationMs = end - start;
                                if (durationMs < 1000) {
                                    return _jsxs("span", { className: "text-gray-600", children: [durationMs, "ms"] });
                                }
                                if (durationMs < 60000) {
                                    return _jsxs("span", { className: "text-gray-600", children: [(durationMs / 1000).toFixed(1), "s"] });
                                }
                                const mins = Math.floor(durationMs / 60000);
                                const secs = Math.round((durationMs % 60000) / 1000);
                                return (_jsxs("span", { className: "text-gray-600", children: [mins, "m ", secs, "s"] }));
                            },
                        },
                    ] }) })] }));
}
export default WorkflowRunsList;
