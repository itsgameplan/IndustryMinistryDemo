"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { BuildWithAIButton } from "@/components/shell/shared";
import { SolutionVisual } from "@/components/solutions/solution-visuals";
import { SOLUTION_LIST } from "@/lib/data/solutions";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn, localName } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Solution } from "@/lib/types";

type Status = "live" | "deploying" | "ready";
const EASE = [0.16, 1, 0.3, 1] as const;

export default function SolutionsPage() {
  const { id, factory, state } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const t = useT();
  const { locale } = useLocale();
  const factoryName = localName(factory, locale);
  const statusOf = (s: Solution): Status => (state.unlockedSolutions.includes(s.id) ? "live" : deployments[`${id}:${s.id}`]?.status === "running" ? "deploying" : "ready");
  const recommended = SOLUTION_LIST.filter((s) => factory.recommendedSolutions.includes(s.id) && s.factory === id);
  const single = recommended.length <= 1;

  return (
    <div className="mx-auto max-w-6xl overflow-x-clip">
      <Hero />

      <section aria-label={t("Recommended for {factory}", { factory: factoryName })} className="mt-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mb-5 flex items-end justify-between px-1">
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900 md:text-3xl">{t("Recommended for you.")}</h2>
          <span className="hidden text-sm text-muted sm:block">{factoryName}</span>
        </motion.div>

        <div className={cn("grid gap-6", !single && "lg:grid-cols-2")}>
          {recommended.map((sol, i) => (
            <SolutionCard key={sol.id} sol={sol} status={statusOf(sol)} index={i} wide={single} />
          ))}
          {!recommended.length ? <MarketplaceCard /> : null}
        </div>
      </section>

      <p className="mt-12 text-center text-xs text-muted">{t("Deployments are simulated for demonstration.")}</p>
    </div>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const t = useT();
  const words = t("Built for you.").split(" ");
  return (
    <section className="relative px-2 pb-14 pt-10 text-center md:pb-20 md:pt-16">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 md:size-[520px] -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,#99EADF,#C7D2FE,#F4EACB,#99EADF)] opacity-40 blur-3xl [mask-image:radial-gradient(closest-side,black_40%,transparent)]"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="relative text-sm font-semibold tracking-wide text-teal-600">
        {t("Jahez AI solutions")}
      </motion.div>
      <h1 className="relative mt-3 text-5xl font-semibold tracking-[-0.035em] text-navy-900 md:text-7xl">
        {words.map((w, i) => (
          <motion.span key={w} className="inline-block" initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, delay: 0.1 + i * 0.12, ease: EASE }}>
            {w}&nbsp;
          </motion.span>
        ))}
        <br />
        <motion.span
          className="inline-block bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500 bg-[length:200%_auto] bg-clip-text text-transparent"
          initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE, backgroundPosition: { duration: 8, repeat: Infinity, ease: "linear" } }}
        >
          {t("By AI.")}
        </motion.span>
      </h1>
      <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }} className="relative mx-auto mt-5 max-w-md text-lg text-muted">
        {t("Deployed in under a minute.")}
      </motion.p>
    </section>
  );
}

/** Large product card with pointer tilt, image parallax and a single clear action. */
function SolutionCard({ sol, status, index, wide }: { sol: Solution; status: Status; index: number; wide: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), { stiffness: 150, damping: 18 });
  const ix = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 20 });
  const iy = useSpring(useTransform(my, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 20 });

  const onMove = (e: React.PointerEvent) => {
    if (reduce || !ref.current || e.pointerType !== "mouse") return;
    const b = ref.current.getBoundingClientRect();
    mx.set((e.clientX - b.left) / b.width - 0.5);
    my.set((e.clientY - b.top) / b.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  const t = useT();
  const { locale } = useLocale();

  return (
    <motion.article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={reduce ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.7 + index * 0.15, ease: EASE }}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className={cn("group relative flex overflow-hidden rounded-[2rem] bg-white shadow-[0_1px_2px_rgba(11,31,58,0.04),0_20px_50px_-24px_rgba(11,31,58,0.25)] ring-1 ring-navy-900/5 transition-shadow duration-500 hover:shadow-[0_2px_4px_rgba(11,31,58,0.05),0_40px_80px_-30px_rgba(11,31,58,0.35)]", wide ? "flex-col md:flex-row" : "flex-col")}
    >
      <div className={cn("relative overflow-hidden", wide ? "aspect-[4/3] md:order-2 md:aspect-auto md:min-h-[440px] md:flex-1" : "aspect-[4/3]")}>
        <motion.div className="absolute inset-[-12px] transition-transform duration-700 ease-out group-hover:scale-[1.04]" style={reduce ? undefined : { x: ix, y: iy }}>
          <SolutionVisual id={sol.id} />
        </motion.div>
        <StatusPill status={status} />
      </div>

      <div className={cn("relative flex flex-col p-7 md:p-9", wide && "md:w-[42%] md:justify-center")}>
        <div className={cn("text-sm text-muted", locale === "ar" ? "" : "font-arabic")} lang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? sol.name : sol.nameAr}</div>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-navy-900 md:text-[28px]">{localName(sol, locale)}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-navy-700/80">{t(sol.shortDescription)}</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <BuildWithAIButton solutionId={sol.id} size="lg" className="rounded-full px-6" />
          <Link href={`/deployments/${sol.id}`} className="group/link inline-flex items-center gap-1 text-sm font-medium text-teal-700">
            {status === "live" ? t("Deployment log") : t("How it works")} <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1 rtl:-scale-x-100 rtl:group-hover/link:-translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function StatusPill({ status }: { status: Status }) {
  const t = useT();
  if (status === "ready") return null;
  return (
    <span className={cn("absolute start-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold shadow-card backdrop-blur", status === "live" ? "text-emerald-700" : "text-teal-700")}>
      {status === "live" ? <CheckCircle2 className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
      {status === "live" ? t("Live") : t("Deploying")}
    </span>
  );
}

function MarketplaceCard() {
  const reduce = useReducedMotion();
  const t = useT();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
      className="group flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_50px_-24px_rgba(11,31,58,0.25)] ring-1 ring-navy-900/5 md:flex-row"
    >
      <div className="relative aspect-[4/3] overflow-hidden md:order-2 md:aspect-auto md:min-h-[380px] md:flex-1">
        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"><SolutionVisual id="marketplace" /></div>
      </div>
      <div className="flex flex-col justify-center p-7 md:w-[42%] md:p-9">
        <h3 className="text-2xl font-semibold tracking-tight text-navy-900 md:text-[28px]">{t("AI services, matched to you.")}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-navy-700/80">{t("21 competitiveness services, ready in seconds.")}</p>
        <Link href="/services" className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800">
          {t("Explore")} <ArrowRight className="size-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </motion.article>
  );
}
