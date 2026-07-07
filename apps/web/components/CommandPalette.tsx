"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { globalSearch } from "@/lib/api";
import { getSearchRegistry } from "@/lib/workspace/search-registry";

const RECENT_KEY = "tradezen_recent_searches";
const MAX_RECENT = 5;

type SearchResult = Awaited<ReturnType<typeof globalSearch>>;

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function addRecent(term: string) {
  try {
    const items = getRecent().filter((s) => s !== term);
    items.unshift(term);
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT)),
    );
  } catch {}
}

function Truncated({ text, max }: { text: string; max: number }) {
  if (text.length <= max) return <>{text}</>;
  return <>{text.slice(0, max)}…</>;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      className="label-caps px-4 py-2"
      style={{ color: "var(--text-dim, #6b7280)" }}
    >
      {label}
    </div>
  );
}

function ItemRow({
  item,
  active,
  onHover,
}: {
  item: PaletteItem;
  active: boolean;
  onHover: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={item.onSelect}
      className="flex items-center gap-3 w-full text-left"
      style={{
        padding: "8px 16px",
        fontSize: 13,
        background: active ? "var(--bg-surface-hover, #17181c)" : "transparent",
        color: active
          ? "var(--text-primary, #fafafa)"
          : "var(--text-primary, #fafafa)",
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.1s",
      }}
    >
      {item.icon && (
        <span
          style={{
            flexShrink: 0,
            color: "var(--text-muted, #9ca3af)",
            width: 18,
            height: 18,
          }}
        >
          {item.icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>
          <Truncated text={item.label} max={60} />
        </div>
        {item.description && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-dim, #6b7280)",
              marginTop: 2,
            }}
          >
            <Truncated text={item.description} max={80} />
          </div>
        )}
      </div>
      {active && (
        <kbd
          style={{
            fontSize: 10,
            padding: "2px 5px",
            borderRadius: 4,
            background: "var(--bg-surface, #111214)",
            color: "var(--text-dim, #6b7280)",
            border: "1px solid var(--border, #23252d)",
            flexShrink: 0,
          }}
        >
          ↵
        </kbd>
      )}
    </button>
  );
}

// ─── Icons ──────────────────────────────────────────

const IconTrade = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
    <circle cx="8" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="10" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconJournal = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <path d="M8 7h8" />
    <path d="M8 11h6" />
  </svg>
);

const IconTag = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l6.17-6.17a2 2 0 0 0 0-2.83L12 2z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const IconDashboard = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconAnalytics = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M7 16l4-8 4 4 4-6" />
  </svg>
);

const IconReports = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconCalendar = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconChecklist = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const IconCalculator = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="10.01" />
    <line x1="12" y1="10" x2="12" y2="10.01" />
    <line x1="16" y1="10" x2="16" y2="10.01" />
    <line x1="8" y1="14" x2="8" y2="14.01" />
    <line x1="12" y1="14" x2="12" y2="14.01" />
    <line x1="16" y1="14" x2="16" y2="14.01" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);

const IconSearch = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconPlus = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconClock = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconSparkles = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2l2.4 7.2L22 9l-6 4.8L18 22l-6-4.8L6 22l2-8.2L2 9l7.6.2z" />
  </svg>
);

