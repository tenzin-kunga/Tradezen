import type {
  WorkspaceResource,
  ContextSlice,
  ContextContributor,
} from "@/lib/workspace/types";

export const KnowledgeContextContributor: ContextContributor = {
  priority: 7,
  budget: 1000,
  estimateTokens(resource) {
    // Estimate based on content length
    const contentLength = (resource.metadata?.content as string)?.length || 0;
    return Math.min(Math.ceil(contentLength / 4), 800); // ~4 chars per token
  },
  async getContext(resource: WorkspaceResource): Promise<ContextSlice> {
    const content = (resource.metadata?.content as string) || "";
    const title = resource.title;
    const docType = (resource.metadata?.docType as string) || "note";

    // Truncate content if too long
    const maxContentLength = 2000;
    const truncatedContent =
      content.length > maxContentLength
        ? content.slice(0, maxContentLength) + "\n\n[...truncated]"
        : content;

    return {
      source: "knowledge",
      data: {
        documentId: resource.id,
        title,
        docType,
        contentPreview: truncatedContent,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      },
      tokens: Math.min(Math.ceil(content.length / 4), 800),
    };
  },
};
