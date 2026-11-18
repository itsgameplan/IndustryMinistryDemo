"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Flag, Handshake, Info, Lock } from "lucide-react";
import { Badge, Button, DemoDisclaimer } from "@/components/ui";
import { BuildWithAIButton, PageHeader, TierBadge } from "@/components/shell/shared";
import { CATEGORY_LABELS, RequirementPill, SolutionIcon, TierLadder, requirementState } from "@/components/product/primitives";
import { TIERS, REQUIREMENTS, requirementsForTier } from "@/lib/data/tiers";
import { nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const { id, factory, state, tier } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const reduce = useReducedMotion();
  const completed = state.completedRequirements;
  const p = nextTierProgress(completed);
  const metCount = REQUIREMENTS.filter((r) => completed.includes(r.id)).length;
  const buildable = REQUIREMENTS.filter((r) => {
    const s = requirementState(r, id, completed, deployments);
    return s.kind === "available" || s.kind === "deploying";
  }).length;

  return (
    <div>
      <PageHeader
        eyebrow="Transformation roadmap"
        title={`${factory.name}'s path to Tier 4`}
        description="Every requirement, tier by tier. Jahez AI agents can build some of them today; the rest are delivered through partner solutions."
        actions={<TierBadge tier={tier} size="lg" />}
      />

      {/* Summary band */}
      <section className="grid gap-6 rounded-2xl border border-line bg-white p-5 shadow-card md:p-6 lg:grid-cols-[1fr_auto]">
        <div>
          <TierLadder tier={tier} target={p.next} />
        </div>
        <dl className="grid grid-cols-3 gap-6 text-center lg:border-l lg:border-line lg:pl-6">
          <div><dt className="text-xs text-muted">Requirements met</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-navy-900">{metCount}<span className="text-base text-muted">/{REQUIREMENTS.length}</span></dd></div>
          <div><dt className="text-xs text-muted">AI-buildable now</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-teal-600">{buildable}</dd></div>
          <div><dt className="text-xs text-muted">Next tier</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-navy-900">{p.next != null ? `${Math.round(p.ratio * 100)}%` : "—"}</dd></div>
        </dl>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-navy-900/10 bg-navy-900/[0.03] px-4 py-3 text-sm text-navy-700">
        <Info className="mt-0.5 size-4 shrink-0 text-navy-500" aria-hidden />
        <p><span className="font-semibold text-navy-900">Tiers are climbed in order.</span> A factory is classified at a tier only when that tier and every tier below it are complete. Work on a higher tier opens once the tier beneath it is finished.</p>
      </div>

      {/* Journey */}
      <ol className="relative mt-8">
        {TIERS.map((t, i) => {
          const reqs = requirementsForTier(t.level);
          const complete = t.level <= tier;
          const focus = t.level === tier + 1;
          const locked = t.level > tier + 1;
          const done = reqs.filter((r) => completed.includes(r.id)).length;
          return (
            <motion.li
              key={t.level}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35 }}
              className="relative grid grid-cols-[40px_1fr] gap-3 pb-8 last:pb-0 md:grid-cols-[56px_1fr] md:gap-5"
            >
              {i < TIERS.length - 1 ? <span className={cn("absolute left-[19px] top-11 h-[calc(100%-2.75rem)] w-0.5 md:left-[27px]", complete ? "" : "bg-line")} style={complete ? { backgroundColor: t.color } : undefined} aria-hidden /> : null}
              <div className="relative z-10">
                <span
                  className={cn("grid size-10 place-items-center rounded-2xl text-base font-semibold md:size-14 md:text-xl", complete ? "text-white shadow-card" : focus ? "bg-white ring-2" : "bg-canvas text-navy-500/60 ring-1 ring-line")}
                  style={complete ? { backgroundColor: t.color } : focus ? { color: t.color, boxShadow: `inset 0 0 0 2px ${t.color}` } : undefined}
                >
                  {complete && t.level > 0 ? <CheckCircle2 className="size-5 md:size-6" /> : t.level}
                </span>
              </div>
              <div className={cn("min-w-0 rounded-2xl border bg-white shadow-card", focus ? "border-transparent ring-2" : "border-line", locked && "bg-white/70")} style={focus ? ({ "--tw-ring-color": `${t.color}66` } as CSSProperties) : undefined}>
                <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-navy-900">Tier {t.level} · {t.name}</h2>
                      <span className="font-arabic text-sm text-muted" lang="ar">{t.nameAr}</span>
                    </div>
                    <p className="text-sm text-muted">{t.description}</p>
                  </div>
                  {t.level === 0 ? <Badge tone="outline">Starting point</Badge> : complete ? <Badge tone="green"><CheckCircle2 /> Complete · provisional</Badge> : focus ? <Badge tone="gold"><Flag /> Current focus · {done}/{reqs.length}</Badge> : <Badge tone="neutral"><Lock /> Opens after Tier {t.level - 1}</Badge>}
                </div>

                {t.level === 0 ? (
                  <p className="px-5 py-4 text-sm text-navy-700">Registered with the Ministry with an industrial licence. {factory.baselineTier === 0 ? `${factory.name} began its Jahez journey here.` : `${factory.name} joined Jahez already at Tier ${factory.baselineTier}.`}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {reqs.map((r) => {
                      const s = requirementState(r, id, completed, deployments);
                      return (
                        <li key={r.id} className={cn("flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center", locked && s.kind !== "met" && "opacity-75")}>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-navy-900">{r.title}</span>
                              <span className="rounded bg-navy-900/[0.04] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-500">{CATEGORY_LABELS[r.category]}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted">{r.description}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            <RequirementPill state={s} />
                            {s.kind === "met" && r.satisfiedBy && state.unlockedSolutions.includes(r.satisfiedBy) ? (
                              <Button asChild variant="ghost" size="sm"><Link href={`/deployments/${r.satisfiedBy}`}>View build</Link></Button>
                            ) : null}
                            {s.kind === "available" || s.kind === "deploying" ? (
                              locked ? (
                                <Button size="sm" variant="outline" disabled title={`Complete Tier ${t.level - 1} first`}><Lock /> Complete Tier {t.level - 1} first</Button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="hidden items-center gap-1 text-xs text-muted lg:inline-flex"><SolutionIcon icon={s.solution.icon} className="size-3.5 text-teal-600" /> {s.solution.name}</span>
                                  <BuildWithAIButton solutionId={s.solution.id} size="sm" />
                                </div>
                              )
                            ) : null}
                            {s.kind === "partner" ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1 text-xs text-muted"><Handshake className="size-3.5" /> Partner solution · coming soon</span>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>

      <DemoDisclaimer className="mt-8">Roadmap status is a provisional demo simulation based on self-reported data and simulated deployments. Tier classification requires evidence review and inspection.</DemoDisclaimer>
    </div>
  );
}
