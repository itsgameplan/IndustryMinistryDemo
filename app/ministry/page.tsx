"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig, animate, motion, useReducedMotion } from "motion/react";
import { Activity, Building2, Factory, Filter, Gauge, Layers, Leaf, MapPinned, Radio, RotateCcw, Ship, Sparkles, Users, Zap } from "lucide-react";
import { Card, DemoDisclaimer } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { PublicHeader } from "@/components/ministry/public-header";
import { EgyptMap, scoreColor } from "@/components/ministry/egypt-map";
import { AdoptionTrendChart, ExportPipeline, SectorTierHeatTable, TierDistributionChart } from "@/components/ministry/charts";
import { FeaturedFactoriesTable, InsightCard } from "@/components/ministry/featured-factories";
import { resolveView, useLiveCompleted } from "@/components/ministry/verification-certificate";
import {
  BASE_CUBE, GOVERNORATES, INSIGHTS, REGISTRY, SECTORS,
  aggregate, byGovernorate, bySector, exportPipeline, filterCube, governorateById, impactEstimate, sectorById, trendSeries, withLiveFactories,
  type NationalFilter, type SectorId,
} from "@/lib/data/national";
import { computeTier, useHydrated, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FactoryId, TierLevel } from "@/lib/types";

type RankMetric = "onboarded" | "maturity" | "advanced";
const ALL: NationalFilter = { sector: "all", governorate: "all" };

