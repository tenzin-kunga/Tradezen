import type { WorkspaceResource, ContextSlice, ContextContributor } from "@/lib/workspace/types";

export const JournalContextContributor: ContextContributor = {
  async getContext(resource: WorkspaceResource): Promise<ContextSlice> {
    const date = (resource.metadata?.date as string) || new Date().toISOString().slice(0, 10);
    return {
      source: "journal",
      data: {
        date,
        type: "daily journal",
        lastUpdated: resource.metadata?.updatedAt || "unknown",
      },
    };
  },
};
