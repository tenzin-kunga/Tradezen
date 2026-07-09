import type {
  SearchProvider,
  SearchResult,
  QuickAction,
  WorkspaceResource,
} from "@/lib/workspace/types";
import { createResource } from "@/lib/workspace/resource";

export function createKnowledgeSearchProvider(): SearchProvider {
  return {
    async search(query: string): Promise<SearchResult[]> {
      if (query.length < 1) return [];

      try {
        const { semanticSearch } = await import("@/lib/api/retrieval");
        const results = await semanticSearch(query, "fast");

        return results.map((r) => ({
          resource: createResource("knowledge_document" as any, r.id, r.title, {
            score: r.score,
            evidence: r.evidence,
          }),
          score: r.score,
          highlights: r.evidence.flatMap((e) => e.highlights),
          actions: [],
        }));
      } catch {
        return [];
      }
    },

    async recent(): Promise<SearchResult[]> {
      try {
        const { getKnowledgeDocuments } = await import("@/lib/api/knowledge");
        const docs = await getKnowledgeDocuments();

        return docs.slice(0, 5).map((d) => ({
          resource: createResource("knowledge_document" as any, d.id, d.title, {
            content: d.content,
            docType: d.docType,
          }),
          score: 0.4,
          highlights: [d.docType],
          actions: [],
        }));
      } catch {
        return [];
      }
    },

    async favorites(): Promise<SearchResult[]> {
      return [];
    },

    async related(_resource: WorkspaceResource): Promise<SearchResult[]> {
      return [];
    },

    quickActions(): QuickAction[] {
      return [
        {
          id: "knowledge-new",
          label: "New Document",
          action: () => {},
        },
      ];
    },
  };
}
