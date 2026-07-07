"use client";

import { FolderOpen } from "lucide-react";
import type { WorkspaceModule } from "@/lib/workspace/types";
import { RouteCapability as RouteCap } from "@/lib/workspace/types";
import FilesPlaceholder from "@/components/modules/files/FilesPlaceholder";

export const FilesModule: WorkspaceModule = {
  metadata: {
    id: "files",
    name: "Files",
    icon: <FolderOpen size={18} />,
    description: "File management and documents",
    navGroup: "tools",
    navOrder: 6,
  },
  capabilities: [
    new RouteCap([
      {
        path: "/files",
        component: FilesPlaceholder,
        title: "Files",
      },
    ]),
  ],
};
