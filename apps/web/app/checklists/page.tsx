"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChecklists } from "@/lib/api";

export default function ChecklistsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChecklists()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function fmtDate(d: string | null) {
    if (!d) return "Never";
    return new Date(d).toISOString().replace("T", " ").slice(0, 16);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">CHECKLISTS</h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-muted)" }}>
            REUSABLE TEMPLATES // TRADE PREPARATION PROTOCOL
          </p>
        </div>
        <button onClick={() => router.push("/checklists/new")} className="btn-primary text-xs">
          + NEW TEMPLATE
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-4" style={{ color: "var(--text-muted)" }}>Loading...</div>
      ) : templates.length === 0 ? (
        <div className="glass-card p-4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
          <div className="mb-3 font-semibold" style={{ color: "var(--text-primary)" }}>No checklists yet.</div>
          <div className="mb-4">Create your first trading checklist template.</div>
          <button onClick={() => router.push("/checklists/new")} className="btn-primary">Create Checklist</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: any) => (
            <div
              key={t.id}
              className="glass-card p-4 cursor-pointer transition-all hover:opacity-80"
              onClick={() => router.push(`/checklists/${t.id}`)}
            >
              <div className="font-bold text-sm tracking-widest mb-2">{t.name}</div>
              {t.description && (
                <div className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{t.description}</div>
              )}
              <div className="flex gap-3 text-xs" style={{ color: "var(--text-dim)" }}>
                <span>{t.itemCount ?? 0} items</span>
                {(t.criticalCount ?? 0) > 0 && (
                  <span style={{ color: "var(--accent-warn)" }}>{t.criticalCount} critical</span>
                )}
              </div>
              <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Last run: {fmtDate(t.lastRunAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
