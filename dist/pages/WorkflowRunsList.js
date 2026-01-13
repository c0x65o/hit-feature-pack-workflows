'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { useServerDataTableState, useUi } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import { RefreshCw, Play, Clock, CheckCircle2, XCircle, Pause } from 'lucide-react';
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
    const serverTable = useServerDataTableState({
        tableId: 'workflows.runs',
        pageSize: 25,
        initialSort: { sortBy: 'startedAt', sortOrder: 'desc' },
        sortWhitelist: ['startedAt', 'createdAt', 'status', 'completedAt'],
    });
    const [runs, setRuns] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            params.set('page', String(serverTable.query.page));
            params.set('pageSize', String(serverTable.query.pageSize));
            if (serverTable.query.search)
                params.set('search', serverTable.query.search);
            if (serverTable.query.sortBy)
                params.set('sortBy', serverTable.query.sortBy);
            if (serverTable.query.sortOrder)
                params.set('sortOrder', serverTable.query.sortOrder);
            // Map quick filters (from Filters button) to API params.
            // The runs API supports a first-class `status` param.
            const status = serverTable.quickFilterValues?.status;
            if (typeof status === 'string' && status.trim()) {
                params.set('status', status.trim());
            }
            const res = await fetch(`/api/workflows/runs?${params.toString()}`, { method: 'GET' });
            const json = await res.json().catch(() => ({}));
            if (!res.ok)
                throw new Error(json?.error || 'Failed to fetch workflow runs');
            const items = Array.isArray(json?.items) ? json.items : [];
            setRuns(items);
            setTotal(Number(json?.pagination?.total || 0));
        }
        catch (e) {
            setError(e instanceof Error ? e : new Error('Failed to fetch workflow runs'));
            setRuns([]);
            setTotal(0);
        }
        finally {
            setLoading(false);
        }
    }, [
        serverTable.query.page,
        serverTable.query.pageSize,
        serverTable.query.search,
        serverTable.query.sortBy,
        serverTable.query.sortOrder,
        serverTable.quickFilterValues,
    ]);
    useEffect(() => {
        refresh();
    }, [refresh]);
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    return (_jsxs(Page, { title: "Workflow Runs", description: "View execution history and timeline for all workflows", actions: _jsx("div", { className: "flex gap-2 items-center", children: _jsxs(Button, { variant: "primary", onClick: refresh, disabled: loading, children: [_jsx(RefreshCw, { size: 16, className: "mr-2" }), "Refresh"] }) }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading workflow runs", children: error.message })), _jsx(Card, { children: _jsx(DataTable, { loading: loading, data: runs, total: total, ...serverTable.dataTable, emptyMessage: "No workflow runs yet. Workflow runs will appear here as they are executed.", searchable: true, exportable: true, showColumnVisibility: true, onRefresh: refresh, refreshing: loading, searchDebounceMs: 400, columns: [
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
