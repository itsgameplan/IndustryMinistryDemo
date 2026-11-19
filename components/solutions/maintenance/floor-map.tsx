"use client";

import { useReducedMotion } from "motion/react";
import { useT } from "@/lib/i18n";
import { DELTA_MACHINES } from "@/lib/data/machines";
import type { MachineReading } from "@/lib/types";
import { STATUS_COLOR } from "./charts";
import { shortName } from "./model";

/** Top-down floor plan of the Delta shop floor (same coordinates as the 3D twin). */
export function FloorMap({ readings, selectedId, onSelect }: { readings: MachineReading[]; selectedId: string; onSelect: (id: string) => void }) {
  const reduce = useReducedMotion();
  const t = useT();
  return (
    <svg viewBox="-21 -13 42 26" className="w-full" role="group" aria-label={t("Shop floor map")}>
      <defs>
        <pattern id="floor-grid" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M2 0 L0 0 0 2" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.06" />
        </pattern>
      </defs>
      <rect x="-20" y="-12" width="40" height="24" rx="1.2" fill="url(#floor-grid)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.12" />
      {/* aisles */}
      <rect x="-20" y="-1.6" width="40" height="2" fill="rgba(255,255,255,0.03)" />
      <text x="-19" y="-0.3" fontSize="0.8" fill="rgba(255,255,255,0.3)">{t("MAIN AISLE")}</text>
      <text x="-19" y="-10.6" fontSize="0.8" fill="rgba(255,255,255,0.3)">{t("LINE A · B · C")}</text>
      {DELTA_MACHINES.map((m) => {
        const r = readings.find((x) => x.machineId === m.id);
        const status = r?.status ?? "healthy";
        const color = STATUS_COLOR[status];
        const [x, z] = m.position;
        const sel = m.id === selectedId;
        return (
          <g
            key={m.id}
            role="button"
            tabIndex={0}
            aria-label={`${m.name}, ${t(status === "healthy" ? "Healthy" : status === "watch" ? "Watch" : "Critical")}`}
            aria-pressed={sel}
            onClick={() => onSelect(m.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(m.id); } }}
            className="cursor-pointer outline-none [&:focus-visible>rect:first-of-type]:stroke-teal-300"
          >
            {status === "critical" && !reduce && (
              <circle cx={x} cy={z} r="2.6" fill={color} opacity="0.25">
                <animate attributeName="r" values="2.2;3.8;2.2" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <rect x={x - 2.2} y={z - 1.5} width="4.4" height="3" rx="0.5" fill={sel ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)"} stroke={sel ? "#fff" : color} strokeWidth={sel ? 0.18 : 0.12} />
            <circle cx={x + 1.5} cy={z - 0.8} r="0.35" fill={color} />
            <text x={x} y={z + 0.45} fontSize="0.85" textAnchor="middle" fill={sel ? "#fff" : "rgba(255,255,255,0.75)"} fontWeight={600}>{shortName(m)}</text>
          </g>
        );
      })}
    </svg>
  );
}
