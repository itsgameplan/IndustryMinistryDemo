"use client";

import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Jahez brand mark: a "ready" check whose sweep and gold dot echo the Arabic letter ج.
 * Navy tile, teal check, gold dot — the product palette from app/globals.css.
 */
export function JahezMark({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  const tile = `jz-tile-${id}`;
  const check = `jz-check-${id}`;

  return (
    <svg viewBox="0 0 40 40" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#132B4D" />
          <stop offset="1" stopColor="#050E1F" />
        </linearGradient>
        <linearGradient id={check} x1="9" y1="12" x2="31" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5FD6C8" />
          <stop offset="1" stopColor="#0FA396" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${tile})`} />
      <path d="M10.5 19.5 17 26 29.5 12.5" fill="none" stroke={`url(#${check})`} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="32.2" r="2.3" fill="#D1AE5C" />
    </svg>
  );
}

/** Mark + bilingual wordmark, linking home. `dark` is for navy backgrounds (sidebar). */
export function Logo({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="Jahez · جاهز">
      <JahezMark className={cn("size-8 shrink-0 rounded-[9px] shadow-sm", dark && "ring-1 ring-white/15")} />
      <span className={cn("sb-fade flex items-baseline gap-1.5 whitespace-nowrap", dark ? "text-white" : "text-navy-900")}>
        <span className="text-[17px] font-semibold tracking-[-0.02em]">Jahez</span>
        <span className={cn("font-arabic text-[15px] font-semibold", dark ? "text-teal-300" : "text-teal-600")} lang="ar">
          جاهز
        </span>
      </span>
    </Link>
  );
}
