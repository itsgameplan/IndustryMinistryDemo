"use client";

import { Crosshair, Flame, Map as MapIcon, RotateCcw, Route, Tag, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Machine, MachineReading } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL, type TwinLayers } from "./constants";

const LAYER_DEFS: { key: keyof TwinLayers; label: string; icon: React.ReactNode }[] = [
  { key: "sensors", label: "Sensors", icon: <Wifi /> },
  { key: "labels", label: "Labels", icon: <Tag /> },
  { key: "heatmap", label: "Heatmap", icon: <Flame /> },
  { key: "flows", label: "Flows", icon: <Route /> },
];

const glass = "rounded-xl border border-white/10 bg-navy-950/55 text-white shadow-lift backdrop-blur-md";

export function TwinTopBar({
  layers,
  onToggle,
  onReset,
  onFocus,
  canFocus,
}: {
  layers: TwinLayers;
  onToggle: (k: keyof TwinLayers) => void;
  onReset: () => void;
  onFocus: () => void;
  canFocus: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2">
      <div className={cn(glass, "pointer-events-auto flex items-center gap-2.5 px-3 py-2")}>
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-teal-400" />
        </span>
        <div className="leading-tight">
          <div className="text-xs font-semibold">Delta Precision · Shop floor</div>
          <div className="text-[10px] text-white/55">Live twin · simulated telemetry</div>
        </div>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
        <div className={cn(glass, "flex items-center gap-0.5 p-1")} role="group" aria-label="Scene layers">
          {LAYER_DEFS.map((l) => (
            <button
              key={l.key}
              type="button"
              aria-pressed={layers[l.key]}
              onClick={() => onToggle(l.key)}
              title={`Toggle ${l.label.toLowerCase()}`}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition [&_svg]:size-3.5",
                layers[l.key] ? "bg-white text-navy-900 shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              {l.icon}
              <span className="hidden sm:inline">{l.label}</span>
            </button>
          ))}
        </div>
        <div className={cn(glass, "flex items-center gap-0.5 p-1")}>
          <button type="button" onClick={onFocus} disabled={!canFocus} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-40 [&_svg]:size-3.5">
            <Crosshair />
            <span className="hidden sm:inline">Focus</span>
          </button>
          <button type="button" onClick={onReset} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white [&_svg]:size-3.5">
            <RotateCcw />
            <span className="hidden sm:inline">Reset view</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function TwinMachineDock({
  machines,
  readings,
  selectedId,
  onSelect,
}: {
  machines: Machine[];
  readings: MachineReading[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-2">
      <div className={cn(glass, "scrollbar-thin pointer-events-auto flex max-w-full gap-1 overflow-x-auto p-1 lg:max-w-[calc(100%-240px)]")}>
        {machines.map((m) => {
          const r = readings.find((x) => x.machineId === m.id);
          const active = selectedId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition",
                active ? "bg-gold-500 text-navy-950 shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: r ? STATUS_COLOR[r.status] : "#94A3B8" }} />
              {m.name.split(" ")[0]}
            </button>
          );
        })}
      </div>
      <TwinLegend />
    </div>
  );
}

function TwinLegend() {
  return (
    <div className={cn(glass, "pointer-events-auto hidden shrink-0 px-3 py-2 lg:block")}>
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
        <MapIcon className="size-3" /> Legend
      </div>
      <div className="flex items-center gap-3">
        {(["healthy", "watch", "critical"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-white/80">
            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[s], boxShadow: `0 0 8px ${STATUS_COLOR[s]}` }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-white/50">
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-3 rounded bg-teal-400" /> AGV route
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-3 rounded bg-gold-400" /> Material flow
        </span>
      </div>
    </div>
  );
}
