'use client';

import React from 'react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import { Activity, RefreshCw, Play, Clock, CheckCircle2, XCircle, Pause } from 'lucide-react';
import { useAllWorkflowRuns, type WorkflowRunStatus } from '../hooks/useWorkflowRuns';

interface WorkflowRunsListProps {
  onNavigate?: (path: string) => void;
}

function getStatusIcon(status: WorkflowRunStatus) {
  switch (status) {
    case 'running':
      return <Play size={14} className="text-blue-500" />;
    case 'waiting':
      return <Pause size={14} className="text-amber-500" />;
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'failed':
      return <XCircle size={14} className="text-red-500" />;
    case 'cancelled':
      return <XCircle size={14} className="text-gray-500" />;
    default:
      return <Clock size={14} className="text-gray-400" />;
  }
}

function getStatusVariant(status: WorkflowRunStatus): 'success' | 'warning' | 'error' | 'info' | 'default' {
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

export function WorkflowRunsList({ onNavigate }: WorkflowRunsListProps) {
  const { Page, Card, Button, DataTable, Alert, Badge } = useUi();
  const { runs, loading, error, refresh } = useAllWorkflowRuns({ limit: 100 });

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  return (
    <Page
      title="Workflow Runs"
      description="View execution history and timeline for all workflows"
      actions={
        <div className="flex gap-2 items-center">
          <Button variant="primary" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="error" title="Error loading workflow runs">
          {error.message}
        </Alert>
      )}

      <Card>
        <DataTable
          loading={loading}
          data={runs}
          emptyMessage="No workflow runs yet. Workflow runs will appear here as they are executed."
          columns={[
            {
              key: 'startedAt',
              label: 'Started',
              sortable: true,
              render: (value: unknown) => {
                const iso = typeof value === 'string' ? value : null;
                if (!iso) return <span className="text-gray-500">—</span>;
                return (
                  <div className="flex flex-col">
                    <span className="font-medium">{formatRelativeTime(iso)}</span>
                    <span className="text-xs text-gray-500">{formatDateTime(iso)}</span>
                  </div>
                );
              },
            },
            {
              key: 'id',
              label: 'Run ID',
              render: (value: unknown, row?: Record<string, unknown>) => (
                <span
                  role="button"
                  tabIndex={0}
                  className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  onClick={() => navigate(`/workflows/runs/${encodeURIComponent(String(value))}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      navigate(`/workflows/runs/${encodeURIComponent(String(value))}`);
                    }
                  }}
                >
                  {String(value).slice(0, 8)}...
                </span>
              ),
            },
            {
              key: 'workflowName',
              label: 'Workflow',
              render: (value: unknown, row?: Record<string, unknown>) => {
                const name = value || (row as any)?.workflow?.name;
                return name ? (
                  <span className="font-medium">{String(name)}</span>
                ) : (
                  <span className="text-gray-500 font-mono text-xs">
                    {String((row as any)?.workflowId || '').slice(0, 8)}
                  </span>
                );
              },
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              render: (value: unknown) => {
                const status = value as WorkflowRunStatus;
                return (
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status)}
                    <Badge variant={getStatusVariant(status) as any}>
                      {status}
                    </Badge>
                  </div>
                );
              },
            },
            {
              key: 'triggerType',
              label: 'Trigger',
              render: (value: unknown) =>
                value ? (
                  <Badge variant="default">{String(value)}</Badge>
                ) : (
                  <span className="text-gray-500">—</span>
                ),
            },
            {
              key: 'completedAt',
              label: 'Duration',
              render: (value: unknown, row?: Record<string, unknown>) => {
                const startedAt = (row as any)?.startedAt;
                const completedAt = value as string | null;
                if (!startedAt) return <span className="text-gray-500">—</span>;

                const start = new Date(startedAt).getTime();
                const end = completedAt ? new Date(completedAt).getTime() : Date.now();
                const durationMs = end - start;

                if (durationMs < 1000) {
                  return <span className="text-gray-600">{durationMs}ms</span>;
                }
                if (durationMs < 60000) {
                  return <span className="text-gray-600">{(durationMs / 1000).toFixed(1)}s</span>;
                }
                const mins = Math.floor(durationMs / 60000);
                const secs = Math.round((durationMs % 60000) / 1000);
                return (
                  <span className="text-gray-600">
                    {mins}m {secs}s
                  </span>
                );
              },
            },
          ]}
        />
      </Card>
    </Page>
  );
}

export default WorkflowRunsList;
