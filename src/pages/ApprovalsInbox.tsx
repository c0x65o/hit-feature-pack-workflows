'use client';

import React, { useState } from 'react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import {
  RefreshCw,
  Inbox,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { useMyWorkflowTasks, type WorkflowTask } from '../hooks/useWorkflowRuns';

interface ApprovalsInboxProps {
  onNavigate?: (path: string) => void;
}

function TaskRow({
  task,
  onApprove,
  onDeny,
  onNavigateToRun,
  isActioning,
}: {
  task: WorkflowTask;
  onApprove: () => void;
  onDeny: () => void;
  onNavigateToRun: () => void;
  isActioning: boolean;
}) {
  const { Badge, Button } = useUi();
  const isPending = task.status === 'open';
  const decidedAtIso = typeof task.decidedAt === 'string' ? task.decidedAt : null;
  const decidedBy = typeof task.decidedByUserId === 'string' ? task.decidedByUserId : null;

  return (
    <div className="flex items-start gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      {/* Icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isPending
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            : task.status === 'approved'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
            : task.status === 'denied'
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}
      >
        {isPending ? (
          <Clock size={20} />
        ) : task.status === 'approved' ? (
          <CheckCircle2 size={20} />
        ) : task.status === 'denied' ? (
          <XCircle size={20} />
        ) : (
          <User size={20} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {task.type === 'approval'
              ? 'Approval Request'
              : task.type === 'input'
                ? 'Human Input Required'
                : 'Review Required'}
          </span>
          <Badge
            variant={
              task.status === 'open'
                ? 'warning'
                : task.status === 'approved'
                ? 'success'
                : task.status === 'denied'
                ? 'error'
                : 'default'
            }
          >
            {task.status}
          </Badge>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Node:</span>
            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
              {task.nodeId}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={12} />
            <span>{formatRelativeTime(task.createdAt)}</span>
            <span className="text-gray-400">•</span>
            <span>{formatDateTime(task.createdAt)}</span>
          </div>
          {!isPending && decidedAtIso && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {decidedBy ? String(decidedBy) : 'Someone'}
              </span>{' '}
              {task.status} this {formatRelativeTime(decidedAtIso)} ({formatDateTime(decidedAtIso)})
            </div>
          )}
        </div>

        {/* Metadata preview */}
        {task.prompt && Object.keys(task.prompt).length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Show details
            </summary>
            <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-auto max-h-32">
              {JSON.stringify(task.prompt, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onNavigateToRun}
          title="View workflow run"
        >
          <ExternalLink size={14} />
        </Button>
        {isPending && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={onApprove}
              disabled={isActioning}
            >
              <ThumbsUp size={14} className="mr-1" />
              Approve
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onDeny}
              disabled={isActioning}
            >
              <ThumbsDown size={14} className="mr-1" />
              Deny
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function ApprovalsInbox({ onNavigate }: ApprovalsInboxProps) {
  const { Page, Card, Button, Alert, Badge } = useUi();
  const [includeResolved, setIncludeResolved] = useState(false);
  const { tasks, loading, error, refresh } = useMyWorkflowTasks({ includeResolved });
  const [actioningTaskId, setActioningTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const handleApprove = async (task: WorkflowTask) => {
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve task');
    } finally {
      setActioningTaskId(null);
    }
  };

  const handleDeny = async (task: WorkflowTask) => {
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
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to deny task');
    } finally {
      setActioningTaskId(null);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === 'open').length;

  return (
    <Page
      title="My Approvals"
      description="Tasks assigned to you that require action"
      actions={
        <div className="flex gap-2 items-center">
          <Button
            variant={includeResolved ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIncludeResolved(!includeResolved)}
          >
            <Filter size={14} className="mr-1" />
            {includeResolved ? 'Showing All' : 'Pending Only'}
          </Button>
          <Button variant="primary" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="error" title="Error loading tasks">
          {error.message}
        </Alert>
      )}

      {actionError && (
        <div className="mb-4">
          <Alert variant="error" title="Action failed">
            {actionError}
          </Alert>
        </div>
      )}

      {/* Summary */}
      {!loading && tasks.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <Badge variant={pendingCount > 0 ? 'warning' : 'success'}>
            {pendingCount} pending
          </Badge>
          {includeResolved && (
            <Badge variant="default">{tasks.length - pendingCount} resolved</Badge>
          )}
        </div>
      )}

      {loading ? (
        <Card>
          <div className="text-center py-12 text-gray-500">Loading tasks...</div>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Inbox size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {includeResolved ? 'No tasks found' : 'All caught up!'}
            </h3>
            <p className="text-gray-500">
              {includeResolved
                ? 'No workflow tasks have been assigned to you yet.'
                : 'You have no pending approvals. Check back later or toggle to see resolved tasks.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onApprove={() => handleApprove(task)}
              onDeny={() => handleDeny(task)}
              onNavigateToRun={() => navigate(`/workflows/runs/${task.runId}`)}
              isActioning={actioningTaskId === task.id}
            />
          ))}
        </div>
      )}
    </Page>
  );
}

export default ApprovalsInbox;
