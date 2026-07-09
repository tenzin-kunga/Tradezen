"use client";

import { Briefcase } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import { ContextCapability as ContextCap } from "@/lib/workspace/types";
import { CommandCapability as CommandCap } from "@/lib/workspace/types";
import { ToolCapability as ToolCap } from "@/lib/workspace/types";
import type { ToolDefinition } from "@/lib/workspace/types";
import PortfolioWorkspace from "@/components/modules/portfolio/PortfolioWorkspace";
import { PortfolioContextContributor } from "./PortfolioContext";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { createPortfolioResource } from "@/lib/workspace/resource";

const PORTFOLIO_TOOLS: ToolDefinition[] = [
  {
    name: "open_portfolio",
    description: "Open the portfolio view",
    parameters: {},
    async execute() {
      getResourceManager().open(createPortfolioResource());
      return { content: "Opened portfolio" };
    },
  },
];

export const PortfolioModule: WorkspaceModule = {
  metadata: {
    id: "portfolio",
    name: "Portfolio",
    icon: <Briefcase size={18} />,
    description: "Computed performance over your trades",
    navGroup: "primary",
    navOrder: 4,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/portfolio",
        component: PortfolioWorkspace,
        title: "Portfolio",
      },
    ]),
    new ContextCap(PortfolioContextContributor),
    new CommandCap([
      {
        namespace: "module",
        command: "portfolio",
        label: "Open Portfolio",
        description: "Open the portfolio view",
        handler: () => {},
      },
    ]),
    new ToolCap(PORTFOLIO_TOOLS),
  ],
};
