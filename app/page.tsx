"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, BadgeCheck, Bot, ChevronRight, Clock, Factory as FactoryIcon, Landmark, MapPin, Plus, Satellite, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button, DemoDisclaimer } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { Logo, ResetDemoButton } from "@/components/shell/app-shell";
import { ScoreRing, SolutionIcon, TierLadder } from "@/components/product/primitives";
import { SolutionVisual } from "@/components/solutions/solution-visuals";
import { EgyptMap, type MapDatum } from "@/components/ministry/egypt-map";
import { SITE_PHOTOS, unsplashUrl } from "@/components/solutions/website/site-photos";
import { FACTORIES } from "@/lib/data/factories";
import { SOLUTIONS, SOLUTION_LIST, DEPLOY_SECONDS } from "@/lib/data/solutions";
import { TIERS } from "@/lib/data/tiers";
import { BASE_CUBE, SECTORS, aggregate, byGovernorate } from "@/lib/data/national";
import { computeTier, maturityScore, useAllFactories, useHydrated, useJahez } from "@/lib/store";
import { cn, localName } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { DemoFactoryId, Factory } from "@/lib/types";

const industryOf = (f: Factory, locale: string, t: (s: string) => string) => (locale === "ar" ? (f.industryAr || t(f.industry)) : f.industry);

const NATIONAL = aggregate(BASE_CUBE);
const MAP_DATA: MapDatum[] = byGovernorate(BASE_CUBE).filter((g) => g.total > 0);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Apple-style scroll reveal: fades and lifts content once as it enters the viewport. */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Large centred section heading: one statement, one short line. */
function Statement({ eyebrow, title, sub, dark, className }: { eyebrow?: string; title: React.ReactNode; sub?: string; dark?: boolean; className?: string }) {
  return (
    <Reveal className={cn("mx-auto max-w-3xl text-center", className)}>
      {eyebrow ? <div className={cn("text-sm font-semibold", dark ? "text-teal-300" : "text-teal-600")}>{eyebrow}</div> : null}
      <h2 className={cn("mt-3 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl md:text-6xl", dark ? "text-white" : "text-navy-900")}>{title}</h2>
      {sub ? <p className={cn("mx-auto mt-5 max-w-xl text-pretty text-lg font-medium md:text-xl", dark ? "text-white/55" : "text-muted")}>{sub}</p> : null}
    </Reveal>
  );
}

/** Text link with a chevron, Apple "Learn more ›" style. */
function MoreLink({ href, children, dark }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-0.5 text-[17px] font-medium hover:underline", dark ? "text-teal-300" : "text-teal-600")}>
      {children}
      <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
    </Link>
  );
}

