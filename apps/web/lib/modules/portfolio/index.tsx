"use client";

import { Briefcase } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import PortfolioPlaceholder from "@/components/modules/portfolio/PortfolioPlaceholder";

export const PortfolioModule: WorkspaceModule = {
  metadata: {
    id: "portfolio",
    name: "Portfolio",
    icon: <Briefcase size={18} />,
    description: "Portfolio and position tracking",
    navGroup: "primary",
    navOrder: 4,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/portfolio",
        component: PortfolioPlaceholder,
        title: "Portfolio",
      },
    ]),
  ],
};
