"use client";

// Marketplace helpers shared by the /services pages, the service route and the dashboard card.
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Hourglass, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { StatusPill } from "@/components/services/kit";
import { SERVICES } from "@/lib/data/services";
import { recommendServices, type ServiceRecommendation } from "@/lib/recommendations";
import { deploymentKey, deploymentProgress, useActiveFactory, useJahez, useNow } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import { cn, JAHEZ_BRAND, serviceTitle } from "@/lib/utils";
import type { ExportStatus, ProductionFeasibility, ServiceId, WorkspaceTemplate } from "@/lib/types";

export type ServiceStatus = "installed" | "deploying" | "available";

export const TEMPLATE_LABELS: Record<WorkspaceTemplate, string> = {
  analytics: "Analytics dashboard",
  document: "Document studio",
  process: "Process designer",
  assessment: "Guided assessment",
  board: "Pipeline board",
  planner: "Planner",
  report: "Report builder",
  tracker: "Tracker",
  assistant: "AI assistant",
};

export const EXPORT_LABELS: Record<ExportStatus, string> = {
  none: "Not exporting yet",
  exploring: "Exploring export",
  occasional: "Occasional exporter",
  regular: "Regular exporter",
};

export const FEASIBILITY_META: Record<ProductionFeasibility, { label: string; tone: "good" | "warn" | "neutral"; description: string }> = {
  confirmed: { label: "Confirmed", tone: "good", description: "Production delivery confirmed with evidence." },
  conditional: { label: "Conditional", tone: "warn", description: "Deliverable in production subject to stated conditions." },
  "not-assessed": { label: "Not yet assessed", tone: "neutral", description: "Production delivery has not been assessed. Only the demo capability is available." },
};

/** "Indicative 3–6 weeks for catalogue…" → "3–6 weeks". */
export function shortTimeline(timeline: string) {
  const m = timeline.match(/\d+\s*[–-]\s*\d+\s*(?:weeks?|months?)|\d+\s*(?:weeks?|months?)/i);
  return m ? m[0] : timeline.replace(/^Indicative\s*/i, "");
}

export const formatDate = (ms: number, locale: "en" | "ar" = "en") => new Date(ms).toLocaleDateString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

/** "March 2027" (stored English month label) → localised month label for display. */
export function formatMonthLabel(label: string, locale: "en" | "ar" = "en") {
  if (locale !== "ar") return label;
  const d = new Date(`1 ${label}`);
  return Number.isNaN(d.getTime()) ? label : d.toLocaleDateString("ar-EG-u-nu-latn", { month: "long", year: "numeric" });
}

/** Primary display name for anything with an optional Arabic form (services, categories). */
/** Plain-text Jahez-branded service title for the active locale (toasts, labels, aria). */
export function useServiceTitle() {
  const { locale } = useLocale();
  return useCallback((x: { name: string; nameAr?: string }) => serviceTitle(x, locale), [locale]);
}

/** Jahez-branded service title for headings: the brand word is highlighted, the official name follows. */
export function ServiceTitle({ service, lang, className }: { service: { name: string; nameAr?: string }; lang?: "en" | "ar"; className?: string }) {
  const { locale } = useLocale();
  const ar = (lang ?? locale) === "ar";
  return (
    <span className={className}>
      <span className="font-semibold text-teal-600">{ar ? JAHEZ_BRAND.ar : JAHEZ_BRAND.en}</span> {ar ? (service.nameAr || service.name) : service.name}
    </span>
  );
}

export function useLocalName() {
  const { locale } = useLocale();
  return useCallback((x: { name: string; nameAr?: string }) => (locale === "ar" ? (x.nameAr ?? x.name) : x.name), [locale]);
}

/** Recommendations + live status for every service, for the active factory. */
export function useMarketplace() {
  const { id: factoryId, factory, state, tier } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const recs = useMemo(() => recommendServices(factory, state), [factory, state]);
  const recById = useMemo(() => new Map(recs.map((r) => [r.service.id, r])), [recs]);
  const statusOf = useCallback(
    (sid: ServiceId): ServiceStatus =>
      state.installedServices.includes(sid) ? "installed" : deployments[deploymentKey(factoryId, sid)]?.status === "running" ? "deploying" : "available",
    [state.installedServices, deployments, factoryId]
  );
  return { factoryId, factory, state, tier, deployments, recs, recById, statusOf };
}

/** Starts a simulated service build and opens the service route (which shows the build console). */
export function useActivateService() {
  const router = useRouter();
  const { id: factoryId } = useActiveFactory();
  const start = useJahez((s) => s.startDeployment);
  return useCallback(
    (sid: ServiceId) => {
      start(factoryId, sid);
      router.push(SERVICES[sid].route);
    },
    [start, factoryId, router]
  );
}

/** Live build progress for a service (self-contained ticker so parents don't re-render). */
export function LiveBuildProgress({ serviceId, dark, className, showLabel = true }: { serviceId: ServiceId; dark?: boolean; className?: string; showLabel?: boolean }) {
  const { id } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(id, serviceId)]);
  const now = useNow(400);
  const t = useT();
  if (!dep) return null;
  const p = deploymentProgress(dep, now);
  const pct = Math.round(p.ratio * 100);
  const eta = Math.max(0, Math.ceil(SERVICES[serviceId].deploySeconds - p.elapsed));
  return (
    <div className={className}>
      {showLabel ? (
        <div className={cn("mb-1.5 flex items-center justify-between gap-2 text-xs", dark ? "text-white/70" : "text-teal-700")}>
          <span className="inline-flex items-center gap-1.5 font-medium"><Loader2 className="size-3 animate-spin" /> {pct >= 100 ? t("Finalising workspace…") : t("AI agents building")}</span>
          <span className="tabular-nums">{pct}% · {eta}s</span>
        </div>
      ) : null}
      <div className={cn("h-1.5 overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-teal-50")} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("Build progress")}>
        <div className={cn("h-full rounded-full transition-[width] duration-300 ease-linear", dark ? "bg-teal-400" : "bg-teal-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Single status pill summarising installed / deploying / recommended / needs-preparation. */
export function ServiceStatusPill({ status, rec, className }: { status: ServiceStatus; rec?: ServiceRecommendation; className?: string }) {
  const t = useT();
  if (status === "installed") return <StatusPill tone="good" className={className}><CheckCircle2 /> {t("Installed")}</StatusPill>;
  if (status === "deploying") return <StatusPill tone="info" className={className}><Loader2 className="animate-spin" /> {t("Deploying")}</StatusPill>;
  if (rec && !rec.ready) return <StatusPill tone="warn" className={className}><TriangleAlert /> {t("Needs preparation")}</StatusPill>;
  if (rec?.recommended) return <StatusPill tone="neutral" className={cn("bg-gold-50 text-gold-600 ring-gold-300/60", className)}><Sparkles /> {t("Recommended")}</StatusPill>;
  return <StatusPill tone="neutral" className={className}><CircleDashed /> {t("Available")}</StatusPill>;
}

export function FeasibilityPill({ feasibility }: { feasibility: ProductionFeasibility }) {
  const meta = FEASIBILITY_META[feasibility];
  const t = useT();
  return <StatusPill tone={meta.tone}>{feasibility === "confirmed" ? <CheckCircle2 /> : <Hourglass />} {t(meta.label)}</StatusPill>;
}
