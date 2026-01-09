'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useUi } from '@hit/ui-kit';
import { AclPicker } from '@hit/ui-kit/components/AclPicker';
import { createFetchPrincipals } from '@hit/feature-pack-auth-core';
import { Workflow } from 'lucide-react';
async function fetchJson(url, init) {
    const res = await fetch(url, { credentials: 'include', ...(init || {}) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = json?.error || json?.message || `Request failed: ${res.status}`;
        throw new Error(msg);
    }
    return json;
}
export function WorkflowGates() {
    const { Page, Card, Alert, Button } = useUi();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [config, setConfig] = useState(null);
    const gateAclConfig = useMemo(() => ({
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
    }), []);
    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchJson('/api/workflows/gates/crm-convert-prospect');
            setConfig(data);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const entries = Array.isArray(config?.entries) ? config.entries : [];
    const save = async (nextEntries) => {
        if (saving)
            return;
        try {
            setSaving(true);
            setError(null);
            await fetchJson('/api/workflows/gates/crm-convert-prospect', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: nextEntries }),
            });
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save');
        }
        finally {
            setSaving(false);
        }
    };
    const handleAdd = async (entry) => {
        const next = [...entries, { ...entry, permissions: ['APPROVE'] }];
        await save(next);
    };
    const handleRemove = async (entry) => {
        const next = entries.filter((e) => !(e.principalType === entry.principalType && e.principalId === entry.principalId));
        await save(next);
    };
    const fetchPrincipals = useMemo(() => createFetchPrincipals({ isAdmin: true }), []);
    return (_jsxs(Page, { title: "Workflow Gates", description: "Configure lifecycle gatekeepers (approver assignment)", actions: _jsx("div", { className: "flex gap-2 items-center", children: _jsx(Button, { variant: "secondary", onClick: load, disabled: loading || saving, children: "Refresh" }) }), children: [error && (_jsx(Alert, { variant: "error", title: "Error", children: error })), _jsxs(Card, { children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Workflow, { size: 18 }), _jsx("div", { className: "font-semibold", children: "CRM: Prospect \u2192 Company" }), _jsxs("div", { className: "text-xs text-gray-500 ml-auto", children: ["gate: ", _jsx("span", { className: "font-mono", children: "crm.company.convertProspect" })] })] }), _jsx(AclPicker, { config: gateAclConfig, entries: entries, loading: loading || saving, error: null, onAdd: handleAdd, onRemove: handleRemove, fetchPrincipals: fetchPrincipals })] })] }));
}
export default WorkflowGates;
