"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarCheck, Clock, LayoutTemplate, Sparkles, TriangleAlert } from "lucide-react";
import { CategoryGlyph } from "@/components/services/kit";
import { categoryOf } from "@/lib/data/services";
import type { ServiceRecommendation } from "@/lib/recommendations";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ServiceDefinition } from "@/lib/types";
import { formatDate, LiveBuildProgress, ServiceStatusPill, shortTimeline, TEMPLATE_LABELS, ServiceTitle, useLocalName, type ServiceStatus } from "./shared";

/**
 * Marketplace service card. The whole card opens the details drawer (stretched button);
 * secondary links sit above it so they stay independently focusable.
 */
export function ServiceCard({
  service,
  status,
  rec,
  onOpen,
  variant = "default",
  installedAt,
  index = 0,
}: {
  service: ServiceDefinition;
  status: ServiceStatus;
  rec?: ServiceRecommendation;
  onOpen: () => void;
  variant?: "default" | "recommended" | "installed";
  installedAt?: number;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const localName = useLocalName();
  const category = categoryOf(service.category);
  const needsPrep = status === "available" && rec && !rec.ready;
  const showReasons = variant === "recommended" && rec;

  return (
    <motion.article
      layout={reduce ? false : "position"}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(index, 10) * 0.03 }}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-within:ring-2 focus-within:ring-teal-400 focus-within:ring-offset-2 motion-reduce:hover:translate-y-0",
        status === "installed" ? "border-emerald-200" : status === "deploying" ? "border-teal-300" : needsPrep ? "border-dashed border-amber-300/80" : rec?.recommended ? "border-gold-300/70" : "border-line"
      )}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${category.accent}, ${category.accent}55)` }} aria-hidden />
      <div className="pointer-events-none absolute -end-14 -top-14 size-36 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundColor: `${category.accent}26` }} aria-hidden />

      <div className="relative flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <CategoryGlyph category={category} />
          <div className="flex flex-col items-end gap-1.5">
            <ServiceStatusPill status={status} rec={rec} />
            {rec && (variant === "recommended" || rec.recommended) && status !== "installed" ? (
              <span className="text-[11px] font-semibold tabular-nums text-gold-600">{t("{score}% match", { score: rec.score })}</span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: category.accent }}>
          <span className="tabular-nums">{t("No. {number}", { number: String(service.number).padStart(2, "0") })}</span>
          <span className="size-1 rounded-full bg-current opacity-50" aria-hidden />
          <span className="truncate">{localName(category)}</span>
        </div>
        <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-tight text-navy-900">
          <button type="button" onClick={onOpen} className="text-start after:absolute after:inset-0 after:content-[''] focus-visible:outline-none" aria-haspopup="dialog">
            <ServiceTitle service={service} />
          </button>
        </h3>
        <p className="mt-1.5 text-sm text-muted">{t(service.tagline)}</p>

        {showReasons && rec.reasons.length ? (
          <div className="mt-4 rounded-xl bg-gold-50/80 p-3 ring-1 ring-inset ring-gold-300/50">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold-600"><Sparkles className="size-3" /> {t("Why recommended")}</div>
            <ul className="mt-1.5 space-y-1">
              {rec.reasons.map((r) => <li key={r} className="text-xs leading-snug text-navy-800">· {t(r)}</li>)}
            </ul>
          </div>
        ) : null}

        {needsPrep ? (
          <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
            <TriangleAlert className="mt-px size-3.5 shrink-0" /> {t("Designed for Tier {tier}+ · preparation recommended", { tier: service.recommendedTier })}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><LayoutTemplate className="size-3.5" /> {t(TEMPLATE_LABELS[service.template])}</span>
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {t(shortTimeline(service.timeline))}</span>
          </div>

          {status === "deploying" ? <LiveBuildProgress serviceId={service.id} className="mt-3" /> : null}

          {status === "installed" ? (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
              <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-emerald-700">
                <CalendarCheck className="size-3.5 shrink-0" /> {installedAt ? t("Deployed {date}", { date: formatDate(installedAt, locale) }) : t("Installed")}
              </span>
              <Link href={service.route} className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                {t("Open||action")} <ArrowRight className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : status === "deploying" ? (
            <div className="mt-3 flex justify-end">
              <Link href={service.route} className="relative z-10 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                {t("Watch build")} <ArrowRight className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs">
              <span className="text-muted">{t("Pricing to be confirmed")}</span>
              <span className="inline-flex items-center gap-1 font-medium text-navy-700 transition-colors group-hover:text-teal-700">{t("Details")} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" /></span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
