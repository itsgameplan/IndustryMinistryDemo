"use client";

import { Logo } from "@/components/brand/logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  LayoutDashboard, ClipboardCheck, Map, Sparkles, Satellite, Box, Globe, ShieldCheck, Activity,
  BadgeCheck, Landmark, Bell, RotateCcw, ChevronsUpDown, Menu, X, Check, Factory as FactoryIcon, Store, Plus, Network, Award, Ship,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogClose, DialogTrigger } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { CategoryIcon } from "@/components/services/kit";
import { SERVICES, categoryOf } from "@/lib/data/services";
import { computeTier, localizeNotificationText, useActiveFactory, useAllFactories, useHydrated, useJahez } from "@/lib/store";
import { cn, localName, serviceTitle, timeAgo } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { FactoryId, SolutionId } from "@/lib/types";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; solution?: SolutionId; only?: FactoryId };

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/assessment", label: "Maturity assessment", icon: ClipboardCheck },
  { href: "/roadmap", label: "Transformation roadmap", icon: Map },
  { href: "/certificates", label: "Tier certificates", icon: Award },
  { href: "/solutions", label: "AI solutions", icon: Sparkles },
  { href: "/services", label: "AI services marketplace", icon: Store },
  { href: "/trade", label: "Export / Import", icon: Ship },
  { href: "/site-intelligence", label: "Satellite intelligence", icon: Satellite },
  { href: "/digital-twin", label: "3D digital twin", icon: Box, only: "delta" },
];
const SOLUTION_NAV: NavItem[] = [
  { href: "/solutions/website", label: "Website", icon: Globe, solution: "website", only: "al-noor" },
  { href: "/solutions/compliance", label: "Compliance & SOPs", icon: ShieldCheck, solution: "compliance", only: "al-noor" },
  { href: "/solutions/maintenance", label: "Predictive maintenance", icon: Activity, solution: "maintenance", only: "delta" },
];
const CATEGORY_NAV_ICONS = Object.fromEntries(
  (["megaphone", "compass", "workflow", "users", "palette", "ship", "bar-chart", "target", "badge-check"] as const).map((k) => {
    const C = ({ className }: { className?: string }) => <CategoryIcon icon={k} className={className} />;
    C.displayName = `CategoryNavIcon(${k})`;
    return [k, C];
  })
) as Record<Parameters<typeof CategoryIcon>[0]["icon"], NavItem["icon"]>;

const PUBLIC_NAV: NavItem[] = [
  { href: "/services/coverage", label: "Service coverage matrix", icon: Network },
  { href: "/verify", label: "Licence verification", icon: BadgeCheck },
  { href: "/ministry", label: "Ministry dashboard", icon: Landmark },
];

