"use client";

import type { CSSProperties, KeyboardEvent, FocusEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowLeft, Phone, Mail, MapPin, MessageCircle, BadgeCheck, Scissors, Layers, SearchCheck, Truck, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale, WebsiteContent } from "@/lib/types";
import type { RegenSection } from "@/lib/data/website-seed";
import { HeroArt, LogoMark, ProductArt, productKind } from "./site-illustrations";

export const SITE_THEMES: Record<WebsiteContent["theme"], { label: string; p: string; dark: string; soft: string; accent: string }> = {
  indigo: { label: "Indigo", p: "#3446A8", dark: "#161E52", soft: "#EEF0FB", accent: "#D1AE5C" },
  teal: { label: "Teal", p: "#0F8C80", dark: "#0A2B35", soft: "#E9F7F5", accent: "#D1AE5C" },
  sand: { label: "Sand", p: "#9A6B35", dark: "#33241A", soft: "#F7F0E6", accent: "#2F7A72" },
};

const T = {
  en: {
    name: "Al Noor Textiles",
    nav: ["Products", "About", "Capabilities", "Contact"],
    quote: "Request a quote",
    catalogue: "View products",
    productsEyebrow: "What we make",
    productsTitle: "Products built for daily wear and heavy washing",
    inquire: "Send inquiry",
    aboutEyebrow: "About us",
    aboutTitle: "A family mill with industrial discipline",
    since: "Since",
    facts: [
      ["Location", "Abu Rawash, Giza"],
      ["Specialty", "Cotton circular knits"],
      ["Markets", "Egypt, Gulf, EU (pilot)"],
    ],
    processEyebrow: "How we work",
    processTitle: "Yarn to finished garment, under one roof",
    process: [
      ["Knitting", "24 circular machines, 18–28 gauge"],
      ["Dyeing & finishing", "Partner dye-house, shade approved by lab dip"],
      ["Cutting & sewing", "Automatic spreading and 60 sewing stations"],
      ["Inspection & dispatch", "4-point roll inspection, packed to your spec"],
    ],
    certsTitle: "Quality & standards",
    certsNote: "Status as declared by the factory.",
    contactEyebrow: "Contact",
    contactTitle: "Let's talk about your next order",
    phone: "Phone",
    whatsapp: "WhatsApp Business",
    email: "Email",
    address: "Factory address",
    map: "Abu Rawash Industrial Zone",
    rights: "All rights reserved.",
    built: "Built with JAHEZ",
    editHint: "Click to edit",
  },
  ar: {
    name: "النور للمنسوجات",
    nav: ["المنتجات", "من نحن", "القدرات", "تواصل معنا"],
    quote: "اطلب عرض سعر",
    catalogue: "تصفح المنتجات",
    productsEyebrow: "ماذا نصنع",
    productsTitle: "منتجات مصممة للاستخدام اليومي والغسيل المكثف",
    inquire: "أرسل استفسارًا",
    aboutEyebrow: "من نحن",
    aboutTitle: "مصنع عائلي بانضباط صناعي",
    since: "منذ",
    facts: [
      ["الموقع", "أبو رواش، الجيزة"],
      ["التخصص", "تريكو قطني دائري"],
      ["الأسواق", "مصر، الخليج، أوروبا (تجريبي)"],
    ],
    processEyebrow: "كيف نعمل",
    processTitle: "من الغزل إلى الملبس النهائي تحت سقف واحد",
    process: [
      ["التريكو", "24 ماكينة دائرية بمقاييس 18–28"],
      ["الصباغة والتجهيز", "مصبغة شريكة واعتماد اللون بعينة معملية"],
      ["القص والخياطة", "فرد آلي و60 محطة خياطة"],
      ["الفحص والشحن", "فحص الرولات بنظام النقاط الأربع وتعبئة حسب مواصفاتك"],
    ],
    certsTitle: "الجودة والمعايير",
    certsNote: "الحالة كما أعلنها المصنع.",
    contactEyebrow: "تواصل معنا",
    contactTitle: "لنتحدث عن طلبك القادم",
    phone: "الهاتف",
    whatsapp: "واتساب للأعمال",
    email: "البريد الإلكتروني",
    address: "عنوان المصنع",
    map: "المنطقة الصناعية بأبو رواش",
    rights: "جميع الحقوق محفوظة.",
    built: "صُمم بواسطة جاهز",
    editHint: "انقر للتعديل",
  },
} as const;

