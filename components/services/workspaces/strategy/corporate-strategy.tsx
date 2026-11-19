"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Check, CheckCircle2, Circle, Download, FileText, Lightbulb, Loader2, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { AIInsight, EditableText, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Card, Skeleton } from "@/components/ui";
import { useActiveFactory } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { BusinessObjective } from "@/lib/types";
import { useT, type TFunction } from "@/lib/i18n";
import { Segmented, useSeedT, useSimulatedAI } from "./_shared";
import {
  BASE_YEAR, PERSPECTIVES, SECTION_ORDER, egpM, genContext, genInvestments, genObjectives, genPriorities, genRisks, genRoadmap, genStrategyKpis, genVision,
  paceFor, perspectiveMeta, profileOf, seedStrategy, stanceFor, type InvestmentLine, type Level, type RoadmapYear, type SectionId, type StrategyData, type StrategyProfile,
} from "./_seeds";

const OBJECTIVE_LABELS: Record<BusinessObjective, string> = {
  "grow-local-sales": "Goal: grow local sales",
  "start-exporting": "Goal: start exporting",
  "grow-exports": "Goal: grow exports",
  "reduce-costs": "Goal: reduce costs",
  "improve-quality": "Goal: improve quality",
  certification: "Goal: certification",
  "digitalise-operations": "Goal: digitalise operations",
  "access-finance": "Goal: access finance",
};
const LEVELS: Level[] = ["Low", "Medium", "High"];
const levelTone = (l: Level) => (l === "High" ? "bad" : l === "Medium" ? "warn" : "good");
const YEAR_COLORS = ["#0FA396", "#38BDF8", "#6366F1", "#EC4899", "#C9A24B"];

function whyChips(id: SectionId, p: StrategyProfile, d: StrategyData, t: TFunction): string[] {
  const tierChip = t("Tier {tier} · {name}", { tier: p.tier, name: t(p.tierName) });
  const industry = t(p.industry);
  const goals = p.objectives.slice(0, 2).map((o) => t(OBJECTIVE_LABELS[o]));
  switch (id) {
    case "vision": return [tierChip, industry, ...goals.slice(0, 1)];
    case "context": return [industry, t("{count} staff", { count: p.employees }), t("{amount} revenue", { amount: egpM(p.revenueM) })];
    case "objectives": return [tierChip, ...goals, industry];
    case "priorities": return [t("Gap to Tier {tier} ({name})", { tier: p.nextTier, name: t(p.nextTierName) }), industry];
    case "roadmap": return [t("Pace: {pace}", { pace: t(d.roadmapPace) }), t("Starts at Tier {tier}", { tier: p.tier }), t("{count}-year horizon", { count: d.horizon })];
    case "investment": return [t("Scaled to {amount} revenue", { amount: egpM(p.revenueM) }), t("Stance: {stance}", { stance: t(d.investmentStance) }), tierChip];
    case "kpis": return [t("Feeds Balanced Scorecard (17)"), industry];
    case "risks": return [industry, t(p.exportsNow || p.objectives.some((o) => o.includes("export")) ? "Export exposure" : "Domestic focus"), t("EGP/USD sensitivity")];
  }
}

