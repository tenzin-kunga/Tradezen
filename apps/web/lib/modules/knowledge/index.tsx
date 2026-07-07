"use client";

import { BookOpen } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import { InspectorCapability as InspectorCap } from "@/lib/workspace/types";
import { SearchCapability as SearchCap } from "@/lib/workspace/types";
import KnowledgeWorkspace from "@/components/modules/knowledge/KnowledgeWorkspace";
import { KnowledgeContextContributor } from "@/components/modules/knowledge/KnowledgeContext";
import { createKnowledgeSearchProvider } from "./search-provider";

export const KnowledgeModule: WorkspaceModule = {
  metadata: {
    id: "knowledge",
    name: "Knowledge",
    icon: <BookOpen size={18} />,
    description: "Research documents, playbooks, and analysis",
    navGroup: "primary",
    navOrder: 4,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/knowledge",
        component: KnowledgeWorkspace,
        title: "Knowledge",
      },
    ]),
    new ContextCap(KnowledgeContextContributor),
    new CommandCap([
      {
        namespace: "module",
        command: "knowledge",
        label: "Open Knowledge",
        description: "Open the knowledge workspace",
        handler: () => {},
      },
      {
        namespace: "module",
        command: "new-doc",
        label: "New Document",
        description: "Create a new knowledge document",
        handler: () => {},
      },
    ]),
    new InspectorCap([
      {
        id: "knowledge-sources",
        title: "Sources",
        component: () => null,
        priority: 10,
      },
      {
        id: "knowledge-trades",
        title: "Related Trades",
        component: () => null,
        priority: 20,
      },
      {
        id: "knowledge-insights",
        title: "AI Insights",
        component: () => null,
        priority: 30,
      },
    ]),
    new SearchCap(createKnowledgeSearchProvider()),
  ],
};
