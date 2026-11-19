"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, ChevronDown, Cloud, Factory, Handshake, Layers, Loader2, Lock, Sparkles, Star, Warehouse, type LucideIcon } from "lucide-react";
import { BuildWithAIButton } from "@/components/shell/shared";
import { CountUp } from "@/components/product/dashboard-kit";
import { requirementState } from "@/components/product/primitives";
import { TIERS, REQUIREMENTS, requirementsForTier } from "@/lib/data/tiers";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn, localName } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { TierLevel } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;
const TIER_ICONS: LucideIcon[] = [Warehouse, Factory, Layers, Cloud, Sparkles];
const softCard = "rounded-[28px] border border-white bg-white/80 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_18px_44px_-24px_rgba(11,31,58,0.22)] backdrop-blur";

export default function RoadmapPage() {
  const { id, factory, state, tier } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const completed = state.completedRequirements;
  const milestones = REQUIREMENTS.filter((r) => completed.includes(r.id)).length;
  const next = tier < 4 ? ((tier + 1) as TierLevel) : null;
  const cur = TIERS[tier];
  // The requirement panel shows the tier you are in; at Tier 0 (no requirements) it shows what reaches Tier 1.
  const panelTier = (tier === 0 ? 1 : tier) as TierLevel;
  const nextReqs = next != null ? requirementsForTier(next) : [];
  const nextBuildable = nextReqs.some((r) => {
    const s = requirementState(r, id, completed, deployments);
    return s.kind === "available" || s.kind === "deploying";
  });
  const continueHref = next == null ? "/certificates" : nextBuildable ? "/solutions" : "/services";
  const CurIcon = TIER_ICONS[tier];

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -end-32 -top-48 size-[640px] rounded-full bg-[radial-gradient(circle,rgba(199,210,254,0.55),transparent_62%)]" />
        <div className="absolute -start-40 top-32 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(153,234,223,0.35),transparent_65%)]" />
      </div>

      {/* Hero */}
      <section className="grid items-center gap-8 pb-8 pt-2 lg:grid-cols-[1fr_auto] lg:pb-10">
        <div>
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] font-semibold uppercase tracking-[0.2em] text-teal-600">
            {t("Transformation roadmap")}
          </motion.div>
          <motion.h1 initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: EASE }} className="mt-3 text-4xl font-bold tracking-[-0.03em] text-navy-900 md:text-[56px] md:leading-[1.05]">
            {localName(factory, locale)} · {t("Tier {tier}", { tier })}
          </motion.h1>
          <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-3 text-lg text-muted md:text-[22px]">
            {t("You are currently in Tier {tier} — {name}", { tier, name: localName(cur, locale) })}
          </motion.p>
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 inline-flex items-center gap-2.5 rounded-2xl bg-white/70 px-4 py-3 text-[15px] font-medium text-navy-900 shadow-sm ring-1 ring-white backdrop-blur">
            <Star className="size-5 text-teal-500" />
            <span>
              <CountUp value={milestones} /> {t("milestones completed")}{next != null ? ` · ${t("Next goal: Tier {tier} {name}", { tier: next, name: localName(TIERS[next], locale) })}` : ` · ${t("All tiers complete")}`}
            </span>
          </motion.div>
        </div>

        <TierShield tier={tier} />
      </section>

      {/* Tier track */}
      <motion.section initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: EASE }} className={cn(softCard, "px-4 py-8 md:px-10 md:py-10")}>
        <TierTrack tier={tier} />
      </motion.section>

      {/* Requirements of the current tier (collapsible) */}
      <RequirementsPanel panelTier={panelTier} reaching={tier === 0} />

      {/* Summary */}
      <motion.section initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35, ease: EASE }} className={cn(softCard, "mt-5 flex flex-col gap-6 p-5 md:p-7 xl:flex-row xl:items-center")}>
        <div className="grid flex-1 gap-5 sm:grid-cols-3 sm:divide-x sm:divide-line">
          <SummaryStat icon={<CurIcon className="size-6" />} tone="teal" label={t("Current tier")} value={t("Tier {tier}", { tier })} />
          <SummaryStat icon={<Check className="size-6" strokeWidth={3} />} tone="green" label={t("Milestones done")} value={<CountUp value={milestones} />} />
          <SummaryStat icon={next != null ? (() => { const I = TIER_ICONS[next]; return <I className="size-6" />; })() : <Star className="size-6" />} tone="blue" label={t("Next tier")} value={next != null ? t("Tier {tier}", { tier: next }) : t("Complete")} />
        </div>
        <div className="flex flex-col items-stretch gap-2 xl:w-[300px]">
          <Link href={continueHref} className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 px-6 text-[17px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(15,163,150,0.7)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-10px_rgba(15,163,150,0.8)]">
            {next != null ? t("Continue to Tier {tier}", { tier: next }) : t("View certificates")} <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
          <Link href="/assessment" className="group inline-flex items-center justify-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900">
            {t("View assessment")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </motion.section>

      <p className="mt-8 text-center text-xs text-muted">{t("Provisional demo status · tiers are confirmed only after evidence review and inspection.")}</p>
    </div>
  );
}