function FactorySwitcher() {
  const { id, factory } = useActiveFactory();
  const factories = useJahez((s) => s.factories);
  const setActive = useJahez((s) => s.setActiveFactory);
  const all = useAllFactories();
  const [open, setOpen] = useState(false);
  const t = useT();
  const { locale } = useLocale();
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-start transition hover:bg-white/10">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold", id === "delta" ? "bg-indigo-500/20 text-indigo-200" : "bg-teal-400/15 text-teal-200")}>
          {factory.owner.initials}
        </span>
        <span className="sb-fade min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{localName(factory, locale)}</span>
          <span className="block truncate text-xs text-white/50">{t(factory.governorate)} · {t("Tier {tier}", { tier: computeTier(factories[id]?.completedRequirements ?? []) })}</span>
        </span>
        <ChevronsUpDown className="sb-fade size-4 shrink-0 text-white/40" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-white/10 bg-navy-800 p-1.5 shadow-lift">
            {all.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setActive(f.id);
                  setOpen(false);
                  toast(t("Switched to {name}", { name: localName(f, locale) }));
                }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-start hover:bg-white/5"
              >
                <FactoryIcon className="size-4 shrink-0 text-white/50" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{localName(f, locale)}</span>
                  <span className="block truncate text-xs text-white/50">{f.registration ? t("Registered · unverified") : locale === "ar" ? (f.industryAr || t(f.industry)) : f.industry}</span>
                </span>
                {f.id === id ? <Check className="size-4 shrink-0 text-teal-300" /> : null}
              </button>
            ))}
            <Link href="/register" onClick={() => setOpen(false)} className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-white/10 p-2 pt-2.5 text-start text-sm text-teal-200 hover:bg-white/5">
              <Plus className="size-4" /> {t("Register a new factory")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLink({ item, onClick, className }: { item: NavItem; onClick?: () => void; className?: string }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== "/solutions" && pathname.startsWith(item.href + "/")) || (item.href === "/solutions" && pathname === "/solutions");
  const Icon = item.icon;
  const t = useT();
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors", active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white", className)}
    >
      {active ? <motion.span layoutId="nav-active" className="absolute start-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-e-full bg-teal-400" /> : null}
      <Icon className={cn("size-4 shrink-0", active ? "text-teal-300" : "text-white/40 group-hover:text-white/70")} />
      <span className="sb-fade truncate whitespace-nowrap">{t(item.label)}</span>
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { id, state } = useActiveFactory();
  const solutions = SOLUTION_NAV.filter((n) => n.only === id);
  const t = useT();
  const { locale } = useLocale();
  return (
    <div className="bg-grid-dark flex h-full flex-col bg-navy-950 px-3 py-4">
      <div className="px-2 pb-5"><Logo dark /></div>
      <FactorySwitcher />
      <nav className="mt-5 flex-1 space-y-6 overflow-y-auto scrollbar-thin">
        <div className="space-y-0.5">
          <div className="sb-fade whitespace-nowrap px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">{t("Factory")}</div>
          {MAIN_NAV.filter((n) => !n.only || n.only === id).map((n) => <NavLink key={n.href} item={n} onClick={onNavigate} />)}
        </div>
        {solutions.length > 0 ? <div className="space-y-0.5">
          <div className="sb-fade whitespace-nowrap px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">{t("Your AI solutions")}</div>
          {solutions.map((n) => {
            const unlocked = n.solution && state.unlockedSolutions.includes(n.solution);
            return (
              <div key={n.href} className="relative">
                <NavLink item={n} onClick={onNavigate} className="pe-16" />
                <span className={cn("sb-fade pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide", unlocked ? "bg-teal-400/15 text-teal-300" : "bg-white/5 text-white/35")}>
                  {unlocked ? t("Live") : t("Locked")}
                </span>
              </div>
            );
          })}
        </div> : null}
        {state.installedServices.length > 0 ? (
          <div className="space-y-0.5">
            <div className="sb-fade whitespace-nowrap px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">{t("Your services")}</div>
            {state.installedServices.slice(0, 8).map((sid) => {
              const svc = SERVICES[sid];
              return <NavLink key={sid} item={{ href: svc.route, label: serviceTitle(svc, locale), icon: CATEGORY_NAV_ICONS[categoryOf(svc.category).icon] }} onClick={onNavigate} />;
            })}
            {state.installedServices.length > 8 ? <NavLink item={{ href: "/services?tab=installed", label: t("All {count} services", { count: state.installedServices.length }), icon: Store }} onClick={onNavigate} /> : null}
          </div>
        ) : null}
        <div className="space-y-0.5">
          <div className="sb-fade whitespace-nowrap px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">{t("Public & Ministry")}</div>
          {PUBLIC_NAV.map((n) => <NavLink key={n.href} item={n} onClick={onNavigate} />)}
        </div>
      </nav>
      <div className="sb-fade mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/45">
        {t("Demonstration environment. All factories, assessments and certificates are fictional simulations.")}
      </div>
    </div>
  );
}

