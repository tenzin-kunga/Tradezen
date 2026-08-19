"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getWatchlists,
  createWatchlist,
  deleteWatchlist,
  type Watchlist,
  type WatchlistItem,
} from "@/lib/api/watchlist";
import WatchlistLists from "./WatchlistLists";
import WatchlistTable from "./WatchlistTable";
import WatchlistInspector from "./WatchlistInspector";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Skeleton } from "@/components/primitives/Skeleton";

export default function WatchlistWorkspace() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);

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
          flexDirection: "column",
          gap: 10,
          padding: 24,
          width: 280,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={40} radius={10} />
        ))}
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
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {activeList ? (
          <WatchlistTable
            watchlist={activeList}
            onSelectItem={setSelectedItem}
          />
        ) : (
          <EmptyState
            title={
              watchlists.length === 0
                ? "No watchlists yet"
                : "Select a watchlist"
            }
            description={
              watchlists.length === 0
                ? "Create a watchlist to track the symbols you care about."
                : undefined
            }
          />
        )}
      </div>

      {/* Right: Inspector panel */}
      <WatchlistInspector
        collapsed={inspectorCollapsed}
        onToggle={() => setInspectorCollapsed(!inspectorCollapsed)}
        item={selectedItem}
      />
    </div>
  );
}
