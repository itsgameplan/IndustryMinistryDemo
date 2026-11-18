"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, Landmark, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";

/** Lightweight header for public routes that sit outside the factory app shell. */
export function PublicHeader({ current, context }: { current: "verify" | "ministry"; context: string }) {
  const cross = current === "verify"
    ? { href: "/ministry", label: "Observatory", icon: Landmark }
    : { href: "/verify", label: "Verify a licence", icon: BadgeCheck };
  const CrossIcon = cross.icon;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
        <Logo />
        <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
        <span className="hidden truncate text-sm font-medium text-navy-600 sm:block">{context}</span>
        <nav aria-label="Public navigation" className="ml-auto flex items-center gap-1">
          <HeaderLink href="/" icon={<ArrowLeft />} label="Back to Jahez" />
          <HeaderLink href={cross.href} icon={<CrossIcon />} label={cross.label} className="hidden md:inline-flex" />
          <Link href="/dashboard" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 [&_svg]:size-4">
            <LayoutDashboard /> <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function HeaderLink({ href, icon, label, className }: { href: string; icon: React.ReactNode; label: string; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-navy-700 transition hover:bg-navy-900/5 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 [&_svg]:size-4", className)}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

/** Repeating diagonal "SAMPLE" watermark layer. Parent must be `relative overflow-hidden`. */
export function SampleWatermark({ className, text = "SAMPLE · DEMONSTRATION" }: { className?: string; text?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 select-none overflow-hidden", className)}>
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-col justify-center gap-16">
        {Array.from({ length: 9 }, (_, row) => (
          <div key={row} className="flex gap-12 whitespace-nowrap text-[28px] font-black uppercase tracking-[0.3em] text-navy-900/[0.045]" style={{ marginLeft: row % 2 ? -120 : 0 }}>
            {Array.from({ length: 6 }, (_, i) => <span key={i}>{text}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}
