"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getChecklist,
  deleteChecklist,
  cloneChecklist,
  getChecklistRuns,
  createChecklistRun,
  deleteChecklistRun,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-context";

interface ChecklistItem {
  id: string;
  title: string;
  isCritical?: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  items?: ChecklistItem[];
}

interface ChecklistRunSummary {
  id: string;
  createdAt: string;
  checkedCount?: number;
  totalCount?: number;
  tradeId?: string | null;
}

export default function ChecklistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();
  const { loading: authLoading } = useAuth();
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [runs, setRuns] = useState<ChecklistRunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([getChecklist(id), getChecklistRuns(id)])
      .then(([t, r]) => {
        setTemplate(t);
        setRuns(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [load, authLoading]);

  async function handleClone() {
    try {
      const cloned = await cloneChecklist(id);
      addToast("success", "Checklist cloned");
      router.push(`/checklists/${cloned.id}`);
    } catch (_err) {
      addToast("error", "Failed to clone");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this checklist and all its runs?")) return;
    try {
      await deleteChecklist(id);
      addToast("success", "Checklist deleted");
      router.push("/checklists");
    } catch (_err) {
      addToast("error", "Failed to delete");
    }
  }

  async function handleStartRun() {
    try {
      const run = await createChecklistRun({ checklistId: id });
      router.push(`/checklists/runs/${run.id}`);
    } catch (_err) {
      addToast("error", "Failed to start run");
    }
  }

  async function handleDeleteRun(runId: string) {
    if (!confirm("Delete this run?")) return;
    try {
      await deleteChecklistRun(runId);
      load();
    } catch (_err) {
      addToast("error", "Failed to delete run");
    }
  }

  if (loading)
    return (
      <div className="glass-card p-4" style={{ color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  if (!template)
    return (
      <div className="glass-card p-4" style={{ color: "var(--accent-loss)" }}>
        Checklist not found.
      </div>
    );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            {template.name}
          </h1>
          {template.description && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {template.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleStartRun} className="btn-primary text-xs">
            START RUN
          </button>
          <button
            onClick={() => router.push(`/checklists/${id}/edit`)}
            className="btn-glass text-xs"
          >
            EDIT
          </button>
          <button onClick={handleClone} className="btn-glass text-xs">
            CLONE
          </button>
          <button
            onClick={handleDelete}
            className="btn-glass text-xs"
            style={{
              color: "var(--accent-loss)",
              borderColor: "var(--accent-loss)",
            }}
          >
            DELETE
          </button>
        </div>
      </div>

      <div className="glass-card p-4 md:p-5 mb-6">
        <div className="label-caps mb-4">
          ITEMS ({template.items?.length ?? 0})
        </div>
        {template.items?.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
            No items defined.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {template.items.map((item: ChecklistItem, i: number) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2"
                style={{
                  background: "var(--bg-glass)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span
                  className="text-xs"
                  style={{ color: "var(--text-dim)", width: 24 }}
                >
                  {i + 1}.
                </span>
                <span className="text-sm flex-1">{item.title}</span>
                {item.isCritical && (
                  <span
                    className="text-xs px-2 py-0.5"
                    style={{
                      color: "var(--accent-warn)",
                      border: "1px solid var(--accent-warn)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    CRITICAL
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-4 md:p-5">
        <div className="label-caps mb-4">PAST RUNS</div>
        {runs.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 12 }}>
            No runs yet. Click &quot;Start Run&quot; to begin.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {runs.map((run: ChecklistRunSummary) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 cursor-pointer"
                style={{
                  background: "var(--bg-glass)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
                onClick={() => router.push(`/checklists/runs/${run.id}`)}
              >
                <div>
                  <div className="text-xs font-semibold">
                    {new Date(run.createdAt)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 16)}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {run.checkedCount ?? 0}/{run.totalCount ?? 0} checked
                    {run.tradeId ? ` · Trade #${run.tradeId.slice(0, 8)}` : ""}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRun(run.id);
                  }}
                  className="text-xs"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-loss)",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