export default function MinistryPage() {
  const hydrated = useHydrated();
  const live = useLiveCompleted();
  const deployments = useJahez((s) => s.deployments);
  const [filter, setFilter] = useState<NationalFilter>(ALL);
  const [metric, setMetric] = useState<RankMetric>("onboarded");

  const liveTiers = useMemo<Record<FactoryId, TierLevel>>(() => ({ "al-noor": computeTier(live["al-noor"]), delta: computeTier(live.delta) }), [live]);
  const cube = useMemo(() => withLiveFactories(BASE_CUBE, liveTiers), [liveTiers]);
  const filtered = useMemo(() => filterCube(cube, filter), [cube, filter]);
  const agg = useMemo(() => aggregate(filtered), [filtered]);
  const trend = useMemo(() => trendSeries(agg), [agg]);
  const sectorRows = useMemo(() => bySector(filterCube(cube, { sector: "all", governorate: filter.governorate })), [cube, filter.governorate]);
  const govRows = useMemo(() => byGovernorate(filterCube(cube, { sector: filter.sector, governorate: "all" })), [cube, filter.sector]);
  const pipeline = useMemo(() => exportPipeline(agg.tiers), [agg]);
  const impact = useMemo(() => impactEstimate(filtered), [filtered]);

  const views = useMemo(
    () => REGISTRY.map((r) => resolveView(r, live))
      .filter((v) => (filter.sector === "all" || v.record.sector === filter.sector) && (filter.governorate === "all" || v.record.governorateId === filter.governorate))
      .sort((a, b) => Number(Boolean(b.record.live)) - Number(Boolean(a.record.live)) || b.score - a.score),
    [live, filter]
  );

  const liveDeployments = hydrated ? Object.values(deployments).filter((d) => d.status === "completed").length : 0;
  const thisMonth = trend[trend.length - 1];
  const lastMonth = trend[trend.length - 2];
  const solutionsThisMonth = thisMonth.solutions + liveDeployments;
  const solutionsGrowth = lastMonth.solutions ? ((thisMonth.solutions - lastMonth.solutions) / lastMonth.solutions) * 100 : 0;
  const newThisMonth = thisMonth.onboarded - lastMonth.onboarded;

  const filterActive = filter.sector !== "all" || filter.governorate !== "all";
  const scopeLabel = [filter.governorate !== "all" ? governorateById(filter.governorate)?.name : null, filter.sector !== "all" ? sectorById(filter.sector).name : null].filter(Boolean).join(" · ") || "All Egypt · all sectors";

  const ranked = useMemo(() => {
    const value = (r: (typeof govRows)[number]) => (metric === "onboarded" ? r.total : metric === "maturity" ? r.avgScore : r.tier3PlusPct);
    return [...govRows].sort((a, b) => value(b) - value(a)).map((r) => ({ ...r, value: value(r) }));
  }, [govRows, metric]);
  const rankMax = Math.max(1, ...ranked.map((r) => r.value));

  const toggleGov = (id: string) => setFilter((f) => ({ ...f, governorate: f.governorate === id ? "all" : id }));
  const toggleSector = (id: SectorId) => setFilter((f) => ({ ...f, sector: f.sector === id ? "all" : id }));

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas">
        <PublicHeader current="ministry" context="Transformation Observatory (demo)" />

        {/* Hero */}
        <section className="bg-grid-dark relative overflow-hidden bg-navy-950 text-white">
          <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-teal-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-48 left-1/4 size-[420px] rounded-full bg-gold-500/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-12">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">Ministry of Industry — Transformation Observatory · demo concept</div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-[40px] md:leading-[1.1]">National factory digital transformation</h1>
                <p className="mt-3 max-w-2xl text-[15px] text-white/65">
                  A command view of how Egyptian factories progress through the Jahez maturity tiers — by governorate, sector and month. Al Noor Textiles and Delta Precision are linked live to this demo session.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs backdrop-blur">
                <span className="flex items-center gap-2 font-semibold uppercase tracking-wider text-white/50"><Radio className="size-3.5 text-teal-300" /> Live demo factories</span>
                <LiveFactoryChip name="Al Noor Textiles" tier={liveTiers["al-noor"]} />
                <LiveFactoryChip name="Delta Precision" tier={liveTiers.delta} />
              </div>
            </motion.div>
            <DemoDisclaimer className="mt-6 border-gold-300/30 bg-gold-500/10 text-gold-300">
              SAMPLE — all statistics are simulated, fictional data generated for demonstration. Not an official Ministry of Industry publication; implies no official endorsement.
            </DemoDisclaimer>
          </div>
        </section>

        {/* Filters */}
        <div className="sticky top-16 z-30 border-b border-line bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
            <span className="mr-1 hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted sm:flex"><Filter className="size-3.5" /> Filters</span>
            <FilterSelect label="Sector" value={filter.sector} onChange={(v) => setFilter((f) => ({ ...f, sector: v as SectorId | "all" }))} options={[{ value: "all", label: "All sectors" }, ...SECTORS.map((s) => ({ value: s.id, label: s.name }))]} />
            <FilterSelect label="Governorate" value={filter.governorate} onChange={(v) => setFilter((f) => ({ ...f, governorate: v }))} options={[{ value: "all", label: "All governorates" }, ...[...GOVERNORATES].sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({ value: g.id, label: g.name }))]} />
            {filterActive ? (
              <button type="button" onClick={() => setFilter(ALL)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-navy-600 transition hover:bg-navy-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                <RotateCcw className="size-3.5" /> Clear
              </button>
            ) : null}
            <span className="ml-auto truncate text-xs text-muted">Scope: <span className="font-medium text-navy-900">{scopeLabel}</span></span>
          </div>
        </div>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8">
          {/* KPI band */}
          <section aria-label="Key indicators" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi index={0} icon={<Factory />} label="Factories onboarded" value={agg.total} hint={`+${newThisMonth.toLocaleString("en-US")} this month`} />
            <Kpi index={1} icon={<Gauge />} label="Average maturity score" value={agg.avgScore} digits={1} suffix="/100" hint={<ScoreBar score={agg.avgScore} />} />
            <Kpi index={2} icon={<Layers />} label="Tier 3+ (connected & above)" value={agg.tier3PlusPct} digits={1} suffix="%" hint={`${(agg.tiers[3] + agg.tiers[4]).toLocaleString("en-US")} factories`} />
            <Kpi index={3} icon={<Sparkles />} label="AI solutions deployed · Nov" value={solutionsThisMonth} hint={`${solutionsGrowth >= 0 ? "▲" : "▼"} ${Math.abs(solutionsGrowth).toFixed(1)}% vs Oct${liveDeployments ? ` · incl. ${liveDeployments} from live demo` : ""}`} accent />
          </section>

          {/* Distribution + trend */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Panel className="lg:col-span-5" title="Tier distribution" description="Factories at each Jahez maturity tier" icon={<Layers />}>
              <TierDistributionChart agg={agg} />
            </Panel>
            <Panel
              className="lg:col-span-7"
              title="Adoption trend"
              description="Cumulative factories onboarded vs. reaching Tier 3+ — last 18 months"
              icon={<Activity />}
              action={
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <LegendDot color="#0FA396" label="Onboarded" />
                  <LegendDot color="#C9A24B" label="Tier 3+" />
                </div>
              }
            >
              <AdoptionTrendChart data={trend} />
            </Panel>
          </div>

          {/* Map + ranking */}
          <Panel title="Governorate view" description="Click a governorate on the map or in the ranking to focus every chart on it" icon={<MapPinned />}>
            <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
              <EgyptMap data={govRows} selected={filter.governorate} onSelect={toggleGov} />
              <div className="flex min-w-0 flex-col">
                <div role="radiogroup" aria-label="Rank governorates by" className="inline-flex self-start rounded-xl bg-navy-900/[0.05] p-1">
                  {([["onboarded", "Onboarded"], ["maturity", "Avg score"], ["advanced", "Tier 3+ %"]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={metric === id}
                      onClick={() => setMetric(id)}
                      className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", metric === id ? "bg-white text-navy-900 shadow-sm" : "text-navy-600 hover:text-navy-900")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <ol className="scrollbar-thin mt-3 max-h-[380px] space-y-1 overflow-y-auto pr-1">
                  {ranked.map((r, i) => {
                    const sel = filter.governorate === r.governorate.id;
                    return (
                      <motion.li key={r.governorate.id} layout transition={{ duration: 0.3 }}>
                        <button
                          type="button"
                          onClick={() => toggleGov(r.governorate.id)}
                          aria-pressed={sel}
                          className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", sel && "bg-gold-50 ring-1 ring-gold-300")}
                        >
                          <span className="w-5 text-right text-[11px] font-semibold tabular-nums text-muted">{i + 1}</span>
                          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: scoreColor(r.avgScore) }} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-sm font-medium text-navy-900">{r.governorate.name} <span className="font-arabic text-xs font-normal text-muted" lang="ar">{r.governorate.nameAr}</span></span>
                              <span className="shrink-0 text-xs font-semibold tabular-nums text-navy-900">
                                {metric === "onboarded" ? r.value.toLocaleString("en-US") : metric === "maturity" ? r.value.toFixed(1) : `${r.value.toFixed(1)}%`}
                              </span>
                            </span>
                            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-navy-900/[0.05]">
                              <span className="block h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-400 transition-[width] duration-500" style={{ width: `${(r.value / rankMax) * 100}%` }} />
                            </span>
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </Panel>

          {/* Sector heat-table + export/impact */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Panel
              className="lg:col-span-7"
              title="Sector × tier"
              description={`Factory counts, shaded by share within each sector${filter.governorate !== "all" ? ` · ${governorateById(filter.governorate)?.name}` : ""}. Click a sector to filter.`}
              icon={<Building2 />}
            >
              <SectorTierHeatTable rows={sectorRows} highlight={filter.sector} onSelect={toggleSector} />
            </Panel>
            <Panel className="lg:col-span-5" title="Export readiness pipeline" description="From connected factories to active exporters" icon={<Ship />}>
              <ExportPipeline stages={pipeline} />
              <div className="mt-5 border-t border-line pt-4">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted">Illustrative impact estimate</div>
                <div className="grid grid-cols-3 gap-2">
                  <ImpactTile icon={<Users />} value={compact(impact.jobs)} label="jobs in onboarded factories" />
                  <ImpactTile icon={<Zap />} value={`${impact.energyGwh.toFixed(0)} GWh`} label="est. annual energy saved" />
                  <ImpactTile icon={<Leaf />} value={`${compact(impact.co2Tonnes)} t`} label="CO₂e avoided / yr" />
                </div>
              </div>
            </Panel>
          </div>

          {/* Featured + insights */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Panel className="lg:col-span-8" title="Featured factories" description="Live demo factories update as solutions are deployed. Select a row to open its verification certificate." icon={<Factory />}>
              <FeaturedFactoriesTable views={views} />
            </Panel>
            <section aria-labelledby="insights-title" className="bg-grid-dark relative overflow-hidden rounded-2xl bg-navy-900 p-5 text-white shadow-lift lg:col-span-4">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-teal-400/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 shadow-sm"><Sparkles className="size-4" /></span>
                  <div>
                    <h2 id="insights-title" className="text-[15px] font-semibold tracking-tight">Jahez AI insights</h2>
                    <p className="text-[11px] text-white/50">Pre-generated sample analysis · illustrative</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {INSIGHTS.map((ins, i) => {
                    const target: NationalFilter = { ...ALL, ...ins.filter };
                    const active = target.sector === filter.sector && target.governorate === filter.governorate;
                    return <InsightCard key={ins.id} insight={ins} index={i} active={active} onApply={() => setFilter(active ? ALL : target)} />;
                  })}
                </ul>
              </div>
            </section>
          </div>

          <DemoDisclaimer>
            Simulated sample data for a product demonstration. Governorate positions, counts, tiers, trends and impact estimates are fictional and illustrative; they are not Ministry of Industry statistics and imply no official endorsement.
          </DemoDisclaimer>
        </main>
      </div>
    </MotionConfig>
  );
}

// ---------------------------------------------------------------------------

const compact = (n: number) => n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });

function LiveFactoryChip({ name, tier }: { name: string; tier: TierLevel }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/80">{name}</span>
      <motion.span key={tier} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <TierBadge tier={tier} size="sm" className="bg-white/90" />
      </motion.span>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border bg-white pl-3 pr-8 text-sm text-navy-900 transition focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:w-48",
          value !== "all" ? "border-gold-400 bg-gold-50/60" : "border-line"
        )}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

function Panel({ title, description, icon, action, children, className }: { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("min-w-0 p-5", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon ? <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600 [&_svg]:size-4">{icon}</span> : null}
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-navy-900">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Kpi({ icon, label, value, digits = 0, suffix, hint, accent, index }: { icon: React.ReactNode; label: string; value: number; digits?: number; suffix?: string; hint?: React.ReactNode; accent?: boolean; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={cn("relative overflow-hidden rounded-2xl border p-5 shadow-card", accent ? "border-navy-800 bg-navy-900 text-white" : "border-line bg-white")}
    >
      {accent ? <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-gold-400/20 blur-2xl" /> : null}
      <div className={cn("relative flex items-center justify-between text-xs font-medium", accent ? "text-white/60" : "text-muted")}>
        <span>{label}</span>
        <span className={cn("[&_svg]:size-4", accent ? "text-gold-300" : "text-teal-600")}>{icon}</span>
      </div>
      <div className={cn("relative mt-3 text-[32px] font-semibold leading-none tracking-tight tabular-nums", accent ? "text-white" : "text-navy-900")}>
        <AnimatedNumber value={value} digits={digits} />
        {suffix ? <span className={cn("ml-0.5 text-base font-medium", accent ? "text-white/50" : "text-muted")}>{suffix}</span> : null}
      </div>
      {hint ? <div className={cn("relative mt-2 text-xs", accent ? "text-white/60" : "text-muted")}>{hint}</div> : null}
    </motion.div>
  );
}

function AnimatedNumber({ value, digits = 0 }: { value: number; digits?: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    const controls = animate(current.current, value, {
      duration: reduce ? 0 : 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { current.current = v; setDisplay(v); },
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{display.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}</>;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-navy-900/[0.06]" aria-hidden>
      <span className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-gold-400 transition-[width] duration-700" style={{ width: `${score}%` }} />
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}

function ImpactTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <span className="text-teal-600 [&_svg]:size-4">{icon}</span>
      <div className="mt-1.5 text-sm font-semibold tabular-nums text-navy-900">{value}</div>
      <div className="text-[10px] leading-tight text-muted">{label}</div>
    </div>
  );
}
