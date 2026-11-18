"use client";

// Shared product building blocks (orchestrator-owned). Feature agents import, never edit.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, Loader2, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { Button, Progress, Card } from "@/components/ui";
import { tierDef } from "@/lib/data/tiers";
import { SOLUTIONS } from "@/lib/data/solutions";
import { cn } from "@/lib/utils";
import { deploymentKey, deploymentProgress, useActiveFactory, useHydrated, useJahez, useNow } from "@/lib/store";
import type { SolutionId, TierLevel } from "@/lib/types";

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {eyebrow ? <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 md:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted md:text-[15px]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function TierBadge({ tier, size = "md", className }: { tier: TierLevel; size?: "sm" | "md" | "lg"; className?: string }) {
  const t = tierDef(tier);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        className
      )}
      style={{ color: t.color, backgroundColor: `${t.color}14`, boxShadow: `inset 0 0 0 1px ${t.color}40` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: t.color }} />
      Tier {tier} · {t.name}
    </span>
  );
}

/** Starts a simulated AI deployment and navigates to its live console. */
export function BuildWithAIButton({ solutionId, className, size = "md", label = "Build with AI" }: { solutionId: SolutionId; className?: string; size?: "sm" | "md" | "lg"; label?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { id: factoryId, state } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, solutionId)]);
  const start = useJahez((s) => s.startDeployment);
  const unlocked = state.unlockedSolutions.includes(solutionId);

  if (!hydrated) return <Button size={size} variant="accent" className={className} disabled><Loader2 className="animate-spin" /> Loading</Button>;
  if (unlocked)
    return (
      <Button size={size} variant="primary" className={className} onClick={() => router.push(SOLUTIONS[solutionId].route)}>
        <CheckCircle2 /> Open solution
      </Button>
    );
  if (dep?.status === "running")
    return (
      <Button size={size} variant="subtle" className={className} onClick={() => router.push(`/deployments/${solutionId}`)}>
        <Loader2 className="animate-spin" /> Deploying… view progress
      </Button>
    );
  return (
    <Button
      size={size}
      variant="accent"
      className={cn("group relative overflow-hidden", className)}
      onClick={() => {
        start(factoryId, solutionId);
        router.push(`/deployments/${solutionId}`);
      }}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <Sparkles /> {label}
    </Button>
  );
}

/** Compact live progress row for a deployment (used in topbar popover, dashboards, etc.). */
export function DeploymentMini({ solutionId }: { solutionId: SolutionId }) {
  const { id: factoryId } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, solutionId)]);
  const now = useNow(500);
  const p = deploymentProgress(dep, now);
  if (!dep) return null;
  return (
    <Link href={`/deployments/${solutionId}`} className="block rounded-xl border border-line bg-white p-3 transition hover:shadow-card">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-navy-900">{SOLUTIONS[solutionId].name}</span>
        <span className="tabular-nums text-xs text-muted">{p.done ? "Live" : `${Math.round(p.ratio * 100)}%`}</span>
      </div>
      <Progress value={p.ratio * 100} className="mt-2 h-1.5" barClassName={p.done ? "bg-emerald-500" : undefined} />
    </Link>
  );
}

/**
 * Wrap an AI-solution page. Shows a locked / deploying state until the solution is unlocked
 * for the active factory, then renders children.
 */
export function SolutionGate({ solutionId, children }: { solutionId: SolutionId; children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { id: factoryId, factory, state } = useActiveFactory();
  const sol = SOLUTIONS[solutionId];
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, solutionId)]);
  const now = useNow(500);
  const p = deploymentProgress(dep, now);
  const setActive = useJahez((s) => s.setActiveFactory);

  if (!hydrated) return <div className="h-[60vh] animate-pulse rounded-2xl bg-white" />;
  if (state.unlockedSolutions.includes(solutionId)) return <>{children}</>;

  const wrongFactory = sol.factory !== factoryId;
  return (
    <Card className="bg-grid relative mx-auto mt-6 max-w-2xl overflow-hidden p-10 text-center">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-navy-900 text-white shadow-lift">
          {p.running ? <Loader2 className="size-6 animate-spin" /> : <Lock className="size-6" />}
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{sol.name}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {wrongFactory
            ? `This solution is part of the ${sol.factory === "delta" ? "Delta Precision" : "Al Noor Textiles"} journey. ${factory.name} has a different recommended roadmap.`
            : p.running
              ? "AI agents are deploying this module right now. You can keep exploring — we'll notify you when it's live."
              : "Not deployed yet. Let Jahez's AI agents build and configure this module for your factory in under a minute."}
        </p>
        {p.running ? <Progress value={p.ratio * 100} className="mx-auto mt-6 max-w-sm" /> : null}
        <div className="mt-6 flex justify-center gap-2">
          {wrongFactory ? (
            <Button variant="outline" onClick={() => setActive(sol.factory)}>
              Switch to {sol.factory === "delta" ? "Delta Precision" : "Al Noor Textiles"} <ArrowRight />
            </Button>
          ) : (
            <BuildWithAIButton solutionId={solutionId} size="lg" />
          )}
        </div>
      </motion.div>
    </Card>
  );
}
