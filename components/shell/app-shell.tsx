"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard, ClipboardCheck, Map, Sparkles, Satellite, Box, Globe, ShieldCheck, Activity,
  BadgeCheck, Landmark, Bell, RotateCcw, ChevronsUpDown, Menu, X, Check, Factory as FactoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogClose, DialogTrigger } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { FACTORIES, FACTORY_IDS } from "@/lib/data/factories";
import { computeTier, useActiveFactory, useHydrated, useJahez } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import type { FactoryId, SolutionId } from "@/lib/types";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; solution?: SolutionId; only?: FactoryId };

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/assessment", label: "Maturity assessment", icon: ClipboardCheck },
  { href: "/roadmap", label: "Transformation roadmap", icon: Map },
  { href: "/solutions", label: "AI solutions", icon: Sparkles },
  { href: "/site-intelligence", label: "Satellite intelligence", icon: Satellite },
  { href: "/digital-twin", label: "3D digital twin", icon: Box, only: "delta" },
];
const SOLUTION_NAV: NavItem[] = [
  { href: "/solutions/website", label: "Website", icon: Globe, solution: "website", only: "al-noor" },
  { href: "/solutions/compliance", label: "Compliance & SOPs", icon: ShieldCheck, solution: "compliance", only: "al-noor" },
  { href: "/solutions/maintenance", label: "Predictive maintenance", icon: Activity, solution: "maintenance", only: "delta" },
];
const PUBLIC_NAV: NavItem[] = [
  { href: "/verify", label: "Licence verification", icon: BadgeCheck },
  { href: "/ministry", label: "Ministry dashboard", icon: Landmark },
];

function Logo({ dark }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="relative grid size-8 place-items-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-sm">
        <span className="text-[15px] font-bold leading-none">ج</span>
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-gold-400 ring-2 ring-navy-950" />
      </span>
      <span className={cn("text-[17px] font-semibold tracking-tight", dark ? "text-white" : "text-navy-900")}>
        Jahez <span className="font-arabic text-sm font-medium opacity-60">جاهز</span>
      </span>
    </Link>
  );
}

function FactorySwitcher() {
  const { id, factory } = useActiveFactory();
  const factories = useJahez((s) => s.factories);
  const setActive = useJahez((s) => s.setActiveFactory);
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:bg-white/10">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold", id === "delta" ? "bg-indigo-500/20 text-indigo-200" : "bg-teal-400/15 text-teal-200")}>
          {factory.owner.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{factory.name}</span>
          <span className="block truncate text-xs text-white/50">{factory.governorate} · Tier {computeTier(factories[id].completedRequirements)}</span>
        </span>
        <ChevronsUpDown className="size-4 text-white/40" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-white/10 bg-navy-800 p-1.5 shadow-lift">
            {FACTORY_IDS.map((fid) => (
              <button
                key={fid}
                onClick={() => {
                  setActive(fid);
                  setOpen(false);
                  toast(`Switched to ${FACTORIES[fid].name}`);
                }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5"
              >
                <FactoryIcon className="size-4 text-white/50" />
                <span className="flex-1">
                  <span className="block text-sm text-white">{FACTORIES[fid].name}</span>
                  <span className="block text-xs text-white/50">{FACTORIES[fid].industry}</span>
                </span>
                {fid === id ? <Check className="size-4 text-teal-300" /> : null}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== "/solutions" && pathname.startsWith(item.href + "/")) || (item.href === "/solutions" && pathname === "/solutions");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors", active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white")}
    >
      {active ? <motion.span layoutId="nav-active" className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-teal-400" /> : null}
      <Icon className={cn("size-4", active ? "text-teal-300" : "text-white/40 group-hover:text-white/70")} />
      {item.label}
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { id, state } = useActiveFactory();
  const solutions = SOLUTION_NAV.filter((n) => n.only === id);
  return (
    <div className="bg-grid-dark flex h-full flex-col bg-navy-950 px-3 py-4">
      <div className="px-2 pb-5"><Logo dark /></div>
      <FactorySwitcher />
      <nav className="mt-5 flex-1 space-y-6 overflow-y-auto scrollbar-thin">
        <div className="space-y-0.5">
          <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">Factory</div>
          {MAIN_NAV.filter((n) => !n.only || n.only === id).map((n) => <NavLink key={n.href} item={n} onClick={onNavigate} />)}
        </div>
        <div className="space-y-0.5">
          <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">Your AI solutions</div>
          {solutions.map((n) => {
            const unlocked = n.solution && state.unlockedSolutions.includes(n.solution);
            return (
              <div key={n.href} className="relative">
                <NavLink item={n} onClick={onNavigate} />
                <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide", unlocked ? "bg-teal-400/15 text-teal-300" : "bg-white/5 text-white/35")}>
                  {unlocked ? "Live" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="space-y-0.5">
          <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/30">Public & Ministry</div>
          {PUBLIC_NAV.map((n) => <NavLink key={n.href} item={n} onClick={onNavigate} />)}
        </div>
      </nav>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/45">
        Demonstration environment. All factories, assessments and certificates are fictional simulations.
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
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => { setOpen((o) => !o); if (!open) setTimeout(() => markAllRead(id), 1200); }} className="relative">
        <Bell />
        {unread > 0 ? <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-teal-500 text-[9px] font-bold text-white">{unread}</span> : null}
      </Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-full z-40 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-lift">
              <div className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</div>
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up. Deployment updates will appear here.</div>
                ) : (
                  items.map((n) => (
                    <button key={n.id} onClick={() => { setOpen(false); if (n.href) router.push(n.href); }} className="flex w-full gap-3 border-b border-line/70 px-4 py-3 text-left last:border-0 hover:bg-canvas">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-line" : n.kind === "tier" ? "bg-gold-500" : "bg-teal-500")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-navy-900">{n.title}</span>
                        <span className="block text-xs text-muted">{n.body}</span>
                        <span className="mt-1 block text-[11px] text-muted/70">{timeAgo(n.createdAt)}</span>
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm"><RotateCcw /> <span className="hidden sm:inline">Reset demo</span></Button>
      </DialogTrigger>
      <DialogContent title="Reset the demo?" description="Clears deployments, edits, assessments and site boundaries for both factories. This only affects this browser.">
        <div className="flex justify-end gap-2">
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <DialogClose asChild>
            <Button variant="danger" onClick={() => { reset(); toast.success("Demo reset to initial state"); router.push("/"); }}>Reset everything</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const { factory, tier } = useActiveFactory();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block"><Sidebar /></aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-[280px] lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
              <button className="absolute right-3 top-4 rounded-md p-1 text-white/60" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/80 px-4 backdrop-blur-md md:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="min-w-0 flex-1">
            {hydrated ? (
              <div className="flex items-center gap-3">
                <span className="truncate text-sm font-semibold text-navy-900">{factory.name}</span>
                <span className="hidden font-arabic text-sm text-muted sm:inline">{factory.nameAr}</span>
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

export { Logo };
