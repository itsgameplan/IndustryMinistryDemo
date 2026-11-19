"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Hourglass, Rocket } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DemoDisclaimer, Progress } from "@/components/ui";
import { DeploymentMini, TierBadge } from "@/components/shell/shared";
import { ScoreRing } from "@/components/product/primitives";
import { tierDef } from "@/lib/data/tiers";
import { SOLUTION_LIST } from "@/lib/data/solutions";
import { maturityScore, nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

/** Maturity score, current tier, next-tier progress and provisional status. */
export function MaturityPanel({ className }: { className?: string }) {
  const { state, tier } = useActiveFactory();
  const t = useT();
  const { locale } = useLocale();
  const score = maturityScore(state.completedRequirements);
  const p = nextTierProgress(state.completedRequirements);
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div>
          <CardTitle>{t("Digital maturity")}</CardTitle>
          <CardDescription>{t("Computed from requirements met across all tiers.")}</CardDescription>
        </div>
        <Badge tone="amber"><Hourglass /> {t("Provisional")}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <ScoreRing value={score} size={124} sublabel={t("of 100")} />
        <div className="w-full min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-xs font-medium text-muted">{t("Current tier")}</div>
            <TierBadge tier={tier} size="lg" className="mt-1" />
          </div>
          {p.next != null ? (
            <div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-navy-700">{t("Toward Tier {tier} · {name}", { tier: p.next, name: locale === "ar" ? tierDef(p.next).nameAr : tierDef(p.next).name })}</span>
                <span className="tabular-nums text-muted">{p.done}/{p.total}</span>
              </div>
              <Progress value={p.ratio * 100} className="mt-1.5" barClassName="transition-[width]" />
            </div>
          ) : (
            <p className="text-sm text-navy-700">{t("All tier requirements met.")}</p>
          )}
        </div>
      </CardContent>
      <div className="border-t border-line bg-canvas/60 px-5 py-3">
        <p className="text-xs text-navy-700">
          <span className="font-semibold">{t("Status:")}</span> {t("provisional until evidence review and on-site inspection.")}
        </p>
        <DemoDisclaimer className="mt-2" />
      </div>
    </Card>
  );
}

/** All deployments (running or completed) for the active factory. */
export function ActiveDeployments({ className, dark }: { className?: string; dark?: boolean }) {
  const { id } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const t = useT();
  const mine = SOLUTION_LIST.filter((s) => deployments[`${id}:${s.id}`]);
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div>
          <CardTitle>{t("AI deployments")}</CardTitle>
          <CardDescription>{t("Agents keep working while you explore.")}</CardDescription>
        </div>
        <Rocket className="size-4 text-navy-500" aria-hidden />
      </CardHeader>
      <CardContent className="space-y-2.5">
        {mine.length ? (
          mine.map((s) => <DeploymentMini key={s.id} solutionId={s.id} />)
        ) : (
          <div className={cn("rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm", dark ? "text-white/60" : "text-muted")}>
            {t("No deployments yet.")}
            <div className="mt-3">
              <Button asChild size="sm" variant="outline"><Link href="/solutions">{t("Browse AI solutions")} <ArrowRight className="rtl:-scale-x-100" /></Link></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Prompt to take the assessment when none exists yet. */
export function AssessmentNudge() {
  const { state } = useActiveFactory();
  const t = useT();
  if (state.assessment) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white p-4 rtl:bg-gradient-to-l sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-teal-600 shadow-card"><ClipboardCheck className="size-5" /></span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-navy-900">{t("Confirm your starting point")}</div>
        <p className="text-xs text-muted">{t("2-minute AI assessment.")}</p>
      </div>
      <Button asChild variant="accent" size="sm"><Link href="/assessment">{t("Start assessment")} <ArrowRight className="rtl:-scale-x-100" /></Link></Button>
    </div>
  );
}
