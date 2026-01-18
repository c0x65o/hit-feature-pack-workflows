'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useMyWorkflowTasks, type WorkflowTaskView } from '@hit/feature-pack-workflow-core';

interface ApprovalsPageProps {
  onNavigate?: (path: string) => void;
}

type TaskAction = 'approve' | 'deny';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('hit_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function taskTitle(task: WorkflowTaskView): string {
  const prompt = task?.prompt && typeof task.prompt === 'object' ? (task.prompt as any) : null;
  if (prompt?.title) return String(prompt.title);
  if (task.type === 'approval') return 'Approval required';
  return 'Workflow task';
}

function taskMessage(task: WorkflowTaskView): string {
  const prompt = task?.prompt && typeof task.prompt === 'object' ? (task.prompt as any) : null;
  if (prompt?.message) return String(prompt.message);
  if (prompt?.text) return String(prompt.text);
  return 'A workflow is waiting for human action.';
}

function taskViewUrl(task: WorkflowTaskView): string | null {
  const prompt = task?.prompt && typeof task.prompt === 'object' ? (task.prompt as any) : null;
  const viewUrl = prompt?.viewUrl || prompt?.view_url || null;
  return typeof viewUrl === 'string' && viewUrl.trim() ? viewUrl.trim() : null;
}

function taskDecisionSummary(task: WorkflowTaskView): string | null {
  const decision = task?.decision && typeof task.decision === 'object' ? (task.decision as any) : null;
  const action = decision?.action ? String(decision.action) : '';
  return action || null;
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  if (status === 'approved') return 'success';
  if (status === 'denied') return 'error';
  if (status === 'open') return 'warning';
  return 'default';
}

export default function ApprovalsPage(props: ApprovalsPageProps) {
  return <ApprovalsPageView {...props} />;
}

export function ApprovalsPageView({ onNavigate }: ApprovalsPageProps) {
  const { Page, Card, Button, Tabs, Badge, Alert, Spinner, EmptyState } = useUi();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'pending' | 'history'>('pending');

  const pending = useMyWorkflowTasks({ includeResolved: false, limit: 100 });
  const history = useMyWorkflowTasks({ includeResolved: true, resolvedWithinHours: 24 * 30, limit: 200 });

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const refreshAll = useCallback(async () => {
    setActionError(null);
    await Promise.all([pending.refresh(), history.refresh()]);
  }, [pending, history]);

  const runTaskAction = useCallback(
    async (task: WorkflowTaskView, action: TaskAction) => {
      const runId = String(task?.runId || '');
      const taskId = String(task?.id || '');
      if (!runId || !taskId) return;
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
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Action failed');
      } finally {
        setActionLoading((prev) => ({ ...(prev || {}), [key]: false }));
      }
    },
    [refreshAll]
  );

  const pendingItems = useMemo(() => pending.tasks || [], [pending.tasks]);
  const historyItems = useMemo(() => history.tasks || [], [history.tasks]);
  const isLoading = pending.loading || history.loading;
  const error = pending.error || history.error;

  const renderTaskRow = (task: WorkflowTaskView, showActions: boolean) => {
    const viewUrl = taskViewUrl(task);
    const decision = taskDecisionSummary(task);
    const status = String(task.status || 'open');
    const isApproveLoading = Boolean(actionLoading[`${task.id}:approve`]);
    const isDenyLoading = Boolean(actionLoading[`${task.id}:deny`]);

    return (
      <div key={task.id} className="border rounded-lg p-4 flex flex-col gap-3" style={{ borderColor: 'var(--hit-border, #1f2937)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{taskTitle(task)}</div>
            <div className="text-sm opacity-80">{taskMessage(task)}</div>
          </div>
          <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
        </div>
        <div className="text-xs opacity-70 flex flex-wrap gap-3">
          <span>Created: {formatDateTime(task.createdAt)}</span>
          {task.decidedAt ? <span>Decided: {formatDateTime(task.decidedAt)}</span> : null}
          {decision ? <span>Decision: {decision}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {viewUrl ? (
            <Button variant="secondary" size="sm" onClick={() => navigate(viewUrl)}>
              View Request
            </Button>
          ) : null}
          {showActions ? (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={isApproveLoading}
                disabled={isApproveLoading || isDenyLoading}
                onClick={() => runTaskAction(task, 'approve')}
              >
                <Check size={14} className="mr-2" />
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isDenyLoading}
                disabled={isApproveLoading || isDenyLoading}
                onClick={() => runTaskAction(task, 'deny')}
              >
                <X size={14} className="mr-2" />
                Deny
              </Button>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const pendingContent = (
    <Card>
      {pending.loading ? (
        <Spinner />
      ) : pendingItems.length === 0 ? (
        <EmptyState title="No pending approvals" description="You have no workflow tasks waiting for action." />
      ) : (
        <div className="flex flex-col gap-3">{pendingItems.map((t) => renderTaskRow(t, true))}</div>
      )}
    </Card>
  );

  const historyContent = (
    <Card>
      {history.loading ? (
        <Spinner />
      ) : historyItems.length === 0 ? (
        <EmptyState title="No recent approvals" description="No approvals in the last 30 days." />
      ) : (
        <div className="flex flex-col gap-3">{historyItems.map((t) => renderTaskRow(t, false))}</div>
      )}
    </Card>
  );

  return (
    <Page
      title="Approvals"
      description="Review pending approvals and your recent decisions."
      onNavigate={navigate}
      actions={
        <Button variant="secondary" size="sm" onClick={refreshAll} disabled={isLoading}>
          <RefreshCw size={14} className="mr-2" />
          Refresh
        </Button>
      }
    >
      {error ? <Alert variant="error">{error.message}</Alert> : null}
      {actionError ? <Alert variant="error">{actionError}</Alert> : null}
      <Tabs
        tabs={[
          { id: 'pending', label: `Pending (${pendingItems.length})`, content: pendingContent },
          { id: 'history', label: `History (${historyItems.length})`, content: historyContent },
        ]}
        activeTab={tab}
        onTabChange={(id: string) => setTab(id === 'history' ? 'history' : 'pending')}
      />
    </Page>
  );
}
