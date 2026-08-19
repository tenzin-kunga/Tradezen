"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  type ResearchProject,
  type ResearchActivity,
  type ResearchStatus,
  listResearchProjects,
  createResearchProject,
  updateResearchProject,
  deleteResearchProject,
  updateResearchNotes,
  updateResearchChecklist,
  addResearchTag,
  removeResearchTag,
  getResearchActivity,
} from "@/lib/api/research";
import { searchSymbols as apiSearchSymbols } from "@/lib/api/watchlist";
import ResearchAIChat from "./ResearchAIChat";
import ResearchDocuments from "./ResearchDocuments";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Skeleton } from "@/components/primitives/Skeleton";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { Badge } from "@/components/primitives/Badge";

const STATUS_FILTERS: (ResearchStatus | "all")[] = [
  "all",
  "idea",
  "active",
  "on_hold",
  "closed",
];

const STATUS_COLORS: Record<ResearchStatus, string> = {
  idea: "#9ca3af",
  active: "#22c55e",
  on_hold: "#f59e0b",
  closed: "#6b7280",
};

const CHECKLIST_ITEMS: {
  key:
    | "thesisComplete"
    | "valuationComplete"
    | "risksReviewed"
    | "earningsReviewed";
  label: string;
}[] = [
  { key: "thesisComplete", label: "Thesis defined" },
  { key: "valuationComplete", label: "Valuation done" },
  { key: "risksReviewed", label: "Risks reviewed" },
  { key: "earningsReviewed", label: "Earnings reviewed" },
];