const PROCESS_ICONS = [Layers, BadgeCheck, Scissors, SearchCheck];

type Tag = "h1" | "h2" | "h3" | "p" | "span";

/** Inline click-to-edit text. Commits on blur / Enter, Escape reverts. */
function Editable({ value, onCommit, as = "span", className, multiline, hint }: { value: string; onCommit: (v: string) => void; as?: Tag; className?: string; multiline?: boolean; hint: string }) {
  const Comp = as;
  return (
    <Comp
      key={value}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={hint}
      title={hint}
      tabIndex={0}
      onBlur={(e: FocusEvent<HTMLElement>) => {
        const next = (e.currentTarget.textContent ?? "").replace(/\s+/g, " ").trim();
        if (next && next !== value) onCommit(next);
        else e.currentTarget.textContent = value;
      }}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        }
      }}
      className={cn("-mx-1 cursor-text rounded-md px-1 outline-none transition-shadow hover:shadow-[0_0_0_2px_rgba(45,191,176,0.55)] focus:shadow-[0_0_0_2px_#2DBFB0] focus:bg-white/5", className)}
    >
      {value}
    </Comp>
  );
}

function Shimmer({ active, children, className }: { active: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
            <div className="absolute inset-0 bg-white/55 backdrop-blur-[1.5px]" />
            <div className="animate-shimmer absolute inset-0 bg-[linear-gradient(100deg,transparent_20%,rgba(45,191,176,0.28)_45%,rgba(255,255,255,0.7)_50%,rgba(45,191,176,0.28)_55%,transparent_80%)] bg-[length:200%_100%]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SitePreview({ content, locale, regenerating, onEdit }: { content: WebsiteContent; locale: Locale; regenerating: RegenSection | null; onEdit: (patch: Partial<WebsiteContent>) => void }) {
  const t = T[locale];
  const theme = SITE_THEMES[content.theme];
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const style = { "--p": theme.p, "--dark": theme.dark, "--soft": theme.soft, "--accent": theme.accent } as CSSProperties;

  const setLoc = (field: "heroTitle" | "heroSubtitle" | "about", v: string) => onEdit({ [field]: { ...content[field], [locale]: v } });
  const setProduct = (id: string, key: "name" | "description", v: string) =>
    onEdit({ products: content.products.map((p) => (p.id === id ? { ...p, [key]: { ...p[key], [locale]: v } } : p)) });

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={locale} style={style} className={cn("@container bg-white text-[#1B2230]", rtl && "font-arabic")}>
      {/* Nav */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-black/5 bg-white/90 px-5 py-3 backdrop-blur @3xl:px-10">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-8" />
          <span className="text-[15px] font-bold tracking-tight">{t.name}</span>
        </div>
        <nav className="hidden items-center gap-6 text-[13px] font-medium text-black/60 @3xl:flex">
          {t.nav.map((n) => <span key={n} className="cursor-default transition-colors hover:text-[var(--p)]">{n}</span>)}
        </nav>
        <span className="hidden rounded-full bg-[var(--p)] px-4 py-2 text-xs font-semibold text-white @md:inline-flex">{t.quote}</span>
      </header>

      {/* Hero */}
      <Shimmer active={regenerating === "hero"}>
        <section className="relative overflow-hidden bg-[var(--dark)] text-white">
          <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(60deg,#fff_0_1px,transparent_1px_14px),repeating-linear-gradient(-60deg,#fff_0_1px,transparent_1px_14px)]" />
          <div className="absolute -top-24 size-80 rounded-full bg-[var(--p)] opacity-40 blur-3xl ltr:-right-20 rtl:-left-20" />
          <div className="relative grid items-center gap-8 px-5 py-12 @3xl:grid-cols-[1.15fr_0.85fr] @3xl:px-10 @3xl:py-16">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/80">
                <span className="size-1.5 rounded-full bg-[var(--accent)]" /> {rtl ? "الجيزة، مصر · منذ 2009" : "Giza, Egypt · Since 2009"}
              </span>
              <Editable as="h2" hint={t.editHint} value={content.heroTitle[locale]} onCommit={(v) => setLoc("heroTitle", v)} className="mt-4 block text-[28px] font-bold leading-[1.15] tracking-tight @xl:text-[34px] @4xl:text-[42px]" />
              <Editable as="p" multiline hint={t.editHint} value={content.heroSubtitle[locale]} onCommit={(v) => setLoc("heroSubtitle", v)} className="mt-4 block max-w-xl text-[14.5px] leading-relaxed text-white/75" />
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-[var(--dark)]">{t.quote} <Arrow className="size-4" /></span>
                <span className="inline-flex items-center rounded-full border border-white/25 px-5 py-2.5 text-[13px] font-semibold text-white">{t.catalogue}</span>
              </div>
            </div>
            <HeroArt className="mx-auto hidden w-full max-w-[300px] @2xl:block" />
          </div>
        </section>
      </Shimmer>

      {/* Stats */}
      <Shimmer active={regenerating === "capabilities"}>
        <section className="relative z-10 mx-5 -mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/5 bg-black/[0.06] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.25)] @3xl:mx-10 @3xl:grid-cols-4">
          {content.capabilities.map((c, i) => (
            <div key={i} className="bg-white p-4 @3xl:p-5">
              <div className="text-2xl font-bold tracking-tight text-[var(--p)] tabular-nums @3xl:text-[28px]">{c.value}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-black/55">{c.label[locale]}</div>
            </div>
          ))}
        </section>
      </Shimmer>

      {/* Products */}
      <Shimmer active={regenerating === "products"}>
        <section className="px-5 py-14 @3xl:px-10">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--p)]">{t.productsEyebrow}</div>
          <h2 className="mt-2 max-w-lg text-[22px] font-bold leading-tight tracking-tight @3xl:text-[26px]">{t.productsTitle}</h2>
          <div className="mt-7 grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-4">
            {content.products.map((p) => (
              <article key={p.id} className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.07] bg-white transition-shadow hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.3)]">
                <div className="aspect-[16/10] overflow-hidden">
                  <ProductArt kind={productKind(p.id, p.name.en)} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.04]" />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <Editable as="h3" hint={t.editHint} value={p.name[locale] || "—"} onCommit={(v) => setProduct(p.id, "name", v)} className="block text-[15px] font-bold tracking-tight" />
                  <Editable as="p" multiline hint={t.editHint} value={p.description[locale] || "—"} onCommit={(v) => setProduct(p.id, "description", v)} className="mt-1.5 block flex-1 text-[12.5px] leading-relaxed text-black/60" />
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--p)]">{t.inquire} <Arrow className="size-3.5" /></span>
                </div>
              </article>
            ))}
            {content.products.length === 0 && (
              <div className="col-span-full grid place-items-center rounded-2xl border border-dashed border-black/15 py-10 text-center text-sm text-black/45">
                <Plus className="mb-2 size-5" />
                {rtl ? "أضف منتجًا من المحرر" : "Add a product from the editor"}
              </div>
            )}
          </div>
        </section>
      </Shimmer>

      {/* About */}
      <Shimmer active={regenerating === "about"}>
        <section className="bg-[var(--soft)] px-5 py-14 @3xl:px-10">
          <div className="grid gap-8 @3xl:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--p)]">{t.aboutEyebrow}</div>
              <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight @3xl:text-[26px]">{t.aboutTitle}</h2>
              <Editable as="p" multiline hint={t.editHint} value={content.about[locale]} onCommit={(v) => setLoc("about", v)} className="mt-4 block text-[14px] leading-[1.8] text-black/70" />
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.3)]">
              <div className="flex items-end gap-2">
                <span className="text-[12px] font-medium text-black/50">{t.since}</span>
                <span className="text-4xl font-bold tracking-tight text-[var(--p)]">2009</span>
              </div>
              <dl className="mt-4 divide-y divide-black/5 text-[13px]">
                {t.facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-2.5">
                    <dt className="text-black/50">{k}</dt>
                    <dd className="text-end font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </Shimmer>

      {/* Process */}
      <section className="px-5 py-14 @3xl:px-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--p)]">{t.processEyebrow}</div>
        <h2 className="mt-2 max-w-lg text-[22px] font-bold leading-tight tracking-tight @3xl:text-[26px]">{t.processTitle}</h2>
        <ol className="mt-7 grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-4">
          {t.process.map(([title, desc], i) => {
            const Icon = PROCESS_ICONS[i];
            return (
              <li key={title} className="relative rounded-2xl border border-black/[0.07] p-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-[var(--soft)] text-[var(--p)]"><Icon className="size-4.5" /></span>
                  <span className="text-[11px] font-bold tabular-nums text-black/25">0{i + 1}</span>
                </div>
                <div className="mt-3 text-[14px] font-bold">{title}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-black/55">{desc}</div>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 rounded-2xl border border-black/[0.07] p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[14px] font-bold">{t.certsTitle}</h3>
            <span className="text-[11px] text-black/40">{t.certsNote}</span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {content.certifications.map((c) => (
              <li key={c} dir="ltr" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--soft)] px-3 py-1.5 text-[12px] font-medium text-[var(--dark)]">
                <BadgeCheck className="size-3.5 text-[var(--p)]" /> {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-[var(--dark)] px-5 py-14 text-white @3xl:px-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{t.contactEyebrow}</div>
        <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight @3xl:text-[26px]">{t.contactTitle}</h2>
        <div className="mt-7 grid gap-5 @3xl:grid-cols-2">
          <div className="grid gap-3 @md:grid-cols-2">
            {[
              { icon: Phone, k: t.phone, v: content.contact.phone, ltr: true },
              { icon: MessageCircle, k: t.whatsapp, v: content.contact.whatsapp, ltr: true },
              { icon: Mail, k: t.email, v: content.contact.email, ltr: true },
              { icon: MapPin, k: t.address, v: content.contact.address[locale], ltr: false },
            ].map(({ icon: Icon, k, v, ltr }) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <Icon className="size-4 text-[var(--accent)]" />
                <div className="mt-2 text-[11px] uppercase tracking-wider text-white/45">{k}</div>
                <div dir={ltr ? "ltr" : undefined} className={cn("mt-0.5 break-words text-[13px] font-semibold", ltr && rtl && "text-end")}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {/* CSS map placeholder */}
          <div className="relative min-h-52 overflow-hidden rounded-xl bg-[#E8ECE6]" aria-label={t.map}>
            <div className="absolute inset-0 [background-image:linear-gradient(#fff_2px,transparent_2px),linear-gradient(90deg,#fff_2px,transparent_2px)] [background-size:46px_46px] opacity-80" />
            <div className="absolute -left-10 top-[38%] h-5 w-[140%] -rotate-12 bg-[#F6E7B8]" />
            <div className="absolute left-[58%] top-0 h-full w-4 rotate-6 bg-white" />
            <div className="absolute bottom-0 right-0 h-1/3 w-2/5 rounded-tl-[40px] bg-[#CFE3D2]" />
            <div className="absolute left-[12%] top-[12%] h-12 w-16 rounded-md bg-[#D9DED8]" />
            <div className="absolute left-[66%] top-[56%] h-10 w-20 rounded-md bg-[#D9DED8]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
              <div className="relative grid size-9 place-items-center rounded-full rounded-br-none bg-[var(--p)] text-white shadow-lg [transform:rotate(45deg)]">
                <MapPin className="size-4 [transform:rotate(-45deg)]" />
              </div>
            </div>
            <div className="absolute bottom-3 start-3 rounded-lg bg-white px-3 py-2 text-[11.5px] font-semibold text-[#1B2230] shadow">
              <Truck className="me-1.5 inline size-3.5 text-[var(--p)]" />
              {t.map}
            </div>
          </div>
        </div>
      </section>

      <footer className="flex flex-col items-start justify-between gap-2 border-t border-white/10 bg-[var(--dark)] px-5 py-5 text-[11.5px] text-white/45 @md:flex-row @md:items-center @3xl:px-10">
        <span>© {new Date().getFullYear()} {t.name}. {t.rights}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[var(--accent)]" />{t.built}</span>
      </footer>
    </div>
  );
}
