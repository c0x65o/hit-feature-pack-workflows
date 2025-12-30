/**
 * Event publishing utility for workflows feature pack
 *
 * Publishes workflow task events to the HIT Events Module for real-time WebSocket delivery.
 */
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
