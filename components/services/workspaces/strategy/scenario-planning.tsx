"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Anchor, Banknote, Factory as FactoryIcon, Flame, FolderOpen, Landmark, Loader2, Save, Shirt, Sparkles, Trash2, TrendingUp, Zap } from "lucide-react";
import { AIInsight, CHART_COLORS, KpiTile, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input } from "@/components/ui";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
import { Segmented, useSimulatedAI } from "./_shared";
import { BASE_YEAR, egpM, getStrategyInvestment, profileOf, type Sector, type StrategyProfile } from "./_seeds";

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------

interface Sliders { demand: number; material: number; fx: number; exportShare: number; energy: number }
type ShockId = "cbam" | "cotton" | "steel" | "port" | "energy-reform";
interface SavedScenario { id: string; name: string; sliders: Sliders; shocks: ShockId[] }
interface ScenarioData { version: 1; sliders: Sliders; shocks: ShockId[]; saved: SavedScenario[] }

const SLIDERS: { key: keyof Sliders; label: string; min: number; max: number; step: number; unit: string; hint: string; icon: typeof TrendingUp }[] = [
  { key: "demand", label: "Demand growth", min: -10, max: 20, step: 1, unit: "% / yr", hint: "Annual volume growth across markets", icon: TrendingUp },
  { key: "material", label: "Raw-material cost change", min: -15, max: 40, step: 1, unit: "% by Y5", hint: "Cumulative change in input prices", icon: FactoryIcon },
  { key: "fx", label: "EGP/USD exchange-rate change", min: -10, max: 50, step: 1, unit: "% by Y5", hint: "Positive = weaker EGP (exports worth more, imports cost more)", icon: Banknote },
  { key: "exportShare", label: "Export share by Y5", min: 0, max: 60, step: 1, unit: "% of sales", hint: "Target share of revenue from exports", icon: Anchor },
  { key: "energy", label: "Energy cost change", min: -10, max: 80, step: 1, unit: "% by Y5", hint: "Electricity and gas tariff change", icon: Zap },
];

const SHOCKS: { id: ShockId; title: string; detail: string; icon: typeof Flame }[] = [
  { id: "cbam", title: "EU CBAM reporting", detail: "Carbon-reporting and certificate costs on steel-based exports to the EU; slower export ramp-up for unprepared suppliers.", icon: Landmark },
  { id: "cotton", title: "Cotton price shock", detail: "Global cotton and yarn prices jump ~25% for two seasons.", icon: Shirt },
  { id: "steel", title: "Steel & casting price spike", detail: "Scrap and pig-iron prices rise sharply; castings suppliers pass costs on.", icon: Flame },
  { id: "port", title: "Port congestion", detail: "Red Sea / Mediterranean routing disruption delays exports and raises freight costs for 18 months.", icon: Anchor },
  { id: "energy-reform", title: "Energy subsidy reform", detail: "Accelerated removal of industrial energy subsidies raises tariffs.", icon: Zap },
];

const SCENARIOS = [
  { id: "optimistic", label: "Optimistic", color: CHART_COLORS[0], dg: 3, mat: -4, energy: -5 },
  { id: "baseline", label: "Baseline", color: CHART_COLORS[1], dg: 0, mat: 0, energy: 0 },
  { id: "pessimistic", label: "Pessimistic", color: CHART_COLORS[5], dg: -5, mat: 8, energy: 10 },
] as const;
type ScenarioId = (typeof SCENARIOS)[number]["id"];

type Metric = "revenue" | "grossMargin" | "ebitda" | "capacity";
const METRICS: { id: Metric; label: string; unit: "M" | "%" }[] = [
  { id: "revenue", label: "Revenue", unit: "M" },
  { id: "grossMargin", label: "Gross margin", unit: "%" },
  { id: "ebitda", label: "EBITDA", unit: "M" },
  { id: "capacity", label: "Investment capacity", unit: "M" },
];

function defaultSliders(factory: Factory, p: StrategyProfile): Sliders {
  const key = seedKeyFor(factory);
  if (key === "al-noor") return { demand: 8, material: 6, fx: 10, exportShare: 12, energy: 15 };
  if (key === "delta") return { demand: 6, material: 4, fx: 8, exportShare: 32, energy: 12 };
  return { demand: 7, material: 5, fx: 8, exportShare: Math.min(60, Math.round(p.exportShare * 100) + 8), energy: 12 };
}

