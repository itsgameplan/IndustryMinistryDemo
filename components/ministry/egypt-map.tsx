"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Governorate } from "@/lib/data/national";

// Simple equirectangular projection tuned for Egypt's bounding box. Illustrative only.
const K = 40;
const COS = 0.87;
const LNG0 = 24.4;
const LAT0 = 31.95;
const W = Math.round((37.1 - LNG0) * K * COS);
const H = Math.round((LAT0 - 21.7) * K);
const project = (lng: number, lat: number): [number, number] => [(lng - LNG0) * K * COS, (LAT0 - lat) * K];
const toPath = (pts: [number, number][], close = false) =>
  pts.map(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + (close ? " Z" : "");

// Approximate outline (lng, lat) — deliberately simplified.
const OUTLINE: [number, number][] = [
  [25.15, 31.57], [26.5, 31.45], [27.24, 31.37], [28.0, 31.1], [28.95, 30.85], [29.6, 31.1], [29.9, 31.25], [30.35, 31.5],
  [31.0, 31.58], [31.6, 31.5], [31.85, 31.53], [32.3, 31.28], [32.7, 31.05], [33.3, 31.1], [33.8, 31.15], [34.22, 31.32],
  [34.55, 30.4], [34.9, 29.5], [34.68, 29.0], [34.5, 28.45], [34.4, 28.1], [34.25, 27.75], [33.85, 28.05], [33.6, 28.25],
  [33.2, 28.85], [32.95, 29.4], [32.56, 29.97], [32.65, 29.4], [32.7, 29.0], [33.1, 28.4], [33.55, 27.75], [33.85, 27.2],
  [33.95, 26.7], [34.3, 26.1], [34.6, 25.6], [34.9, 25.0], [35.3, 24.4], [35.5, 23.95], [35.65, 23.4], [36.2, 22.7],
  [36.9, 22.0], [31.4, 22.0], [25.0, 22.0], [25.0, 29.25], [24.7, 30.15], [24.95, 30.9],
];
const NILE: [number, number][] = [
  [31.45, 22.0], [32.2, 22.9], [32.9, 24.09], [32.85, 24.6], [32.75, 25.3], [32.64, 25.69], [32.72, 26.16], [32.2, 26.2],
  [31.7, 26.55], [31.4, 26.9], [31.18, 27.18], [30.85, 27.8], [30.75, 28.1], [30.95, 28.7], [31.1, 29.07], [31.24, 29.6], [31.22, 30.15],
];
const ROSETTA: [number, number][] = [[31.22, 30.15], [30.9, 30.6], [30.5, 31.0], [30.4, 31.45]];
const DAMIETTA: [number, number][] = [[31.22, 30.15], [31.3, 30.6], [31.5, 31.0], [31.8, 31.5]];
const LAKE_NASSER: [number, number][] = [[31.45, 22.0], [32.2, 22.9], [32.9, 23.98]];
const SUEZ_CANAL: [number, number][] = [[32.3, 31.27], [32.3, 30.6], [32.5, 30.3], [32.56, 29.97]];

export interface MapDatum {
  governorate: Governorate;
  total: number;
  avgScore: number;
  tier3PlusPct: number;
}

const SCORE_STOPS = ["#CCF5EF", "#5FD6C8", "#2DBFB0", "#0FA396", "#0C6962"];
export function scoreColor(score: number) {
  const idx = Math.max(0, Math.min(SCORE_STOPS.length - 1, Math.floor(((score - 15) / 35) * SCORE_STOPS.length)));
  return SCORE_STOPS[idx];
}

export function EgyptMap({ data, selected, onSelect }: { data: MapDatum[]; selected: string | "all"; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.total)), [data]);
  const points = useMemo(
    () => data
      .map((d) => {
        const [x, y] = project(d.governorate.lng, d.governorate.lat);
        return { ...d, x, y, r: d.total ? 3.5 + Math.sqrt(d.total / max) * 10 : 2.5 };
      })
      .sort((a, b) => b.r - a.r),
    [data, max]
  );
  const active = points.find((p) => p.governorate.id === (hover ?? (selected !== "all" ? selected : "")));

  return (
    <div className="relative">
      <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} className="h-auto w-full" role="group" aria-label="Illustrative map of Egypt showing onboarded factories per governorate (simulated data)">
        <defs>
          <linearGradient id="egypt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7F9FB" />
            <stop offset="100%" stopColor="#EEF1F5" />
          </linearGradient>
          <pattern id="egypt-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="#0B1F3A" opacity="0.08" />
          </pattern>
        </defs>
        <path d={toPath(OUTLINE, true)} fill="url(#egypt-fill)" stroke="#CBD5E1" strokeWidth={1.2} strokeLinejoin="round" />
        <path d={toPath(OUTLINE, true)} fill="url(#egypt-dots)" />
        <path d={toPath(LAKE_NASSER)} fill="none" stroke="#BFE7F5" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        {[NILE, ROSETTA, DAMIETTA].map((p, i) => (
          <path key={i} d={toPath(p)} fill="none" stroke="#7CC6E6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <path d={toPath(SUEZ_CANAL)} fill="none" stroke="#7CC6E6" strokeWidth={1} strokeDasharray="2 2" />
        <text x={project(28.2, 25.4)[0]} y={project(28.2, 25.4)[1]} className="fill-navy-900/20 text-[11px] font-semibold uppercase tracking-[0.3em]">Western Desert</text>
        <text x={project(34.0, 31.75)[0]} y={project(34.0, 31.75)[1] - 6} textAnchor="end" className="fill-navy-900/25 text-[9px] font-medium italic">Mediterranean Sea</text>
        <text x={project(35.6, 25.4)[0]} y={project(35.6, 25.4)[1]} className="fill-navy-900/25 text-[9px] font-medium italic">Red Sea</text>

        {points.map((p, i) => {
          const isSel = selected === p.governorate.id;
          const isHover = hover === p.governorate.id;
          return (
            <g
              key={p.governorate.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              aria-label={`${p.governorate.name}: ${p.total.toLocaleString("en-US")} factories, average maturity ${Math.round(p.avgScore)}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHover(p.governorate.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.governorate.id)}
              onBlur={() => setHover(null)}
              onClick={() => onSelect(p.governorate.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p.governorate.id); } }}
            >
              {isSel ? <circle cx={p.x} cy={p.y} r={p.r + 5} fill="none" stroke="#C9A24B" strokeWidth={1.5} strokeDasharray="3 2" /> : null}
              <motion.circle
                cx={p.x}
                cy={p.y}
                initial={{ r: 0 }}
                animate={{ r: p.r * (isHover ? 1.15 : 1) }}
                transition={{ duration: 0.5, delay: i * 0.02, ease: "easeOut" }}
                fill={scoreColor(p.avgScore)}
                fillOpacity={selected === "all" || isSel ? 0.88 : 0.4}
                stroke={isSel || isHover ? "#0B1F3A" : "#fff"}
                strokeWidth={isSel || isHover ? 1.5 : 1}
              />
            </g>
          );
        })}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-white/95 p-2.5 text-xs shadow-lift backdrop-blur"
          style={{ left: `${Math.min(80, Math.max(20, ((active.x + 8) / (W + 16)) * 100))}%`, top: `calc(${((active.y + 8) / (H + 16)) * 100}% - ${active.r + 8}px)` }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-navy-900">{active.governorate.name}</span>
            <span className="font-arabic text-muted" lang="ar">{active.governorate.nameAr}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted">
            <span>Factories</span><span className="text-right font-medium tabular-nums text-navy-900">{active.total.toLocaleString("en-US")}</span>
            <span>Avg maturity</span><span className="text-right font-medium tabular-nums text-navy-900">{Math.round(active.avgScore)}</span>
            <span>Tier 3+</span><span className="text-right font-medium tabular-nums text-navy-900">{active.tier3PlusPct.toFixed(1)}%</span>
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="flex items-end gap-0.5" aria-hidden>
            <span className="size-2 rounded-full border border-navy-500/40" />
            <span className="size-3 rounded-full border border-navy-500/40" />
            <span className="size-4 rounded-full border border-navy-500/40" />
          </span>
          Size = factories onboarded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex overflow-hidden rounded-full" aria-hidden>
            {SCORE_STOPS.map((c) => <span key={c} className="h-2 w-4" style={{ backgroundColor: c }} />)}
          </span>
          Colour = avg maturity score
        </span>
        <span className="italic">Positions approximate · illustrative</span>
      </div>
    </div>
  );
}
