"use client";

import { List } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import { InspectorCapability as InspectorCap } from "@/lib/workspace/types";
import WatchlistWorkspace from "@/components/modules/watchlist/WatchlistWorkspace";

export const WatchlistModule: WorkspaceModule = {
  metadata: {
    id: "watchlist",
    name: "Watchlist",
    icon: <List size={18} />,
    description: "Track and monitor symbols",
    navGroup: "primary",
    navOrder: 3,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/watchlist",
        component: WatchlistWorkspace,
        title: "Watchlist",
      },
    ]),
    new ContextCap({
      priority: 8,
      budget: 300,
      estimateTokens(_resource) {
        return 80;
      },
      async getContext(resource) {
        return {
          source: "watchlist",
          data: {
            activeList: resource.metadata?.listId || "default",
            symbolCount: resource.metadata?.symbolCount || 0,
          },
          tokens: 40,
        };
      },
    }),
    new CommandCap([
      {
        namespace: "module",
        command: "watchlist",
        label: "Open Watchlist",
        description: "Open your watchlist",
        handler: () => {},
      },
      {
        namespace: "module",
        command: "add-symbol",
        label: "Add Symbol",
        description: "Add a symbol to your watchlist",
        handler: () => {},
      },
    ]),
    new InspectorCap([
      {
        id: "watchlist-news",
        title: "News",
        component: () => null, // Will be implemented in Day 15
        priority: 10,
      },
      {
        id: "watchlist-notes",
        title: "Notes",
        component: () => null,
        priority: 20,
      },
      {
        id: "watchlist-alerts",
        title: "Alerts",
        component: () => null,
        priority: 30,
      },
    ]),
  ],
};
