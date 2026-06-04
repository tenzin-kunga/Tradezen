"use client";
import { useEffect, useState, useCallback } from "react";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/lib/api";
import { useToast } from "@/components/Toast";

const GOAL_TYPES = [
  { value: "monthly_pnl", label: "Monthly P&L ($)" },
  { value: "monthly_win_rate", label: "Monthly Win Rate (%)" },
  { value: "profit_factor", label: "Profit Factor" },
  { value: "total_trades", label: "Total Trades" },
  { value: "avg_rr", label: "Avg R:R" },
  { value: "consecutive_wins", label: "Consecutive Wins" },
  { value: "max_drawdown", label: "Max Drawdown ($)" },
];

const PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly" },
];

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function typeLabel(type: string) {
  return GOAL_TYPES.find((g) => g.value === type)?.label ?? type;
}

export default function GoalsPage() {
  const { addToast } = useToast();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formType, setFormType] = useState("monthly_pnl");
  const [formTarget, setFormTarget] = useState("");
  const [formPeriod, setFormPeriod] = useState("monthly");
  const [formDirection, setFormDirection] = useState("higher");
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    getGoals()
      .then(setGoals)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setFormType("monthly_pnl");
    setFormTarget("");
    setFormPeriod("monthly");
    setFormDirection("higher");
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate("");
    setEditingId(null);
    setShowForm(false);
  }

  function editGoal(g: any) {
    setFormType(g.type);
    setFormTarget(String(g.target));
    setFormPeriod(g.period);
    setFormDirection(g.direction);
    setFormStartDate(g.start_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setFormEndDate(g.end_date?.slice(0, 10) ?? "");
    setEditingId(g.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = parseFloat(formTarget);
    if (!target || target <= 0) {
      addToast("error", "Target must be a positive number");
      return;
    }
    try {
      const payload = {
        type: formType,
        target,
        period: formPeriod,
        direction: formDirection,
        startDate: formStartDate,
        endDate: formEndDate || undefined,
      };
      if (editingId) {
        await updateGoal(editingId, payload);
        addToast("success", "Goal updated");
      } else {
        await createGoal(payload);
        addToast("success", "Goal created");
      }
      resetForm();
      load();
    } catch (err: any) {
      addToast("error", err.message ?? "Failed to save goal");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteGoal(id);
      addToast("success", "Goal deleted");
      load();
    } catch (err: any) {
      addToast("error", err.message ?? "Failed to delete goal");
    }
  }

  return (
    <div style={{ minHeight: "100%", maxWidth: 800 }}>
      <div className="flex items-center justify-between mb-4">
        <span className="label-caps" style={{ fontSize: 13 }}>GOALS</span>
        <button className="btn-glass text-xs" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? "CANCEL" : "+ NEW GOAL"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-4 mb-4" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label-caps">TYPE</label>
              <select className="input-glass" value={formType} onChange={(e) => setFormType(e.target.value)}>
                {GOAL_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label-caps">TARGET</label>
              <input className="input-glass" type="number" step="any" min="0.01" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label-caps">PERIOD</label>
              <select className="input-glass" value={formPeriod} onChange={(e) => setFormPeriod(e.target.value)}>
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label-caps">DIRECTION</label>
              <select className="input-glass" value={formDirection} onChange={(e) => setFormDirection(e.target.value)}>
                <option value="higher">Higher is better</option>
                <option value="lower">Lower is better</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label-caps">START DATE</label>
              <input className="input-glass" type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} required />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="label-caps">END DATE (optional)</label>
              <input className="input-glass" type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button type="submit" className="btn-glass text-xs font-bold" style={{ padding: "8px 24px" }}>
              {editingId ? "UPDATE GOAL" : "CREATE GOAL"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading goals...</p>
      ) : goals.length === 0 ? (
        <div className="glass-card p-6" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>No goals set yet. Create your first trading goal.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {goals.map((g) => {
            const pct = Math.min(100, Math.max(0, g.progress ?? 0));
            const isMet = g.direction === "higher" ? g.currentValue >= g.target : g.currentValue <= g.target;
            const barColor = isMet ? "var(--accent-profit)" : pct >= 50 ? "var(--accent-warn)" : "var(--text-muted)";
            return (
              <div key={g.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="label-caps" style={{ fontSize: 11, marginBottom: 2 }}>{typeLabel(g.type)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{g.period.toUpperCase()} &middot; {g.direction === "higher" ? "↑" : "↓"}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-glass text-xs" style={{ padding: "4px 10px" }} onClick={() => editGoal(g)}>EDIT</button>
                    <button className="btn-glass text-xs" style={{ padding: "4px 10px", color: "var(--accent-loss)" }} onClick={() => handleDelete(g.id)}>DEL</button>
                  </div>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className="mono-data" style={{ fontSize: 22, fontWeight: 700, color: isMet ? "var(--accent-profit)" : "var(--text-primary)" }}>
                    {fmt(g.currentValue ?? 0)}
                  </span>
                  <span className="label-caps" style={{ fontSize: 10, paddingBottom: 3 }}>
                    OF {fmt(g.target)} TARGET
                  </span>
                </div>
                <div style={{ width: "100%", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
                <div className="label-caps" style={{ fontSize: 10, marginTop: 4, color: pct >= 100 ? "var(--accent-profit)" : "var(--text-muted)" }}>
                  {pct >= 100 ? "TARGET MET" : `${pct}% OF TARGET`}
                  {g.start_date && ` · From ${g.start_date.slice(0, 7)}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
