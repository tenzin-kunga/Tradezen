"use client";

import { BookOpen } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import { SearchCapability as SearchCap } from "@/lib/workspace/types";
import { ToolCapability as ToolCap } from "@/lib/workspace/types";
import type { ToolDefinition } from "@/lib/workspace/types";
import JournalWorkspace from "@/components/modules/journal/JournalWorkspace";
import { JournalContextContributor } from "@/components/modules/journal/JournalContext";
import { createJournalSearchProvider } from "./search-provider";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { createJournalResource } from "@/lib/workspace/resource";

function openJournal(date?: string) {
  const d = date || new Date().toISOString().slice(0, 10);
  getResourceManager().open(createJournalResource(d));
}

const JOURNAL_TOOLS: ToolDefinition[] = [
  {
    name: "open_journal",
    description: "Open a journal entry for a given date (default: today)",
    parameters: {
      date: { type: "string", description: "YYYY-MM-DD", required: false },
    },
    async execute(args) {
      const { date } = (args as { date?: string }) || {};
      openJournal(date);
      const d = date || new Date().toISOString().slice(0, 10);
      return { content: `Opened journal for ${d}` };
    },
  },
  {
    name: "create_journal",
    description: "Create and open a new journal entry for a given date",
    parameters: {
      date: { type: "string", description: "YYYY-MM-DD", required: true },
    },
    async execute(args) {
      const { date } = args as { date: string };
      openJournal(date);
      return { content: `Created journal entry for ${date}` };
    },
  },
];

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
        handler: () => openJournal(),
      },
      {
        namespace: "module",
        command: "journal-today",
        label: "Today's Journal",
        description: "Open today's journal entry",
        handler: () => openJournal(),
      },
      {
        namespace: "module",
        command: "journal-search",
        label: "Search Journal",
        description: "Search journal entries",
        handler: () => {},
      },
    ]),
    new SearchCap(createJournalSearchProvider()),
    new ToolCap(JOURNAL_TOOLS),
  ],
};
