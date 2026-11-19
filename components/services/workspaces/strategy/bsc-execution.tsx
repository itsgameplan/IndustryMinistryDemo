"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BellOff, CheckCircle2, CircleDot, Filter, Flag, ListChecks, Rocket, Sparkles } from "lucide-react";
import { AIInsight, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useT, type TFunction } from "@/lib/i18n";
import { LinkIndicator, NumberField, Segmented, useFmtVal, useSeedT, useStrategyLinks } from "./_shared";
import { ACTUAL_MONTHS, MONTHS, PERSPECTIVES, attainment, perspectiveMeta, peopleFor, ragOf, simulateActuals, type BscKpi, type Perspective, type Rag } from "./_seeds";

type Period = "month" | "quarter" | "ytd";
type InitStatus = "on-track" | "at-risk" | "delayed" | "done";
interface Initiative { id: string; title: string; objectiveRef: string; owner: string; progress: number; due: string; status: InitStatus }
interface ExecutionData { version: 1; targets: Record<string, number>; initiatives: Initiative[]; acknowledged: string[] }

const periodLabel = (p: Period, t: TFunction) => (p === "month" ? `${t(MONTHS[ACTUAL_MONTHS - 1])} 2026` : p === "quarter" ? t("Q3 2026") : t("YTD Jan–{month}", { month: t(MONTHS[ACTUAL_MONTHS - 1]) }));
const RAG_META: Record<Rag, { label: string; tone: "good" | "warn" | "bad"; color: string }> = {
  green: { label: "On track", tone: "good", color: "#10B981" },
  amber: { label: "At risk", tone: "warn", color: "#F59E0B" },
  red: { label: "Off track", tone: "bad", color: "#EF4444" },
};
const INIT_META: Record<InitStatus, { label: string; tone: "good" | "warn" | "bad" | "info" }> = {
  "on-track": { label: "On track", tone: "good" },
  "at-risk": { label: "At risk", tone: "warn" },
  delayed: { label: "Delayed", tone: "bad" },
  done: { label: "Done", tone: "info" },
};

function seed(factory: Factory): ExecutionData {
  const key = seedKeyFor(factory);
  const people = peopleFor(factory);
  const who = (i: number) => people[Math.min(i, people.length - 1)].name;
  const rows: [string, string, number, string, InitStatus][] =
    key === "al-noor"
      ? [
          ["Launch bilingual website & digital catalogue", "obj-2", 85, "Dec 2026", "on-track"],
          ["Document 12 core SOPs", "obj-5", 45, "Feb 2027", "at-risk"],
          ["Cloud accounting & order management", "obj-4", 30, "Mar 2027", "on-track"],
          ["Export sample programme (EU & Gulf)", "obj-3", 15, "Apr 2027", "delayed"],
          ["Supervisor digital-skills training", "obj-6", 60, "Jan 2027", "on-track"],
        ]
      : key === "delta"
        ? [
            ["Predictive maintenance — forging & CNC", "obj-4", 70, "Jan 2027", "on-track"],
            ["AI visual inspection pilot (brake discs)", "obj-2", 40, "Mar 2027", "at-risk"],
            ["Energy analytics & carbon accounting", "obj-5", 55, "Feb 2027", "on-track"],
            ["Export programme office — EU OEM bids", "obj-1", 25, "Jun 2027", "delayed"],
            ["Data analytics certification (20 engineers)", "obj-6", 35, "May 2027", "on-track"],
            ["PPAP readiness for new OEM programme", "obj-3", 100, "Oct 2026", "done"],
          ]
        : [
            ["Leadership KPI review cadence", "obj-1", 50, "Dec 2026", "on-track"],
            ["Digital catalogue & website refresh", "obj-2", 35, "Feb 2027", "at-risk"],
            ["Core SOP documentation", "obj-3", 20, "Mar 2027", "on-track"],
            ["Digital skills programme", "obj-4", 10, "Apr 2027", "delayed"],
          ];
  return { version: 1, targets: {}, acknowledged: [], initiatives: rows.map(([title, objectiveRef, progress, due, status], i) => ({ id: `ini-${i + 1}`, title, objectiveRef, owner: who(i + 1), progress, due, status })) };
}

