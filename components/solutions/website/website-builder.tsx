"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import {
  Globe, Lock, Monitor, Tablet, Smartphone, Sparkles, Plus, Trash2, RotateCcw, Rocket, EyeOff, Check, MousePointerClick, X, Loader2, ShieldCheck,
} from "lucide-react";
import { Badge, Button, Card, Input, Label, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/shell/shared";
import { useActiveFactory, useJahez } from "@/lib/store";
import { WEBSITE_SEED, WEBSITE_VARIANTS, type RegenSection } from "@/lib/data/website-seed";
import { cn } from "@/lib/utils";
import type { Locale, WebsiteContent } from "@/lib/types";
import { SitePreview, SITE_THEMES } from "./site-preview";

const DOMAIN = "alnoor-textiles.jahez.demo";
type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 768, mobile: 390 };
type Bi = { en: string; ar: string };

export function WebsiteBuilder() {
  const { id: factoryId, state } = useActiveFactory();
  const setWebsite = useJahez((s) => s.setWebsite);
  const website = state.website;

  useEffect(() => {
    if (!website) setWebsite(factoryId, WEBSITE_SEED);
  }, [website, factoryId, setWebsite]);

  if (!website) {
    return (
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Skeleton className="h-[640px]" />
        <Skeleton className="h-[640px]" />
      </div>
    );
  }
  return <Builder content={website} onChange={(w) => setWebsite(factoryId, w)} />;
}

