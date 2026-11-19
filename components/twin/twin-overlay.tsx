"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, Crosshair, Expand, Flame, Layers, MoreHorizontal, RotateCcw, Route, Shrink, Tag, Warehouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Machine, MachineReading } from "@/lib/types";
import { STATUS_COLOR, type TwinLayers } from "./constants";

const LAYER_DEFS: { key: keyof TwinLayers; label: string; icon: React.ReactNode }[] = [
  { key: "sensors", label: "Sensors", icon: <Layers /> },
  { key: "labels", label: "Labels||overlay", icon: <Tag /> },
  { key: "heatmap", label: "Heatmap", icon: <Flame /> },
  { key: "flows", label: "Flow", icon: <Route /> },
];

/** Frosted-glass surface used by every overlay on the 3D canvas. */
export const glass =
  "border border-white/15 bg-white/[0.08] text-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl backdrop-saturate-150";

const glassBtn = "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium transition [&_svg]:size-4";

export function TwinTopBar({
  layers,
  onToggle,
  onReset,
  onFocus,
  canFocus,
  fullscreen,
  onFullscreen,
}: {
  layers: TwinLayers;
  onToggle: (k: keyof TwinLayers) => void;
  onReset: () => void;
  onFocus: () => void;
  canFocus: boolean;
  fullscreen: boolean;
  onFullscreen: () => void;
}) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menu]);

  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex flex-wrap items-start justify-between gap-2">
      <div className={cn(glass, "pointer-events-auto flex h-12 items-center gap-3 rounded-2xl px-4")}>
        <Warehouse className="size-4 text-white/80" />
        <span className="whitespace-nowrap text-sm font-medium">{t("Delta Precision – Shop Floor")}</span>
        <span className="h-5 w-px bg-white/20" />
        <span className="inline-flex items-center gap-1.5 text-[13px] text-white/85">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          {t("Live")}
          <ChevronDown className="size-3.5 text-white/50" />
        </span>
      </div>

      <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
        {LAYER_DEFS.map((l) => (
          <button
            key={l.key}
            type="button"
            aria-pressed={layers[l.key]}
            aria-label={t(`Toggle ${l.label.toLowerCase()}`)}
            onClick={() => onToggle(l.key)}
            className={cn(glassBtn, layers[l.key] ? "bg-white text-navy-900 shadow-lg" : cn(glass, "hover:bg-white/[0.16]"))}
          >
            {l.icon}
            <span className="hidden xl:inline">{t(l.label)}</span>
          </button>
        ))}
        <div ref={menuRef} className="relative">
          <button type="button" aria-label={t("More view options")} aria-expanded={menu} onClick={() => setMenu((m) => !m)} className={cn(glassBtn, glass, "w-10 justify-center px-0 hover:bg-white/[0.16]")}>
            <MoreHorizontal />
          </button>
          <AnimatePresence>
            {menu ? (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className={cn(glass, "absolute end-0 top-12 w-44 rounded-2xl bg-navy-950/60 p-1.5")}
              >
                <button type="button" disabled={!canFocus} onClick={() => { onFocus(); setMenu(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-[13px] hover:bg-white/10 disabled:opacity-40">
                  <Crosshair className="size-4" /> {t("Focus selection")}
                </button>
                <button type="button" onClick={() => { onReset(); setMenu(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-[13px] hover:bg-white/10">
                  <RotateCcw className="size-4" /> {t("Reset view")}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <button type="button" aria-label={fullscreen ? t("Exit full screen") : t("Full screen")} onClick={onFullscreen} className={cn(glassBtn, glass, "w-10 justify-center px-0 hover:bg-white/[0.16]")}>
          {fullscreen ? <Shrink /> : <Expand />}
        </button>
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
  const t = useT();
  const scroller = useRef<HTMLDivElement>(null);
  // In RTL the scroll axis is mirrored, so "start"/"end" buttons flip the sign with the document direction.
  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * 220 * (typeof document !== "undefined" && document.documentElement.dir === "rtl" ? -1 : 1), behavior: "smooth" });
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex items-end justify-between gap-3">
      <div className={cn(glass, "pointer-events-auto flex min-w-0 max-w-full items-center gap-1 rounded-2xl p-1.5 lg:max-w-[calc(100%-300px)]")}>
        <button type="button" aria-label={t("Scroll machines back")} onClick={() => scroll(-1)} className="grid size-9 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white">
          <ChevronLeft className="size-4 rtl:-scale-x-100" />
        </button>
        <div ref={scroller} className="flex min-w-0 gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {machines.map((m) => {
            const r = readings.find((x) => x.machineId === m.id);
            const color = r ? STATUS_COLOR[r.status] : "#94A3B8";
            const active = selectedId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                aria-pressed={active}
                className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[12.5px] font-semibold transition", active ? "text-white" : "bg-white/[0.06] text-white/80 ring-1 ring-inset ring-white/10 hover:bg-white/[0.14] hover:text-white")}
                style={active ? { backgroundColor: `${color}33`, boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                {m.name.split(" ")[0]}
              </button>
            );
          })}
        </div>
        <button type="button" aria-label={t("Scroll machines forward")} onClick={() => scroll(1)} className="grid size-9 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white">
          <ChevronRight className="size-4 rtl:-scale-x-100" />
        </button>
      </div>
      <div className={cn(glass, "pointer-events-auto hidden h-12 shrink-0 items-center gap-4 rounded-2xl px-4 lg:flex")}>
        {([["healthy", "Healthy"], ["watch", "Warning"], ["critical", "Critical"]] as const).map(([s, label]) => (
          <span key={s} className="inline-flex items-center gap-2 text-[13px] text-white/90">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[s], boxShadow: `0 0 10px ${STATUS_COLOR[s]}` }} />
            {t(label)}
          </span>
        ))}
      </div>
    </div>
  );
}
