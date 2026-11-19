"use client";

import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Clock, X } from "lucide-react";
import { CategoryGlyph } from "@/components/services/kit";
import { categoryOf, SERVICES } from "@/lib/data/services";
import { useLocale, useT } from "@/lib/i18n";
import type { ServiceRecommendation } from "@/lib/recommendations";
import type { ServiceId } from "@/lib/types";
import { ServiceActions, ServiceDetailSections } from "./service-detail";
import { ServiceStatusPill, shortTimeline, TEMPLATE_LABELS, ServiceTitle, useLocalName, type ServiceStatus } from "./shared";
import { serviceTitle } from "@/lib/utils";

/** Right-side sheet with full service details. Keyboard-operable (Radix Dialog: focus trap, Esc to close). */
export function ServiceDrawer({
  serviceId,
  open,
  onOpenChange,
  status,
  rec,
  factoryName,
}: {
  serviceId: ServiceId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: ServiceStatus;
  rec?: ServiceRecommendation;
  factoryName: string;
}) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale, isRtl } = useLocale();
  const localName = useLocalName();
  const offscreen = isRtl ? "-100%" : "100%";
  const service = serviceId ? SERVICES[serviceId] : null;
  const category = service ? categoryOf(service.category) : null;

  return (
    <DialogPrimitive.Root open={open && !!service} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && service && category ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2 }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed inset-y-0 end-0 z-50 flex w-full max-w-[640px] flex-col bg-white shadow-lift focus:outline-none sm:rounded-s-3xl"
                initial={reduce ? { opacity: 0 } : { x: offscreen }}
                animate={reduce ? { opacity: 1 } : { x: 0 }}
                exit={reduce ? { opacity: 0 } : { x: offscreen }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
              >
                <header className="relative shrink-0 overflow-hidden border-b border-line px-5 pb-5 pt-5 sm:px-7">
                  <div className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full blur-3xl" style={{ backgroundColor: `${category.accent}22` }} aria-hidden />
                  <div className="relative flex items-start gap-4 pe-10">
                    <CategoryGlyph category={category} size="lg" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: category.accent }}>
                        {t("Service {number} · {category}", { number: String(service.number).padStart(2, "0"), category: localName(category) })}
                      </div>
                      <DialogPrimitive.Title className="mt-1 text-lg font-semibold leading-snug tracking-tight text-navy-900 sm:text-xl"><ServiceTitle service={service} /></DialogPrimitive.Title>
                      {locale === "ar" ? <div className="mt-0.5 text-sm text-muted" lang="en" dir="ltr">{serviceTitle(service, "en")}</div> : <div className="font-arabic mt-0.5 text-sm text-muted" lang="ar" dir="rtl">{serviceTitle(service, "ar")}</div>}
                    </div>
                  </div>
                  <DialogPrimitive.Close className="absolute end-4 top-4 rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" aria-label={t("Close details")}>
                    <X className="size-5" />
                  </DialogPrimitive.Close>
                  <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <ServiceStatusPill status={status} rec={rec} />
                    <span className="rounded-full bg-navy-900/[0.04] px-2 py-0.5">{t(TEMPLATE_LABELS[service.template])}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {t("{timeline} indicative", { timeline: t(shortTimeline(service.timeline)) })}</span>
                  </div>
                </header>

                <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                  <p className="text-[15px] leading-relaxed text-navy-800">{t(service.description)}</p>
                  <div className="mt-6">
                    <ServiceDetailSections service={service} rec={rec} factoryName={factoryName} />
                  </div>
                  <Link href={service.route} onClick={() => onOpenChange(false)} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                    {t("Open full service page")} <ArrowUpRight className="size-4" />
                  </Link>
                </div>

                <footer className="scrollbar-thin max-h-[55dvh] shrink-0 overflow-y-auto border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
                  <ServiceActions service={service} status={status} rec={rec} onNavigate={() => onOpenChange(false)} />
                </footer>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