export default function LandingPage() {
  const t = useT();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav — thin, translucent */}
      <header className="sticky top-0 z-40 border-b border-navy-900/5 bg-white/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
          <Logo />
          <nav className="ms-auto flex items-center gap-1" aria-label={t("Public")}>
            <Button asChild variant="ghost" size="sm"><Link href="/verify"><BadgeCheck /> <span className="hidden sm:inline">{t("Verify licence")}</span></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/ministry"><Landmark /> <span className="hidden sm:inline">{t("Ministry view")}</span></Link></Button>
            <ResetDemoButton variant="ghost" />
            <Button asChild size="sm" className="ms-1 hidden rounded-full sm:inline-flex"><a href="#accounts">{t("Try the demo")}</a></Button>
          </nav>
        </div>
      </header>

      <Hero />
      <StepsSection />
      <TiersSection />
      <BuildSection />
      <IndustrySection />
      <InsightSection />
      <NationalSection />

      {/* Accounts */}
      <section id="accounts" className="scroll-mt-14 bg-canvas py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Statement eyebrow={t("Demo accounts")} title={t("Step into a factory.")} sub={t("Two factories. Opposite ends of the journey.")} />
          <Reveal className="mt-14 grid gap-5 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_minmax(0,0.72fr)]">
            <AccountCard id="al-noor" />
            <AccountCard id="delta" />
            <RegisterTile />
          </Reveal>
          <RegisteredFactories />
        </div>
      </section>

      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <DemoDisclaimer className="md:max-w-xl">
            {t("Demonstration with fictional factories, people and data. Tiers and assessments are provisional simulations and do not constitute official Ministry of Industry classification or authorisation.")}
          </DemoDisclaimer>
          <div className="flex gap-4 text-sm text-muted">
            <Link href="/verify" className="hover:text-navy-900">{t("Licence verification")}</Link>
            <Link href="/ministry" className="hover:text-navy-900">{t("Ministry dashboard")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  const t = useT();
  const { locale } = useLocale();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // The product shot starts tilted back and settles flat as the page scrolls — a classic Apple reveal.
  const rotateX = useTransform(scrollYProgress, [0, 0.45], reduce ? [0, 0] : [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.45], reduce ? [1, 1] : [0.94, 1]);
  const fade = (delay = 0) => (reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    <section ref={ref} className="relative overflow-hidden pb-24 pt-20 md:pb-32 md:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(60%_55%_at_50%_0%,rgba(45,191,176,0.16),transparent_70%)]" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 text-center md:px-6">
        <motion.div {...fade(0)} className="inline-flex items-center gap-2 text-[15px] font-semibold text-navy-700">
          <span>Jahez</span><span className="text-line">|</span><span className="font-arabic" lang="ar">جاهز</span>
        </motion.div>
        <motion.h1 {...fade(0.05)} className="mx-auto mt-4 max-w-5xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-navy-900 sm:text-7xl md:text-[84px]">
          {t("Every factory.")}
          <span className="block bg-gradient-to-r from-teal-600 via-teal-400 to-gold-500 bg-clip-text pb-2 text-transparent">{t("Ready for what's next.")}</span>
        </motion.h1>
        <motion.p {...fade(0.12)} className="mx-auto mt-5 max-w-2xl text-xl font-medium text-muted md:text-2xl">
          {t("Assess. Plan. Build with AI.")}
        </motion.p>
        <motion.div {...fade(0.18)} className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
          <Button asChild size="lg" className="rounded-full px-7"><a href="#accounts">{t("Choose a demo factory")}</a></Button>
          <MoreLink href="/register">{t("Register your factory")}</MoreLink>
        </motion.div>
      </div>

      <motion.div {...fade(0.25)} className="relative mx-auto mt-16 max-w-5xl px-4 [perspective:1600px] md:mt-20 md:px-6">
        <motion.div style={{ rotateX, scale, transformOrigin: "50% 100%" }}>
          <ProductShot locale={locale} />
        </motion.div>
      </motion.div>
    </section>
  );
}

