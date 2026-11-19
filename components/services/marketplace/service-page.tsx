"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Bot, Clock, Compass, LayoutTemplate, Store } from "lucide-react";
import { Button, Card, DemoDisclaimer, EmptyState } from "@/components/ui";
import { CategoryGlyph } from "@/components/services/kit";
import { WORKSPACES } from "@/components/services/registry";
import { categoryOf, SERVICES } from "@/lib/data/services";
import { deploymentKey, useHydrated, useJahez } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import { cn, serviceTitle } from "@/lib/utils";
import type { ServiceDefinition, ServiceId, WorkspaceTemplate } from "@/lib/types";
import { BuildSuccessBanner, ServiceBuildConsole } from "./build-console";
import { ServiceActions, ServiceDetailSections } from "./service-detail";
import { ServiceStatusPill, shortTimeline, TEMPLATE_LABELS, ServiceTitle, useLocalName, useMarketplace } from "./shared";

/** /services/[serviceId]: workspace when installed, live console while building, otherwise overview. */
export function ServiceRoute({ serviceId }: { serviceId: ServiceId }) {
  const hydrated = useHydrated();
  const m = useMarketplace();
  const service = SERVICES[serviceId];
  const running = useJahez((s) => s.deployments[deploymentKey(m.factoryId, serviceId)]?.status === "running");
  const installed = m.state.installedServices.includes(serviceId);

  if (!hydrated) return <div className="h-[60vh] animate-pulse rounded-3xl bg-white" />;

  if (installed) {
    const Workspace = WORKSPACES[serviceId];
    return (
      <motion.div key={`ws-${m.factoryId}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <BuildSuccessBanner service={service} />
        <Workspace service={service} />
      </motion.div>
    );
  }
  if (running) return <ServiceBuildConsole service={service} />;
  return <ServiceOverview service={service} m={m} />;
}

function ServiceOverview({ service, m }: { service: ServiceDefinition; m: ReturnType<typeof useMarketplace> }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const localName = useLocalName();
  const category = categoryOf(service.category);
  const rec = m.recById.get(service.id);
  const status = m.statusOf(service.id);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ms-2"><Link href="/services"><ArrowLeft className="rtl:-scale-x-100" /> {t("Marketplace||services")}</Link></Button>

      <motion.section initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-card lg:grid-cols-[1.3fr_1fr]">
        <div className="relative p-6 md:p-10">
          <div className="pointer-events-none absolute -start-24 -top-24 size-72 rounded-full blur-3xl" style={{ backgroundColor: `${category.accent}1F` }} aria-hidden />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <CategoryGlyph category={category} size="lg" />
              <ServiceStatusPill status={status} rec={rec} />
              {rec ? <span className="text-xs font-semibold tabular-nums text-gold-600">{t("{score}% match", { score: rec.score })}</span> : null}
            </div>
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: category.accent }}>
              {t("Service {number} · {category}", { number: String(service.number).padStart(2, "0"), category: localName(category) })}
            </div>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-navy-900 md:text-[32px]"><ServiceTitle service={service} /></h1>
            {locale === "ar" ? <div className="mt-1 text-sm text-muted" lang="en" dir="ltr">{serviceTitle(service, "en")}</div> : <div className="font-arabic mt-1 text-sm text-muted" lang="ar" dir="rtl">{serviceTitle(service, "ar")}</div>}
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-navy-700">{t(service.description)}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><LayoutTemplate className="size-3.5" /> {t(TEMPLATE_LABELS[service.template])}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {t("{timeline} indicative delivery", { timeline: t(shortTimeline(service.timeline)) })}</span>
              <span className="inline-flex items-center gap-1"><Bot className="size-3.5" /> {t("Demo workspace in ~{seconds}s", { seconds: service.deploySeconds })}</span>
            </div>
            <ServiceActions service={service} status={status} rec={rec} size="lg" className="mt-6" />
          </div>
        </div>
        <div className="border-t border-line bg-canvas/60 p-6 md:p-8 lg:border-s lg:border-t-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t("Agent pipeline")}</div>
          <ol className="mt-3 space-y-2.5">
            {[...service.buildAgents, { agent: "Release Agent", label: "Publishing workspace" }].map((a, i) => (
              <li key={a.agent + i} className="flex items-center gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-navy-700 ring-1 ring-line">{i + 1}</span>
                <span className="min-w-0 flex-1 text-navy-800">{t(a.label)}</span>
                <span className="hidden shrink-0 text-xs text-muted sm:inline">{t(a.agent)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 text-xs font-semibold uppercase tracking-wider text-muted">{t("Deliverables preview")}</div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {service.demoDeliverables.map((d, i) => (
              <li key={d} className="overflow-hidden rounded-xl border border-line bg-white">
                <TemplatePreview template={service.template} accent={category.accent} variant={i} />
                <div className="border-t border-line px-3 py-2 text-xs font-medium text-navy-800">{t(d)}</div>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      <Card className="p-5 md:p-8">
        <ServiceDetailSections service={service} rec={rec} factoryName={locale === "ar" ? (m.factory.nameAr ?? m.factory.name) : m.factory.name} layout="grid" />
      </Card>

      <DemoDisclaimer>{t("Service overview for demonstration. Pricing to be confirmed — any estimate is illustrative. Production feasibility, capacity and delivery partners are not confirmed.")}</DemoDisclaimer>
    </div>
  );
}

/** Small decorative mock of the workspace template (aria-hidden). */
function TemplatePreview({ template, accent, variant }: { template: WorkspaceTemplate; accent: string; variant: number }) {
  const bars = [38, 62, 48, 80, 56, 70, 44].map((h, i) => (h + variant * 9 + i * 3) % 85 + 15);
  return (
    <div className="bg-grid relative h-24 overflow-hidden p-3" aria-hidden>
      {template === "analytics" || template === "report" ? (
        <div className="flex h-full items-end gap-1.5">
          {bars.map((h, i) => <span key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: i === bars.length - 2 ? accent : `${accent}55` }} />)}
        </div>
      ) : template === "board" || template === "planner" ? (
        <div className="grid h-full grid-cols-3 gap-1.5">
          {[3, 2, 1].map((n, c) => (
            <div key={c} className="space-y-1 rounded-md bg-navy-900/[0.04] p-1">
              {Array.from({ length: n }).map((_, k) => <span key={k} className="block h-3 rounded bg-white shadow-sm" style={{ borderInlineStart: `3px solid ${accent}` }} />)}
            </div>
          ))}
        </div>
      ) : template === "process" ? (
        <div className="flex h-full items-center gap-1.5">
          {[0, 1, 2, 3].map((k) => (
            <span key={k} className="flex flex-1 items-center gap-1.5">
              <span className="h-7 flex-1 rounded-md" style={{ backgroundColor: k === variant % 4 ? accent : `${accent}33` }} />
              {k < 3 ? <ArrowRight className="size-3 shrink-0 text-navy-500/40 rtl:-scale-x-100" /> : null}
            </span>
          ))}
        </div>
      ) : template === "assistant" ? (
        <div className="space-y-1.5">
          <span className="block h-4 w-3/4 rounded-lg bg-navy-900/[0.06]" />
          <span className="ms-auto block h-4 w-2/3 rounded-lg" style={{ backgroundColor: `${accent}55` }} />
          <span className="block h-4 w-1/2 rounded-lg bg-navy-900/[0.06]" />
        </div>
      ) : template === "tracker" || template === "assessment" ? (
        <div className="space-y-1.5">
          {[90, 64, 40].map((w, k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: k === 0 ? accent : `${accent}55` }} />
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-navy-900/[0.06]"><span className="block h-full rounded-full" style={{ width: `${(w + variant * 13) % 90 + 10}%`, backgroundColor: `${accent}AA` }} /></span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <span className="block h-2.5 w-1/2 rounded" style={{ backgroundColor: accent }} />
          <span className="block h-2 w-full rounded bg-navy-900/[0.07]" />
          <span className="block h-2 w-11/12 rounded bg-navy-900/[0.07]" />
          <span className="block h-2 w-4/5 rounded bg-navy-900/[0.07]" />
        </div>
      )}
    </div>
  );
}

export function ServiceNotFound({ param }: { param: string }) {
  const t = useT();
  return (
    <EmptyState
      className={cn("mt-4")}
      icon={<Compass />}
      title={t("We couldn't find that service")}
      description={t("\"{param}\" isn't one of the 21 IMC competitiveness services. Browse the marketplace to find the right one for your factory.", { param })}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild><Link href="/services"><Store /> {t("Open marketplace")}</Link></Button>
          <Button asChild variant="outline"><Link href="/services?tab=requests">{t("Request a custom service")} <ArrowRight className="rtl:-scale-x-100" /></Link></Button>
        </div>
      }
    />
  );
}
