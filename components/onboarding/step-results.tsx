"use client";

import { useMemo } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, FileUp, Lightbulb, Lock, Search, Sparkles, Wifi } from "lucide-react";
import { Badge, Button, DemoDisclaimer } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { ScoreRing, TierLadder } from "@/components/product/primitives";
import { CategoryGlyph } from "@/components/services/kit";
import { categoryOf } from "@/lib/data/services";
import { REQUIREMENTS, tierDef } from "@/lib/data/tiers";
import { maturityScore } from "@/lib/store";
import { recommendServices } from "@/lib/recommendations";
import { TECH_FOR_REQUIREMENT, assess, buildFactoryProfile, missingForNextTier, type Draft } from "./data";
import { StepActions, StepHeading } from "./fields";
import { useLocale, useT } from "@/lib/i18n";
import { serviceTitle } from "@/lib/utils";

export function StepResults({ draft, onBack, onNext }: { draft: Draft; onBack: () => void; onNext: () => void }) {
  const tr = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const { completed, tier } = useMemo(() => assess(draft), [draft]);
  const score = maturityScore(completed);
  const { next, missing } = missingForNextTier(completed);
  const t = tierDef(tier);
  const hasIot = draft.factory.systems.includes("iot");
  const recs = useMemo(() => {
    const preview = buildFactoryProfile(draft, 0, "reg-preview");
    return recommendServices(preview, { completedRequirements: completed, installedServices: [] }).filter((r) => r.recommended).slice(0, 4);
  }, [draft, completed]);
  const metCount = completed.length;
  const name = draft.factory.name.trim() || tr("Your factory");

  return (
    <div>
      <StepHeading eyebrow={tr("Step 4 · Results")} title={tr("{name}'s provisional maturity profile", { name })} description={tr("Generated from your answers. This is a proposal for the demonstration — no tier is issued until evidence is reviewed and a site inspection takes place.")} />

      {/* Hero result */}
      <section className="grid gap-6 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6 md:grid-cols-[auto_1fr] md:items-center md:gap-8 md:p-8">
        <div className="flex justify-center">
          <ScoreRing value={score} size={132} stroke={11} sublabel={tr("Readiness")} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={tier} size="lg" />
            <Badge tone="amber"><Lock /> {tr("Proposed — unverified")}</Badge>
          </div>
          <p className="mt-3 text-[15px] text-navy-800">
            <span className="font-semibold">{ar ? t.nameAr : t.name}:</span> {tr(t.description)}
          </p>
          <p className="mt-2 text-sm text-muted">
            {tr("You reported systems that satisfy {met} of {total} framework requirements.", { met: metCount, total: REQUIREMENTS.length })}
            {next ? ` ${tr(missing.length === 1 ? "A factory reaches a tier only when every requirement of that tier and all tiers below are met — {count} item stands between you and Tier {tier}." : "A factory reaches a tier only when every requirement of that tier and all tiers below are met — {count} items stand between you and Tier {tier}.", { count: missing.length, tier: next })}` : ""}
          </p>
          <TierLadder tier={tier} target={next} className="mt-5" />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Missing requirements */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy-900"><ClipboardList className="size-4 text-teal-600" aria-hidden /> {next ? tr("Missing for Tier {tier} · {name}", { tier: next, name: ar ? tierDef(next).nameAr : tierDef(next).name }) : tr("All tiers complete")}</h2>
          <ul className="mt-4 space-y-3">
            {missing.map((r) => (
              <li key={r.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold-500" aria-hidden />
                <div>
                  <div className="text-sm font-medium text-navy-900">{tr(r.title)}</div>
                  <p className="text-xs text-muted">{tr(r.description)}</p>
                </div>
              </li>
            ))}
            {!missing.length ? <li className="text-sm text-muted">{tr("No open requirements reported.")}</li> : null}
          </ul>
          {completed.length ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">{tr("Already in place")}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REQUIREMENTS.filter((r) => completed.includes(r.id)).map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"><CheckCircle2 className="size-3" aria-hidden /> {tr(r.title)}</span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Recommended technologies */}
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy-900"><Lightbulb className="size-4 text-gold-500" aria-hidden /> {tr("Recommended technology upgrades")}</h2>
          <ul className="mt-4 space-y-3">
            {missing.map((r, i) => {
              const tech = TECH_FOR_REQUIREMENT[r.id];
              return (
                <li key={r.id} className="flex gap-3 rounded-xl bg-canvas px-3.5 py-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-semibold text-white">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-navy-900">{tr(tech?.tech ?? r.title)}</div>
                    <p className="text-xs text-muted">{tr(tech?.detail ?? r.description)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasIot ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-3 text-xs text-teal-700">
              <Wifi className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span><span className="font-semibold">{tr("Strength:")}</span> {tr("connected machines give you a head start on Tier 4 predictive maintenance and energy optimisation once lower tiers are complete.")}</span>
            </div>
          ) : null}
        </section>
      </div>

      {/* IMC services */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy-900"><Sparkles className="size-4 text-teal-600" aria-hidden /> {tr("Recommended IMC competitiveness services")}</h2>
          <span className="text-xs text-muted">{tr("Matched to your industry, tier and objectives")}</span>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {recs.map((r) => (
            <li key={r.service.id} className="flex gap-3 rounded-xl border border-line p-3.5">
              <CategoryGlyph category={categoryOf(r.service.category)} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-medium leading-snug text-navy-900">{serviceTitle(r.service, ar ? "ar" : "en")}</div>
                <p className="mt-0.5 text-xs text-muted">{tr(r.reasons[0] ?? r.service.tagline)}</p>
                {!r.ready ? <span className="mt-1.5 inline-block rounded-full bg-navy-900/5 px-2 py-0.5 text-[10px] font-semibold text-navy-600">{tr("Best after Tier {tier}", { tier: r.service.recommendedTier })}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Verification */}
      <section className="mt-6 rounded-2xl border border-dashed border-navy-500/25 bg-canvas p-5">
        <h2 className="text-[15px] font-semibold text-navy-900">{tr("Next steps toward verification")}</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: FileUp, title: "Upload evidence", body: "Screenshots, policies and system exports for each requirement (simulated)." },
            { icon: Search, title: "Evidence review", body: "A Ministry-appointed reviewer checks your submission (simulated)." },
            { icon: CheckCircle2, title: "Inspection visit", body: "An on-site visit confirms the tier before anything is issued (simulated)." },
          ].map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-navy-700 ring-1 ring-line"><s.icon className="size-4" aria-hidden /></span>
              <div>
                <div className="text-sm font-medium text-navy-900">{i + 1}. {tr(s.title)}</div>
                <p className="text-xs text-muted">{tr(s.body)}</p>
              </div>
            </li>
          ))}
        </ol>
        <DemoDisclaimer className="mt-5">{tr("Proposed tier only. No certificate, licence or official classification is issued in this demonstration.")}</DemoDisclaimer>
      </section>

      <StepActions onBack={onBack} backLabel="Edit factory details" next={<Button size="lg" onClick={onNext}>{tr("See subscription options")} <ArrowRight className="rtl:-scale-x-100" /></Button>} />
    </div>
  );
}
