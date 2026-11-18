"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, CircleDot, Clock, Handshake, Loader2, Lock, Repeat, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, DemoDisclaimer } from "@/components/ui";
import { BuildWithAIButton, DeploymentMini, PageHeader } from "@/components/shell/shared";
import { SolutionIcon } from "@/components/product/primitives";
import { FACTORIES } from "@/lib/data/factories";
import { SOLUTION_LIST } from "@/lib/data/solutions";
import { REQUIREMENTS, tierDef } from "@/lib/data/tiers";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Solution } from "@/lib/types";

type Status = "live" | "deploying" | "ready";

export default function SolutionsPage() {
  const { id, factory, state } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const setActive = useJahez((s) => s.setActiveFactory);
  const reduce = useReducedMotion();

  const statusOf = (s: Solution): Status => (state.unlockedSolutions.includes(s.id) ? "live" : deployments[`${id}:${s.id}`]?.status === "running" ? "deploying" : "ready");
  const recommended = SOLUTION_LIST.filter((s) => factory.recommendedSolutions.includes(s.id) && s.factory === id);
  const others = SOLUTION_LIST.filter((s) => !recommended.includes(s));
  const partner = REQUIREMENTS.filter((r) => !r.satisfiedBy && !state.completedRequirements.includes(r.id));

  return (
    <div>
      <PageHeader eyebrow="AI solutions" title="Solutions Jahez AI can build for you" description={`Recommended for ${factory.name} based on your current tier, systems and roadmap gaps. Each one is deployed by specialised agents in under a minute.`} />

      <section aria-labelledby="recommended" className="space-y-5">
        <h2 id="recommended" className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Sparkles className="size-4 text-gold-500" /> Recommended for {factory.name}</h2>
        {recommended.map((sol, i) => {
          const st = statusOf(sol);
          const reqs = REQUIREMENTS.filter((r) => sol.satisfies.includes(r.id));
          return (
            <motion.article
              key={sol.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn("grid overflow-hidden rounded-3xl border bg-white shadow-card lg:grid-cols-[1.25fr_1fr]", st === "live" ? "border-emerald-200" : "border-line")}
            >
              <div className="relative p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-card", st === "live" ? "bg-emerald-500" : "bg-navy-900")}><SolutionIcon icon={sol.icon} className="size-6" /></span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-tight text-navy-900">{sol.name}</h3>
                      <StatusBadge status={st} />
                    </div>
                    <div className="font-arabic text-sm text-muted" lang="ar">{sol.nameAr}</div>
                  </div>
                </div>
                <p className="mt-4 text-[15px] text-navy-700">{sol.description}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> ~{sol.durationSeconds}s deployment</span>
                  <span>{sol.stages.length} agent stages</span>
                  <span>{sol.priceNote}</span>
                </div>
                {st === "deploying" ? <div className="mt-5 max-w-sm"><DeploymentMini solutionId={sol.id} /></div> : null}
                <div className="mt-6 flex flex-wrap gap-2">
                  <BuildWithAIButton solutionId={sol.id} size="lg" />
                  {st === "ready" ? <Button asChild variant="ghost" size="lg"><Link href={`/deployments/${sol.id}`}>See agent pipeline</Link></Button> : null}
                  {st === "live" ? <Button asChild variant="ghost" size="lg"><Link href={`/deployments/${sol.id}`}>Deployment log</Link></Button> : null}
                </div>
              </div>
              <div className="grid gap-6 border-t border-line bg-canvas/60 p-6 sm:grid-cols-2 md:p-8 lg:grid-cols-1 lg:border-l lg:border-t-0">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">Deliverables</div>
                  <ul className="mt-2.5 space-y-1.5">
                    {sol.deliverables.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-navy-800">
                        <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", st === "live" ? "text-emerald-600" : "text-navy-500/40")} /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">Satisfies requirements</div>
                  <ul className="mt-2.5 space-y-2">
                    {reqs.map((r) => {
                      const met = state.completedRequirements.includes(r.id);
                      return (
                        <li key={r.id} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-line">
                          {met ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleDot className="mt-0.5 size-4 shrink-0 text-gold-500" />}
                          <span className="min-w-0">
                            <span className="block font-medium text-navy-900">{r.title}</span>
                            <span className="text-xs text-muted">Tier {r.tier} · {tierDef(r.tier).name}{met ? " · met" : ""}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </motion.article>
          );
        })}
      </section>

      {others.length ? (
        <section aria-labelledby="other" className="mt-10">
          <h2 id="other" className="text-sm font-semibold text-navy-900">Other Jahez AI solutions</h2>
          <p className="mt-0.5 text-sm text-muted">Built for a different stage of the journey — not recommended for {factory.name} right now.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {others.map((sol) => {
              const owner = FACTORIES[sol.factory];
              const minTier = Math.min(...REQUIREMENTS.filter((r) => sol.satisfies.includes(r.id)).map((r) => r.tier));
              return (
                <article key={sol.id} className="relative flex flex-col rounded-2xl border border-dashed border-line bg-white/60 p-5">
                  <div className="flex items-start gap-3 opacity-70">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900/10 text-navy-700"><SolutionIcon icon={sol.icon} className="size-5" /></span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-navy-900">{sol.name}</h3>
                      <p className="text-sm text-muted">{sol.shortDescription}</p>
                    </div>
                  </div>
                  <p className="mt-4 flex items-start gap-2 rounded-lg bg-canvas px-3 py-2 text-xs text-navy-700">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-navy-500" />
                    Targets Tier {minTier} · {tierDef(minTier).name} requirements. In this demo it belongs to {owner.name}&apos;s journey.
                  </p>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => { setActive(sol.factory); toast(`Switched to ${owner.name}`); }}>
                      <Repeat /> Switch to {owner.name}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {partner.length ? (
        <section aria-labelledby="partner" className="mt-10 rounded-2xl border border-line bg-white p-5 shadow-card md:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="partner" className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Handshake className="size-4 text-navy-500" /> Partner solutions · coming soon</h2>
              <p className="mt-0.5 text-sm text-muted">Open requirements that will be served by vetted partners in the Jahez marketplace.</p>
            </div>
            <Link href="/roadmap" className="text-sm font-medium text-teal-700 hover:underline">View in roadmap <ArrowRight className="inline size-3.5" /></Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {partner.map((r) => (
              <li key={r.id} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-xs text-navy-700 ring-1 ring-inset ring-line">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: tierDef(r.tier).color }} aria-hidden />
                T{r.tier} · {r.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DemoDisclaimer className="mt-8">AI solutions and deployments are simulated for demonstration. Pricing notes are illustrative.</DemoDisclaimer>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "live") return <Badge tone="green"><CheckCircle2 /> Live</Badge>;
  if (status === "deploying") return <Badge tone="teal"><Loader2 className="animate-spin" /> Deploying</Badge>;
  return <Badge tone="outline"><Lock /> Not deployed</Badge>;
}
