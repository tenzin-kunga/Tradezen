"use client";

import { List } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import { InspectorCapability as InspectorCap } from "@/lib/workspace/types";
import { ToolCapability as ToolCap } from "@/lib/workspace/types";
import type { ToolDefinition } from "@/lib/workspace/types";
import WatchlistWorkspace from "@/components/modules/watchlist/WatchlistWorkspace";
import { WatchlistContextContributor } from "./WatchlistContext";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { createWatchlistResource } from "@/lib/workspace/resource";

const WATCHLIST_TOOLS: ToolDefinition[] = [
  {
    name: "open_watchlist",
    description: "Open the watchlist workspace",
    parameters: {},
    async execute() {
      getResourceManager().open(createWatchlistResource());
      return { content: "Opened watchlist" };
    },
  },
  {
    name: "add_symbol",
    description: "Add a symbol to the watchlist",
    parameters: {
      symbol: { type: "string", description: "Ticker symbol", required: true },
    },
    async execute(args) {
      const { symbol } = args as { symbol: string };
      getResourceManager().open(createWatchlistResource());
      return { content: `Opened watchlist — add ${symbol} from the UI` };
    },
  },
];

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
    new ContextCap(WatchlistContextContributor),
    new CommandCap([
      {
        namespace: "module",
        command: "watchlist",
        label: "Open Watchlist",
        description: "Open your watchlist",
        handler: () => {
          getResourceManager().open(createWatchlistResource());
        },
      },
      {
        namespace: "module",
        command: "add-symbol",
        label: "Add Symbol",
        description: "Add a symbol to your watchlist",
        handler: () => {
          getResourceManager().open(createWatchlistResource());
        },
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
    new ToolCap(WATCHLIST_TOOLS),
  ],
};
