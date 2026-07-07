import type {
  WorkspaceEvent,
  WorkspaceEventType,
  EventHandler,
} from "./types";

class WorkspaceEventBus {
  private listeners = new Map<WorkspaceEventType, Set<EventHandler>>();

  publish(event: WorkspaceEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (e) {
          console.error(`[EventBus] Error in handler for ${event.type}:`, e);
        }
      }
    }
  }

  subscribe(type: WorkspaceEventType, handler: EventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  unsubscribe(type: WorkspaceEventType, handler: EventHandler): void {
    this.listeners.get(type)?.delete(handler);
  }
}

export const eventBus = new WorkspaceEventBus();
