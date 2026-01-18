/**
 * Workflow-core pack contributions (schema-declared action handlers).
 */

'use client';

export type PackActionHandlerContext = {
  entityKey: string;
  record: any;
  uiSpec?: any;
  navigate?: (path: string) => void;
};

export type PackContrib = {
  actionHandlers?: Record<string, (ctx: PackActionHandlerContext) => void | Promise<void>>;
};

function getStoredToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookieToken = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('hit_token='));
  if (cookieToken) return decodeURIComponent(cookieToken.split('=').slice(1).join('='));
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('hit_token');
  }
  return null;
}

async function postTaskAction(runId: string, taskId: string, action: 'approve' | 'deny') {
  const token = getStoredToken();
  const res = await fetch(`/api/workflows/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = json?.error || json?.detail || json?.message || 'Action failed';
    throw new Error(String(msg));
  }
}

export const contrib: PackContrib = {
  actionHandlers: {
    'workflow-core.approvals.approve': async ({ record }) => {
      const runId = String(record?.runId || '').trim();
      const taskId = String(record?.id || '').trim();
      if (!runId || !taskId) throw new Error('Missing workflow task identifiers.');
      await postTaskAction(runId, taskId, 'approve');
    },
    'workflow-core.approvals.deny': async ({ record }) => {
      const runId = String(record?.runId || '').trim();
      const taskId = String(record?.id || '').trim();
      if (!runId || !taskId) throw new Error('Missing workflow task identifiers.');
      await postTaskAction(runId, taskId, 'deny');
    },
  },
};

export default contrib;
