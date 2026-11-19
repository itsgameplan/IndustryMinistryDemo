"use client";

import { Check, CreditCard, Rocket, Star } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, formatNumber } from "@/lib/utils";
import type { TierLevel } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { PLANS, planForTier, type PlanId } from "./data";
import { StepActions, StepHeading } from "./fields";

export function StepPlan({ tier, plan, onSelect, onBack, onActivate }: { tier: TierLevel; plan: PlanId | null; onSelect: (p: PlanId) => void; onBack: () => void; onActivate: () => void }) {
  const t = useT();
  const suggested = planForTier(tier);
  const selected = plan ?? suggested;

  return (
    <div>
      <StepHeading eyebrow={t("Step 5 · Subscription preview")} title={t("Choose an annual plan")} description={t("Based on your proposed Tier {tier}, we've pre-selected the plan that fits your next step. You can change it at any time.", { tier })} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-300/70 bg-gold-50 px-4 py-3.5" role="note">
        <CreditCard className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
        <p className="text-sm text-navy-800"><span className="font-semibold">{t("Illustrative pricing for demonstration — no payment is processed.")}</span> {t("Real subscription terms would be set by the programme.")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label={t("Annual subscription plan")}>
        {PLANS.map((p) => {
          const isSel = selected === p.id;
          const isSuggested = suggested === p.id;
          return (
            <label
              key={p.id}
              className={cn(
                "relative flex cursor-pointer flex-col rounded-2xl border bg-white p-5 transition focus-within:ring-2 focus-within:ring-teal-400 focus-within:ring-offset-2",
                isSel ? "border-teal-400 shadow-lift ring-1 ring-teal-400" : "border-line shadow-card hover:border-navy-500/30"
              )}
            >
              <input type="radio" name="plan" value={p.id} checked={isSel} onChange={() => onSelect(p.id)} className="sr-only" />
              {isSuggested ? (
                <span className="absolute -top-2.5 start-5 inline-flex items-center gap-1 rounded-full bg-navy-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  <Star className="size-3 fill-gold-400 text-gold-400" aria-hidden /> {t("Matches your tier")}
                </span>
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold tracking-tight text-navy-900">{t(p.name)}</div>
                  <div className="text-xs text-muted">{t(p.tiers)}</div>
                </div>
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2 transition", isSel ? "border-teal-500 bg-teal-500" : "border-navy-500/30")} aria-hidden>
                  {isSel ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                </span>
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-gold-600">{t("Illustrative")}</div>
              <p className="mt-3 text-sm font-medium text-navy-800">{t(p.tagline)}</p>
              <ul className="mt-3 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-[13px] text-navy-700">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-teal-600" strokeWidth={3} aria-hidden /> {t(f)}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </div>

      <StepActions onBack={onBack} next={<Button size="lg" variant="gold" onClick={() => { if (!plan) onSelect(selected); onActivate(); }}><Rocket /> {t("Activate demo account")}</Button>} />
    </div>
  );
}
