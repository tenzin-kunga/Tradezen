"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getWatchlists,
  createWatchlist,
  deleteWatchlist,
  type Watchlist,
} from "@/lib/api/watchlist";
import WatchlistLists from "./WatchlistLists";
import WatchlistTable from "./WatchlistTable";
import WatchlistInspector from "./WatchlistInspector";

export default function WatchlistWorkspace() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const loadWatchlists = useCallback(async () => {
    try {
      const lists = await getWatchlists();
      setWatchlists(lists);
      if (lists.length > 0 && !activeListId) {
        setActiveListId(lists[0].id);
      }
    } catch (e) {
      console.error("Failed to load watchlists:", e);
    }
  }, [activeListId]);

  useEffect(() => {
    loadWatchlists().finally(() => setLoading(false));
  }, [loadWatchlists]);

  const handleCreateList = useCallback(async (name: string) => {
    try {
      const newList = await createWatchlist(name);
      setWatchlists((prev) => [...prev, newList]);
      setActiveListId(newList.id);
    } catch (e) {
      console.error("Failed to create watchlist:", e);
    }
  }, []);

  const handleDeleteList = useCallback(
    async (id: string) => {
      try {
        await deleteWatchlist(id);
        setWatchlists((prev) => prev.filter((l) => l.id !== id));
        if (activeListId === id) {
          const remaining = watchlists.filter((l) => l.id !== id);
          setActiveListId(remaining[0]?.id ?? null);
        }
      } catch (e) {
        console.error("Failed to delete watchlist:", e);
      }
    },
    [activeListId, watchlists],
  );

  const activeList = watchlists.find((l) => l.id === activeListId) || null;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted, #9ca3af)",
          fontSize: 12,
          letterSpacing: "0.1em",
        }}
      >
        LOADING WATCHLISTS...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: Lists panel */}
      <WatchlistLists
        watchlists={watchlists}
        activeId={activeListId}
        onSelect={setActiveListId}
        onCreate={handleCreateList}
        onDelete={handleDeleteList}
      />

      {/* Center: Symbols table */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {activeList ? (
          <WatchlistTable watchlist={activeList} />
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted, #9ca3af)",
              fontSize: 13,
            }}
          >
            {watchlists.length === 0
              ? "Create a watchlist to get started"
              : "Select a watchlist"}
          </div>
        )}
      </div>

      {/* Right: Inspector panel */}
      <WatchlistInspector
        collapsed={inspectorCollapsed}
        onToggle={() => setInspectorCollapsed(!inspectorCollapsed)}
      />
    </div>
  );
}
