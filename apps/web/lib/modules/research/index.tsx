"use client";

import { Search } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import { SearchCapability as SearchCap } from "@/lib/workspace/types";
import { ToolCapability as ToolCap } from "@/lib/workspace/types";
import type { ToolDefinition } from "@/lib/workspace/types";
import ResearchWorkspace from "@/components/modules/research/ResearchWorkspace";
import { createResearchSearchProvider } from "./search-provider";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { createResearchResource } from "@/lib/workspace/resource";

const RESEARCH_TOOLS: ToolDefinition[] = [
  {
    name: "open_research",
    description: "Open the research workspace",
    parameters: {},
    async execute() {
      getResourceManager().open(createResearchResource("default", "Research"));
      return { content: "Opened research" };
    },
  },
];

export const ResearchModule: WorkspaceModule = {
  metadata: {
    id: "research",
    name: "Research",
    icon: <Search size={18} />,
    description: "Investment theses and analysis",
    navGroup: "primary",
    navOrder: 6,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/research",
        component: ResearchWorkspace,
        title: "Research",
      },
    ]),
    new ContextCap({
      priority: 7,
      budget: 400,
      estimateTokens(_resource) {
        return 120;
      },
      async getContext(resource) {
        return {
          source: "research",
          data: {
            activeProject: resource.metadata?.projectId || null,
            ticker: resource.metadata?.ticker || null,
          },
          tokens: 60,
        };
      },
    }),
    new CommandCap([
      {
        namespace: "module",
        command: "research",
        label: "Open Research",
        description: "Open the research workspace",
        handler: () => {
          getResourceManager().open(
            createResearchResource("default", "Research"),
          );
        },
      },
      {
        namespace: "module",
        command: "new-research",
        label: "New Research Project",
        description: "Create a new research project",
        handler: () => {
          getResourceManager().open(
            createResearchResource("default", "Research"),
          );
        },
      },
    ]),
    new SearchCap(createResearchSearchProvider()),
    new ToolCap(RESEARCH_TOOLS),
  ],
};
