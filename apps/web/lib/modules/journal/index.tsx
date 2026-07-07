"use client";

import { BookOpen } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import JournalWorkspace from "@/components/modules/journal/JournalWorkspace";
import { JournalContextContributor } from "@/components/modules/journal/JournalContext";

export const JournalModule: WorkspaceModule = {
  metadata: {
    id: "journal",
    name: "Journal",
    icon: <BookOpen size={18} />,
    description: "Daily trading journal",
    navGroup: "primary",
    navOrder: 2,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/journal",
        component: JournalWorkspace,
        title: "Journal",
      },
    ]),
    new ContextCap(JournalContextContributor),
    new CommandCap([
      {
        namespace: "module",
        command: "journal",
        label: "Open Journal",
        description: "Open today's journal entry",
        handler: () => {},
      },
      {
        namespace: "module",
        command: "journal-today",
        label: "Today's Journal",
        description: "Open today's journal entry",
        handler: () => {},
      },
      {
        namespace: "module",
        command: "journal-search",
        label: "Search Journal",
        description: "Search journal entries",
        handler: () => {},
      },
    ]),
  ],
};
