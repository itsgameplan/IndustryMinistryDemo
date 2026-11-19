"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Brain, Check, ChevronDown, ClipboardCheck, Clock, Factory, FileText, Gauge, Globe, Laptop, Loader2, Lock,
  RotateCcw, ShieldCheck, Ship, Sparkles, Star, Truck, Users, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Progress } from "@/components/ui";
import { BuildWithAIButton } from "@/components/shell/shared";
import { ScoreRing, requirementState, type RequirementState } from "@/components/product/primitives";
import { CountUp } from "@/components/product/dashboard-kit";
import { AXES, DEFAULT_ANSWERS, QUESTIONS, selfReportedByAxis } from "@/components/product/assessment-questions";
import { REQUIREMENTS, requirementsForTier, tierDef } from "@/lib/data/tiers";
import type { Deployment, FactoryId, Requirement } from "@/lib/types";
import { computeTier, maturityScore, nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

type Phase = "intro" | "questions" | "analysing" | "result";

export function AssessmentFlow() {
  const { id, factory, state } = useActiveFactory();
  const setAssessment = useJahez((s) => s.setAssessment);
  const t = useT();
  const { locale } = useLocale();
  const [phase, setPhase] = useState<Phase>(state.assessment ? "result" : "intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const saved = state.assessment?.answers;
    const base = { ...DEFAULT_ANSWERS[id] };
    if (saved) for (const [k, v] of Object.entries(saved)) if (typeof v === "string") base[k] = v;
    return base;
  });

  const finish = () => {
    const completed = useJahez.getState().factories[id].completedRequirements;
    setAssessment(id, { completedAt: Date.now(), answers, provisionalTier: computeTier(completed), score: maturityScore(completed) });
    setPhase("result");
    toast.success(t("Provisional classification ready"), { description: t("{name} · demo simulation", { name: locale === "ar" ? factory.nameAr : factory.name }) });
  };

  if (phase === "intro") return <Intro onStart={() => { setStep(0); setPhase("questions"); }} />;
  if (phase === "questions")
    return (
      <Questionnaire
        step={step}
        answers={answers}
        onAnswer={(qid, v) => setAnswers((a) => ({ ...a, [qid]: v }))}
        onBack={() => (step === 0 ? setPhase(state.assessment ? "result" : "intro") : setStep(step - 1))}
        onNext={() => (step === QUESTIONS.length - 1 ? setPhase("analysing") : setStep(step + 1))}
      />
    );
  if (phase === "analysing") return <Analysing onDone={finish} />;
  return <Results answers={state.assessment?.answers ?? answers} onRetake={() => { setStep(0); setPhase("questions"); }} />;
}

// ------------------------------------------------------------------ Intro
function Intro({ onStart }: { onStart: () => void }) {
  const { factory } = useActiveFactory();
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const factoryName = locale === "ar" ? factory.nameAr : factory.name;
  const steps = [
    { icon: ClipboardCheck, title: t("8 quick questions"), body: t("Pre-filled from your profile.") },
    { icon: Brain, title: t("AI analysis"), body: t("Matched to {count} tier requirements.", { count: REQUIREMENTS.length }) },
    { icon: BadgeCheck, title: t("Provisional result"), body: t("Tier, score and next steps.") },
  ];
  return (
    <div className="mx-auto max-w-5xl">
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[32px] border border-white bg-white/85 px-6 py-12 text-center shadow-[0_18px_44px_-24px_rgba(11,31,58,0.25)] md:px-12 md:py-16"
      >
        <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-0 size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,#99EADF,#C7D2FE,#F4EACB,#99EADF)] opacity-40 blur-3xl" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-navy-900 text-white shadow-lift"><ClipboardCheck className="size-6" /></span>
        <h1 className="relative mt-6 text-3xl font-bold tracking-[-0.025em] text-navy-900 md:text-5xl">{t("Find your starting point.")}</h1>
        <p className="relative mx-auto mt-3 max-w-md text-[15px] text-muted md:text-lg">{t("A 2-minute AI assessment for {name}.", { name: factoryName })}</p>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onStart} className="inline-flex h-12 items-center gap-2 rounded-full bg-navy-900 px-7 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-navy-800">
            {t("Begin assessment")} <ArrowRight className="size-4 rtl:-scale-x-100" />
          </button>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted"><Clock className="size-4" /> {t("About 2 minutes")}</span>
        </div>
      </motion.section>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
            whileHover={reduce ? undefined : { y: -4 }}
            className="flex items-center gap-4 rounded-[24px] border border-white bg-white/85 p-5 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_16px_40px_-22px_rgba(11,31,58,0.25)]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600"><s.icon className="size-5" /></span>
            <div>
              <div className="text-[15px] font-semibold text-navy-900">{i + 1}. {s.title}</div>
              <div className="text-[13px] text-muted">{s.body}</div>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-muted">{t("Results are a provisional demo simulation, not an official classification.")}</p>
    </div>
  );
}

