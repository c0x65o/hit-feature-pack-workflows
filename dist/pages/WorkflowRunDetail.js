'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight, Play, Pause, CheckCircle2, XCircle, Clock, User, Zap, AlertTriangle, FileText, ThumbsUp, ThumbsDown, } from 'lucide-react';
import { useWorkflowRun, useWorkflowRunEvents, useWorkflowRunTasks, } from '../hooks/useWorkflowRuns';
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function JsonBlock({ value }) {
    const s = JSON.stringify(value, null, 2);
    return (_jsx("pre", { className: "text-xs whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-3 overflow-auto max-h-[40vh]", children: s }));
}
function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(2)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
}
function getStatusIcon(status) {
    switch (status) {
        case 'running':
            return _jsx(Play, { size: 16, className: "text-blue-500" });
        case 'waiting':
            return _jsx(Pause, { size: 16, className: "text-amber-500" });
        case 'completed':
            return _jsx(CheckCircle2, { size: 16, className: "text-emerald-500" });
        case 'failed':
            return _jsx(XCircle, { size: 16, className: "text-red-500" });
        case 'cancelled':
            return _jsx(XCircle, { size: 16, className: "text-gray-500" });
        default:
            return _jsx(Clock, { size: 16, className: "text-gray-400" });
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
function getEventIcon(eventType) {
    if (eventType.includes('start'))
        return _jsx(Play, { size: 16 });
    if (eventType.includes('complete') || eventType.includes('success'))
        return _jsx(CheckCircle2, { size: 16 });
    if (eventType.includes('fail') || eventType.includes('error'))
        return _jsx(XCircle, { size: 16 });
    if (eventType.includes('wait') || eventType.includes('pause'))
        return _jsx(Pause, { size: 16 });
    if (eventType.includes('task') || eventType.includes('approval'))
        return _jsx(User, { size: 16 });
    if (eventType.includes('trigger'))
        return _jsx(Zap, { size: 16 });
    return _jsx(FileText, { size: 16 });
}
function getEventColor(eventType) {
    if (eventType.includes('start'))
        return 'text-blue-600 dark:text-blue-400';
    if (eventType.includes('complete') || eventType.includes('success'))
        return 'text-emerald-600 dark:text-emerald-400';
    if (eventType.includes('fail') || eventType.includes('error'))
        return 'text-red-600 dark:text-red-400';
    if (eventType.includes('wait') || eventType.includes('pause'))
        return 'text-amber-600 dark:text-amber-400';
    if (eventType.includes('task') || eventType.includes('approval'))
        return 'text-purple-600 dark:text-purple-400';
    return 'text-gray-600 dark:text-gray-400';
}
function getEventVariant(eventType) {
    if (eventType.includes('fail') || eventType.includes('error'))
        return 'error';
    if (eventType.includes('complete') || eventType.includes('success'))
        return 'success';
    if (eventType.includes('wait') || eventType.includes('pause'))
        return 'warning';
    if (eventType.includes('start') || eventType.includes('trigger'))
        return 'info';
    return 'default';
}
function formatEventType(eventType) {
    return eventType
        .split(/[._-]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' → ');
}
// ─────────────────────────────────────────────────────────────────────────────
// EventStep component
// ─────────────────────────────────────────────────────────────────────────────
function EventStep({ event, index, prevEvent, isExpanded, onToggle, }) {
    const { Badge } = useUi();
    const duration = prevEvent
        ? new Date(event.timestamp).getTime() - new Date(prevEvent.timestamp).getTime()
        : null;
    const variant = getEventVariant(event.eventType);
    const color = getEventColor(event.eventType);
    return (_jsxs("div", { className: "relative", children: [index > 0 && (_jsx("div", { className: "absolute left-5 top-0 w-0.5 h-6 bg-gray-200 dark:bg-gray-700 -translate-y-full" })), _jsxs("div", { className: "relative flex gap-4 group", children: [_jsx("div", { className: `flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${isExpanded
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'}`, children: _jsx("div", { className: color, children: getEventIcon(event.eventType) }) }), _jsxs("div", { className: "flex-1 min-w-0 pb-6", children: [_jsxs("button", { onClick: onToggle, className: "w-full text-left flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(Badge, { variant: variant, children: formatEventType(event.eventType) }), duration !== null && (_jsxs("span", { className: "text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1", children: [_jsx(Clock, { size: 12 }), "+", formatDuration(duration)] })), _jsxs("span", { className: "text-xs text-gray-400 dark:text-gray-500 font-mono", children: ["#", event.sequence] })] }), _jsx("div", { className: "mt-1 text-xs text-gray-500", children: formatDateTime(event.timestamp) })] }), _jsx("div", { className: "flex-shrink-0 text-gray-400 dark:text-gray-500", children: isExpanded ? _jsx(ChevronDown, { size: 20 }) : _jsx(ChevronRight, { size: 20 }) })] }), isExpanded && event.payload && Object.keys(event.payload).length > 0 && (_jsx("div", { className: "mt-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700", children: _jsxs("div", { className: "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4", children: [_jsx("h4", { className: "font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm", children: "Event Payload" }), _jsx(JsonBlock, { value: event.payload })] }) }))] })] })] }));
}
// ─────────────────────────────────────────────────────────────────────────────
// TaskCard component
// ─────────────────────────────────────────────────────────────────────────────
function TaskCard({ task, onApprove, onDeny, }) {
    const { Card, Button, Badge } = useUi();
    const isPending = task.status === 'pending';
    return (_jsx(Card, { className: "border-l-4 border-l-amber-500", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(User, { size: 16, className: "text-amber-500" }), _jsx("span", { className: "font-medium", children: task.taskType === 'approval' ? 'Approval Required' : 'Human Input Required' }), _jsx(Badge, { variant: task.status === 'pending'
                                        ? 'warning'
                                        : task.status === 'approved'
                                            ? 'success'
                                            : task.status === 'denied'
                                                ? 'error'
                                                : 'default', children: task.status })] }), _jsxs("div", { className: "text-sm text-gray-600 dark:text-gray-400 space-y-1", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Node:" }), ' ', _jsx("code", { className: "bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs", children: task.nodeId })] }), task.assignedToPrincipalId && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Assigned to:" }), ' ', _jsxs("span", { className: "font-mono text-xs", children: [task.assignedToPrincipalType, ":", task.assignedToPrincipalId] })] })), task.metadata && Object.keys(task.metadata).length > 0 && (_jsxs("details", { className: "mt-2", children: [_jsx("summary", { className: "cursor-pointer text-xs text-gray-500 hover:text-gray-700", children: "Show metadata" }), _jsx("div", { className: "mt-2", children: _jsx(JsonBlock, { value: task.metadata }) })] }))] })] }), isPending && (_jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "primary", size: "sm", onClick: onApprove, children: [_jsx(ThumbsUp, { size: 14, className: "mr-1" }), "Approve"] }), _jsxs(Button, { variant: "secondary", size: "sm", onClick: onDeny, children: [_jsx(ThumbsDown, { size: 14, className: "mr-1" }), "Deny"] })] }))] }) }));
}
// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function WorkflowRunDetail({ runId, onNavigate }) {
    const { Page, Card, Button, Alert, Badge } = useUi();
    const { run, loading: runLoading, error: runError, refresh: refreshRun } = useWorkflowRun(runId);
    const { events, loading: eventsLoading, error: eventsError, refresh: refreshEvents } = useWorkflowRunEvents(runId);
    const { tasks, loading: tasksLoading, approveTask, denyTask, refresh: refreshTasks } = useWorkflowRunTasks(runId);
    const [expandedEvents, setExpandedEvents] = useState(new Set([0]));
    const [actionError, setActionError] = useState(null);
    const loading = runLoading || eventsLoading;
    const error = runError || eventsError;
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    const refresh = () => {
        refreshRun();
        refreshEvents();
        refreshTasks();
    };
    const toggleEvent = (index) => {
        setExpandedEvents((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            }
            else {
                next.add(index);
            }
            return next;
        });
    };
    const expandAll = () => {
        setExpandedEvents(new Set(events.map((_, i) => i)));
    };
    const collapseAll = () => {
        setExpandedEvents(new Set());
    };
    const handleApprove = async (taskId) => {
        try {
            setActionError(null);
            await approveTask(taskId);
            refresh();
        }
        catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to approve task');
        }
    };
    const handleDeny = async (taskId) => {
        try {
            setActionError(null);
            await denyTask(taskId);
            refresh();
        }
        catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to deny task');
        }
    };
    const eventStats = useMemo(() => {
        if (!events.length)
            return null;
        const stats = {
            total: events.length,
            errors: 0,
            waits: 0,
        };
        events.forEach((e) => {
            if (e.eventType.includes('error') || e.eventType.includes('fail'))
                stats.errors++;
            if (e.eventType.includes('wait') || e.eventType.includes('pause'))
                stats.waits++;
        });
        return stats;
    }, [events]);
    const durationMs = useMemo(() => {
        if (!run)
            return null;
        const start = new Date(run.startedAt).getTime();
        const end = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
        return end - start;
    }, [run]);
    const pendingTasks = tasks.filter((t) => t.status === 'pending');
    return (_jsxs(Page, { title: "Workflow Run", description: runId, actions: _jsxs("div", { className: "flex gap-2 items-center", children: [_jsxs(Button, { variant: "secondary", onClick: () => navigate('/workflows/runs'), children: [_jsx(ArrowLeft, { size: 16, className: "mr-2" }), "Back"] }), _jsxs(Button, { variant: "primary", onClick: refresh, disabled: loading, children: [_jsx(RefreshCw, { size: 16, className: "mr-2" }), "Refresh"] })] }), children: [error && (_jsx(Alert, { variant: "error", title: "Error loading workflow run", children: error.message })), actionError && (_jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "error", title: "Action failed", children: actionError }) })), pendingTasks.length > 0 && (_jsx("div", { className: "mb-4", children: _jsx(Alert, { variant: "warning", title: "Approval Required", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { size: 16 }), _jsxs("span", { children: ["This workflow run is waiting for ", pendingTasks.length, " pending", ' ', pendingTasks.length === 1 ? 'task' : 'tasks', "."] })] }) }) })), run && (_jsx(Card, { className: "mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Status" }), _jsxs("div", { className: "flex items-center gap-2", children: [getStatusIcon(run.status), _jsx(Badge, { variant: getStatusVariant(run.status), children: run.status })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Started" }), _jsx("div", { className: "font-medium", children: formatDateTime(run.startedAt) }), _jsx("div", { className: "text-xs text-gray-500", children: formatRelativeTime(run.startedAt) })] }), durationMs !== null && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Duration" }), _jsx("div", { className: "font-medium", children: formatDuration(durationMs) })] })), eventStats && (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1", children: "Events" }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsxs(Badge, { variant: "info", children: [eventStats.total, " total"] }), eventStats.errors > 0 && _jsxs(Badge, { variant: "error", children: [eventStats.errors, " errors"] }), eventStats.waits > 0 && _jsxs(Badge, { variant: "warning", children: [eventStats.waits, " waits"] })] })] }))] }) })), run?.workflow && (_jsx(Card, { className: "mb-6", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Zap, { size: 20, className: "text-blue-500" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium", children: run.workflow.name }), run.workflow.slug && (_jsx("div", { className: "text-xs text-gray-500 font-mono", children: run.workflow.slug }))] })] }) })), run?.input && Object.keys(run.input).length > 0 && (_jsx(Card, { className: "mb-6", children: _jsxs("details", { className: "group", children: [_jsxs("summary", { className: "cursor-pointer flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-3", children: [_jsx(ChevronRight, { size: 16, className: "group-open:rotate-90 transition-transform" }), "Run Input"] }), _jsx(JsonBlock, { value: run.input })] }) })), run?.output && Object.keys(run.output).length > 0 && (_jsx(Card, { className: "mb-6", children: _jsxs("details", { className: "group", children: [_jsxs("summary", { className: "cursor-pointer flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-3", children: [_jsx(ChevronRight, { size: 16, className: "group-open:rotate-90 transition-transform" }), "Run Output"] }), _jsx(JsonBlock, { value: run.output })] }) })), pendingTasks.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4", children: "Pending Tasks" }), _jsx("div", { className: "space-y-3", children: pendingTasks.map((task) => (_jsx(TaskCard, { task: task, onApprove: () => handleApprove(task.id), onDeny: () => handleDeny(task.id) }, task.id))) })] })), _jsxs(Card, { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100", children: "Event Timeline" }), events.length > 0 && (_jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: expandAll, children: "Expand All" }), _jsx(Button, { variant: "secondary", size: "sm", onClick: collapseAll, children: "Collapse All" })] }))] }), loading ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "Loading run..." })) : events.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No events found for this run." })) : (_jsx("div", { className: "space-y-0", children: events.map((event, index) => (_jsx(EventStep, { event: event, index: index, prevEvent: index > 0 ? events[index - 1] : null, isExpanded: expandedEvents.has(index), onToggle: () => toggleEvent(index) }, event.id))) }))] })] }));
}
export default WorkflowRunDetail;
