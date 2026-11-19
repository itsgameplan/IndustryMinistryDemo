"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Store } from "lucide-react";
import { CategoryGlyph } from "@/components/services/kit";
import { categoryOf, SERVICE_LIST } from "@/lib/data/services";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LiveBuildProgress, useMarketplace, useServiceTitle } from "./shared";

/** Dashboard card: installed services, live builds and next recommended services. */
export function InstalledServicesCard({ dark, className }: { dark?: boolean; className?: string }) {
  const { state, recs, statusOf } = useMarketplace();
  const tr = useT();
  const serviceTitle = useServiceTitle();
  const installed = SERVICE_LIST.filter((s) => state.installedServices.includes(s.id));
  const deploying = SERVICE_LIST.filter((s) => statusOf(s.id) === "deploying");
  const next = recs.filter((r) => r.recommended && statusOf(r.service.id) === "available").slice(0, 3);
  const fallbackNext = next.length ? next : recs.filter((r) => statusOf(r.service.id) === "available").slice(0, 3);

  const t = {
    card: dark ? "border-white/10 bg-navy-950 text-white" : "border-line bg-white",
    title: dark ? "text-white" : "text-navy-900",
    muted: dark ? "text-white/55" : "text-muted",
    row: dark ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]" : "border-line bg-white hover:shadow-card",
    label: dark ? "text-white/40" : "text-muted",
    link: dark ? "text-teal-300" : "text-teal-700",
  };

  return (
    <section className={cn("relative overflow-hidden rounded-2xl border shadow-card", t.card, className)} aria-labelledby="installed-services-title">
      {dark ? <div className="bg-grid-dark absolute inset-0" aria-hidden /> : null}
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="installed-services-title" className={cn("text-[15px] font-semibold tracking-tight", t.title)}>{tr("AI competitiveness services")}</h2>
            <p className={cn("mt-1 text-sm", t.muted)}>
              {installed.length ? tr("{installed} of {total} IMC services installed", { installed: installed.length, total: SERVICE_LIST.length }) : tr("{total} IMC services ready to activate", { total: SERVICE_LIST.length })}
              {deploying.length ? ` · ${tr("{count} building", { count: deploying.length })}` : ""}
            </p>
          </div>
          <Link href="/services" className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-medium hover:underline", t.link)}>
            <Store className="size-4" /> {tr("Marketplace||services")}
          </Link>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-wider", t.label)}>{tr("Your services")}</div>
            {installed.length || deploying.length ? (
              <ul className="space-y-2">
                {deploying.map((s) => (
                  <li key={s.id}>
                    <Link href={s.route} className={cn("block rounded-xl border p-3 transition", t.row)}>
                      <div className="flex items-center gap-3">
                        <CategoryGlyph category={categoryOf(s.category)} size="sm" />
                        <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", t.title)}>{serviceTitle(s)}</span>
                      </div>
                      <LiveBuildProgress serviceId={s.id} dark={dark} className="mt-2.5" />
                    </Link>
                  </li>
                ))}
                {installed.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link href={s.route} className={cn("flex items-center gap-3 rounded-xl border p-3 transition", t.row)}>
                      <CategoryGlyph category={categoryOf(s.category)} size="sm" />
                      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", t.title)}>{serviceTitle(s)}</span>
                      <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-medium", t.link)}>{tr("Open")} <ArrowRight className="size-3.5 rtl:-scale-x-100" /></span>
                    </Link>
                  </li>
                ))}
                {installed.length > 5 ? (
                  <li><Link href="/services?tab=installed" className={cn("text-xs font-medium hover:underline", t.link)}>{tr("View all {count} installed services", { count: installed.length })} <span className="inline-block rtl:-scale-x-100">→</span></Link></li>
                ) : null}
              </ul>
            ) : (
              <div className={cn("rounded-xl border border-dashed px-4 py-6 text-center text-sm", dark ? "border-white/15 text-white/60" : "border-line text-muted")}>
                {tr("No services installed yet. Activate one and AI agents prepare a workspace in ~12 seconds.")}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className={cn("mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider", t.label)}><Sparkles className="size-3 text-gold-400" /> {tr("Recommended next")}</div>
            {fallbackNext.length ? (
              <ul className="space-y-2">
                {fallbackNext.map((r) => (
                  <li key={r.service.id}>
                    <Link href={r.service.route} className={cn("flex items-center gap-3 rounded-xl border p-3 transition", t.row)}>
                      <CategoryGlyph category={categoryOf(r.service.category)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-medium", t.title)}>{serviceTitle(r.service)}</span>
                        <span className={cn("block truncate text-xs", t.muted)}>{tr(r.reasons[0] ?? r.service.tagline)}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-gold-500">{r.score}%</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn("text-sm", t.muted)}>{tr("All recommended services are installed.")}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