// ------------------------------------------------------------------ Questionnaire
function Questionnaire({ step, answers, onAnswer, onBack, onNext }: { step: number; answers: Record<string, string>; onAnswer: (qid: string, v: string) => void; onBack: () => void; onNext: () => void }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { isRtl } = useLocale();
  const q = QUESTIONS[step];
  const last = step === QUESTIONS.length - 1;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">{t("Maturity assessment")}</div>
        <div className="text-xs tabular-nums text-muted">{t("Question {current} of {total}", { current: step + 1, total: QUESTIONS.length })}</div>
      </div>
      <Progress value={((step + 1) / QUESTIONS.length) * 100} className="mb-8 h-1.5" />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <ol className="hidden space-y-1 lg:block" aria-label={t("Questions")}>
          {QUESTIONS.map((x, i) => (
            <li key={x.id} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm", i === step ? "bg-white font-medium text-navy-900 shadow-card" : i < step ? "text-navy-700" : "text-muted")}>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold", i < step ? "bg-teal-500 text-white" : i === step ? "bg-navy-900 text-white" : "bg-navy-900/[0.06] text-navy-500")}>
                {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className="truncate">{t(x.axis)}</span>
            </li>
          ))}
        </ol>
        <AnimatePresence mode="wait">
          <motion.fieldset
            key={q.id}
            initial={reduce ? false : { opacity: 0, x: isRtl ? -16 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: isRtl ? 16 : -16 }}
            transition={{ duration: 0.22 }}
            className="min-w-0"
          >
            <legend className="sr-only">{t(q.title)}</legend>
            <Badge tone="outline">{t(q.axis)}</Badge>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-navy-900 md:text-2xl" aria-hidden>{t(q.title)}</h2>
            <p className="mt-1.5 text-sm text-muted">{t(q.help)}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {q.options.map((o, i) => {
                const selected = answers[q.id] === o.value;
                return (
                  <label key={o.value} className={cn("group relative flex cursor-pointer gap-3 rounded-2xl border bg-white p-4 transition focus-within:ring-2 focus-within:ring-teal-400 hover:border-navy-500/30", selected ? "border-teal-400 shadow-card ring-1 ring-teal-400" : "border-line")}>
                    <input type="radio" name={q.id} value={o.value} checked={selected} onChange={() => onAnswer(q.id, o.value)} className="sr-only" />
                    <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition", selected ? "border-teal-500 bg-teal-500" : "border-navy-500/30")}>
                      {selected ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-navy-900">{t(o.label)}</span>
                      <span className="block text-xs text-muted">{t(o.hint)}</span>
                    </span>
                    <span className="ms-auto flex shrink-0 gap-0.5 self-start pt-1" aria-hidden>
                      {[0, 1, 2].map((d) => <span key={d} className={cn("h-3 w-1 rounded-full", d < i ? "bg-teal-400" : "bg-navy-900/10")} />)}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={onBack}><ArrowLeft className="rtl:-scale-x-100" /> {t("Back")}</Button>
              <Button onClick={onNext} disabled={!answers[q.id]} variant={last ? "accent" : "primary"}>
                {last ? <><Sparkles /> {t("Analyse with AI")}</> : <>{t("Next")} <ArrowRight className="rtl:-scale-x-100" /></>}
              </Button>
            </div>
          </motion.fieldset>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Analysing
function Analysing({ onDone }: { onDone: () => void }) {
  const { factory } = useActiveFactory();
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const steps = [
    t("Reading registry profile {number}", { number: factory.registrationNo }),
    t("Scoring {count} self-reported signals", { count: QUESTIONS.length }),
    t("Matching against {count} tier requirements", { count: REQUIREMENTS.length }),
    t("Identifying gaps Jahez AI agents can close"),
    t("Computing provisional classification"),
  ];
  const [done, setDone] = useState(0);

  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setDone(i + 1), 750 * (i + 1)));
    const end = setTimeout(onDone, 750 * steps.length + 450);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(end);
    };
    // Run once on mount; the sequence is fixed-length.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-xl py-6 md:py-12">
      <div className="relative overflow-hidden rounded-3xl bg-navy-950 p-8 text-white shadow-lift md:p-10" role="status" aria-live="polite">
        <div className="bg-grid-dark absolute inset-0" aria-hidden />
        <div className="relative">
          <div className="relative mx-auto grid size-20 place-items-center">
            {!reduce ? <span className="absolute inset-0 animate-pulse-ring rounded-full bg-teal-400/30" aria-hidden /> : null}
            <motion.span
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-dashed border-teal-300/40"
              aria-hidden
            />
            <span className="grid size-14 place-items-center rounded-2xl bg-teal-500 shadow-lift"><Brain className="size-7" /></span>
          </div>
          <h2 className="mt-6 text-center text-xl font-semibold tracking-tight">{t("Jahez AI is analysing {name}", { name: locale === "ar" ? factory.nameAr : factory.name })}</h2>
          <p className="mt-1 text-center text-sm text-white/55">{t("Building a provisional maturity profile")}</p>
          <ul className="mt-8 space-y-3">
            {steps.map((s, i) => {
              const st = i < done ? "done" : i === done ? "active" : "pending";
              return (
                <li key={s} className={cn("flex items-center gap-3 text-sm transition-opacity", st === "pending" ? "opacity-35" : "opacity-100")}>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", st === "done" ? "bg-teal-500" : "bg-white/10")}>
                    {st === "done" ? <Check className="size-3" strokeWidth={3} /> : st === "active" ? <Loader2 className="size-3 animate-spin" /> : null}
                  </span>
                  <span className={st === "done" ? "text-white" : "text-white/75"}>{s}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-teal-400 transition-[width] duration-700 ease-out" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Results
const CATEGORY_META: Record<Requirement["category"], { icon: LucideIcon; color: string }> = {
  presence: { icon: Globe, color: "#0EA5E9" },
  governance: { icon: FileText, color: "#F59E0B" },
  finance: { icon: Laptop, color: "#3B82F6" },
  people: { icon: Users, color: "#6366F1" },
  safety: { icon: ShieldCheck, color: "#10B981" },
  supply: { icon: Truck, color: "#14B8A6" },
  operations: { icon: Factory, color: "#64748B" },
  quality: { icon: BadgeCheck, color: "#8B5CF6" },
  ai: { icon: Sparkles, color: "#A855F7" },
  security: { icon: Lock, color: "#0F172A" },
  export: { icon: Ship, color: "#0284C7" },
};

const EASE = [0.16, 1, 0.3, 1] as const;
const softCard = "rounded-[28px] border border-white bg-white/80 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_18px_44px_-24px_rgba(11,31,58,0.22)] backdrop-blur";

function Results({ answers, onRetake }: { answers: Record<string, string | string[]>; onRetake: () => void }) {
  const { id, factory, state, tier } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const completed = state.completedRequirements;
  const score = maturityScore(completed);
  const p = nextTierProgress(completed);
  const self = selfReportedByAxis(answers);
  const chart = AXES.map(({ axis, categories }) => {
    const reqs = REQUIREMENTS.filter((r) => categories.includes(r.category));
    const met = reqs.filter((r) => completed.includes(r.id)).length;
    return { axis, verified: Math.round((met / Math.max(1, reqs.length)) * 100), self: self[axis] };
  });
  const assessedAt = state.assessment ? new Date(state.assessment.completedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  const metCount = REQUIREMENTS.filter((r) => completed.includes(r.id)).length;
  const td = tierDef(tier);
  const remaining = p.next != null ? p.total - p.done : 0;

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-32 -top-48 size-[640px] rounded-full bg-[radial-gradient(circle,rgba(199,210,254,0.55),transparent_62%)]" />
        <div className="absolute -left-40 top-32 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(153,234,223,0.35),transparent_65%)]" />
      </div>

      {/* Hero */}
      <section className="grid items-center gap-8 pb-8 pt-2 lg:grid-cols-[1fr_auto] lg:pb-10">
        <div>
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] font-semibold uppercase tracking-[0.2em] text-teal-600">
            {t("Maturity assessment")}
          </motion.div>
          <motion.h1 initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: EASE }} className="mt-3 text-4xl font-bold tracking-[-0.03em] text-navy-900 md:text-[56px] md:leading-[1.05]">
            {locale === "ar" ? factory.nameAr : factory.name} · {score}/100
          </motion.h1>
          <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mt-3 text-lg text-muted md:text-[22px]">
            {t("Provisional tier: Tier {tier} — {name}", { tier, name: locale === "ar" ? td.nameAr : td.name })}
          </motion.p>
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2.5 rounded-2xl bg-white/70 px-4 py-3 text-[15px] font-medium text-navy-900 shadow-sm ring-1 ring-white backdrop-blur">
              <Star className="size-5 text-teal-500" />
              {assessedAt ? t("Assessed {date}", { date: assessedAt }) : t("Assessment")}
              {" · "}
              {p.next != null ? t(remaining === 1 ? "{count} requirement to Tier {tier}" : "{count} requirements to Tier {tier}", { count: remaining, tier: p.next }) : t("All tiers met")}
            </span>
            <button type="button" onClick={onRetake} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white/70 px-4 text-[15px] font-semibold text-navy-900 shadow-sm ring-1 ring-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
              <RotateCcw className="size-4" /> {t("Retake")}
            </button>
          </motion.div>
        </div>

        <ScoreBadge score={score} color={td.color} tier={tier} />
      </section>

      {/* Category profile */}
      <motion.section initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease: EASE }} className={cn(softCard, "p-6 md:p-8")}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{t("Maturity by category")}</h2>
            <p className="mt-0.5 text-sm text-muted">{t("Requirements met versus your self-reported answers.")}</p>
          </div>
          <div className="flex gap-4 text-[13px] text-navy-800">
            <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-teal-500" /> {t("Met in Jahez")}</span>
            <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full border-2 border-dashed border-amber-400 bg-amber-100" /> {t("Self-reported")}</span>
          </div>
        </div>
        <div className="mt-2 grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="h-[320px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chart} outerRadius="72%" margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="axis" tickFormatter={(v: string) => t(v)} tick={{ fill: "#1E3A63", fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip formatter={(v) => `${v}/100`} contentStyle={{ borderRadius: 14, border: "1px solid #E5E8EE", fontSize: 12, boxShadow: "0 10px 30px -12px rgba(11,31,58,0.3)" }} />
                <Radar name={t("Self-reported")} dataKey="self" stroke="#F59E0B" fill="#FCD34D" fillOpacity={0.18} strokeDasharray="5 4" isAnimationActive={!reduce} animationDuration={900} />
                <Radar name={t("Met in Jahez")} dataKey="verified" stroke="#0FA396" fill="#14B8A6" fillOpacity={0.45} isAnimationActive={!reduce} animationDuration={1100} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3">
            {chart.map((c, i) => (
              <li key={c.axis}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-navy-900">{t(c.axis)}</span>
                  <span className="tabular-nums text-muted">{c.verified}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-900/[0.06]">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600" initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(2, c.verified)}%` }} transition={{ duration: 0.9, delay: 0.4 + i * 0.07, ease: EASE }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      {/* Requirement checklist (collapsible) */}
      <ChecklistPanel tier={tier} defaultTab={p.next ?? 4} completed={completed} factoryId={id} deployments={deployments} />

      {/* Summary */}
      <motion.section initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35, ease: EASE }} className={cn(softCard, "mt-5 flex flex-col gap-6 p-5 md:p-7 xl:flex-row xl:items-center")}>
        <div className="grid flex-1 gap-5 sm:grid-cols-3 sm:divide-x sm:divide-line">
          <SummaryStat icon={<Gauge className="size-6" />} tone="teal" label={t("Maturity score")} value={<><CountUp value={score} /><span className="text-base text-muted">/100</span></>} />
          <SummaryStat icon={<BadgeCheck className="size-6" />} tone="blue" label={t("Provisional tier")} value={t("Tier {tier}", { tier })} />
          <SummaryStat icon={<Check className="size-6" strokeWidth={3} />} tone="green" label={t("Requirements met")} value={<><CountUp value={metCount} /><span className="text-base text-muted">/{REQUIREMENTS.length}</span></>} />
        </div>
        <div className="flex flex-col items-stretch gap-2 xl:w-[300px]">
          <Link href="/roadmap" className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 px-6 text-[17px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(15,163,150,0.7)] transition hover:-translate-y-0.5">
            {t("View roadmap")} <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
          </Link>
          <Link href="/solutions" className="group inline-flex items-center justify-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900">
            {t("AI solutions")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </motion.section>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <AlertTriangle className="size-3.5" /> {t("Provisional result based on self-reported answers · final classification requires evidence review and inspection.")}
      </p>
    </div>
  );
}

/** Floating glass badge with the animated maturity score. */
function ScoreBadge({ score, color, tier }: { score: number; color: string; tier: number }) {
  const reduce = useReducedMotion();
  const t = useT();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }} className="relative mx-auto grid size-[260px] place-items-center md:size-[300px] lg:me-8">
      <motion.div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-200/70 via-sky-200/60 to-indigo-300/60 blur-2xl" animate={reduce ? undefined : { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute inset-3 rounded-full bg-white/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.9),0_20px_60px_-20px_rgba(15,163,150,0.5)] ring-[6px] ring-white/60 backdrop-blur-xl" />
      <motion.div aria-hidden className="absolute inset-3 rounded-full border-2 border-teal-100" animate={reduce ? undefined : { rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} style={{ borderTopColor: "rgba(15,163,150,0.5)" }} />
      <motion.div animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="relative grid place-items-center rounded-full bg-white/90 p-3 shadow-[0_18px_40px_-16px_rgba(11,31,58,0.35)]">
        <ScoreRing value={score} size={190} stroke={14} color={color} label={<CountUp value={score} />} sublabel={t("Tier {tier} · maturity", { tier })} />
      </motion.div>
    </motion.div>
  );
}

function ChecklistPanel({ tier, defaultTab, completed, factoryId, deployments }: { tier: number; defaultTab: number; completed: string[]; factoryId: FactoryId; deployments: Record<string, Deployment> }) {
  const reduce = useReducedMotion();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(defaultTab);
  const tabReqs = requirementsForTier(tab);
  const tabMet = tabReqs.filter((r) => completed.includes(r.id)).length;
  const totalMet = REQUIREMENTS.filter((r) => completed.includes(r.id)).length;

  return (
    <motion.section initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28, ease: EASE }} className={cn(softCard, "mt-5 overflow-hidden")}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 px-5 py-5 text-start transition hover:bg-white/60 md:px-7">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-600"><ClipboardCheck className="size-6" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-navy-900">{t("Requirement checklist")}</span>
          <span className="block text-sm text-muted">{t("{met} of {total} requirements met across all tiers", { met: totalMet, total: REQUIREMENTS.length })}</span>
        </span>
        <span className="hidden h-2 w-32 overflow-hidden rounded-full bg-navy-900/[0.06] sm:block">
          <motion.span className="block h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600" initial={reduce ? false : { width: 0 }} animate={{ width: `${(totalMet / REQUIREMENTS.length) * 100}%` }} transition={{ duration: 0.9, delay: 0.5, ease: EASE }} />
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }} className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-navy-700">
          <ChevronDown className="size-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35, ease: EASE }} className="overflow-hidden">
            <div className="border-t border-line px-5 pb-6 pt-5 md:px-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("Tier")}>
                  {[1, 2, 3, 4].map((n) => {
                    const reqs = requirementsForTier(n);
                    const met = reqs.filter((r) => completed.includes(r.id)).length;
                    const active = tab === n;
                    return (
                      <button key={n} type="button" role="tab" aria-selected={active} onClick={() => setTab(n)} className={cn("relative inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition", active ? "text-white" : "bg-canvas text-navy-800 hover:bg-navy-900/[0.06]")}>
                        {active ? <motion.span layoutId="assess-tab" className="absolute inset-0 rounded-xl bg-navy-900 shadow-lg" transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
                        <span className="relative">{t("Tier {tier}", { tier: n })}</span>
                        {met === reqs.length ? <Check className={cn("relative size-4", active ? "text-teal-300" : "text-emerald-600")} strokeWidth={3} /> : <span className={cn("relative rounded-md px-1.5 text-xs tabular-nums", active ? "bg-white/15" : "bg-white text-muted")}>{met}/{reqs.length}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="w-full lg:w-72">
                  <div className="flex items-baseline justify-between text-sm"><span className="text-navy-800">{t("Tier {tier} progress", { tier: tab })}</span><span className="font-semibold tabular-nums text-navy-900">{tabMet} / {tabReqs.length}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-900/[0.06]">
                    <motion.div key={tab} className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(4, (tabMet / tabReqs.length) * 100)}%` }} transition={{ duration: 0.8, ease: EASE }} />
                  </div>
                </div>
              </div>
              <ul key={tab} className="mt-5 space-y-2.5">
                {tabReqs.map((r, i) => {
                  const s = requirementState(r, factoryId, completed, deployments);
                  const meta = CATEGORY_META[r.category];
                  return (
                    <motion.li key={r.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }} className={cn("flex flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:items-center", s.kind === "met" ? "bg-emerald-50/60" : "bg-canvas/80")}>
                      <div className="flex min-w-0 flex-1 items-center gap-3.5">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white" style={{ color: meta.color }}><meta.icon className="size-5" /></span>
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-navy-900">{t(r.title)}</div>
                          <div className="text-[13px] text-muted">{t(r.description)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ps-14 sm:ps-0">
                        <StatusTag kind={s.kind} />
                        {s.kind === "available" && tab <= tier + 1 ? <BuildWithAIButton solutionId={s.solution.id} size="sm" className="rounded-full" label={t("Build")} /> : null}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
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

function StatusTag({ kind }: { kind: RequirementState["kind"] }) {
  const t = useT();
  if (kind === "met") return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/70 px-3 py-1.5 text-[13px] font-semibold text-emerald-700"><Check className="size-3.5" strokeWidth={3} /> {t("Met")}</span>;
  if (kind === "deploying") return <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-[13px] font-semibold text-teal-700"><Loader2 className="size-3.5 animate-spin" /> {t("Building")}</span>;
  if (kind === "available") return <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1.5 text-[13px] font-semibold text-gold-600"><Sparkles className="size-3.5" /> {t("AI can build")}</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[13px] font-semibold text-navy-700 ring-1 ring-inset ring-line"><Lock className="size-3.5" /> {t("Missing")}</span>;
}
