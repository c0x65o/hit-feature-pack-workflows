'use client';

import React from 'react';
import { useUi } from '@hit/ui-kit';
import {
  Activity,
  Inbox,
  Plus,
  Workflow,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useAllWorkflowRuns } from '../hooks/useWorkflowRuns';

interface DashboardProps {
  onNavigate?: (path: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { Page, Card, Button, Badge } = useUi();
  const { runs, loading } = useAllWorkflowRuns({ limit: 5 });

  const navigate = (path: string) => {
    if (onNavigate) onNavigate(path);
    else if (typeof window !== 'undefined') window.location.href = path;
  };

  // Compute stats
  const recentRuns = runs.slice(0, 5);
  const runningCount = runs.filter((r) => r.status === 'running').length;
  const waitingCount = runs.filter((r) => r.status === 'waiting').length;
  const failedCount = runs.filter((r) => r.status === 'failed').length;

  return (
    <Page
      title="Workflows"
      description="Orchestrate business processes with approval gates and human-in-the-loop steps"
      actions={
        <Button variant="primary" onClick={() => navigate('/workflows/runs')}>
          <Activity size={16} className="mr-2" />
          View All Runs
        </Button>
      }
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Activity size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{loading ? '—' : runningCount}</div>
              <div className="text-sm text-gray-500">Running</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{loading ? '—' : waitingCount}</div>
              <div className="text-sm text-gray-500">Awaiting Approval</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-2xl font-bold">{loading ? '—' : failedCount}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Inbox size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <button
                onClick={() => navigate('/workflows/approvals')}
                className="text-2xl font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                My Approvals →
              </button>
              <div className="text-sm text-gray-500">Action Required</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-500" />
            Recent Runs
          </h3>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recentRuns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Workflow size={32} className="mx-auto mb-2 opacity-50" />
              <p>No workflow runs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <button
                  key={run.id}
                  onClick={() => navigate(`/workflows/runs/${run.id}`)}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {run.status === 'running' && <Activity size={16} className="text-blue-500" />}
                    {run.status === 'waiting' && <Clock size={16} className="text-amber-500" />}
                    {run.status === 'completed' && <CheckCircle2 size={16} className="text-emerald-500" />}
                    {run.status === 'failed' && <AlertTriangle size={16} className="text-red-500" />}
                    <div>
                      <div className="font-medium text-sm">
                        {run.workflowName || run.id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(run.startedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      run.status === 'completed'
                        ? 'success'
                        : run.status === 'failed'
                        ? 'error'
                        : run.status === 'waiting'
                        ? 'warning'
                        : 'info'
                    }
                  >
                    {run.status}
                  </Badge>
                </button>
              ))}
              <button
                onClick={() => navigate('/workflows/runs')}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline py-2"
              >
                View all runs <ArrowRight size={14} className="inline ml-1" />
              </button>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Workflow size={20} className="text-purple-500" />
            Getting Started
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <h4 className="font-medium mb-2">What are Workflows?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Workflows let you automate multi-step business processes with built-in approval
                gates, human-in-the-loop steps, and audit trails.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Trigger workflows from events or manually</li>
                <li>• Pause for approvals (HR, manager, etc.)</li>
                <li>• Track every step with a visual timeline</li>
                <li>• ACL-driven permissions per workflow</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/workflows/runs')}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Activity size={18} className="text-blue-500" />
                <span className="font-medium text-sm">View Runs</span>
              </button>
              <button
                onClick={() => navigate('/workflows/approvals')}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Inbox size={18} className="text-purple-500" />
                <span className="font-medium text-sm">My Approvals</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}

export default Dashboard;
