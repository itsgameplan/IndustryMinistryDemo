"use client";

// Service 11 — AI-Powered Brand Identity & Content Development.
// Compact AI brand studio: positioning, bilingual taglines, tone of voice, social posts and catalogue
// copy, with a live typographic brand preview. Can push the chosen tagline to the Jahez website.
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Bookmark, Check, Compass, Globe, Heart, Languages, Lock, MessageCircle, MessageSquare, Mic2, Package, Plus, Quote, RefreshCw, Repeat2, Send, Share2, Sparkles, Star, ThumbsUp, Trash2, Type, Wand2 } from "lucide-react";
import { AIInsight, EditableText, Panel, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Factory } from "@/lib/types";
import { brandPackFor, ctaFor, describeVoice, type Bi, type BrandPack, type Channel, type Lang, type Palette, type VoiceAxis } from "./brand-content";
import { Segmented, WritingShimmer, useSimulatedAI } from "./shared";

// ---------------- Types & seed ----------------
interface TaglineItem extends Bi { id: string }
interface BrandData {
  statement: Bi;
  statementVersion: number;
  pillars: { id: string; title: string; body: string }[];
  audiences: { id: string; name: string; need: string }[];
  taglines: TaglineItem[];
  favourite: string;
  tagVersion: number;
  voice: Record<VoiceAxis, number>;
  posts: Record<Channel, { text: Bi; version: number }>;
  postLang: Lang;
  catalogue: { id: string; name: Bi; text: Bi; version: number }[];
  palette: string;
}

const CHANNELS: Channel[] = ["linkedin", "facebook", "instagram"];
const CHANNEL_LABEL: Record<Channel, string> = { linkedin: "LinkedIn", facebook: "Facebook", instagram: "Instagram" };

const withCta = (b: Bi, voice: Record<VoiceAxis, number>): Bi => ({ en: `${b.en}\n\n${ctaFor(voice, "en")}`, ar: `${b.ar}\n\n${ctaFor(voice, "ar")}` });

function seed(factory: Factory): BrandData {
  const pack = brandPackFor(factory);
  const tags = pack.taglines[0].map((t, i) => ({ id: `t0-${i}`, ...t }));
  return {
    statement: pack.statements[0],
    statementVersion: 0,
    pillars: pack.pillars.map((p, i) => ({ id: `p${i}`, ...p })),
    audiences: pack.audiences.map((a, i) => ({ id: `a${i}`, ...a })),
    taglines: tags,
    favourite: tags[0].id,
    tagVersion: 0,
    voice: { ...pack.voice },
    posts: Object.fromEntries(CHANNELS.map((c) => [c, { text: withCta(pack.posts[c][0], pack.voice), version: 0 }])) as BrandData["posts"],
    postLang: "en",
    catalogue: pack.products.map((p) => ({ id: p.id, name: p.name, text: p.copy[0], version: 0 })),
    palette: pack.palettes[0].id,
  };
}

const VOICE_AXES: { id: VoiceAxis; left: string; right: string }[] = [
  { id: "formal", left: "Friendly", right: "Formal" },
  { id: "technical", left: "Simple", right: "Technical" },
  { id: "bold", left: "Understated", right: "Bold" },
  { id: "modern", left: "Heritage", right: "Modern" },
];

// ---------------- Brand preview art ----------------
function BrandPattern({ kind, color, className }: { kind: BrandPack["pattern"]; color: string; className?: string }) {
  if (kind === "knit") {
    return (
      <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 14 }, (_, col) => (
            <path key={`${row}-${col}`} d={`M${col * 16 - 4 + (row % 2) * 8} ${row * 16} l8 9 l8 -9`} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.18 + ((row + col) % 4) * 0.08} />
          ))
        )}
      </svg>
    );
  }
  if (kind === "disc") {
    return (
      <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[16, 30, 44, 58, 72].map((r, i) => <circle key={r} cx="160" cy="60" r={r} fill="none" stroke={color} strokeWidth={i === 0 ? 6 : 1.4} opacity={0.5 - i * 0.07} />)}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={160 + Math.cos(a) * 34} y1={60 + Math.sin(a) * 34} x2={160 + Math.cos(a) * 54} y2={60 + Math.sin(a) * 54} stroke={color} strokeWidth="2" opacity="0.35" strokeLinecap="round" />;
        })}
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {Array.from({ length: 9 }, (_, r) => Array.from({ length: 15 }, (_, c) => <circle key={`${r}-${c}`} cx={c * 14 + 4} cy={r * 14 + 4} r={(r + c) % 5 === 0 ? 2.4 : 1.2} fill={color} opacity="0.35" />))}
    </svg>
  );
}

