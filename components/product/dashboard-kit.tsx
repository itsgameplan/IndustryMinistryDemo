"use client";

// Clean, card-based dashboard building blocks shared by both dashboard experiences.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "motion/react";
import {
  Activity, BadgeCheck, Boxes, Contact, Cpu, Factory as FactoryIcon, Globe, HardHat, Mail, MessageCircle, Radio, Receipt,
  ShieldCheck, Sparkles, Users, Warehouse, Zap, type LucideIcon,
} from "lucide-react";
import { ScoreRing } from "@/components/product/primitives";
import { REQUIREMENTS, tierDef } from "@/lib/data/tiers";
import { SOLUTIONS } from "@/lib/data/solutions";
import { deploymentKey, maturityScore, nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Factory, SolutionId } from "@/lib/types";

// ---------------- Count-up number ----------------
export function CountUp({ value, duration = 1.1, decimals = 0, suffix = "" }: { value: number; duration?: number; decimals?: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  // Animate from whatever is on screen, so live values glide instead of restarting at 0.
  const from = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const controls = animate(from.current, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { from.current = v; setShown(v); } });
    return () => controls.stop();
  }, [value, duration, reduce]);
  return <>{shown.toFixed(decimals)}{suffix}</>;
}

// ---------------- Lift card ----------------
/** Card with a gentle hover lift + light sweep. */
export function LiftCard({ children, className, delay = 0, as = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -4 }}
      className={cn("group relative overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow duration-300 hover:shadow-lift", className)}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      {children}
    </Comp>
  );
}

