'use client';

import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useUi } from '@hit/ui-kit';
import { useAllWorkflowRuns, type WorkflowRunSummary } from '../hooks/useWorkflowRuns';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusVariant(status?: string | null): 'success' | 'warning' | 'error' | 'info' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'waiting') return 'warning';
  if (status === 'running') return 'info';
  return 'default';
}

export default function WorkflowRunsPage() {
  const { Page, Card, Button, Badge, Alert, DataTable } = useUi();
  const { runs, loading, error, refresh } = useAllWorkflowRuns({ limit: 200 });

  const rows = useMemo(() => {
    return (runs || []).map((run: WorkflowRunSummary) => ({
      id: run.id,
      workflowName: run.workflowName || run.workflowId,
      status: run.status,
      triggerType: run.triggerType || '—',
      triggerRef: run.triggerRef || '—',
      startedAt: run.startedAt,
      completedAt: run.completedAt || null,
    }));
  }, [runs]);

  return (
    <Page
      title="Workflow Runs"
      description="Recent workflow executions across the system."
      actions={
        <Button variant="secondary" size="sm" onClick={() => refresh()} disabled={loading}>
          <RefreshCw size={14} className="mr-2" />
          Refresh
        </Button>
      }
    >
      {error ? <Alert variant="error">{error.message}</Alert> : null}

      <Card>
        <DataTable
          columns={[
            {
              key: 'workflowName',
              label: 'Workflow',
              render: (value: unknown) => <span className="font-medium">{String(value || '—')}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              render: (value: unknown) => (
                <Badge variant={statusVariant(String(value || ''))}>{String(value || '—')}</Badge>
              ),
            },
            { key: 'triggerType', label: 'Trigger' },
            { key: 'triggerRef', label: 'Ref' },
            {
              key: 'startedAt',
              label: 'Started',
              render: (value: unknown) => formatDateTime(String(value || '')),
            },
            {
              key: 'completedAt',
              label: 'Completed',
              render: (value: unknown) => formatDateTime(value ? String(value) : null),
            },
          ]}
          data={rows}
          loading={loading}
          emptyMessage="No workflow runs yet."
          onRefresh={refresh}
        />
      </Card>
    </Page>
  );
}
