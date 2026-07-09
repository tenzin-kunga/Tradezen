import type {
  SearchProvider,
  SearchResult,
  QuickAction,
  WorkspaceResource,
} from "@/lib/workspace/types";
import { createResource } from "@/lib/workspace/resource";
import { searchResearch, type ResearchProject } from "@/lib/api/research";

export function createResearchSearchProvider(): SearchProvider {
  const toResult = (p: ResearchProject): SearchResult => ({
    resource: createResource("research_project" as any, p.id, p.title, {
      ticker: p.ticker,
      status: p.status,
    }),
    score: 0.6,
    highlights: [p.status, p.conviction, p.ticker ?? ""],
    actions: [],
  });

  return {
    async search(query: string): Promise<SearchResult[]> {
      if (query.length < 1) return [];
      try {
        const results = await searchResearch(query);
        return results.map(toResult);
      } catch {
        return [];
      }
    },

    async recent(): Promise<SearchResult[]> {
      try {
        const { listResearchProjects } = await import("@/lib/api/research");
        const res = await listResearchProjects({ pageSize: 5 });
        return res.data.map(toResult);
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
          id: "research-new",
          label: "New Research Project",
          action: () => {},
        },
      ];
    },
  };
}