function Builder({ content, onChange }: { content: WebsiteContent; onChange: (w: WebsiteContent) => void }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState("hero");
  const [regenerating, setRegenerating] = useState<RegenSection | null>(null);
  const regenCount = useRef<Record<RegenSection, number>>({ hero: 0, about: 0, products: 0, capabilities: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Keep a ref to the latest content so the delayed regeneration doesn't clobber edits made meanwhile.
  const latest = useRef(content);
  useEffect(() => { latest.current = content; }, [content]);

  const update = (patch: Partial<WebsiteContent>) => onChange({ ...content, ...patch });

  const regenerate = (section: RegenSection) => {
    if (regenerating) return;
    setRegenerating(section);
    timer.current = setTimeout(() => {
      const variants = WEBSITE_VARIANTS[section];
      const next = (regenCount.current[section] + 1) % variants.length;
      regenCount.current[section] = next;
      const cur = latest.current;
      let patch: Partial<WebsiteContent> = variants[next];
      if (section === "products") {
        const generated = WEBSITE_VARIANTS.products[next].products;
        const extras = cur.products.filter((p) => !generated.some((g) => g.id === p.id));
        patch = { products: [...generated, ...extras] };
      }
      onChange({ ...cur, ...patch });
      setRegenerating(null);
      const names: Record<RegenSection, string> = { hero: "Hero", about: "About section", products: "Product copy", capabilities: "Key figures" };
      toast.success(`${names[section]} regenerated`, { description: `Variant ${next + 1} of ${variants.length} · English and Arabic rewritten together.` });
    }, 1400);
  };

  const togglePublish = () => {
    const published = !content.published;
    update({ published });
    if (published) toast.success("Website published", { description: `Live at https://${DOMAIN} (demo domain).` });
    else toast("Website unpublished", { description: "The site is now a private draft only you can see." });
  };

  const reset = () => {
    onChange({ ...WEBSITE_SEED, published: content.published });
    regenCount.current = { hero: 0, about: 0, products: 0, capabilities: 0 };
    toast("Restored the original AI draft", { description: "Theme, copy and products reset. Publishing status kept." });
  };

  return (
    <MotionConfig reducedMotion="user">
      <PageHeader
        eyebrow="AI Website Builder · Al Noor Textiles"
        title="Your bilingual factory website"
        description="Generated from your factory profile in English and Arabic. Edit any section on the left or click text in the preview — every change saves instantly."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={reset}><RotateCcw /> Reset to AI draft</Button>
            <Button variant={content.published ? "outline" : "accent"} onClick={togglePublish}>
              {content.published ? <><EyeOff /> Unpublish</> : <><Rocket /> Publish website</>}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        {/* ---------- Editor ---------- */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7.5rem)] xl:self-start">
          <Card className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-navy-900">Section editor</div>
                <div className="text-xs text-muted">English and Arabic side by side</div>
              </div>
              <StatusPill published={content.published} />
            </div>
            <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-col">
              <div className="scrollbar-thin overflow-x-auto border-b border-line px-4 py-3">
                <TabsList className="w-max">
                  {[
                    ["hero", "Hero"], ["about", "About"], ["products", "Products"], ["stats", "Figures"], ["contact", "Contact"], ["theme", "Theme"],
                  ].map(([v, l]) => <TabsTrigger key={v} value={v} className="text-[13px]">{l}</TabsTrigger>)}
                </TabsList>
              </div>
              <div className="scrollbar-thin min-h-0 overflow-y-auto px-5 py-5">
                <TabsContent value="hero" className="space-y-5 focus:outline-none">
                  <SectionHead title="Hero banner" hint="The first thing buyers read." onRegen={() => regenerate("hero")} busy={regenerating === "hero"} disabled={!!regenerating} />
                  <BiField label="Headline" value={content.heroTitle} onChange={(heroTitle) => update({ heroTitle })} busy={regenerating === "hero"} />
                  <BiField label="Subtitle" multiline value={content.heroSubtitle} onChange={(heroSubtitle) => update({ heroSubtitle })} busy={regenerating === "hero"} />
                </TabsContent>

                <TabsContent value="about" className="space-y-5 focus:outline-none">
                  <SectionHead title="About the factory" hint="Your story, history and how you work." onRegen={() => regenerate("about")} busy={regenerating === "about"} disabled={!!regenerating} />
                  <BiField label="About text" multiline rows={7} value={content.about} onChange={(about) => update({ about })} busy={regenerating === "about"} />
                </TabsContent>

                <TabsContent value="products" className="space-y-4 focus:outline-none">
                  <SectionHead title="Product catalogue" hint={`${content.products.length} product${content.products.length === 1 ? "" : "s"} shown on the site.`} onRegen={() => regenerate("products")} busy={regenerating === "products"} disabled={!!regenerating} />
                  {content.products.map((p, i) => (
                    <motion.div layout key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-line bg-canvas/60 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-navy-600">Product {i + 1}</span>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 hover:bg-red-50" aria-label={`Remove ${p.name.en}`} onClick={() => {
                          update({ products: content.products.filter((x) => x.id !== p.id) });
                          toast(`Removed “${p.name.en}”`);
                        }}><Trash2 /> Remove</Button>
                      </div>
                      <div className="space-y-3">
                        <BiField label="Name" value={p.name} busy={regenerating === "products"} onChange={(name) => update({ products: content.products.map((x) => (x.id === p.id ? { ...x, name } : x)) })} />
                        <BiField label="Description" multiline rows={3} value={p.description} busy={regenerating === "products"} onChange={(description) => update({ products: content.products.map((x) => (x.id === p.id ? { ...x, description } : x)) })} />
                      </div>
                    </motion.div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed" disabled={content.products.length >= 8} onClick={() => {
                    update({
                      products: [...content.products, {
                        id: `p-custom-${Date.now()}`,
                        name: { en: "Custom knit development", ar: "تطوير أقمشة حسب الطلب" },
                        description: { en: "Bring a sample or a sketch — we develop the construction, weight and finish, then knit a trial roll within 10 days.", ar: "أحضر عينة أو رسمًا — نطوّر التركيب والوزن والتجهيز، ثم نُنتج رولًا تجريبيًا خلال 10 أيام." },
                      }],
                    });
                    toast.success("Product added", { description: "Edit the copy here or directly in the preview." });
                  }}><Plus /> Add product</Button>
                </TabsContent>

                <TabsContent value="stats" className="space-y-5 focus:outline-none">
                  <SectionHead title="Key figures" hint="Shown in the band under the hero." onRegen={() => regenerate("capabilities")} busy={regenerating === "capabilities"} disabled={!!regenerating} />
                  {content.capabilities.map((c, i) => (
                    <div key={i} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 rounded-xl border border-line bg-canvas/60 p-3">
                      <div>
                        <Label htmlFor={`cap-v-${i}`}>Value</Label>
                        <Input id={`cap-v-${i}`} value={c.value} className="text-center font-semibold tabular-nums" onChange={(e) => update({ capabilities: content.capabilities.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                      </div>
                      <BiField label="Label" compact value={c.label} busy={regenerating === "capabilities"} onChange={(label) => update({ capabilities: content.capabilities.map((x, j) => (j === i ? { ...x, label } : x)) })} />
                    </div>
                  ))}
                  <CertEditor certs={content.certifications} onChange={(certifications) => update({ certifications })} />
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 focus:outline-none">
                  <SectionHead title="Contact channels" hint="Business phone, WhatsApp and email — published consistently." />
                  {([["phone", "Phone"], ["whatsapp", "WhatsApp Business"], ["email", "Business email"]] as const).map(([k, l]) => (
                    <div key={k}>
                      <Label htmlFor={`contact-${k}`}>{l}</Label>
                      <Input id={`contact-${k}`} dir="ltr" value={content.contact[k]} onChange={(e) => update({ contact: { ...content.contact, [k]: e.target.value } })} />
                    </div>
                  ))}
                  <BiField label="Address" multiline rows={2} value={content.contact.address} onChange={(address) => update({ contact: { ...content.contact, address } })} />
                  <p className="text-xs text-muted">Contact details in this demo are fictional and do not route to a real inbox.</p>
                </TabsContent>

                <TabsContent value="theme" className="space-y-4 focus:outline-none">
                  <SectionHead title="Visual theme" hint="Colours applied across the whole site." />
                  <div role="radiogroup" aria-label="Website theme" className="grid gap-3">
                    {(Object.keys(SITE_THEMES) as WebsiteContent["theme"][]).map((k) => {
                      const th = SITE_THEMES[k];
                      const active = content.theme === k;
                      return (
                        <button key={k} role="radio" aria-checked={active} onClick={() => update({ theme: k })} className={cn("flex items-center gap-4 rounded-xl border bg-white p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", active ? "border-teal-400 shadow-card ring-1 ring-teal-400" : "border-line hover:border-navy-500/30")}>
                          <div className="flex h-12 w-20 shrink-0 overflow-hidden rounded-lg">
                            <span className="flex-[2]" style={{ background: th.dark }} />
                            <span className="flex-[2]" style={{ background: th.p }} />
                            <span className="flex-1" style={{ background: th.accent }} />
                            <span className="flex-1" style={{ background: th.soft }} />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-navy-900">{th.label}</div>
                            <div className="text-xs text-muted">{k === "indigo" ? "Corporate and export-focused" : k === "teal" ? "Fresh, modern manufacturing" : "Warm, heritage craftsmanship"}</div>
                          </div>
                          <span className={cn("grid size-5 place-items-center rounded-full border", active ? "border-teal-500 bg-teal-500 text-white" : "border-line")}>{active ? <Check className="size-3" /> : null}</span>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </Card>

          <Card className="flex items-start gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600"><ShieldCheck className="size-4.5" /></span>
            <div className="text-sm">
              <div className="font-semibold text-navy-900">Tier 1 evidence</div>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                <li className="flex items-center gap-1.5"><Check className="size-3 text-teal-600" /> Bilingual business website</li>
                <li className="flex items-center gap-1.5"><Check className="size-3 text-teal-600" /> Business contact channels</li>
              </ul>
              {!content.published && <div className="mt-1.5 text-xs text-gold-600">Publish the site so reviewers can visit it.</div>}
            </div>
          </Card>
        </div>

        {/* ---------- Preview ---------- */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented ariaLabel="Preview language" value={locale} onChange={setLocale} options={[{ v: "en", l: "English" }, { v: "ar", l: "العربية", className: "font-arabic" }]} />
              <Segmented ariaLabel="Preview device" value={device} onChange={setDevice} options={[
                { v: "desktop", l: <Monitor className="size-4" />, title: "Desktop" },
                { v: "tablet", l: <Tablet className="size-4" />, title: "Tablet" },
                { v: "mobile", l: <Smartphone className="size-4" />, title: "Mobile" },
              ]} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted"><MousePointerClick className="size-3.5 text-teal-600" /> Click headings and text in the preview to edit inline</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-line bg-[#F3F5F8] px-4 py-2.5">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-[#FF6058]" />
                <span className="size-2.5 rounded-full bg-[#FFBD2E]" />
                <span className="size-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-navy-700">
                <Lock className="size-3 shrink-0 text-teal-600" />
                <span className="truncate"><span className="text-muted">https://</span>{DOMAIN}{locale === "ar" ? "/ar" : ""}</span>
              </div>
              <StatusPill published={content.published} small />
            </div>
            <div className={cn("scrollbar-thin h-[min(78vh,860px)] min-h-[520px] overflow-y-auto", device !== "desktop" && "bg-grid bg-canvas px-3 py-6")}>
              <div
                className={cn("mx-auto transition-[max-width] duration-500 ease-out", device !== "desktop" && "overflow-hidden rounded-[22px] border border-line shadow-lift")}
                style={{ maxWidth: DEVICE_WIDTH[device] ?? "100%" }}
              >
                <SitePreview content={content} locale={locale} regenerating={regenerating} onEdit={(patch) => { update(patch); toast.success("Saved", { description: "Inline edit applied to the live draft." }); }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function StatusPill({ published, small }: { published: boolean; small?: boolean }) {
  return published ? (
    <Badge tone="green" className={cn("shrink-0", small && "px-2")}><span className="relative flex size-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative size-1.5 rounded-full bg-emerald-500" /></span> Live</Badge>
  ) : (
    <Badge tone="amber" className={cn("shrink-0", small && "px-2")}><Globe /> Draft</Badge>
  );
}

function SectionHead({ title, hint, onRegen, busy, disabled }: { title: string; hint: string; onRegen?: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-navy-900">{title}</div>
        <div className="text-xs text-muted">{hint}</div>
      </div>
      {onRegen ? (
        <Button variant="subtle" size="sm" onClick={onRegen} disabled={disabled} className="shrink-0">
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? "Writing…" : "Regenerate with AI"}
        </Button>
      ) : null}
    </div>
  );
}

function BiField({ label, value, onChange, multiline, rows = 3, busy, compact }: { label: string; value: Bi; onChange: (v: Bi) => void; multiline?: boolean; rows?: number; busy?: boolean; compact?: boolean }) {
  const id = useId();
  const field = (lang: "en" | "ar") => {
    const common = {
      id: `${id}-${lang}`,
      dir: lang === "ar" ? "rtl" : "ltr",
      lang,
      value: value[lang],
      className: cn(lang === "ar" && "font-arabic", busy && "animate-shimmer bg-[linear-gradient(90deg,#fff_0%,#EFFCFA_50%,#fff_100%)] bg-[length:200%_100%] text-navy-900/40"),
    } as const;
    return multiline ? (
      <Textarea {...common} rows={rows} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} className={cn(common.className, "resize-y leading-relaxed")} />
    ) : (
      <Input {...common} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} />
    );
  };
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-navy-600">{label}</legend>
      <div className={cn("grid gap-2.5", compact && "gap-2")}>
        <div className="relative">
          <span className="pointer-events-none absolute -top-2 end-2 z-[1] rounded bg-white px-1 text-[9.5px] font-bold tracking-wider text-muted">EN</span>
          <label htmlFor={`${id}-en`} className="sr-only">{label} (English)</label>
          {field("en")}
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute -top-2 start-2 z-[1] rounded bg-white px-1 text-[9.5px] font-bold tracking-wider text-muted">AR</span>
          <label htmlFor={`${id}-ar`} className="sr-only">{label} (Arabic)</label>
          {field("ar")}
        </div>
      </div>
    </fieldset>
  );
}

function CertEditor({ certs, onChange }: { certs: string[]; onChange: (c: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || certs.includes(v)) return;
    onChange([...certs, v]);
    setDraft("");
    toast.success("Standard added to the site");
  };
  return (
    <div className="border-t border-line pt-5">
      <div className="text-sm font-semibold text-navy-900">Quality & standards</div>
      <div className="text-xs text-muted">List only what you can evidence — state “planned” or “in progress” honestly.</div>
      <ul className="mt-3 space-y-2">
        {certs.map((c) => (
          <li key={c} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-navy-800">
            <span className="min-w-0 truncate">{c}</span>
            <button className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${c}`} onClick={() => onChange(certs.filter((x) => x !== c))}><X className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="New standard or certification" placeholder="e.g. BSCI audit — scheduled Q3" />
        <Button type="submit" variant="outline" disabled={!draft.trim()}><Plus /> Add</Button>
      </form>
    </div>
  );
}

function Segmented<V extends string>({ value, onChange, options, ariaLabel }: { value: V; onChange: (v: V) => void; ariaLabel: string; options: { v: V; l: React.ReactNode; title?: string; className?: string }[] }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-card">
      {options.map((o) => (
        <button
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          title={o.title}
          aria-label={o.title}
          onClick={() => onChange(o.v)}
          className={cn("relative inline-flex h-8 min-w-9 items-center justify-center rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", value === o.v ? "text-white" : "text-navy-600 hover:text-navy-900", o.className)}
        >
          {value === o.v && <motion.span layoutId={`seg-${ariaLabel}`} className="absolute inset-0 rounded-lg bg-navy-900" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative">{o.l}</span>
        </button>
      ))}
    </div>
  );
}
