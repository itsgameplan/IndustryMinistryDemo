"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ArrowLeft, ArrowRight, Brain, Check, CheckCircle2, ClipboardCheck, Clock, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DemoDisclaimer, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { BuildWithAIButton, PageHeader, TierBadge } from "@/components/shell/shared";
import { RequirementPill, ScoreRing, requirementState } from "@/components/product/primitives";
import { AXES, DEFAULT_ANSWERS, QUESTIONS, selfReportedByAxis } from "@/components/product/assessment-questions";
import { REQUIREMENTS, requirementsForTier, tierDef } from "@/lib/data/tiers";
import { computeTier, maturityScore, nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";

type Phase = "intro" | "questions" | "analysing" | "result";

export function AssessmentFlow() {
  const { id, factory, state } = useActiveFactory();
  const setAssessment = useJahez((s) => s.setAssessment);
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
    toast.success("Provisional classification ready", { description: `${factory.name} · demo simulation` });
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
  return (
    <div>
      <PageHeader eyebrow="Maturity assessment" title="Let's find your starting point" description="Eight quick questions. Jahez AI combines your answers with your factory profile to produce a provisional tier and a tailored roadmap." />
      <section className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-card lg:grid-cols-[1.3fr_1fr]">
        <div className="bg-grid p-6 md:p-10">
          <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-white shadow-lift"><ClipboardCheck className="size-6" /></span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-navy-900 md:text-2xl">Assessment for {factory.name}</h2>
          <p className="mt-2 max-w-lg text-[15px] text-navy-700">We&apos;ve pre-filled answers from your onboarding profile. Review each one and adjust anything that has changed.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={onStart}>Begin assessment <ArrowRight /></Button>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted"><Clock className="size-4" /> About 2 minutes</span>
          </div>
        </div>
        <div className="border-t border-line bg-canvas/60 p-6 md:p-8 lg:border-l lg:border-t-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">What happens</div>
          <ol className="mt-3 space-y-4">
            {[
              ["Answer 8 questions", "Web presence, contact channels, accounting, HR, SOPs, quality, production and connectivity."],
              ["AI analysis", "Your signals are matched against the 19 requirements of the five-tier framework."],
              ["Provisional result", "A tier, maturity score, category profile and the gaps Jahez can close for you."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-navy-700 ring-1 ring-line">{i + 1}</span>
                <div><div className="text-sm font-medium text-navy-900">{t}</div><p className="text-xs text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
          <DemoDisclaimer className="mt-6">Results are a provisional demo simulation, not an official classification.</DemoDisclaimer>
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Questionnaire
function Questionnaire({ step, answers, onAnswer, onBack, onNext }: { step: number; answers: Record<string, string>; onAnswer: (qid: string, v: string) => void; onBack: () => void; onNext: () => void }) {
  const reduce = useReducedMotion();
  const q = QUESTIONS[step];
  const last = step === QUESTIONS.length - 1;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">Maturity assessment</div>
        <div className="text-xs tabular-nums text-muted">Question {step + 1} of {QUESTIONS.length}</div>
      </div>
      <Progress value={((step + 1) / QUESTIONS.length) * 100} className="mb-8 h-1.5" />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <ol className="hidden space-y-1 lg:block" aria-label="Questions">
          {QUESTIONS.map((x, i) => (
            <li key={x.id} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm", i === step ? "bg-white font-medium text-navy-900 shadow-card" : i < step ? "text-navy-700" : "text-muted")}>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold", i < step ? "bg-teal-500 text-white" : i === step ? "bg-navy-900 text-white" : "bg-navy-900/[0.06] text-navy-500")}>
                {i < step ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className="truncate">{x.axis}</span>
            </li>
          ))}
        </ol>
        <AnimatePresence mode="wait">
          <motion.fieldset
            key={q.id}
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
            className="min-w-0"
          >
            <legend className="sr-only">{q.title}</legend>
            <Badge tone="outline">{q.axis}</Badge>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-navy-900 md:text-2xl" aria-hidden>{q.title}</h2>
            <p className="mt-1.5 text-sm text-muted">{q.help}</p>
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
                      <span className="block text-sm font-medium text-navy-900">{o.label}</span>
                      <span className="block text-xs text-muted">{o.hint}</span>
                    </span>
                    <span className="ml-auto flex shrink-0 gap-0.5 self-start pt-1" aria-hidden>
                      {[0, 1, 2].map((d) => <span key={d} className={cn("h-3 w-1 rounded-full", d < i ? "bg-teal-400" : "bg-navy-900/10")} />)}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={onBack}><ArrowLeft /> Back</Button>
              <Button onClick={onNext} disabled={!answers[q.id]} variant={last ? "accent" : "primary"}>
                {last ? <><Sparkles /> Analyse with AI</> : <>Next <ArrowRight /></>}
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
  const steps = [
    `Reading registry profile ${factory.registrationNo}`,
    `Scoring ${QUESTIONS.length} self-reported signals`,
    `Matching against ${REQUIREMENTS.length} tier requirements`,
    "Identifying gaps Jahez AI agents can close",
    "Computing provisional classification",
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
          <h2 className="mt-6 text-center text-xl font-semibold tracking-tight">Jahez AI is analysing {factory.name}</h2>
          <p className="mt-1 text-center text-sm text-white/55">Building a provisional maturity profile</p>
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
function Results({ answers, onRetake }: { answers: Record<string, string | string[]>; onRetake: () => void }) {
  const { id, factory, state, tier } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const completed = state.completedRequirements;
  const score = maturityScore(completed);
  const p = nextTierProgress(completed);
  const self = selfReportedByAxis(answers);
  const chart = AXES.map(({ axis, categories }) => {
    const reqs = REQUIREMENTS.filter((r) => categories.includes(r.category));
    const met = reqs.filter((r) => completed.includes(r.id)).length;
    return { axis, verified: Math.round((met / Math.max(1, reqs.length)) * 100), self: self[axis] };
  });
  const assessedAt = state.assessment ? new Date(state.assessment.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  const defaultTab = String(p.next ?? 4);

  return (
    <div>
      <PageHeader
        eyebrow="Maturity assessment · provisional"
        title={`${factory.name} — assessment result`}
        description={assessedAt ? `Assessed ${assessedAt}. Tier and score update live as Jahez deployments satisfy requirements.` : undefined}
        actions={<Button variant="outline" onClick={onRetake}><RotateCcw /> Retake</Button>}
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="overflow-hidden">
          <div className="bg-grid flex flex-col items-center gap-6 p-6 sm:flex-row md:p-8">
            <ScoreRing value={score} size={148} stroke={12} sublabel="Maturity" />
            <div className="min-w-0 text-center sm:text-left">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Provisional tier</div>
              <TierBadge tier={tier} size="lg" className="mt-1.5" />
              <p className="mt-3 text-sm text-navy-700">{tierDef(tier).tagline}. {p.next != null ? `${p.total - p.done} requirement${p.total - p.done === 1 ? "" : "s"} remain for Tier ${p.next} · ${tierDef(p.next).name}.` : "All tier requirements are met."}</p>
              {state.assessment && state.assessment.provisionalTier !== tier ? (
                <p className="mt-2 text-xs text-teal-700">Up from Tier {state.assessment.provisionalTier} at the time of assessment.</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
            <Button asChild variant="ghost" className="h-12 rounded-none bg-white"><Link href="/roadmap">View roadmap <ArrowRight /></Link></Button>
            <Button asChild variant="ghost" className="h-12 rounded-none bg-white"><Link href="/solutions">AI solutions <ArrowRight /></Link></Button>
          </div>
          <div className="p-4"><DemoDisclaimer>Provisional demo assessment based on self-reported answers. Confirmation requires evidence review and on-site inspection; this is not an official Ministry classification.</DemoDisclaimer></div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Maturity by category</CardTitle>
              <CardDescription>Requirements met in Jahez versus your self-reported answers.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[320px] pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chart} outerRadius="70%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                <PolarGrid stroke="#E5E8EE" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "#2E4C78", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip formatter={(v) => `${v}/100`} contentStyle={{ borderRadius: 12, border: "1px solid #E5E8EE", fontSize: 12 }} />
                <Radar name="Self-reported" dataKey="self" stroke="#C9A24B" fill="#C9A24B" fillOpacity={0.12} strokeDasharray="4 3" />
                <Radar name="Met in Jahez" dataKey="verified" stroke="#0FA396" fill="#0FA396" fillOpacity={0.28} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Requirement checklist</CardTitle>
              <CardDescription>What&apos;s met, what&apos;s missing, and which Jahez solution can close each gap.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab}>
              <TabsList className="w-full overflow-x-auto sm:w-auto">
                {[1, 2, 3, 4].map((t) => {
                  const reqs = requirementsForTier(t);
                  const met = reqs.filter((r) => completed.includes(r.id)).length;
                  return (
                    <TabsTrigger key={t} value={String(t)}>
                      Tier {t}
                      <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", met === reqs.length ? "bg-emerald-100 text-emerald-700" : "bg-navy-900/5 text-navy-600")}>{met}/{reqs.length}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {[1, 2, 3, 4].map((t) => (
                <TabsContent key={t} value={String(t)} className="mt-4 focus-visible:outline-none">
                  <p className="mb-3 text-sm text-muted">Tier {t} · {tierDef(t).name} — {tierDef(t).description}</p>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {requirementsForTier(t).map((r) => {
                      const s = requirementState(r, id, completed, deployments);
                      return (
                        <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            {s.kind === "met" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-navy-500/30" />}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-navy-900">{r.title}</div>
                              <div className="text-xs text-muted">
                                {s.kind === "available" || s.kind === "deploying" ? <>Satisfiable by <span className="font-medium text-teal-700">{s.solution.name}</span></> : s.kind === "partner" ? "Partner solution · coming soon" : r.description}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pl-6 sm:pl-0">
                            <RequirementPill state={s} />
                            {s.kind === "available" && t <= tier + 1 ? <BuildWithAIButton solutionId={s.solution.id} size="sm" /> : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Your answers</h2>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUESTIONS.map((q) => {
            const o = q.options.find((x) => x.value === answers[q.id]);
            return (
              <div key={q.id} className="rounded-xl border border-line bg-white px-3.5 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{q.axis}</dt>
                <dd className="mt-0.5 text-sm text-navy-900">{o?.label ?? "—"}</dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