function Notifications() {
  const { id } = useActiveFactory();
  const all = useJahez((s) => s.notifications);
  const markAllRead = useJahez((s) => s.markAllRead);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = all.filter((n) => n.factoryId === id);
  const unread = items.filter((n) => !n.read).length;
  const t = useT();
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label={t("Notifications")} onClick={() => { setOpen((o) => !o); if (!open) setTimeout(() => markAllRead(id), 1200); }} className="relative">
        <Bell />
        {unread > 0 ? <span className="absolute end-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-teal-500 text-[9px] font-bold text-white">{unread}</span> : null}
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute end-0 top-full z-40 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
              <div className="border-b border-line px-4 py-3 text-sm font-semibold">{t("Notifications")}</div>
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted">{t("You're all caught up. Deployment updates will appear here.")}</div>
                ) : (
                  items.map((n) => (
                    <button key={n.id} onClick={() => { setOpen(false); if (n.href) router.push(n.href); }} className="flex w-full gap-3 border-b border-line/70 px-4 py-3 text-start last:border-0 hover:bg-canvas">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-line" : n.kind === "tier" ? "bg-gold-500" : "bg-teal-500")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-navy-900">{localizeNotificationText(n.title, t)}</span>
                        <span className="block text-xs text-muted">{localizeNotificationText(n.body, t)}</span>
                        <span className="mt-1 block text-[11px] text-muted/70">{timeAgo(n.createdAt, t)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ResetDemoButton({ variant = "outline" as const }: { variant?: "outline" | "ghost" | "dark" }) {
  const reset = useJahez((s) => s.resetDemo);
  const router = useRouter();
  const t = useT();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm"><RotateCcw /> <span className="hidden sm:inline">{t("Reset demo")}</span></Button>
      </DialogTrigger>
      <DialogContent title={t("Reset the demo?")} description={t("Clears deployments, edits, assessments and site boundaries for both factories. This only affects this browser.")}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild><Button variant="outline">{t("Cancel")}</Button></DialogClose>
          <DialogClose asChild>
            <Button variant="danger" onClick={() => { reset(); toast.success(t("Demo reset to initial state")); router.push("/"); }}>{t("Reset everything")}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const RAIL = 72;
const FULL = 264;

/** Desktop sidebar: an icon rail that expands fluidly on hover or keyboard focus and overlays the page. */
function CollapsibleRail() {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const { isRtl } = useLocale();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (v: boolean, delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setExpanded(v), delay);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <motion.aside
      data-collapsed={!expanded}
      className="sb-rail fixed inset-y-0 start-0 z-40 hidden overflow-hidden lg:block"
      initial={false}
      animate={{ width: expanded ? FULL : RAIL, boxShadow: expanded ? `${isRtl ? -12 : 12}px 0 40px -12px rgba(5,14,31,0.45)` : "0 0 0 0 rgba(5,14,31,0)" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32, mass: 0.9 }}
      onMouseEnter={() => set(true, 60)}
      onMouseLeave={() => set(false, 160)}
      onFocusCapture={() => set(true, 0)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) set(false, 0); }}
    >
      <div className="h-full" style={{ width: FULL }}><Sidebar /></div>
    </motion.aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { factory, tier } = useActiveFactory();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = useT();
  const { locale, isRtl } = useLocale();
  const drawerX = isRtl ? 300 : -300;

  return (
    <div className="flex min-h-screen">
      <CollapsibleRail />
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 start-0 z-50 w-[280px] lg:hidden" initial={{ x: drawerX }} animate={{ x: 0 }} exit={{ x: drawerX }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
              <button className="absolute end-3 top-4 rounded-md p-1 text-white/60" onClick={() => setMobileOpen(false)} aria-label={t("Close menu")}><X className="size-5" /></button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col lg:ps-[72px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur-md md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label={t("Open menu")}><Menu /></Button>
          <div className="min-w-0 flex-1">
            {hydrated ? (
              <div className="flex items-center gap-3">
                <span className="truncate text-sm font-semibold text-navy-900">{localName(factory, locale)}</span>
                <span className={cn("hidden text-sm text-muted sm:inline", locale === "ar" ? "" : "font-arabic")} lang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? factory.name : factory.nameAr}</span>
                <TierBadge tier={tier} size="sm" className="hidden sm:inline-flex" />
              </div>
            ) : <div className="h-4 w-48 animate-pulse rounded bg-canvas" />}
          </div>
          {hydrated ? <Notifications /> : null}
          <ResetDemoButton />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {hydrated ? (
            <motion.div key={pathname + factory.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              {children}
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="h-8 w-72 animate-pulse rounded-lg bg-white" />
              <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div>
              <div className="h-80 animate-pulse rounded-2xl bg-white" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export { Logo } from "@/components/brand/logo";