export default function CorporateStrategyWorkspace({ service }: WorkspaceProps) {
  const { tier: currentTier } = useActiveFactory();
  const { factory, tier, data, setData, reset } = useServiceWorkspace<StrategyData>(service.id, (f) => seedStrategy(f, currentTier));
  const profile = useMemo(() => profileOf(factory, tier), [factory, tier]);
  const { busy, run } = useSimulatedAI();
  const reduce = useReducedMotion();
  const t = useT();
  const st = useSeedT();
  const [active, setActive] = useState<SectionId>("vision");

  const approvedCount = SECTION_ORDER.filter((s) => data.status[s.id] === "approved").length;
  const horizon = data.horizon;
  const hKey = String(horizon) as "3" | "5";
  const endYear = BASE_YEAR + horizon;

  // Track which section is in view for the outline.
  useEffect(() => {
    const els = SECTION_ORDER.map((s) => document.getElementById(`cs-${s.id}`)).filter((e): e is HTMLElement => Boolean(e));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id.replace("cs-", "") as SectionId);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  const jump = (id: SectionId) => {
    setActive(id);
    document.getElementById(`cs-${id}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  /** Apply an edit; editing an approved section returns it to draft. */
  const edit = (id: SectionId, patch: (d: StrategyData) => Partial<StrategyData>) => setData((d) => ({ ...d, ...patch(d), status: { ...d.status, [id]: "draft" } }));
  const editYear = (year: number, fn: (r: RoadmapYear) => RoadmapYear) => edit("roadmap", (d) => ({ roadmap: { ...d.roadmap, [hKey]: d.roadmap[hKey].map((r) => (r.year === year ? fn(r) : r)) } }));

  const regenerate = (id: SectionId) =>
    run(
      id,
      () =>
        setData((d) => {
          const v = d.variants[id] + 1;
          let next: Partial<StrategyData>;
          switch (id) {
            case "vision": next = { vision: genVision(profile, v, d.horizon) }; break;
            case "context": next = { context: genContext(profile, v) }; break;
            case "objectives": next = { objectives: genObjectives(profile, v) }; break;
            case "priorities": next = { priorities: genPriorities(profile, v) }; break;
            case "roadmap": next = { roadmap: { "3": genRoadmap(profile, v, 3), "5": genRoadmap(profile, v, 5) }, roadmapPace: paceFor(v) }; break;
            case "investment": next = { investments: genInvestments(profile, v), investmentStance: stanceFor(v) }; break;
            case "kpis": next = { kpis: genStrategyKpis(profile, v) }; break;
            case "risks": next = { risks: genRisks(profile, v) }; break;
          }
          return { ...d, ...next, variants: { ...d.variants, [id]: v }, status: { ...d.status, [id]: "draft" } };
        }),
      700 + (id.length % 4) * 120
    );

  const toggleApprove = (id: SectionId) => setData((d) => ({ ...d, status: { ...d.status, [id]: d.status[id] === "approved" ? "draft" : "approved" } }));
  const approveAll = () => {
    setData((d) => ({ ...d, status: Object.fromEntries(SECTION_ORDER.map((s) => [s.id, "approved"])) as StrategyData["status"] }));
    toast.success(t("All sections approved"), { description: t("Objectives are now available to the Balanced Scorecard workspaces.") });
  };

  const sectionProps = (id: SectionId) => ({
    id,
    index: SECTION_ORDER.findIndex((s) => s.id === id) + 1,
    title: t(SECTION_ORDER.find((s) => s.id === id)?.label ?? id),
    status: data.status[id],
    chips: whyChips(id, profile, data, t),
    busy: busy === id,
    onRegenerate: () => regenerate(id),
    onApprove: () => toggleApprove(id),
  });

  const inHorizon = data.investments.filter((l) => l.year <= horizon);
  const beyond = data.investments.filter((l) => l.year > horizon);
  const totalMin = inHorizon.reduce((s, l) => s + l.minM, 0);
  const totalMax = inHorizon.reduce((s, l) => s + l.maxM, 0);
  const byYear = Array.from({ length: horizon }, (_, i) => inHorizon.filter((l) => l.year === i + 1).reduce((s, l) => s + (l.minM + l.maxM) / 2, 0));
  const maxYear = Math.max(1, ...byYear);
  const version = Object.values(data.variants).reduce((a, b) => a + b, 1);

  return (
    <WorkspaceFrame
      service={service}
      onReset={reset}
      actions={
        <>
          <Segmented label={t("Strategy horizon")} value={horizon} onChange={(h) => setData((d) => ({ ...d, horizon: h }))} options={[{ value: 3, label: t("3 years") }, { value: 5, label: t("5 years") }]} />
          <Button variant="outline" size="sm" onClick={() => toast.success(t("Strategy exported (simulated)"), { description: `${factory.name} — ${t("Corporate & Digital Strategy {start}–{end}", { start: BASE_YEAR + 1, end: endYear })}.pdf` })}><Download /> {t("Export")}</Button>
        </>
      }
      notice={t("Investment ranges are illustrative and are not quotations or financing offers.")}
    >
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Outline */}
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-3">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t("Outline")}</span>
              <span className="text-[11px] font-semibold tabular-nums text-navy-700">{t("{done}/{total} approved", { done: approvedCount, total: SECTION_ORDER.length })}</span>
            </div>
            <div className="mx-2 mb-2 h-1.5 overflow-hidden rounded-full bg-navy-900/[0.06]">
              <div className="h-full rounded-full bg-teal-500 transition-[width] duration-500" style={{ width: `${(approvedCount / SECTION_ORDER.length) * 100}%` }} />
            </div>
            <nav aria-label={t("Strategy sections")} className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {SECTION_ORDER.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jump(s.id)}
                  aria-current={active === s.id ? "true" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                    active === s.id ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-navy-900/5"
                  )}
                >
                  {data.status[s.id] === "approved" ? <CheckCircle2 className={cn("size-4 shrink-0", active === s.id ? "text-teal-300" : "text-emerald-600")} aria-label={t("Approved")} /> : <Circle className="size-4 shrink-0 opacity-40" aria-label={t("Draft")} />}
                  <span className="tabular-nums opacity-60">{i + 1}</span>
                  <span className="whitespace-nowrap lg:whitespace-normal">{t(s.label)}</span>
                </button>
              ))}
            </nav>
            <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line px-2 pt-3 lg:block">
              <Button variant="subtle" size="sm" className="lg:w-full" onClick={approveAll} disabled={approvedCount === SECTION_ORDER.length}><Check /> {t("Approve all")}</Button>
              <Link href="/services/bsc-design" className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline lg:mt-3">{t("Objectives feed the Balanced Scorecard")} <ArrowRight className="size-3 rtl:-scale-x-100" /></Link>
            </div>
          </Card>
        </aside>

        {/* Document */}
        <Card className="min-w-0 overflow-hidden">
          <div className="border-b border-line bg-gradient-to-br from-navy-950 to-navy-800 px-5 py-7 text-white md:px-10">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300"><FileText className="size-3.5" /> {t("AI strategy draft · v0.{version}", { version })}</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{t("Corporate & Digital Strategy {start}–{end}", { start: BASE_YEAR + 1, end: endYear })}</h2>
            <p className="mt-1 text-sm text-white/70">{factory.name} · {t(profile.industry)} · {t("prepared from the Jahez maturity profile (Tier {tier} — {name})", { tier, name: t(profile.tierName) })}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-white/10 px-2.5 py-1">{t("{count}-year horizon", { count: horizon })}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">{t("{count} strategic objectives", { count: data.objectives.length })}</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">{t("Indicative investment {min}–{max} (illustrative)", { min: egpM(totalMin), max: egpM(totalMax) })}</span>
              <span className={cn("rounded-full px-2.5 py-1", approvedCount === SECTION_ORDER.length ? "bg-teal-500/30 text-teal-100" : "bg-gold-500/25 text-gold-100")}>{t(approvedCount === SECTION_ORDER.length ? "Approved by leadership (simulated)" : "Draft for leadership review")}</span>
            </div>
          </div>

          <div className="divide-y divide-line">
            <Section {...sectionProps("vision")}>
              <div className="border-s-4 border-gold-400 ps-3 md:ps-5">
                <EditableText multiline ariaLabel={t("Vision")} value={st(data.vision)} onChange={(v) => edit("vision", () => ({ vision: v }))} className="text-base leading-relaxed text-navy-900 md:text-lg" />
              </div>
            </Section>

            <Section {...sectionProps("context")}>
              <EditableText multiline ariaLabel={t("Strategic context")} value={st(data.context)} onChange={(v) => edit("context", () => ({ context: v }))} className="text-sm leading-relaxed text-navy-800" />
            </Section>

            <Section {...sectionProps("objectives")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.objectives.map((o, i) => {
                  const meta = perspectiveMeta(o.perspective);
                  const upd = (patch: Partial<typeof o>) => edit("objectives", (d) => ({ objectives: d.objectives.map((x) => (x.id === o.id ? { ...x, ...patch } : x)) }));
                  return (
                    <div key={o.id} className="rounded-xl border border-line bg-white p-3" style={{ borderInlineStart: `4px solid ${meta.color}` }}>
                      <div className="flex items-center justify-between gap-2 px-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: meta.color }}>{t(meta.label)}</span>
                        <span className="text-[11px] font-semibold tabular-nums text-muted">SO{i + 1}</span>
                      </div>
                      <EditableText ariaLabel={t("Objective {n} title", { n: i + 1 })} value={st(o.title)} onChange={(v) => upd({ title: v })} className="mt-1 text-sm font-semibold text-navy-900" />
                      <EditableText multiline ariaLabel={t("Objective {n} detail", { n: i + 1 })} value={st(o.detail)} onChange={(v) => upd({ detail: v })} className="text-xs text-muted" />
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="flex gap-1">{PERSPECTIVES.map((p) => <span key={p.id} className="size-2 rounded-full" style={{ backgroundColor: p.color }} title={t(p.label)} />)}</span>
                {t("Tagged by Balanced Scorecard perspective —")} <Link href="/services/bsc-design" className="font-medium text-teal-700 hover:underline">{t("open the strategy map")}</Link>
              </p>
            </Section>

            <Section {...sectionProps("priorities")}>
              <ol className="space-y-2">
                {data.priorities.map((pr, i) => {
                  const upd = (patch: Partial<typeof pr>) => edit("priorities", (d) => ({ priorities: d.priorities.map((x) => (x.id === pr.id ? { ...x, ...patch } : x)) }));
                  return (
                    <li key={pr.id} className="flex gap-3">
                      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <EditableText ariaLabel={t("Priority {n}", { n: i + 1 })} value={st(pr.title)} onChange={(v) => upd({ title: v })} className="text-sm font-semibold text-navy-900" />
                        <EditableText ariaLabel={t("Priority {n} detail", { n: i + 1 })} value={st(pr.detail)} onChange={(v) => upd({ detail: v })} className="text-sm text-muted" />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Section>

            <Section {...sectionProps("roadmap")}>
              <div className="relative">
                <div className="absolute inset-x-0 top-[15px] hidden h-0.5 bg-gradient-to-r rtl:bg-gradient-to-l from-teal-400 via-indigo-400 to-gold-400 md:block" aria-hidden />
                <div className={cn("grid gap-4", horizon === 5 ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-3")}>
                  {data.roadmap[hKey].map((y, yi) => (
                    <div key={y.year} className="relative min-w-0">
                      <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 shadow-card">
                        <span className="size-2 rounded-full" style={{ backgroundColor: YEAR_COLORS[yi] }} />
                        {t("Year {n} · {year}", { n: yi + 1, year: y.year })}
                      </div>
                      <div className="mt-3 rounded-xl bg-canvas p-2">
                        <EditableText ariaLabel={t("Year {n} theme", { n: yi + 1 })} value={st(y.theme)} onChange={(v) => editYear(y.year, (r) => ({ ...r, theme: v }))} className="text-sm font-semibold text-navy-900" />
                        <ul className="mt-1 space-y-1">
                          {y.milestones.map((m, mi) => (
                            <li key={mi} className="flex items-start gap-1">
                              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                              <EditableText ariaLabel={t("Year {n} milestone {m}", { n: yi + 1, m: mi + 1 })} value={st(m)} onChange={(v) => editYear(y.year, (r) => ({ ...r, milestones: v.trim() ? r.milestones.map((x, k) => (k === mi ? v : x)) : r.milestones.filter((_, k) => k !== mi) }))} className="text-xs text-navy-800" />
                            </li>
                          ))}
                        </ul>
                        <button type="button" onClick={() => editYear(y.year, (r) => ({ ...r, milestones: [...r.milestones, "New milestone"] }))} className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-50"><Plus className="size-3" /> {t("Milestone")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">{t("Clear a milestone's text to remove it. Tier verifications are proposed milestones — tiers are only issued after evidence review.")}</p>
            </Section>

            <Section {...sectionProps("investment")}>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-canvas text-start text-[11px] uppercase tracking-wider text-muted">
                      <tr><th className="px-3 py-2 text-start font-semibold">{t("Initiative")}</th><th className="px-2 py-2 text-start font-semibold">{t("Year")}</th><th className="px-2 py-2 text-end font-semibold">{t("Min (EGP M)")}</th><th className="px-2 py-2 text-end font-semibold">{t("Max (EGP M)")}</th><th className="w-8"><span className="sr-only">{t("Remove")}</span></th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...inHorizon, ...beyond].map((l) => {
                        const out = l.year > horizon;
                        const upd = (patch: Partial<InvestmentLine>) => edit("investment", (d) => ({ investments: d.investments.map((x) => (x.id === l.id ? { ...x, ...patch } : x)) }));
                        return (
                          <tr key={l.id} className={cn(out && "bg-canvas/60")}>
                            <td className="px-1 py-1.5">
                              <EditableText ariaLabel={t("Investment item")} value={st(l.item)} onChange={(v) => upd({ item: v })} className={cn("text-sm", out ? "text-muted" : "text-navy-900")} />
                              <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">{t(l.category)}{out ? ` · ${t("beyond horizon")}` : ""}</span>
                            </td>
                            <td className="px-2 py-1.5">
                              <select aria-label={t("Investment year")} value={l.year} onChange={(e) => upd({ year: Number(e.target.value) })} className="rounded-md border border-line bg-white px-1.5 py-1 text-xs">
                                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>{t("Y{n}", { n: y })}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-end"><NumCell label={t("Minimum for {item}", { item: st(l.item) })} value={l.minM} onChange={(v) => upd({ minM: v, maxM: Math.max(v, l.maxM) })} /></td>
                            <td className="px-2 py-1.5 text-end"><NumCell label={t("Maximum for {item}", { item: st(l.item) })} value={l.maxM} onChange={(v) => upd({ maxM: Math.max(v, l.minM) })} /></td>
                            <td className="pe-2"><button type="button" aria-label={t("Remove {item}", { item: st(l.item) })} onClick={() => edit("investment", (d) => ({ investments: d.investments.filter((x) => x.id !== l.id) }))} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-navy-900/[0.03] text-sm font-semibold text-navy-900">
                      <tr><td className="px-3 py-2" colSpan={2}>{t("Total within {count} years", { count: horizon })}</td><td className="px-2 py-2 text-end tabular-nums">{totalMin.toFixed(1)}</td><td className="px-2 py-2 text-end tabular-nums">{totalMax.toFixed(1)}</td><td /></tr>
                    </tfoot>
                  </table>
                </div>
                <div className="rounded-xl border border-line p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Phasing (midpoint, EGP M)")}</div>
                  <div className="mt-3 flex h-32 items-end gap-2">
                    {byYear.map((v, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] tabular-nums text-muted">{v.toFixed(v >= 10 ? 0 : 1)}</span>
                        <div className="w-full rounded-t-md bg-gradient-to-t from-navy-800 to-teal-500 transition-[height] duration-500" style={{ height: `${(v / maxYear) * 88}px`, minHeight: 2 }} />
                        <span className="text-[10px] font-semibold text-navy-700">{t("Y{n}", { n: i + 1 })}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => edit("investment", (d) => ({ investments: [...d.investments, { id: `inv-x${d.investments.length + 1}-${d.investments.reduce((s, x) => s + x.id.length, 0)}`, item: "New initiative", year: 1, minM: 0.5, maxM: 1, category: "Other" }] }))} className="mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-50"><Plus className="size-3" /> {t("Add line")}</button>
                </div>
              </div>
              <p className="mt-3 rounded-lg bg-gold-50 px-3 py-2 text-xs text-gold-600">{t("Illustrative — indicative EGP ranges scaled to declared revenue, not quotations. Test affordability in")} <Link href="/services/scenario-planning" className="font-semibold underline">{t("Scenario Planning")}</Link>.</p>
            </Section>

            <Section {...sectionProps("kpis")}>
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-canvas text-start text-[11px] uppercase tracking-wider text-muted">
                    <tr><th className="px-3 py-2 text-start font-semibold">{t("KPI")}</th><th className="px-2 py-2 text-start font-semibold">{t("Baseline {year}", { year: BASE_YEAR })}</th><th className={cn("px-2 py-2 text-start font-semibold", horizon === 3 && "text-teal-700")}>{t("Target {year}", { year: BASE_YEAR + 3 })}</th><th className={cn("px-2 py-2 text-start font-semibold", horizon === 5 && "text-teal-700")}>{t("Target {year}", { year: BASE_YEAR + 5 })}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.kpis.map((k) => {
                      const upd = (patch: Partial<typeof k>) => edit("kpis", (d) => ({ kpis: d.kpis.map((x) => (x.id === k.id ? { ...x, ...patch } : x)) }));
                      return (
                        <tr key={k.id}>
                          <td className="px-1 py-1"><EditableText ariaLabel={t("KPI name")} value={st(k.name)} onChange={(v) => upd({ name: v })} className="text-sm font-medium text-navy-900" /></td>
                          <td className="px-1 py-1"><EditableText ariaLabel={t("{name} baseline", { name: st(k.name) })} value={st(k.baseline)} onChange={(v) => upd({ baseline: v })} className="text-sm tabular-nums text-muted" /></td>
                          <td className={cn("px-1 py-1", horizon === 3 && "bg-teal-50/50")}><EditableText ariaLabel={t("{name} year 3 target", { name: st(k.name) })} value={st(k.target3)} onChange={(v) => upd({ target3: v })} className="text-sm font-semibold tabular-nums text-navy-900" /></td>
                          <td className={cn("px-1 py-1", horizon === 5 && "bg-teal-50/50")}><EditableText ariaLabel={t("{name} year 5 target", { name: st(k.name) })} value={st(k.target5)} onChange={(v) => upd({ target5: v })} className="text-sm font-semibold tabular-nums text-navy-900" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Link href="/services/bsc-design" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">{t("Cascade KPIs to departments in Balanced Scorecard Design")} <ArrowRight className="size-3 rtl:-scale-x-100" /></Link>
            </Section>

            <Section {...sectionProps("risks")}>
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_200px]">
                <ul className="min-w-0 space-y-2">
                  {data.risks.map((r, i) => {
                    const upd = (patch: Partial<typeof r>) => edit("risks", (d) => ({ risks: d.risks.map((x) => (x.id === r.id ? { ...x, ...patch } : x)) }));
                    const cycle = (l: Level) => LEVELS[(LEVELS.indexOf(l) + 1) % 3];
                    return (
                      <li key={r.id} className="rounded-xl border border-line p-2">
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-md bg-red-50 text-[11px] font-bold text-red-700">R{i + 1}</span>
                          <EditableText ariaLabel={t("Risk {n}", { n: i + 1 })} value={st(r.risk)} onChange={(v) => upd({ risk: v })} className="min-w-0 flex-1 text-sm font-medium text-navy-900" />
                          <div className="flex gap-1 ps-8 sm:ps-0">
                            <button type="button" onClick={() => upd({ likelihood: cycle(r.likelihood) })} aria-label={t("Likelihood {level}, click to change", { level: t(r.likelihood) })}><StatusPill tone={levelTone(r.likelihood)}>{t("L: {level}", { level: t(r.likelihood) })}</StatusPill></button>
                            <button type="button" onClick={() => upd({ impact: cycle(r.impact) })} aria-label={t("Impact {level}, click to change", { level: t(r.impact) })}><StatusPill tone={levelTone(r.impact)}>{t("I: {level}", { level: t(r.impact) })}</StatusPill></button>
                          </div>
                        </div>
                        <div className="mt-1 flex items-start gap-1 ps-7">
                          <Lightbulb className="mt-1.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                          <EditableText ariaLabel={t("Mitigation {n}", { n: i + 1 })} value={st(r.mitigation)} onChange={(v) => upd({ mitigation: v })} className="text-xs text-muted" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <RiskMatrix risks={data.risks} />
              </div>
            </Section>
          </div>
        </Card>
      </div>

      <AIInsight title={t("How this draft was generated")} className="mt-6">
        {t("Recommendations combine {name}'s maturity (Tier {tier} — {tierName}), its industry ({industry}), declared size and stated goals.", { name: factory.name, tier, tierName: t(profile.tierName), industry: t(profile.industry) })} {t("Use")} <b>{t("Regenerate")}</b> {t("on any section for an alternative draft, edit any text inline, then approve sections for leadership sign-off. Objectives flow into the Balanced Scorecard workspaces (services 17–19).")}
      </AIInsight>
    </WorkspaceFrame>
  );
}

function Section({ id, index, title, status, chips, busy, onRegenerate, onApprove, children }: { id: SectionId; index: number; title: string; status: "draft" | "approved"; chips: string[]; busy: boolean; onRegenerate: () => void; onApprove: () => void; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const t = useT();
  return (
    <section id={`cs-${id}`} aria-labelledby={`cs-${id}-h`} className="scroll-mt-24 px-4 py-6 md:px-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tabular-nums text-muted">{String(index).padStart(2, "0")}</span>
            <h3 id={`cs-${id}-h`} className="text-lg font-semibold tracking-tight text-navy-900">{title}</h3>
            {status === "approved" ? <StatusPill tone="good"><CheckCircle2 /> {t("Approved")}</StatusPill> : <StatusPill tone="warn">{t("Draft")}</StatusPill>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">{t("Why the AI recommended this")}</span>
            {chips.map((c) => <span key={c} className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800 ring-1 ring-inset ring-teal-100">{c}</span>)}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t("Regenerate")}</Button>
          <Button variant={status === "approved" ? "outline" : "subtle"} size="sm" onClick={onApprove}>{status === "approved" ? <><RotateCcw /> {t("Reopen")}</> : <><Check /> {t("Approve")}</>}</Button>
        </div>
      </div>
      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2" aria-busy="true" role="status">
              <Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-9/12" /><Skeleton className="h-4 w-10/12" />
              <p className="pt-1 text-xs text-teal-700">{t("Strategy Agent is drafting an alternative…")}</p>
            </motion.div>
          ) : (
            <motion.div key="content" initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function NumCell({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="number"
      min={0}
      step={0.1}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) * 10) / 10 || 0))}
      className="w-20 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-end text-sm tabular-nums hover:border-line focus:border-teal-400 focus:bg-white focus:outline-none"
    />
  );
}

function RiskMatrix({ risks }: { risks: StrategyData["risks"] }) {
  const t = useT();
  const cellTone = (l: number, i: number) => (l + i >= 3 ? "bg-red-100" : l + i >= 2 ? "bg-amber-50" : "bg-emerald-50");
  return (
    <figure className="self-start rounded-xl border border-line p-3">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Risk heat map")}</figcaption>
      <div className="mt-2 flex gap-1.5">
        <div className="flex w-3 items-center"><span className="-rotate-90 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-muted">{t("Likelihood")}</span></div>
        <div className="grid max-w-[220px] flex-1 grid-cols-3 gap-1">
          {[2, 1, 0].map((l) =>
            [0, 1, 2].map((i) => {
              const here = risks.map((r, k) => ({ r, k })).filter(({ r }) => LEVELS.indexOf(r.likelihood) === l && LEVELS.indexOf(r.impact) === i);
              return (
                <div key={`${l}-${i}`} className={cn("flex aspect-square flex-wrap content-center justify-center gap-0.5 rounded-md p-0.5", cellTone(l, i))}>
                  {here.map(({ k }) => <span key={k} className="rounded bg-white px-1 text-[9px] font-bold text-navy-900 shadow-sm">R{k + 1}</span>)}
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="mt-1 ps-4 text-center text-[9px] font-semibold uppercase tracking-wider text-muted">{t("Impact")} <span className="inline-block rtl:-scale-x-100">→</span></div>
    </figure>
  );
}
