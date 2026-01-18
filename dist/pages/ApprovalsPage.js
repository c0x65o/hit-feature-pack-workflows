'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useMemo, useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useMyWorkflowTasks } from '@hit/feature-pack-workflow-core';
function getAuthHeaders() {
    if (typeof window === 'undefined')
        return {};
    const token = localStorage.getItem('hit_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}
function formatDateTime(value) {
    if (!value)
        return '—';
    const date = value instanceof Date ? value : new Date(value);
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
function taskTitle(task) {
    const prompt = task?.prompt && typeof task.prompt === 'object' ? task.prompt : null;
    if (prompt?.title)
        return String(prompt.title);
    if (task.type === 'approval')
        return 'Approval required';
    return 'Workflow task';
}
function taskMessage(task) {
    const prompt = task?.prompt && typeof task.prompt === 'object' ? task.prompt : null;
    if (prompt?.message)
        return String(prompt.message);
    if (prompt?.text)
        return String(prompt.text);
    return 'A workflow is waiting for human action.';
}
function taskViewUrl(task) {
    const prompt = task?.prompt && typeof task.prompt === 'object' ? task.prompt : null;
    const viewUrl = prompt?.viewUrl || prompt?.view_url || null;
    return typeof viewUrl === 'string' && viewUrl.trim() ? viewUrl.trim() : null;
}
function taskDecisionSummary(task) {
    const decision = task?.decision && typeof task.decision === 'object' ? task.decision : null;
    const action = decision?.action ? String(decision.action) : '';
    return action || null;
}
function statusBadgeVariant(status) {
    if (status === 'approved')
        return 'success';
    if (status === 'denied')
        return 'error';
    if (status === 'open')
        return 'warning';
    return 'default';
}
export default function ApprovalsPage(props) {
    return _jsx(ApprovalsPageView, { ...props });
}
export function ApprovalsPageView({ onNavigate }) {
    const { Page, Card, Button, Tabs, Badge, Alert, Spinner, EmptyState } = useUi();
    const [actionError, setActionError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [tab, setTab] = useState('pending');
    const pending = useMyWorkflowTasks({ includeResolved: false, limit: 100 });
    const history = useMyWorkflowTasks({ includeResolved: true, resolvedWithinHours: 24 * 30, limit: 200 });
    const navigate = (path) => {
        if (onNavigate)
            onNavigate(path);
        else if (typeof window !== 'undefined')
            window.location.href = path;
    };
    const refreshAll = useCallback(async () => {
        setActionError(null);
        await Promise.all([pending.refresh(), history.refresh()]);
    }, [pending, history]);
    const runTaskAction = useCallback(async (task, action) => {
        const runId = String(task?.runId || '');
        const taskId = String(task?.id || '');
        if (!runId || !taskId)
            return;
        const key = `${taskId}:${action}`;
        setActionLoading((prev) => ({ ...(prev || {}), [key]: true }));
        setActionError(null);
        try {
            const path = `/api/workflows/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/${action}`;
            const res = await fetch(path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                credentials: 'include',
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                const msg = json?.error || json?.detail || 'Action failed';
                throw new Error(String(msg));
            }
            await refreshAll();
        }
        catch (e) {
            setActionError(e instanceof Error ? e.message : 'Action failed');
        }
        finally {
            setActionLoading((prev) => ({ ...(prev || {}), [key]: false }));
        }
    }, [refreshAll]);
    const pendingItems = useMemo(() => pending.tasks || [], [pending.tasks]);
    const historyItems = useMemo(() => history.tasks || [], [history.tasks]);
    const isLoading = pending.loading || history.loading;
    const error = pending.error || history.error;
    const renderTaskRow = (task, showActions) => {
        const viewUrl = taskViewUrl(task);
        const decision = taskDecisionSummary(task);
        const status = String(task.status || 'open');
        const isApproveLoading = Boolean(actionLoading[`${task.id}:approve`]);
        const isDenyLoading = Boolean(actionLoading[`${task.id}:deny`]);
        return (_jsxs("div", { className: "border rounded-lg p-4 flex flex-col gap-3", style: { borderColor: 'var(--hit-border, #1f2937)' }, children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold", children: taskTitle(task) }), _jsx("div", { className: "text-sm opacity-80", children: taskMessage(task) })] }), _jsx(Badge, { variant: statusBadgeVariant(status), children: status })] }), _jsxs("div", { className: "text-xs opacity-70 flex flex-wrap gap-3", children: [_jsxs("span", { children: ["Created: ", formatDateTime(task.createdAt)] }), task.decidedAt ? _jsxs("span", { children: ["Decided: ", formatDateTime(task.decidedAt)] }) : null, decision ? _jsxs("span", { children: ["Decision: ", decision] }) : null] }), _jsxs("div", { className: "flex items-center gap-2", children: [viewUrl ? (_jsx(Button, { variant: "secondary", size: "sm", onClick: () => navigate(viewUrl), children: "View Request" })) : null, showActions ? (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "primary", size: "sm", loading: isApproveLoading, disabled: isApproveLoading || isDenyLoading, onClick: () => runTaskAction(task, 'approve'), children: [_jsx(Check, { size: 14, className: "mr-2" }), "Approve"] }), _jsxs(Button, { variant: "danger", size: "sm", loading: isDenyLoading, disabled: isApproveLoading || isDenyLoading, onClick: () => runTaskAction(task, 'deny'), children: [_jsx(X, { size: 14, className: "mr-2" }), "Deny"] })] })) : null] })] }, task.id));
    };
    const pendingContent = (_jsx(Card, { children: pending.loading ? (_jsx(Spinner, {})) : pendingItems.length === 0 ? (_jsx(EmptyState, { title: "No pending approvals", description: "You have no workflow tasks waiting for action." })) : (_jsx("div", { className: "flex flex-col gap-3", children: pendingItems.map((t) => renderTaskRow(t, true)) })) }));
    const historyContent = (_jsx(Card, { children: history.loading ? (_jsx(Spinner, {})) : historyItems.length === 0 ? (_jsx(EmptyState, { title: "No recent approvals", description: "No approvals in the last 30 days." })) : (_jsx("div", { className: "flex flex-col gap-3", children: historyItems.map((t) => renderTaskRow(t, false)) })) }));
    return (_jsxs(Page, { title: "Approvals", description: "Review pending approvals and your recent decisions.", onNavigate: navigate, actions: _jsxs(Button, { variant: "secondary", size: "sm", onClick: refreshAll, disabled: isLoading, children: [_jsx(RefreshCw, { size: 14, className: "mr-2" }), "Refresh"] }), children: [error ? _jsx(Alert, { variant: "error", children: error.message }) : null, actionError ? _jsx(Alert, { variant: "error", children: actionError }) : null, _jsx(Tabs, { tabs: [
                    { id: 'pending', label: `Pending (${pendingItems.length})`, content: pendingContent },
                    { id: 'history', label: `History (${historyItems.length})`, content: historyContent },
                ], activeTab: tab, onTabChange: (id) => setTab(id === 'history' ? 'history' : 'pending') })] }));
}