export default function ResearchWorkspace() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ResearchStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listResearchProjects({
        status: filter === "all" ? undefined : filter,
        pageSize: 100,
      });
      setProjects(res.data);
      setActiveId((cur) => cur ?? res.data[0]?.id ?? null);
    } catch (e) {
      console.error("Failed to load research projects:", e);
    }
  }, [filter]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const active = projects.find((p) => p.id === activeId) || null;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 16,
          width: 260,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={56} radius={8} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <ResearchSidebar
        projects={projects}
        activeId={activeId}
        filter={filter}
        onFilter={setFilter}
        onSelect={setActiveId}
        onNew={() => setShowNew(true)}
        onDelete={async (id) => {
          await deleteResearchProject(id);
          setActiveId((cur) => (cur === id ? null : cur));
          load();
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {active ? (
          <ResearchProjectView
            key={active.id}
            project={active}
            onChanged={load}
          />
        ) : (
          <EmptyState
            title="No project selected"
            description="Select a research project or create a new one to begin."
          />
        )}
      </div>

      {active && <ResearchActivityPanel project={active} />}

      {showNew && (
        <NewProjectModal
          onCreate={async (title, symbolId) => {
            const p = await createResearchProject({
              title,
              symbol_id: symbolId,
            });
            setShowNew(false);
            setActiveId(p.id);
            load();
          }}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}

function ResearchSidebar({
  projects,
  activeId,
  filter,
  onFilter,
  onSelect,
  onNew,
  onDelete,
}: {
  projects: ResearchProject[];
  activeId: string | null;
  filter: ResearchStatus | "all";
  onFilter: (f: ResearchStatus | "all") => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const visible = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      (p.ticker || "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        borderRight: "1px solid var(--border-soft, #23252d)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 48,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-soft, #23252d)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          Research
        </span>
        <Button variant="primary" size="sm" onClick={onNew}>
          + New
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-soft, #23252d)",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects…"
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--border-soft, #23252d)",
            background: "var(--bg-surface-hover, #1a1b23)",
            color: "var(--text-primary, #fafafa)",
            fontSize: 12,
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map((f) => (
            <Badge
              key={f}
              tone={filter === f ? "accent" : "neutral"}
              style={{ cursor: "pointer", textTransform: "capitalize" }}
              onClick={() => onFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {visible.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-muted, #9ca3af)",
            }}
          >
            No projects yet.
          </div>
        ) : (
          visible.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              className="glass-card"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer",
                marginBottom: 6,
                border: `1px solid ${activeId === p.id ? "var(--accent, #3b82f6)" : "transparent"}`,
                background:
                  activeId === p.id
                    ? "var(--bg-surface-hover, #1a1b23)"
                    : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary, #fafafa)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.title}
                </div>
                {hovered === p.id && (
                  <IconButton
                    size={20}
                    title="Delete"
                    style={{ color: "var(--accent-loss)", flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${p.title}"?`)) onDelete(p.id);
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </IconButton>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: STATUS_COLORS[p.status],
                  }}
                />
                <span
                  style={{ fontSize: 10, color: "var(--text-dim, #6b7280)" }}
                >
                  {p.status} · {p.conviction}
                  {p.ticker ? ` · ${p.ticker}` : ""}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ResearchProjectView({
  project,
  onChanged,
}: {
  project: ResearchProject;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [content, setContent] = useState(project.notes?.content || "");
  const [version, setVersion] = useState(project.notes?.version ?? 0);
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [conviction, setConviction] = useState(project.conviction);
  const [status, setStatus] = useState(project.status);
  const [tags, setTags] = useState(project.tags);
  const [symbolTicker, setSymbolTicker] = useState(project.ticker || "");
  const [symbolResults, setSymbolResults] = useState<
    { id: string; ticker: string; name: string | null }[]
  >([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveNotes = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateResearchNotes(
        project.id,
        content,
        version || undefined,
      );
      setVersion(res.version);
    } catch (e: any) {
      if (e.message?.includes("modified")) {
        setSaveError("Notes changed elsewhere — reload to see latest.");
      } else {
        setSaveError("Failed to save notes.");
      }
    }
    setSaving(false);
  }, [project.id, content, version]);

  const saveTitle = useCallback(async () => {
    if (title === project.title) return;
    await updateResearchProject(project.id, { title });
    onChanged();
  }, [project.id, title, project.title, onChanged]);

  const toggleChecklist = useCallback(
    async (
      key:
        | "thesisComplete"
        | "valuationComplete"
        | "risksReviewed"
        | "earningsReviewed",
      value: boolean,
    ) => {
      await updateResearchChecklist(project.id, { [key]: value });
      onChanged();
    },
    [project.id, onChanged],
  );

  const changeConviction = useCallback(
    async (c: typeof conviction) => {
      setConviction(c);
      await updateResearchProject(project.id, { conviction: c });
    },
    [project.id],
  );

  const changeStatus = useCallback(
    async (s: typeof status) => {
      setStatus(s);
      await updateResearchProject(project.id, { status: s });
    },
    [project.id],
  );

  const addTag = useCallback(
    async (label: string) => {
      const t = await addResearchTag(project.id, label);
      setTags((prev) => [...prev, t]);
      onChanged();
    },
    [project.id, onChanged],
  );

  const removeTag = useCallback(
    async (tagId: string) => {
      await removeResearchTag(project.id, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      onChanged();
    },
    [project.id, onChanged],
  );

  const linkSymbol = useCallback(
    async (symbolId: string | null) => {
      await updateResearchProject(project.id, { symbol_id: symbolId });
      onChanged();
    },
    [project.id, onChanged],
  );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 40,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-soft, #23252d)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary, #fafafa)",
              width: 260,
            }}
          />
          <select
            value={status}
            onChange={(e) => changeStatus(e.target.value as typeof status)}
            style={pillStyle(STATUS_COLORS[status])}
          >
            <option value="idea">idea</option>
            <option value="active">active</option>
            <option value="on_hold">on_hold</option>
            <option value="closed">closed</option>
          </select>
          <select
            value={conviction}
            onChange={(e) =>
              changeConviction(e.target.value as typeof conviction)
            }
            style={pillStyle("#3b82f6")}
          >
            <option value="low">low conviction</option>
            <option value="medium">medium conviction</option>
            <option value="high">high conviction</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button
            variant={showChat ? "primary" : "ghost"}
            size="sm"
            onClick={() => setShowChat(!showChat)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ marginRight: 4 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            AI
          </Button>
          <Button
            variant={isPreview ? "primary" : "ghost"}
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            {isPreview ? "Edit" : "Preview"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={saveNotes}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Body: editor + right rail (checklist, tags, symbol) */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
          {isPreview ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Investment Thesis — write in Markdown..."
              style={{
                width: "100%",
                height: "100%",
                minHeight: 400,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary, #fafafa)",
                fontSize: 14,
                lineHeight: 1.7,
                resize: "none",
                fontFamily: "var(--font-mono, monospace)",
              }}
            />
          )}
          {saveError && (
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: "var(--accent-loss, #ef4444)",
              }}
            >
              {saveError}
            </div>
          )}
          <ResearchDocuments project={project} onChanged={onChanged} />
        </div>

        {/* Right rail */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            borderLeft: "1px solid var(--border-soft, #23252d)",
            padding: 16,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Symbol link */}
          <Section title="SYMBOL">
            <div style={{ position: "relative" }}>
              <input
                value={symbolTicker}
                onChange={async (e) => {
                  setSymbolTicker(e.target.value);
                  if (e.target.value.trim().length > 0) {
                    const r = await apiSearchSymbols(e.target.value);
                    setSymbolResults(r.slice(0, 5));
                  } else {
                    setSymbolResults([]);
                  }
                }}
                placeholder="Link a ticker..."
                style={inputStyle}
              />
              {symbolResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: "var(--bg-surface-hover, #1a1b23)",
                    border: "1px solid var(--border-soft, #23252d)",
                    borderRadius: 6,
                    zIndex: 10,
                  }}
                >
                  {symbolResults.map((s) => (
                    <div
                      key={s.id}
                      onClick={async () => {
                        await linkSymbol(s.id);
                        setSymbolTicker(s.ticker);
                        setSymbolResults([]);
                      }}
                      style={{
                        padding: "8px 10px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--text-primary, #fafafa)",
                      }}
                    >
                      {s.ticker}{" "}
                      <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                        {s.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {project.symbolId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  linkSymbol(null);
                  setSymbolTicker("");
                }}
                style={{ marginTop: 6 }}
              >
                Unlink
              </Button>
            )}
          </Section>

          {/* Checklist */}
          <Section title="RESEARCH CHECKLIST">
            {CHECKLIST_ITEMS.map((item) => {
              const checked = project.checklist?.[item.key] ?? false;
              return (
                <label
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--text-primary, #fafafa)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      toggleChecklist(item.key, e.target.checked)
                    }
                    style={{ accentColor: "var(--accent, #3b82f6)" }}
                  />
                  {item.label}
                </label>
              );
            })}
          </Section>

          {/* Tags */}
          <Section title="TAGS">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tags.map((t) => (
                <span
                  key={t.id}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: t.color + "22",
                    color: t.color,
                    border: `1px solid ${t.color}55`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {t.label}
                  <button
                    onClick={() => removeTag(t.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: 10,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              placeholder="Add tag + Enter"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  await addTag(e.currentTarget.value.trim());
                  e.currentTarget.value = "";
                }
              }}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </Section>
        </div>

        {/* AI panel */}
        {showChat && (
          <div
            style={{
              width: 360,
              borderLeft: "1px solid var(--border-soft, #23252d)",
              flexShrink: 0,
            }}
          >
            <ResearchAIChat project={project} />
          </div>
        )}
      </div>

      <div
        style={{
          height: 28,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid var(--border-soft, #23252d)",
          fontSize: 10,
          color: "var(--text-dim, #6b7280)",
          flexShrink: 0,
        }}
      >
        <span>
          v{version} · {content.split(/\s+/).filter(Boolean).length} words
        </span>
        <span>{content.length} chars</span>
      </div>
    </div>
  );
}

function ResearchActivityPanel({ project }: { project: ResearchProject }) {
  const [activity, setActivity] = useState<ResearchActivity[]>([]);
  useEffect(() => {
    getResearchActivity(project.id)
      .then(setActivity)
      .catch(() => {});
  }, [project.id]);

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderLeft: "1px solid var(--border-soft, #23252d)",
        padding: 16,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-dim, #6b7280)",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        RECENT ACTIVITY
      </div>
      {activity.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted, #9ca3af)" }}>
          No activity yet.
        </div>
      ) : (
        activity.map((a) => (
          <div
            key={a.id}
            style={{
              padding: "6px 0",
              borderBottom: "1px solid var(--border-soft, #23252d)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-primary, #fafafa)",
                textTransform: "capitalize",
              }}
            >
              {a.type.replace(/_/g, " ")}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted, #9ca3af)",
                marginTop: 2,
              }}
            >
              {new Date(a.createdAt).toLocaleString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function NewProjectModal({
  onCreate,
  onClose,
}: {
  onCreate: (title: string, symbolId?: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [symbolTicker, setSymbolTicker] = useState("");
  const [symbolResults, setSymbolResults] = useState<
    { id: string; ticker: string; name: string | null }[]
  >([]);
  const [selectedSymbol, setSelectedSymbol] = useState<{
    id: string;
    ticker: string;
  } | null>(null);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: 420, padding: 24, borderRadius: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
            marginBottom: 16,
          }}
        >
          New Research Project
        </h2>
        <div style={{ marginBottom: 16 }}>
          <label
            className="label-caps"
            style={{
              display: "block",
              marginBottom: 6,
              color: "var(--text-dim, #6b7280)",
            }}
          >
            TITLE
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. AAPL Long Thesis"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label
            className="label-caps"
            style={{
              display: "block",
              marginBottom: 6,
              color: "var(--text-dim, #6b7280)",
            }}
          >
            SYMBOL (OPTIONAL)
          </label>
          <div style={{ position: "relative" }}>
            <input
              value={symbolTicker}
              onChange={async (e) => {
                setSymbolTicker(e.target.value);
                setSelectedSymbol(null);
                if (e.target.value.trim().length > 0) {
                  const r = await apiSearchSymbols(e.target.value);
                  setSymbolResults(r.slice(0, 5));
                } else {
                  setSymbolResults([]);
                }
              }}
              placeholder="Link a ticker..."
              style={inputStyle}
            />
            {symbolResults.length > 0 && !selectedSymbol && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: "var(--bg-surface-hover, #1a1b23)",
                  border: "1px solid var(--border-soft, #23252d)",
                  borderRadius: 6,
                  zIndex: 10,
                }}
              >
                {symbolResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSymbol({ id: s.id, ticker: s.ticker });
                      setSymbolTicker(s.ticker);
                      setSymbolResults([]);
                    }}
                    style={{
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontSize: 12,
                      color: "var(--text-primary, #fafafa)",
                    }}
                  >
                    {s.ticker}{" "}
                    <span style={{ color: "var(--text-muted, #9ca3af)" }}>
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!title.trim()}
            onClick={() =>
              title.trim() && onCreate(title.trim(), selectedSymbol?.id)
            }
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-dim, #6b7280)",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-soft, #23252d)",
  background: "var(--bg-surface-hover, #1a1b23)",
  color: "var(--text-primary, #fafafa)",
  fontSize: 12,
  outline: "none",
};

const pillStyle = (color: string): React.CSSProperties => ({
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 4,
  background: "var(--bg-surface-hover, #1a1b23)",
  color,
  border: `1px solid ${color}55`,
  outline: "none",
  cursor: "pointer",
});
