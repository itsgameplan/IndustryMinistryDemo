import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmt = new Intl.NumberFormat("en-US");
export const formatNumber = (n: number, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

type Translate = (text: string, vars?: Record<string, string | number>) => string;
const identity: Translate = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text);

/** Relative time. Pass `t` from `useT()` to localise the output. */
export function timeAgo(ts: number, t: Translate = identity) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return t("just now");
  if (s < 3600) return t("{n}m ago", { n: Math.floor(s / 60) });
  if (s < 86400) return t("{n}h ago", { n: Math.floor(s / 3600) });
  return t("{n}d ago", { n: Math.floor(s / 86400) });
}

/** Primary display name for an entity that may carry an Arabic form. */
export function localName(x: { name: string; nameAr?: string }, locale: string) {
  return locale === "ar" ? (x.nameAr || x.name) : x.name;
}

/** Brand word shown before every buildable marketplace service, per language. */
export const JAHEZ_BRAND = { en: "Jahez", ar: "جاهز" } as const;

/**
 * Display title of a buildable marketplace service: the official service name prefixed with the
 * Jahez brand ("Jahez AI-Based CRM…" / "جاهز إدارة علاقات العملاء…"). Catalogue data keeps the exact
 * IMC names; only the displayed title carries the brand.
 */
export function serviceTitle(s: { name: string; nameAr?: string }, locale: string) {
  return locale === "ar" ? `${JAHEZ_BRAND.ar} ${s.nameAr || s.name}` : `${JAHEZ_BRAND.en} ${s.name}`;
}
