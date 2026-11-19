"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "motion/react";
import { useT } from "@/lib/i18n";

export const STATUS_COLOR = { healthy: "#2DBFB0", watch: "#E5A93B", critical: "#F0564A" } as const;

export function healthColor(h: number) {
  return h < 45 ? STATUS_COLOR.critical : h < 72 ? STATUS_COLOR.watch : STATUS_COLOR.healthy;
}

export function Sparkline({ values, color, className }: { values: number[]; color: string; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / span) * 24 - 2}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={className} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Semicircular failure-probability gauge. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const r = 70;
  const len = Math.PI * r;
  const color = pct > 0.45 ? STATUS_COLOR.critical : pct > 0.15 ? STATUS_COLOR.watch : STATUS_COLOR.healthy;
  const angle = Math.PI * (1 - pct);
  const nx = 90 + Math.cos(angle) * (r - 16);
  const ny = 90 - Math.sin(angle) * (r - 16);
  return (
    <div className="relative" role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
      <svg viewBox="0 0 180 104" className="w-full">
        <defs>
          <linearGradient id="gauge-track" x1="0" x2="1">
            <stop offset="0" stopColor={STATUS_COLOR.healthy} stopOpacity="0.25" />
            <stop offset="0.5" stopColor={STATUS_COLOR.watch} stopOpacity="0.25" />
            <stop offset="1" stopColor={STATUS_COLOR.critical} stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="url(#gauge-track)" strokeWidth="12" strokeLinecap="round" />
        <motion.path
          d="M20 90 A70 70 0 0 1 160 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={len}
          animate={{ strokeDashoffset: len * (1 - pct) }}
          initial={false}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const a = Math.PI * (1 - t);
          return <line key={t} x1={90 + Math.cos(a) * 54} y1={90 - Math.sin(a) * 54} x2={90 + Math.cos(a) * 58} y2={90 - Math.sin(a) * 58} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />;
        })}
        <motion.line x1="90" y1="90" animate={{ x2: nx, y2: ny }} initial={false} transition={{ duration: 0.8, ease: "easeOut" }} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="90" cy="90" r="5" fill="white" />
      </svg>
      <div className="mt-1 text-center text-[28px] font-semibold leading-none tracking-tight tabular-nums" style={{ color }}>{Math.round(pct * 100)}%</div>
    </div>
  );
}

export interface TrendPoint { label: string; value: number }

export function TrendChart({ data, color, baseline, alarm, unit, domain, invert }: { data: TrendPoint[]; color: string; baseline: number; alarm: number; unit: string; domain?: [number, number]; invert?: boolean }) {
  const t = useT();
  const id = `trend-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.35} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} tickLine={false} axisLine={false} domain={domain ?? ["auto", "auto"]} width={44} />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.25)" }}
          contentStyle={{ background: "#0B1F3A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, color: "#fff" }}
          labelStyle={{ color: "rgba(255,255,255,0.55)" }}
          formatter={(v) => [`${v} ${unit}`, t("Reading")]}
        />
        <ReferenceLine y={baseline} stroke="rgba(255,255,255,0.4)" strokeDasharray="4 4" label={{ value: invert ? t("Watch") : t("Baseline"), position: "insideTopLeft", fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
        <ReferenceLine y={alarm} stroke="#F0564A" strokeDasharray="5 3" label={{ value: invert ? t("Critical") : t("Alarm"), position: "insideTopLeft", fill: "#F0564A", fontSize: 10 }} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} dot={false} activeDot={{ r: 4, fill: color, stroke: "#050E1F", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
