"use client";

import { motion, useReducedMotion } from "motion/react";
import { Activity, Check, Globe, Lock, ShieldCheck } from "lucide-react";
import { TIERS } from "@/lib/data/tiers";
import { SOLUTIONS } from "@/lib/data/solutions";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Deployment, FactoryId, Requirement, Solution, SolutionId, TierLevel } from "@/lib/types";

// ---------------- Score ring ----------------
export function ScoreRing({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
  dark,
  color = "var(--color-teal-500)",
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  dark?: boolean;
  color?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const t = useT();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }} role="img" aria-label={t("{value} out of 100", { value: Math.round(v) })}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={dark ? "stroke-white/10" : "stroke-navy-900/[0.06]"} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={cn("font-semibold tabular-nums tracking-tight", dark ? "text-white" : "text-navy-900")} style={{ fontSize: size * 0.24 }}>
            {label ?? Math.round(v)}
          </div>
          {sublabel ? <div className={cn("text-[11px] font-medium uppercase tracking-wider", dark ? "text-white/50" : "text-muted")}>{sublabel}</div> : null}
        </div>
      </div>
    </div>
  );
}

// ---------------- Solution icon ----------------
export function SolutionIcon({ icon, className }: { icon: Solution["icon"]; className?: string }) {
  const Icon = icon === "globe" ? Globe : icon === "shield" ? ShieldCheck : Activity;
  return <Icon className={className} aria-hidden />;
}

// ---------------- Requirement status ----------------
export type RequirementState =
  | { kind: "met" }
  | { kind: "deploying"; solution: Solution }
  | { kind: "available"; solution: Solution }
  | { kind: "partner"; solution?: Solution };

/** Classify a requirement for the given factory. Pure — pass store slices in. */
export function requirementState(
  req: Requirement,
  factoryId: FactoryId,
  completed: string[],
  deployments: Record<string, Deployment>
): RequirementState {
  if (completed.includes(req.id)) return { kind: "met" };
  if (req.satisfiedBy) {
    const sol = SOLUTIONS[req.satisfiedBy];
    if (sol.factory !== factoryId) return { kind: "partner", solution: sol };
    const dep = deployments[`${factoryId}:${sol.id}`];
    if (dep?.status === "running") return { kind: "deploying", solution: sol };
    return { kind: "available", solution: sol };
  }
  return { kind: "partner" };
}

export const CATEGORY_LABELS: Record<Requirement["category"], string> = {
  presence: "Presence",
  governance: "Governance",
  operations: "Operations",
  finance: "Finance",
  people: "People",
  safety: "Safety",
  supply: "Supply chain",
  quality: "Quality",
  ai: "AI",
  security: "Security",
  export: "Export",
};

// ---------------- Tier ladder ----------------
/** Horizontal 5-step tier ladder. Current tier highlighted; `target` optionally marked. */
export function TierLadder({ tier, target, dark, className }: { tier: TierLevel; target?: TierLevel | null; dark?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const tr = useT();
  const { locale } = useLocale();
  return (
    <ol className={cn("grid grid-cols-5 gap-1.5 sm:gap-2", className)} aria-label={tr("Current tier {tier} of 4", { tier })}>
      {TIERS.map((t, i) => {
        const reached = t.level <= tier;
        const current = t.level === tier;
        const isTarget = target != null && t.level === target;
        return (
          <li key={t.level} className="min-w-0">
            <div className={cn("relative h-1.5 overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-navy-900/[0.07]")}>
              {reached ? (
                <motion.div
                  className="absolute inset-y-0 start-0 rounded-full"
                  style={{ backgroundColor: t.color }}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.08 }}
                />
              ) : null}
              {isTarget && !reached ? <div className="absolute inset-0 rounded-full" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${t.color}55 0 4px, transparent 4px 8px)` }} /> : null}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  reached ? "text-white" : dark ? "bg-white/10 text-white/50" : "bg-navy-900/[0.06] text-navy-500"
                )}
                style={reached ? { backgroundColor: t.color } : undefined}
              >
                {reached && !current ? <Check className="size-3" strokeWidth={3} /> : t.level}
              </span>
              <span className={cn("hidden truncate text-xs font-medium sm:block", current ? (dark ? "text-white" : "text-navy-900") : dark ? "text-white/45" : "text-muted")}>{locale === "ar" ? t.nameAr : t.name}</span>
            </div>
            {current ? <div className={cn("mt-0.5 hidden text-[10px] font-semibold uppercase tracking-wider sm:block", dark ? "text-teal-300" : "text-teal-600")}>{tr("You are here")}</div> : null}
            {isTarget && !current ? <div className={cn("mt-0.5 hidden text-[10px] font-semibold uppercase tracking-wider sm:block", dark ? "text-gold-300" : "text-gold-600")}>{tr("Next target")}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Small status pill for a requirement. */
export function RequirementPill({ state }: { state: RequirementState }) {
  const t = useT();
  if (state.kind === "met")
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"><Check className="size-3" /> {t("Met")}</span>;
  if (state.kind === "deploying")
    return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200"><span className="size-1.5 animate-pulse rounded-full bg-teal-500" /> {t("Deploying")}</span>;
  if (state.kind === "available")
    return <span className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-600 ring-1 ring-inset ring-gold-300/60">{t("Jahez AI can build")}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-navy-900/5 px-2 py-0.5 text-[11px] font-semibold text-navy-600"><Lock className="size-3" /> {t("Missing")}</span>;
}

export const isSolutionId = (v: unknown): v is SolutionId => typeof v === "string" && Object.prototype.hasOwnProperty.call(SOLUTIONS, v);
