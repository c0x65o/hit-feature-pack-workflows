'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUi } from '@hit/ui-kit';
import { AclPicker, type AclEntry, type AclPickerConfig } from '@hit/ui-kit';
import { Workflow } from 'lucide-react';

type GateConfigResponse = {
  workflowId: string;
  workflowVersionId?: string;
  workflowVersion?: number;
  entries: AclEntry[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...(init || {}) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any)?.error || (json as any)?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export function WorkflowGates() {
  const { Page, Card, Alert, Button } = useUi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GateConfigResponse | null>(null);

  const gateAclConfig: AclPickerConfig = useMemo(
    () => ({
      principals: { users: true, groups: true, roles: true },
      mode: 'granular',
      granularPermissions: [
        {
          key: 'APPROVE',
          label: 'Can Approve',
          description: 'Can approve/deny this gate',
          group: 'Gate',
        },
      ],
      labels: {
        title: 'Gate Keeper (who can approve)',
        addButton: 'Add Approver',
        removeButton: 'Remove',
        emptyMessage: 'No approvers set. Add at least one approver.',
      },
    }),
    []
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson<GateConfigResponse>('/api/workflows/gates/crm-convert-prospect');
      setConfig(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = Array.isArray(config?.entries) ? config!.entries : [];

  const save = async (nextEntries: AclEntry[]) => {
    if (saving) return;
    try {
      setSaving(true);
      setError(null);
      await fetchJson('/api/workflows/gates/crm-convert-prospect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: nextEntries }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (entry: Omit<AclEntry, 'id'>) => {
    const next = [...entries, { ...entry, permissions: ['APPROVE'] }];
    await save(next);
  };

  const handleRemove = async (entry: AclEntry) => {
    const next = entries.filter(
      (e) => !(e.principalType === entry.principalType && e.principalId === entry.principalId)
    );
    await save(next);
  };

  return (
    <Page
      title="Workflow Gates"
      description="Configure lifecycle gatekeepers (approver assignment)"
      actions={
        <div className="flex gap-2 items-center">
          <Button variant="secondary" onClick={load} disabled={loading || saving}>
            Refresh
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Workflow size={18} />
          <div className="font-semibold">CRM: Prospect → Company</div>
          <div className="text-xs text-gray-500 ml-auto">
            gate: <span className="font-mono">crm.company.convertProspect</span>
          </div>
        </div>

        <AclPicker
          config={gateAclConfig}
          entries={entries}
          loading={loading || saving}
          error={null}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      </Card>
    </Page>
  );
}

export default WorkflowGates;