/** A live "screenshot" of the product made from the real dashboard primitives. */
function ProductShot({ locale }: { locale: string }) {
  const t = useT();
  const hydrated = useHydrated();
  const completed = useJahez((s) => s.factories.delta.completedRequirements);
  const f = FACTORIES.delta;
  const tier = computeTier(completed);
  const score = maturityScore(completed);
  const reduce = useReducedMotion();
  const spark = [42, 48, 45, 53, 51, 60, 58, 66, 64, 71, 69, 76];
  const max = Math.max(...spark);
  const path = spark.map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (spark.length - 1)) * 100} ${40 - (v / max) * 34}`).join(" ");

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-x-10 -bottom-10 top-10 rounded-[48px] bg-gradient-to-b from-teal-300/25 via-indigo-300/20 to-transparent blur-3xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-navy-950 shadow-[0_50px_100px_-30px_rgba(5,14,31,0.55)] ring-1 ring-navy-900/10">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3" dir="ltr">
          <span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" />
          <span className="mx-auto h-5 w-56 rounded-full bg-white/5 text-[10px] leading-5 text-white/35">jahez.demo/dashboard</span>
        </div>
        <div className="bg-grid-dark grid gap-4 p-5 text-start md:grid-cols-[auto_1fr] md:gap-6 md:p-8">
          <div className="flex items-center gap-5 rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10 md:flex-col md:justify-center md:px-8">
            {hydrated ? <ScoreRing value={score} size={132} stroke={11} dark label={<span className="text-3xl font-semibold text-white tabular-nums">{score}</span>} sublabel={<span className="text-[11px] text-white/45">/100</span>} /> : <div className="size-[132px] animate-pulse rounded-full bg-white/5" />}
            <div className="md:text-center">
              <div className="text-sm font-semibold text-white">{localName(f, locale)}</div>
              <div className="mt-0.5 text-xs text-white/45">{t("Digital maturity")}</div>
              {hydrated ? <TierBadge tier={tier} size="sm" className="mt-2 bg-white/5" /> : null}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10">
              <div className="mb-4 text-xs font-medium text-white/50">{t("Transformation roadmap")}</div>
              {hydrated ? <TierLadder tier={tier} dark /> : <div className="h-10 animate-pulse rounded bg-white/5" />}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
              <div className="rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                <div className="flex items-center justify-between text-xs font-medium text-white/50"><span>{t("Overall equipment effectiveness")}</span><span className="text-teal-300 tabular-nums">76%</span></div>
                <svg viewBox="0 0 100 42" className="mt-3 h-20 w-full" preserveAspectRatio="none" aria-hidden>
                  <defs><linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2DBFB0" stopOpacity="0.45" /><stop offset="1" stopColor="#2DBFB0" stopOpacity="0" /></linearGradient></defs>
                  <path d={`${path} L 100 42 L 0 42 Z`} fill="url(#hero-spark)" />
                  <motion.path d={path} fill="none" stroke="#5FD6C8" strokeWidth="1.6" vectorEffect="non-scaling-stroke" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.6, ease: "easeInOut" }} />
                </svg>
              </div>
              <div className="grid gap-2 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/10">
                {SOLUTION_LIST.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-teal-400/15"><SolutionIcon icon={s.icon} className="size-3.5 text-teal-300" /></span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-white/80">{localName(s, locale)}</span>
                    <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Steps ───────────────────────────── */

function StepsSection() {
  const t = useT();
  const { locale } = useLocale();
  const reduce = useReducedMotion();
  return (
    <section className="bg-canvas py-24 md:py-36">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Statement eyebrow={t("How it works")} title={t("From offline to intelligent.")} sub={t("Three steps. Minutes, not months.")} />
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {/* Assess */}
          <Reveal className="flex flex-col overflow-hidden rounded-[32px] bg-white shadow-card ring-1 ring-line">
            <div className="grid flex-1 place-items-center bg-[radial-gradient(80%_70%_at_50%_30%,#CCF5EF,transparent_75%)] px-6 pb-4 pt-10">
              <ScoreRing value={72} size={168} stroke={13} label={<span className="text-5xl font-semibold tracking-tight text-navy-900 tabular-nums">72</span>} sublabel={<span className="text-xs text-muted">/100</span>} />
            </div>
            <StepCaption n={1} title={t("Assess")} line={t("AI scores your digital maturity.")} />
          </Reveal>
          {/* Plan */}
          <Reveal delay={0.08} className="flex flex-col overflow-hidden rounded-[32px] bg-white shadow-card ring-1 ring-line">
            <div className="flex flex-1 items-center justify-center bg-[radial-gradient(80%_70%_at_50%_30%,#E0E7FF,transparent_75%)] px-8 pb-4 pt-10">
              <ol className="relative w-full max-w-[220px] space-y-3">
                <span className="absolute inset-y-3 start-[15px] w-px bg-line" aria-hidden />
                {TIERS.map((td, i) => (
                  <motion.li key={td.level} className="relative flex items-center gap-3" initial={reduce ? false : { opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08 }}>
                    <span className="grid size-[31px] shrink-0 place-items-center rounded-full text-xs font-bold text-white ring-4 ring-white" style={{ backgroundColor: td.color }}>{td.level}</span>
                    <span className="h-2.5 rounded-full" style={{ width: `${40 + i * 14}%`, backgroundColor: `${td.color}55` }} />
                  </motion.li>
                ))}
              </ol>
            </div>
            <StepCaption n={2} title={t("Plan")} line={t("A clear roadmap, tier by tier.")} />
          </Reveal>
          {/* Build */}
          <Reveal delay={0.16} className="flex flex-col overflow-hidden rounded-[32px] bg-navy-950 shadow-card">
            <div className="bg-grid-dark flex flex-1 flex-col justify-center gap-3 px-7 pb-4 pt-10">
              {SOLUTION_LIST.map((s, i) => (
                <div key={s.id} className="rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/10">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/80"><SolutionIcon icon={s.icon} className="size-3.5 text-teal-300" /><span className="truncate">{localName(s, locale)}</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" dir="ltr">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-gold-400" initial={reduce ? false : { width: "0%" }} whileInView={{ width: `${[100, 72, 44][i]}%` }} viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.3 + i * 0.25, ease: "easeOut" }} />
                  </div>
                </div>
              ))}
            </div>
            <StepCaption n={3} title={t("Build with AI")} line={t("Agents deploy the missing systems.")} dark />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function StepCaption({ n, title, line, dark }: { n: number; title: string; line: string; dark?: boolean }) {
  const t = useT();
  return (
    <div className="px-7 pb-8 pt-4">
      <div className={cn("text-xs font-semibold", dark ? "text-teal-300" : "text-teal-600")}>{t("Step {n}", { n })}</div>
      <div className={cn("mt-1 text-2xl font-semibold tracking-tight", dark ? "text-white" : "text-navy-900")}>{title}</div>
      <div className={cn("mt-1 text-[15px]", dark ? "text-white/55" : "text-muted")}>{line}</div>
    </div>
  );
}

/* ───────────────────────────── Tiers ───────────────────────────── */

function TiersSection() {
  const t = useT();
  const { locale } = useLocale();
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-navy-950 py-24 text-white md:py-36">
      <div className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_40%,black,transparent)]" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 md:px-6">
        <Statement dark eyebrow={t("The maturity framework")} title={t("Five tiers. One clear path.")} sub={t("Every tier unlocks the next.")} />
        <div className="mt-20 flex h-[340px] items-end gap-2 sm:gap-4 md:h-[420px]">
          {TIERS.map((td, i) => (
            <div key={td.level} className="flex h-full flex-1 flex-col justify-end">
              <motion.div
                className="relative flex flex-col justify-between overflow-hidden rounded-t-[22px] p-3 sm:p-5"
                style={{ background: `linear-gradient(180deg, ${td.color} 0%, ${td.color}33 100%)`, transformOrigin: "bottom" }}
                initial={reduce ? false : { height: "0%" }}
                whileInView={{ height: `${28 + i * 18}%` }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 1.1, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-3xl font-semibold tabular-nums text-white/95 sm:text-5xl">{td.level}</span>
              </motion.div>
              <div className="mt-4 text-center">
                <div className="text-sm font-semibold sm:text-base">{localName(td, locale)}</div>
                <div className="mt-0.5 hidden text-xs text-white/45 sm:block">{t(td.tagline)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── AI build ───────────────────────────── */

function BuildSection() {
  const t = useT();
  const { locale } = useLocale();
  return (
    <section className="bg-white py-24 md:py-36">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Reveal className="text-center">
          <div className="text-sm font-semibold text-teal-600">{t("AI solutions")}</div>
          <div className="mt-4 bg-gradient-to-b from-navy-900 to-navy-600 bg-clip-text text-[120px] font-semibold leading-none tracking-[-0.06em] text-transparent md:text-[200px]" dir="ltr">
            {DEPLOY_SECONDS}<span className="ms-2 text-[0.4em] tracking-[-0.02em]">{t("sec")}</span>
          </div>
          <h2 className="mx-auto mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.03em] text-navy-900 md:text-5xl">{t("From gap to working system.")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-muted md:text-xl">{t("Watch AI agents build it. Then make it yours.")}</p>
        </Reveal>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {(["website", "compliance", "maintenance"] as const).map((id, i) => (
            <Reveal key={id} delay={i * 0.08} className="group overflow-hidden rounded-[32px] bg-canvas ring-1 ring-line">
              <div className="relative aspect-[4/3.4] overflow-hidden">
                <SolutionVisual id={id} />
              </div>
              <div className="flex items-center gap-3 px-6 pb-6 pt-5">
                <span className="grid size-10 place-items-center rounded-2xl bg-navy-900 text-teal-300"><SolutionIcon icon={SOLUTIONS[id].icon} className="size-5" /></span>
                <div className="text-lg font-semibold tracking-tight text-navy-900">{localName(SOLUTIONS[id], locale)}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Industry (photo) ───────────────────────────── */

function IndustrySection() {
  const t = useT();
  const { locale } = useLocale();
  return (
    <section className="relative isolate flex min-h-[86svh] items-end overflow-hidden bg-navy-950">
      <Image src={unsplashUrl(SITE_PHOTOS.heroFeature, 2000)} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-70" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-navy-950/55 to-navy-950/10" aria-hidden />
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <Reveal>
          <div className="text-sm font-semibold text-teal-300">{t("Made for Egypt")}</div>
          <h2 className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-6xl md:text-7xl">{t("Built for the factories that build Egypt.")}</h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-2.5">
          {SECTORS.map((s) => (
            <span key={s.id} className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 ring-1 ring-white/15 backdrop-blur-md">{locale === "ar" ? s.nameAr : s.name}</span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────────── Satellite + twin ───────────────────────────── */

function InsightSection() {
  const t = useT();
  const reduce = useReducedMotion();
  return (
    <section className="bg-canvas py-24 md:py-36">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Statement eyebrow={t("Intelligence")} title={t("See every factory. From above and inside.")} />
        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {/* Satellite */}
          <Reveal className="group relative overflow-hidden rounded-[32px] bg-navy-950 text-white">
            <div className="relative aspect-[5/4] overflow-hidden">
              <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]">
                <AerialSite />
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_35%,rgba(5,14,31,0.75)_90%)]" aria-hidden />
              {!reduce ? (
                <motion.div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-teal-300/25 to-transparent" animate={{ top: ["-20%", "100%"] }} transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }} aria-hidden />
              ) : null}
              <span className="absolute start-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-navy-950/70 px-3 py-1.5 text-xs font-medium text-teal-200 ring-1 ring-white/10 backdrop-blur" aria-hidden>
                <Satellite className="size-3.5" /> {t("Analysing site")}
              </span>
            </div>
            <div className="flex items-end justify-between gap-4 p-7">
              <div>
                <div className="text-2xl font-semibold tracking-tight">{t("Satellite site intelligence")}</div>
                <div className="mt-1 text-[15px] text-white/55">{t("Roof solar, expansion space, logistics.")}</div>
              </div>
              <MoreLink href="/site-intelligence" dark>{t("Explore")}</MoreLink>
            </div>
          </Reveal>
          {/* Digital twin */}
          <Reveal delay={0.08} className="group relative overflow-hidden rounded-[32px] bg-white ring-1 ring-line">
            <div className="relative grid aspect-[5/4] place-items-center overflow-hidden bg-[radial-gradient(70%_60%_at_50%_40%,#E0E7FF,#FFFFFF_75%)]">
              <IsoFactory />
            </div>
            <div className="flex items-end justify-between gap-4 p-7">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-navy-900">{t("3D digital twin")}</div>
                <div className="mt-1 text-[15px] text-muted">{t("Every machine, live.")}</div>
              </div>
              <MoreLink href="/digital-twin">{t("Explore")}</MoreLink>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Top-down "satellite" view of a factory plot: roofs, solar array, expansion zone, truck route. */
function AerialSite() {
  const panels = Array.from({ length: 6 * 4 }, (_, i) => ({ x: 214 + (i % 6) * 22, y: 92 + Math.floor(i / 6) * 15 }));
  return (
    <svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <rect width="500" height="400" fill="#2B3A2F" />
      <rect width="500" height="400" fill="url(#aer-noise)" opacity="0.5" />
      <defs>
        <pattern id="aer-noise" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#33443A" /><circle cx="3" cy="4" r="1.2" fill="#3D5144" /><circle cx="10" cy="10" r="1" fill="#283629" /></pattern>
      </defs>
      {/* roads */}
      <path d="M 0 300 L 500 270" stroke="#4B5563" strokeWidth="26" />
      <path d="M 0 300 L 500 270" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="10 10" />
      <path d="M 120 0 L 140 400" stroke="#4B5563" strokeWidth="18" />
      {/* plot boundary */}
      <rect x="168" y="48" width="290" height="196" rx="4" fill="#6B7064" stroke="#D1D5DB" strokeOpacity="0.5" strokeDasharray="4 4" />
      {/* main roof with solar */}
      <rect x="196" y="74" width="168" height="96" fill="#B8BDC4" />
      {panels.map((p, i) => <rect key={i} x={p.x} y={p.y} width="19" height="12" fill="#1E3A63" stroke="#5FD6C8" strokeOpacity="0.6" strokeWidth="0.6" />)}
      {/* secondary buildings */}
      <rect x="378" y="74" width="62" height="56" fill="#A3A9B1" />
      <rect x="196" y="186" width="96" height="42" fill="#9CA3AF" />
      {/* expansion zone */}
      <rect x="306" y="150" width="134" height="80" rx="6" fill="#C9A24B" fillOpacity="0.18" stroke="#D1AE5C" strokeWidth="2" strokeDasharray="6 5" />
      {/* truck route */}
      <path d="M 140 262 C 170 250 190 246 214 236 L 300 236" fill="none" stroke="#5FD6C8" strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
      <rect x="292" y="230" width="16" height="9" rx="1.5" fill="#F1F5F9" />
    </svg>
  );
}

/** Isometric factory illustration with live status dots (pure SVG). */
function IsoFactory() {
  const reduce = useReducedMotion();
  const top = (x: number, y: number, w: number, d: number) => `M ${x} ${y} l ${w} ${-w / 2} l ${d} ${d / 2} l ${-w} ${w / 2} Z`;
  const machines = [
    { x: 150, y: 210, c: "#2DBFB0" },
    { x: 215, y: 178, c: "#6366F1" },
    { x: 280, y: 146, c: "#2DBFB0" },
    { x: 205, y: 240, c: "#C9A24B" },
    { x: 270, y: 208, c: "#2DBFB0" },
  ];
  return (
    <svg viewBox="0 0 480 360" className="w-[86%] max-w-[460px] drop-shadow-[0_30px_40px_rgba(11,31,58,0.18)]" aria-hidden>
      {/* floor slab */}
      <path d={top(90, 220, 200, 160)} fill="#FFFFFF" stroke="#CBD5E1" />
      <path d="M 90 220 l 160 80 l 0 14 l -160 -80 Z" fill="#E2E8F0" />
      <path d="M 250 300 l 200 -100 l 0 14 l -200 100 Z" fill="#CBD5E1" />
      {/* back walls */}
      <path d="M 90 220 l 200 -100 l 0 -70 l -200 100 Z" fill="#F1F5F9" stroke="#E2E8F0" />
      <path d="M 290 120 l 160 80 l 0 -70 l -160 -80 Z" fill="#E2E8F0" stroke="#CBD5E1" />
      {machines.map((m, i) => (
        <g key={i}>
          <path d={`M ${m.x} ${m.y} l 30 -15 l 22 11 l -30 15 Z`} fill="#0B1F3A" />
          <path d={`M ${m.x} ${m.y} l 22 11 l 0 -26 l -22 -11 Z`} transform="translate(0,-0)" fill="#132B4D" />
          <path d={`M ${m.x + 22} ${m.y + 11} l 30 -15 l 0 -26 l -30 15 Z`} fill="#1E3A63" />
          <path d={`M ${m.x} ${m.y - 26} l 30 -15 l 22 11 l -30 15 Z`} fill="#2E4C78" />
          <motion.circle cx={m.x + 26} cy={m.y - 46} r="5" fill={m.c} animate={reduce ? undefined : { opacity: [1, 0.35, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }} />
          <line x1={m.x + 26} y1={m.y - 40} x2={m.x + 26} y2={m.y - 30} stroke={m.c} strokeWidth="1.5" />
        </g>
      ))}
      {/* conveyor */}
      <path d="M 120 262 l 200 -100" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
      <motion.circle r="5" fill="#C9A24B" animate={reduce ? undefined : { cx: [125, 315], cy: [259.5, 164.5] }} cx={125} cy={259.5} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
    </svg>
  );
}

/* ───────────────────────────── National ───────────────────────────── */

function NationalSection() {
  const t = useT();
  const stats = [
    { value: fmt(NATIONAL.total), label: t("Factories onboarded") },
    { value: `${Math.round(NATIONAL.avgScore)}`, label: t("Average maturity score") },
    { value: `${Math.round(NATIONAL.tier3PlusPct)}%`, label: t("Connected or intelligent") },
  ];
  return (
    <section className="bg-white py-24 md:py-36">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 md:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Reveal>
            <div className="text-sm font-semibold text-teal-600">{t("For the Ministry of Industry")}</div>
            <h2 className="mt-3 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-navy-900 sm:text-5xl md:text-6xl">{t("A national view of readiness.")}</h2>
          </Reveal>
          <Reveal delay={0.08} className="mt-12 grid grid-cols-3 gap-6 md:gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-semibold tracking-tight text-navy-900 tabular-nums sm:text-4xl xl:text-[44px]" dir="ltr">{s.value}</div>
                <div className="mt-2 text-sm text-muted">{s.label}</div>
              </div>
            ))}
          </Reveal>
          <Reveal delay={0.14} className="mt-10 flex flex-wrap gap-x-7 gap-y-3">
            <MoreLink href="/ministry">{t("Open Ministry dashboard")}</MoreLink>
            <MoreLink href="/verify">{t("Verify a licence")}</MoreLink>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="rounded-[32px] bg-canvas p-4 ring-1 ring-line md:p-6">
          <div className="pointer-events-none">
            <EgyptMap data={MAP_DATA} selected="all" onSelect={() => {}} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────────── Accounts (unchanged behaviour) ───────────────────────────── */

function AccountCard({ id }: { id: DemoFactoryId }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const setActive = useJahez((s) => s.setActiveFactory);
  const completed = useJahez((s) => s.factories[id].completedRequirements);
  const t = useT();
  const { locale } = useLocale();
  const f = FACTORIES[id];
  const dark = f.experience === "command-center";
  const tier = computeTier(completed);
  const name = localName(f, locale);
  const enter = () => {
    setActive(id);
    router.push("/dashboard");
  };

  return (
    <motion.article whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className={cn("group relative flex flex-col overflow-hidden rounded-[32px] p-7 md:p-9", dark ? "bg-navy-950 text-white" : "bg-white text-navy-900 shadow-card ring-1 ring-line")}>
      <div className={cn("pointer-events-none absolute -end-16 -top-16 size-64 rounded-full blur-3xl", dark ? "bg-indigo-500/25" : "bg-teal-200/50")} aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className={cn("text-xs font-semibold", dark ? "text-teal-300" : "text-teal-600")}>{dark ? t("Command center experience") : t("Guided first steps")}</div>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight">{name}</h3>
          <div className={cn("text-sm", locale === "ar" ? "" : "font-arabic", dark ? "text-white/50" : "text-muted")} lang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? f.name : f.nameAr}</div>
        </div>
        {hydrated ? <ScoreRing value={maturityScore(completed)} size={64} stroke={6} dark={dark} /> : <span className="size-16 animate-pulse rounded-full bg-navy-900/5" />}
      </div>

      <dl className={cn("relative mt-7 grid grid-cols-3 gap-3 text-sm")}>
        <div><dt className={cn("flex items-center gap-1 text-xs", dark ? "text-white/45" : "text-muted")}><FactoryIcon className="size-3" /> {t("Sector")}</dt><dd className="mt-0.5 font-medium leading-snug">{industryOf(f, locale, t)}</dd></div>
        <div><dt className={cn("flex items-center gap-1 text-xs", dark ? "text-white/45" : "text-muted")}><MapPin className="size-3" /> {t("Location")}</dt><dd className="mt-0.5 font-medium">{t(f.governorate)}</dd></div>
        <div><dt className={cn("flex items-center gap-1 text-xs", dark ? "text-white/45" : "text-muted")}><Users className="size-3" /> {t("Staff")}</dt><dd className="mt-0.5 font-medium tabular-nums">{f.employees}</dd></div>
      </dl>

      <div className="relative mt-6 flex flex-wrap gap-2">
        {hydrated ? <TierBadge tier={tier} className={dark ? "bg-white/5" : undefined} /> : <span className="h-6 w-28 animate-pulse rounded-full bg-navy-900/5" />}
        {f.recommendedSolutions.map((sid) => (
          <span key={sid} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", dark ? "bg-white/5 text-white/80" : "bg-canvas text-navy-800")}>
            <SolutionIcon icon={SOLUTIONS[sid].icon} className={cn("size-3.5", dark ? "text-gold-300" : "text-teal-600")} /> {localName(SOLUTIONS[sid], locale)}
          </span>
        ))}
      </div>

      <div className="relative mt-10 flex flex-1 items-end justify-between gap-3">
        <div className={cn("text-xs", dark ? "text-white/45" : "text-muted")}>
          {t("Signed in as")} <span className={dark ? "text-white/80" : "text-navy-800"}>{f.owner.name}</span>
        </div>
        <Button size="lg" variant={dark ? "gold" : "primary"} className="rounded-full" onClick={enter} aria-label={t("Enter {name} demo account", { name })}>
          {t("Enter")} <ArrowRight className="transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
        </Button>
      </div>
    </motion.article>
  );
}

function RegisterTile() {
  const t = useT();
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }} className="group relative flex flex-col overflow-hidden rounded-[32px] bg-gradient-to-br from-gold-100 via-gold-50 to-white p-7 ring-1 ring-gold-300/60 md:p-9 lg:col-span-2 xl:col-span-1">
      <span className="grid size-14 place-items-center rounded-2xl bg-gold-500 text-navy-950 shadow-card"><Plus className="size-6" aria-hidden /></span>
      <div className="mt-6 text-xs font-semibold text-gold-600">{t("New factory?")}</div>
      <h3 className="mt-1 text-3xl font-semibold tracking-tight text-navy-900">{t("Register in 2 minutes")}</h3>
      <div className="mt-6 flex flex-wrap gap-2">
        {[{ icon: ShieldCheck, label: "Simulated WhatsApp verification" }, { icon: Bot, label: "AI factory assessment" }, { icon: Sparkles, label: "Proposed tier & roadmap" }].map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-navy-800 ring-1 ring-gold-300/50"><item.icon className="size-3.5 text-gold-600" aria-hidden /> {t(item.label)}</span>
        ))}
      </div>
      <div className="mt-10 flex flex-1 items-end justify-between gap-3">
        <span className="flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" aria-hidden /> {t("About 2 minutes · demo")}</span>
        <Button asChild size="lg" variant="gold" className="rounded-full">
          <Link href="/register">{t("Register")} <ArrowRight className="transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" /></Link>
        </Button>
      </div>
    </motion.article>
  );
}

function RegisteredFactories() {
  const hydrated = useHydrated();
  const all = useAllFactories();
  const factories = useJahez((s) => s.factories);
  const setActive = useJahez((s) => s.setActiveFactory);
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const registered = all.filter((f): f is Factory & { registration: NonNullable<Factory["registration"]> } => Boolean(f.registration));
  if (!hydrated || !registered.length) return null;
  return (
    <div className="mt-12">
      <h3 className="text-sm font-semibold text-muted">{t("Your registered factories")}</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {registered.map((f) => {
          const tier = computeTier(factories[f.id]?.completedRequirements ?? f.baselineRequirements);
          const name = localName(f, locale);
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  setActive(f.id);
                  router.push("/dashboard");
                }}
                className="group flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-start ring-1 ring-line transition hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label={t("Enter {name} (registered demo factory)", { name })}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-xs font-semibold text-white">{f.owner.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-navy-900">{name}</span>
                  <span className="block truncate text-xs text-muted">{industryOf(f, locale, t)} · {t(f.governorate)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <TierBadge tier={tier} size="sm" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">{t("Unverified")}</span>
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-navy-500 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