const periodValue = (series: number[], p: Period) => {
  const pick = p === "month" ? series.slice(-1) : p === "quarter" ? series.slice(6, 9) : series;
  return Math.round((pick.reduce((a, b) => a + b, 0) / pick.length) * 100) / 100;
};

interface Row { kpi: BscKpi; perspective: Perspective; objectiveTitle: string; series: number[]; actual: number; target: number; ratio: number; rag: Rag; overridden: boolean }

export default function BscExecutionWorkspace({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<ExecutionData>(service.id, seed);
  const links = useStrategyLinks();
  const reduce = useReducedMotion();
  const [period, setPeriod] = useState<Period>("month");
  const [persp, setPersp] = useState<Perspective | "all">("all");
  const [dept, setDept] = useState<string>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const t = useT();
  const st = useSeedT();
  const fv = useFmtVal();
  const periodText = periodLabel(period, t);

  const factoryKey = seedKeyFor(factory) === "generic" ? factory.id : seedKeyFor(factory);
  const departments = useMemo(() => Array.from(new Set(links.design.kpis.map((k) => k.department))), [links.design.kpis]);

  const allRows: Row[] = useMemo(
    () =>
      links.design.kpis.map((kpi) => {
        const obj = links.design.objectives.find((o) => o.id === kpi.objectiveId);
        const series = simulateActuals(kpi, factoryKey);
        const actual = periodValue(series, period);
        const target = data.targets[kpi.id] ?? kpi.target;
        const ratio = attainment(actual, target, kpi.baseline, kpi.direction);
        return { kpi, perspective: obj?.perspective ?? "financial", objectiveTitle: obj ? (obj.strategyRef ? links.objectiveTitle(obj.strategyRef) ?? obj.title : obj.title) : "—", series, actual, target, ratio, rag: ragOf(ratio), overridden: data.targets[kpi.id] !== undefined };
      }),
    [links, factoryKey, period, data.targets]
  );
  const rows = allRows.filter((r) => (persp === "all" || r.perspective === persp) && (dept === "all" || r.kpi.department === dept));
  const counts = { green: rows.filter((r) => r.rag === "green").length, amber: rows.filter((r) => r.rag === "amber").length, red: rows.filter((r) => r.rag === "red").length };
  const score = rows.length ? Math.round(rows.reduce((s, r) => s + Math.min(1.1, r.ratio), 0) / rows.length * 100) : 0;
  const alerts = rows.filter((r) => r.rag === "red" && !data.acknowledged.includes(`${r.kpi.id}:${period}`));
  const sel = allRows.find((r) => r.kpi.id === selected) ?? rows[0];

  const setTarget = (id: string, v: number) => setData((d) => ({ ...d, targets: { ...d.targets, [id]: v } }));
  const updInit = (id: string, patch: Partial<Initiative>) => setData((d) => ({ ...d, initiatives: d.initiatives.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={t("Actuals are simulated mock data; in production they would come from ERP, MES and HR systems.")}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <LinkIndicator linked={links.strategyLinked} href="/services/corporate-strategy" linkedLabel={t("Linked to Corporate Strategy")} unlinkedLabel={t("Strategy not yet developed")} />
        <LinkIndicator linked={links.designLinked} href="/services/bsc-design" linkedLabel={t("KPIs from Scorecard Design")} unlinkedLabel={t("Scorecard not yet designed — AI-suggested KPIs")} />
      </div>

      {/* Filter bar */}
      <div className="sticky top-16 z-20 -mx-1 mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/90 px-3 py-2 shadow-card backdrop-blur">
        <Filter className="size-4 text-muted" aria-hidden />
        <Segmented label={t("Period")} value={period} onChange={setPeriod} options={[{ value: "month", label: t("Month") }, { value: "quarter", label: t("Quarter") }, { value: "ytd", label: t("YTD") }]} />
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t("Perspective")}>
          {[{ id: "all" as const, label: "All", color: "#64748B" }, ...PERSPECTIVES].map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={persp === p.id} onClick={() => setPersp(p.id)} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition", persp === p.id ? "bg-navy-900 text-white ring-navy-900" : "text-navy-700 ring-line hover:bg-canvas")}>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: p.color }} />{t(p.label)}
            </button>
          ))}
        </div>
        <select aria-label={t("Department")} value={dept} onChange={(e) => setDept(e.target.value)} className="h-8 max-w-full rounded-lg border border-line bg-white px-2 text-xs">
          <option value="all">{t("All departments")}</option>
          {departments.map((d) => <option key={d} value={d}>{t(d)}</option>)}
        </select>
        <span className="ms-auto text-xs font-medium text-muted">{periodText}</span>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-navy-950 to-navy-800 p-5 text-white shadow-card">
          <ScoreRing value={score} reduce={!!reduce} />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-300">{t("Execution score")}</div>
            <div className="mt-1 text-xs text-white/70">{t(rows.length === 1 ? "Average attainment of {count} KPI vs target" : "Average attainment of {count} KPIs vs target", { count: rows.length })}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["green", "amber", "red"] as Rag[]).map((r) => (
            <div key={r} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: RAG_META[r].color }} />{t(RAG_META[r].label)}</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums text-navy-900">{counts[r]}</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-800"><AlertTriangle className="size-4" /> {t("Alerts ({count})", { count: alerts.length })}</h3>
            <span className="text-[11px] text-red-700/70">{t("Off-track KPIs")}</span>
          </div>
          <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto pe-1">
            {alerts.map((a) => (
              <li key={a.kpi.id} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-sm">
                <button type="button" className="min-w-0 flex-1 truncate text-start font-medium text-navy-900 hover:underline" onClick={() => setSelected(a.kpi.id)}>{st(a.kpi.name)}</button>
                <span className="shrink-0 tabular-nums text-red-700">{t("{actual} vs {target}", { actual: fv(a.actual, a.kpi.unit), target: fv(a.target, a.kpi.unit) })}</span>
                <button type="button" aria-label={t("Acknowledge alert for {name}", { name: st(a.kpi.name) })} className="shrink-0 rounded p-1 text-muted hover:bg-canvas hover:text-navy-900" onClick={() => { setData((d) => ({ ...d, acknowledged: [...d.acknowledged, `${a.kpi.id}:${period}`] })); toast(t("Alert acknowledged — {owner} notified (simulated)", { owner: t(a.kpi.owner) })); }}><BellOff className="size-3.5" /></button>
              </li>
            ))}
            {!alerts.length ? <li className="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 className="size-3.5" /> {t("No open alerts for this view.")}</li> : null}
          </ul>
        </div>
      </div>

      {/* KPI table + detail */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={t("Actual vs target")} description={t("Click a target to edit it — status recalculates instantly. Click a row for the trend.")} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 text-start font-semibold">{t("KPI")}</th>
                  <th className="px-2 py-2.5 text-start font-semibold">{t("Trend")}</th>
                  <th className="w-[30%] px-2 py-2.5 text-start font-semibold">{t("Actual vs target")}</th>
                  <th className="px-2 py-2.5 text-end font-semibold">{t("Target")}</th>
                  <th className="px-4 py-2.5 text-end font-semibold">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.kpi.id} onClick={() => setSelected(r.kpi.id)} className={cn("cursor-pointer transition hover:bg-canvas", sel?.kpi.id === r.kpi.id && "bg-teal-50/50")}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-start gap-2">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: perspectiveMeta(r.perspective).color }} title={t(perspectiveMeta(r.perspective).label)} />
                        <div className="min-w-0">
                          <button type="button" className="text-start font-medium text-navy-900 focus-visible:underline focus-visible:outline-none" onClick={() => setSelected(r.kpi.id)}>{st(r.kpi.name)}</button>
                          <div className="truncate text-[11px] text-muted">{t(r.kpi.department)} · {t(r.kpi.owner)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5"><Sparkline values={r.series} color={RAG_META[r.rag].color} /></td>
                    <td className="px-2 py-2.5"><Bullet r={r} /></td>
                    <td className="px-2 py-2.5 text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="ms-auto w-24"><NumberField key={`${r.kpi.id}-${r.target}`} label={t("Target for {name}", { name: st(r.kpi.name) })} value={r.target} onCommit={(v) => setTarget(r.kpi.id, v)} className={cn("h-8 text-end", r.overridden && "border-teal-300 bg-teal-50/50")} /></div>
                    </td>
                    <td className="px-4 py-2.5 text-end"><StatusPill tone={RAG_META[r.rag].tone}>{t(RAG_META[r.rag].label)}</StatusPill></td>
                  </tr>
                ))}
                {!rows.length ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">{t("No KPIs match these filters.")}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Panel>

        {sel ? (
          <Panel title={st(sel.kpi.name)} description={`${t(perspectiveMeta(sel.perspective).label)} · ${t(sel.kpi.frequency)} · ${t(sel.kpi.owner)}`} actions={<StatusPill tone={RAG_META[sel.rag].tone}>{Math.round(sel.ratio * 100)}%</StatusPill>} className="xl:sticky xl:top-36 xl:self-start">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sel.series.map((v, i) => ({ m: t(MONTHS[i]), v }))} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#E5E8EE" vertical={false} />
                  <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} width={44} domain={["auto", "auto"]} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? fv(v, sel.kpi.unit) : String(v))} contentStyle={{ borderRadius: 12, border: "1px solid #E5E8EE", fontSize: 12 }} />
                  <ReferenceLine y={sel.target} stroke="#C9A24B" strokeDasharray="4 4" label={{ value: t("Target"), position: "insideTopRight", fontSize: 10, fill: "#A9853A" }} />
                  <Line type="monotone" dataKey="v" name={t("Actual")} stroke={RAG_META[sel.rag].color} strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={!reduce} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[["Baseline", sel.kpi.baseline], ["Actual", sel.actual], ["Target", sel.target]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg bg-canvas px-2 py-2"><dt className="text-[10px] uppercase tracking-wider text-muted">{t(l as string)}</dt><dd className="text-sm font-semibold tabular-nums text-navy-900">{fv(v as number, sel.kpi.unit)}</dd></div>
              ))}
            </dl>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted"><Flag className="mt-0.5 size-3 shrink-0 text-teal-600" /> {t("Serves strategic objective:")} <span className="font-medium text-navy-800">{st(sel.objectiveTitle)}</span></p>
            {sel.overridden ? <p className="mt-2 text-[11px] text-teal-700">{t("Target overridden here (design target {target}).", { target: fv(sel.kpi.target, sel.kpi.unit) })} <button type="button" className="font-semibold underline" onClick={() => setData((d) => { const next = { ...d.targets }; delete next[sel.kpi.id]; return { ...d, targets: next }; })}>{t("Restore")}</button></p> : null}
          </Panel>
        ) : null}
      </div>

      {/* Initiatives */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title={t("Strategic initiatives")} description={t("Progress of the projects that deliver the strategy.")} actions={<Rocket className="size-4 text-muted" />} bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {data.initiatives.map((ini) => {
              const objTitle = links.objectiveTitle(ini.objectiveRef);
              return (
                <li key={ini.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-navy-900">{st(ini.title)}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{t(ini.owner)} · {t("due {date}", { date: st(ini.due) })}{objTitle ? <> · <Link href="/services/corporate-strategy" className="text-teal-700 hover:underline"><span className="inline-block rtl:-scale-x-100">↳</span> {st(objTitle)}</Link></> : null}</div>
                    </div>
                    <select aria-label={t("Status of {title}", { title: st(ini.title) })} value={ini.status} onChange={(e) => updInit(ini.id, { status: e.target.value as InitStatus, progress: e.target.value === "done" ? 100 : ini.progress })} className="h-7 rounded-md border border-line bg-white px-1.5 text-[11px] font-semibold">
                      {(Object.keys(INIT_META) as InitStatus[]).map((s) => <option key={s} value={s}>{t(INIT_META[s].label)}</option>)}
                    </select>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={ini.progress} className="flex-1" barClassName={ini.status === "delayed" ? "bg-red-500" : ini.status === "at-risk" ? "bg-amber-500" : ini.status === "done" ? "bg-sky-500" : "bg-teal-500"} />
                    <input type="range" min={0} max={100} step={5} value={ini.progress} aria-label={t("Progress of {title}", { title: st(ini.title) })} onChange={(e) => { const v = Number(e.target.value); updInit(ini.id, { progress: v, status: v === 100 ? "done" : ini.status === "done" ? "on-track" : ini.status }); }} className="w-20 accent-teal-500 sm:w-28" />
                    <span className="w-9 text-end text-xs font-semibold tabular-nums text-navy-900">{ini.progress}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel title={t("Perspective health")} description={periodText}>
            <div className="space-y-3">
              {PERSPECTIVES.map((p) => {
                const pr = allRows.filter((r) => r.perspective === p.id && (dept === "all" || r.kpi.department === dept));
                const pct = pr.length ? Math.round((pr.reduce((s, r) => s + Math.min(1.1, r.ratio), 0) / pr.length) * 100) : 0;
                return (
                  <button key={p.id} type="button" onClick={() => setPersp(p.id)} className="block w-full text-start">
                    <div className="flex items-center justify-between text-xs"><span className="font-medium text-navy-800">{t(p.label)}</span><span className="tabular-nums text-muted">{t("{count} KPIs", { count: pr.length })} · <span className="font-semibold text-navy-900">{pct}%</span></span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-900/[0.06]"><motion.div className="h-full rounded-full" style={{ backgroundColor: p.color }} initial={false} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: reduce ? 0 : 0.5 }} /></div>
                  </button>
                );
              })}
            </div>
          </Panel>
          <AIInsight title={t("Execution brief")}>
            {counts.red ? <>{t(counts.red > 1 ? "{count} KPIs are off track in {period}" : "{count} KPI is off track in {period}", { count: counts.red, period: periodText })}{alerts[0] ? <> — {t("most urgent:")} <b>{st(alerts[0].kpi.name)}</b> ({t(alerts[0].kpi.owner)})</> : null}. </> : <>{t("No KPI is off track in this view.")} </>}
            {data.initiatives.some((i) => i.status === "delayed") ? <>{t("Delayed initiatives ({list}) are the likeliest cause — review them in the next", { list: data.initiatives.filter((i) => i.status === "delayed").map((i) => st(i.title)).join("; ") })} <Link href="/services/bsc-workshops" className="font-semibold text-teal-700 hover:underline">{t("leadership workshop")}</Link>.</> : <>{t("All initiatives are progressing.")}</>}
          </AIInsight>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success(t("Monthly scorecard pack generated (simulated)"))}><ListChecks /> {t("Generate monthly pack")}</Button>
            <Button variant="ghost" size="sm" onClick={() => toast(t("Data owners reminded to submit actuals (simulated)"))}><Sparkles /> {t("Remind data owners")}</Button>
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function ScoreRing({ value, reduce }: { value: number; reduce: boolean }) {
  const r = 30, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 97 ? "#2DBFB0" : v >= 88 ? "#F59E0B" : "#EF4444";
  const t = useT();
  return (
    <div className="relative size-20 shrink-0" role="img" aria-label={t("Execution score {value}%", { value: v })}>
      <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
        <motion.circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - v / 100) }} transition={{ duration: reduce ? 0 : 0.6 }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums">{v}%</span>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 72, h = 24;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(" ");
  const last = pts.split(" ").slice(-1)[0].split(",");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
    </svg>
  );
}

function Bullet({ r }: { r: Row }) {
  const max = Math.max(r.target, r.actual, r.kpi.baseline) * 1.15 || 1;
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const t = useT();
  const fv = useFmtVal();
  return (
    <div>
      <div className="relative h-3.5 rounded-sm bg-navy-900/[0.06]" role="img" aria-label={t("Actual {actual}, target {target}", { actual: fv(r.actual, r.kpi.unit), target: fv(r.target, r.kpi.unit) })}>
        <div className="absolute inset-y-0 start-0 rounded-sm bg-navy-900/[0.08]" style={{ width: pct(r.kpi.baseline) }} />
        <div className="absolute inset-y-[3px] start-0 rounded-sm transition-[width] duration-500" style={{ width: pct(r.actual), backgroundColor: RAG_META[r.rag].color }} />
        <div className="absolute -inset-y-0.5 w-0.5 rounded bg-navy-900" style={{ insetInlineStart: pct(r.target) }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
        <span className="flex items-center gap-1"><CircleDot className="size-2.5" />{fv(r.actual, r.kpi.unit)}</span>
        <span>{r.kpi.direction === "down" ? t("lower is better") : ""}</span>
      </div>
    </div>
  );
}
