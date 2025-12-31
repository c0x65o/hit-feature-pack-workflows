/**
 * Event publishing utility for workflows feature pack
 *
 * Publishes workflow task events to the HIT Events Module for real-time WebSocket delivery.
 */
type WorkflowRealtimeTarget = {
    type: 'role';
    id: string;
} | {
    type: 'group';
    id: string;
} | {
    type: 'user';
    id: string;
};
export declare function publishWorkflowEvent(eventType: string, payload: Record<string, unknown>): Promise<{
    success: boolean;
    subscribers?: number;
    error?: string;
}>;
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
export declare function publishWorkflowInboxEvent(event: {
    kind: 'task.created' | 'task.updated';
}, payload: Record<string, unknown>, targets: WorkflowRealtimeTarget[]): Promise<void>;
export {};
//# sourceMappingURL=publish-event.d.ts.map