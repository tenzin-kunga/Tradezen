"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getChecklistRun,
  updateChecklistRunItem,
  deleteChecklistRun,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth-context";

export default function RunViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();
  const { loading: authLoading } = useAuth();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    getChecklistRun(id)
      .then(setRun)
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!authLoading) load();
  }, [id, authLoading]);

  async function handleToggle(itemId: string, checked: boolean) {
    try {
      await updateChecklistRunItem(id, itemId, checked);
      setRun((prev: any) => ({
        ...prev,
        items: prev.items.map((it: any) =>
          it.itemId === itemId ? { ...it, checked } : it,
        ),
      }));
    } catch (err) {
      addToast("error", "Failed to update");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this run?")) return;
    try {
      await deleteChecklistRun(id);
      addToast("success", "Run deleted");
      router.push("/checklists");
    } catch (err) {
      addToast("error", "Failed to delete");
    }
  }

  function fmtDate(d: string) {
    return new Date(d).toISOString().replace("T", " ").slice(0, 19);
  }

  if (loading)
    return (
      <div className="glass-card p-4" style={{ color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  if (!run)
    return (
      <div className="glass-card p-4" style={{ color: "var(--accent-loss)" }}>
        Run not found.
      </div>
    );

  const checkedCount = run.items?.filter((it: any) => it.checked).length ?? 0;
  const totalCount = run.items?.length ?? 0;
  const allChecked = totalCount > 0 && checkedCount === totalCount;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            {run.checklistName ?? "CHECKLIST RUN"}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {fmtDate(run.createdAt)}
          </p>
          {run.tradeId && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Linked to trade: {run.tradeId}
            </p>
          )}
          {run.note && (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--text-muted)", fontStyle: "italic" }}
            >
              Note: {run.note}
            </p>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="btn-glass text-xs"
          style={{
            color: "var(--accent-loss)",
            borderColor: "var(--accent-loss)",
          }}
        >
          DELETE RUN
        </button>
      </div>

      <div className="glass-card p-4 md:p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-2xl font-bold">
            {checkedCount}/{totalCount}
          </div>
          {totalCount > 0 && (
            <div
              className="flex-1 h-2 rounded-full"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(checkedCount / totalCount) * 100}%`,
                  background: allChecked
                    ? "var(--accent-profit)"
                    : "var(--accent-warn)",
                }}
              />
            </div>
          )}
          {allChecked && (
            <span
              className="text-xs px-2 py-0.5"
              style={{
                color: "var(--accent-profit)",
                border: "1px solid var(--accent-profit)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              ALL COMPLETE
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {run.items?.map((item: any) => (
          <label
            key={item.itemId}
            className="glass-card p-3 flex items-center gap-3 cursor-pointer transition-all hover:opacity-80"
            style={{
              textDecoration: item.checked ? "line-through" : "none",
              opacity: item.checked ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => handleToggle(item.itemId, e.target.checked)}
              style={{
                accentColor: "var(--accent-profit)",
                width: 18,
                height: 18,
                flexShrink: 0,
              }}
            />
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
          </label>
        ))}
        {(!run.items || run.items.length === 0) && (
          <div
            className="glass-card p-4"
            style={{
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: 12,
            }}
          >
            No items in this run.
          </div>
        )}
      </div>
    </div>
  );
}
