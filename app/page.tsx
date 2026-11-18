"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BadgeCheck, Bot, ClipboardCheck, Factory as FactoryIcon, Landmark, MapPin, Route, Users } from "lucide-react";
import { Button, DemoDisclaimer } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { Logo, ResetDemoButton } from "@/components/shell/app-shell";
import { ScoreRing, SolutionIcon, TierLadder } from "@/components/product/primitives";
import { FACTORIES } from "@/lib/data/factories";
import { SOLUTIONS } from "@/lib/data/solutions";
import { TIERS, requirementsForTier } from "@/lib/data/tiers";
import { computeTier, maturityScore, useHydrated, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { FactoryId } from "@/lib/types";

export default function LandingPage() {
  const reduce = useReducedMotion();
  const fade = (delay = 0) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: "easeOut" as const } });

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:px-6">
          <Logo />
          <nav className="ml-auto flex items-center gap-1" aria-label="Public">
            <Button asChild variant="ghost" size="sm"><Link href="/verify"><BadgeCheck /> <span className="hidden sm:inline">Verify licence</span></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/ministry"><Landmark /> <span className="hidden sm:inline">Ministry view</span></Link></Button>
            <ResetDemoButton variant="ghost" />
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 md:px-6 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <motion.div {...fade(0)} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-navy-700 shadow-card">
              <span className="size-1.5 rounded-full bg-teal-500" /> Factory digital transformation · demonstration
            </motion.div>
            <motion.h1 {...fade(0.05)} className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl md:text-[56px]">
              Every factory,<br />
              <span className="text-teal-600">ready</span> for what&apos;s next.
              <span className="mt-2 block font-arabic text-2xl font-medium text-navy-500 sm:text-3xl" lang="ar" dir="rtl">جاهز</span>
            </motion.h1>
            <motion.p {...fade(0.1)} className="mt-5 max-w-xl text-base text-navy-700 md:text-lg">
              Jahez assesses a factory&apos;s digital maturity, maps a tiered transformation roadmap, and deploys AI agents that build the missing systems — websites, compliance workspaces, predictive maintenance — in minutes, not months.
            </motion.p>
            <motion.div {...fade(0.15)} className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><a href="#accounts">Choose a demo factory <ArrowRight /></a></Button>
              <Button asChild size="lg" variant="outline"><Link href="/ministry"><Landmark /> National overview</Link></Button>
            </motion.div>
          </div>
          <motion.div {...fade(0.2)}>
            <HeroPanel />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-px overflow-hidden px-4 md:grid-cols-3 md:px-6">
          {[
            { icon: ClipboardCheck, title: "Assess", body: "A guided questionnaire and AI analysis produce a provisional tier and maturity score." },
            { icon: Route, title: "Plan", body: "A roadmap shows every requirement, tier by tier, and which ones Jahez can satisfy." },
            { icon: Bot, title: "Build with AI", body: "Specialised agents deploy working solutions while you watch — then you edit and own them." },
          ].map((s, i) => (
            <div key={s.title} className="flex gap-4 py-8 md:px-6 md:first:pl-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-white"><s.icon className="size-5" aria-hidden /></span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">Step {i + 1}</div>
                <h2 className="mt-0.5 font-semibold text-navy-900">{s.title}</h2>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">The maturity framework</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900 md:text-3xl">Five tiers, climbed in order</h2>
          <p className="mt-2 text-[15px] text-muted">Each tier has concrete requirements. A factory reaches a tier only when that tier and every tier below it are complete — and classification remains provisional until evidence review and inspection.</p>
        </div>
        <ol className="mt-10 grid gap-3 md:grid-cols-5">
          {TIERS.map((t, i) => {
            const count = requirementsForTier(t.level).length;
            return (
              <motion.li
                key={t.level}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06 }}
                className="relative flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card md:min-h-[230px]"              >
                <div className="absolute inset-x-5 top-0 h-0.5 rounded-b-full" style={{ backgroundColor: t.color }} aria-hidden />
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color: t.color }}>{t.level}</span>
                  <span className="font-arabic text-sm text-muted" lang="ar">{t.nameAr}</span>
                </div>
                <h3 className="mt-2 font-semibold text-navy-900">{t.name}</h3>
                <p className="mt-0.5 text-xs font-medium text-navy-600">{t.tagline}</p>
                <p className="mt-2 flex-1 text-sm text-muted">{t.description}</p>
                <div className="mt-3 text-xs font-medium text-navy-500">{t.level === 0 ? "Starting point" : `${count} requirements`}</div>
              </motion.li>
            );
          })}
        </ol>
      </section>

      {/* Accounts */}
      <section id="accounts" className="scroll-mt-20 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">Demo accounts</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900 md:text-3xl">Step into a factory</h2>
              <p className="mt-2 max-w-xl text-[15px] text-muted">Two fictional factories at opposite ends of the journey. You can switch between them at any time from the sidebar.</p>
            </div>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <AccountCard id="al-noor" />
            <AccountCard id="delta" />
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <DemoDisclaimer className="md:max-w-xl">
            Demonstration with fictional factories, people and data. Tiers and assessments are provisional simulations and do not constitute official Ministry of Industry classification or authorisation.
          </DemoDisclaimer>
          <div className="flex gap-4 text-sm text-muted">
            <Link href="/verify" className="hover:text-navy-900">Licence verification</Link>
            <Link href="/ministry" className="hover:text-navy-900">Ministry dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroPanel() {
  const hydrated = useHydrated();
  const factories = useJahez((s) => s.factories);
  const rows: { id: FactoryId; label: string }[] = [
    { id: "al-noor", label: FACTORIES["al-noor"].name },
    { id: "delta", label: FACTORIES.delta.name },
  ];
  return (
    <div className="relative rounded-3xl border border-line bg-white p-5 shadow-lift md:p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Maturity snapshot</div>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">Provisional</span>
      </div>
      <div className="mt-5 space-y-6">
        {rows.map((r) => {
          const completed = factories[r.id].completedRequirements;
          const tier = computeTier(completed);
          return (
            <div key={r.id}>
              <div className="mb-3 flex items-center gap-4">
                {hydrated ? <ScoreRing value={maturityScore(completed)} size={56} stroke={6} /> : <div className="size-14 animate-pulse rounded-full bg-canvas" />}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy-900">{r.label}</div>
                  <div className="text-xs text-muted">{FACTORIES[r.id].industry}</div>
                </div>
                {hydrated ? <TierBadge tier={tier} size="sm" className="ml-auto shrink-0" /> : null}
              </div>
              {hydrated ? <TierLadder tier={tier} /> : <div className="h-8 animate-pulse rounded bg-canvas" />}
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs text-navy-700">
        <Bot className="size-4 text-teal-600" aria-hidden /> AI agents build the systems that close each gap.
      </div>
    </div>
  );
}

function AccountCard({ id }: { id: FactoryId }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const setActive = useJahez((s) => s.setActiveFactory);
  const completed = useJahez((s) => s.factories[id].completedRequirements);
  const f = FACTORIES[id];
  const dark = f.experience === "command-center";
  const tier = computeTier(completed);
  const enter = () => {
    setActive(id);
    router.push("/dashboard");
  };

  return (
    <motion.article whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className={cn("group relative flex flex-col overflow-hidden rounded-3xl border p-6 md:p-8", dark ? "border-navy-800 bg-navy-950 text-white" : "border-line bg-canvas text-navy-900")}>
      <div className={cn("absolute inset-0", dark ? "bg-grid-dark" : "bg-grid")} aria-hidden />
      <div className={cn("pointer-events-none absolute -right-16 -top-16 size-56 rounded-full blur-3xl", dark ? "bg-indigo-500/20" : "bg-teal-200/50")} aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className={cn("text-xs font-semibold uppercase tracking-[0.14em]", dark ? "text-teal-300" : "text-teal-600")}>{dark ? "Command center experience" : "Guided first steps"}</div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">{f.name}</h3>
          <div className={cn("font-arabic text-sm", dark ? "text-white/50" : "text-muted")} lang="ar">{f.nameAr}</div>
        </div>
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-semibold", dark ? "bg-white/10 text-white" : "bg-navy-900 text-white")}>{f.owner.initials}</span>
      </div>

      <p className={cn("relative mt-4 text-sm", dark ? "text-white/65" : "text-navy-700")}>{f.summary}</p>

      <dl className={cn("relative mt-5 grid grid-cols-3 gap-3 border-y py-4 text-sm", dark ? "border-white/10" : "border-line")}>
        <div><dt className={cn("flex items-center gap-1 text-xs", dark ? "text-white/45" : "text-muted")}><FactoryIcon className="size-3" /> Sector</dt><dd className="mt-0.5 font-medium leading-snug">{f.industry}</dd></div>
        <div><dt className={cn("flex items-center gap-1 text-xs", dark ? "text-white/45" : "text-muted")}><MapPin className="size-3" /> Location</dt><dd className="mt-0.5 font-medium">{f.governorate}</dd></div>
        <div><dt className={cn("flex items-center gap-1 text-xs", dark ? "text-white/45" : "text-muted")}><Users className="size-3" /> Staff</dt><dd className="mt-0.5 font-medium tabular-nums">{f.employees}</dd></div>
      </dl>

      <div className="relative mt-5 flex flex-wrap items-center gap-2">
        {hydrated ? <TierBadge tier={tier} className={dark ? "bg-white/5" : undefined} /> : <span className="h-6 w-28 animate-pulse rounded-full bg-navy-900/5" />}
        <span className={cn("text-xs", dark ? "text-white/50" : "text-muted")}>Goal: {f.targetOutcome}</span>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2">
        {f.recommendedSolutions.map((sid) => (
          <span key={sid} className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium", dark ? "bg-white/5 text-white/80" : "bg-white text-navy-800 ring-1 ring-inset ring-line")}>
            <SolutionIcon icon={SOLUTIONS[sid].icon} className={cn("size-3.5", dark ? "text-gold-300" : "text-teal-600")} /> {SOLUTIONS[sid].name}
          </span>
        ))}
      </div>

      <div className="relative mt-8 flex flex-1 items-end justify-between gap-3">
        <div className={cn("text-xs", dark ? "text-white/45" : "text-muted")}>
          Signed in as <span className={dark ? "text-white/80" : "text-navy-800"}>{f.owner.name}</span>
          <br />
          {f.owner.title}
        </div>
        <Button size="lg" variant={dark ? "gold" : "primary"} onClick={enter} aria-label={`Enter ${f.name} demo account`}>
          Enter <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </motion.article>
  );
}
