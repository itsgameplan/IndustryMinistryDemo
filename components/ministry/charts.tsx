"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "motion/react";
import { TIERS } from "@/lib/data/tiers";
import type { Aggregate, Sector, SectorId, TrendPoint } from "@/lib/data/national";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

const fmt = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------------------
// Tier distribution
// ---------------------------------------------------------------------------

export function TierDistributionChart({ agg }: { agg: Aggregate }) {
  const tr = useT();
  const { locale } = useLocale();
  const data = TIERS.map((t) => ({
    key: `T${t.level}`,
    name: locale === "ar" ? t.nameAr : t.name,
    count: agg.tiers[t.level],
    pct: agg.total ? (agg.tiers[t.level] / agg.total) * 100 : 0,
    color: t.color,
  }));
  const summary = data.map((d) => `${d.key} ${d.name}: ${fmt(d.count)} (${d.pct.toFixed(1)}%)`).join("; ");
  return (
    <figure dir="ltr" aria-label={`${tr("Tier distribution")}. ${summary}`}>
      {/* 100% strip */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-navy-900/5" aria-hidden>
        {data.map((d) => (
          <motion.div key={d.key} initial={{ width: 0 }} animate={{ width: `${d.pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ backgroundColor: d.color }} />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[10px] text-muted" aria-hidden>
        {data.map((d) => <span key={d.key} className="tabular-nums">{d.pct.toFixed(0)}%</span>)}
      </div>
      <div className="mt-3 h-52" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E5E8EE" strokeDasharray="3 3" />
            <XAxis dataKey="key" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
            <YAxis hide />
            <Tooltip cursor={{ fill: "rgba(11,31,58,0.04)" }} content={<TierTooltip />} />
            <Bar dataKey="count" radius={[8, 8, 2, 2]} maxBarSize={56} animationDuration={700}>
              {data.map((d) => <Cell key={d.key} fill={d.color} />)}
              <LabelList dataKey="count" position="top" formatter={(v) => (typeof v === "number" ? fmt(v) : String(v ?? ""))} style={{ fill: "#0B1F3A", fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-1 grid grid-cols-5 gap-1 text-center text-[10px] font-medium text-navy-600">
        {data.map((d) => <span key={d.key} className="truncate">{d.name}</span>)}
      </figcaption>
    </figure>
  );
}

interface TierTooltipPayload { payload?: { key: string; name: string; count: number; pct: number; color: string } }
function TierTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<TierTooltipPayload> }) {
  const t = useT();
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lift">
      <div className="flex items-center gap-1.5 font-semibold text-navy-900"><span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />{d.key} · {d.name}</div>
      <div className="mt-1 tabular-nums text-muted">{t("{count} factories", { count: fmt(d.count) })} · {d.pct.toFixed(1)}%</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Adoption trend
// ---------------------------------------------------------------------------

export function AdoptionTrendChart({ data }: { data: TrendPoint[] }) {
  const t = useT();
  const last = data[data.length - 1];
  const localized = data.map((d) => ({ ...d, month: t(d.month) }));
  return (
    <figure aria-label={t("Adoption trend over 18 months: {from} to {to} factories onboarded; Tier 3+ factories reached {advanced}.", { from: fmt(data[0]?.onboarded ?? 0), to: fmt(last?.onboarded ?? 0), advanced: fmt(last?.advanced ?? 0) })}>
      <div className="h-64" dir="ltr" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={localized} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="g-onboarded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0FA396" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#0FA396" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="g-advanced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A24B" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#C9A24B" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E5E8EE" strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 10 }} interval={2} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 10 }} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v))} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#0B1F3A", strokeOpacity: 0.15 }} />
            <Area type="monotone" dataKey="onboarded" name={t("Onboarded")} stroke="#0FA396" strokeWidth={2.2} fill="url(#g-onboarded)" animationDuration={900} />
            <Area type="monotone" dataKey="advanced" name={t("Tier 3+")} stroke="#C9A24B" strokeWidth={2} fill="url(#g-advanced)" animationDuration={900} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

interface TrendTooltipPayload { payload?: TrendPoint }
function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: ReadonlyArray<TrendTooltipPayload>; label?: string | number }) {
  const t = useT();
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return (
    <div dir="auto" className="min-w-40 rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lift">
      <div className="font-semibold text-navy-900">{label}</div>
      <div className="mt-1.5 space-y-1">
        <Row color="#0FA396" label={t("Onboarded")} value={d.onboarded} />
        <Row color="#C9A24B" label={t("Tier 3+")} value={d.advanced} />
        <Row color="#4A6591" label={t("Solutions deployed")} value={d.solutions} />
      </div>
    </div>
  );
}
function Row({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-muted"><span className="size-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>
      <span className="font-medium tabular-nums text-navy-900">{fmt(value)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sector × tier heat table
// ---------------------------------------------------------------------------

export interface SectorRow extends Aggregate { sector: Sector }

export function SectorTierHeatTable({ rows, highlight, onSelect }: { rows: SectorRow[]; highlight: SectorId | "all"; onSelect: (id: SectorId) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const sectorName = (s: Sector) => (locale === "ar" ? s.nameAr : s.name);
  return (
    <div className="-mx-5 overflow-x-auto px-5 scrollbar-thin">
      <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
        <caption className="sr-only">{t("Factories by sector and digital maturity tier, shaded by share of the sector (simulated data)")}</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-muted">
            <th scope="col" className="pb-1 text-start font-semibold">{t("Sector")}</th>
            {TIERS.map((tier) => (
              <th key={tier.level} scope="col" className="pb-1 text-center font-semibold">
                <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ backgroundColor: tier.color }} />T{tier.level}</span>
              </th>
            ))}
            <th scope="col" className="pb-1 text-end font-semibold">{t("Total")}</th>
            <th scope="col" className="pb-1 text-end font-semibold">{t("Score")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isHi = highlight === r.sector.id;
            const dim = highlight !== "all" && !isHi;
            return (
              <tr key={r.sector.id} className={cn("transition-opacity", dim && "opacity-45")}>
                <th scope="row" className="py-0.5 pe-2 text-start font-medium">
                  <button type="button" onClick={() => onSelect(r.sector.id)} className={cn("rounded-md px-1.5 py-1 text-start text-navy-900 transition hover:bg-navy-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", isHi && "bg-gold-50 ring-1 ring-gold-300")}>
                    {sectorName(r.sector)}
                  </button>
                </th>
                {r.tiers.map((n, ti) => {
                  const share = r.total ? n / r.total : 0;
                  const alpha = Math.min(1, share * 2.2);
                  return (
                    <td
                      key={ti}
                      className="h-9 rounded-md text-center font-medium tabular-nums"
                      style={{ backgroundColor: `rgba(15, 163, 150, ${0.06 + alpha * 0.8})`, color: alpha > 0.55 ? "#fff" : "#0B1F3A" }}
                      title={`${sectorName(r.sector)} · ${t("Tier {tier}", { tier: ti })}: ${fmt(n)} (${(share * 100).toFixed(1)}%)`}
                    >
                      {fmt(n)}
                    </td>
                  );
                })}
                <td className="ps-2 text-end font-semibold tabular-nums text-navy-900">{fmt(r.total)}</td>
                <td className="ps-2 text-end tabular-nums text-navy-700">{Math.round(r.avgScore)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export readiness pipeline
// ---------------------------------------------------------------------------

export function ExportPipeline({ stages }: { stages: { id: string; label: string; value: number }[] }) {
  const t = useT();
  const { isRtl } = useLocale();
  const dir = isRtl ? "270deg" : "90deg";
  const top = Math.max(1, stages[0]?.value ?? 1);
  return (
    <ol className="space-y-2.5" aria-label={t("Export readiness pipeline (simulated)")}>
      {stages.map((s, i) => {
        const pct = (s.value / top) * 100;
        const conv = i > 0 && stages[i - 1].value ? (s.value / stages[i - 1].value) * 100 : null;
        return (
          <li key={s.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-navy-700">{t(s.label)}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold text-navy-900">{fmt(s.value)}</span>
                {conv !== null ? <span className="ms-1.5 text-[10px] text-muted">{conv.toFixed(0)}%</span> : null}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-navy-900/[0.05]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: i === stages.length - 1 ? `linear-gradient(${dir},#C9A24B,#D1AE5C)` : `linear-gradient(${dir},#0C6962,#0FA396)`, opacity: 1 - i * 0.1 }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

