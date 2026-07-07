import type { WorkspaceResource, SelectionManager } from "./types";

class SelectionManagerImpl implements SelectionManager {
  private selected: WorkspaceResource | null = null;
  private listeners = new Set<() => void>();

  getSelected(): WorkspaceResource | null {
    return this.selected;
  }

  select(resource: WorkspaceResource): void {
    this.selected = resource;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createSelectionManager(): SelectionManager {
  return new SelectionManagerImpl();
}
