"use client";

// Shared product building blocks (orchestrator-owned). Feature agents import, never edit.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, Loader2, CheckCircle2, Lock, ArrowRight } from "lucide-react";
import { Button, Progress, Card } from "@/components/ui";
import { tierDef } from "@/lib/data/tiers";
import { SOLUTIONS } from "@/lib/data/solutions";
import { cn, localName } from "@/lib/utils";
import { deploymentKey, deploymentProgress, useActiveFactory, useHydrated, useJahez, useNow } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import type { SolutionId, TierLevel } from "@/lib/types";

export function PageHeader({ eyebrow, title, description, actions, className }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        {eyebrow ? <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">{t(eyebrow)}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 md:text-[28px]">{t(title)}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted md:text-[15px]">{t(description)}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function TierBadge({ tier, size = "md", className }: { tier: TierLevel; size?: "sm" | "md" | "lg"; className?: string }) {
  const def = tierDef(tier);
  const t = useT();
  const { locale } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3.5 py-1.5 text-sm",
        className
      )}
      style={{ color: def.color, backgroundColor: `${def.color}14`, boxShadow: `inset 0 0 0 1px ${def.color}40` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: def.color }} />
      {t("Tier {tier}", { tier })} · {localName(def, locale)}
    </span>
  );
}

/** Starts a simulated AI deployment and navigates to its live console. */
export function BuildWithAIButton({ solutionId, className, size = "md", label = "Build with AI" }: { solutionId: SolutionId; className?: string; size?: "sm" | "md" | "lg"; label?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const t = useT();
  const { id: factoryId, state } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, solutionId)]);
  const start = useJahez((s) => s.startDeployment);
  const unlocked = state.unlockedSolutions.includes(solutionId);

  if (!hydrated) return <Button size={size} variant="accent" className={className} disabled><Loader2 className="animate-spin" /> {t("Loading")}</Button>;
  if (unlocked)
    return (
      <Button size={size} variant="primary" className={className} onClick={() => router.push(SOLUTIONS[solutionId].route)}>
        <CheckCircle2 /> {t("Open solution")}
      </Button>
    );
  if (dep?.status === "running")
    return (
      <Button size={size} variant="subtle" className={className} onClick={() => router.push(`/deployments/${solutionId}`)}>
        <Loader2 className="animate-spin" /> {t("Deploying… view progress")}
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
      <Sparkles /> {t(label)}
    </Button>
  );
}

/** Compact live progress row for a deployment (used in topbar popover, dashboards, etc.). */
export function DeploymentMini({ solutionId }: { solutionId: SolutionId }) {
  const { id: factoryId } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, solutionId)]);
  const now = useNow(500);
  const t = useT();
  const { locale } = useLocale();
  const p = deploymentProgress(dep, now);
  if (!dep) return null;
  return (
    <Link href={`/deployments/${solutionId}`} className="block rounded-xl border border-line bg-white p-3 transition hover:shadow-card">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-navy-900">{localName(SOLUTIONS[solutionId], locale)}</span>
        <span className="tabular-nums text-xs text-muted">{p.done ? t("Live") : `${Math.round(p.ratio * 100)}%`}</span>
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
  const t = useT();
  const { locale } = useLocale();

  if (!hydrated) return <div className="h-[60vh] animate-pulse rounded-2xl bg-white" />;
  if (state.unlockedSolutions.includes(solutionId)) return <>{children}</>;

  const wrongFactory = sol.factory !== factoryId;
  const solName = localName(sol, locale);
  const account = t(sol.factory === "delta" ? "Delta Precision" : "Al Noor Textiles");
  const factoryName = localName(factory, locale);
  return (
    <Card className="bg-grid relative mx-auto mt-6 max-w-2xl overflow-hidden p-10 text-center">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-navy-900 text-white shadow-lift">
          {p.running ? <Loader2 className="size-6 animate-spin" /> : <Lock className="size-6" />}
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{solName}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {wrongFactory
            ? factory.registration
              ? t("In this demo the {solution} is showcased on the {account} account. {factory}'s personalised recommendations are in the AI services marketplace.", { solution: solName, account, factory: factoryName })
              : t("This solution is part of the {account} journey. {factory} has a different recommended roadmap.", { account, factory: factoryName })
            : p.running
              ? t("AI agents are deploying this module right now. You can keep exploring — we'll notify you when it's live.")
              : t("Not deployed yet. Let Jahez's AI agents build and configure this module for your factory in under a minute.")}
        </p>
        {p.running ? <Progress value={p.ratio * 100} className="mx-auto mt-6 max-w-sm" /> : null}
        <div className="mt-6 flex justify-center gap-2">
          {wrongFactory && factory.registration ? (
            <Button asChild variant="primary"><Link href="/services">{t("Open services marketplace")} <ArrowRight className="rtl:-scale-x-100" /></Link></Button>
          ) : null}
          {wrongFactory ? (
            <Button variant="outline" onClick={() => setActive(sol.factory)}>
              {t("Switch to {name}", { name: account })} <ArrowRight className="rtl:-scale-x-100" />
            </Button>
          ) : (
            <BuildWithAIButton solutionId={solutionId} size="lg" />
          )}
        </div>
      </motion.div>
    </Card>
  );
}
