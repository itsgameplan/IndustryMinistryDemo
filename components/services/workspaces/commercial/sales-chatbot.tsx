"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { ArrowUpRight, BadgeCheck, Bot, Calculator, CheckCircle2, Clock3, Languages, Package, Send, ShieldAlert, Smartphone, Truck, UserPlus, Users } from "lucide-react";
import { AIInsight, Panel, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input, Label } from "@/components/ui";
import { useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
import { crmSeed, type CrmData, type Deal } from "./_crm";
import { MiniBar, Select, SimTag, newId, productProfiles, usd, type ProductProfile } from "./_shared";

type Lang = "en" | "ar";
type Intent = "product" | "quote" | "moq" | "certs" | "delivery" | "handoff";

interface QuoteCard { productKey: string; qty: number; unitMin: number; unitMax: number; belowMoq: boolean }
interface Msg { id: string; from: "bot" | "user"; kind: "greet" | "ask" | "answer" | "quote" | "free"; intent?: Intent; quote?: QuoteCard; text?: string }
interface Lead { id: string; name: string; company: string; country: string; product: string; qty: number; budget: number; need: number; timeline: number; score: number; value: number; sentToCrm: boolean }
interface ChatData { lang: Lang; messages: Msg[]; leads: Lead[]; lastQuote?: QuoteCard }

const MAX_MESSAGES = 40;

function seed(factory: Factory): ChatData {
  const p = productProfiles(factory)[0];
  return {
    lang: "en",
    messages: [
      { id: "m0", from: "bot", kind: "greet" },
      { id: "m1", from: "user", kind: "ask", intent: "moq" },
      { id: "m2", from: "bot", kind: "answer", intent: "moq" },
    ],
    leads: [
      { id: "lead-seed-1", name: factory.id === "delta" ? "Youssef Benali" : "Lucía Romero", company: factory.id === "delta" ? "Atlas Auto Parts SARL" : factory.id === "al-noor" ? "Iberia Textil Trading S.L." : "Gulf Wholesale Partners", country: factory.id === "delta" ? "Morocco" : factory.id === "al-noor" ? "Spain" : "UAE", product: p.name, qty: p.moq * 3, budget: 2, need: 3, timeline: 2, score: scoreLead(2, 3, 2), value: Math.round(p.moq * 3 * (p.fobMin + p.fobMax) / 2), sentToCrm: false },
    ],
  };
}

// ---------------- Scripted knowledge ----------------
const BUDGET = [{ en: "Unknown", ar: "غير معروف" }, { en: "Below MOQ value", ar: "أقل من قيمة الحد الأدنى" }, { en: "Fits indicative range", ar: "ضمن النطاق التقريبي" }, { en: "Approved budget", ar: "ميزانية معتمدة" }];
const NEED = [{ en: "Browsing", ar: "استكشاف" }, { en: "General interest", ar: "اهتمام عام" }, { en: "Specific product", ar: "منتج محدد" }, { en: "Spec + quantity defined", ar: "مواصفات وكمية محددة" }];
const TIMELINE = [{ en: "No date", ar: "بدون موعد" }, { en: "6+ months", ar: "أكثر من 6 أشهر" }, { en: "1–6 months", ar: "1–6 أشهر" }, { en: "Within 1 month", ar: "خلال شهر" }];
function scoreLead(budget: number, need: number, timeline: number) {
  return Math.round(10 + budget * 11 + need * 10 + timeline * 9);
}
const band = (s: number) => (s >= 70 ? { label: "Hot", tone: "good" as const } : s >= 45 ? { label: "Warm", tone: "warn" as const } : { label: "Cold", tone: "neutral" as const });

const CHIPS: { intent: Intent; en: string; ar: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { intent: "product", en: "Product enquiry", ar: "استفسار عن المنتجات", icon: Package },
  { intent: "quote", en: "Price / quotation", ar: "السعر / عرض سعر", icon: Calculator },
  { intent: "moq", en: "MOQ & lead time", ar: "الحد الأدنى ومدة التوريد", icon: Clock3 },
  { intent: "certs", en: "Certifications", ar: "الشهادات", icon: BadgeCheck },
  { intent: "delivery", en: "Delivery", ar: "التوصيل والشحن", icon: Truck },
];

function deliveryInfo(factory: Factory) {
  if (factory.id === "delta") return { en: "FCA 10th of Ramadan or FOB Ain Sokhna / Damietta. Local OEMs receive scheduled weekly deliveries. Sea transit to Morocco or Turkey is typically 5–9 days (indicative).", ar: "تسليم FCA العاشر من رمضان أو FOB العين السخنة / دمياط. العملاء المحليون يحصلون على توريد أسبوعي مجدول. الشحن البحري إلى المغرب أو تركيا عادة 5–9 أيام (تقريبي)." };
  if (factory.id === "al-noor") return { en: "EXW Abu Rawash (Giza) or FOB Alexandria. Sea transit to Spain is typically 7–12 days and to Jeddah 4–7 days (indicative). Mixed-SKU containers are possible above 2 × MOQ.", ar: "تسليم EXW أبو رواش (الجيزة) أو FOB الإسكندرية. الشحن البحري إلى إسبانيا عادة 7–12 يوماً وإلى جدة 4–7 أيام (تقريبي). يمكن تجميع أصناف مختلفة في حاوية واحدة فوق ضعف الحد الأدنى." };
  return { en: `EXW ${factory.governorate || "factory"} or FOB Alexandria. Transit times depend on destination and are confirmed by the sales team.`, ar: `تسليم EXW ${factory.governorate || "المصنع"} أو FOB الإسكندرية. مدة الشحن حسب الوجهة ويؤكدها فريق المبيعات.` };
}

function botText(msg: Msg, lang: Lang, factory: Factory, products: ProductProfile[]): string {
  const ar = lang === "ar";
  const pname = (p: ProductProfile) => (ar ? p.nameAr : p.name);
  if (msg.kind === "greet")
    return ar
      ? `مرحباً! أنا المساعد الافتراضي للمبيعات في ${factory.nameAr || factory.name}. يمكنني الإجابة عن المنتجات، والحد الأدنى للطلب، والشهادات، والتوصيل، وإعداد عرض سعر تقريبي.`
      : `Hello! I'm the virtual sales assistant for ${factory.name}. I can answer questions on products, MOQs, certifications and delivery, and prepare an indicative quotation.`;
  switch (msg.intent) {
    case "product":
      return (ar ? "منتجاتنا الرئيسية:\n" : "Our main products:\n") + products.map((p) => `• ${pname(p)} — ${ar ? `HS ${p.hs}` : p.spec}`).join("\n");
    case "moq":
      return (ar ? "الحد الأدنى للطلب ومدة التوريد:\n" : "Minimum order and lead time:\n") + products.map((p) => `• ${pname(p)}: ${p.moq.toLocaleString("en-US")} ${ar ? p.unitAr : p.unit} · ${p.leadDays[0]}–${p.leadDays[1]} ${ar ? "يوماً" : "days"}`).join("\n");
    case "certs": {
      const certs = Array.from(new Set(products.flatMap((p) => p.certs)));
      return (ar ? "الشهادات والتوثيق (يُرجى طلب النسخ من فريق المبيعات):\n" : "Certifications & documentation (copies available from the sales team):\n") + certs.map((c) => `• ${c}`).join("\n");
    }
    case "delivery":
      return deliveryInfo(factory)[lang];
    case "quote":
      return ar ? "بكل سرور. اختر المنتج والكمية أدناه وسأحسب نطاق سعر تقريبي (FOB، بالدولار الأمريكي)." : "Happy to help. Choose the product and quantity below and I'll calculate an indicative FOB price range in USD.";
    default:
      return ar ? "شكراً لسؤالك. سأحوّل هذا الاستفسار إلى فريق المبيعات وسيتواصلون معك. هل ترغب في ترك بياناتك؟" : "Thanks — I'll pass that question to the sales team so a person can follow up. Would you like to leave your details?";
  }
}

const userText = (intent: Intent, lang: Lang) => {
  const c = CHIPS.find((x) => x.intent === intent);
  return c ? c[lang] : "";
};

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/(price|quot|cost|سعر|عرض|تكلفة)/.test(t)) return "quote";
  if (/(moq|minimum|lead|how many|الحد|كمية|مدة)/.test(t)) return "moq";
  if (/(cert|iso|iatf|oeko|audit|شهاد|ايزو|أيزو)/.test(t)) return "certs";
  if (/(deliver|ship|freight|incoterm|fob|port|شحن|توصيل|ميناء)/.test(t)) return "delivery";
  if (/(product|catalog|range|spec|منتج|كتالوج|مواصفات)/.test(t)) return "product";
  return "handoff";
}

