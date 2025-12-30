'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import { RefreshCw, Inbox, ThumbsUp, ThumbsDown, Clock, User, ExternalLink, CheckCircle2, XCircle, Filter, } from 'lucide-react';
import { useMyWorkflowTasks } from '../hooks/useWorkflowRuns';
function TaskRow({ task, onApprove, onDeny, onNavigateToRun, isActioning, }) {
    const { Badge, Button } = useUi();
    const isPending = task.status === 'pending';
    return (_jsxs("div", { className: "flex items-start gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors", children: [_jsx("div", { className: `flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isPending
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                    : task.status === 'approved'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                        : task.status === 'denied'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`, children: isPending ? (_jsx(Clock, { size: 20 })) : task.status === 'approved' ? (_jsx(CheckCircle2, { size: 20 })) : task.status === 'denied' ? (_jsx(XCircle, { size: 20 })) : (_jsx(User, { size: 20 })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1 flex-wrap", children: [_jsx("span", { className: "font-medium text-gray-900 dark:text-gray-100", children: task.taskType === 'approval' ? 'Approval Request' : 'Human Input Required' }), _jsx(Badge, { variant: task.status === 'pending'
                                    ? 'warning'
                                    : task.status === 'approved'
                                        ? 'success'
                                        : task.status === 'denied'
                                            ? 'error'
                                            : 'default', children: task.status })] }), _jsxs("div", { className: "text-sm text-gray-600 dark:text-gray-400 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-gray-500", children: "Node:" }), _jsx("code", { className: "bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono", children: task.nodeId })] }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: [_jsx(Clock, { size: 12 }), _jsx("span", { children: formatRelativeTime(task.createdAt) }), _jsx("span", { className: "text-gray-400", children: "\u2022" }), _jsx("span", { children: formatDateTime(task.createdAt) })] })] }), task.metadata && Object.keys(task.metadata).length > 0 && (_jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300", children: "Show details" }), _jsx("pre", { className: "mt-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-auto max-h-32", children: JSON.stringify(task.metadata, null, 2) })] }))] }), _jsxs("div", { className: "flex-shrink-0 flex items-center gap-2", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: onNavigateToRun, title: "View workflow run", children: _jsx(ExternalLink, { size: 14 }) }), isPending && (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "primary", size: "sm", onClick: onApprove, disabled: isActioning, children: [_jsx(ThumbsUp, { size: 14, className: "mr-1" }), "Approve"] }), _jsxs(Button, { variant: "secondary", size: "sm", onClick: onDeny, disabled: isActioning, children: [_jsx(ThumbsDown, { size: 14, className: "mr-1" }), "Deny"] })] }))] })] }));
}
export function ApprovalsInbox({ onNavigate }) {
    const { Page, Card, Button, Alert, Badge } = useUi();
    const [includeResolved, setIncludeResolved] = useState(false);
    const { tasks, loading, error, refresh } = useMyWorkflowTasks({ includeResolved });
    const [actioningTaskId, setActioningTaskId] = useState(null);
    const [actionError, setActionError] = useState(null);
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    const handleApprove = async (task) => {
        try {
            setActioningTaskId(task.id);
            setActionError(null);
            const res = await fetch(`/api/workflows/runs/${task.runId}/tasks/${task.id}/approve`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(typeof localStorage !== 'undefined' && localStorage.getItem('hit_token')
                        ? { Authorization: `Bearer ${localStorage.getItem('hit_token')}` }
                        : {}),
                },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || body.message || 'Failed to approve task');
            }
            await refresh();
        }
        catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to approve task');
        }
        finally {
            setActioningTaskId(null);
        }
    };
    const handleDeny = async (task) => {
        try {
            setActioningTaskId(task.id);
            setActionError(null);
            const res = await fetch(`/api/workflows/runs/${task.runId}/tasks/${task.id}/deny`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(typeof localStorage !== 'undefined' && localStorage.getItem('hit_token')
                        ? { Authorization: `Bearer ${localStorage.getItem('hit_token')}` }
                        : {}),
                },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || body.message || 'Failed to deny task');
            }
            await refresh();
        }
        catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to deny task');
        }
        finally {
            setActioningTaskId(null);
        }
    };
    const pendingCount = tasks.filter((t) => t.status === 'pending').length;
    return (_jsxs(Page, { title: "My Approvals", description: "Tasks assigned to you that require action", actions: _jsxs("div", { className: "flex gap-2 items-center", children: [_jsxs(Button, { variant: includeResolved ? 'primary' : 'secondary', size: "sm", onClick: () => setIncludeResolved(!includeResolved), children: [_jsx(Filter, { size: 14, className: "mr-1" }), includeResolved ? 'Showing All' : 'Pending Only'] }), _jsxs(Button, { variant: "primary", onClick: refresh, disabled: loading, children: [_jsx(RefreshCw, { size: 16, className: "mr-2" }), "Refresh"] })] }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading tasks", children: error.message })), actionError && (_jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "error", title: "Action failed", children: actionError }) })), !loading && tasks.length > 0 && (_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [_jsxs(Badge, { variant: pendingCount > 0 ? 'warning' : 'success', children: [pendingCount, " pending"] }), includeResolved && (_jsxs(Badge, { variant: "default", children: [tasks.length - pendingCount, " resolved"] }))] })), loading ? (_jsx(Card, { children: _jsx("div", { className: "text-center py-12 text-gray-500", children: "Loading tasks..." }) })) : tasks.length === 0 ? (_jsx(Card, { children: _jsxs("div", { className: "text-center py-12", children: [_jsx(Inbox, { size: 48, className: "mx-auto text-gray-400 mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-1", children: includeResolved ? 'No tasks found' : 'All caught up!' }), _jsx("p", { className: "text-gray-500", children: includeResolved
                                ? 'No workflow tasks have been assigned to you yet.'
                                : 'You have no pending approvals. Check back later or toggle to see resolved tasks.' })] }) })) : (_jsx("div", { className: "space-y-3", children: tasks.map((task) => (_jsx(TaskRow, { task: task, onApprove: () => handleApprove(task), onDeny: () => handleDeny(task), onNavigateToRun: () => navigate(`/workflows/runs/${task.runId}`), isActioning: actioningTaskId === task.id }, task.id))) }))] }));
}
export default ApprovalsInbox;
