import type { WorkspaceResource, ContextSlice, ContextContributor } from "@/lib/workspace/types";

export const JournalContextContributor: ContextContributor = {
  priority: 10,
  budget: 500,
  estimateTokens(_resource) {
    return 100; // journal context is lightweight
  },
  async getContext(resource: WorkspaceResource): Promise<ContextSlice> {
    const date = (resource.metadata?.date as string) || new Date().toISOString().slice(0, 10);
    return {
      source: "journal",
      data: {
        date,
        type: "daily journal",
        lastUpdated: resource.metadata?.updatedAt || "unknown",
      },
      tokens: 50,
    };
  },
};