function Monogram({ initials, palette, size = 32 }: { initials: string; palette: Palette; size?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center overflow-hidden rounded-lg font-semibold tracking-tight text-white" style={{ width: size, height: size, backgroundColor: palette.primary, fontSize: size * 0.38 }} aria-hidden>
      <span className="absolute -bottom-1/3 -end-1/3 size-full rotate-45 rounded-md" style={{ backgroundColor: palette.accent, opacity: 0.55 }} />
      <span className="relative">{initials}</span>
    </span>
  );
}

// ---------------- Component ----------------
export default function BrandIdentity({ service }: WorkspaceProps) {
  const { factory, factoryId, data, setData, reset } = useServiceWorkspace<BrandData>(service.id, seed);
  const { state } = useActiveFactory();
  const { busy, run } = useSimulatedAI();
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const industryLabel = isAr ? (factory.industryAr || factory.industry) : factory.industry;
  const [tab, setTab] = useState("positioning");
  const pack = brandPackFor(factory);
  const palette = pack.palettes.find((p) => p.id === data.palette) ?? pack.palettes[0];
  const fav = data.taglines.find((t) => t.id === data.favourite) ?? data.taglines[0];
  const voiceDesc = describeVoice(data.voice);

  // Website link
  const websiteUnlocked = state.unlockedSolutions.includes("website");
  const website = state.website;
  const liveOnSite = Boolean(website && fav && website.heroTitle.en === fav.en && website.heroTitle.ar === fav.ar);
  const applyToWebsite = () => {
    const current = useJahez.getState().factories[factoryId]?.website;
    if (!current || !fav) return;
    useJahez.getState().setWebsite(factoryId, { ...current, heroTitle: { en: fav.en, ar: fav.ar } });
    toast.success(t("Tagline applied to your website hero"), { description: t("Open the AI Website Builder to review and publish.") });
  };

  // Generators
  const regenStatement = () => run("statement", () => setData((d) => { const v = d.statementVersion + 1; return { ...d, statementVersion: v, statement: pack.statements[v % pack.statements.length] }; }));
  const regenTaglines = () =>
    run("taglines", () =>
      setData((d) => {
        const v = d.tagVersion + 1;
        const set = pack.taglines[v % pack.taglines.length].map((t, i) => ({ id: `t${v}-${i}`, ...t }));
        const keep = d.taglines.find((t) => t.id === d.favourite);
        const list = keep && !set.some((t) => t.en === keep.en) ? [keep, ...set] : set;
        return { ...d, tagVersion: v, taglines: list, favourite: keep && list.includes(keep) ? keep.id : list[0].id };
      })
    );
  const regenPost = (c: Channel) =>
    run(`post-${c}`, () =>
      setData((d) => {
        const v = d.posts[c].version + 1;
        return { ...d, posts: { ...d.posts, [c]: { version: v, text: withCta(pack.posts[c][v % pack.posts[c].length], d.voice) } } };
      })
    );
  const regenAllPosts = () =>
    run("posts-all", () =>
      setData((d) => ({ ...d, posts: Object.fromEntries(CHANNELS.map((c) => { const v = d.posts[c].version + 1; return [c, { version: v, text: withCta(pack.posts[c][v % pack.posts[c].length], d.voice) }]; })) as BrandData["posts"] }))
    );
  const regenProduct = (id: string) =>
    run(`cat-${id}`, () =>
      setData((d) => ({ ...d, catalogue: d.catalogue.map((p) => { if (p.id !== id) return p; const src = pack.products.find((x) => x.id === id); const v = p.version + 1; return src ? { ...p, version: v, text: src.copy[v % src.copy.length] } : p; }) }))
    );

  const setBi = (b: Bi, lang: Lang, v: string): Bi => ({ ...b, [lang]: v });
  const handle = `@${pack.wordmark.en.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")}`;
  const lang = data.postLang;
  const rtl = lang === "ar";

  return (
    <WorkspaceFrame service={service} onReset={reset}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------------- Studio ---------------- */}
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList>
                <TabsTrigger value="positioning"><Compass /> {t("Positioning")}</TabsTrigger>
                <TabsTrigger value="taglines"><Quote /> {t("Taglines")}</TabsTrigger>
                <TabsTrigger value="voice"><Mic2 /> {t("Voice")}</TabsTrigger>
                <TabsTrigger value="social"><Share2 /> {t("Social")}</TabsTrigger>
                <TabsTrigger value="catalogue"><Package /> {t("Catalogue")}</TabsTrigger>
              </TabsList>
            </div>

            {/* Positioning */}
            <TabsContent value="positioning" className="mt-4 space-y-4 focus-visible:outline-none">
              <Panel title={t("Positioning statement")} description={t("Who you serve, what you offer and why buyers should believe it.")} actions={<Button size="sm" variant="outline" onClick={regenStatement} disabled={busy !== null}><Wand2 /> {busy === "statement" ? t("Writing…") : t("Regenerate")}</Button>}>
                {busy === "statement" ? <WritingShimmer lines={4} /> : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("English")}</div>
                      <EditableText multiline value={data.statement.en} onChange={(v) => setData((d) => ({ ...d, statement: setBi(d.statement, "en", v) }))} ariaLabel={t("positioning statement (English)")} className="-ms-2 text-[15px] leading-relaxed text-navy-900" />
                    </div>
                    <div dir="rtl" lang="ar">
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">العربية</div>
                      <EditableText multiline value={data.statement.ar} onChange={(v) => setData((d) => ({ ...d, statement: setBi(d.statement, "ar", v) }))} ariaLabel={t("positioning statement (Arabic)")} className="-ms-2 text-start font-arabic text-[15px] leading-loose text-navy-900" />
                    </div>
                  </div>
                )}
              </Panel>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-navy-900">{t("Value pillars")}</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {data.pillars.map((p, i) => (
                    <div key={p.id} className="relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-card">
                      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: i === 0 ? palette.primary : i === 1 ? palette.accent : palette.dark }} />
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Pillar {n}", { n: i + 1 })}</div>
                      <EditableText value={t(p.title)} onChange={(v) => setData((d) => ({ ...d, pillars: d.pillars.map((x) => (x.id === p.id ? { ...x, title: v } : x)) }))} ariaLabel={t("pillar {n} title", { n: i + 1 })} className="-ms-2 mt-1 font-semibold text-navy-900" />
                      <EditableText multiline value={t(p.body)} onChange={(v) => setData((d) => ({ ...d, pillars: d.pillars.map((x) => (x.id === p.id ? { ...x, body: v } : x)) }))} ariaLabel={t("pillar {n} description", { n: i + 1 })} className="-ms-2 text-sm text-navy-700" />
                    </div>
                  ))}
                </div>
              </div>
              <Panel title={t("Target audiences")} bodyClassName="p-0">
                <ul className="divide-y divide-line">
                  {data.audiences.map((a, i) => (
                    <li key={a.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex items-center gap-2 sm:w-52 sm:shrink-0">
                        <span className="grid size-6 place-items-center rounded-full bg-navy-900/5 text-[11px] font-bold text-navy-700">{i + 1}</span>
                        <EditableText value={t(a.name)} onChange={(v) => setData((d) => ({ ...d, audiences: d.audiences.map((x) => (x.id === a.id ? { ...x, name: v } : x)) }))} ariaLabel={t("audience name")} className="font-medium text-navy-900" />
                      </div>
                      <EditableText value={t(a.need)} onChange={(v) => setData((d) => ({ ...d, audiences: d.audiences.map((x) => (x.id === a.id ? { ...x, need: v } : x)) }))} ariaLabel={t("audience need")} className="text-sm text-muted" />
                    </li>
                  ))}
                </ul>
              </Panel>
            </TabsContent>

            {/* Taglines */}
            <TabsContent value="taglines" className="mt-4 space-y-3 focus-visible:outline-none">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">{websiteUnlocked ? t("Pick a favourite — it drives the live preview and can be pushed to your website.") : t("Pick a favourite — it drives the live preview.")}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setData((d) => { const id = `c${Date.now().toString(36)}`; return { ...d, taglines: [...d.taglines, { id, en: "Your tagline here", ar: "شعارك هنا" }] }; })}><Plus /> {t("Add")}</Button>
                  <Button size="sm" variant="outline" onClick={regenTaglines} disabled={busy !== null}><Sparkles /> {busy === "taglines" ? t("Generating…") : t("Generate new set")}</Button>
                </div>
              </div>
              {busy === "taglines" ? <div className="rounded-2xl border border-line bg-white p-6"><WritingShimmer lines={4} /></div> : (
                <div role="radiogroup" aria-label={t("Favourite tagline")} className="grid gap-3 md:grid-cols-2">
                  {data.taglines.map((tg) => {
                    const active = tg.id === data.favourite;
                    return (
                      <motion.div layout={!reduce} key={tg.id} className={cn("group relative rounded-2xl border bg-white p-4 shadow-card transition", active ? "border-teal-400 ring-2 ring-teal-100" : "border-line")}>
                        <div className="flex items-start gap-3">
                          <button type="button" role="radio" aria-checked={active} aria-label={t("Choose “{tagline}” as favourite", { tagline: isAr ? tg.ar : tg.en })} onClick={() => setData((d) => ({ ...d, favourite: tg.id }))} className={cn("mt-1 grid size-6 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", active ? "border-teal-500 bg-teal-500 text-white" : "border-line text-transparent hover:border-teal-300")}>
                            <Star className="size-3.5 fill-current" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <EditableText value={tg.en} onChange={(v) => setData((d) => ({ ...d, taglines: d.taglines.map((x) => (x.id === tg.id ? { ...x, en: v } : x)) }))} ariaLabel={t("tagline (English)")} className="-ms-2 text-base font-semibold tracking-tight text-navy-900" />
                            <div dir="rtl" lang="ar">
                              <EditableText value={tg.ar} onChange={(v) => setData((d) => ({ ...d, taglines: d.taglines.map((x) => (x.id === tg.id ? { ...x, ar: v } : x)) }))} ariaLabel={t("tagline (Arabic)")} className="-ms-2 text-start font-arabic text-navy-700" />
                            </div>
                          </div>
                          {!active && data.taglines.length > 1 ? (
                            <Button variant="ghost" size="icon" className="size-7 opacity-60 hover:opacity-100" aria-label={t("Remove tagline “{tagline}”", { tagline: isAr ? tg.ar : tg.en })} onClick={() => setData((d) => ({ ...d, taglines: d.taglines.filter((x) => x.id !== tg.id) }))}><Trash2 className="!size-3.5" /></Button>
                          ) : null}
                        </div>
                        {active ? <StatusPill tone="good" className="absolute -top-2 end-4"><Check /> {t("Favourite")}</StatusPill> : null}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Voice */}
            <TabsContent value="voice" className="mt-4 focus-visible:outline-none">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <Panel title={t("Tone of voice")} description={t("Adjust the sliders — regenerated posts follow this voice.")}>
                  <div className="space-y-5">
                    {VOICE_AXES.map((ax) => (
                      <div key={ax.id}>
                        <div className="mb-1.5 flex justify-between text-xs font-medium">
                          <span className={cn(data.voice[ax.id] < 50 ? "text-navy-900" : "text-muted")}>{t(ax.left)}</span>
                          <span className={cn(data.voice[ax.id] >= 50 ? "text-navy-900" : "text-muted")}>{t(ax.right)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={data.voice[ax.id]}
                          aria-label={t("{from} to {to}", { from: t(ax.left), to: t(ax.right) })}
                          aria-valuetext={t("{value} of 100", { value: data.voice[ax.id] })}
                          onChange={(e) => { const n = Number(e.target.value); setData((d) => ({ ...d, voice: { ...d.voice, [ax.id]: n } })); }}
                          className="w-full cursor-pointer accent-teal-600"
                        />
                      </div>
                    ))}
                  </div>
                </Panel>
                <div className="space-y-4">
                  <div className="rounded-2xl p-5 text-white shadow-card" style={{ background: `linear-gradient(135deg, ${palette.dark}, ${palette.primary})` }}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("Our voice is")}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {voiceDesc.words.map((w) => <span key={w} className="rounded-full bg-white/15 px-2.5 py-1 text-sm font-medium">{t(w)}</span>)}
                    </div>
                    <p className="mt-4 text-sm text-white/80">{t("Sample:")} {isAr ? <span className="font-arabic">«{ctaFor(data.voice, "ar")}»</span> : <>“{ctaFor(data.voice, "en")}”</>}</p>
                    <p className={cn("mt-1 text-sm text-white/80", !isAr && "font-arabic")} dir={isAr ? "ltr" : "rtl"} lang={isAr ? "en" : "ar"}>{isAr ? <>“{ctaFor(data.voice, "en")}”</> : <>«{ctaFor(data.voice, "ar")}»</>}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{t("Do")}</div>
                      <ul className="mt-2 space-y-1.5 text-sm text-navy-800">{voiceDesc.doList.map((x) => <li key={x} className="flex gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />{t(x)}</li>)}</ul>
                    </div>
                    <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-red-700">{t("Don’t")}</div>
                      <ul className="mt-2 space-y-1.5 text-sm text-navy-800">{voiceDesc.dontList.map((x) => <li key={x} className="flex gap-1.5"><span className="mt-[7px] h-px w-2.5 shrink-0 bg-red-500" />{t(x)}</li>)}</ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Social */}
            <TabsContent value="social" className="mt-4 space-y-3 focus-visible:outline-none">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Segmented ariaLabel={t("Post language")} size="sm" value={lang} onChange={(v) => setData((d) => ({ ...d, postLang: v }))} options={[{ value: "en", label: <><Languages className="me-1 inline size-3.5" />English</> }, { value: "ar", label: "العربية", className: "font-arabic" }]} />
                <Button size="sm" variant="outline" onClick={regenAllPosts} disabled={busy !== null}><RefreshCw className={cn(busy === "posts-all" && "animate-spin motion-reduce:animate-none")} /> {t("Regenerate all")}</Button>
              </div>
              <div className="grid gap-4 xl:grid-cols-3">
                {CHANNELS.map((c) => {
                  const post = data.posts[c];
                  const writing = busy === `post-${c}` || busy === "posts-all";
                  const body = writing ? <WritingShimmer lines={3} className="py-2" /> : (
                    <div dir={rtl ? "rtl" : "ltr"} lang={lang}>
                      <EditableText multiline value={post.text[lang]} onChange={(v) => setData((d) => ({ ...d, posts: { ...d.posts, [c]: { ...d.posts[c], text: setBi(d.posts[c].text, lang, v) } } }))} ariaLabel={t("{channel} post", { channel: CHANNEL_LABEL[c] })} className={cn("text-start text-[13px] leading-relaxed text-[#1B2230]", rtl && "font-arabic", "-ms-2")} />
                    </div>
                  );
                  return (
                    <div key={c} className="flex min-w-0 flex-col">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{CHANNEL_LABEL[c]}</span>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => regenPost(c)} disabled={busy !== null}><Wand2 /> {t("Regenerate")}</Button>
                      </div>
                      {c === "linkedin" ? (
                        <div className="flex-1 overflow-hidden rounded-xl border border-[#E0DFDC] bg-white">
                          <div className="flex items-center gap-2.5 p-3">
                            <Monogram initials={pack.initials} palette={palette} size={40} />
                            <div className="min-w-0 text-xs">
                              <div className="truncate font-semibold text-[#1B2230]">{pack.wordmark.en}</div>
                              <div className="text-[#666]">{industryLabel} · {t("1d")} · <Globe className="inline size-3" /></div>
                            </div>
                          </div>
                          <div className="px-3">{body}</div>
                          <div className="relative mt-2 h-28 overflow-hidden" style={{ backgroundColor: palette.dark }}>
                            <BrandPattern kind={pack.pattern} color={palette.accent} className="absolute inset-0 size-full" />
                            <div className={cn("relative flex h-full items-end p-3 text-sm font-semibold text-white", rtl && "justify-end font-arabic")} dir={rtl ? "rtl" : "ltr"}>{fav?.[lang]}</div>
                          </div>
                          <div className="grid grid-cols-4 border-t border-[#E0DFDC] text-[11px] font-medium text-[#666]">
                            {[[ThumbsUp, "Like"], [MessageSquare, "Comment"], [Repeat2, "Repost"], [Send, "Send"]].map(([I, l]) => { const Icon = I as typeof ThumbsUp; return <span key={l as string} className="flex items-center justify-center gap-1 py-2"><Icon className="size-3.5" />{t(l as string)}</span>; })}
                          </div>
                        </div>
                      ) : c === "facebook" ? (
                        <div className="flex-1 overflow-hidden rounded-xl border border-[#DADDE1] bg-white">
                          <div className="flex items-center gap-2.5 p-3">
                            <span className="rounded-full"><Monogram initials={pack.initials} palette={palette} size={36} /></span>
                            <div className="min-w-0 text-xs">
                              <div className="truncate font-semibold text-[#1B2230]">{pack.wordmark.en}</div>
                              <div className="text-[#65676B]">{t("2h")} · <Globe className="inline size-3" /></div>
                            </div>
                          </div>
                          <div className="px-3">{body}</div>
                          <div className="mt-2 grid h-32 place-items-center px-4 text-center" style={{ backgroundColor: palette.soft }}>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: palette.primary }}>{t(factory.governorate || "Egypt")}</div>
                              <div className={cn("mt-1 text-lg font-semibold leading-tight", rtl && "font-arabic")} style={{ color: palette.dark }} dir={rtl ? "rtl" : "ltr"}>{pack.wordmark[lang]}</div>
                              <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ backgroundColor: palette.accent }} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-[#DADDE1] px-3 py-2 text-[11px] text-[#65676B]">
                            <span className="flex items-center gap-1"><ThumbsUp className="size-3.5" /> 48</span>
                            <span>{t("{comments} comments · {shares} shares", { comments: 6, shares: 3 })}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-hidden rounded-xl border border-[#DBDBDB] bg-white">
                          <div className="flex items-center gap-2 p-2.5">
                            <span className="rounded-full p-[2px]" style={{ background: `linear-gradient(45deg, ${palette.accent}, ${palette.primary})` }}><span className="block rounded-full bg-white p-[1.5px]"><Monogram initials={pack.initials} palette={palette} size={26} /></span></span>
                            <span className="truncate text-xs font-semibold text-[#1B2230]">{handle}</span>
                          </div>
                          <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: palette.primary }}>
                            <BrandPattern kind={pack.pattern} color="#ffffff" className="absolute inset-0 size-full" />
                            <div className="absolute inset-0 flex flex-col justify-end p-4" dir={rtl ? "rtl" : "ltr"}>
                              <span className="mb-2 h-1 w-8 rounded-full" style={{ backgroundColor: palette.accent }} />
                              <div className={cn("text-xl font-semibold leading-tight text-white", rtl && "font-arabic")}>{fav?.[lang]}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 px-3 pt-2.5 text-[#1B2230]"><Heart className="size-4" /><MessageCircle className="size-4" /><Send className="size-4" /><Bookmark className="ms-auto size-4" /></div>
                          <div className="px-3 pb-2 pt-1 text-[11px] font-semibold text-[#1B2230]">{t("{count} likes", { count: 212 })}</div>
                          <div className="px-3 pb-3">{body}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Catalogue */}
            <TabsContent value="catalogue" className="mt-4 space-y-3 focus-visible:outline-none">
              {data.catalogue.map((p, i) => {
                const writing = busy === `cat-${p.id}`;
                return (
                  <div key={p.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: i % 2 ? palette.dark : palette.primary }}>{String(i + 1).padStart(2, "0")}</span>
                        <div className="min-w-0">
                          <div className={cn("truncate font-semibold text-navy-900", isAr && "font-arabic")}>{isAr ? p.name.ar : p.name.en}</div>
                          <div className={cn("truncate text-xs text-muted", !isAr && "font-arabic")} dir={isAr ? "ltr" : "rtl"} lang={isAr ? "en" : "ar"}>{isAr ? p.name.en : p.name.ar}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => regenProduct(p.id)} disabled={busy !== null}><Wand2 /> {writing ? t("Writing…") : t("Rewrite")}</Button>
                    </div>
                    <div className="grid gap-4 p-4 md:grid-cols-2">
                      {writing ? <><WritingShimmer lines={3} /><WritingShimmer lines={3} /></> : (
                        <>
                          <EditableText multiline value={p.text.en} onChange={(v) => setData((d) => ({ ...d, catalogue: d.catalogue.map((x) => (x.id === p.id ? { ...x, text: setBi(x.text, "en", v) } : x)) }))} ariaLabel={t("{name} description (English)", { name: isAr ? p.name.ar : p.name.en })} className="-ms-2 text-sm leading-relaxed text-navy-800" />
                          <div dir="rtl" lang="ar">
                            <EditableText multiline value={p.text.ar} onChange={(v) => setData((d) => ({ ...d, catalogue: d.catalogue.map((x) => (x.id === p.id ? { ...x, text: setBi(x.text, "ar", v) } : x)) }))} ariaLabel={t("{name} description (Arabic)", { name: isAr ? p.name.ar : p.name.en })} className="-ms-2 text-start font-arabic text-sm leading-loose text-navy-800" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>

        {/* ---------------- Live preview ---------------- */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label={t("Live brand preview")}>
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
            <div className="flex items-center gap-1.5 border-b border-line bg-canvas px-3 py-2">
              <span className="size-2 rounded-full bg-red-300" /><span className="size-2 rounded-full bg-amber-300" /><span className="size-2 rounded-full bg-emerald-300" />
              <span className="ms-2 truncate text-[10px] text-muted">{t("Live brand preview")}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: palette.soft }}>
              <div className="flex min-w-0 items-center gap-2">
                <Monogram initials={pack.initials} palette={palette} size={24} />
                <span className="truncate text-xs font-semibold" style={{ color: palette.dark }}>{isAr ? pack.wordmark.ar : pack.wordmark.en}</span>
              </div>
              <span className="rounded-md px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: palette.primary }}>{t("Request a quote")}</span>
            </div>
            <div className="relative overflow-hidden px-5 pb-6 pt-7" style={{ backgroundColor: palette.dark }}>
              <BrandPattern kind={pack.pattern} color={palette.accent} className="absolute inset-0 size-full opacity-70" />
              <div className="relative">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.accent }}>{industryLabel}</div>
                <AnimatePresence mode="wait">
                  <motion.div key={fav?.id + (fav?.en ?? "")} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
                    <h2 className={cn("mt-2 text-[22px] font-semibold leading-tight tracking-tight text-white", isAr && "font-arabic")}>{isAr ? fav?.ar : fav?.en}</h2>
                    <p className={cn("mt-2 text-base leading-relaxed text-white/80", !isAr && "font-arabic")} dir={isAr ? "ltr" : "rtl"} lang={isAr ? "en" : "ar"}>{isAr ? fav?.en : fav?.ar}</p>
                  </motion.div>
                </AnimatePresence>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-md px-3 py-1.5 text-[11px] font-semibold" style={{ backgroundColor: palette.accent, color: palette.dark }}>{t("View products")}</span>
                  <span className="rounded-md border border-white/30 px-3 py-1.5 text-[11px] font-semibold text-white">{t("Contact")}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-line rtl:divide-x-reverse border-b border-line text-center">
              {data.pillars.map((p) => <div key={p.id} className="px-2 py-2.5 text-[10px] font-semibold leading-tight" style={{ color: palette.dark }}>{t(p.title)}</div>)}
            </div>
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-navy-900"><span>{t("Palette")}</span><span className="font-normal text-muted">{t(palette.name)}</span></div>
              <div role="radiogroup" aria-label={t("Brand palette")} className="grid grid-cols-3 gap-2">
                {pack.palettes.map((p) => {
                  const active = p.id === palette.id;
                  return (
                    <button key={p.id} type="button" role="radio" aria-checked={active} aria-label={t(p.name)} onClick={() => setData((d) => ({ ...d, palette: p.id }))} className={cn("rounded-xl border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", active ? "border-navy-900 shadow-sm" : "border-line hover:border-navy-500/40")}>
                      <div className="flex h-8 overflow-hidden rounded-lg">
                        {[p.dark, p.primary, p.accent, p.soft].map((c) => <span key={c} className="flex-1" style={{ backgroundColor: c }} />)}
                      </div>
                      <div className="mt-1 truncate text-[10px] font-medium text-navy-700">{t(p.name)}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {[palette.dark, palette.primary, palette.accent, palette.soft].map((c) => <span key={c} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-navy-700">{c}</span>)}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><Type className="size-3.5" /> {t("Typography: geometric sans · Arabic:")} <span className="font-arabic">خط عربي حديث</span></div>
            </div>
          </div>

          {/* Website link */}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Globe className="size-4 text-teal-600" /> {t("Website hero")}</div>
            {websiteUnlocked && website ? (
              <>
                <p className="mt-1 text-xs text-muted">{t("Push the favourite tagline to the hero title of your Jahez website (EN + AR).")}</p>
                <div className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs text-navy-700"><span className="text-muted">{t("Current:")} </span>{isAr ? website.heroTitle.ar : website.heroTitle.en}</div>
                {liveOnSite ? (
                  <StatusPill tone="good" className="mt-3"><Check /> {t("Live on website hero")}</StatusPill>
                ) : (
                  <Button size="sm" variant="accent" className="mt-3 w-full" onClick={applyToWebsite}><Sparkles /> {t("Apply tagline to website")}</Button>
                )}
              </>
            ) : websiteUnlocked ? (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted"><Lock className="mt-0.5 size-3.5 shrink-0" /> {t("Open the AI Website Builder once to create your site, then come back to apply this tagline to its hero.")}</p>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted"><Lock className="mt-0.5 size-3.5 shrink-0" /> {t("Available once the AI Website solution is deployed for {name}. Taglines can then be applied to the website hero in one click.", { name: isAr ? (factory.nameAr || factory.name) : factory.name })}</p>
            )}
          </div>

          <AIInsight title={t("Brand agent")}>
            {t(pack.pattern === "knit" ? "Lead export conversations with durability proof (wash-cycle tests) — it is the claim buyers trust most for cotton basics." : pack.pattern === "disc" ? "OEM buyers respond to evidence: pair the tagline with traceability and audit results rather than adjectives." : "Keep one tagline across website, social and catalogue for at least a year — consistency builds recognition faster than variety.")}
            {" "}<Badge tone="outline" className="ms-1 align-middle">{voiceDesc.words.slice(0, 2).map((w) => t(w)).join(" · ")}</Badge>
          </AIInsight>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}
