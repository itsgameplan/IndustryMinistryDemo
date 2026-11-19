"use client";

// Private helpers for the HR & Branding workspaces (talent-workforce, hr-analytics, brand-identity, brand-audit).
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** Stable 32-bit hash of a string (FNV-1a). */
export function hashString(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) seeded from a string. */
export function rngFrom(seed: string) {
  let a = hashString(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Simulated AI generation: marks `key` as busy for a short deterministic delay (600–1200 ms),
 * then runs `fn`. No network calls.
 */
export function useSimulatedAI() {
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const run = useCallback((key: string, fn: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    setBusy(key);
    const delay = 600 + (hashString(key) % 600);
    timer.current = setTimeout(() => {
      fn();
      setBusy(null);
      timer.current = null;
    }, delay);
  }, []);
  return { busy, run };
}

/** Circular score ring with animated stroke (respects reduced motion). */
export function ScoreRing({ value, size = 132, stroke = 11, color = "#0FA396", track = "rgba(11,31,58,0.07)", label, sublabel, className, dark }: { value: number; size?: number; stroke?: number; color?: string; track?: string; label?: string; sublabel?: string; className?: string; dark?: boolean }) {
  const reduce = useReducedMotion();
  const t = useT();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = clamp(value, 0, 100) / 100;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={t("{label}: {value} out of 100", { label: label ?? t("Score"), value: Math.round(value) })}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", dark ? "text-white" : "text-navy-900")}>{Math.round(value)}</div>
          {sublabel ? <div className={cn("text-[10px] font-semibold uppercase tracking-wider", dark ? "text-white/60" : "text-muted")}>{sublabel}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Compact segmented control (radio-group semantics). */
export function Segmented<T extends string>({ value, onChange, options, ariaLabel, className, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode; className?: string }[]; ariaLabel: string; className?: string; size?: "sm" | "md" }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-navy-900/[0.05] p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "whitespace-nowrap rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              active ? "bg-white text-navy-900 shadow-sm" : "text-navy-600 hover:text-navy-900",
              o.className
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Shimmer placeholder lines shown while simulated AI is "writing". */
export function WritingShimmer({ lines = 3, className }: { lines?: number; className?: string }) {
  const t = useT();
  return (
    <div className={cn("space-y-2", className)} aria-live="polite" aria-busy="true">
      <span className="sr-only">{t("Generating…")}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="h-3 animate-shimmer rounded bg-[linear-gradient(90deg,#EEF1F5_0%,#F7F9FB_50%,#EEF1F5_100%)] bg-[length:200%_100%]" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

/** Shared chart tooltip styling for Recharts. */
export const TOOLTIP_STYLE = {
  contentStyle: { borderRadius: 12, border: "1px solid #E5E8EE", boxShadow: "0 8px 24px -12px rgba(11,31,58,0.25)", fontSize: 12, padding: "8px 10px" },
  labelStyle: { color: "#0B1F3A", fontWeight: 600, marginBottom: 2 },
  itemStyle: { padding: 0 },
} as const;

export const AXIS_TICK = { fontSize: 11, fill: "#64748B" } as const;
