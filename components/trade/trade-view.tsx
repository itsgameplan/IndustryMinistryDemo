"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, Building2, ChevronDown, Clock, FileCheck2, FlaskConical, Gauge, Leaf, Mail, MapPin, Phone, Plane, Scale, Search, Ship,
  Star, TrendingDown, TrendingUp, Users, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui";
import { CountUp } from "@/components/product/dashboard-kit";
import {
  HOME, TRADE_COUNTRIES, TRADE_INDUSTRIES, countryProfile, legalRequirements, opportunity, tradePartners, type TradeCountry, type TradeDirection,
} from "@/lib/data/trade";
import { cn } from "@/lib/utils";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import { Flag } from "./flag";

const TradeGlobe = dynamic(() => import("./trade-globe"), { ssr: false, loading: () => <GlobeLoading /> });

const EASE = [0.16, 1, 0.3, 1] as const;
const softCard = "rounded-[24px] border border-white bg-white/85 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_16px_40px_-22px_rgba(11,31,58,0.25)] backdrop-blur";

function GlobeLoading() {
  const t = useT();
  return (
    <div className="absolute inset-0 grid place-items-center text-sm text-white/60">
      <div className="flex flex-col items-center gap-3">
        <span className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-teal-300" />
        {t("Loading globe…")}
      </div>
    </div>
  );
}

