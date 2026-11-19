"use client";

import { useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, BadgeCheck, BarChart3, Bot, Boxes, CalendarDays, ChevronDown, ClipboardList, Compass, FileCheck2, FileText, Gauge, Globe2, GraduationCap,
  Inbox, LayoutGrid, Layers, Link2, List, Loader2, Megaphone, MessageSquareText, Palette, Plus, Presentation, Radar, Route, Scale, Search, Settings, Shield,
  ShieldCheck, Sparkles, Target, Users, Workflow, X, type LucideIcon,
} from "lucide-react";
import { CountUp } from "@/components/product/dashboard-kit";
import { CategoryIcon } from "@/components/services/kit";
import { SERVICE_CATEGORIES, SERVICE_LIST, SERVICES, categoryOf, isServiceId } from "@/lib/data/services";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ServiceCategoryId, ServiceDefinition, ServiceId, ServiceRequest } from "@/lib/types";
import type { ServiceRecommendation } from "@/lib/recommendations";
import { RequestServiceDialog } from "./request-dialog";
import { ServiceDrawer } from "./service-drawer";
import { LiveBuildProgress, formatDate, formatMonthLabel, shortTimeline, ServiceTitle, useLocalName, useMarketplace, type ServiceStatus } from "./shared";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Teal · violet · blue, rotated across cards like the reference design. */
const WAVE_COLORS = ["#14B8A6", "#8B5CF6", "#3B82F6"] as const;
const waveColor = (s: ServiceDefinition) => WAVE_COLORS[(s.number - 1) % WAVE_COLORS.length];

const SERVICE_ICONS: Record<ServiceId, LucideIcon> = {
  "export-marketing": Globe2,
  "sales-chatbot": Bot,
  "crm-pipeline": BarChart3,
  traceability: Link2,
  "corporate-strategy": Target,
  "scenario-planning": Radar,
  "process-reengineering": Workflow,
  "process-mining": Route,
  "talent-workforce": GraduationCap,
  "hr-analytics": Users,
  "brand-identity": Palette,
  "brand-audit": MessageSquareText,
  "export-intelligence": Compass,
  "export-documentation": FileText,
  "enterprise-bi": Gauge,
  "data-governance": Scale,
  "bsc-design": Layers,
  "bsc-execution": Boxes,
  "bsc-workshops": Presentation,
  "product-compliance": ShieldCheck,
  "technical-file": FileCheck2,
};

const HERO_TILES: { label: string; category: ServiceCategoryId; icon: LucideIcon }[] = [
  { label: "Marketing", category: "marketing-sales-export", icon: Megaphone },
  { label: "Strategy", category: "strategy", icon: Layers },
  { label: "Operations", category: "bpr", icon: Settings },
  { label: "Compliance", category: "product-compliance", icon: Shield },
];

type Readiness = "any" | "ready" | "prep";
type StatusFilter = "any" | "recommended" | "available" | "deploying" | "installed";
type View = "grid" | "list";

