"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle, ArrowRight, BadgeCheck, Bell, Briefcase, Check, CheckCircle2, ClipboardCheck, Coins, Factory, FileCheck2, Gauge, Globe, HardHat, Layers,
  Map as MapIcon, PartyPopper, SearchCheck, Ship, ShieldCheck, ShieldQuestion, Sparkles, Store, Users,
} from "lucide-react";
import { BuildWithAIButton } from "@/components/shell/shared";
import { AssessmentNudge } from "@/components/product/factory-status";
import { SolutionIcon } from "@/components/product/primitives";
import { ChipLink, CountUp, MaturityCard, SystemsGrid, resolveSystems } from "@/components/product/dashboard-kit";
import { EASE, HeroBackdrop, TierPath, softCard } from "@/components/product/command-hero";
import { SOLUTIONS } from "@/lib/data/solutions";
import { REQUIREMENTS } from "@/lib/data/tiers";
import { localizeNotificationText, maturityScore, nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

/** Al Noor style: the same command-center design, focused on the transformation journey. */
export function ApproachableDashboard() {
  const { id, factory, state, tier } = useActiveFactory();
  const notifications = useJahez((s) => s.notifications);
  const reduce = useReducedMotion();
  const t = useT();
  const { locale, isRtl } = useLocale();
  const ar = locale === "ar";
  const p = nextTierProgress(state.completedRequirements);
  const firstName = factory.owner.name.split(" ")[0];
  const registered = !!factory.registration;
  const reachedTier1 = tier >= 1 && !registered;
  const pending = factory.recommendedSolutions.filter((sid) => !state.unlockedSolutions.includes(sid));
  const systems = resolveSystems(factory, state.unlockedSolutions);
  const systemsLive = systems.filter((s) => s.status === "active").length;
  const nextBuild = pending[0];
  const activity = notifications.filter((n) => n.factoryId === id).slice(0, 4);

  const kpis = [
    { label: "Maturity Score", value: maturityScore(state.completedRequirements), suffix: "/100", icon: Gauge },
    { label: "Requirements Met", value: state.completedRequirements.length, suffix: `/${REQUIREMENTS.length}`, icon: CheckCircle2 },
    { label: "Systems Live", value: systemsLive, suffix: `/${Math.max(systems.length, systemsLive)}`, icon: Layers },
    { label: "AI Builds Live", value: state.unlockedSolutions.length, suffix: factory.recommendedSolutions.length ? `/${factory.recommendedSolutions.length}` : "", icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#070F1F] px-6 py-7 text-white shadow-lift md:px-9 md:py-9">
        <HeroBackdrop />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 rounded-full bg-white/[0.07] px-4 py-2 text-[13px] ring-1 ring-white/10 backdrop-blur">
              <span className={cn("inline-flex items-center gap-1.5 font-semibold", registered ? "text-amber-200" : "text-white")}>
                <span className={cn("size-2 rounded-full", registered ? "bg-amber-400" : "bg-teal-400")} />
                {registered ? t("Proposed · unverified") : t("Tier {tier}", { tier })}
              </span>
              <span className="h-4 w-px bg-white/20" />
              <span className="text-white/80">{t(factory.governorate)}</span>
              <span className="hidden text-white/80 sm:inline">{ar ? factory.nameAr : factory.name}</span>
            </motion.div>
            <motion.h1 initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: EASE }} className="mt-5 text-3xl font-semibold tracking-[-0.025em] md:text-[46px] md:leading-[1.05]">
              {ar ? <>{t("Digital Transformation Hub")}</> : <><span className="text-white/75">Digital</span> Transformation Hub</>}
            </motion.h1>
            <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-3 text-[15px] text-white/70 md:text-base">
              {reachedTier1 ? t("Well done, {name} — Tier 1 requirements are met.", { name: firstName }) : t("Welcome, {name}. Your journey, AI builds and maturity in one view.", { name: firstName })}
            </motion.p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/roadmap" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/[0.06] px-5 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/[0.12]">
              <MapIcon className="size-4" /> {t("Roadmap")}
            </Link>
            {nextBuild ? (
              <BuildWithAIButton solutionId={nextBuild} className="h-11 rounded-2xl" label={t("Build {name}", { name: ar ? SOLUTIONS[nextBuild].nameAr : SOLUTIONS[nextBuild].name.replace(/^AI /, "") })} />
            ) : reachedTier1 ? (
              <Link href="/certificates" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-navy-900 shadow-lg transition hover:-translate-y-0.5">
                <BadgeCheck className="size-4" /> {t("Tier Certificate")} <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            ) : (
              <Link href="/services" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-navy-900 shadow-lg transition hover:-translate-y-0.5">
                {t("AI Services")} <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: EASE }}
              whileHover={reduce ? undefined : { y: -3 }}
              className="flex items-center gap-4 rounded-[20px] bg-white/[0.05] p-4 ring-1 ring-white/10 backdrop-blur-md transition-colors hover:bg-white/[0.08] md:p-5"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10"><k.icon className="size-5" /></span>
              <div className="min-w-0">
                <div className="text-[13px] text-white/70">{t(k.label)}</div>
                <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight md:text-[28px]">
                  <CountUp value={k.value} />
                  <span className="text-base font-medium text-white/50">{k.suffix}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <TierPath tier={tier} next={p.next} done={p.done} total={p.total} ratio={p.ratio} />
      </section>

      {registered ? <RegistrationStrip tier={tier} /> : null}
      {reachedTier1 ? <Tier1Strip /> : null}
      <AssessmentNudge />

      {/* Next builds · maturity · activity */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr_1fr]">
        <motion.section initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1, ease: EASE }} className={cn(softCard, "p-6")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 text-navy-800" />
              <div>
                <h2 className="font-semibold text-navy-900">{t("AI Builds")}</h2>
                <p className="text-xs text-muted">{t("Built by Jahez agents in under a minute")}</p>
              </div>
            </div>
            <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", pending.length ? "bg-teal-50 text-teal-700" : "bg-emerald-50 text-emerald-700")}>
              {pending.length ? t("{count} to build", { count: pending.length }) : <><Check className="size-3.5" /> {t("All live")}</>}
            </span>
          </div>
          <ul className="mt-5 space-y-3">
            {factory.recommendedSolutions.map((sid, i) => {
              const sol = SOLUTIONS[sid];
              const live = state.unlockedSolutions.includes(sid);
              return (
                <motion.li key={sid} initial={reduce ? false : { opacity: 0, x: isRtl ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.08 }} className="flex items-center gap-4 rounded-2xl bg-canvas/70 p-3.5">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-white", live ? "bg-gradient-to-br from-teal-400 to-teal-600" : "bg-navy-900")}>
                    <SolutionIcon icon={sol.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-navy-900">{ar ? sol.nameAr : sol.name}</div>
                    <div className="truncate text-xs text-muted">{t(sol.shortDescription)}</div>
                  </div>
                  <BuildWithAIButton solutionId={sid} size="sm" className="shrink-0 rounded-full" label={t("Build")} />
                </motion.li>
              );
            })}
            {!factory.recommendedSolutions.length ? (
              <li>
                <Link href="/services" className="flex items-center gap-4 rounded-2xl bg-canvas/70 p-3.5 transition hover:bg-canvas">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy-900 text-white"><Store className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-navy-900">{t("Recommended AI services")}</span>
                    <span className="block text-xs text-muted">{t("Matched to your factory profile")}</span>
                  </span>
                  <ArrowRight className="size-4 text-muted rtl:-scale-x-100" />
                </Link>
              </li>
            ) : null}
          </ul>
        </motion.section>

        <MaturityCard />

        <motion.section initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2, ease: EASE }} className={cn(softCard, "p-6")}>
          <h2 className="flex items-center gap-2.5 font-semibold text-navy-900"><Bell className="size-5 text-navy-800" /> {t("Recent Activity")}</h2>
          <ul className="mt-4 space-y-2.5">
            {activity.map((n, i) => (
              <motion.li key={n.id} initial={reduce ? false : { opacity: 0, x: isRtl ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
                <Link href={n.href ?? "/dashboard"} className={cn("flex items-center gap-3 rounded-2xl px-3.5 py-3 transition hover:brightness-[0.98]", n.kind === "tier" ? "bg-amber-50 text-amber-600" : "bg-teal-50/70 text-teal-700")}>
                  {n.kind === "tier" ? <BadgeCheck className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-navy-900">{localizeNotificationText(n.title, t)}</span>
                  <span className="shrink-0 text-[11px] opacity-80">{timeAgo(n.createdAt, t)}</span>
                </Link>
              </motion.li>
            ))}
            {!activity.length ? (
              <li className="rounded-2xl bg-canvas/70 px-3.5 py-6 text-center text-[13px] text-muted">{t("No activity yet — start your first AI build.")}</li>
            ) : null}
          </ul>
        </motion.section>
      </div>

      <JourneyStreams completed={state.completedRequirements} exporting={factory.exportStatus !== undefined && factory.exportStatus !== "none"} pending={pending.length} />

      <SystemsGrid />
    </div>
  );
}

function JourneyStreams({ completed, exporting, pending }: { completed: string[]; exporting: boolean; pending: number }) {
  const reduce = useReducedMotion();
  const t = useT();
  const has = (...ids: string[]) => ids.every((x) => completed.includes(x));
  const items = [
    { label: "Online Presence", icon: Globe, ok: has("t1-website", "t1-contact"), href: "/solutions/website" },
    { label: "Governance", icon: ShieldCheck, ok: has("t1-governance", "t1-sop"), href: "/solutions/compliance" },
    { label: "Finance", icon: Coins, ok: has("t2-accounting"), href: "/roadmap" },
    { label: "People & HR", icon: Users, ok: has("t2-hr"), href: "/roadmap" },
    { label: "Safety", icon: HardHat, ok: has("t2-safety"), href: "/roadmap" },
    { label: "Operations", icon: Factory, ok: has("t3-production"), href: "/roadmap" },
    { label: "Export", icon: Ship, ok: exporting && has("t4-export"), href: "/services" },
  ];
  return (
    <section aria-labelledby="js-title">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 id="js-title" className="flex items-center gap-2 font-semibold text-navy-900"><Briefcase className="size-4" /> {t("Workstreams")}</h2>
        <Link href="/roadmap" className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-teal-700">{t("Roadmap")} <ArrowRight className="size-4 rtl:-scale-x-100" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-[repeat(7,minmax(0,1fr))_1.7fr]">
        {items.map((w, i) => (
          <motion.div key={w.label} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: EASE }} whileHover={reduce ? undefined : { y: -4 }}>
            <Link href={w.href} className={cn(softCard, "group relative flex h-full flex-col p-4 transition-shadow hover:shadow-lift")}>
              <span className={cn("absolute end-4 top-4 size-2 rounded-full", w.ok ? "bg-emerald-500" : "bg-navy-900/20")} />
              <w.icon className="size-5 text-navy-800 transition-transform duration-300 group-hover:scale-110" />
              <span className="mt-3 text-[13.5px] font-semibold leading-tight text-navy-900">{t(w.label)}</span>
              <span className={cn("mt-2.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", w.ok ? "bg-emerald-50 text-emerald-700" : "bg-navy-900/[0.05] text-navy-600")}>
                {w.ok ? <Check className="size-3" /> : <AlertTriangle className="size-3" />} {w.ok ? t("In place") : t("To do")}
              </span>
            </Link>
          </motion.div>
        ))}
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7, ease: EASE }} whileHover={reduce ? undefined : { y: -4 }} className="col-span-2 sm:col-span-4 xl:col-span-1">
          <Link href={pending ? "/solutions" : "/services"} className="group relative flex h-full items-center gap-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-teal-50 via-white to-sky-100 p-5 shadow-[0_16px_40px_-22px_rgba(15,163,150,0.45)] ring-1 ring-teal-100">
            <motion.span aria-hidden className="absolute -end-10 -top-10 size-36 rounded-full bg-teal-300/40 blur-2xl" animate={reduce ? undefined : { scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-navy-900"><Sparkles className="size-4 text-teal-600" /> {t("AI Insight")}</div>
              <p className="mt-1.5 text-[13px] leading-snug text-navy-700">
                {pending ? t(pending > 1 ? "{count} AI builds take you to the next tier." : "{count} AI build takes you to the next tier.", { count: pending }) : t("Explore AI services to grow sales and exports.")}
              </p>
            </div>
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white text-teal-600 shadow-md transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"><ArrowRight className="size-4 rtl:-scale-x-100" /></span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Tier1Strip() {
  const reduce = useReducedMotion();
  const t = useT();
  return (
    <motion.section initial={reduce ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn(softCard, "flex flex-col gap-4 p-5 sm:flex-row sm:items-center")} aria-live="polite">
      <motion.span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold-400 text-navy-950" animate={reduce ? undefined : { rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}>
        <PartyPopper className="size-5" />
      </motion.span>
      <div className="flex-1">
        <div className="font-semibold text-navy-900">{t("Ready for Tier 1 verification")}</div>
        <div className="text-xs text-muted">{t("Provisional until evidence review and inspection (demo).")}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ChipLink href="/certificates"><BadgeCheck className="size-3.5" /> {t("Certificate")}</ChipLink>
        <ChipLink href="/roadmap"><ArrowRight className="size-3.5 rtl:-scale-x-100" /> {t("Tier {tier}", { tier: 2 })}</ChipLink>
      </div>
    </motion.section>
  );
}

/** Factories created via sign-up: the tier is proposed, never issued. */
function RegistrationStrip({ tier }: { tier: number }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-3 rounded-[24px] border border-amber-200 bg-gradient-to-r from-amber-50 to-white rtl:bg-gradient-to-l p-4 md:flex-row md:items-center">
      <div className="flex flex-1 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><ShieldQuestion className="size-5" /></span>
        <div>
          <div className="text-sm font-semibold text-navy-900">{t("Proposed Tier {tier} · unverified", { tier })}</div>
          <div className="text-xs text-muted">{t("Confirmed only after evidence review and inspection.")}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ChipLink href="/assessment"><ClipboardCheck className="size-3.5" /> {t("Assessment")}</ChipLink>
        <ChipLink href="/roadmap"><FileCheck2 className="size-3.5" /> {t("Evidence")}</ChipLink>
        <ChipLink href="/verify"><SearchCheck className="size-3.5" /> {t("Inspection")}</ChipLink>
      </div>
    </section>
  );
}

/** Kept for older imports — use SystemsGrid. */
export const SystemsChecklist = SystemsGrid;
