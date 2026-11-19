"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, Bot, CalendarClock, CheckCircle2, CircleDot, ClipboardList, Factory as FactoryIcon, FlaskConical, Gauge, Info, ListChecks, Loader2,
  MessageSquarePlus, Package, ShieldAlert, Sparkles, Target, TriangleAlert, Users, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { categoryOf } from "@/lib/data/services";
import type { ServiceRecommendation } from "@/lib/recommendations";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ServiceDefinition } from "@/lib/types";
import { RequestServiceDialog } from "./request-dialog";
import { FEASIBILITY_META, FeasibilityPill, LiveBuildProgress, TEMPLATE_LABELS, useActivateService, useLocalName, useServiceTitle, type ServiceStatus } from "./shared";

function Section({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0", className)}>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-600 [&_svg]:size-3.5 [&_svg]:text-navy-500">{icon} {title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items, icon = "dot", tone = "navy" }: { items: string[]; icon?: "dot" | "check"; tone?: "navy" | "teal" | "amber" }) {
  const tr = useT();
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2 text-sm text-navy-800">
          {icon === "check" ? (
            <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", tone === "teal" ? "text-teal-600" : tone === "amber" ? "text-amber-600" : "text-navy-500")} aria-hidden />
          ) : (
            <CircleDot className={cn("mt-1 size-3 shrink-0", tone === "amber" ? "text-amber-500" : "text-navy-500/50")} aria-hidden />
          )}
          <span className="min-w-0">{tr(t)}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Why recommended" block with match score. */
export function WhyRecommended({ rec, factoryName, className }: { rec: ServiceRecommendation; factoryName: string; className?: string }) {
  const t = useT();
  return (
    <div className={cn("rounded-2xl border border-gold-300/60 bg-gradient-to-br from-gold-50 to-white p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-600"><Sparkles className="size-3.5" /> {rec.recommended ? t("Why recommended for {factory}", { factory: factoryName }) : t("Fit for {factory}", { factory: factoryName })}</div>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-navy-900 ring-1 ring-gold-300/60">{t("{score}% match", { score: rec.score })}</span>
      </div>
      {rec.reasons.length ? (
        <ul className="mt-2 space-y-1">
          {rec.reasons.map((r) => <li key={r} className="flex items-start gap-2 text-sm text-navy-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-500" aria-hidden /> {t(r)}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-navy-700">{t("General-purpose service — useful once your current priorities are covered.")}</p>
      )}
    </div>
  );
}

/** Full service detail content, shared by the drawer and the service overview page. */
export function ServiceDetailSections({ service, rec, factoryName, layout = "stack" }: { service: ServiceDefinition; rec?: ServiceRecommendation; factoryName: string; layout?: "stack" | "grid" }) {
  const feas = FEASIBILITY_META[service.feasibility];
  const grid = layout === "grid";
  const t = useT();
  return (
    <div className="space-y-6">
      {rec ? <WhyRecommended rec={rec} factoryName={factoryName} /> : null}

      {rec && !rec.ready ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><TriangleAlert className="size-4" /> {t("Needs preparation before production use")}</div>
          <p className="mt-1 text-sm text-amber-900/80">{t("This service is designed for Tier {tier}+ factories. Recommended preparation:", { tier: service.recommendedTier })}</p>
          <div className="mt-2"><Bullets items={rec.gaps} tone="amber" /></div>
        </div>
      ) : null}

      <div className={cn("grid gap-6", grid && "md:grid-cols-2")}>
        <Section icon={<Target />} title={t("Expected impact")}><Bullets items={service.expectedImpact} icon="check" tone="teal" /></Section>
        <Section icon={<ListChecks />} title={t("Prerequisites")}><Bullets items={service.prerequisites} /></Section>
        {!rec || rec.ready ? <Section icon={<ClipboardList />} title={t("Preparation steps")}><Bullets items={service.preparationSteps} /></Section> : null}
        <Section icon={<ShieldAlert />} title={t("Limitations")}><Bullets items={service.limitations} tone="amber" /></Section>
        <Section icon={<Package />} title={t("Demo deliverables")}><Bullets items={service.demoDeliverables} icon="check" /></Section>
        <Section icon={<FactoryIcon />} title={t("Recommended fit")}>
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={service.recommendedTier} size="sm" />
            <span className="text-xs text-muted">{t("minimum recommended tier")}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {service.recommendedIndustries.map((i) => (
              <span key={i} className="rounded-md bg-navy-900/[0.04] px-2 py-0.5 text-xs capitalize text-navy-700">{i === "all" ? t("All industries") : t(i)}</span>
            ))}
          </div>
          {service.humanDelivered ? <p className="mt-2 flex items-start gap-1.5 text-xs text-navy-700"><Users className="mt-0.5 size-3.5 shrink-0 text-navy-500" /> {t("Consultant- or facilitator-led in production.")}</p> : null}
        </Section>
      </div>

      <section className="rounded-2xl border border-line bg-canvas/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-600"><Wallet className="size-3.5 text-navy-500" /> {t("Delivery & commercial model")}</h3>
        <dl className={cn("grid gap-3 text-sm", grid ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted"><CalendarClock className="size-3.5" /> {t("Indicative timeline")}</dt>
            <dd className="mt-0.5 text-navy-900">{t(service.timeline)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted"><Wallet className="size-3.5" /> {t("Pricing model")}</dt>
            <dd className="mt-0.5 font-medium text-navy-900">{t(service.pricingModel)}</dd>
          </div>
          {service.illustrativeEstimate ? (
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-muted"><FlaskConical className="size-3.5" /> {t("Illustrative estimate")}</dt>
              <dd className="mt-0.5 text-navy-800">{t(service.illustrativeEstimate.replace(/^Illustrative only:\s*/i, ""))}<span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-gold-600">{t("Illustrative only · not a quotation")}</span></dd>
            </div>
          ) : null}
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted"><Gauge className="size-3.5" /> {t("Capacity notes")}</dt>
            <dd className="mt-0.5 text-navy-800">{t(service.capacityNotes)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted"><Info className="size-3.5" /> {t("Production feasibility")}</dt>
            <dd className="mt-1"><FeasibilityPill feasibility={service.feasibility} /><span className="mt-1 block text-xs text-muted">{t(feas.description)}</span></dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted"><Bot className="size-3.5" /> {t("Demo workspace")}</dt>
            <dd className="mt-0.5 text-navy-800">{t("{template} · built by {count} AI agents in ~{seconds}s", { template: t(TEMPLATE_LABELS[service.template]), count: service.buildAgents.length + 1, seconds: service.deploySeconds })}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

/**
 * Primary actions for a service: Activate demo (with prerequisite confirmation when not ready),
 * Open workspace when installed, build progress while deploying, and Request service.
 */
export function ServiceActions({ service, status, rec, size = "md", className, onNavigate }: { service: ServiceDefinition; status: ServiceStatus; rec?: ServiceRecommendation; size?: "md" | "lg"; className?: string; onNavigate?: () => void }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const localName = useLocalName();
  const serviceTitle = useServiceTitle();
  const activate = useActivateService();
  const [confirming, setConfirming] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const ready = rec?.ready ?? true;
  const category = categoryOf(service.category);

  const go = () => {
    onNavigate?.();
    activate(service.id);
  };

  return (
    <div className={className}>
      {status === "deploying" ? <LiveBuildProgress serviceId={service.id} className="mb-3" /> : null}
      <div className="flex flex-wrap gap-2">
        {status === "installed" ? (
          <Button asChild variant="primary" size={size}><Link href={service.route} onClick={onNavigate}><Sparkles /> {t("Open workspace")}</Link></Button>
        ) : status === "deploying" ? (
          <Button asChild variant="subtle" size={size}><Link href={service.route} onClick={onNavigate}><Loader2 className="animate-spin" /> {t("View live build")}</Link></Button>
        ) : ready ? (
          <Button variant="accent" size={size} onClick={go}><Sparkles /> {t("Activate demo")}</Button>
        ) : (
          <Button variant="accent" size={size} onClick={() => setConfirming((v) => !v)} aria-expanded={confirming}><Sparkles /> {t("Activate demo")}</Button>
        )}
        <Button variant="outline" size={size} onClick={() => setRequestOpen(true)}><MessageSquarePlus /> {t("Request service")}</Button>
      </div>

      <AnimatePresence initial={false}>
        {confirming && status === "available" && !ready ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="region" aria-label={t("Prerequisite confirmation")}>
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><TriangleAlert className="size-4" /> {t("Your factory isn't ready for this service yet")}</div>
              <p className="mt-1 text-sm text-amber-900/80">
                {t("{service} is recommended from Tier {tier}. In production you would first complete:", { service: serviceTitle(service), tier: service.recommendedTier })}
              </p>
              <ul className="mt-2 space-y-1">
                {(rec?.gaps.length ? rec.gaps : service.preparationSteps).map((g) => <li key={g} className="flex items-start gap-2 text-sm text-amber-900"><CircleDot className="mt-1 size-3 shrink-0" aria-hidden /> {t(g)}</li>)}
              </ul>
              <p className="mt-2 text-xs text-amber-900/70">{t("You can still activate the simulated workspace to see what {category} support would look like.", { category: locale === "ar" ? localName(category) : category.name.toLowerCase() })}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={go}>{t("Activate anyway for demonstration")} <ArrowRight className="rtl:-scale-x-100" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>{t("Cancel")}</Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <RequestServiceDialog open={requestOpen} onOpenChange={setRequestOpen} serviceId={service.id} />
    </div>
  );
}
