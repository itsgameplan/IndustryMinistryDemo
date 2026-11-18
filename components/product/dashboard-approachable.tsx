"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BadgeCheck, CheckCircle2, CircleDashed, CircleDot, MapPin, PartyPopper, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { BuildWithAIButton, TierBadge } from "@/components/shell/shared";
import { ActiveDeployments, AssessmentNudge, MaturityPanel } from "@/components/product/factory-status";
import { SolutionIcon, TierLadder } from "@/components/product/primitives";
import { SOLUTIONS } from "@/lib/data/solutions";
import { REQUIREMENTS, tierDef } from "@/lib/data/tiers";
import { nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { SolutionId } from "@/lib/types";

/** Al Noor style: friendly, transformational, step-by-step. */
export function ApproachableDashboard() {
  const { id, factory, state, tier } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const reduce = useReducedMotion();
  const p = nextTierProgress(state.completedRequirements);
  const firstName = factory.owner.name.split(" ")[0];
  const reachedTier1 = tier >= 1;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="bg-grid relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-teal-100/60 blur-3xl" aria-hidden />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TierBadge tier={tier} />
              <span className="inline-flex items-center gap-1 text-xs text-muted"><MapPin className="size-3.5" /> {factory.location}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted"><Users className="size-3.5" /> {factory.employees} employees</span>
            </div>
            {reachedTier1 ? (
              <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900 md:text-[40px] md:leading-[1.1]">
                  Well done, {firstName}. <span className="text-teal-600">Tier 1 requirements are met.</span>
                </h1>
                <p className="mt-3 max-w-xl text-[15px] text-navy-700">
                  {factory.name} is now visible to buyers and has documented governance. The next step is evidence review and an inspection visit before any tier can be confirmed.
                </p>
              </motion.div>
            ) : (
              <>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900 md:text-[40px] md:leading-[1.1]">
                  {firstName}, your digital journey <span className="text-teal-600">starts here.</span>
                </h1>
                <p className="mt-3 max-w-xl text-[15px] text-navy-700">{factory.summary} Two AI-built steps take you to Tier 1 — no IT team required.</p>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-white/80 p-5 backdrop-blur">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Your tier ladder</span>
              {p.next != null ? <span className="text-xs tabular-nums text-muted">{p.done}/{p.total} toward Tier {p.next}</span> : null}
            </div>
            <TierLadder tier={tier} target={p.next} className="mt-4" />
          </div>
        </div>
      </section>

      {reachedTier1 ? <Tier1Celebration /> : null}
      <AssessmentNudge />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Next steps */}
        <section aria-labelledby="next-steps">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 id="next-steps" className="text-lg font-semibold tracking-tight text-navy-900">{reachedTier1 ? "What you've built" : "Your next two steps"}</h2>
              <p className="text-sm text-muted">Each step is built by Jahez AI agents in under a minute.</p>
            </div>
            <Link href="/roadmap" className="hidden text-sm font-medium text-teal-700 hover:underline sm:inline">Full roadmap →</Link>
          </div>
          <ol className="space-y-3">
            {factory.recommendedSolutions.map((sid, i) => {
              const sol = SOLUTIONS[sid];
              const live = state.unlockedSolutions.includes(sid);
              const running = deployments[`${id}:${sid}`]?.status === "running";
              const reqs = REQUIREMENTS.filter((r) => sol.satisfies.includes(r.id));
              return (
                <motion.li key={sid} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>
                  <Card className={cn("flex flex-col gap-4 p-5 sm:flex-row sm:items-center", live && "border-emerald-200 bg-emerald-50/30")}>
                    <div className="flex items-start gap-4 sm:flex-1">
                      <div className="relative">
                        <span className={cn("grid size-12 place-items-center rounded-2xl", live ? "bg-emerald-500 text-white" : "bg-navy-900 text-white")}>
                          <SolutionIcon icon={sol.icon} className="size-5" />
                        </span>
                        <span className="absolute -left-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-gold-400 text-[10px] font-bold text-navy-950 ring-2 ring-white">{i + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-navy-900">{sol.name}</h3>
                          {live ? <Badge tone="green">Live</Badge> : running ? <Badge tone="teal">Deploying</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-sm text-muted">{sol.shortDescription}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {reqs.map((r) => (
                            <span key={r.id} className="inline-flex items-center gap-1 rounded-md bg-navy-900/[0.04] px-2 py-0.5 text-[11px] text-navy-700">
                              {state.completedRequirements.includes(r.id) ? <CheckCircle2 className="size-3 text-emerald-600" /> : <CircleDot className="size-3 text-navy-500" />}
                              {r.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <BuildWithAIButton solutionId={sid} className="w-full sm:w-auto" />
                  </Card>
                </motion.li>
              );
            })}
          </ol>
        </section>

        <MaturityPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SystemsChecklist />
        <ActiveDeployments />
      </div>
    </div>
  );
}

function Tier1Celebration() {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8"
      aria-live="polite"
    >
      <div className="bg-grid-dark absolute inset-0" aria-hidden />
      <div className="absolute -right-10 -top-16 size-56 rounded-full bg-gold-400/20 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gold-400 text-navy-950 shadow-lift"><PartyPopper className="size-7" /></span>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">Milestone reached</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">Ready for Tier 1 verification</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/70">
            All Tier 1 · {tierDef(1).name} requirements are satisfied in Jahez. Classification stays provisional until evidence is reviewed and an inspection is completed (demo simulation — not an official Ministry decision).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="gold"><Link href="/verify"><BadgeCheck /> Verification preview</Link></Button>
          <Button asChild variant="dark"><Link href="/roadmap">See Tier 2 <ArrowRight /></Link></Button>
        </div>
      </div>
    </motion.section>
  );
}

const SYSTEM_SOLUTION: Record<string, SolutionId> = { Website: "website", "Business email": "website", "Policies & SOPs": "compliance", "Predictive maintenance": "maintenance" };

export function SystemsChecklist() {
  const { factory, state } = useActiveFactory();
  const icon = { active: CheckCircle2, partial: CircleDot, missing: CircleDashed } as const;
  const tone = { active: "text-emerald-600", partial: "text-amber-500", missing: "text-navy-500/50" } as const;
  const label = { active: "In place", partial: "Partial", missing: "Missing" } as const;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Systems today</CardTitle>
          <CardDescription>What {factory.name} reported at onboarding.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-line">
          {factory.systems.map((sys) => {
            const via = SYSTEM_SOLUTION[sys.name];
            const delivered = via != null && state.unlockedSolutions.includes(via);
            const s = delivered ? { ...sys, status: "active" as const, note: `Delivered by ${SOLUTIONS[via].name}` } : sys;
            const Icon = icon[s.status];
            return (
              <li key={s.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Icon className={cn("mt-0.5 size-4 shrink-0", tone[s.status])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-navy-900">{s.name}</div>
                  {s.note ? <div className="text-xs text-muted">{s.note}</div> : null}
                </div>
                <span className={cn("text-xs font-medium", tone[s.status])}>{label[s.status]}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
