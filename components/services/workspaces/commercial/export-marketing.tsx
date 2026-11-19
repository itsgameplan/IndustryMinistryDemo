"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Check, CheckCircle2, Globe2, ImageIcon, Megaphone, Package, Plus, RefreshCw, ShoppingCart, Sparkles, Star, Store, Trash2, Wand2, X } from "lucide-react";
import { AIInsight, EditableText, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
import { Segmented, SimTag, Spinner, newId, productProfiles, usd, useSimulatedAI } from "./_shared";

type L = "en" | "ar" | "fr";
type Market = "alibaba" | "amazon" | "tradekey";
interface Listing { title: string; body: string; variant: number }
interface Item { id: string; name: string; nameAr: string; nameFr: string; hs: string; moq: number; unit: string; fobMin: number; fobMax: number; description: string; listings: Partial<Record<L, Listing>> }
interface Campaign { id: string; segment: string; channel: string; message: string; budget: string; status: "suggested" | "accepted" | "dismissed" }
interface MarketingData { items: Item[]; selectedId: string; lang: L; market: Market; campaigns: Campaign[]; round: number }

const LANGS: { value: L; label: string }[] = [{ value: "en", label: "EN" }, { value: "ar", label: "العربية" }, { value: "fr", label: "FR" }];
const HS_RE = /^\d{4}\.\d{2}$/;

// ---------------- Deterministic listing generator ----------------
function generateListing(item: Item, factory: Factory, lang: L, variant: number): Listing {
  const v = variant % 3;
  const price = `${usd(item.fobMin, 2)}–${usd(item.fobMax, 2)}`;
  const moq = `${item.moq.toLocaleString("en-US")} ${item.unit}`;
  const gov = factory.governorate || "Egypt";
  if (lang === "ar") {
    const name = item.nameAr || item.name;
    const titles = [`${name} — تصنيع مصري مباشر من المصنع`, `${name} للتصدير | ${factory.nameAr || factory.name}`, `مورد ${name} من ${gov}، مصر — طلبات الجملة`];
    const bodies = [
      `${item.description}\n\nالحد الأدنى للطلب: ${moq} · سعر FOB تقريبي: ${price} للوحدة.\nرمز النظام المنسق: ${item.hs}. نرحب بطلبات العلامات الخاصة والعينات.`,
      `مصنع ${factory.nameAr || factory.name} في ${gov} يقدم ${name} بجودة ثابتة للمشترين الدوليين.\n• ${item.description}\n• الحد الأدنى: ${moq}\n• السعر التقريبي: ${price} (FOB)\nتواصل معنا لطلب عرض سعر رسمي.`,
      `هل تبحث عن مورد موثوق لـ ${name}؟\n${item.description}\nكميات تبدأ من ${moq}، وأسعار FOB تقريبية ${price}. شحن من موانئ مصر إلى أوروبا والخليج وأفريقيا.`,
    ];
    return { title: titles[v], body: bodies[v], variant };
  }
  if (lang === "fr") {
    const name = item.nameFr || item.name;
    const titles = [`${name} – Fabricant égyptien, vente directe usine`, `${name} pour l'export | ${factory.name}`, `Fournisseur de ${name} – ${gov}, Égypte`];
    const bodies = [
      `${item.description}\n\nQuantité minimale : ${moq} · Prix FOB indicatif : ${price} par unité.\nCode SH : ${item.hs}. Marque privée et échantillons sur demande.`,
      `${factory.name}, basé à ${gov}, fournit ${name.toLowerCase()} de qualité constante aux acheteurs internationaux.\n• ${item.description}\n• MOQ : ${moq}\n• Prix indicatif : ${price} (FOB)\nContactez-nous pour un devis formel.`,
      `Vous cherchez un fournisseur fiable de ${name.toLowerCase()} ?\n${item.description}\nÀ partir de ${moq}, prix FOB indicatifs ${price}. Expédition depuis les ports égyptiens vers l'Europe, le Golfe et l'Afrique.`,
    ];
    return { title: titles[v], body: bodies[v], variant };
  }
  const titles = [`${item.name} – Direct from Egyptian Manufacturer`, `Export-Grade ${item.name} | ${factory.name}`, `${item.name} Supplier – ${gov}, Egypt – Wholesale & Private Label`];
  const bodies = [
    `${item.description}\n\nMOQ: ${moq} · Indicative FOB price: ${price} per unit.\nHS code ${item.hs}. Private label and samples available on request.`,
    `${factory.name} in ${gov} supplies ${item.name.toLowerCase()} with consistent quality to international buyers.\n• ${item.description}\n• MOQ: ${moq}\n• Indicative price: ${price} (FOB)\nRequest a formal quotation from our export team.`,
    `Looking for a dependable ${item.name.toLowerCase()} supplier?\n${item.description}\nOrders from ${moq}, indicative FOB ${price}. Shipping from Egyptian ports to Europe, the Gulf and Africa.`,
  ];
  return { title: titles[v], body: bodies[v], variant };
}

// ---------------- Campaign suggestions ----------------
type CampaignSeed = Omit<Campaign, "id" | "status">;
function campaignPool(factory: Factory): CampaignSeed[] {
  const key = seedKeyFor(factory);
  if (key === "al-noor")
    return [
      { segment: "Hospital & hotel linen distributors · Spain, Germany", channel: "B2B marketplace RFQs + LinkedIn sponsored posts", message: "Egyptian-cotton hospital linen, 75 °C wash-tested, private label from 2,000 pcs.", budget: "US$1.5–3K / month" },
      { segment: "Uniform & workwear contractors · Saudi Arabia, UAE", channel: "WhatsApp Business catalogue + Arabic search ads", message: "Ready-to-brand workwear sets with reflective options, 35–50 day lead time.", budget: "US$1–2K / month" },
      { segment: "EU private-label polo & T-shirt brands", channel: "Marketplace storefront + email outreach", message: "Piqué polos and jersey tees cut and sewn in Giza — short runs from 1,000 pcs.", budget: "US$0.8–1.5K / month" },
      { segment: "East African garment wholesalers · Kenya", channel: "Regional trade-fair follow-up + WhatsApp", message: "Cotton knit fabric by the kilo, reactive-dyed, mixed colours per container.", budget: "US$0.5–1K / month" },
      { segment: "GCC hospital procurement teams", channel: "Tender portal monitoring + Arabic landing page", message: "Colour-coded scrubs and bed linen built for industrial laundries.", budget: "US$1–2K / month" },
    ];
  if (key === "delta")
    return [
      { segment: "Aftermarket brake distributors · Morocco, Turkey", channel: "B2B marketplace storefront + regional trade-fair follow-up", message: "IATF 16949 brake discs & drums, OE-equivalent references, 30–45 day lead time.", budget: "US$3–6K / month" },
      { segment: "German Tier-2 machining buyers", channel: "LinkedIn account-based campaign + technical case studies", message: "CMM-inspected CNC housings at ±0.01 mm — PPAP level 3 available.", budget: "US$4–8K / month" },
      { segment: "GCC fleet & bus operators · Saudi Arabia", channel: "Arabic search ads + distributor webinars", message: "Heavy-duty brake drums and knuckles engineered for desert duty cycles.", budget: "US$2–4K / month" },
      { segment: "South African axle & driveline distributors", channel: "Marketplace RFQs + email nurture", message: "Induction-hardened precision shafts with splined options, from 1,000 pcs.", budget: "US$1.5–3K / month" },
      { segment: "North African bus body builders", channel: "Direct outreach + sample programme", message: "Steering knuckles with 100% crack testing and full traceability.", budget: "US$1–2K / month" },
    ];
  const products = productProfiles(factory);
  return [
    { segment: "Gulf importers & wholesalers · Saudi Arabia, UAE", channel: "Arabic search ads + WhatsApp Business catalogue", message: `${products[0].name} made in ${factory.governorate || "Egypt"} — reliable lead times and flexible MOQs.`, budget: "US$0.8–1.5K / month" },
    { segment: "B2B marketplace buyers · Europe", channel: "Marketplace storefront + RFQ responses", message: `Export-ready ${products[0].name.toLowerCase()} direct from an Egyptian manufacturer.`, budget: "US$1–2K / month" },
    { segment: "African distributors · Kenya, Nigeria", channel: "Trade-fair follow-up + email", message: `${products[products.length - 1].name} for growing African markets, shipped from Egyptian ports.`, budget: "US$0.5–1K / month" },
    { segment: "Local corporate buyers", channel: "LinkedIn posts + website enquiry form", message: `${factory.name}: ${factory.industry.toLowerCase()} with ${factory.employees} skilled staff.`, budget: "US$0.3–0.8K / month" },
  ];
}
const suggestions = (factory: Factory, round: number): Campaign[] => {
  const pool = campaignPool(factory);
  return [0, 1, 2].map((i) => {
    const c = pool[(round * 3 + i) % pool.length];
    return { ...c, id: `camp-${round}-${i}`, status: "suggested" as const };
  });
};

function seed(factory: Factory): MarketingData {
  const items: Item[] = productProfiles(factory).map((p, i) => {
    const base: Item = { id: `item-${p.key}`, name: p.name, nameAr: p.nameAr, nameFr: p.nameFr, hs: p.hs, moq: p.moq, unit: p.unit, fobMin: p.fobMin, fobMax: p.fobMax, description: p.spec, listings: {} };
    const listings: Item["listings"] = { en: generateListing(base, factory, "en", 0) };
    if (i === 0) {
      listings.ar = generateListing(base, factory, "ar", 0);
      listings.fr = generateListing(base, factory, "fr", 0);
    }
    return { ...base, listings };
  });
  return { items, selectedId: items[0]?.id ?? "", lang: "en", market: "alibaba", campaigns: suggestions(factory, 0), round: 0 };
}

// ---------------- Workspace ----------------
export default function ExportMarketingWorkspace({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<MarketingData>(service.id, seed);
  const ai = useSimulatedAI();
  const reduce = useReducedMotion();
  const item = data.items.find((i) => i.id === data.selectedId) ?? data.items[0];
  const listing = item?.listings[data.lang];
  const rtl = data.lang === "ar";
  const t = useT();
  const { locale } = useLocale();
  const displayName = (i: Item) => (locale === "ar" ? i.nameAr || i.name : i.name);

  const patchItem = (id: string, patch: Partial<Item>) => setData((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const generate = (target: Item, lang: L) =>
    ai.run(`gen-${target.id}-${lang}`, () => {
      setData((prev) => ({
        ...prev,
        items: prev.items.map((i) => {
          if (i.id !== target.id) return i;
          const prevVariant = i.listings[lang]?.variant;
          return { ...i, listings: { ...i.listings, [lang]: generateListing(i, factory, lang, prevVariant === undefined ? 0 : prevVariant + 1) } };
        }),
      }));
      toast.success(t("{lang} listing ready", { lang: LANGS.find((l) => l.value === lang)?.label ?? lang }), { description: t("Draft only — translations need human review before publication.") });
    }, 1000);
  const addProduct = () => {
    const id = newId("item");
    setData((prev) => ({ ...prev, selectedId: id, items: [...prev.items, { id, name: "New product", nameAr: "منتج جديد", nameFr: "Nouveau produit", hs: "", moq: 500, unit: "pcs", fobMin: 1, fobMax: 2, description: "Describe material, specification and finish.", listings: {} }] }));
  };
  const removeProduct = (id: string) => setData((prev) => {
    const items = prev.items.filter((i) => i.id !== id);
    return { ...prev, items, selectedId: prev.selectedId === id ? items[0]?.id ?? "" : prev.selectedId };
  });
  const setCampaign = (id: string, status: Campaign["status"]) => setData((prev) => ({ ...prev, campaigns: prev.campaigns.map((c) => (c.id === id ? { ...c, status } : c)) }));
  const moreCampaigns = () =>
    ai.run("campaigns", () => {
      setData((prev) => {
        const round = prev.round + 1;
        const existing = new Set(prev.campaigns.map((c) => c.segment));
        const fresh = suggestions(factory, round).filter((c) => !existing.has(c.segment));
        return { ...prev, round, campaigns: [...prev.campaigns.filter((c) => c.status !== "dismissed"), ...fresh] };
      });
    }, 1100);

  const generatedCount = data.items.reduce((a, i) => a + Object.keys(i.listings).length, 0);
  const accepted = data.campaigns.filter((c) => c.status === "accepted");

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={t("Marketplace previews are generic look-alikes — nothing is published to Alibaba, Amazon Business, TradeKey or any other platform.")}>
      {/* Catalogue strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-navy-900">{t("Export product catalogue")}</h2>
          <p className="text-sm text-muted">{t("{count} products · {done} of {total} language listings drafted", { count: data.items.length, done: generatedCount, total: data.items.length * 3 })}</p>
        </div>
        <Button variant="outline" size="sm" onClick={addProduct}><Plus /> {t("Add product")}</Button>
      </div>
      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
        {data.items.map((i) => {
          const active = i.id === item?.id;
          return (
            <button key={i.id} type="button" aria-pressed={active} onClick={() => setData((prev) => ({ ...prev, selectedId: i.id }))} className={cn("w-56 shrink-0 rounded-2xl border bg-white p-3 text-start shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", active ? "border-teal-400 ring-2 ring-teal-100" : "border-line hover:border-navy-500/30")}>
              <div className="flex items-center gap-2.5">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", active ? "bg-teal-500 text-white" : "bg-canvas text-navy-600")}><Package className="size-4" /></span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy-900">{displayName(i)}</div>
                  <div className="text-[11px] text-muted">{t("HS {hs} · MOQ {moq}", { hs: i.hs || "—", moq: i.moq.toLocaleString("en-US") })}</div>
                </div>
              </div>
              <div className="mt-2.5 flex gap-1">
                {LANGS.map((l) => <span key={l.value} className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", i.listings[l.value] ? "bg-emerald-50 text-emerald-700" : "bg-navy-900/5 text-muted")}>{l.value.toUpperCase()}</span>)}
              </div>
            </button>
          );
        })}
      </div>

      {item ? (
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Editor */}
          <Panel title={t("Product details")} description={t("Feeds every listing and marketplace preview")} actions={data.items.length > 1 ? <Button variant="ghost" size="sm" onClick={() => removeProduct(item.id)} aria-label={t("Remove {name}", { name: displayName(item) })}><Trash2 /></Button> : null}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label htmlFor="em-name">{t("Product name (EN)")}</Label><Input id="em-name" value={item.name} onChange={(e) => patchItem(item.id, { name: e.target.value })} /></div>
              <div><Label htmlFor="em-name-ar">{t("Name (AR)")}</Label><Input id="em-name-ar" dir="rtl" value={item.nameAr} onChange={(e) => patchItem(item.id, { nameAr: e.target.value })} /></div>
              <div><Label htmlFor="em-name-fr">{t("Name (FR)")}</Label><Input id="em-name-fr" value={item.nameFr} onChange={(e) => patchItem(item.id, { nameFr: e.target.value })} /></div>
              <div>
                <Label htmlFor="em-hs">{t("HS code")}</Label>
                <Input id="em-hs" value={item.hs} onChange={(e) => patchItem(item.id, { hs: e.target.value })} placeholder={t("e.g. 6105.10")} aria-describedby="em-hs-hint" />
                <p id="em-hs-hint" className="mt-1 text-[11px]">{HS_RE.test(item.hs) ? <span className="text-emerald-700">{t("Format looks valid (6-digit)")}</span> : <span className="text-amber-700">{t("Use the 6-digit format ####.## — confirm with your customs broker")}</span>}</p>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                <div><Label htmlFor="em-moq">{t("MOQ")}</Label><Input id="em-moq" inputMode="numeric" value={String(item.moq)} onChange={(e) => patchItem(item.id, { moq: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} /></div>
                <div><Label htmlFor="em-unit">{t("Unit")}</Label><Input id="em-unit" value={item.unit} onChange={(e) => patchItem(item.id, { unit: e.target.value })} /></div>
              </div>
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-600">{t("Indicative FOB price range (USD / {unit})", { unit: item.unit })}</span>
                <div className="flex items-center gap-2">
                  <label htmlFor="em-min" className="sr-only">{t("Minimum FOB price")}</label>
                  <Input id="em-min" inputMode="decimal" value={String(item.fobMin)} onChange={(e) => patchItem(item.id, { fobMin: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
                  <span className="text-muted">–</span>
                  <label htmlFor="em-max" className="sr-only">{t("Maximum FOB price")}</label>
                  <Input id="em-max" inputMode="decimal" value={String(item.fobMax)} onChange={(e) => patchItem(item.id, { fobMax: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
                </div>
                {item.fobMax < item.fobMin ? <p className="mt-1 text-[11px] text-red-600">{t("Maximum is below minimum.")}</p> : null}
              </div>
              <div className="sm:col-span-2"><Label htmlFor="em-desc">{t("Description / specification")}</Label><Textarea id="em-desc" rows={3} value={item.description} onChange={(e) => patchItem(item.id, { description: e.target.value })} /></div>
            </div>
          </Panel>

          {/* Listing writer */}
          <Panel
            title={t("Multilingual listing")}
            description={t("AI draft · click text to edit")}
            actions={<Segmented<L> size="sm" label={t("Listing language")} value={data.lang} onChange={(lang) => setData((prev) => ({ ...prev, lang }))} options={LANGS} />}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={`${item.id}-${data.lang}-${listing?.variant ?? "none"}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.18 }} dir={rtl ? "rtl" : "ltr"} lang={data.lang}>
                {listing ? (
                  <div className="space-y-2">
                    <EditableText ariaLabel={t("listing title")} value={listing.title} onChange={(title) => patchItem(item.id, { listings: { ...item.listings, [data.lang]: { ...listing, title } } })} className={cn("text-base font-semibold text-navy-900", rtl && "text-right")} />
                    <EditableText multiline ariaLabel={t("listing body")} value={listing.body} onChange={(body) => patchItem(item.id, { listings: { ...item.listings, [data.lang]: { ...listing, body } } })} className={cn("text-sm leading-relaxed text-navy-700", rtl && "text-right")} />
                  </div>
                ) : (
                  <div className="grid place-items-center rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted" dir={locale === "ar" ? "rtl" : "ltr"}>{t("No {lang} listing yet for this product.", { lang: LANGS.find((l) => l.value === data.lang)?.label ?? data.lang })}</div>
                )}
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <span className="text-xs text-muted">{listing ? t("Variant {n} · needs human review", { n: listing.variant + 1 }) : t("Generate a draft from the product details")}</span>
              <Button variant={listing ? "outline" : "accent"} size="sm" onClick={() => generate(item, data.lang)} disabled={ai.busy === `gen-${item.id}-${data.lang}`}>
                {ai.busy === `gen-${item.id}-${data.lang}` ? <Spinner /> : listing ? <RefreshCw /> : <Wand2 />} {listing ? t("Regenerate") : t("Generate listing")}
              </Button>
            </div>
          </Panel>
        </div>
      ) : null}

      {/* Marketplace previews */}
      {item ? (
        <section className="mt-6 rounded-3xl border border-line bg-canvas/60 p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900"><Store className="size-4 text-teal-600" /> {t("Marketplace listing previews")}</h2>
              <p className="text-xs text-muted">{t("Generic look-alike layouts to check fit — no real logos, nothing published.")}</p>
            </div>
            <Segmented<Market> label={t("Marketplace style")} value={data.market} onChange={(market) => setData((prev) => ({ ...prev, market }))} options={[{ value: "alibaba", label: t("Alibaba-style") }, { value: "amazon", label: t("Amazon Business-style") }, { value: "tradekey", label: t("TradeKey-style") }]} />
          </div>
          <div className="mt-4">
            {data.market === "alibaba" ? <AlibabaPreview item={item} listing={listing} factory={factory} lang={data.lang} /> : null}
            {data.market === "amazon" ? <AmazonPreview item={item} listing={listing} factory={factory} lang={data.lang} /> : null}
            {data.market === "tradekey" ? <TradeKeyPreview item={item} listing={listing} factory={factory} lang={data.lang} /> : null}
          </div>
        </section>
      ) : null}

      {/* Campaigns */}
      <section className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-navy-900"><Megaphone className="size-4 text-teal-600" /> {t("AI campaign suggestions")}</h2>
            <p className="text-sm text-muted">{t("{count} accepted · budget bands are illustrative, not quotations", { count: accepted.length })}</p>
          </div>
          <Button variant="subtle" size="sm" onClick={moreCampaigns} disabled={ai.busy === "campaigns"}>{ai.busy === "campaigns" ? <Spinner /> : <Sparkles />} {t("Suggest more")}</Button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {data.campaigns.filter((c) => c.status !== "dismissed").map((c) => (
              <motion.article key={c.id} layout={!reduce} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }} className={cn("flex flex-col rounded-2xl border bg-white p-4 shadow-card", c.status === "accepted" ? "border-emerald-300" : "border-line")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-navy-900">{t(c.segment)}</div>
                  {c.status === "accepted" ? <StatusPill tone="good"><CheckCircle2 /> {t("Accepted")}</StatusPill> : <StatusPill tone="info"><Sparkles /> {t("Suggested")}</StatusPill>}
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div><dt className="font-semibold uppercase tracking-wider text-muted">{t("Channel")}</dt><dd className="mt-0.5 text-navy-800">{t(c.channel)}</dd></div>
                  <div><dt className="font-semibold uppercase tracking-wider text-muted">{t("Message")}</dt><dd className="mt-0.5 italic text-navy-800">“{t(c.message)}”</dd></div>
                  <div><dt className="font-semibold uppercase tracking-wider text-muted">{t("Budget band")}</dt><dd className="mt-0.5 flex items-center gap-2 text-navy-800">{t(c.budget)} <SimTag>{t("Illustrative")}</SimTag></dd></div>
                </dl>
                <div className="mt-auto flex gap-2 pt-4">
                  {c.status === "accepted" ? (
                    <Button variant="ghost" size="sm" onClick={() => setCampaign(c.id, "suggested")}>{t("Undo")}</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="accent" onClick={() => { setCampaign(c.id, "accepted"); toast.success(t("Campaign added to plan")); }}><Check /> {t("Accept")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setCampaign(c.id, "dismissed")}><X /> {t("Dismiss")}</Button>
                    </>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
        <AIInsight className="mt-4" title={t("Campaign strategist")}>
          {accepted.length
            ? t("Your plan targets {segments}. Launch with the listing languages buyers read — {status} — and measure qualified enquiries, not clicks.", { segments: accepted.map((c) => t(c.segment).split("·")[0].trim()).join(locale === "ar" ? "، " : ", "), status: item ? t("{name} has {count}/3 languages drafted", { name: displayName(item), count: Object.keys(item.listings).length }) : t("draft listings first") })
            : t("Accept one or two campaigns to build a focused first-quarter plan. Starting narrow (one segment, one channel) makes enquiry quality measurable.")}
        </AIInsight>
      </section>
    </WorkspaceFrame>
  );
}

// ---------------- Marketplace look-alikes ----------------
interface PreviewProps { item: Item; listing?: Listing; factory: Factory; lang: L }
const Ribbon = () => {
  const t = useT();
  return <div className="absolute end-3 top-3 z-10 rounded-full bg-navy-950/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">{t("Simulated preview — not published")}</div>;
};
const titleOf = (p: PreviewProps) => p.listing?.title ?? p.item.name;
const ImagePlaceholder = ({ className }: { className?: string }) => {
  const t = useT();
  return (
    <div className={cn("grid place-items-center bg-gradient-to-br from-navy-900/[0.04] to-navy-900/[0.10] text-navy-500/50", className)}>
      <div className="flex flex-col items-center gap-1 text-[11px]"><ImageIcon className="size-8" /> {t("Product photo")}</div>
    </div>
  );
};

function AlibabaPreview(p: PreviewProps) {
  const { item, factory, lang } = p;
  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-orange-200 bg-white shadow-card">
      <Ribbon />
      <div className="flex items-center gap-2 bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] px-4 py-2 text-xs font-semibold text-white"><Globe2 className="size-3.5" /> Global B2B wholesale marketplace</div>
      <div className="grid gap-4 p-4 sm:grid-cols-[200px_minmax(0,1fr)]">
        <ImagePlaceholder className="aspect-square rounded-lg" />
        <div className="min-w-0" dir={lang === "ar" ? "rtl" : "ltr"}>
          <h3 className="text-base font-semibold leading-snug text-navy-900">{titleOf(p)}</h3>
          <div className="mt-3 rounded-lg bg-orange-50 p-3" dir="ltr">
            <div className="text-xl font-bold text-[#E85A00]">{usd(item.fobMin, 2)} – {usd(item.fobMax, 2)}<span className="text-xs font-medium text-navy-600"> / {item.unit}</span></div>
            <div className="mt-0.5 text-xs text-navy-700">Min. order: {item.moq.toLocaleString("en-US")} {item.unit}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]" dir="ltr">
            <span className="rounded border border-orange-200 px-1.5 py-0.5 text-orange-700">Customizable</span>
            <span className="rounded border border-line px-1.5 py-0.5 text-navy-700">HS {item.hs || "—"}</span>
            <span className="rounded border border-line px-1.5 py-0.5 text-navy-700">FOB Egypt</span>
          </div>
          <div className="mt-3 text-xs text-muted" dir="ltr">{factory.name} · EG · Manufacturer · since {factory.founded}</div>
          <div className="mt-4 flex gap-2" dir="ltr">
            <button type="button" disabled className="h-9 rounded-full bg-[#FF6A00] px-4 text-xs font-semibold text-white opacity-60">Contact supplier</button>
            <button type="button" disabled className="h-9 rounded-full border border-[#FF6A00] px-4 text-xs font-semibold text-[#FF6A00] opacity-60">Start order</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AmazonPreview(p: PreviewProps) {
  const { item, factory, lang } = p;
  const tiers = [1, 3, 10].map((m, i) => ({ qty: item.moq * m, price: +(item.fobMax - ((item.fobMax - item.fobMin) * i) / 2).toFixed(2) }));
  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <Ribbon />
      <div className="flex items-center gap-2 bg-[#232F3E] px-4 py-2 text-xs font-semibold text-white"><ShoppingCart className="size-3.5" /> Business procurement store <span className="ml-1 rounded bg-[#37475A] px-1.5 py-0.5 text-[10px] font-medium text-white/80">for registered businesses</span></div>
      <div className="grid gap-5 p-4 md:grid-cols-[180px_minmax(0,1fr)_200px]">
        <ImagePlaceholder className="aspect-square rounded" />
        <div className="min-w-0" dir={lang === "ar" ? "rtl" : "ltr"}>
          <h3 className="text-[15px] leading-snug text-[#0F1111]">{titleOf(p)}</h3>
          <div className="mt-1 text-xs text-[#007185]">Visit the {factory.name} store</div>
          <div className="mt-1 flex items-center gap-0.5 text-[#DE7921]" aria-label="No ratings yet">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-3.5" />)}<span className="ml-1 text-xs text-muted">No ratings yet</span></div>
          <p className="mt-3 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-[#0F1111]">{p.listing?.body ?? item.description}</p>
        </div>
        <div className="rounded-lg border border-line p-3 text-xs" dir="ltr">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#565959]">Business price</div>
          <div className="mt-0.5 text-2xl font-medium text-[#0F1111]">{usd(item.fobMax, 2)}</div>
          <table className="mt-2 w-full">
            <caption className="mb-1 text-left text-[11px] font-semibold text-[#0F1111]">Quantity discounts</caption>
            <tbody>{tiers.map((t) => <tr key={t.qty} className="border-t border-line"><td className="py-1 text-[#565959]">{t.qty.toLocaleString("en-US")}+</td><td className="py-1 text-right font-medium">{usd(t.price, 2)}</td></tr>)}</tbody>
          </table>
          <div className="mt-2 text-[11px] text-[#565959]">Ships from Egypt · lead time on request</div>
          <button type="button" disabled className="mt-3 h-8 w-full rounded-full bg-[#FFD814] text-xs font-medium text-[#0F1111] opacity-60">Add to cart</button>
          <button type="button" disabled className="mt-1.5 h-8 w-full rounded-full bg-[#FFA41C] text-xs font-medium text-[#0F1111] opacity-60">Request quote</button>
        </div>
      </div>
    </div>
  );
}

function TradeKeyPreview(p: PreviewProps) {
  const { item, factory, lang } = p;
  const rows: [string, string][] = [["Product", item.name], ["Origin", `Egypt (${factory.governorate})`], ["HS code", item.hs || "—"], ["Min. order", `${item.moq.toLocaleString("en-US")} ${item.unit}`], ["FOB price", `${usd(item.fobMin, 2)} – ${usd(item.fobMax, 2)}`], ["Payment terms", "L/C, T/T"], ["Port", "Alexandria / Sokhna"]];
  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden rounded-md border-2 border-[#1B7F3B]/30 bg-white shadow-card">
      <Ribbon />
      <div className="flex items-center gap-2 bg-[#1B7F3B] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"><Store className="size-3.5" /> B2B trade leads directory · Selling lead</div>
      <div className="p-4">
        <h3 className="text-base font-bold text-[#145C2B]" dir={lang === "ar" ? "rtl" : "ltr"}>{titleOf(p)}</h3>
        <div className="mt-1 text-xs text-muted">Posted by {factory.name} · Manufacturer / Exporter</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] border border-line text-xs">
              <tbody>{rows.map(([k, v]) => <tr key={k} className="border-b border-line odd:bg-[#F3FAF5]"><th scope="row" className="w-32 px-2 py-1.5 text-left font-semibold text-navy-700">{k}</th><td className="px-2 py-1.5 text-navy-900">{v}</td></tr>)}</tbody>
            </table>
          </div>
          <ImagePlaceholder className="h-32 rounded sm:h-auto" />
        </div>
        <p className="mt-3 line-clamp-3 whitespace-pre-line text-xs text-navy-700" dir={lang === "ar" ? "rtl" : "ltr"}>{p.listing?.body ?? item.description}</p>
        <button type="button" disabled className="mt-3 h-9 rounded bg-[#F28C28] px-4 text-xs font-bold uppercase text-white opacity-60">Send inquiry</button>
      </div>
    </div>
  );
}
