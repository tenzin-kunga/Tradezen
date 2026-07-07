"use client";

import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";

export default function AssistantPage() {
  return (
    <WorkspaceShell>
      <AssistantWorkspace />
    </WorkspaceShell>
  );
}
