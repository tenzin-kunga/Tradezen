"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ResourceManager,
  SelectionManager,
  WorkspaceResource,
} from "./types";
import { eventBus } from "./event-bus";
import { getResourceManager } from "./resource-manager";
import { createSelectionManager } from "./selection-manager";

interface WorkspaceContextValue {
  resourceManager: ResourceManager;
  selection: SelectionManager;
  activeResource: WorkspaceResource | null;
  selectedResource: WorkspaceResource | null;
  open: (resource: WorkspaceResource) => void;
  back: () => void;
  forward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
}: {
  children: import("react").ReactNode;
}) {
  const [resourceManager] = useState(() => getResourceManager());
  const [selectionManager] = useState(() => createSelectionManager());

  // Force re-render when resource manager changes
  const [, setTick] = useState(0);
  useEffect(() => {
    return resourceManager.subscribe(() => setTick((t) => t + 1));
  }, [resourceManager]);

  // Track selection changes
  const [selectedResource, setSelectedResource] =
    useState<WorkspaceResource | null>(null);
  useEffect(() => {
    return selectionManager.subscribe(() => {
      const selected = selectionManager.getSelected();
      setSelectedResource(selected);
      if (selected) {
        eventBus.publish({
          type: "context.changed",
          resource: selected,
          timestamp: Date.now(),
        });
      }
    });
  }, [selectionManager]);

  const activeResource = resourceManager.getActive();

  const open = useCallback(
    (resource: WorkspaceResource) => {
      resourceManager.open(resource);
      selectionManager.select(resource);
    },
    [resourceManager, selectionManager],
  );

  const back = useCallback(() => {
    resourceManager.back();
    const active = resourceManager.getActive();
    if (active) selectionManager.select(active);
  }, [resourceManager, selectionManager]);

  const forward = useCallback(() => {
    resourceManager.forward();
    const active = resourceManager.getActive();
    if (active) selectionManager.select(active);
  }, [resourceManager, selectionManager]);

  const canGoBack = resourceManager.canGoBack?.() ?? false;
  const canGoForward = resourceManager.canGoForward?.() ?? false;

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      resourceManager,
      selection: selectionManager,
      activeResource,
      selectedResource,
      open,
      back,
      forward,
      canGoBack,
      canGoForward,
    }),
    [
      resourceManager,
      selectionManager,
      activeResource,
      selectedResource,
      open,
      back,
      forward,
      canGoBack,
      canGoForward,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

export function useResourceManager(): ResourceManager {
  return useWorkspace().resourceManager;
}

export function useSelection(): SelectionManager {
  return useWorkspace().selection;
}

export function useActiveResource(): WorkspaceResource | null {
  return useWorkspace().activeResource;
}

export function useSelectedResource(): WorkspaceResource | null {
  return useWorkspace().selectedResource;
}
