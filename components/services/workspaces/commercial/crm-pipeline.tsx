"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BrainCircuit, CalendarCheck, Columns3, GripVertical, LineChart, Plus, Search, Sparkles, Users } from "lucide-react";
import { AIInsight, KpiTile, Panel, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Dialog, DialogContent, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import { AT_RISK_DAYS, STAGES, crmSeed, isAtRisk, scoreDeal, stageMeta, type CrmData, type Deal, type DealSource, type Stage } from "./_crm";
import { Segmented, Select, SimTag, Spinner, newId, productProfiles, usd, usdCompact, useSimulatedAI } from "./_shared";

export { crmSeed } from "./_crm";
export type { CrmData, Deal } from "./_crm";

type View = "board" | "customers" | "forecast";
type Filter = "all" | "risk" | "hot";

const scoreTone = (s: number) => (s >= 70 ? "good" : s >= 45 ? "info" : s >= 25 ? "warn" : "bad");

function monthLabels(locale: string): string[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleDateString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "short", year: "2-digit" }));
}

export default function CrmPipelineWorkspace({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<CrmData>(service.id, crmSeed);
  const [view, setView] = useState<View>("board");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const t = useT();
  const { locale } = useLocale();
  const months = useMemo(() => monthLabels(locale), [locale]);
  const [adding, setAdding] = useState(false);
  const ai = useSimulatedAI();

  const deals = data.deals;
  const avgValue = deals.reduce((a, d) => a + d.value, 0) / Math.max(1, deals.length);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (filter === "risk" && !isAtRisk(d)) return false;
      if (filter === "hot" && d.score < 70) return false;
      if (!q) return true;
      return [d.company, d.country, d.contact, d.product].some((s) => s.toLowerCase().includes(q));
    });
  }, [deals, filter, query]);

  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const openValue = open.reduce((a, d) => a + d.value, 0);
  const weighted = open.reduce((a, d) => a + d.value * stageMeta(d.stage).probability, 0);
  const won = deals.filter((d) => d.stage === "won");
  const lost = deals.filter((d) => d.stage === "lost");
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const atRisk = deals.filter(isAtRisk);
  const atRiskValue = atRisk.reduce((a, d) => a + d.value, 0);

  const update = (id: string, patch: Partial<Deal>) =>
    setData((prev) => ({
      ...prev,
      deals: prev.deals.map((d) => {
        if (d.id !== id) return d;
        const next = { ...d, ...patch };
        return { ...next, score: scoreDeal(next, avgValue) };
      }),
    }));

  const move = (id: string, stage: Stage) => {
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;
    update(id, { stage, idleDays: 0, closeIn: stage === "won" || stage === "lost" ? 0 : deal.closeIn });
    toast(t("{company} moved to {stage}", { company: deal.company, stage: t(stageMeta(stage).label) }));
  };

  const rescore = () =>
    ai.run("rescore", () => {
      setData((prev) => {
        const avg = prev.deals.reduce((a, d) => a + d.value, 0) / Math.max(1, prev.deals.length);
        return { ...prev, deals: prev.deals.map((d) => ({ ...d, score: scoreDeal(d, avg) })) };
      });
      toast.success(t("Lead scores refreshed"), { description: t("Recomputed from stage, activity, source and deal size (simulated model).") });
    }, 1000);

  const top = [...open].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <WorkspaceFrame
      service={service}
      onReset={reset}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}><Plus /> {t("New deal")}</Button>
          <Button variant="subtle" size="sm" onClick={rescore} disabled={ai.busy === "rescore"}>{ai.busy === "rescore" ? <Spinner /> : <BrainCircuit />} {t("Re-score with AI")}</Button>
        </>
      }
      notice={t("Customers and contacts are fictional. Lead scores come from a simulated model.")}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t("Open pipeline")} value={usdCompact(openValue)} hint={t("{count} open deals", { count: open.length })} icon={<Columns3 />} />
        <KpiTile label={t("Weighted forecast")} value={usdCompact(weighted)} hint={t("Value × stage probability")} icon={<LineChart />} />
        <KpiTile label={t("Win rate")} value={`${winRate}%`} tone={winRate >= 50 ? "good" : "warn"} delta={t("{won}W / {lost}L", { won: won.length, lost: lost.length })} icon={<CalendarCheck />} />
        <KpiTile label={t("At-risk deals")} value={atRisk.length} tone={atRisk.length ? "bad" : "good"} delta={atRisk.length ? usdCompact(atRiskValue) : undefined} hint={t("No activity {days}+ days", { days: AT_RISK_DAYS })} icon={<AlertTriangle />} />
      </div>

      <div className="mt-5 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <Segmented<View> label={t("View")} value={view} onChange={setView} options={[{ value: "board", label: <><Columns3 /> {t("Pipeline")}</> }, { value: "customers", label: <><Users /> {t("Customers")}</> }, { value: "forecast", label: <><LineChart /> {t("Forecast")}</> }]} />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search company, country, product…")} aria-label={t("Search deals")} className="ps-9" />
          </div>
          <Segmented<Filter> size="sm" label={t("Filter deals")} value={filter} onChange={setFilter} options={[{ value: "all", label: t("All") }, { value: "risk", label: <><AlertTriangle /> {t("At risk")}</> }, { value: "hot", label: <><Sparkles /> {t("Score 70+")}</> }]} />
        </div>
      </div>

      <div className="mt-4">
        {view === "board" ? <Board deals={visible} highlighted={data.highlighted} months={months} onMove={move} onActivity={(id) => { update(id, { idleDays: 0 }); toast.success(t("Call logged — at-risk flag cleared")); }} /> : null}
        {view === "customers" ? <Customers deals={visible} /> : null}
        {view === "forecast" ? <Forecast deals={deals} months={months} /> : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AIInsight title={t("Pipeline coach")}>
          {top.length ? (
            <>
              {top[1] ? t("Prioritise {first} ({score}/100) and {second} this week — they combine late-stage progress with recent engagement.", { first: top[0].company, score: top[0].score, second: top[1].company }) : t("Prioritise {first} ({score}/100) this week — they combine late-stage progress with recent engagement.", { first: top[0].company, score: top[0].score })}{" "}
              {atRisk.length ? t("{count} deal(s) worth {value} went quiet for {days}+ days; schedule follow-up calls before they slip.", { count: atRisk.length, value: usdCompact(atRiskValue), days: AT_RISK_DAYS }) : t("No deal is currently at risk — keep logging activity weekly.")}
            </>
          ) : t("Add deals to receive prioritisation advice.")}
        </AIInsight>
        <AIInsight title={t("Forecast note")}>
          {t("Weighted pipeline of {weighted} against {open} open.", { weighted: usdCompact(weighted), open: usdCompact(openValue) })} {winRate < 50 ? t("Win rate is below 50% — qualify earlier and drop low-fit tenders before the proposal stage.") : t("Win rate is healthy — the bottleneck is moving qualified leads into proposals faster.")}
        </AIInsight>
      </div>

      <NewDealDialog
        open={adding}
        onOpenChange={setAdding}
        products={productProfiles(factory).map((p) => p.name)}
        onAdd={(d) => {
          setData((prev) => ({ ...prev, deals: [{ ...d, score: scoreDeal(d, avgValue) }, ...prev.deals], highlighted: [d.id, ...prev.highlighted].slice(0, 10) }));
          toast.success(t("{company} added to New", { company: d.company }));
        }}
      />
    </WorkspaceFrame>
  );
}

