"use client";

import { Brain } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import MemoryPlaceholder from "@/components/modules/memory/MemoryPlaceholder";

export const MemoryModule: WorkspaceModule = {
  metadata: {
    id: "memory",
    name: "Memory",
    icon: <Brain size={18} />,
    description: "AI memory and knowledge base",
    navGroup: "tools",
    navOrder: 5,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/memory",
        component: MemoryPlaceholder,
        title: "Memory",
      },
    ]),
  ],
};