function seed(factory: Factory, p: StrategyProfile): ScenarioData {
  const s = defaultSliders(factory, p);
  const key = seedKeyFor(factory);
  const downside: ShockId[] = key === "delta" ? ["steel", "cbam"] : key === "al-noor" ? ["cotton", "energy-reform"] : ["energy-reform", "port"];
  return {
    version: 1,
    sliders: s,
    shocks: [],
    saved: [
      { id: "sv-board", name: "Board plan (baseline)", sliders: s, shocks: [] },
      { id: "sv-downside", name: "Stress test — input & energy shock", sliders: { ...s, demand: Math.max(-10, s.demand - 4) }, shocks: downside },
    ],
  };
}

// ---------------------------------------------------------------------------------------------
// Model (illustrative)
// ---------------------------------------------------------------------------------------------

const COSTS: Record<Sector, { mat: number; energy: number; labour: number; overhead: number; importShare: number }> = {
  textile: { mat: 0.52, energy: 0.07, labour: 0.16, overhead: 0.12, importShare: 0.35 },
  engineering: { mat: 0.47, energy: 0.09, labour: 0.14, overhead: 0.15, importShare: 0.55 },
  food: { mat: 0.55, energy: 0.06, labour: 0.12, overhead: 0.14, importShare: 0.3 },
  process: { mat: 0.5, energy: 0.1, labour: 0.11, overhead: 0.15, importShare: 0.5 },
  general: { mat: 0.5, energy: 0.07, labour: 0.15, overhead: 0.14, importShare: 0.4 },
};

interface YearPoint { year: number; revenue: number; grossMargin: number; ebitda: number; capacity: number }

function project(p: StrategyProfile, s: Sliders, shocks: ShockId[], sc: (typeof SCENARIOS)[number]): YearPoint[] {
  const c = COSTS[p.sector];
  const has = (id: ShockId) => shocks.includes(id);
  const textile = p.sector === "textile";
  const steel = p.sector === "engineering";
  let matShock = 0;
  if (has("cotton")) matShock += textile ? 22 : 4;
  if (has("steel")) matShock += steel ? 20 : 5;
  const energyShock = has("energy-reform") ? 40 : 0;
  const exportTarget = Math.max(0, s.exportShare - (has("cbam") ? (steel ? 6 : 2) : 0) - (has("port") ? 3 : 0)) / 100;
  const g = (s.demand + sc.dg) / 100;
  const out: YearPoint[] = [];
  const R0 = p.revenueM;
  const base = { revenue: R0, gm: 1 - c.mat - c.energy - c.labour, ebitda: R0 * (1 - c.mat - c.energy - c.labour - c.overhead) };
  out.push({ year: BASE_YEAR, revenue: R0, grossMargin: base.gm * 100, ebitda: base.ebitda, capacity: Math.max(0, base.ebitda * 0.45) });
  let volume = 1;
  for (let t = 1; t <= 5; t++) {
    const ph = t / 5;
    volume *= 1 + g;
    const xs = p.exportShare + (exportTarget - p.exportShare) * ph;
    const fx = (s.fx / 100) * ph;
    const portHit = has("port") && t <= 2 ? 0.94 : 1;
    // Real volume at base prices drives input costs; revenue adds modest domestic pricing power and the FX effect on exports.
    const volRev = R0 * volume;
    const exportRev = volRev * xs * (1 + fx) * 1.04 * portHit;
    const domesticRev = volRev * (1 - xs) * Math.pow(1.015, t);
    const revenue = exportRev + domesticRev;
    const matChange = ((s.material + sc.mat) / 100) * ph + (matShock / 100) * (t <= 2 ? 1 : 0.5);
    const materials = volRev * c.mat * (1 + matChange) * (1 + c.importShare * fx);
    const energy = volRev * c.energy * (1 + ((s.energy + sc.energy + energyShock) / 100) * ph);
    const labour = R0 * c.labour * Math.pow(volume, 0.6) * Math.pow(1.025, t);
    const overhead = R0 * c.overhead * Math.pow(volume, 0.4) + revenue * 0.01;
    const extra = (has("cbam") && t >= 2 ? exportRev * (steel ? 0.015 : 0.004) : 0) + (has("port") && t <= 2 ? exportRev * 0.02 : 0);
    const gross = revenue - materials - energy - labour;
    const ebitda = gross - overhead - extra;
    out.push({ year: BASE_YEAR + t, revenue, grossMargin: (gross / revenue) * 100, ebitda, capacity: Math.max(0, ebitda * 0.45) });
  }
  return out;
}

