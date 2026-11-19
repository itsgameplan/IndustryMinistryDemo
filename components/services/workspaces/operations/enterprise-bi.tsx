"use client";

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BadgeDollarSign, Banknote, ChevronDown, ChevronRight, Factory as FactoryIcon, Filter, Gauge, Percent, RefreshCw, Sparkles, Truck, Users, X,
} from "lucide-react";
import { CHART_COLORS, KpiTile, Panel, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import { useSimulatedAI } from "./shared";
import {
  MONTH_LABELS, avg, buildModel, contextKey, generateInsights, grossMargin, lineRevenue, oeeAvg, periodWindows, revenue, sum,
  type Area as BizArea, type BIModel, type Filters, type Insight, type InsightMsg, type Period,
} from "./bi-data";

interface BIData { period: Period; area: BizArea; line: number; customer: number; insights: { context: string; items: Insight[] } | null }

function seed(factory: Factory): BIData {
  const model = buildModel(factory);
  const f = { line: -1, customer: -1 };
  return { period: "12m", area: "financial", ...f, insights: { context: contextKey("12m", "financial", f), items: generateInsights(model, "12m", "financial", f) } };
}

const PERIODS: { id: Period; label: string }[] = [{ id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }, { id: "ytd", label: "YTD" }, { id: "12m", label: "12M" }];
const AREAS: { id: BizArea; label: string }[] = [{ id: "financial", label: "Financial" }, { id: "sales", label: "Sales" }, { id: "production", label: "Production" }, { id: "hr", label: "HR" }, { id: "operations", label: "Operations" }];

const egp = (v: number) => `EGP ${v.toFixed(v < 10 ? 2 : 1)}M`;
const chg = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const signed = (n: number, d = 1, unit = "%") => `${n >= 0 ? "+" : ""}${n.toFixed(d)}${unit}`;
const tooltipStyle = { borderRadius: 12, border: "1px solid #E5E8EE", boxShadow: "0 8px 24px -12px rgba(11,31,58,.25)", fontSize: 12 } as const;
const axisTick = { fontSize: 10, fill: "#64748B" } as const;
/** "Nov 26" → translated month + year. */
const monthLabel = (t: TFunction, s: string) => { const [m, y] = s.split(" "); return y ? `${t(m)} ${y}` : t(s); };
/** Translate a value; composite "A · B" labels are translated part by part when there is no whole-string entry. */
const tPart = (t: TFunction, s: string) => { const w = t(s); return w !== s || !s.includes(" · ") ? w : s.split(" · ").map((p) => t(p)).join(" · "); };

function Spark({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1 || 1)) * 100},${22 - ((v - min) / span) * 18 - 2}`).join(" ");
  return <svg viewBox="0 0 100 22" preserveAspectRatio="none" className="mt-1 h-5 w-full" aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg>;
}

function ChartBox({ title, subtitle, children, className, height = "h-64" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string; height?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-4 shadow-card", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-navy-900">{title}</h4>
        {subtitle ? <span className="truncate text-[11px] text-muted">{subtitle}</span> : null}
      </div>
      <div className={height}>{children}</div>
    </div>
  );
}

function Donut({ data, onPick, active, format }: { data: { name: string; value: number }[]; onPick?: (i: number) => void; active?: number; format: (v: number) => string }) {
  const t = useT();
  const total = sum(data.map((d) => d.value));
  return (
    <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative h-36 shrink-0 sm:h-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive={false}
              onClick={onPick ? (_, i) => onPick(i) : undefined} className={onPick ? "cursor-pointer" : undefined}>
              {data.map((d, i) => <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={active !== undefined && active >= 0 && active !== i ? 0.3 : 1} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => format(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><div className="text-[10px] uppercase tracking-wider text-muted">{t("Total")}</div><div className="text-sm font-semibold tabular-nums text-navy-900">{format(total)}</div></div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {data.map((d, i) => (
          <li key={d.name}>
            <button type="button" disabled={!onPick} onClick={() => onPick?.(i)} aria-pressed={active === i}
              className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1 text-start text-xs transition enabled:hover:bg-canvas", active === i && "bg-teal-50")}>
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="min-w-0 flex-1 truncate text-navy-800">{d.name}</span>
              <span className="tabular-nums text-muted">{total ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SmallMultiples({ items }: { items: { name: string; values: { m: string; v: number }[]; format: (v: number) => string; lowerIsBetter?: boolean }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it, i) => {
        const last = it.values[it.values.length - 1]?.v ?? 0, first = it.values[0]?.v ?? 0;
        const c = chg(last, first);
        const good = it.lowerIsBetter ? c <= 0 : c >= 0;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return (
          <div key={it.name} className="rounded-xl border border-line bg-white p-3">
            <div className="truncate text-[11px] font-medium text-muted">{it.name}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold tabular-nums text-navy-900">{it.format(last)}</span>
              <span className={cn("text-[10px] font-semibold tabular-nums", good ? "text-emerald-600" : "text-red-600")}>{signed(c, 0)}</span>
            </div>
            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={it.values} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs><linearGradient id={`sm-${i}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.3} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => it.format(Number(v))} labelFormatter={(_, p) => (p?.[0]?.payload as { m?: string } | undefined)?.m ?? ""} />
                  <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.6} fill={`url(#sm-${i})`} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Charts({ model, area, period, f, setLine, setCustomer }: { model: BIModel; area: BizArea; period: Period; f: Filters; setLine: (i: number) => void; setCustomer: (i: number) => void }) {
  const t = useT();
  const tp = (s: string) => tPart(t, s);
  const w = periodWindows(period);
  const ms = w.chart.map((i) => ({ i, label: monthLabel(t, MONTH_LABELS[i]), m: model.months[i] }));
  const cur = w.cur.map((i) => model.months[i]);

  if (area === "financial") {
    const combo = ms.map(({ label, m }) => ({ label, revenue: +revenue(m, f).toFixed(2), margin: +grossMargin(m, f).toFixed(1) }));
    const costs = ms.map(({ label, m }) => ({ label, Materials: +m.cost.materials.toFixed(2), Labour: +m.cost.labour.toFixed(2), Energy: +m.cost.energy.toFixed(2), Overhead: +m.cost.overhead.toFixed(2) }));
    const byLine = model.lines.map((name, li) => ({ name: tp(name), value: sum(cur.map((m) => lineRevenue(m, li, { line: -1, customer: f.customer }))) }));
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title={t("Revenue & gross margin")} subtitle={t("Bars: EGP M · Line: margin %")} className="lg:col-span-2" height="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combo} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEF1F5" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <YAxis yAxisId="r" orientation="right" tick={axisTick} tickLine={false} axisLine={false} unit="%" width={40} domain={[0, 50]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => (n === t("Gross margin") ? `${Number(v).toFixed(1)}%` : egp(Number(v)))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="revenue" name={t("Revenue")} fill={CHART_COLORS[1]} radius={[5, 5, 0, 0]} maxBarSize={34} />
              <Line yAxisId="r" dataKey="margin" name={t("Gross margin")} stroke={CHART_COLORS[0]} strokeWidth={2.4} dot={{ r: 2.5 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title={t("Cost of goods structure")} subtitle={t("EGP M, stacked")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={costs} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEF1F5" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => egp(Number(v))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {["Materials", "Labour", "Energy", "Overhead"].map((k, i) => <Area key={k} type="monotone" dataKey={k} name={t(k)} stackId="c" stroke={CHART_COLORS[[1, 0, 2, 7][i]]} fill={CHART_COLORS[[1, 0, 2, 7][i]]} fillOpacity={0.55} />)}
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title={t("Revenue by product line")} subtitle={t("Click to drill down")}>
          <Donut data={byLine} onPick={(i) => setLine(f.line === i ? -1 : i)} active={f.line} format={egp} />
        </ChartBox>
      </div>
    );
  }

  if (area === "sales") {
    const stacked = ms.map(({ label, m }) => Object.fromEntries([["label", label], ...model.lines.map((n, li) => [n, +lineRevenue(m, li, { line: -1, customer: f.customer }).toFixed(2)])]));
    const byCust = model.customers.map((name, ci) => ({ name: tp(name), value: sum(cur.map((m) => m.rev.reduce((a, row, li) => (f.line < 0 || f.line === li ? a + row[ci] : a), 0))) }));
    const multiples = model.customers.map((name, ci) => ({
      name: tp(name), format: egp,
      values: ms.map(({ label, m }) => ({ m: label, v: m.rev.reduce((a, row, li) => (f.line < 0 || f.line === li ? a + row[ci] : a), 0) })),
    }));
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title={t("Revenue by product line")} subtitle={t("EGP M, stacked")} className="lg:col-span-2" height="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stacked} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEF1F5" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => egp(Number(v))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {model.lines.map((n, i) => <Area key={n} type="monotone" dataKey={n} name={tp(n)} stackId="s" stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={f.line < 0 || f.line === i ? 0.55 : 0.1} strokeOpacity={f.line < 0 || f.line === i ? 1 : 0.2} />)}
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title={t("Revenue by customer")} subtitle={t("Click to filter")}>
          <Donut data={byCust} onPick={(i) => setCustomer(f.customer === i ? -1 : i)} active={f.customer} format={egp} />
        </ChartBox>
        <ChartBox title={t("Customer trends")} subtitle={t("Small multiples, EGP M / month")} height="h-auto">
          <SmallMultiples items={multiples} />
        </ChartBox>
      </div>
    );
  }

  if (area === "production") {
    const combo = ms.map(({ label, m }) => ({ label, units: m.units, oee: +oeeAvg(m).toFixed(1) }));
    const multiples = model.prodLines.map((name, li) => ({ name: t("OEE · {line}", { line: tp(name) }), format: (v: number) => `${v.toFixed(1)}%`, values: ms.map(({ label, m }) => ({ m: label, v: m.oee[li] })), lowerIsBetter: false }));
    multiples.push({ name: t("Scrap rate"), lowerIsBetter: true, format: (v: number) => `${v.toFixed(1)}%`, values: ms.map(({ label, m }) => ({ m: label, v: m.scrap })) });
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title={model.oeeEstimated ? t("Output & estimated OEE") : t("Output & OEE")} subtitle={t("Bars: {unit} · Line: OEE %", { unit: t(model.unitLabel) })} className="lg:col-span-2" height="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combo} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEF1F5" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <YAxis yAxisId="r" orientation="right" tick={axisTick} tickLine={false} axisLine={false} unit="%" width={40} domain={[40, 100]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => (n === t("OEE") ? `${Number(v).toFixed(1)}%` : Number(v).toLocaleString("en-US"))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="units" name={t("Output ({unit})", { unit: t(model.unitLabel) })} fill={CHART_COLORS[4]} radius={[5, 5, 0, 0]} maxBarSize={34} />
              <Line yAxisId="r" dataKey="oee" name={t("OEE")} stroke={CHART_COLORS[1]} strokeWidth={2.4} dot={{ r: 2.5 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title={t("By production line")} subtitle={t("Small multiples")} height="h-auto"><SmallMultiples items={multiples} /></ChartBox>
        <ChartBox title={t("Downtime by reason")} subtitle={t("Hours, period total (illustrative)")}>
          <Donut data={model.downtime.map((d) => ({ name: t(d.name), value: d.hours * (w.cur.length / 3) }))} format={(v) => `${v.toFixed(0)} h`} />
        </ChartBox>
      </div>
    );
  }

  if (area === "hr") {
    const stacked = ms.map(({ label, m }) => Object.fromEntries([["label", label], ...model.departments.map((d, di) => [d, m.headcount[di]])]));
    const combo = ms.map(({ label, m }) => ({ label, absenteeism: +m.absenteeism.toFixed(2), turnover: +m.turnover.toFixed(2) }));
    const last = model.months[w.cur[w.cur.length - 1]];
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartBox title={t("Headcount by department")} subtitle={t("Stacked")} className="lg:col-span-2" height="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stacked} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEF1F5" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {model.departments.map((d, i) => <Area key={d} type="monotone" dataKey={d} name={t(d)} stackId="h" stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.5} />)}
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title={t("Absenteeism & monthly turnover")} subtitle="%">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combo} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEF1F5" />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="%" width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="absenteeism" name={t("Absenteeism")} fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Line dataKey="turnover" name={t("Turnover")} stroke={CHART_COLORS[5]} strokeWidth={2.2} dot={false} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartBox>
        <ChartBox title={t("Workforce mix")} subtitle={monthLabel(t, MONTH_LABELS[w.cur[w.cur.length - 1]])}>
          <Donut data={model.departments.map((d, i) => ({ name: t(d), value: last.headcount[i] }))} format={(v) => `${Math.round(v)}`} />
        </ChartBox>
      </div>
    );
  }

  // operations
  const combo = ms.map(({ label, m }) => ({ label, scrap: +m.scrap.toFixed(2), otd: +m.otd.toFixed(1) }));
  const multiples = [
    { name: t("Order lead time"), format: (v: number) => `${v.toFixed(1)} d`, values: ms.map(({ label, m }) => ({ m: label, v: m.leadTime })), lowerIsBetter: true },
    { name: t("Inventory days"), format: (v: number) => `${v.toFixed(0)} d`, values: ms.map(({ label, m }) => ({ m: label, v: m.inventoryDays })), lowerIsBetter: true },
    { name: t(`Energy per ${model.unitLabel.replace(/s$/, "")}`), format: (v: number) => `${v.toFixed(2)} kWh`, values: ms.map(({ label, m }) => ({ m: label, v: m.energyPerUnit })), lowerIsBetter: true },
    { name: t("Cash conversion cycle"), format: (v: number) => `${v.toFixed(0)} d`, values: ms.map(({ label, m }) => ({ m: label, v: m.ccc })), lowerIsBetter: true },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartBox title={t("On-time delivery & scrap")} subtitle={t("Bars: scrap % · Line: OTD %")} className="lg:col-span-2" height="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combo} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF1F5" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis yAxisId="l" tick={axisTick} tickLine={false} axisLine={false} unit="%" width={44} domain={[0, 8]} />
            <YAxis yAxisId="r" orientation="right" tick={axisTick} tickLine={false} axisLine={false} unit="%" width={40} domain={[60, 100]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${Number(v).toFixed(1)}%`} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="l" dataKey="scrap" name={t("Scrap")} fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} maxBarSize={30} fillOpacity={0.8} />
            <Line yAxisId="r" dataKey="otd" name={t("On-time delivery")} stroke={CHART_COLORS[0]} strokeWidth={2.4} dot={{ r: 2.5 }} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartBox>
      <ChartBox title={t("Operational efficiency")} subtitle={t("Small multiples")} height="h-auto"><SmallMultiples items={multiples} /></ChartBox>
      <ChartBox title={t("Causes of late deliveries")} subtitle={t("Share of late orders (illustrative)")}>
        <Donut data={model.lateCauses.map((c) => ({ name: t(c.name), value: c.share }))} format={(v) => `${v.toFixed(0)}%`} />
      </ChartBox>
    </div>
  );
}

// ---------------- Drill-down ----------------
function DrillTable({ model, period, f, onFocusLine, onFocusCustomer }: { model: BIModel; period: Period; f: Filters; onFocusLine: (i: number) => void; onFocusCustomer: (i: number) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const t = useT();
  const w = periodWindows(period);
  const cur = w.cur.map((i) => model.months[i]), cmp = w.cmp.map((i) => model.months[i]);
  const total = sum(cur.map((m) => revenue(m, { line: -1, customer: -1 })));
  const rows = model.lines.map((name, li) => {
    const rev = sum(cur.map((m) => lineRevenue(m, li, { line: -1, customer: -1 })));
    const prev = sum(cmp.map((m) => lineRevenue(m, li, { line: -1, customer: -1 })));
    const margin = avg(cur.map((m) => grossMargin(m, { line: li, customer: -1 })));
    const custs = model.customers.map((c, ci) => ({ c, ci, rev: sum(cur.map((m) => m.rev[li][ci])), prev: sum(cmp.map((m) => m.rev[li][ci])) }));
    return { name, li, rev, prev, margin, custs };
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-start text-xs">
        <thead className="bg-canvas text-[10.5px] uppercase tracking-wider text-muted">
          <tr><th className="px-5 py-2 text-start font-semibold">{t("Product line / customer")}</th><th className="px-3 py-2 text-end font-semibold">{t("Revenue")}</th><th className="px-3 py-2 text-end font-semibold">{t("Share")}</th><th className="px-3 py-2 text-end font-semibold">{t("Growth")}</th><th className="px-3 py-2 text-end font-semibold">{t("Gross margin")}</th><th className="px-5 py-2" /></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const isOpen = open === r.li;
            return (
              <Fragment key={r.name}>
                <tr className={cn("hover:bg-canvas/70", f.line === r.li && "bg-teal-50/50")}>
                  <td className="px-5 py-2.5">
                    <button type="button" onClick={() => setOpen(isOpen ? null : r.li)} aria-expanded={isOpen} className="inline-flex items-center gap-1.5 font-semibold text-navy-900">
                      {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5 rtl:-scale-x-100" />}
                      <span className="size-2 rounded-sm" style={{ backgroundColor: CHART_COLORS[r.li] }} />{tPart(t, r.name)}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-navy-900">{egp(r.rev)}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-muted">{((r.rev / total) * 100).toFixed(0)}%</td>
                  <td className={cn("px-3 py-2.5 text-end tabular-nums font-medium", r.rev >= r.prev ? "text-emerald-600" : "text-red-600")}>{signed(chg(r.rev, r.prev))}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-navy-800">{r.margin.toFixed(1)}%</td>
                  <td className="px-5 py-2.5 text-end"><Button size="sm" variant="ghost" className="h-7" onClick={() => onFocusLine(f.line === r.li ? -1 : r.li)}>{f.line === r.li ? t("Unfocus") : t("Focus")}</Button></td>
                </tr>
                {isOpen ? r.custs.map((c) => (
                  <tr key={c.c} className="bg-canvas/40">
                    <td className="py-2 ps-12 pe-3 text-navy-700">{tPart(t, c.c)}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-navy-800">{egp(c.rev)}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-muted">{t("{pct}% of line", { pct: ((c.rev / r.rev) * 100).toFixed(0) })}</td>
                    <td className={cn("px-3 py-2 text-end tabular-nums", c.rev >= c.prev ? "text-emerald-600" : "text-red-600")}>{signed(chg(c.rev, c.prev))}</td>
                    <td className="px-3 py-2" />
                    <td className="px-5 py-2 text-end"><Button size="sm" variant="ghost" className="h-7" onClick={() => { onFocusLine(r.li); onFocusCustomer(c.ci); }}>{t("Drill in")}</Button></td>
                  </tr>
                )) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Workspace ----------------
export default function EnterpriseBI({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<BIData>(service.id, seed);
  const model = useMemo(() => buildModel(factory), [factory]);
  const ai = useSimulatedAI();
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const tp = (s: string) => tPart(t, s);
  const renderMsg = (m: InsightMsg) => t(m.k, m.v ? Object.fromEntries(Object.entries(m.v).map(([key, v]) => [key, typeof v === "string" ? tp(v) : v])) : undefined);
  const insightTitle = (ins: Insight) => (locale === "ar" && ins.i18n ? renderMsg(ins.i18n.title) : ins.title);
  const insightText = (ins: Insight) => (locale === "ar" && ins.i18n ? ins.i18n.text.map(renderMsg).join(" ") : ins.text);
  const f: Filters = { line: data.line, customer: data.customer };
  const w = periodWindows(data.period);
  const cur = w.cur.map((i) => model.months[i]), cmp = w.cmp.map((i) => model.months[i]);
  const trend = w.chart.map((i) => model.months[i]);
  const ctx = contextKey(data.period, data.area, f);
  const stale = data.insights?.context !== ctx;

  const k = {
    rev: sum(cur.map((m) => revenue(m, f))), revP: sum(cmp.map((m) => revenue(m, f))),
    gm: avg(cur.map((m) => grossMargin(m, f))), gmP: avg(cmp.map((m) => grossMargin(m, f))),
    oee: avg(cur.map(oeeAvg)), oeeP: avg(cmp.map(oeeAvg)),
    otd: avg(cur.map((m) => m.otd)), otdP: avg(cmp.map((m) => m.otd)),
    hc: sum(cur[cur.length - 1].headcount), hcP: sum(cmp[cmp.length - 1].headcount),
    ccc: cur[cur.length - 1].ccc, cccP: cmp[cmp.length - 1].ccc,
  };

  const set = (patch: Partial<BIData>) => setData((p) => ({ ...p, ...patch }));
  const generate = () =>
    ai.run("insights", () => set({ insights: { context: ctx, items: generateInsights(model, data.period, data.area, f) } }), 1000);

  const scopeChips = [
    data.line >= 0 ? { label: model.lines[data.line], clear: () => set({ line: -1 }) } : null,
    data.customer >= 0 ? { label: model.customers[data.customer], clear: () => set({ customer: -1 }) } : null,
  ].filter((c): c is { label: string; clear: () => void } => c !== null);

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={t("BI figures are generated mock data shaped to the factory profile; no accounting, ERP or MES connection is made.")}>
      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
        {/* BI toolbar */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 px-4 pt-4 text-white md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300"><Gauge className="size-3.5" /> {t("Executive cockpit")}</div>
              <div className="mt-0.5 truncate text-lg font-semibold">{factory.name} · {t(w.label)}</div>
              <div className="text-xs text-white/60">{t("vs {cmp} · model refreshed nightly (simulated) · all values fictional", { cmp: t(w.cmpLabel) })}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-white/10 p-1" role="group" aria-label={t("Period")}>
                {PERIODS.map((p) => (
                  <button key={p.id} type="button" aria-pressed={data.period === p.id} onClick={() => set({ period: p.id })}
                    className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white", data.period === p.id && "bg-white text-navy-900 hover:text-navy-900")}>{t(p.label)}</button>
                ))}
              </div>
              <label className="sr-only" htmlFor="bi-line">{t("Product line")}</label>
              <select id="bi-line" value={data.line} onChange={(e) => set({ line: Number(e.target.value) })} className="h-9 max-w-[11rem] rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-300 [&>option]:text-navy-900">
                <option value={-1}>{t("All product lines")}</option>
                {model.lines.map((l, i) => <option key={l} value={i}>{tp(l)}</option>)}
              </select>
              <label className="sr-only" htmlFor="bi-cust">{t("Customer")}</label>
              <select id="bi-cust" value={data.customer} onChange={(e) => set({ customer: Number(e.target.value) })} className="h-9 max-w-[11rem] rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-300 [&>option]:text-navy-900">
                <option value={-1}>{t("All customers")}</option>
                {model.customers.map((c, i) => <option key={c} value={i}>{tp(c)}</option>)}
              </select>
            </div>
          </div>
          <nav className="-mb-px mt-4 flex gap-1 overflow-x-auto" aria-label={t("Business area")}>
            {AREAS.map((a) => (
              <button key={a.id} type="button" aria-current={data.area === a.id ? "page" : undefined} onClick={() => set({ area: a.id })}
                className={cn("shrink-0 rounded-t-xl px-4 py-2.5 text-sm font-medium text-white/70 transition hover:text-white", data.area === a.id && "bg-canvas text-navy-900 hover:text-navy-900")}>{t(a.label)}</button>
            ))}
          </nav>
        </div>

        <div className="bg-canvas p-4 md:p-6">
          {scopeChips.length ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-muted"><Filter className="size-3.5" /> {t("Filtered to")}</span>
              {scopeChips.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1 rounded-full bg-navy-900 py-1 ps-3 pe-1 font-medium text-white">
                  {tp(c.label)}
                  <button type="button" onClick={c.clear} className="rounded-full p-0.5 hover:bg-white/20" aria-label={t("Clear {label} filter", { label: tp(c.label) })}><X className="size-3" /></button>
                </span>
              ))}
              <span className="text-muted">{t("· revenue & margin KPIs follow filters; operational KPIs are factory-wide")}</span>
            </div>
          ) : null}

          {/* KPI strip */}
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiTile label={t("Revenue")} value={egp(k.rev)} delta={signed(chg(k.rev, k.revP))} tone={k.rev >= k.revP ? "good" : "bad"} icon={<BadgeDollarSign />} hint={<Spark values={trend.map((m) => revenue(m, f))} color={CHART_COLORS[1]} />} />
            <KpiTile label={t("Gross margin")} value={`${k.gm.toFixed(1)}%`} delta={signed(k.gm - k.gmP, 1, t(" pts"))} tone={k.gm >= k.gmP ? "good" : "bad"} icon={<Percent />} hint={<Spark values={trend.map((m) => grossMargin(m, f))} color={CHART_COLORS[0]} />} />
            <KpiTile label={model.oeeEstimated ? t("OEE (est.)") : t("OEE")} value={`${k.oee.toFixed(1)}%`} delta={signed(k.oee - k.oeeP, 1, t(" pts"))} tone={k.oee >= k.oeeP ? "good" : "bad"} icon={<FactoryIcon />} hint={<Spark values={trend.map(oeeAvg)} color={CHART_COLORS[3]} />} />
            <KpiTile label={t("On-time delivery")} value={`${k.otd.toFixed(1)}%`} delta={signed(k.otd - k.otdP, 1, t(" pts"))} tone={k.otd >= k.otdP ? "good" : "bad"} icon={<Truck />} hint={<Spark values={trend.map((m) => m.otd)} color={CHART_COLORS[4]} />} />
            <KpiTile label={t("Headcount")} value={k.hc} delta={signed(k.hc - k.hcP, 0, "")} tone="neutral" icon={<Users />} hint={<Spark values={trend.map((m) => sum(m.headcount))} color={CHART_COLORS[2]} />} />
            <KpiTile label={t("Cash conversion")} value={`${k.ccc.toFixed(0)} d`} delta={signed(k.ccc - k.cccP, 0, " d")} tone={k.ccc <= k.cccP ? "good" : "bad"} icon={<Banknote />} hint={<Spark values={trend.map((m) => m.ccc)} color={CHART_COLORS[5]} />} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${data.area}-${data.period}`} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }} className="min-w-0">
                <Charts model={model} area={data.area} period={data.period} f={f} setLine={(i) => set({ line: i })} setCustomer={(i) => set({ customer: i })} />
              </motion.div>
            </AnimatePresence>

            {/* AI insights */}
            <aside className="h-fit rounded-2xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-4 shadow-card xl:sticky xl:top-4" aria-live="polite">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700"><Sparkles className="size-3.5" /> {t("AI management insights")}</div>
                <Button size="sm" variant={stale ? "accent" : "subtle"} onClick={generate} disabled={ai.running === "insights"}>
                  <RefreshCw className={cn(ai.running === "insights" && !reduce && "animate-spin")} /> {ai.running === "insights" ? t("Analysing") : stale ? t("Generate") : t("Refresh")}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted">{t("For {area}", { area: t(AREAS.find((a) => a.id === data.area)?.label ?? "") })} · {t(w.label)}{scopeChips.length ? ` · ${scopeChips.map((c) => tp(c.label)).join(" · ")}` : ""}</p>
              {stale && data.insights ? <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">{t("Filters changed since these insights were generated — regenerate to update.")}</div> : null}
              <ul className={cn("mt-3 space-y-2.5 transition-opacity", (stale || ai.running === "insights") && "opacity-50")}>
                {(data.insights?.items ?? []).map((ins) => (
                  <li key={ins.title} className="rounded-xl border border-line bg-white p-3">
                    <div className="flex items-center gap-2">
                      <StatusPill tone={ins.tone === "good" ? "good" : ins.tone === "warn" ? "warn" : "bad"}>{ins.tone === "good" ? t("Positive") : ins.tone === "warn" ? t("Watch") : t("Action")}</StatusPill>
                      <span className="text-[13px] font-semibold text-navy-900">{insightTitle(ins)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-navy-700">{insightText(ins)}</p>
                  </li>
                ))}
                {!data.insights ? <li className="text-xs text-muted">{t("Generate insights for the current view.")}</li> : null}
              </ul>
              <p className="mt-3 text-[10.5px] text-muted">{t("Generated from the filtered mock dataset with rule-based templates (simulated AI). Verify before decisions.")}</p>
            </aside>
          </div>

          {data.area === "financial" || data.area === "sales" ? (
            <Panel title={t("Drill-down: product line → customer")} description={t("Expand a product line to see its customers; Focus or Drill in applies dashboard filters.")} className="mt-5" bodyClassName="p-0">
              <DrillTable model={model} period={data.period} f={f} onFocusLine={(i) => set({ line: i })} onFocusCustomer={(i) => set({ customer: i })} />
            </Panel>
          ) : null}
        </div>
      </div>
    </WorkspaceFrame>
  );
}
