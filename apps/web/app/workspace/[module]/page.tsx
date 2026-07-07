"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getModuleRegistry } from "@/lib/workspace/module-registry";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { createResource } from "@/lib/workspace/resource";
import type { ResourceType } from "@/lib/workspace/types";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

export default function ModulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const moduleId = params.module as string;
    if (!moduleId) return;

    const registry = getModuleRegistry();
    const mod = registry.get(moduleId);

    if (!mod) {
      setError(`Module "${moduleId}" not found`);
      return;
    }

    // Build resource from module + URL params
    const metadata: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      metadata[key] = value;
    });

    const resource = createResource(
      moduleId as ResourceType,
      moduleId,
      mod.metadata.name,
      metadata,
    );

    // Open in workspace
    const rm = getResourceManager();
    rm.open(resource);
  }, [params, searchParams]);

  if (error) {
    return (
      <WorkspaceShell>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "var(--accent-loss, #ef4444)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted, #9ca3af)",
          fontSize: 13,
        }}
      >
        Loading module...
      </div>
    </WorkspaceShell>
  );
}
