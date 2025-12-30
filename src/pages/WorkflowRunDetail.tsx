'use client';

import React, { useState, useMemo } from 'react';
import { useUi } from '@hit/ui-kit';
import { formatDateTime, formatRelativeTime } from '@hit/sdk';
import {
  ArrowLeft,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Zap,
  AlertTriangle,
  FileText,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import {
  useWorkflowRun,
  useWorkflowRunEvents,
  useWorkflowRunTasks,
  type WorkflowRunEvent,
  type WorkflowRunStatus,
  type WorkflowTask,
} from '../hooks/useWorkflowRuns';

interface WorkflowRunDetailProps {
  runId: string;
  onNavigate?: (path: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function JsonBlock({ value }: { value: unknown }) {
  const s = JSON.stringify(value, null, 2);
  return (
    <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-3 overflow-auto max-h-[40vh]">
      {s}
    </pre>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function getStatusIcon(status: WorkflowRunStatus) {
  switch (status) {
    case 'running':
      return <Play size={16} className="text-blue-500" />;
    case 'waiting':
      return <Pause size={16} className="text-amber-500" />;
    case 'completed':
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    case 'failed':
      return <XCircle size={16} className="text-red-500" />;
    case 'cancelled':
      return <XCircle size={16} className="text-gray-500" />;
    default:
      return <Clock size={16} className="text-gray-400" />;
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

function getEventIcon(eventType: string) {
  if (eventType.includes('start')) return <Play size={16} />;
  if (eventType.includes('complete') || eventType.includes('success')) return <CheckCircle2 size={16} />;
  if (eventType.includes('fail') || eventType.includes('error')) return <XCircle size={16} />;
  if (eventType.includes('wait') || eventType.includes('pause')) return <Pause size={16} />;
  if (eventType.includes('task') || eventType.includes('approval')) return <User size={16} />;
  if (eventType.includes('trigger')) return <Zap size={16} />;
  return <FileText size={16} />;
}

function getEventColor(eventType: string): string {
  if (eventType.includes('start')) return 'text-blue-600 dark:text-blue-400';
  if (eventType.includes('complete') || eventType.includes('success'))
    return 'text-emerald-600 dark:text-emerald-400';
  if (eventType.includes('fail') || eventType.includes('error')) return 'text-red-600 dark:text-red-400';
  if (eventType.includes('wait') || eventType.includes('pause')) return 'text-amber-600 dark:text-amber-400';
  if (eventType.includes('task') || eventType.includes('approval')) return 'text-purple-600 dark:text-purple-400';
  return 'text-gray-600 dark:text-gray-400';
}

function getEventVariant(eventType: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (eventType.includes('fail') || eventType.includes('error')) return 'error';
  if (eventType.includes('complete') || eventType.includes('success')) return 'success';
  if (eventType.includes('wait') || eventType.includes('pause')) return 'warning';
  if (eventType.includes('start') || eventType.includes('trigger')) return 'info';
  return 'default';
}

function formatEventType(eventType: string): string {
  return eventType
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' → ');
}

// ─────────────────────────────────────────────────────────────────────────────
// EventStep component
// ─────────────────────────────────────────────────────────────────────────────

function EventStep({
  event,
  index,
  prevEvent,
  isExpanded,
  onToggle,
}: {
  event: WorkflowRunEvent;
  index: number;
  prevEvent: WorkflowRunEvent | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { Badge } = useUi();
  const duration = prevEvent ? event.tMs - prevEvent.tMs : null;
  const variant = getEventVariant(event.name);
  const color = getEventColor(event.name);

  return (
    <div className="relative">
      {/* Timeline line */}
      {index > 0 && (
        <div className="absolute left-5 top-0 w-0.5 h-6 bg-gray-200 dark:bg-gray-700 -translate-y-full" />
      )}

      <div className="relative flex gap-4 group">
        {/* Icon circle */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
            isExpanded
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
          }`}
        >
          <div className={color}>{getEventIcon(event.name)}</div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-6">
          {/* Header */}
          <button
            onClick={onToggle}
            className="w-full text-left flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={variant as any}>{formatEventType(event.name)}</Badge>
                {duration !== null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    +{formatDuration(duration)}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  #{event.seq}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {formatDateTime(new Date(event.tMs).toISOString())}
              </div>
            </div>
            <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
          </button>

          {/* Expanded content */}
          {isExpanded && event.data && Object.keys(event.data).length > 0 && (
            <div className="mt-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">
                  Event Payload
                </h4>
                <JsonBlock value={event.data} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard component
// ─────────────────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onApprove,
  onDeny,
}: {
  task: WorkflowTask;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const { Card, Button, Badge } = useUi();
  const isPending = task.status === 'open';

  return (
    <Card className="border-l-4 border-l-amber-500">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-amber-500" />
            <span className="font-medium">
              {task.type === 'approval'
                ? 'Approval Required'
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
            <div>
              <span className="text-gray-500">Node:</span>{' '}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{task.nodeId}</code>
            </div>
            {task.assignedTo && Object.keys(task.assignedTo).length > 0 && (
              <div>
                <span className="text-gray-500">Assigned to:</span>{' '}
                <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {JSON.stringify(task.assignedTo)}
                </code>
              </div>
            )}
            {task.prompt && Object.keys(task.prompt).length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                  Show prompt
                </summary>
                <div className="mt-2">
                  <JsonBlock value={task.prompt} />
                </div>
              </details>
            )}
          </div>
        </div>
        {isPending && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={onApprove}>
              <ThumbsUp size={14} className="mr-1" />
              Approve
            </Button>
            <Button variant="secondary" size="sm" onClick={onDeny}>
              <ThumbsDown size={14} className="mr-1" />
              Deny
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function WorkflowRunDetail({ runId, onNavigate }: WorkflowRunDetailProps) {
  const { Page, Card, Button, Alert, Badge } = useUi();
  const { run, loading: runLoading, error: runError, refresh: refreshRun } = useWorkflowRun(runId);
  const { events, loading: eventsLoading, error: eventsError, refresh: refreshEvents } = useWorkflowRunEvents(runId);
  const { tasks, loading: tasksLoading, approveTask, denyTask, refresh: refreshTasks } = useWorkflowRunTasks(runId);

  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set([0]));
  const [actionError, setActionError] = useState<string | null>(null);

  const loading = runLoading || eventsLoading;
  const error = runError || eventsError;

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  const refresh = () => {
    refreshRun();
    refreshEvents();
    refreshTasks();
  };

  const toggleEvent = (index: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
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

  const handleApprove = async (taskId: string) => {
    try {
      setActionError(null);
      await approveTask(taskId);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve task');
    }
  };

  const handleDeny = async (taskId: string) => {
    try {
      setActionError(null);
      await denyTask(taskId);
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to deny task');
    }
  };

  const eventStats = useMemo(() => {
    if (!events.length) return null;
    const stats = {
      total: events.length,
      errors: 0,
      waits: 0,
    };
    events.forEach((e) => {
      if (e.name.includes('error') || e.name.includes('fail')) stats.errors++;
      if (e.name.includes('wait') || e.name.includes('pause') || e.name.includes('waiting')) stats.waits++;
    });
    return stats;
  }, [events]);

  const durationMs = useMemo(() => {
    if (!run) return null;
    const start = new Date(run.startedAt).getTime();
    const end = run.completedAt ? new Date(run.completedAt).getTime() : Date.now();
    return end - start;
  }, [run]);

  const pendingTasks = tasks.filter((t) => t.status === 'open');

  return (
    <Page
      title="Workflow Run"
      description={runId}
      actions={
        <div className="flex gap-2 items-center">
          <Button variant="secondary" onClick={() => navigate('/workflows/runs')}>
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <Button variant="primary" onClick={refresh} disabled={loading}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="error" title="Error loading workflow run">
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

      {/* Pending Tasks Alert */}
      {pendingTasks.length > 0 && (
        <div className="mb-4">
          <Alert variant="warning" title="Approval Required">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>
                This workflow run is waiting for {pendingTasks.length} pending{' '}
                {pendingTasks.length === 1 ? 'task' : 'tasks'}.
              </span>
            </div>
          </Alert>
        </div>
      )}

      {/* Summary Card */}
      {run && (
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
              <div className="flex items-center gap-2">
                {getStatusIcon(run.status)}
                <Badge variant={getStatusVariant(run.status) as any}>{run.status}</Badge>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Started</div>
              <div className="font-medium">{formatDateTime(run.startedAt)}</div>
              <div className="text-xs text-gray-500">{formatRelativeTime(run.startedAt)}</div>
            </div>
            {durationMs !== null && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Duration</div>
                <div className="font-medium">{formatDuration(durationMs)}</div>
              </div>
            )}
            {eventStats && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Events</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="info">{eventStats.total} total</Badge>
                  {eventStats.errors > 0 && <Badge variant="error">{eventStats.errors} errors</Badge>}
                  {eventStats.waits > 0 && <Badge variant="warning">{eventStats.waits} waits</Badge>}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Workflow Info Card */}
      {run?.workflow && (
        <Card className="mb-6">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-blue-500" />
            <div>
              <div className="font-medium">{run.workflow.name}</div>
              {run.workflow.slug && (
                <div className="text-xs text-gray-500 font-mono">{run.workflow.slug}</div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Input/Output Cards */}
      {run?.input && Object.keys(run.input).length > 0 && (
        <Card className="mb-6">
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-3">
              <ChevronRight size={16} className="group-open:rotate-90 transition-transform" />
              Run Input
            </summary>
            <JsonBlock value={run.input} />
          </details>
        </Card>
      )}

      {run?.output && Object.keys(run.output).length > 0 && (
        <Card className="mb-6">
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100 mb-3">
              <ChevronRight size={16} className="group-open:rotate-90 transition-transform" />
              Run Output
            </summary>
            <JsonBlock value={run.output} />
          </details>
        </Card>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pending Tasks</h2>
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onApprove={() => handleApprove(task.id)}
                onDeny={() => handleDeny(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Events Timeline */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Event Timeline</h2>
          {events.length > 0 && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="secondary" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading run...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No events found for this run.</div>
        ) : (
          <div className="space-y-0">
            {events.map((event, index) => (
              <EventStep
                key={event.id}
                event={event}
                index={index}
                prevEvent={index > 0 ? events[index - 1] : null}
                isExpanded={expandedEvents.has(index)}
                onToggle={() => toggleEvent(index)}
              />
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}

export default WorkflowRunDetail;
