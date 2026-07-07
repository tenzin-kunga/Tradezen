"use client";

import { Search } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import ResearchPlaceholder from "@/components/modules/research/ResearchPlaceholder";

export const ResearchModule: WorkspaceModule = {
  metadata: {
    id: "research",
    name: "Research",
    icon: <Search size={18} />,
    description: "Research documents and analysis",
    navGroup: "primary",
    navOrder: 3,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/research",
        component: ResearchPlaceholder,
        title: "Research",
      },
    ]),
  ],
};
