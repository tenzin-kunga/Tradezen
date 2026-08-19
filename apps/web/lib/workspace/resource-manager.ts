import type { WorkspaceResource, ResourceManager, Tab } from "./types";
import { eventBus } from "./event-bus";
import {
  loadTabs,
  saveTabs,
  loadActiveTabId,
  saveActiveTabId,
} from "./persistence";

class ResourceManagerImpl implements ResourceManager {
  private tabs: Tab[] = [];
  private activeId: string | null = null;
  private listeners = new Set<() => void>();
  private initialized = false;

  // Resource history (back/forward navigation)
  private history: string[] = [];
  private historyIndex = -1;
  private navigating = false;

  constructor() {
    this.restore();
  }

  private restore(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.tabs = loadTabs();
    this.activeId = loadActiveTabId();
  }

  open(resource: WorkspaceResource): void {
    // If already open, activate it
    const existing = this.tabs.find((t) => t.resource.id === resource.id);
    if (existing) {
      if (this.activeId !== existing.id) {
        this.activeId = existing.id;
        if (!this.navigating) {
          this.pushHistory(existing.id);
        }
        this.persist();
        this.notify();
      }
      return;
    }

    // Create new tab
    const tab: Tab = {
      id: resource.id,
      resource,
      pinned: false,
      closable: true,
    };
    this.tabs.push(tab);
    this.activeId = tab.id;
    if (!this.navigating) {
      this.pushHistory(tab.id);
    }
    this.persist();
    this.notify();

    eventBus.publish({
      type: "workspace.tabOpened",
      resource,
      timestamp: Date.now(),
    });
  }

  close(id: string): void {
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const [removed] = this.tabs.splice(idx, 1);

    // If closing active tab, activate the nearest tab
    if (this.activeId === id) {
      const nextIdx = Math.min(idx, this.tabs.length - 1);
      this.activeId = this.tabs[nextIdx]?.id ?? null;
    }

    // Remove from history
    this.history = this.history.filter((h) => h !== id);
    this.historyIndex = Math.min(this.historyIndex, this.history.length - 1);

    this.persist();
    this.notify();

    eventBus.publish({
      type: "workspace.tabClosed",
      resource: removed.resource,
      timestamp: Date.now(),
    });
  }

  back(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.navigating = true;
    this.setActive(this.history[this.historyIndex]);
    this.navigating = false;
  }

  forward(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.navigating = true;
    this.setActive(this.history[this.historyIndex]);
    this.navigating = false;
  }

  canGoBack(): boolean {
    return this.historyIndex > 0;
  }

  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  private pushHistory(id: string): void {
    // Truncate forward history when navigating to new resource
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(id);
    this.historyIndex = this.history.length - 1;
  }

  getActive(): WorkspaceResource | null {
    if (!this.activeId) return null;
    return this.tabs.find((t) => t.id === this.activeId)?.resource ?? null;
  }

  getAll(): WorkspaceResource[] {
    return this.tabs.map((t) => t.resource);
  }

  getTabs(): Tab[] {
    return [...this.tabs];
  }

  getActiveId(): string | null {
    return this.activeId;
  }

  setActive(id: string): void {
    if (this.activeId !== id) {
      this.activeId = id;
      this.persist();
      this.notify();
    }
  }

  togglePin(id: string): void {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      tab.pinned = !tab.pinned;
      this.persist();
      this.notify();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private persist(): void {
    saveTabs(this.tabs);
    saveActiveTabId(this.activeId);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

let instance: ResourceManager | null = null;

export function getResourceManager(): ResourceManager {
  if (!instance) {
    instance = new ResourceManagerImpl();
  }
  return instance;
}
