/**
 * Event publishing utility for workflows feature pack
 *
 * Publishes workflow task events to the HIT Events Module for real-time WebSocket delivery.
 */
export declare function publishWorkflowEvent(eventType: string, payload: Record<string, unknown>): Promise<{
    success: boolean;
    subscribers?: number;
    error?: string;
}>;
//# sourceMappingURL=publish-event.d.ts.map