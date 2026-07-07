import type {
  WorkspaceResource,
  ResourceType,
} from "./types";

function resourceUrl(type: ResourceType, id: string): string {
  switch (type) {
    case "trade":
      return `/trades/${id}`;
    case "journal":
      return `/journal?date=${id}`;
    case "conversation":
      return `/workspace/assistant?thread=${id}`;
    case "research":
      return `/workspace/research?topic=${id}`;
    case "watchlist":
      return `/workspace/watchlist`;
    case "calendar":
      return `/calendar`;
    case "file":
      return `/workspace/files?file=${id}`;
    case "report":
      return `/reports?report=${id}`;
    default:
      return `/workspace`;
  }
}

export function createResource(
  type: ResourceType,
  id: string,
  title: string,
  metadata?: Record<string, unknown>,
): WorkspaceResource {
  return {
    id: `${type}:${id}`,
    type,
    title,
    url: resourceUrl(type, id),
    metadata,
  };
}

export function createTradeResource(tradeId: string, symbol?: string): WorkspaceResource {
  return createResource("trade", tradeId, symbol || "Trade", { tradeId });
}

export function createJournalResource(date: string): WorkspaceResource {
  return createResource("journal", date, date, { date });
}

export function createConversationResource(
  conversationId: string,
  title?: string,
): WorkspaceResource {
  return createResource("conversation", conversationId, title || "New Conversation", {
    conversationId,
  });
}

export function createWatchlistResource(): WorkspaceResource {
  return createResource("watchlist", "default", "Watchlist");
}

export function createResearchResource(topicId: string, title?: string): WorkspaceResource {
  return createResource("research", topicId, title || "Research");
}
