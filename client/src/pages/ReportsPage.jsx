import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { Activity, ArrowDownToLine, RefreshCw, Radio, WifiOff } from "lucide-react";
import { ExperienceLayer, IntelligenceRibbon } from "../components/BizLiftExperience.jsx";
import { apiFetch } from "../lib/api";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const EVENT_NAMES = new Set([
  "sale.created", "order.created", "order.cancelled", "inventory.created",
  "inventory.changed", "inventory.imported", "inventory.updated", "waste.created",
  "procurement.created", "stock.received", "recipe.updated",
]);

function EmptyChart({ message = "No transactions in this period yet" }) {
  return <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-current/15 px-5 text-center">
    <Activity size={22} className="opacity-40" />
    <p className="text-sm font-medium">Nothing to chart yet</p>
    <p className="max-w-sm text-xs opacity-55">{message}. Once real activity is recorded, this chart will populate automatically.</p>
  </div>;
}

const ReportsPage = ({ theme, toggleTheme }) => {
  const isDark = theme === "dark";
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [variance, setVariance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const refreshTimer = useRef(null);
  const inFlight = useRef(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [r, v] = await Promise.all([
        apiFetch(`/api/reports/operations?days=${days}`),
        apiFetch(`/api/intelligence/bi-variance?days=${days}`),
      ]);
      const [j, vj] = await Promise.all([r.json(), v.json()]);
      if (!r.ok || j.success === false) throw new Error(j.message || "Failed to load report");
      if (!v.ok || vj.success === false) throw new Error(vj.message || "Failed to load BI variance");
      setData(j.data || null);
      setVariance(vj.data || null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message || "Failed to load reports");
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // Use the same workspace-scoped SSE stream as the main dashboard. A short debounce
  // collapses bursts (for example, one sale emitting order + inventory events) to one fetch.
  useEffect(() => {
    let stopped = false;
    let controller;
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        if (!stopped) load({ quiet: true });
      }, 220);
    };
    const connect = async () => {
      try {
        controller = new AbortController();
        const response = await apiFetch("/api/realtime/stream?replay=0", { signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`Realtime stream unavailable (${response.status})`);
        setLiveConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() || "";
          for (const frame of frames) {
            const line = frame.split("\n").find((part) => part.startsWith("data:"));
            if (!line) continue;
            try {
              const event = JSON.parse(line.slice(5).trim());
              if (EVENT_NAMES.has(String(event?.eventName || ""))) scheduleRefresh();
            } catch { /* Ignore heartbeats and malformed frames. */ }
          }
        }
      } catch (e) {
        if (!stopped && e?.name !== "AbortError") setLiveConnected(false);
      } finally {
        if (!stopped) setLiveConnected(false);
      }
    };
    connect();
    // Fallback for deployments where the SSE connection or in-memory publisher is unavailable.
    const fallback = setInterval(() => { if (!stopped) load({ quiet: true }); }, 15000);
    return () => {
      stopped = true;
      controller?.abort();
      clearInterval(fallback);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [["Metric", "Value"], ...Object.entries(data.kpis || {})];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `bizlift-operations-${days}d.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const surface = isDark ? "border-white/10 bg-white/[0.035]" : "border-black/10 bg-white/80";
  const axis = { fontSize: 11, fill: isDark ? "#a1a1aa" : "#71717a" };
  const tooltip = { backgroundColor: isDark ? "#111" : "#fff", border: isDark ? "1px solid rgba(255,255,255,.12)" : "1px solid #ddd", borderRadius: 12, color: isDark ? "#fff" : "#111" };
  const kpis = data?.kpis || {};
  const daily = Array.isArray(data?.daily) ? data.daily : [];
  const hourly = Array.isArray(data?.hourlyDemand) ? data.hourlyDemand : [];
  const categories = Array.isArray(data?.revenueByCategory) ? data.revenueByCategory : [];
  const topMenu = Array.isArray(data?.topMenu) ? data.topMenu : [];
  const waste = Array.isArray(data?.wasteByReason) ? data.wasteByReason : [];

  return <div className={`bizlift-advanced-page bizlift-analytics-page min-h-screen relative overflow-hidden ${isDark ? "bg-black text-white" : "bg-[#f5f5f0] text-black"}`}>
    <ExperienceLayer variant="analytics" />
    <div className="relative z-10 mx-auto max-w-7xl px-5 pt-6 md:px-6"><IntelligenceRibbon label="ANALYTICS ENGINE" value="Revenue · demand · waste · variance" /></div>
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-current/10 px-5 py-4 md:px-6">
      <div><h1 className="text-xl font-semibold tracking-tight">Operations Analytics</h1><p className="mt-1 text-xs opacity-60">Live operational performance · grounded in saved workspace data</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${surface}`} title={liveConnected ? "Realtime stream connected" : "Using automatic refresh fallback"}>
          {liveConnected ? <Radio size={14} className="text-[#9ad17b]" /> : <WifiOff size={14} className="opacity-50" />}
          {liveConnected ? "Live updates connected" : "Auto-refresh fallback"}
        </div>
        <select aria-label="Reporting period" value={days} onChange={(e) => setDays(Number(e.target.value))} className={`rounded-lg border px-3 py-2 text-sm ${surface}`}><option value="7">7 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select>
        <button onClick={() => load({ quiet: true })} disabled={refreshing} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${surface}`}><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh</button>
        <button onClick={exportCsv} disabled={!data} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${surface}`}><ArrowDownToLine size={14} /> Export</button>
        <button onClick={toggleTheme} className={`rounded-lg border px-3 py-2 text-sm ${surface}`} aria-label="Toggle theme">{isDark ? "☀" : "◐"}</button>
      </div>
    </header>
    <main className="relative z-10 mx-auto max-w-7xl space-y-6 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-60"><span>{lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for first data load"}</span><span>Changes from sales, inventory, waste and procurement trigger refreshes when events are received.</span></div>
      {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/5 p-4 text-sm text-red-400">{error}<button onClick={() => load()} className="ml-3 underline">Retry</button></div>}
      {loading && !data ? <div className={`rounded-2xl border p-10 text-center text-sm opacity-60 ${surface}`}>Loading operational analytics…</div> : data && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[["Revenue", money(kpis.revenue), "Completed sales"], ["Orders", Number(kpis.orders || 0).toLocaleString("en-IN"), "Recorded orders"], ["Average order", money(kpis.averageOrderValue), "Revenue per order"], ["Waste cost", money(kpis.wasteCost), "Recorded waste"], ["Procurement", money(kpis.procurementSpend), "Purchasing activity"], ["Inventory value", money(kpis.inventoryValue), "Current stock valuation"], ["Low stock", Number(kpis.lowStock || 0).toLocaleString("en-IN"), "Items needing attention"], ["Cancelled", Number(kpis.cancelled || 0).toLocaleString("en-IN"), "Cancelled orders"]].map(([label, value, hint]) => <div key={label} className={`bizlift-kpi-card rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${surface}`}><div className="text-xs opacity-60">{label}</div><div className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">{value}</div><div className="mt-1 text-[11px] opacity-45">{hint}</div></div>)}
        </div>
        <section className={`bizlift-feature-card rounded-2xl border p-4 md:p-5 ${surface}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Revenue momentum</h2><p className="mt-1 text-xs opacity-60">Daily recorded revenue across the selected operating window</p></div><span className="rounded-full border border-current/10 px-3 py-1 text-xs opacity-70">Last {days} days</span></div>
          <div className="mt-5 h-[300px]">{daily.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={daily} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}><defs><linearGradient id="reportRevenueLive" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9ad17b" stopOpacity=".48"/><stop offset="100%" stopColor="#9ad17b" stopOpacity=".015"/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke={isDark ? "rgba(255,255,255,.08)" : "#e4e4e7"}/><XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} minTickGap={18}/><YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} width={44}/><Tooltip contentStyle={tooltip} formatter={(value) => [money(value), "Revenue"]}/><Area type="monotone" dataKey="revenue" stroke="#9ad17b" fill="url(#reportRevenueLive)" strokeWidth={2.5} activeDot={{ r: 5, strokeWidth: 0 }} animationDuration={450}/></AreaChart></ResponsiveContainer> : <EmptyChart message="No sales have been recorded in this reporting window" />}</div>
        </section>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className={`bizlift-feature-card rounded-2xl border p-4 md:p-5 ${surface}`}><h2 className="font-semibold">Demand by hour</h2><p className="mt-1 text-xs opacity-60">Order activity by time of day</p><div className="mt-4 h-[270px]">{hourly.some((x) => Number(x.orders) > 0) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke={isDark ? "rgba(255,255,255,.08)" : "#e4e4e7"}/><XAxis dataKey="hour" tick={axis} tickLine={false} axisLine={false}/><YAxis tick={axis} tickLine={false} axisLine={false}/><Tooltip contentStyle={tooltip}/><Bar dataKey="orders" name="Orders" fill="#9ad17b" radius={[6,6,0,0]} maxBarSize={32} animationDuration={450}/></BarChart></ResponsiveContainer> : <EmptyChart message="Hourly demand will appear after orders are recorded" />}</div></section>
          <section className={`bizlift-feature-card rounded-2xl border p-4 md:p-5 ${surface}`}><h2 className="font-semibold">Revenue by category</h2><p className="mt-1 text-xs opacity-60">Categories contributing to recorded sales</p><div className="mt-4 h-[270px]">{categories.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={categories} layout="vertical" margin={{ top: 4, right: 10, left: 6, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" horizontal={false} stroke={isDark ? "rgba(255,255,255,.08)" : "#e4e4e7"}/><XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}/><YAxis type="category" dataKey="category" width={96} tick={axis} tickLine={false} axisLine={false}/><Tooltip contentStyle={tooltip} formatter={(value) => [money(value), "Revenue"]}/><Bar dataKey="revenue" fill="#9ad17b" radius={[0,6,6,0]} maxBarSize={26} animationDuration={450}/></BarChart></ResponsiveContainer> : <EmptyChart message="Sales categories will appear when items are sold" />}</div></section>
        </div>
        <section className={`bizlift-feature-card rounded-2xl border p-4 md:p-5 ${surface}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Plan vs actual variance</h2><p className="mt-1 text-xs opacity-60">Comparison for revenue, procurement and waste</p></div><span className="rounded-full border border-current/10 px-3 py-1 text-xs">{variance?.periodDays || days} days</span></div>
          {variance?.rows?.length ? <><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">{variance.rows.map((x) => <div key={x.metric} className="bizlift-interactive-card rounded-xl border border-current/10 p-4"><div className="text-xs opacity-60">{x.metric}</div><div className="mt-2 text-lg font-semibold">{money(x.actual)}</div><div className="mt-1 text-xs opacity-60">Plan {money(x.plan)}</div><div className={`mt-2 text-xs font-semibold ${x.status === "Favorable" ? "text-[#9ad17b]" : "text-red-400"}`}>{x.status} · {x.variance >= 0 ? "+" : ""}{money(x.variance)} ({x.variancePct === null ? "—" : `${x.variancePct}%`})</div></div>)}</div><div className="mt-4 text-xs opacity-50">Reconciled from {variance.reconciliation?.salesRecords ?? 0} sales, {variance.reconciliation?.procurementRecords ?? 0} procurement records and {variance.reconciliation?.wasteRecords ?? 0} waste records. {variance.baselineNote}</div></> : <p className="mt-4 text-sm opacity-55">Variance analysis will appear when there is sufficient operational data.</p>}
        </section>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className={`bizlift-feature-card rounded-2xl border p-4 md:p-5 ${surface}`}><h2 className="font-semibold">Top menu items</h2><p className="mt-1 text-xs opacity-60">Ranked by units sold in the selected period</p>{topMenu.length ? <div className="mt-4 space-y-3">{topMenu.slice(0, 8).map((item, index) => <div key={item.menuItem} className="space-y-1.5"><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate"><span className="mr-2 text-xs opacity-40">{String(index + 1).padStart(2, "0")}</span>{item.menuItem}</span><span className="shrink-0 tabular-nums">{Number(item.units || 0).toLocaleString("en-IN")} units</span></div><div className="h-1.5 overflow-hidden rounded-full bg-current/10"><div className="h-full rounded-full bg-[#9ad17b] transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, Number(item.units || 0) / Math.max(1, Number(topMenu[0]?.units || 1)) * 100))}%` }}/></div></div>)}</div> : <div className="mt-4"><EmptyChart message="Best sellers are ranked once real menu sales exist" /></div>}</section>
          <section className={`bizlift-feature-card rounded-2xl border p-4 md:p-5 ${surface}`}><h2 className="font-semibold">Waste by reason</h2><p className="mt-1 text-xs opacity-60">Recorded waste cost grouped by reason</p>{waste.length ? <div className="mt-4 space-y-3">{waste.map((item) => <div key={item.reason} className="flex items-center justify-between gap-3 border-b border-current/10 py-2 text-sm"><span>{item.reason}</span><span className="font-medium tabular-nums">{money(item.cost)}</span></div>)}</div> : <div className="mt-4"><EmptyChart message="Waste breakdown appears when waste is recorded" /></div>}</section>
        </div>
      </>}
      <footer className="flex items-center justify-between gap-3 border-t border-current/10 pt-4 text-[11px] opacity-45"><span>BizLift analytics · workspace-scoped</span><span className="flex items-center gap-1"><Activity size={12}/> {refreshing ? "Syncing latest records…" : "Auto-sync enabled"}</span></footer>
    </main>
  </div>;
};
export default ReportsPage;
