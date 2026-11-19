"use client";

// Shared dark hero pieces for both dashboard experiences (command center style).
import { motion, useReducedMotion } from "motion/react";
import { ArrowUp, Check } from "lucide-react";
import { CountUp } from "@/components/product/dashboard-kit";
import { TIERS, tierDef } from "@/lib/data/tiers";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

export const EASE = [0.16, 1, 0.3, 1] as const;
export const softCard = "rounded-[24px] border border-white bg-white/85 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_16px_40px_-22px_rgba(11,31,58,0.25)] backdrop-blur";

export function HeroBackdrop() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <motion.div
        className="absolute left-[62%] top-[-50%] h-[200%] w-44 rotate-[32deg] bg-gradient-to-b from-sky-300/0 via-sky-200/35 to-violet-400/0 blur-2xl"
        animate={reduce ? undefined : { opacity: [0.45, 0.85, 0.45], x: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[48%] top-[18%] size-[1400px] rounded-full"
        style={{ background: "radial-gradient(circle, #0A1530 58%, transparent 60%)", boxShadow: "0 -2px 50px 8px rgba(165,180,252,0.45), inset 0 12px 70px rgba(147,197,253,0.5), inset 0 2px 6px rgba(224,231,255,0.85)" }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 160, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute left-[48%] top-[18%] size-[1400px] rounded-full opacity-70 blur-2xl"
        style={{ background: "conic-gradient(from 300deg, transparent 0deg, rgba(129,140,248,0.5) 30deg, rgba(56,189,248,0.35) 70deg, transparent 120deg)" }}
        animate={reduce ? undefined : { rotate: [0, 25, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(50%_70%_at_0%_100%,rgba(99,102,241,0.18),transparent_60%)]" />
    </div>
  );
}

/** Animated tier path: a gradient track with one node per tier. */
export function TierPath({ tier, next, done, total, ratio }: { tier: number; next: number | null; done: number; total: number; ratio: number }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const tierName = (level: number) => { const d = tierDef(level); return locale === "ar" ? d.nameAr : d.name; };
  // Fill reaches the current node, plus partial progress toward the next one.
  const fill = Math.min(1, (tier + (next != null ? ratio : 0)) / 4);
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45, ease: EASE }} className="mt-4 grid gap-6 rounded-[20px] bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur-md md:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/25 px-3 py-1 text-[13px] font-semibold text-indigo-100 ring-1 ring-indigo-300/30">
            <ArrowUp className="size-3.5" /> {t("Tier {tier}", { tier })}
          </span>
          <span className="text-white/85">
            {tierName(tier)}{next != null ? <span className="text-white/60"> · {t("{done}/{total} requirements toward Tier {next}", { done, total, next })}</span> : null}
          </span>
        </div>
        <div className="relative mx-2 mt-7 h-14">
          <div className="absolute inset-x-0 top-[9px] h-[3px] rounded-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.25)_0_6px,transparent_6px_11px)]" />
          <motion.div
            className="absolute start-0 top-[9px] h-[3px] rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-sky-400 via-teal-400 to-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${fill * 100}%` }}
            transition={{ duration: 1.4, delay: 0.6, ease: EASE }}
          />
          {TIERS.map((td, i) => {
            const reached = td.level < tier;
            const current = td.level === tier;
            return (
              <motion.div
                key={td.level}
                className="absolute top-0 -translate-x-1/2 text-center rtl:translate-x-1/2"
                style={{ insetInlineStart: `${(i / 4) * 100}%` }}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.12, type: "spring", stiffness: 260, damping: 18 }}
              >
                <span
                  className={cn("mx-auto grid size-[21px] place-items-center rounded-full", reached ? "bg-teal-400 text-navy-950" : current ? "bg-[#070F1F] ring-[3px] ring-indigo-400 shadow-[0_0_14px_rgba(129,140,248,0.9)]" : "bg-[#070F1F] ring-2 ring-white/40")}
                >
                  {reached ? <Check className="size-3" strokeWidth={3} /> : current ? <span className="size-2 rounded-full bg-indigo-300" /> : null}
                </span>
                <div className={cn("mt-2 whitespace-nowrap text-[12px] sm:text-[13px]", current ? "font-semibold text-white" : "hidden text-white/70 sm:block")}>{locale === "ar" ? td.nameAr : td.name}</div>
                {current ? <div className="text-[10px] font-medium text-indigo-300 sm:text-[11px]">{t("Your level")}</div> : null}
              </motion.div>
            );
          })}
        </div>
      </div>
      <div className="border-white/15 lg:border-s lg:ps-8 lg:text-center">
        <div className="text-[13px] text-white/70">{t("Tier {tier} Readiness", { tier: next ?? 4 })}</div>
        <div className="mt-1 text-4xl font-semibold tabular-nums text-gold-300 md:text-[44px]"><CountUp value={Math.round(ratio * 100)} suffix="%" /></div>
      </div>
    </motion.div>
  );
}