export function Marketplace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const m = useMarketplace();
  const { factory, state, recs, recById, statusOf } = m;
  const t = useT();
  const localName = useLocalName();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ServiceCategoryId | "all">("all");
  const [readiness, setReadiness] = useState<Readiness>("any");
  const [status, setStatus] = useState<StatusFilter>(tabParam === "installed" ? "installed" : tabParam === "recommended" ? "recommended" : "any");
  const [view, setView] = useState<View>("grid");
  const [drawer, setDrawer] = useState<{ id: ServiceId; open: boolean } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const showRequests = tabParam === "requests";
  const { locale, isRtl } = useLocale();
  const searchRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const recommendedCount = recs.filter((r) => r.recommended).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SERVICE_LIST.filter((s) => {
      const rec = recById.get(s.id);
      const st = statusOf(s.id);
      if (category !== "all" && s.category !== category) return false;
      if (readiness === "ready" && !rec?.ready) return false;
      if (readiness === "prep" && rec?.ready) return false;
      if (status === "recommended" && !rec?.recommended) return false;
      if (status !== "any" && status !== "recommended" && st !== status) return false;
      if (q && !`${s.name} ${s.nameAr} ${s.tagline} ${t(s.tagline)} ${categoryOf(s.category).name} ${categoryOf(s.category).nameAr}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category, readiness, status, recById, statusOf, t]);

  const groups = SERVICE_CATEGORIES.map((c) => ({ category: c, items: filtered.filter((s) => s.category === c.id) })).filter((g) => g.items.length);
  const active = query || category !== "all" || readiness !== "any" || status !== "any";

  const scrollToToolbar = () => toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const clearTab = () => router.replace(pathname, { scroll: false });
  const open = (sid: ServiceId) => (statusOf(sid) === "installed" ? router.push(SERVICES[sid].route) : setDrawer({ id: sid, open: true }));

  return (
    <div className="min-w-0">
      <Hero
        recommended={recommendedCount}
        installed={state.installedServices.length}
        onFind={() => { scrollToToolbar(); setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 400); }}
        onRequest={() => setCustomOpen(true)}
        onCategory={(c) => { setCategory(c); scrollToToolbar(); }}
      />

      {/* Toolbar */}
      <div ref={toolbarRef} className="sticky top-16 z-20 -mx-4 mt-6 scroll-mt-20 bg-canvas/85 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1 lg:max-w-sm">
            <span className="sr-only">{t("Search services")}</span>
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search services…")}
              className="h-11 w-full rounded-xl border border-line bg-white ps-10 pe-9 text-sm text-navy-900 shadow-sm outline-none transition placeholder:text-muted/70 focus:border-teal-300 focus:ring-4 focus:ring-teal-100"
            />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-navy-900"><X className="size-4" /></button> : null}
          </label>
          <div className="grid grid-cols-3 gap-2 lg:flex">
            <Select label={t("Category")} value={category} onChange={(v) => setCategory(v as ServiceCategoryId | "all")} options={[["all", t("All categories")], ...SERVICE_CATEGORIES.map((c) => [c.id, localName(c)] as [string, string])]} />
            <Select label={t("Readiness")} value={readiness} onChange={(v) => setReadiness(v as Readiness)} options={[["any", t("Any readiness")], ["ready", t("Ready now")], ["prep", t("Needs preparation")]]} />
            <Select label={t("Status")} value={status} onChange={(v) => setStatus(v as StatusFilter)} options={[["any", t("Any status")], ["recommended", t("Recommended")], ["available", t("Available")], ["deploying", t("Building")], ["installed", t("Installed")]]} />
          </div>
          <div className="flex items-center gap-2 lg:ms-auto">
            {active ? (
              <button type="button" onClick={() => { setQuery(""); setCategory("all"); setReadiness("any"); setStatus("any"); }} className="h-11 rounded-xl px-3 text-sm font-medium text-muted transition hover:text-navy-900">
                {t("Clear")}
              </button>
            ) : null}
            {state.serviceRequests.length ? (
              <button type="button" onClick={() => router.replace(`${pathname}?tab=requests`, { scroll: false })} className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-medium text-navy-800 shadow-sm transition hover:border-teal-300">
                <Inbox className="size-4" /> {state.serviceRequests.length}
              </button>
            ) : null}
            <div className="ms-auto inline-flex rounded-xl border border-line bg-white p-1 shadow-sm lg:ms-0" role="group" aria-label={t("Layout")}>
              {([["grid", LayoutGrid], ["list", List]] as const).map(([v, Icon]) => (
                <button key={v} type="button" aria-pressed={view === v} aria-label={v === "grid" ? t("Grid view") : t("List view")} onClick={() => setView(v)} className={cn("grid size-9 place-items-center rounded-lg transition", view === v ? "bg-canvas text-navy-900 shadow-sm" : "text-muted hover:text-navy-900")}>
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>{showRequests ? <RequestsPanel requests={state.serviceRequests} onClose={clearTab} onNew={() => setCustomOpen(true)} onOpen={open} /> : null}</AnimatePresence>

      {/* Groups */}
      <div className="mt-6 space-y-12">
        {groups.length ? (
          groups.map((g, gi) => (
            <section key={g.category.id} aria-labelledby={`cat-${g.category.id}`}>
              <motion.div initial={{ opacity: 0, x: isRtl ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 + gi * 0.06, ease: EASE }} className="mb-4 flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${g.category.accent}14`, color: g.category.accent }}>
                  <CategoryIcon icon={g.category.icon} className="size-5" />
                </span>
                <h2 id={`cat-${g.category.id}`} className="text-xl font-semibold tracking-tight text-navy-900 md:text-[22px]">{localName(g.category)}</h2>
              </motion.div>
              {view === "grid" ? (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {g.items.map((s, i) => <ServiceTile key={s.id} service={s} rec={recById.get(s.id)} status={statusOf(s.id)} index={Math.min(gi * 2 + i, 14)} onOpen={() => open(s.id)} />)}
                </div>
              ) : (
                <ul className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  {g.items.map((s) => <ServiceRow key={s.id} service={s} rec={recById.get(s.id)} status={statusOf(s.id)} onOpen={() => open(s.id)} />)}
                </ul>
              )}
            </section>
          ))
        ) : (
          <div className="grid place-items-center rounded-3xl border border-dashed border-line py-20 text-center">
            <Search className="size-6 text-muted" />
            <p className="mt-3 text-sm font-medium text-navy-900">{t("No services match")}</p>
            <button type="button" onClick={() => { setQuery(""); setCategory("all"); setReadiness("any"); setStatus("any"); }} className="mt-2 text-sm font-medium text-teal-700 hover:underline">{t("Clear filters")}</button>
          </div>
        )}
      </div>

      <p className="mt-14 text-center text-xs text-muted">{t("Simulated workspaces · pricing to be confirmed")}</p>

      <ServiceDrawer
        serviceId={drawer?.id ?? null}
        open={!!drawer?.open}
        onOpenChange={(o) => setDrawer((d) => (d ? { ...d, open: o } : d))}
        status={drawer ? statusOf(drawer.id) : "available"}
        rec={drawer ? recById.get(drawer.id) : undefined}
        factoryName={locale === "ar" ? (factory.nameAr ?? factory.name) : factory.name}
      />
      <RequestServiceDialog open={customOpen} onOpenChange={setCustomOpen} serviceId="custom" />
    </div>
  );
}

