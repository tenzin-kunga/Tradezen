import type {
  SearchProvider,
  SearchResult,
  QuickAction,
  WorkspaceResource,
} from "@/lib/workspace/types";
import { createJournalResource } from "@/lib/workspace/resource";

export function createJournalSearchProvider(): SearchProvider {
  return {
    async search(query: string): Promise<SearchResult[]> {
      if (query.length < 1) return [];

      try {
        const { getJournals } = await import("@/lib/api");
        const res = await getJournals(30);
        const entries = res.data || [];

        const lower = query.toLowerCase();
        return entries
          .filter((e: any) => {
            const text = [
              e.pre_market_notes,
              e.post_market_notes,
              e.lessons,
              e.mood,
            ]
              .join(" ")
              .toLowerCase();
            return text.includes(lower);
          })
          .slice(0, 5)
          .map((e: any) => ({
            resource: createJournalResource(e.date?.slice(0, 10) || ""),
            score: 0.7,
            highlights: [e.mood, e.date?.slice(0, 10)].filter(Boolean),
            actions: [],
          }));
      } catch {
        return [];
      }
    },

    async recent(): Promise<SearchResult[]> {
      try {
        const { getJournals } = await import("@/lib/api");
        const res = await getJournals(5);
        const entries = res.data || [];

        return entries.map((e: any) => ({
          resource: createJournalResource(e.date?.slice(0, 10) || ""),
          score: 0.4,
          highlights: [e.date?.slice(0, 10)].filter(Boolean),
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
          id: "journal-today",
          label: "Open Today's Journal",
          action: () => {},
        },
      ];
    },
  };
}
