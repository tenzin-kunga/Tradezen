"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChecklists, type ChecklistSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import DashboardShell from "@/components/DashboardShell";

export default function ChecklistsPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    getChecklists()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading]);

  function fmtDate(d: string | null) {
    if (!d) return "Never";
    return new Date(d).toISOString().replace("T", " ").slice(0, 16);
  }

  return (
    <DashboardShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            CHECKLISTS
          </h1>
          <p
            className="text-xs mt-1 tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            REUSABLE TEMPLATES // TRADE PREPARATION PROTOCOL
          </p>
        </div>
        <button
          onClick={() => router.push("/checklists/new")}
          className="btn-primary text-xs"
        >
          + NEW TEMPLATE
        </button>
      </div>

      {loading ? (
        <div className="surface-1 rounded-xl p-6 py-14">
          <div className="space-y-3">
            <div className="skeleton" style={{ width: "35%", height: 14 }} />
            <div className="skeleton" style={{ width: "60%", height: 12 }} />
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="surface-1 rounded-xl p-6 py-14 text-center">
          <div
            className="mb-3 font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            No checklists yet
          </div>
          <div className="mb-4 text-xs" style={{ color: "var(--text-dim)" }}>
            Create your first pre-trade checklist template.
          </div>
          <button
            onClick={() => router.push("/checklists/new")}
            className="btn-primary text-xs"
          >
            Create Checklist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
          {templates.map((t) => (
            <div
              key={t.id}
              className="glass-card p-4 cursor-pointer transition-all hover:opacity-80"
              onClick={() => router.push(`/checklists/${t.id}`)}
            >
              <div className="font-bold text-sm tracking-widest mb-2">
                {t.name}
              </div>
              {t.description && (
                <div
                  className="text-xs mb-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t.description}
                </div>
              )}
              <div
                className="flex gap-3 text-xs"
                style={{ color: "var(--text-dim)" }}
              >
                <span>{t.itemCount ?? 0} items</span>
                {(t.criticalCount ?? 0) > 0 && (
                  <span style={{ color: "var(--accent-warn)" }}>
                    {t.criticalCount} critical
                  </span>
                )}
              </div>
              <div
                className="text-xs mt-2"
                style={{ color: "var(--text-muted)" }}
              >
                Last run: {fmtDate(t.lastRunAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