const fmtM = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(1));

// ---------------------------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------------------------

export default function ScenarioPlanningWorkspace({ service }: WorkspaceProps) {
  const { tier: currentTier, id: factoryId, state } = useActiveFactory();
  const { factory, tier, data, setData, reset } = useServiceWorkspace<ScenarioData>(service.id, (f) => seed(f, profileOf(f, currentTier)));
  const profile = useMemo(() => profileOf(factory, tier), [factory, tier]);
  const strategyRaw = useJahez((s) => s.factories[factoryId]?.serviceData?.["corporate-strategy"]);
  const strategyLinked = strategyRaw !== undefined || state.installedServices.includes("corporate-strategy");
  const invest = useMemo(() => getStrategyInvestment(strategyRaw, factory, tier), [strategyRaw, factory, tier]);
  const [metric, setMetric] = useState<Metric>("ebitda");
  const [name, setName] = useState("");
  const [narrative, setNarrative] = useState<string | null>(null);
  const { busy, run } = useSimulatedAI();
  const reduce = useReducedMotion();
  const t = useT();
  const { isRtl } = useLocale();

  const projections = useMemo(() => Object.fromEntries(SCENARIOS.map((sc) => [sc.id, project(profile, data.sliders, data.shocks, sc)])) as Record<ScenarioId, YearPoint[]>, [profile, data.sliders, data.shocks]);
  const chartData = projections.baseline.map((pt, i) => ({ year: String(pt.year), optimistic: projections.optimistic[i][metric], baseline: pt[metric], pessimistic: projections.pessimistic[i][metric] }));
  const unit = METRICS.find((m) => m.id === metric)?.unit ?? "M";

  const cumCap = (id: ScenarioId, years = 5) => projections[id].slice(1, years + 1).reduce((s, p) => s + p.capacity, 0);
  const base5 = projections.baseline[5];
  const coverage = invest.totalMid > 0 ? cumCap("baseline", invest.horizon) / invest.totalMid : 0;
  const coveragePess = invest.totalMid > 0 ? cumCap("pessimistic", invest.horizon) / invest.totalMid : 0;

  const setSlider = (k: keyof Sliders, v: number) => {
    setNarrative(null);
    setData((d) => ({ ...d, sliders: { ...d.sliders, [k]: v } }));
  };
  const toggleShock = (id: ShockId) => {
    setNarrative(null);
    setData((d) => ({ ...d, shocks: d.shocks.includes(id) ? d.shocks.filter((x) => x !== id) : [...d.shocks, id] }));
  };
  const save = () => {
    const nm = name.trim() || t("Scenario {n}", { n: data.saved.length + 1 });
    setData((d) => ({ ...d, saved: [...d.saved, { id: `sv-${d.saved.length + 1}-${Object.values(d.sliders).join("")}${d.shocks.length}`, name: nm, sliders: d.sliders, shocks: d.shocks }] }));
    setName("");
    toast.success(t("Scenario saved"), { description: nm });
  };
  const load = (sv: SavedScenario) => {
    setNarrative(null);
    setData((d) => ({ ...d, sliders: sv.sliders, shocks: sv.shocks }));
    toast(t("Loaded “{name}”", { name: t(sv.name) }));
  };

  const interpret = () =>
    run("interpret", () => {
      const pess5 = projections.pessimistic[5];
      const margin = (base5.ebitda / base5.revenue) * 100;
      const sens = data.sliders.material >= 15 || data.shocks.includes("cotton") || data.shocks.includes("steel") ? "raw-material prices" : data.sliders.energy >= 30 || data.shocks.includes("energy-reform") ? "energy tariffs" : "demand growth";
      setNarrative(
        t("In the baseline, {name} reaches {revenue} revenue by {year} with an EBITDA margin of {margin}%.", { name: factory.name, revenue: egpM(base5.revenue), year: BASE_YEAR + 5, margin: margin.toFixed(1) }) + " " +
          t("The pessimistic case cuts year-5 EBITDA to {ebitda}, so the plan is most sensitive to {sens}.", { ebitda: egpM(Math.max(0, pess5.ebitda)), sens: t(sens) }) + " " +
          (coverage >= 1 ? t(coverage >= 1.5 ? "Internally generated investment capacity covers the strategy's indicative investment comfortably ({pct}%)." : "Internally generated investment capacity covers the strategy's indicative investment with limited headroom ({pct}%).", { pct: Math.round(coverage * 100) }) : t("Internal cash covers only {pct}% of the strategy's indicative investment — consider phasing or external finance.", { pct: Math.round(coverage * 100) })) + " " +
          (data.sliders.exportShare > profile.exportShare * 100 ? `${t("A weaker EGP improves export earnings, which partly hedges imported input costs.")} ` : "") +
          t("Suggested early-warning indicators: {indicator}, export order book, EGP/USD rate.", { indicator: t(sens === "raw-material prices" ? "monthly input-price index" : sens === "energy tariffs" ? "energy cost per unit" : "order intake vs plan") })
      );
    }, 1100);

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={t("Model outputs are illustrative projections, not forecasts. Risk scenarios are examples only.")}>
      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t("Revenue {year} · baseline", { year: BASE_YEAR + 5 })} value={egpM(base5.revenue)} delta={t("{pct}% CAGR", { pct: (((base5.revenue / profile.revenueM) ** (1 / 5) - 1) * 100).toFixed(1) })} tone={base5.revenue >= profile.revenueM ? "good" : "bad"} icon={<TrendingUp />} />
        <KpiTile label={t("EBITDA margin Y5")} value={`${((base5.ebitda / base5.revenue) * 100).toFixed(1)}%`} delta={`${egpM(Math.max(0, base5.ebitda))}`} tone={base5.ebitda > 0 ? "neutral" : "bad"} icon={<Banknote />} />
        <KpiTile label={t("Investment capacity (5 yrs)")} value={egpM(cumCap("baseline"))} hint={t("Pessimistic: {amount}", { amount: egpM(cumCap("pessimistic")) })} icon={<Landmark />} />
        <KpiTile
          label={t("Strategy funding coverage")}
          value={`${Math.round(coverage * 100)}%`}
          tone={coverage >= 1 ? "good" : coverage >= 0.7 ? "warn" : "bad"}
          delta={t("{pct}% pess.", { pct: Math.round(coveragePess * 100) })}
          hint={<Link href="/services/corporate-strategy" className="text-teal-700 hover:underline">{strategyLinked ? t("vs {amount} strategy plan", { amount: egpM(invest.totalMid) }) : t("vs AI-suggested plan ({amount})", { amount: egpM(invest.totalMid) })}</Link>}
          icon={<Sparkles />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Assumptions */}
        <Panel title={t("Assumptions")} description={t("Drag to stress-test the plan — projections update live.")} className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-5">
            {SLIDERS.map((sl) => {
              const v = data.sliders[sl.key];
              const pct = ((v - sl.min) / (sl.max - sl.min)) * 100;
              return (
                <div key={sl.key}>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`sl-${sl.key}`} className="flex items-center gap-1.5 text-[13px] font-medium text-navy-900"><sl.icon className="size-3.5 text-teal-600" aria-hidden /> {t(sl.label)}</label>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", v > 0 && sl.key !== "exportShare" ? "bg-navy-900/5 text-navy-900" : "bg-teal-50 text-teal-700")}>{v > 0 && sl.key !== "exportShare" ? "+" : ""}{v}%</span>
                  </div>
                  <input
                    id={`sl-${sl.key}`}
                    type="range"
                    min={sl.min}
                    max={sl.max}
                    step={sl.step}
                    value={v}
                    onChange={(e) => setSlider(sl.key, Number(e.target.value))}
                    aria-valuetext={`${v} ${t(sl.unit)}`}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-teal-500"
                    style={{ background: `linear-gradient(to ${isRtl ? "left" : "right"}, #0FA396 ${pct}%, #E5E8EE ${pct}%)` }}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{t(sl.hint)}</span><span className="shrink-0 ps-2">{t(sl.unit)}</span></div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Name this scenario")} aria-label={t("Scenario name")} className="h-9" onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
              <Button size="sm" className="h-9" onClick={save}><Save /> {t("Save")}</Button>
            </div>
          </div>
        </Panel>

        <div className="min-w-0 space-y-6">
          <Panel
            title={t("Five-year projection")}
            description={`${profile.name} · ${t(unit === "M" ? "EGP millions" : "EGP — percent")} · ${data.shocks.length ? t(data.shocks.length > 1 ? "{count} shocks applied" : "{count} shock applied", { count: data.shocks.length }) : t("no shocks applied")}`}
            actions={<StatusPill tone="warn">{t("Illustrative")}</StatusPill>}
          >
            <Segmented label={t("Projection metric")} value={metric} onChange={setMetric} options={METRICS.map((m) => ({ value: m.id, label: t(m.label) }))} className="max-w-full flex-wrap" size="xs" />
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sp-base" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E8EE" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => (unit === "%" ? `${Math.round(v)}%` : fmtM(v))} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? (unit === "%" ? `${v.toFixed(1)}%` : `EGP ${fmtM(v)}M`) : String(v))} contentStyle={{ borderRadius: 12, border: "1px solid #E5E8EE", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                  <Area type="monotone" dataKey="baseline" name={t("Baseline")} stroke={CHART_COLORS[1]} strokeWidth={2.5} fill="url(#sp-base)" isAnimationActive={!reduce} />
                  <Line type="monotone" dataKey="optimistic" name={t("Optimistic")} stroke={CHART_COLORS[0]} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduce} />
                  <Line type="monotone" dataKey="pessimistic" name={t("Pessimistic")} stroke={CHART_COLORS[5]} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduce} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={t("Scenario comparison")} description={t("Year {year} outcomes", { year: BASE_YEAR + 5 })} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="border-b border-line text-start text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-2.5 text-start font-semibold">{t("Metric")}</th>
                    {SCENARIOS.map((sc) => <th key={sc.id} className="px-3 py-2.5 text-end font-semibold"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: sc.color }} />{t(sc.label)}</span></th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {[
                    { label: "Revenue (EGP M)", get: (id: ScenarioId) => fmtM(projections[id][5].revenue) },
                    { label: "Revenue CAGR", get: (id: ScenarioId) => `${(((projections[id][5].revenue / profile.revenueM) ** 0.2 - 1) * 100).toFixed(1)}%` },
                    { label: "Gross margin", get: (id: ScenarioId) => `${projections[id][5].grossMargin.toFixed(1)}%` },
                    { label: "EBITDA (EGP M)", get: (id: ScenarioId) => fmtM(projections[id][5].ebitda) },
                    { label: "EBITDA margin", get: (id: ScenarioId) => `${((projections[id][5].ebitda / projections[id][5].revenue) * 100).toFixed(1)}%` },
                    { label: "Cumulative investment capacity", get: (id: ScenarioId) => fmtM(cumCap(id)) },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="px-5 py-2.5 text-navy-800">{t(row.label)}</td>
                      {SCENARIOS.map((sc) => <td key={sc.id} className={cn("px-3 py-2.5 text-end", sc.id === "baseline" ? "font-semibold text-navy-900" : "text-navy-700")}>{row.get(sc.id)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      {/* Shock cards */}
      <section className="mt-8" aria-labelledby="sp-shocks">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="sp-shocks" className="text-sm font-semibold text-navy-900">{t("Regulatory & market shock scenarios")}</h3>
            <p className="text-xs text-muted">{t("Toggle a shock to layer it onto all three scenarios. Examples only — impacts are simplified assumptions.")}</p>
          </div>
          {data.shocks.length ? <Button variant="ghost" size="sm" onClick={() => setData((d) => ({ ...d, shocks: [] }))}>{t("Clear shocks")}</Button> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {SHOCKS.map((sh) => {
            const on = data.shocks.includes(sh.id);
            const relevant = (sh.id === "cotton" && profile.sector === "textile") || (sh.id === "steel" && profile.sector === "engineering") || (sh.id === "cbam" && profile.sector === "engineering");
            return (
              <button
                key={sh.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleShock(sh.id)}
                className={cn(
                  "group relative flex flex-col rounded-2xl border p-4 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                  on ? "border-red-300 bg-red-50/60 shadow-card" : "border-line bg-white hover:border-navy-500/30 hover:shadow-card"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("grid size-8 place-items-center rounded-lg", on ? "bg-red-100 text-red-700" : "bg-canvas text-navy-700")}><sh.icon className="size-4" aria-hidden /></span>
                  <span className={cn("relative h-5 w-9 rounded-full transition", on ? "bg-red-500" : "bg-navy-900/15")} aria-hidden>
                    <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", on ? "start-[18px]" : "start-0.5")} />
                  </span>
                </div>
                <div className="mt-3 text-sm font-semibold text-navy-900">{t(sh.title)}</div>
                <p className="mt-1 flex-1 text-xs text-muted">{t(sh.detail)}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <StatusPill tone="warn">{t("Illustrative")}</StatusPill>
                  {relevant ? <StatusPill tone="bad">{t("High relevance")}</StatusPill> : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={t("Saved scenarios")} description={t("Stored with this factory's workspace.")} bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {data.saved.map((sv) => {
              const pts = project(profile, sv.sliders, sv.shocks, SCENARIOS[1]);
              const y5 = pts[5];
              return (
                <li key={sv.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-navy-900">{t(sv.name)}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {t("Demand")} {sv.sliders.demand > 0 ? "+" : ""}{sv.sliders.demand}{t("%/yr")} · {t("Materials")} {sv.sliders.material > 0 ? "+" : ""}{sv.sliders.material}% · {t("FX")} {sv.sliders.fx > 0 ? "+" : ""}{sv.sliders.fx}% · {t("Export")} {sv.sliders.exportShare}%{sv.shocks.length ? ` · ${t(sv.shocks.length > 1 ? "{count} shocks" : "{count} shock", { count: sv.shocks.length })}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-end tabular-nums">
                    <div><div className="text-[10px] uppercase tracking-wider text-muted">{t("Rev Y5")}</div><div className="text-sm font-semibold text-navy-900">{fmtM(y5.revenue)}</div></div>
                    <div><div className="text-[10px] uppercase tracking-wider text-muted">{t("EBITDA Y5")}</div><div className={cn("text-sm font-semibold", y5.ebitda < 0 ? "text-red-600" : "text-navy-900")}>{fmtM(y5.ebitda)}</div></div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => load(sv)} aria-label={t("Load {name}", { name: t(sv.name) })}><FolderOpen /> {t("Load")}</Button>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setData((d) => ({ ...d, saved: d.saved.filter((x) => x.id !== sv.id) }))} aria-label={t("Delete {name}", { name: t(sv.name) })}><Trash2 /></Button>
                    </div>
                  </div>
                </li>
              );
            })}
            {!data.saved.length ? <li className="px-5 py-6 text-center text-sm text-muted">{t("No saved scenarios yet — adjust the assumptions and save one.")}</li> : null}
          </ul>
        </Panel>

        <div className="space-y-3">
          <AIInsight title={t("Foresight briefing")}>
            <AnimatePresence mode="wait" initial={false}>
              {busy === "interpret" ? (
                <motion.p key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-teal-700" role="status"><Loader2 className="size-4 animate-spin" /> {t("Foresight Agent is reading the model…")}</motion.p>
              ) : narrative ? (
                <motion.p key="n" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{narrative}</motion.p>
              ) : (
                <motion.p key="e" initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-muted">{t("Generate a plain-language briefing of the current assumptions, sensitivities and suggested early-warning indicators.")}</motion.p>
              )}
            </AnimatePresence>
            <Button variant="accent" size="sm" className="mt-3" onClick={interpret} disabled={busy === "interpret"}><Sparkles /> {t(narrative ? "Refresh briefing" : "Interpret scenarios")}</Button>
          </AIInsight>
          <p className="px-1 text-xs text-muted">
            {t("Linked to")} <Link href="/services/corporate-strategy" className="font-medium text-teal-700 hover:underline">{t("Corporate & Digital Strategy")}</Link> — {t("funding coverage compares cumulative investment capacity over the {count}-year strategy horizon with its indicative investment plan", { count: invest.horizon })}{strategyLinked ? "" : ` ${t("(AI-suggested until the strategy workspace is developed)")}`}.
          </p>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
