"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Lightbulb, Printer, ShieldAlert, Users } from "lucide-react";
import { Badge, Button, DemoDisclaimer } from "@/components/ui";
import { CategoryGlyph } from "@/components/services/kit";
import { PageHeader } from "@/components/shell/shared";
import { FeasibilityPill, shortTimeline } from "@/components/services/marketplace/shared";
import { PROPOSED_EXTENSIONS, SERVICE_CATEGORIES, SERVICE_LIST } from "@/lib/data/services";
import { cn, localName, serviceTitle } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { ServiceCategoryId } from "@/lib/types";

export default function CoveragePage() {
  const [category, setCategory] = useState<ServiceCategoryId | "all">("all");
  const t = useT();
  const { locale } = useLocale();
  const rows = SERVICE_LIST.filter((s) => category === "all" || s.category === category);
  const groups = SERVICE_CATEGORIES.map((c) => ({ c, items: rows.filter((s) => s.category === c.id) })).filter((g) => g.items.length);

  const count = (f: (typeof SERVICE_LIST)[number]["feasibility"]) => rows.filter((s) => s.feasibility === f).length;
  const summary = [
    { label: "Services in scope", value: rows.length, tone: "text-navy-900" },
    { label: "Demo capability available", value: rows.length, tone: "text-teal-700" },
    { label: "Production confirmed", value: count("confirmed"), tone: "text-emerald-700" },
    { label: "Conditional", value: count("conditional"), tone: "text-amber-700" },
    { label: "Not yet assessed", value: count("not-assessed"), tone: "text-navy-600" },
    { label: "Consultant-led in production", value: rows.filter((s) => s.humanDelivered).length, tone: "text-navy-600" },
  ];

  return (
    <div className="min-w-0">
      <Button asChild variant="ghost" size="sm" className="-ms-2 mb-3 print:hidden"><Link href="/services"><ArrowLeft className="rtl:-scale-x-100" /> {t("Marketplace||services")}</Link></Button>
      <PageHeader
        eyebrow={t("Partnership discussion · JZ-031")}
        title={t("Service coverage matrix")}
        description={t("All 21 services of the IMC Competitiveness Program, showing what Jahez can demonstrate today and what remains to be assessed for production delivery.")}
        actions={<Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer /> {t("Print / save PDF")}</Button>}
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
        <p>
          <span className="font-semibold">{t("No production support is confirmed without evidence.")}</span> {t("A demo workspace exists for every service, but production feasibility, delivery capacity, partners and pricing remain to be assessed and quoted. Statuses change only when supporting evidence is reviewed.")}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {summary.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4 shadow-card print:shadow-none">
            <dd className={cn("text-2xl font-semibold tabular-nums tracking-tight", s.tone)}>{s.value}</dd>
            <dt className="mt-0.5 text-xs text-muted">{t(s.label)}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center print:hidden">
        <label htmlFor="coverage-cat" className="text-xs font-semibold uppercase tracking-wider text-navy-600">{t("Category")}</label>
        <select id="coverage-cat" value={category} onChange={(e) => setCategory(e.target.value as ServiceCategoryId | "all")} className="h-10 rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:w-80">
          <option value="all">{t("All 9 categories")}</option>
          {SERVICE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.number}. {localName(c, locale)}</option>)}
        </select>
        <span className="text-xs tabular-nums text-muted sm:ms-auto">{t("{shown} of {total} services", { shown: rows.length, total: SERVICE_LIST.length })}</span>
      </div>

      <div className="scrollbar-thin mt-4 overflow-x-auto rounded-2xl border border-line bg-white shadow-card print:overflow-visible print:shadow-none">
        <table className="w-full min-w-[1080px] border-collapse text-start text-sm print:min-w-0 print:text-[10px]">
          <caption className="sr-only">{t("Coverage of the 21 IMC services by category")}</caption>
          <thead className="bg-canvas text-[11px] uppercase tracking-wider text-navy-600">
            <tr>
              <th scope="col" className="w-[24%] px-4 py-3 font-semibold">{t("Service")}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t("Demo capability")}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t("Production feasibility")}</th>
              <th scope="col" className="w-[22%] px-4 py-3 font-semibold">{t("Prerequisites & limitations")}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t("Indicative timeline")}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t("Pricing")}</th>
              <th scope="col" className="w-[16%] px-4 py-3 font-semibold">{t("Coverage & capacity")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(({ c, items }) => (
              <Fragment key={c.id}>
                <tr className="border-t border-line" style={{ backgroundColor: `${c.accent}0D` }}>
                  <th scope="colgroup" colSpan={7} className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <CategoryGlyph category={c} size="sm" />
                      <span className="text-sm font-semibold text-navy-900">{c.number}. {localName(c, locale)}</span>
                      <span className="text-xs font-normal text-muted">· {items.length > 1 ? t("{count} services", { count: items.length }) : t("1 service")}</span>
                    </span>
                  </th>
                </tr>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-line align-top transition-colors hover:bg-canvas/50">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <span className="text-[11px] font-semibold tabular-nums text-muted">{t("No. {number}", { number: String(s.number).padStart(2, "0") })}</span>
                      <span className="mt-0.5 block font-semibold leading-snug text-navy-900">{serviceTitle(s, locale)}</span>
                      {s.humanDelivered ? <Badge tone="amber" className="mt-1.5"><Users /> {t("Consultant-led")}</Badge> : null}
                    </th>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-medium text-teal-700"><CheckCircle2 className="size-4" /> {t("Yes")}</span>
                      <Link href={s.route} className="mt-1 flex items-center gap-0.5 text-xs text-navy-600 hover:text-teal-700 hover:underline print:hidden">{t("Open demo")} <ArrowUpRight className="size-3" /></Link>
                    </td>
                    <td className="px-4 py-3"><FeasibilityPill feasibility={s.feasibility} /></td>
                    <td className="px-4 py-3 text-xs text-navy-700">
                      <div className="font-semibold text-navy-800">{t("Prerequisites")}</div>
                      <ul className="mt-0.5 space-y-0.5">{s.prerequisites.map((p) => <li key={p}>· {t(p)}</li>)}</ul>
                      <div className="mt-2 font-semibold text-navy-800">{t("Limitations")}</div>
                      <ul className="mt-0.5 space-y-0.5">{s.limitations.map((l) => <li key={l}>· {t(l)}</li>)}</ul>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-700"><span className="block font-semibold text-navy-900">{t(shortTimeline(s.timeline))}</span>{t(s.timeline)}</td>
                    <td className="px-4 py-3 text-xs text-navy-700">
                      <span className="font-medium text-navy-900">{t("Pending quotation")}</span>
                      <span className="mt-0.5 block">{t(s.pricingModel)}</span>
                      {s.illustrativeEstimate ? <span className="mt-1 block text-[11px] text-gold-600">{t(s.illustrativeEstimate)}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-navy-700">{t(s.capacityNotes)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="ext-heading" className="mt-12 rounded-3xl border-2 border-dashed border-line bg-white/60 p-5 md:p-8 print:break-before-page">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="ext-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-navy-900"><Lightbulb className="size-5 text-gold-500" /> {t("Additional services proposed by Jahez")}</h2>
            <p className="mt-0.5 text-sm text-muted">{t("Not part of the IMC list. Shown for discussion only — none of these is a confirmed offering, and none is available as a demo workspace.")}</p>
          </div>
          <Badge tone="outline" className="self-start">{t("{count} proposals", { count: PROPOSED_EXTENSIONS.length })}</Badge>
        </div>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PROPOSED_EXTENSIONS.map((e) => (
            <li key={e.id} className="flex flex-col rounded-2xl border border-line bg-white p-4">
              <Badge tone="gold" className="self-start">{t("Proposed extension — not a confirmed offering")}</Badge>
              <h3 className="mt-2.5 font-semibold text-navy-900">{t(e.name)}</h3>
              <p className="mt-1 text-sm text-muted">{t(e.description)}</p>
            </li>
          ))}
        </ul>
      </section>

      <DemoDisclaimer className="mt-8">
        {t("Coverage matrix prepared for partnership discussion. Demo capability refers to simulated workspaces only. Production feasibility is \"not yet assessed\" unless evidence is provided; no prices, capacity or providers are confirmed.")}
      </DemoDisclaimer>
    </div>
  );
}