// ---------------- Digital maturity ----------------
export function MaturityCard({ className }: { className?: string }) {
  const { state, tier } = useActiveFactory();
  const reduce = useReducedMotion();
  const tr = useT();
  const { locale } = useLocale();
  const score = maturityScore(state.completedRequirements);
  const p = nextTierProgress(state.completedRequirements);
  const t = tierDef(tier);
  const nameOf = (d: { name: string; nameAr: string }) => (locale === "ar" ? d.nameAr : d.name);
  const nextReqs = p.next != null ? REQUIREMENTS.filter((r) => r.tier === p.next) : [];
  const [hover, setHover] = useState<string | null>(null);
  const hovered = nextReqs.find((r) => r.id === hover);

  return (
    <LiftCard className={cn("p-6", className)}>
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 size-48 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-35" style={{ backgroundColor: t.color }} />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{tr("Digital maturity")}</span>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">{tr("Provisional")}</span>
      </div>

      <div className="relative mt-4 flex items-center gap-5">
        <ScoreRing value={score} size={112} stroke={9} color={t.color} label={<CountUp value={score} />} sublabel={tr("score")} />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{tr("Tier {tier}", { tier })}</div>
          <div className="text-2xl font-semibold tracking-tight text-navy-900">{nameOf(t)}</div>
          <div className="mt-0.5 text-sm text-muted">{tr(t.tagline)}</div>
        </div>
      </div>

      {p.next != null ? (
        <div className="relative mt-6">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-navy-700">{tr("Next · Tier {tier} {name}", { tier: p.next, name: nameOf(tierDef(p.next)) })}</span>
            <span className="tabular-nums text-muted">{p.done}/{p.total}</span>
          </div>
          <div className="mt-2 flex gap-1.5" onMouseLeave={() => setHover(null)}>
            {nextReqs.map((r, i) => {
              const done = state.completedRequirements.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-label={tr(done ? "{title}: met" : "{title}: outstanding", { title: tr(r.title) })}
                  onMouseEnter={() => setHover(r.id)}
                  onFocus={() => setHover(r.id)}
                  onBlur={() => setHover(null)}
                  className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-navy-900/[0.07] outline-none transition-transform duration-200 hover:scale-y-150 focus-visible:ring-2 focus-visible:ring-teal-300"
                >
                  {done ? (
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full rtl:origin-right"
                      style={{ backgroundColor: tierDef(p.next!).color }}
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, delay: reduce ? 0 : 0.3 + i * 0.12 }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 h-4 text-xs text-muted" aria-live="polite">
            {hovered ? (
              <span className={state.completedRequirements.includes(hovered.id) ? "text-emerald-700" : "text-navy-700"}>
                {state.completedRequirements.includes(hovered.id) ? "✓ " : "○ "}{tr(hovered.title)}
              </span>
            ) : (
              <span>{tr("Hover a segment to see each requirement")}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="relative mt-6 rounded-xl bg-gold-50 px-3 py-2 text-sm font-medium text-gold-600">{tr("All tiers met")}</div>
      )}
    </LiftCard>
  );
}

// ---------------- Your systems ----------------
const SYSTEM_ICONS: [RegExp, LucideIcon][] = [
  [/website|online/i, Globe],
  [/whatsapp/i, MessageCircle],
  [/email/i, Mail],
  [/accounting|invoic/i, Receipt],
  [/erp/i, Boxes],
  [/hr|payroll/i, Users],
  [/polic|sop/i, ShieldCheck],
  [/inventory|wms/i, Warehouse],
  [/mes|production/i, FactoryIcon],
  [/connected|iot|opc/i, Radio],
  [/iso|qms|quality/i, BadgeCheck],
  [/predictive/i, Activity],
  [/energy/i, Zap],
  [/crm/i, Contact],
  [/safety/i, HardHat],
];
const iconFor = (name: string) => SYSTEM_ICONS.find(([re]) => re.test(name))?.[1] ?? Cpu;

const SYSTEM_SOLUTION: Record<string, SolutionId> = { Website: "website", "Business email": "website", "Policies & SOPs": "compliance", "Written policies": "compliance", "Documented SOPs": "compliance", "Predictive maintenance": "maintenance" };

const STATUS = {
  active: { label: "Live", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", icon: "bg-navy-900 text-white" },
  partial: { label: "Partial", dot: "bg-amber-400", chip: "bg-amber-50 text-amber-700", icon: "bg-amber-50 text-amber-600" },
  missing: { label: "Missing", dot: "bg-navy-900/20", chip: "bg-navy-900/[0.04] text-muted", icon: "bg-navy-900/[0.05] text-navy-500/60" },
} as const;

/** Reported systems, upgraded to "active" when a Jahez AI solution has built them. */
export function resolveSystems(factory: Factory, unlocked: SolutionId[], systemBuilds: Record<string, { status: "running" | "completed" }> = {}) {
  return factory.systems.map((sys) => {
    const via = SYSTEM_SOLUTION[sys.name];
    const built = (via != null && unlocked.includes(via)) || systemBuilds[sys.name]?.status === "completed";
    return { ...sys, status: built ? ("active" as const) : sys.status, built: built ? (via && unlocked.includes(via) ? SOLUTIONS[via].name : sys.name) : undefined, building: systemBuilds[sys.name]?.status === "running" };
  });
}

export function SystemsGrid({ className, title = "Your systems" }: { className?: string; title?: string }) {
  const { id: factoryId, factory, state } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const startDeployment = useJahez((s) => s.startDeployment);
  const startSystemBuild = useJahez((s) => s.startSystemBuild);
  const t = useT();
  const systems = resolveSystems(factory, state.unlockedSolutions, state.systemBuilds);
  const order = { active: 0, partial: 1, missing: 2 } as const;
  systems.sort((a, b) => Number(Boolean(b.built)) - Number(Boolean(a.built)) || order[a.status] - order[b.status]);
  const live = systems.filter((s) => s.status === "active").length;

  return (
    <section className={className} aria-labelledby="systems-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="systems-title" className="text-lg font-semibold tracking-tight text-navy-900">{t(title)}</h2>
        {systems.length ? <span className="text-sm tabular-nums text-muted"><span className="font-semibold text-navy-900">{live}</span> / {t("{total} live", { total: systems.length })}</span> : null}
      </div>
      {!systems.length ? (
        <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{t("No systems reported yet.")}</div>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {systems.map((s, i) => {
            const st = STATUS[s.status];
            const Icon = iconFor(s.name);
            const solutionId = SYSTEM_SOLUTION[s.name];
            const dedicated = solutionId && SOLUTIONS[solutionId].factory === factoryId && (state.unlockedSolutions.includes(solutionId) || s.status !== "active");
            const href = dedicated
              ? state.unlockedSolutions.includes(solutionId) ? (solutionId === "compliance" ? `${SOLUTIONS[solutionId].route}#sops` : SOLUTIONS[solutionId].route) : `/deployments/${solutionId}`
              : `/systems/${encodeURIComponent(s.name)}`;
            return (
              <LiftCard as="li" key={s.name} delay={0.03 * i} className={cn(s.built && "border-teal-200 bg-gradient-to-br from-teal-50/70 to-white")}>
                <Link href={href} aria-label={`${t(s.name)}: ${t(s.building ? "building" : s.status)}. ${t(s.status === "active" ? "Open system" : s.status === "partial" ? "Complete build" : "Build system")}`} className="block h-full rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" onClick={() => {
                  if (s.status !== "partial" || s.building) return;
                  if (dedicated && solutionId && !deployments[deploymentKey(factoryId, solutionId)]) startDeployment(factoryId, solutionId);
                  else if (!dedicated) startSystemBuild(factoryId, s.name);
                }}>
                <div className="relative flex items-start justify-between">
                  <span className={cn("grid size-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110", s.built ? "bg-gradient-to-br from-teal-400 to-teal-600 text-white" : st.icon)}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className={cn("mt-1 size-2 rounded-full", st.dot, s.status === "active" && "animate-pulse")} aria-hidden />
                </div>
                <div className="relative mt-3 truncate text-sm font-semibold text-navy-900" title={t(s.name)}>{t(s.name)}</div>
                <div className="relative mt-1.5">
                  {s.building ? (
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">{t("Building…")}</span>
                  ) : s.built ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100/80 px-2 py-0.5 text-[10.5px] font-semibold text-teal-700"><Sparkles className="size-3" /> {t("Built by Jahez")}</span>
                  ) : (
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold", st.chip)}>{t(st.label)}</span>
                  )}
                </div>
                </Link>
              </LiftCard>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Small link-style chip used for compact banners. */
export function ChipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-navy-800 transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-teal-700 hover:shadow-card">
      {children}
    </Link>
  );
}