function quoteFor(p: ProductProfile, qty: number): QuoteCard {
  const ratio = Math.min(1, Math.max(0, (qty / p.moq - 1) / 9)); // 1×MOQ → 0, 10×MOQ → 1
  const spread = p.fobMax - p.fobMin;
  const center = p.fobMax - spread * (0.25 + 0.6 * ratio);
  const belowMoq = qty < p.moq;
  const unitMin = +(Math.max(p.fobMin, center - spread * 0.12) * (belowMoq ? 1.15 : 1)).toFixed(2);
  const unitMax = +(Math.min(p.fobMax, center + spread * 0.12) * (belowMoq ? 1.15 : 1)).toFixed(2);
  return { productKey: p.key, qty, unitMin, unitMax, belowMoq };
}

// ---------------- Workspace ----------------
export default function SalesChatbotWorkspace({ service }: WorkspaceProps) {
  const { factory, factoryId, data, setData, reset } = useServiceWorkspace<ChatData>(service.id, seed);
  const router = useRouter();
  const reduce = useReducedMotion();
  const products = productProfiles(factory);
  const lang = data.lang;
  const ar = lang === "ar";
  const t = useT();
  const { locale } = useLocale();
  const uiAr = locale === "ar";
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [quoteProduct, setQuoteProduct] = useState(products[0]?.key ?? "");
  const [quoteQty, setQuoteQty] = useState(String((products[0]?.moq ?? 100) * 2));
  const timers = useRef<number[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [data.messages.length, typing, reduce]);

  const push = (...msgs: Msg[]) => setData((prev) => ({ ...prev, messages: [...prev.messages, ...msgs].slice(-MAX_MESSAGES) }));
  const botReply = (msg: Msg, extra?: (prev: ChatData) => Partial<ChatData>) => {
    setTyping(true);
    const t = window.setTimeout(() => {
      setTyping(false);
      setData((prev) => ({ ...prev, ...(extra ? extra(prev) : {}), messages: [...prev.messages, msg].slice(-MAX_MESSAGES) }));
    }, 650 + Math.min(500, (msg.intent === "product" ? 4 : 2) * 120));
    timers.current.push(t);
  };

  const ask = (intent: Intent) => {
    if (typing) return;
    push({ id: newId("m"), from: "user", kind: "ask", intent });
    botReply({ id: newId("m"), from: "bot", kind: "answer", intent });
  };
  const sendFree = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing) return;
    setDraft("");
    push({ id: newId("m"), from: "user", kind: "free", text });
    botReply({ id: newId("m"), from: "bot", kind: "answer", intent: detectIntent(text) });
  };
  const requestQuote = () => {
    const p = products.find((x) => x.key === quoteProduct) ?? products[0];
    const qty = Math.max(1, Math.round(Number(quoteQty) || 0));
    if (!p || typing) return;
    const q = quoteFor(p, qty);
    push({ id: newId("m"), from: "user", kind: "free", text: ar ? `أحتاج ${qty.toLocaleString("en-US")} ${p.unitAr} من ${p.nameAr}` : `I need ${qty.toLocaleString("en-US")} ${p.unit} of ${p.name}` });
    botReply({ id: newId("m"), from: "bot", kind: "quote", quote: q }, () => ({ lastQuote: q }));
  };

  const lastBot = [...data.messages].reverse().find((m) => m.from === "bot");
  const showQuoteForm = lastBot?.intent === "quote" && lastBot.kind === "answer" && !typing;

  // Lead qualification (form state is local; captured leads persist)
  const lastQuoteProduct = products.find((p) => p.key === data.lastQuote?.productKey);
  const [lead, setLead] = useState({ name: "", company: "", country: "", budget: 2, need: 2, timeline: 2 });
  const score = scoreLead(lead.budget, lead.need, lead.timeline);
  const b = band(score);

  const capture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.company.trim()) return;
    const p = lastQuoteProduct ?? products[0];
    const qty = data.lastQuote?.qty ?? p.moq;
    const unit = data.lastQuote ? (data.lastQuote.unitMin + data.lastQuote.unitMax) / 2 : (p.fobMin + p.fobMax) / 2;
    const l: Lead = { id: newId("lead"), name: lead.name.trim() || "—", company: lead.company.trim(), country: lead.country.trim() || "—", product: p.name, qty, budget: lead.budget, need: lead.need, timeline: lead.timeline, score, value: Math.round(qty * unit), sentToCrm: false };
    setData((prev) => ({ ...prev, leads: [l, ...prev.leads].slice(0, 20) }));
    setLead({ name: "", company: "", country: "", budget: 2, need: 2, timeline: 2 });
    toast.success(t("Lead captured: {company}", { company: l.company }), { description: t("{band} lead · score {score}/100", { band: t(b.label), score }) });
  };

  const sendToCrm = (l: Lead) => {
    const st = useJahez.getState();
    const current = (st.factories[factoryId]?.serviceData?.["crm-pipeline"] as CrmData | undefined) ?? crmSeed(factory);
    const deal: Deal = {
      id: newId("deal"),
      company: l.company,
      country: l.country,
      contact: l.name,
      product: l.product,
      value: l.value,
      stage: l.score >= 70 ? "qualified" : "new",
      score: l.score,
      idleDays: 0,
      closeIn: l.timeline === 3 ? 0 : l.timeline === 2 ? 2 : 5,
      source: "Sales chatbot",
      note: `Captured by the virtual sales assistant · ${l.qty.toLocaleString("en-US")} units`,
    };
    st.setServiceData(factoryId, "crm-pipeline", { ...current, deals: [deal, ...current.deals], highlighted: [deal.id, ...(current.highlighted ?? [])].slice(0, 10) } satisfies CrmData);
    setData((prev) => ({ ...prev, leads: prev.leads.map((x) => (x.id === l.id ? { ...x, sentToCrm: true } : x)) }));
    toast.success(t("{company} sent to CRM", { company: l.company }), { description: t("Added to the {stage} stage of your pipeline.", { stage: t(deal.stage === "qualified" ? "Qualified" : "New") }), action: { label: t("Open CRM"), onClick: () => router.push("/services/crm-pipeline") } });
  };

  const avatar = factory.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={t("No real WhatsApp or website connection — conversations are scripted from demo product data.")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Phone */}
        <div className="mx-auto w-full max-w-[400px]">
          <div className="rounded-[2.2rem] bg-navy-950 p-2.5 shadow-lift">
            <div className="overflow-hidden rounded-[1.8rem] bg-[#F3EFE8]">
              <div className="flex items-center gap-3 bg-navy-900 px-4 pb-3 pt-4 text-white">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-500 text-xs font-bold">{avatar}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{ar ? factory.nameAr || factory.name : factory.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/70"><span className="size-1.5 rounded-full bg-emerald-400" aria-hidden /> {ar ? "مساعد المبيعات · متصل (محاكاة)" : "Sales assistant · online (simulated)"}</div>
                </div>
                <div role="group" aria-label={t("Chat language")} className="flex rounded-full bg-white/10 p-0.5 text-[11px] font-semibold">
                  {(["en", "ar"] as const).map((l) => (
                    <button key={l} type="button" aria-pressed={lang === l} onClick={() => setData((prev) => ({ ...prev, lang: l }))} className={cn("rounded-full px-2.5 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300", lang === l ? "bg-white text-navy-900" : "text-white/80 hover:text-white")}>
                      {l === "en" ? "EN" : "عربي"}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={scroller} dir={ar ? "rtl" : "ltr"} lang={lang} className="h-[440px] space-y-2.5 overflow-y-auto px-3 py-4" aria-live="polite">
                <div className="mx-auto w-fit rounded-full bg-white/70 px-3 py-1 text-[10px] font-medium text-navy-600">{ar ? "محاكاة — لا يوجد اتصال حقيقي بواتساب" : "Simulation — no real WhatsApp connection"}</div>
                <AnimatePresence initial={false}>
                  {data.messages.map((m) => (
                    <motion.div key={m.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                      {m.kind === "quote" && m.quote ? (
                        <QuoteBubble quote={m.quote} product={products.find((p) => p.key === m.quote?.productKey)} lang={lang} />
                      ) : (
                        <div className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm", m.from === "user" ? "rounded-ee-md bg-teal-600 text-white" : "rounded-es-md bg-white text-navy-900")}>
                          {m.from === "user" ? (m.kind === "free" ? m.text : userText(m.intent ?? "product", lang)) : botText(m, lang, factory, products)}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {typing ? (
                  <div className="flex justify-start" aria-label={ar ? "المساعد يكتب" : "Assistant is typing"}>
                    <div className="flex gap-1 rounded-2xl rounded-es-md bg-white px-3 py-3 shadow-sm">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="size-1.5 rounded-full bg-navy-500/60" animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {showQuoteForm ? (
                  <div className="rounded-2xl border border-teal-200 bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                      <div>
                        <label htmlFor="q-product" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-navy-600">{ar ? "المنتج" : "Product"}</label>
                        <Select id="q-product" value={quoteProduct} onChange={(e) => { setQuoteProduct(e.target.value); const p = products.find((x) => x.key === e.target.value); if (p) setQuoteQty(String(p.moq * 2)); }} className="h-9 text-xs">
                          {products.map((p) => <option key={p.key} value={p.key}>{ar ? p.nameAr : p.name}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label htmlFor="q-qty" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-navy-600">{ar ? "الكمية" : "Quantity"}</label>
                        <Input id="q-qty" inputMode="numeric" value={quoteQty} onChange={(e) => setQuoteQty(e.target.value.replace(/[^\d]/g, ""))} className="h-9 text-xs" />
                      </div>
                    </div>
                    <Button size="sm" variant="accent" className="mt-2 w-full" onClick={requestQuote} disabled={!Number(quoteQty)}><Calculator /> {ar ? "احسب النطاق التقريبي" : "Get indicative range"}</Button>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-black/5 bg-white/80 px-3 pb-3 pt-2">
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" dir={ar ? "rtl" : "ltr"}>
                  {CHIPS.map((c) => (
                    <button key={c.intent} type="button" onClick={() => ask(c.intent)} disabled={typing} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:opacity-50">
                      <c.icon className="size-3" /> {c[lang]}
                    </button>
                  ))}
                </div>
                <form onSubmit={sendFree} className="flex items-center gap-2">
                  <label htmlFor="chat-input" className="sr-only">{ar ? "اكتب رسالة" : "Type a message"}</label>
                  <input id="chat-input" dir={ar ? "rtl" : "ltr"} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={ar ? "اكتب سؤالك…" : "Type a question…"} className="h-10 min-w-0 flex-1 rounded-full border border-line bg-white px-4 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100" />
                  <button type="submit" disabled={!draft.trim() || typing} aria-label={ar ? "إرسال" : "Send"} className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-600 text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:opacity-40">
                    <Send className={cn("size-4", ar && "-scale-x-100")} />
                  </button>
                </form>
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted"><Smartphone className="size-3.5" /> {t("WhatsApp-style preview · no real WhatsApp connection")}</p>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-5">
          <Panel title={t("Lead qualification")} description={t("Budget · Need · Timeline scoring (simulated model)")} actions={<StatusPill tone={b.tone}>{t(b.label)} · {score}</StatusPill>}>
            <form onSubmit={capture} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label htmlFor="lq-name">{t("Contact name")}</Label><Input id="lq-name" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder={t("Fictional contact")} /></div>
                <div><Label htmlFor="lq-company">{t("Company")}</Label><Input id="lq-company" value={lead.company} onChange={(e) => setLead({ ...lead, company: e.target.value })} placeholder={t("Required")} required /></div>
                <div><Label htmlFor="lq-country">{t("Country")}</Label><Input id="lq-country" value={lead.country} onChange={(e) => setLead({ ...lead, country: e.target.value })} placeholder={t("e.g. Kenya")} /></div>
              </div>
              {([["budget", "Budget", BUDGET], ["need", "Need", NEED], ["timeline", "Timeline", TIMELINE]] as const).map(([key, label, opts]) => (
                <div key={key} className="grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-navy-600">{t(label)}</span>
                  <div role="group" aria-label={t(label)} className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {opts.map((o, i) => (
                      <button key={o.en} type="button" aria-pressed={lead[key] === i} onClick={() => setLead({ ...lead, [key]: i })} className={cn("rounded-lg border px-2 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300", lead[key] === i ? "border-teal-400 bg-teal-50 text-teal-800" : "border-line bg-white text-navy-700 hover:border-navy-500/30")}>
                        {uiAr ? o.ar : o.en}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-3 rounded-xl bg-canvas p-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs"><span className="font-semibold text-navy-800">{t("Qualification score")}</span><span className="tabular-nums text-muted">{score}/100</span></div>
                  <MiniBar value={score} color={score >= 70 ? "#0FA396" : score >= 45 ? "#C9A24B" : "#94A3B8"} className="mt-1.5 h-2" />
                  <div className="mt-1.5 text-[11px] text-muted">
                    {lastQuoteProduct ? t("Interest: {product} · {qty} {unit} (from last quotation)", { product: uiAr ? lastQuoteProduct.nameAr : lastQuoteProduct.name, qty: data.lastQuote?.qty.toLocaleString("en-US") ?? "", unit: uiAr ? lastQuoteProduct.unitAr : lastQuoteProduct.unit }) : t("Interest: {product} · MOQ (no quotation yet)", { product: (uiAr ? products[0]?.nameAr : products[0]?.name) ?? "" })}
                  </div>
                </div>
                <Button type="submit" disabled={!lead.company.trim()}><UserPlus /> {t("Capture lead")}</Button>
              </div>
            </form>
          </Panel>

          <Panel title={t("Captured leads")} description={t("{count} lead(s) · send qualified leads to the CRM pipeline", { count: data.leads.length })} actions={<Users className="size-4 text-muted" />} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {data.leads.map((l) => {
                const lb = band(l.score);
                return (
                  <li key={l.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-navy-900">{l.company}</span>
                        <StatusPill tone={lb.tone}>{t(lb.label)} · {l.score}</StatusPill>
                      </div>
                      <div className="mt-0.5 text-xs text-muted">{l.name} · {t(l.country)} · {t(l.product)} · {t("{qty} units", { qty: l.qty.toLocaleString("en-US") })} · ≈ {usd(l.value)}</div>
                    </div>
                    {l.sentToCrm ? (
                      <Button variant="ghost" size="sm" onClick={() => router.push("/services/crm-pipeline")}><CheckCircle2 className="text-emerald-600" /> {t("In CRM")} <ArrowUpRight /></Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => sendToCrm(l)}><Send className="rtl:-scale-x-100" /> {t("Send to CRM")}</Button>
                    )}
                  </li>
                );
              })}
              {!data.leads.length ? <li className="px-5 py-10 text-center text-sm text-muted">{t("No leads yet — qualify a conversation above.")}</li> : null}
            </ul>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            <AIInsight title={t("Assistant knowledge")}>
              {t("Answers come only from approved product data: {count} products, MOQs, lead times, certifications and delivery terms. Unknown questions are handed to a person.", { count: products.length })}
            </AIInsight>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"><ShieldAlert className="size-3.5" /> {t("Guardrails")}</div>
              <p className="mt-1.5">{t("Quotations are indicative ranges only and always require sales approval. No real WhatsApp, website or messaging channel is connected in this demo.")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted"><Bot className="size-3.5" /> {t("Scripted demo conversation")} <SimTag /> <Languages className="size-3.5" /> {t("Arabic renders right-to-left")}</div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function QuoteBubble({ quote, product, lang }: { quote: QuoteCard; product?: ProductProfile; lang: Lang }) {
  const ar = lang === "ar";
  if (!product) return null;
  return (
    <div className="w-[88%] overflow-hidden rounded-2xl rounded-es-md bg-white shadow-sm">
      <div className="flex items-center justify-between bg-navy-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white">
        <span>{ar ? "عرض سعر تقريبي" : "Indicative quotation"}</span>
        <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[9px] text-navy-950">{ar ? "غير ملزم" : "Non-binding"}</span>
      </div>
      <div className="space-y-1.5 p-3 text-[13px] text-navy-900">
        <div className="font-semibold">{ar ? product.nameAr : product.name}</div>
        <div className="flex justify-between text-xs text-muted"><span>{ar ? "الكمية" : "Quantity"}</span><span className="tabular-nums" dir="ltr">{quote.qty.toLocaleString("en-US")} {ar ? product.unitAr : product.unit}</span></div>
        <div className="flex justify-between text-xs text-muted"><span>{ar ? "سعر الوحدة FOB" : "Unit price FOB"}</span><span className="tabular-nums" dir="ltr">{usd(quote.unitMin, 2)} – {usd(quote.unitMax, 2)}</span></div>
        <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><span>{ar ? "الإجمالي التقريبي" : "Indicative total"}</span><span className="tabular-nums" dir="ltr">{usd(quote.qty * quote.unitMin)} – {usd(quote.qty * quote.unitMax)}</span></div>
        {quote.belowMoq ? <div className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">{ar ? `أقل من الحد الأدنى (${product.moq.toLocaleString("en-US")}) — تُطبق علاوة سعرية.` : `Below MOQ (${product.moq.toLocaleString("en-US")}) — small-order premium applied.`}</div> : null}
        <div className="flex items-center gap-1.5 rounded-md bg-gold-50 px-2 py-1 text-[11px] font-medium text-gold-600"><ShieldAlert className="size-3" /> {ar ? "يتطلب موافقة فريق المبيعات" : "Requires sales approval"}</div>
      </div>
    </div>
  );
}