export function TradeView() {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const arrow = ar ? "←" : "→";
  const reduce = useReducedMotion();
  const [countryId, setCountryId] = useState("germany");
  const [query, setQuery] = useState("");
  const [dir, setDir] = useState<TradeDirection>("export");
  const [industryId, setIndustryId] = useState(TRADE_INDUSTRIES[0].id);
  const [productId, setProductId] = useState(TRADE_INDUSTRIES[0].products[0].id);
  const [details, setDetails] = useState(false);

  const country = TRADE_COUNTRIES.find((c) => c.id === countryId) ?? TRADE_COUNTRIES[0];
  const profile = countryProfile(country);
  const industry = TRADE_INDUSTRIES.find((i) => i.id === industryId) ?? TRADE_INDUSTRIES[0];
  const product = industry.products.find((p) => p.id === productId) ?? industry.products[0];
  const opp = opportunity(country, product, dir);
  const q = query.trim().toLowerCase();
  const matches = TRADE_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || t(c.name).toLowerCase().includes(q));
  const countryName = t(country.name);

  const selectCountry = (id: string) => {
    setCountryId(id);
    setQuery("");
  };

  return (
    <div>
      <motion.header initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="mb-6">
        <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-teal-600">{t("Global trade")}</div>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em] text-navy-900 md:text-[44px]">{t("Export / Import")}</h1>
        <p className="mt-2 text-[15px] text-muted md:text-lg">{t("Explore markets, routes and partners from Egypt to the world.")}</p>
      </motion.header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
        {/* Globe (first on mobile) */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="relative order-first h-[420px] overflow-hidden rounded-[28px] bg-[radial-gradient(ellipse_at_50%_40%,#0E2445_0%,#06101F_60%,#030812_100%)] shadow-[0_30px_60px_-30px_rgba(5,14,31,0.7)] md:h-[560px] xl:order-last xl:sticky xl:top-20 xl:h-[calc(100vh-7rem)]"
        >
          <TradeGlobe selected={country} onSelect={selectCountry} animate={!reduce} />
          <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-start justify-between gap-2">
            <div className="rounded-2xl bg-white/[0.08] px-4 py-2.5 text-white ring-1 ring-white/15 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">{dir === "export" ? t("Route") : t("Inbound route")}</div>
              <div className="mt-0.5 text-sm font-semibold">
                {dir === "export" ? <span className="inline-flex items-center gap-1.5"><Flag iso={HOME.iso} /> {t("Egypt")} {arrow} <Flag iso={country.iso} /> {countryName}</span> : <span className="inline-flex items-center gap-1.5"><Flag iso={country.iso} /> {countryName} {arrow} <Flag iso={HOME.iso} /> {t("Egypt")}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-xl"><Ship className="size-3.5 text-amber-300" /> {t("{count} vessels", { count: profile.vesselsInTransit })}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-xl"><Plane className="size-3.5 text-sky-300" /> {t("{count} flights", { count: profile.flightsInTransit })}</span>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/60">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 ring-1 ring-white/10 backdrop-blur">{t("Drag to rotate · scroll to zoom · click a dot")}</span>
            <span className="flex gap-3 rounded-full bg-white/[0.06] px-3 py-1 ring-1 ring-white/10 backdrop-blur">
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-teal-300" /> {t("Sea")}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-sky-300" /> {t("Air")}</span>
            </span>
          </div>
        </motion.div>

        {/* Panel */}
        <div className="space-y-4">
          {/* Country picker */}
          <section className={cn(softCard, "p-5")}>
            <label className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted" htmlFor="country-search">{t("Country")}</label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input id="country-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search countries…")} className="h-11 w-full rounded-xl border border-line bg-white ps-10 pe-3 text-sm outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100" />
            </div>
            <div className="mt-3 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto scrollbar-thin">
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCountry(c.id)}
                  aria-pressed={c.id === country.id}
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition", c.id === country.id ? "bg-navy-900 text-white shadow" : "bg-canvas text-navy-800 hover:bg-navy-900/[0.06]")}
                >
                  <Flag iso={c.iso} /> {t(c.name)}
                </button>
              ))}
              {!matches.length ? <span className="text-sm text-muted">{t("No match")}</span> : null}
            </div>
          </section>

          {/* Country stats */}
          <motion.section key={country.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className={cn(softCard, "p-5")}>
              <div className="flex items-center gap-3">
                <Flag iso={country.iso} size="lg" />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-navy-900">{countryName}</h2>
                  <p className="text-xs text-muted">{t(country.region)} · {t("main port {port}", { port: t(country.port) })}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Stat icon={<Zap />} tone="amber" label={t("Energy demand")} value={<><CountUp value={profile.energyDemandTwh} /> <small className="text-xs font-medium text-muted">{t("TWh/yr")}</small></>} hint={t("+{growth}% per year · {share}% renewable", { growth: profile.energyGrowthPct, share: profile.renewableSharePct })} />
                <Stat icon={<Gauge />} tone="teal" label={t("Renewable share")} value={<><CountUp value={profile.renewableSharePct} />%</>} hint={t("of electricity generation")} />
                <Stat icon={<ArrowUpRight />} tone="green" label={t("Most exported")} value={t(profile.topExport.name)} hint={t("${value}bn per year", { value: profile.topExport.valueBn })} small />
                <Stat icon={<ArrowDownLeft />} tone="blue" label={t("Most imported")} value={t(profile.topImport.name)} hint={t("${value}bn per year", { value: profile.topImport.valueBn })} small />
              </div>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <ChipList icon={<TrendingUp className="size-4" />} title={t("Surpluses")} items={profile.surpluses.map((x) => t(x))} tone="emerald" />
                <ChipList icon={<TrendingDown className="size-4" />} title={t("Shortages")} items={profile.shortages.map((x) => t(x))} tone="rose" />
              </div>
          </motion.section>

          {/* Trade filter */}
          <section className={cn(softCard, "p-5")}>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1" role="group" aria-label={t("Trade direction")}>
              {(["export", "import"] as const).map((d) => (
                <button key={d} type="button" aria-pressed={dir === d} onClick={() => setDir(d)} className={cn("relative h-10 rounded-xl text-sm font-semibold transition", dir === d ? "text-navy-900" : "text-muted hover:text-navy-900")}>
                  {dir === d ? <motion.span layoutId="trade-dir" className="absolute inset-0 rounded-xl bg-white shadow-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
                  <span className="relative inline-flex items-center gap-1.5">{d === "export" ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />} {d === "export" ? t("Export to {country}", { country: countryName }) : t("Import from {country}", { country: countryName })}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <Select label={t("Industry")} value={industry.id} onChange={(v) => { setIndustryId(v); setProductId(TRADE_INDUSTRIES.find((i) => i.id === v)!.products[0].id); }} options={TRADE_INDUSTRIES.map((i) => [i.id, t(i.name)])} />
              <Select label={t("Product")} value={product.id} onChange={setProductId} options={industry.products.map((p) => [p.id, `${t(p.name)} · HS ${p.hs}`])} />
            </div>

            <motion.div key={`${country.id}-${product.id}-${dir}`} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-4 rounded-2xl bg-gradient-to-br from-teal-50 to-white p-4 ring-1 ring-teal-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-700">{t("Opportunity score")}</div>
                    <div className="mt-1 text-4xl font-bold tabular-nums text-navy-900"><CountUp value={opp.score} /><span className="text-lg text-muted">/100</span></div>
                  </div>
                  <Sparkline values={opp.trend} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <Fact k={t("Market size")} v={t("${value}M", { value: opp.marketSizeM.toLocaleString("en-US") })} />
                  <Fact k={dir === "export" ? t("Egypt's share") : t("Share of Egypt imports")} v={`${opp.egyptSharePct}%`} />
                  <Fact k={t("Tariff")} v={`${opp.tariffPct}%`} />
                  <Fact k={t("Demand growth")} v={`${opp.demandGrowthPct > 0 ? "+" : ""}${opp.demandGrowthPct}%`} />
                  <Fact k={t("Lead time")} v={t("{count} days", { count: opp.leadTimeDays })} />
                  <Fact k={t("Mode")} v={t(opp.mode)} />
                </dl>
                <div className="mt-3 text-xs text-muted">{t("Main competitors: {list}", { list: opp.competitors.map((x) => t(x)).join(ar ? "، " : ", ") })}</div>
            </motion.div>

            <button type="button" onClick={() => setDetails(true)} className="group mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 text-[15px] font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-navy-800">
              {t("View details")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted"><FlaskConical className="size-3.5" /> {t("Simulated figures for demonstration")}</p>
          </section>
        </div>
      </div>

      <DetailsDialog open={details} onOpenChange={setDetails} country={country} productId={product.id} industryName={t(industry.name)} dir={dir} />
    </div>
  );
}

function Stat({ icon, label, value, hint, tone, small }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint: string; tone: "amber" | "teal" | "green" | "blue"; small?: boolean }) {
  const tones = { amber: "bg-amber-50 text-amber-600", teal: "bg-teal-50 text-teal-600", green: "bg-emerald-50 text-emerald-600", blue: "bg-sky-50 text-sky-600" } as const;
  return (
    <div className="rounded-2xl bg-canvas/70 p-3.5">
      <div className="flex items-center gap-2 text-[12px] font-medium text-navy-700">
        <span className={cn("grid size-7 place-items-center rounded-lg [&_svg]:size-4", tones[tone])}>{icon}</span>
        {label}
      </div>
      <div className={cn("mt-2 font-semibold tracking-tight text-navy-900", small ? "text-[15px] leading-snug" : "text-2xl tabular-nums")}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{hint}</div>
    </div>
  );
}

function ChipList({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items: string[]; tone: "emerald" | "rose" }) {
  return (
    <div className={cn("rounded-2xl p-3.5", tone === "emerald" ? "bg-emerald-50/70" : "bg-rose-50/70")}>
      <div className={cn("flex items-center gap-1.5 text-[12px] font-semibold", tone === "emerald" ? "text-emerald-700" : "text-rose-700")}>{icon} {title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((x) => <span key={x} className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-navy-800 shadow-sm">{x}</span>)}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block min-w-0">
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="relative mt-1.5 block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full cursor-pointer appearance-none truncate rounded-xl border border-line bg-white ps-3.5 pe-9 text-sm font-medium text-navy-900 outline-none transition focus:border-teal-300 focus:ring-4 focus:ring-teal-100">
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{k}</dt>
      <dd className="font-semibold tabular-nums text-navy-900">{v}</dd>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - ((v - min) / Math.max(1, max - min)) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-10 w-28" aria-hidden>
      <polyline points={pts} fill="none" stroke="#0FA396" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Translates a legal requirement line, turning the product-specific parts into placeholders so one dictionary key covers every product. */
function legalText(t: TFunction, ar: boolean, text: string, product: { name: string; hs: string }) {
  let key = text.split(product.hs).join("{hs}");
  if (key.includes("HS {hs}")) key = key.split(product.name.toLowerCase()).join("{product}");
  if (key.startsWith(product.name)) key = `{Product}${key.slice(product.name.length)}`;
  const local = ar ? t(product.name) : product.name;
  return t(key, { hs: product.hs, product: ar ? local : product.name.toLowerCase(), Product: local });
}

function DetailsDialog({ open, onOpenChange, country, productId, industryName, dir }: { open: boolean; onOpenChange: (o: boolean) => void; country: TradeCountry; productId: string; industryName: string; dir: TradeDirection }) {
  const product = TRADE_INDUSTRIES.flatMap((i) => i.products).find((p) => p.id === productId)!;
  const partners = tradePartners(country, product, dir);
  const legal = legalRequirements(country, product, dir);
  const [tab, setTab] = useState<"partners" | "legal">("partners");
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const arrow = ar ? "←" : "→";
  const countryName = t(country.name);
  const roleIcon = (role: string) => (/forwarder/i.test(role) ? <Ship /> : /customs/i.test(role) ? <FileCheck2 /> : /inspection/i.test(role) ? <Scale /> : <Building2 />);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`${dir === "export" ? t("Export") : t("Import")} · ${t(product.name)}`}
        description={`${dir === "export" ? `${t("Egypt")} ${arrow} ${countryName}` : `${countryName} ${arrow} ${t("Egypt")}`} · ${industryName} · HS ${product.hs}`}
        className="max-h-[88vh] max-w-3xl overflow-y-auto"
      >
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1" role="tablist">
          {(["partners", "legal"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("relative h-10 rounded-xl text-sm font-semibold transition", tab === k ? "text-navy-900" : "text-muted hover:text-navy-900")}>
              {tab === k ? <motion.span layoutId="trade-tab" className="absolute inset-0 rounded-xl bg-white shadow-sm" /> : null}
              <span className="relative inline-flex items-center gap-1.5">{k === "partners" ? <><Users className="size-4" /> {t("Partners & contacts")}</> : <><Scale className="size-4" /> {t("Legal requirements")}</>}</span>
            </button>
          ))}
        </div>

        {tab === "partners" ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {partners.map((p, i) => (
              <motion.li key={p.name + p.role} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600 [&_svg]:size-5">{roleIcon(p.role)}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">{t(p.role)}</div>
                    <div className="truncate font-semibold text-navy-900">{p.name}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted"><MapPin className="size-3" /> {p.city} · <Star className="size-3 fill-amber-400 text-amber-400" /> {p.rating}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-[13px] text-navy-800">
                  <div className="flex items-center gap-2"><Users className="size-3.5 text-muted" /> {p.contact}</div>
                  <div className="flex items-center gap-2"><Mail className="size-3.5 text-muted" /> <span dir="ltr">{p.email}</span></div>
                  <div className="flex items-center gap-2"><Phone className="size-3.5 text-muted" /> <span dir="ltr">{p.phone}</span></div>
                </div>
                <button type="button" onClick={() => toast.success(t("Introduction requested with {name}", { name: p.name }), { description: t("Simulated — no message was sent.") })} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-canvas text-[13px] font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white">
                  {t("Request introduction")} <ArrowRight className="size-3.5 rtl:-scale-x-100" />
                </button>
              </motion.li>
            ))}
          </ul>
        ) : (
          <ol className="mt-4 space-y-2.5">
            {legal.map((l, i) => (
              <motion.li key={l.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex gap-3 rounded-2xl bg-canvas/80 p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-navy-900">{legalText(t, ar, l.title, product)}</div>
                  <p className="mt-0.5 text-[13px] text-navy-700">{legalText(t, ar, l.body, product)}</p>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted"><Leaf className="size-3" /> {t(l.authority)}</div>
                </div>
              </motion.li>
            ))}
            <li className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-800"><Clock className="size-3.5 shrink-0" /> {t("Illustrative guidance only — confirm current rules with the relevant authorities before shipping.")}</li>
          </ol>
        )}
        <p className="mt-4 text-center text-[11px] text-muted">{t("All companies, contacts and figures are fictional and generated for this simulation.")}</p>
      </DialogContent>
    </Dialog>
  );
}