// ---------------- Hero ----------------
function Hero({ recommended, installed, onFind, onRequest, onCategory }: { recommended: number; installed: number; onFind: () => void; onRequest: () => void; onCategory: (c: ServiceCategoryId) => void }) {
  const reduce = useReducedMotion();
  const t = useT();
  const stats = [
    { label: "Services", value: SERVICE_LIST.length },
    { label: "Categories", value: SERVICE_CATEGORIES.length },
    { label: "Recommended", value: recommended },
    { label: "Installed", value: installed },
  ];
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-[#070F1F] px-6 py-8 text-white shadow-lift md:px-10 md:py-10">
      {/* Planet arc + light beam */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-[38%] top-[-40%] h-[180%] w-40 rotate-[28deg] bg-gradient-to-b from-sky-300/0 via-sky-200/40 to-violet-400/0 blur-2xl"
          animate={reduce ? undefined : { opacity: [0.5, 0.9, 0.5], x: [0, 24, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-[30%] top-[46%] size-[1100px] rounded-full"
          style={{
            background: "radial-gradient(circle at 50% 50%, #0A1530 58%, transparent 60%)",
            boxShadow: "0 -2px 40px 6px rgba(165,180,252,0.55), inset 0 10px 60px rgba(147,197,253,0.55), inset 0 2px 6px rgba(224,231,255,0.9)",
          }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-[30%] top-[46%] size-[1100px] rounded-full opacity-70 blur-xl"
          style={{ background: "conic-gradient(from 200deg, transparent 0deg, rgba(129,140,248,0.55) 40deg, rgba(56,189,248,0.4) 80deg, transparent 140deg)" }}
          animate={reduce ? undefined : { rotate: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_0%,rgba(15,163,150,0.18),transparent_60%)]" />
      </div>

      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <motion.span initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/85 ring-1 ring-white/10 backdrop-blur">
            <Sparkles className="size-3.5" /> {t("AI Consulting Services")}
          </motion.span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-[52px]">
            {["Build custom solutions", "in seconds"].map((line, i) => (
              <motion.span key={line} className={cn("block", i === 1 && "text-white/75")} initial={reduce ? false : { opacity: 0, y: 18, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, delay: 0.1 + i * 0.12, ease: EASE }}>
                {t(line)}
              </motion.span>
            ))}
          </h1>
          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }} className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={onFind} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-navy-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              <Plus className="size-4" /> {t("Find a service")}
            </button>
            <button type="button" onClick={onRequest} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/[0.06] px-6 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/[0.12]">
              <MessageSquareText className="size-4" /> {t("Request a solution")}
            </button>
          </motion.div>
        </div>

        <div className="lg:w-[460px]">
          <div className="grid grid-cols-4 gap-2.5">
            {HERO_TILES.map((tile, i) => (
              <motion.button
                key={tile.label}
                type="button"
                onClick={() => onCategory(tile.category)}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.5, ease: EASE }}
                whileHover={reduce ? undefined : { y: -4 }}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white/[0.07] px-2 py-4 text-[11px] font-medium text-white/90 ring-1 ring-white/10 backdrop-blur-md transition-colors hover:bg-white/[0.13] sm:text-xs"
              >
                <tile.icon className="size-5" />
                {t(tile.label)}
              </motion.button>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} className={cn("px-1 sm:px-3", i > 0 && "sm:border-s sm:border-white/15")}>
                <div className="text-2xl font-semibold tabular-nums"><CountUp value={s.value} /></div>
                <div className="mt-0.5 text-[11px] text-white/60 sm:text-xs">{t(s.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------- Flowing waves ----------------
function Waves({ color, intense }: { color: string; intense?: boolean }) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const layers = [
    { d: "M0,200 L0,150 C100,80 300,210 400,150 C500,80 700,210 800,150 L800,200 Z", o: intense ? 0.35 : 0.22, dur: 22 },
    { d: "M0,200 L0,110 C120,20 280,160 400,110 C520,20 680,160 800,110 L800,200 Z", o: intense ? 0.28 : 0.16, dur: 30 },
    { d: "M0,200 L0,70 C140,-10 260,120 400,70 C540,-10 660,120 800,70 L800,200 Z", o: intense ? 0.18 : 0.1, dur: 40 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 w-[68%] overflow-hidden [mask-image:linear-gradient(to_left,black_45%,transparent)] rtl:[mask-image:linear-gradient(to_right,black_45%,transparent)]">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={`w-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
      {layers.map((l, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 800 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-[115%] w-[200%] transition-transform duration-700 group-hover:-translate-y-2"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: l.dur, repeat: Infinity, ease: "linear" }}
        >
          <path d={l.d} fill={`url(#w-${gid})`} opacity={l.o} />
        </motion.svg>
      ))}
      <div className="absolute -bottom-10 -end-10 size-40 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-80" style={{ backgroundColor: color, opacity: intense ? 0.35 : 0.2 }} />
    </div>
  );
}

// ---------------- Cards ----------------
function ServiceTile({ service, rec, status, index, onOpen }: { service: ServiceDefinition; rec?: ServiceRecommendation; status: ServiceStatus; index: number; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const t = useT();
  const accent = recommendedColor(service, rec, status);
  const Icon = SERVICE_ICONS[service.id];
  const recommended = !!rec?.recommended && status !== "installed";
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.25 + index * 0.05, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4 }}
      className={cn(
        "group relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border bg-white p-5 text-start shadow-[0_1px_2px_rgba(11,31,58,0.04),0_10px_30px_-18px_rgba(11,31,58,0.25)] outline-none transition-shadow duration-300 hover:shadow-[0_2px_4px_rgba(11,31,58,0.05),0_24px_50px_-24px_rgba(11,31,58,0.35)] focus-visible:ring-4 focus-visible:ring-teal-100",
        recommended ? "border-teal-300" : "border-line/80"
      )}
      style={recommended ? { backgroundImage: "linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 55%)" } : undefined}
    >
      <Waves color={accent} intense={recommended} />
      <div className="relative flex items-center gap-2">
        <span className="grid size-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: `${accent}1A`, color: accent }}>
          <Icon className="size-5" />
        </span>
        {status === "installed" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><BadgeCheck className="size-3.5" /> {t("Installed")}</span>
        ) : status === "deploying" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700"><Loader2 className="size-3.5 animate-spin" /> {t("Building")}</span>
        ) : recommended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700"><Sparkles className="size-3.5" /> {t("Recommended")}</span>
        ) : null}
      </div>
      <h3 className="relative mt-4 line-clamp-2 max-w-[92%] text-[15.5px] font-semibold leading-snug tracking-tight text-navy-900"><ServiceTitle service={service} /></h3>
      <p className="relative mt-1 line-clamp-1 max-w-[85%] text-sm text-muted">{t(service.tagline)}</p>
      <div className="relative mt-auto flex items-end justify-between gap-3 pt-5">
        {status === "deploying" ? (
          <LiveBuildProgress serviceId={service.id} showLabel={false} className="w-1/2" />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-700"><CalendarDays className="size-4 text-muted" /> {t(shortTimeline(service.timeline))}</span>
        )}
        <span className="grid size-10 place-items-center rounded-full bg-white text-navy-900 shadow-[0_4px_14px_-4px_rgba(11,31,58,0.3)] ring-1 ring-navy-900/5 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 group-hover:scale-110">
          <ArrowRight className="size-4 rtl:-scale-x-100" />
        </span>
      </div>
    </motion.button>
  );
}

function ServiceRow({ service, rec, status, onOpen }: { service: ServiceDefinition; rec?: ServiceRecommendation; status: ServiceStatus; onOpen: () => void }) {
  const accent = waveColor(service);
  const Icon = SERVICE_ICONS[service.id];
  const t = useT();
  return (
    <li className="border-b border-line last:border-0">
      <button type="button" onClick={onOpen} className="group flex w-full items-center gap-4 px-4 py-3.5 text-start transition hover:bg-canvas/70 focus-visible:bg-canvas/70 focus-visible:outline-none md:px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${accent}1A`, color: accent }}><Icon className="size-[18px]" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy-900"><ServiceTitle service={service} /></span>
          <span className="block truncate text-xs text-muted">{t(service.tagline)}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 text-xs text-navy-700 sm:inline-flex"><CalendarDays className="size-3.5 text-muted" /> {t(shortTimeline(service.timeline))}</span>
        <span className="hidden w-28 shrink-0 text-end md:block">
          {status === "installed" ? <span className="text-xs font-semibold text-emerald-700">{t("Installed")}</span> : status === "deploying" ? <span className="text-xs font-semibold text-sky-700">{t("Building")}</span> : rec?.recommended ? <span className="text-xs font-semibold text-teal-700">{t("Recommended")}</span> : null}
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1 group-hover:text-navy-900" />
      </button>
    </li>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-xl border border-line bg-white ps-3.5 pe-9 text-sm font-medium text-navy-800 shadow-sm outline-none transition hover:border-navy-900/20 focus:border-teal-300 focus:ring-4 focus:ring-teal-100 lg:w-48">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </label>
  );
}

// ---------------- Requests ----------------
function RequestsPanel({ requests, onClose, onNew, onOpen }: { requests: ServiceRequest[]; onClose: () => void; onNew: () => void; onOpen: (id: ServiceId) => void }) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
      <div className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-card md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-navy-900"><Inbox className="size-5 text-teal-600" /> {t("Your requests")}</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onNew} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-navy-900 px-4 text-xs font-semibold text-white"><Plus className="size-3.5" /> {t("New")}</button>
            <button type="button" onClick={onClose} aria-label={t("Close requests")} className="grid size-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-navy-900"><X className="size-4" /></button>
          </div>
        </div>
        {requests.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {requests.map((r) => {
              const svc = r.serviceId !== "custom" && isServiceId(r.serviceId) ? SERVICES[r.serviceId] : null;
              return (
                <li key={r.id}>
                  <button type="button" disabled={!svc} onClick={() => svc && onOpen(svc.id)} className="flex w-full items-start gap-3 rounded-2xl bg-canvas/70 p-4 text-start transition enabled:hover:bg-canvas">
                    <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy-900">{r.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{t("Submitted {date} · start {start}", { date: formatDate(r.createdAt, locale), start: formatMonthLabel(r.preferredStart, locale) })}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">{t("No requests yet.")}</p>
        )}
      </div>
    </motion.section>
  );
}


function recommendedColor(service: ServiceDefinition, rec: ServiceRecommendation | undefined, status: ServiceStatus) {
  return rec?.recommended && status !== "installed" ? WAVE_COLORS[0] : waveColor(service);
}