const IconFilter = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [registryItems, setRegistryItems] = useState<PaletteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Refresh recent searches when palette opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecent());
      setQuery("");
      setResults(null);
      setActiveIndex(0);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setLoading(false);
      setResults(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [apiData, registryResults] = await Promise.all([
          globalSearch(query.trim()).catch(() => null),
          getSearchRegistry().search(query.trim()).catch(() => []),
        ]);

        setResults(apiData || { trades: [], journals: [], tags: [] });

        // Convert registry results to palette items
        if (registryResults.length > 0) {
          setRegistryItems(
            registryResults.map((result) => ({
              id: `registry-${result.resource.id}`,
              label: result.resource.title,
              description: result.highlights.join(", "),
              onSelect: () => {
                close();
                router.push(result.resource.url);
              },
            })),
          );
        } else {
          setRegistryItems([]);
        }
      } catch {
        setResults(null);
        setRegistryItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Build flat items list
  const items = useMemo(() => {
    const list: PaletteItem[] = [];

    if (query.trim().length === 0) {
      // Quick Actions
      list.push({
        id: "nav-dashboard",
        label: "Dashboard",
        icon: IconDashboard,
        onSelect: () => {
          close();
          router.push("/");
        },
      });
      list.push({
        id: "nav-trades",
        label: "Log Trade",
        icon: IconPlus,
        description: "Create a new trade entry",
        onSelect: () => {
          close();
          router.push("/add-trade");
        },
      });
      list.push({
        id: "nav-journal",
        label: "Today's Journal",
        icon: IconJournal,
        description: "Open today's journal entry",
        onSelect: () => {
          close();
          router.push(`/journal?date=${new Date().toISOString().slice(0, 10)}`);
        },
      });
      list.push({
        id: "nav-analytics",
        label: "Analytics",
        icon: IconAnalytics,
        onSelect: () => {
          close();
          router.push("/analytics");
        },
      });
      list.push({
        id: "nav-reports",
        label: "Reports",
        icon: IconReports,
        onSelect: () => {
          close();
          router.push("/reports");
        },
      });
      list.push({
        id: "nav-calendar",
        label: "Calendar",
        icon: IconCalendar,
        onSelect: () => {
          close();
          router.push("/calendar");
        },
      });
      list.push({
        id: "nav-checklists",
        label: "Checklists",
        icon: IconChecklist,
        onSelect: () => {
          close();
          router.push("/checklists");
        },
      });
      list.push({
        id: "nav-calculator",
        label: "Calculator",
        icon: IconCalculator,
        onSelect: () => {
          close();
          router.push("/calculator");
        },
      });

      // AI Actions
      list.push({
        id: "ai-insight",
        label: "AI Trading Insight",
        icon: IconSparkles,
        description: "Get AI-powered analysis of your recent performance",
        onSelect: () => {
          close();
          router.push("/analytics");
        },
      });

      // Recent Searches
      for (const term of recentSearches) {
        list.push({
          id: `recent-${term}`,
          label: term,
          icon: IconClock,
          onSelect: () => {
            addRecent(term);
            close();
            router.push(`/trades?q=${encodeURIComponent(term)}`);
          },
        });
      }
    }

    // Quick Filters
    const filterMatch = query.match(/^(tag|symbol|strategy):(.+)/i);
    if (filterMatch) {
      const [, prefix, value] = filterMatch;
      const label =
        prefix.toLowerCase() === "tag"
          ? `Filter by tag: ${value.trim()}`
          : prefix.toLowerCase() === "symbol"
            ? `View trades for ${value.trim().toUpperCase()}`
            : `View strategy: ${value.trim()}`;
      list.push({
        id: `filter-${prefix}-${value}`,
        label,
        icon: IconFilter,
        onSelect: () => {
          const term = query.trim();
          addRecent(term);
          close();
          const params = new URLSearchParams();
          if (prefix.toLowerCase() === "tag") params.set("tag", value.trim());
          else if (prefix.toLowerCase() === "symbol")
            params.set("symbol", value.trim().toUpperCase());
          else params.set("strategy", value.trim());
          router.push(`/trades?${params.toString()}`);
        },
      });
    }

    // Search results
    if (results) {
      for (const t of results.trades) {
        const pnl = Number(t.pnl);
        const pnlStr =
          pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
        list.push({
          id: `trade-${t.id}`,
          label: `${t.symbol}  ${t.direction.toUpperCase()}  ${pnlStr}`,
          description: t.strategy ? `Strategy: ${t.strategy}` : undefined,
          icon: IconTrade,
          onSelect: () => {
            close();
            router.push(`/trades/${t.id}`);
          },
        });
      }
      for (const j of results.journals) {
        list.push({
          id: `journal-${j.id}`,
          label: `Journal — ${j.date}`,
          description: j.lessons ? `Lesson: ${j.lessons}` : undefined,
          icon: IconJournal,
          onSelect: () => {
            close();
            router.push(`/journal?date=${j.date}`);
          },
        });
      }
      for (const t of results.tags) {
        list.push({
          id: `tag-${t.id}`,
          label: `Tag: ${t.name}`,
          description: t.category ? `Category: ${t.category}` : undefined,
          icon: IconTag,
          onSelect: () => {
            addRecent(query.trim());
            close();
            router.push(`/trades?tag=${encodeURIComponent(t.name)}`);
          },
        });
      }
    }

    // Trade shortcut — create trade when no results match
    if (
      query.trim().length >= 2 &&
      results &&
      !results.trades.some(
        (t) => t.symbol.toLowerCase() === query.trim().toLowerCase(),
      )
    ) {
      list.push({
        id: `create-trade-${query.trim()}`,
        label: `Log Trade: ${query.trim().toUpperCase()}`,
        description: "Create a new trade for this symbol",
        icon: IconPlus,
        onSelect: () => {
          const term = query.trim();
          addRecent(term);
          close();
          router.push(
            `/add-trade?symbol=${encodeURIComponent(term.toUpperCase())}`,
          );
        },
      });
    }

    // Add registry search results
    if (registryItems.length > 0) {
      list.push(...registryItems);
    }

    return list;
  }, [query, results, registryItems, recentSearches, router, onOpenChange]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(
      `[data-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const hasResults = items.length > 0;

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (items[activeIndex]) {
          items[activeIndex].onSelect();
        }
        break;
      case "Escape":
        close();
        break;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[520px] !p-0 !gap-0 !rounded-xl"
        style={{
          background: "var(--bg-surface, #111214)",
          border: "1px solid var(--border, #23252d)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03), 0 16px 48px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4"
          style={{
            borderBottom: "1px solid var(--border, #23252d)",
            height: 48,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              color: "var(--text-muted, #9ca3af)",
              flexShrink: 0,
              display: "flex",
            }}
          >
            {IconSearch}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search trades, journals, tags…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text-primary, #fafafa)",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
          {loading && (
            <span style={{ fontSize: 11, color: "var(--text-dim, #6b7280)" }}>
              searching…
            </span>
          )}
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            maxHeight: 360,
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {!hasResults && !loading && query.trim().length >= 3 && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--text-dim, #6b7280)",
                fontSize: 13,
              }}
            >
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <div onMouseMove={() => {}}>
              {(() => {
                const sections: {
                  label: string;
                  start: number;
                  end: number;
                }[] = [];
                let idx = 0;

                if (query.trim().length === 0) {
                  // Quick actions section
                  const quickCount = 9; // 8 nav + 1 AI
                  sections.push({
                    label: "QUICK ACTIONS",
                    start: 0,
                    end: quickCount,
                  });
                  idx = quickCount;

                  // Recent searches
                  if (recentSearches.length > 0) {
                    sections.push({
                      label: "RECENT",
                      start: idx,
                      end: idx + recentSearches.length,
                    });
                    idx += recentSearches.length;
                  }
                }

                // Quick filters
                if (query.match(/^(tag|symbol|strategy):/i)) {
                  sections.push({
                    label: "QUICK FILTERS",
                    start: idx,
                    end: idx + 1,
                  });
                  idx += 1;
                }

                // Search results
                if (results) {
                  const tradeStart = idx;
                  const tradeEnd = idx + results.trades.length;
                  if (results.trades.length > 0) {
                    sections.push({
                      label: "TRADES",
                      start: tradeStart,
                      end: tradeEnd,
                    });
                    idx = tradeEnd;
                  }
                  const journalStart = idx;
                  const journalEnd = idx + results.journals.length;
                  if (results.journals.length > 0) {
                    sections.push({
                      label: "JOURNALS",
                      start: journalStart,
                      end: journalEnd,
                    });
                    idx = journalEnd;
                  }
                  const tagStart = idx;
                  const tagEnd = idx + results.tags.length;
                  if (results.tags.length > 0) {
                    sections.push({
                      label: "TAGS",
                      start: tagStart,
                      end: tagEnd,
                    });
                    idx = tagEnd;
                  }
                }

                // Create trade shortcut
                if (
                  query.trim().length >= 2 &&
                  results &&
                  !results.trades.some(
                    (t) =>
                      t.symbol.toLowerCase() === query.trim().toLowerCase(),
                  )
                ) {
                  sections.push({ label: "ACTIONS", start: idx, end: idx + 1 });
                }

                let globalIdx = 0;
                return sections.map((section) => {
                  const fragment = (
                    <div key={section.label}>
                      <SectionHeader label={section.label} />
                      {items.slice(section.start, section.end).map((item) => {
                        const currentIdx = globalIdx;
                        globalIdx++;
                        return (
                          <div key={item.id} data-index={currentIdx}>
                            <ItemRow
                              item={item}
                              active={activeIndex === currentIdx}
                              onHover={() => setActiveIndex(currentIdx)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                  return fragment;
                });
              })()}
            </div>
          )}

          {!hasResults && query.trim().length < 3 && !loading && (
            <div className="flex flex-col items-center py-10 px-4 text-center">
              <kbd
                style={{
                  fontSize: 10,
                  padding: "3px 7px",
                  borderRadius: 4,
                  background: "var(--bg-surface-hover, #17181c)",
                  color: "var(--text-dim, #6b7280)",
                  border: "1px solid var(--border, #23252d)",
                  marginBottom: 12,
                }}
              >
                Ctrl+K
              </kbd>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-dim, #6b7280)",
                  lineHeight: 1.5,
                }}
              >
                Search trades, journals, and tags
                <br />
                Type{" "}
                <kbd
                  style={{
                    background: "var(--bg-surface-hover)",
                    padding: "1px 4px",
                    borderRadius: 3,
                    fontSize: 11,
                  }}
                >
                  symbol:EURUSD
                </kbd>{" "}
                to filter
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-3 px-4"
          style={{
            borderTop: "1px solid var(--border, #23252d)",
            height: 36,
            fontSize: 10,
            color: "var(--text-dim, #6b7280)",
            flexShrink: 0,
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
