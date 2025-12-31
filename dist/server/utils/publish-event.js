/**
 * Event publishing utility for workflows feature pack
 *
 * Publishes workflow task events to the HIT Events Module for real-time WebSocket delivery.
 */
function safeKey(id) {
    // Event types use dot-separated segments; keep them URL-safe.
    // We cannot include raw emails (contains @) or other punctuation reliably.
    return encodeURIComponent(String(id || '').trim()).replace(/%/g, '_');
}
export async function publishWorkflowEvent(eventType, payload) {
    const eventsUrl = process.env.HIT_EVENTS_URL || process.env.NEXT_PUBLIC_HIT_EVENTS_URL;
    if (!eventsUrl) {
        // Events module not configured; best-effort no-op.
        return { success: false, error: 'Events module not configured' };
    }
    const projectSlug = process.env.HIT_PROJECT_SLUG || process.env.NEXT_PUBLIC_HIT_PROJECT_SLUG || 'hit-dashboard';
    const serviceToken = process.env.HIT_SERVICE_TOKEN;
    try {
        const url = `${eventsUrl.replace(/\/$/, '')}/publish?event_type=${encodeURIComponent(eventType)}`;
        const headers = {
            'Content-Type': 'application/json',
            'X-HIT-Project-Slug': projectSlug,
        };
        if (serviceToken)
            headers['X-HIT-Service-Token'] = serviceToken;
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }
        const result = await response.json().catch(() => ({}));
        return { success: true, subscribers: result?.subscribers };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
/**
 * Publish a workflow notification event to principal-scoped "inbox" channels.
 *
 * This enables true push notifications (no polling) while still using the
 * existing events gateway / Redis pubsub infrastructure.
 *
 * Event types:
 * - workflows.inbox.role.{role}.task.{created|updated}
 * - workflows.inbox.group.{groupId}.task.{created|updated}
 * - workflows.inbox.user.{userIdOrEmail}.task.{created|updated}
 */
export async function publishWorkflowInboxEvent(event, payload, targets) {
    const uniq = new Set();
    for (const t of targets || []) {
        if (!t?.type || !t?.id)
            continue;
        const id = String(t.id || '').trim();
        if (!id)
            continue;
        const key = `${t.type}:${id}`;
        if (uniq.has(key))
            continue;
        uniq.add(key);
        const seg = safeKey(t.type === 'role' ? id.toLowerCase() : id);
        const eventType = `workflows.inbox.${t.type}.${seg}.${event.kind}`;
        publishWorkflowEvent(eventType, payload).catch(() => { });
    }
}
