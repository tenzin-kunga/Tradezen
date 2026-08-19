"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { resolveModuleComponent } from "@/lib/workspace/helpers";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { createResource } from "@/lib/workspace/resource";
import type { ResourceType, WorkspaceResource } from "@/lib/workspace/types";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";

export default function ModulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] =
    useState<ReturnType<typeof resolveModuleComponent>>(null);
  const [resource, setResource] = useState<WorkspaceResource | null>(null);

  useEffect(() => {
    const moduleId = params.module as string;
    if (!moduleId) return;

    const result = resolveModuleComponent(moduleId);
    if (!result) {
      setError(`Module "${moduleId}" not found`);
      return;
    }

    setResolved(result);

    const metadata: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      metadata[key] = value;
    });

    const res = createResource(
      moduleId as ResourceType,
      moduleId,
      result.module.metadata.name,
      metadata,
    );
    setResource(res);
    getResourceManager().open(res);
  }, [params, searchParams]);

  const moduleId = params.module as string;
  const isAssistant = moduleId === "assistant";

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

  if (!resolved || !resource) {
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

  const Component = resolved.component;

  // Assistant has its own full-page layout — skip WorkspaceShell
  if (isAssistant) {
    return <Component resource={resource} />;
  }

  return (
    <WorkspaceShell>
      <Component resource={resource} />
    </WorkspaceShell>
  );
}