// ---------------- Kanban board ----------------
function Board({ deals, highlighted, months, onMove, onActivity }: { deals: Deal[]; highlighted: string[]; months: string[]; onMove: (id: string, s: Stage) => void; onActivity: (id: string) => void }) {
  const [over, setOver] = useState<Stage | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const t = useT();
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <p className="sr-only">{t("Drag cards between stages, or use the stage menu on each card.")}</p>
      <div className="flex min-w-max gap-3">
        {STAGES.map((st) => {
          const items = deals.filter((d) => d.stage === st.id);
          const total = items.reduce((a, d) => a + d.value, 0);
          return (
            <section
              key={st.id}
              aria-label={t("{stage} stage", { stage: t(st.label) })}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== st.id) setOver(st.id); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); setOver(null); setDragging(null); if (id) onMove(id, st.id); }}
              className={cn("flex w-[248px] shrink-0 flex-col rounded-2xl border border-line bg-canvas/70 p-2 transition", over === st.id && "border-teal-300 bg-teal-50/60 ring-2 ring-teal-100")}
            >
              <header className="flex items-center justify-between px-2 pb-2 pt-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: st.color }} aria-hidden />
                  <h3 className="text-sm font-semibold text-navy-900">{t(st.label)}</h3>
                  <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-muted ring-1 ring-line">{items.length}</span>
                </div>
                <span className="text-[11px] font-medium tabular-nums text-muted">{usdCompact(total)}</span>
              </header>
              <div className="flex min-h-24 flex-col gap-2">
                <AnimatePresence initial={false}>
                  {items.map((d) => (
                    <motion.article
                      key={d.id}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
                      animate={{ opacity: dragging === d.id ? 0.45 : 1, scale: 1 }}
                      exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.18 }}
                      className={cn("rounded-xl border bg-white p-3 shadow-card", highlighted.includes(d.id) ? "border-teal-300" : "border-line", isAtRisk(d) && "border-s-4 border-s-red-400")}
                    >
                      <div
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); e.dataTransfer.effectAllowed = "move"; setDragging(d.id); }}
                        onDragEnd={() => { setDragging(null); setOver(null); }}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-navy-900" title={d.company}>{d.company}</div>
                            <div className="truncate text-xs text-muted">{t(d.country)} · {t(d.product)}</div>
                          </div>
                          <GripVertical className="mt-0.5 size-4 shrink-0 text-navy-500/40" aria-hidden />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold tabular-nums text-navy-900">{usdCompact(d.value)}</span>
                          <StatusPill tone={scoreTone(d.score)}><Sparkles /> {d.score}</StatusPill>
                          {isAtRisk(d) ? <StatusPill tone="bad"><AlertTriangle /> {t("{days}d idle", { days: d.idleDays })}</StatusPill> : null}
                          {highlighted.includes(d.id) ? <StatusPill tone="info">{t("New")}</StatusPill> : null}
                        </div>
                        <div className="mt-1.5 text-[11px] text-muted">{t(d.source)} · {d.stage === "won" || d.stage === "lost" ? t("Closed") : t("close {month}", { month: months[d.closeIn] ?? "—" })}</div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
                        <label className="sr-only" htmlFor={`stage-${d.id}`}>{t("Move {company} to stage", { company: d.company })}</label>
                        <select id={`stage-${d.id}`} value={d.stage} onChange={(e) => onMove(d.id, e.target.value as Stage)} className="h-7 min-w-0 flex-1 rounded-md border border-line bg-white px-1.5 text-xs text-navy-800 focus:outline-none focus:ring-2 focus:ring-teal-200">
                          {STAGES.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
                        </select>
                        {d.idleDays > 0 && d.stage !== "won" && d.stage !== "lost" ? (
                          <button type="button" onClick={() => onActivity(d.id)} className="h-7 rounded-md px-2 text-[11px] font-medium text-teal-700 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">{t("Log call")}</button>
                        ) : null}
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
                {!items.length ? <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-muted">{t("Drop deals here")}</div> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- Customers ----------------
function Customers({ deals }: { deals: Deal[] }) {
  const t = useT();
  const rows = useMemo(() => {
    const map = new Map<string, { company: string; country: string; contact: string; deals: number; open: number; won: number; best: number; idle: number }>();
    for (const d of deals) {
      const r = map.get(d.company) ?? { company: d.company, country: d.country, contact: d.contact, deals: 0, open: 0, won: 0, best: 0, idle: 999 };
      r.deals += 1;
      if (d.stage === "won") r.won += d.value;
      else if (d.stage !== "lost") r.open += d.value;
      r.best = Math.max(r.best, d.score);
      r.idle = Math.min(r.idle, d.idleDays);
      map.set(d.company, r);
    }
    return [...map.values()].sort((a, b) => b.open + b.won - (a.open + a.won));
  }, [deals]);
  return (
    <Panel title={t("Customers & accounts")} description={t("Aggregated from the pipeline · fictional organisations")} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-canvas text-start text-xs uppercase tracking-wider text-muted">
            <tr>{["Account", "Country", "Contact", "Deals", "Open value", "Won value", "AI score", "Last activity"].map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{t(h)}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.company} className="hover:bg-canvas/60">
                <th scope="row" className="px-4 py-3 text-start font-semibold text-navy-900">{r.company}</th>
                <td className="px-4 py-3 text-navy-700">{t(r.country)}</td>
                <td className="px-4 py-3 text-navy-700">{r.contact}</td>
                <td className="px-4 py-3 tabular-nums">{r.deals}</td>
                <td className="px-4 py-3 tabular-nums">{r.open ? usd(r.open) : "—"}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700">{r.won ? usd(r.won) : "—"}</td>
                <td className="px-4 py-3"><StatusPill tone={scoreTone(r.best)}>{r.best}</StatusPill></td>
                <td className="px-4 py-3">{r.idle >= AT_RISK_DAYS ? <StatusPill tone="bad">{t("{days} days ago", { days: r.idle })}</StatusPill> : <span className="text-muted">{r.idle === 0 ? t("Today") : t("{days} days ago", { days: r.idle })}</span>}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">{t("No accounts match the current filter.")}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---------------- Forecast ----------------
const OPEN_STAGES: Stage[] = ["new", "qualified", "proposal", "negotiation"];
const fmtTick = (v: number) => usdCompact(v).replace("US$", "$");

function Forecast({ deals, months }: { deals: Deal[]; months: string[] }) {
  const t = useT();
  const byMonth = months.map((m, i) => {
    const row: Record<string, number | string> = { month: m };
    for (const s of OPEN_STAGES) row[s] = Math.round(deals.filter((d) => d.stage === s && d.closeIn === i).reduce((a, d) => a + d.value * stageMeta(s).probability, 0));
    return row;
  });
  const sources = Array.from(new Set(deals.map((d) => d.source))) as DealSource[];
  const bySource = sources
    .map((src) => {
      const w = deals.filter((d) => d.source === src && d.stage === "won").length;
      const l = deals.filter((d) => d.source === src && d.stage === "lost").length;
      return { source: src, rate: w + l ? Math.round((w / (w + l)) * 100) : 0, closed: w + l };
    })
    .sort((a, b) => b.rate - a.rate || b.closed - a.closed);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel title={t("Weighted pipeline by expected close month")} description={t("Deal value × stage probability · recomputed live from the board")} actions={<SimTag />}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byMonth} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#E5E8EE" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tickFormatter={fmtTick} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} width={56} />
              <Tooltip formatter={(v, n) => [usd(Number(v)), t(stageMeta(n as Stage).label)]} contentStyle={{ borderRadius: 12, borderColor: "#E5E8EE", fontSize: 12 }} cursor={{ fill: "rgba(11,31,58,0.04)" }} />
              {OPEN_STAGES.map((s, i) => <Bar key={s} dataKey={s} stackId="w" fill={stageMeta(s).color} radius={i === OPEN_STAGES.length - 1 ? [6, 6, 0, 0] : 0} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
          {OPEN_STAGES.map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ backgroundColor: stageMeta(s).color }} aria-hidden /> {t(stageMeta(s).label)} ({Math.round(stageMeta(s).probability * 100)}%)</span>)}
        </div>
      </Panel>
      <Panel title={t("Win rate by lead source")} description={t("Closed deals only · grey = no closed deals yet")}>
        <ul className="space-y-3">
          {bySource.map((r) => (
            <li key={r.source}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-navy-800">{t(r.source)}</span>
                <span className="tabular-nums text-muted">{r.closed ? t("{rate}% · {closed} closed", { rate: r.rate, closed: r.closed }) : "—"}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-900/[0.06]">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${r.closed ? Math.max(4, r.rate) : 100}%`, backgroundColor: r.closed ? (r.rate >= 50 ? "#0FA396" : "#C9A24B") : "#E2E8F0" }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={STAGES.map((s) => ({ stage: t(s.label), n: deals.filter((d) => d.stage === s.id).length, color: s.color }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748B" }} interval={0} />
              <Tooltip formatter={(v) => [t("{count} deals", { count: String(v) }), t("Count")]} contentStyle={{ borderRadius: 12, borderColor: "#E5E8EE", fontSize: 12 }} cursor={{ fill: "rgba(11,31,58,0.04)" }} />
              <Bar dataKey="n" radius={[4, 4, 0, 0]}>
                {STAGES.map((s) => <Cell key={s.id} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted">{t("Deals per stage")}</p>
      </Panel>
    </div>
  );
}

// ---------------- New deal ----------------
function NewDealDialog({ open, onOpenChange, products, onAdd }: { open: boolean; onOpenChange: (v: boolean) => void; products: string[]; onAdd: (d: Deal) => void }) {
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("Egypt");
  const [product, setProduct] = useState(products[0] ?? "");
  const [value, setValue] = useState("25000");
  const t = useT();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    onAdd({ id: newId("deal"), company: company.trim(), country: country.trim() || "Egypt", contact: "—", product: product || products[0] || "Product", value: Math.max(0, Number(value) || 0), stage: "new", idleDays: 0, closeIn: 3, source: "Referral", score: 0 });
    setCompany("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("New deal")} description={t("Adds an opportunity to the New stage.")}>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="nd-company">{t("Company")}</Label><Input id="nd-company" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder={t("e.g. Fictional Buyer Co.")} /></div>
          <div><Label htmlFor="nd-country">{t("Country")}</Label><Input id="nd-country" value={country} onChange={(e) => setCountry(e.target.value)} /></div>
          <div><Label htmlFor="nd-value">{t("Value (USD)")}</Label><Input id="nd-value" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))} /></div>
          <div className="sm:col-span-2"><Label htmlFor="nd-product">{t("Product")}</Label><Select id="nd-product" value={product} onChange={(e) => setProduct(e.target.value)}>{products.map((p) => <option key={p} value={p}>{t(p)}</option>)}</Select></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("Cancel")}</Button><Button type="submit" disabled={!company.trim()}><Plus /> {t("Add deal")}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