/** Floating glass shield showing the current tier. */
function TierShield({ tier }: { tier: number }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const Icon = TIER_ICONS[tier];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
      className="relative mx-auto grid size-[260px] place-items-center md:size-[300px] lg:me-8"
    >
      <motion.div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-200/70 via-indigo-200/60 to-violet-300/60 blur-2xl" animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute inset-3 rounded-full bg-white/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.9),0_20px_60px_-20px_rgba(99,102,241,0.55)] ring-[6px] ring-white/60 backdrop-blur-xl" />
      <motion.div aria-hidden className="absolute inset-3 rounded-full border-2 border-indigo-200/80" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} style={{ borderTopColor: "rgba(99,102,241,0.55)" }} />
      <motion.div animate={reduce ? undefined : { y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="relative">
        <svg viewBox="0 0 200 230" className="h-[200px] w-[175px] drop-shadow-[0_18px_30px_rgba(99,102,241,0.35)] md:h-[230px] md:w-[200px]">
          <defs>
            <linearGradient id="shield-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#EEF2FF" />
            </linearGradient>
          </defs>
          <path d="M100,8 C130,22 160,26 186,26 C186,120 160,180 100,222 C40,180 14,120 14,26 C40,26 70,22 100,8 Z" fill="url(#shield-fill)" stroke="#E0E7FF" strokeWidth="3" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pb-6 text-center">
          <Icon className="size-12 text-indigo-500" strokeWidth={2.2} />
          <div className="mt-3 text-[40px] font-bold leading-none tracking-tight text-navy-900">{t("Tier {tier}", { tier })}</div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-navy-700/80">{localName(TIERS[tier], locale)}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Five-step tier track with flowing connectors. */
function TierTrack({ tier }: { tier: number }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <ol className="relative grid grid-cols-5">
        {TIERS.map((td, i) => {
          const done = td.level < tier;
          const current = td.level === tier;
          const nextT = td.level === tier + 1;
          const Icon = TIER_ICONS[td.level];
          return (
            <li key={td.level} className="relative flex flex-col items-center text-center" onMouseEnter={() => setHover(td.level)} onMouseLeave={() => setHover(null)}>
              {/* connector to the next node */}
              {i < TIERS.length - 1 ? (
                <div aria-hidden className="absolute start-1/2 top-[26px] h-1 w-full sm:top-[28px] sm:h-[5px] md:top-[44px]">
                  {done ? (
                    <motion.div className="h-full origin-left rtl:origin-right rounded-full bg-gradient-to-r from-teal-300 to-teal-500" initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.4 + i * 0.2, ease: EASE }} />
                  ) : current ? (
                    <motion.div className="relative h-full origin-left rtl:origin-right overflow-hidden rounded-full bg-gradient-to-r from-sky-300 to-indigo-300" initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.4 + i * 0.2, ease: EASE }}>
                      {!reduce ? <motion.span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent" animate={{ x: ["-100%", "320%"] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1.2 }} /> : null}
                    </motion.div>
                  ) : (
                    <div className="h-full bg-[repeating-linear-gradient(90deg,#CBD5E1_0_8px,transparent_8px_14px)] opacity-80" />
                  )}
                  {done ? (
                    <motion.span className="absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-teal-500 text-white shadow-md ring-4 ring-white md:size-7" initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.2, type: "spring", stiffness: 300, damping: 16 }}>
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  ) : null}
                </div>
              ) : null}

              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.12, type: "spring", stiffness: 260, damping: 18 }}
                whileHover={reduce ? undefined : { y: -4 }}
                className="relative z-10"
              >
                {current && !reduce ? <motion.span aria-hidden className="absolute -inset-3 rounded-full bg-teal-300/40 blur-md" animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }} transition={{ duration: 2.6, repeat: Infinity }} /> : null}
                <span
                  className={cn(
                    "relative grid place-items-center rounded-full transition-shadow",
                    current ? "size-14 bg-gradient-to-br from-teal-50 to-white text-teal-600 shadow-[0_10px_30px_-8px_rgba(15,163,150,0.6)] ring-[4px] ring-teal-300 sm:ring-[5px] md:size-[88px]" : "size-11 bg-gradient-to-br from-white to-slate-100 shadow-[inset_0_2px_6px_rgba(255,255,255,1),0_6px_16px_-8px_rgba(11,31,58,0.3)] ring-1 ring-line sm:size-[60px] md:size-[76px]",
                    nextT && "text-indigo-500 ring-2 ring-indigo-300",
                    done && "text-teal-600",
                    !current && !nextT && !done && "text-slate-400"
                  )}
                >
                  <Icon className={current ? "size-6 md:size-9" : "size-5 md:size-8"} />
                </span>
              </motion.div>
              <div className={cn("mt-3 text-sm font-semibold sm:text-base md:text-2xl", current || nextT ? "text-navy-900" : "text-navy-800/80")}>{t("Tier {tier}", { tier: td.level })}</div>
              <span className={cn("mt-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] md:px-4 md:text-xs", current ? "bg-teal-50 text-teal-700" : nextT ? "hidden bg-sky-100 text-sky-700 sm:inline" : done ? "hidden text-slate-500 sm:inline" : "hidden bg-slate-100 text-slate-500 sm:inline")}>
                {localName(td, locale)}
              </span>
              <AnimatePresence>
                {hover === td.level ? (
                  <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="pointer-events-none absolute -bottom-9 z-20 hidden whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lift md:block">
                    {t(td.tagline)}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RequirementsPanel({ panelTier, reaching }: { panelTier: TierLevel; reaching: boolean }) {
  const { id, state } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const reqs = requirementsForTier(panelTier);
  const met = reqs.filter((r) => state.completedRequirements.includes(r.id)).length;
  const panelDef = TIERS[panelTier];
  const t = useT();
  const { locale } = useLocale();

  return (
    <motion.section initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28, ease: EASE }} className={cn(softCard, "mt-5 overflow-hidden")}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 px-5 py-5 text-start transition hover:bg-white/60 md:px-7">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          {(() => { const I = TIER_ICONS[panelTier]; return <I className="size-6" />; })()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-navy-900">{reaching ? t("Requirements to reach Tier {tier}", { tier: panelTier }) : t("Tier {tier} requirements", { tier: panelTier })}</span>
          <span className="block text-sm text-muted">{localName(panelDef, locale)} · {t("{met} of {total} met", { met, total: reqs.length })}</span>
        </span>
        <span className="hidden h-2 w-32 overflow-hidden rounded-full bg-navy-900/[0.06] sm:block">
          <motion.span className="block h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600" initial={reduce ? false : { width: 0 }} animate={{ width: `${(met / reqs.length) * 100}%` }} transition={{ duration: 0.9, delay: 0.5, ease: EASE }} />
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }} className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-navy-700">
          <ChevronDown className="size-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE }} className="overflow-hidden">
            <ul className="space-y-2.5 border-t border-line px-5 pb-6 pt-4 md:px-7">
              {reqs.map((r, i) => {
                const s = requirementState(r, id, state.completedRequirements, deployments);
                return (
                  <motion.li
                    key={r.id}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.35 }}
                    className={cn("flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center", s.kind === "met" ? "bg-emerald-50/60" : "bg-canvas/80")}
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", s.kind === "met" ? "bg-teal-500 text-white" : "bg-white text-slate-400 ring-1 ring-line")}>
                      {s.kind === "met" ? <Check className="size-4" strokeWidth={3} /> : s.kind === "deploying" ? <Loader2 className="size-4 animate-spin text-teal-600" /> : <Lock className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-navy-900">{t(r.title)}</div>
                      <div className="text-[13px] text-muted">{t(r.description)}</div>
                    </div>
                    <div className="flex items-center gap-2 ps-12 sm:ps-0">
                      {s.kind === "met" ? (
                        <span className="rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-emerald-700">{t("Met")}</span>
                      ) : s.kind === "available" || s.kind === "deploying" ? (
                        <BuildWithAIButton solutionId={s.solution.id} size="sm" className="rounded-full" label="Build with AI" />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy-600 ring-1 ring-line"><Handshake className="size-3.5" /> {t("Partner solution")}</span>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function SummaryStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: "teal" | "green" | "blue" }) {
  const tones = { teal: "bg-teal-50 text-teal-600", green: "bg-emerald-50 text-emerald-600", blue: "bg-sky-50 text-sky-600" } as const;
  return (
    <div className="flex items-center gap-4 sm:px-6 sm:first:ps-0">
      <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", tones[tone])}>{icon}</span>
      <div>
        <div className="text-sm text-navy-700">{label}</div>
        <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-navy-900 md:text-[28px]">{value}</div>
      </div>
    </div>
  );
}
