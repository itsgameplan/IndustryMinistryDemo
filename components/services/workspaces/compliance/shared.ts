"use client";

// Private helpers for the compliance workspaces (JZ-030). Deterministic, client-only, no network.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";
import type { Factory } from "@/lib/types";

/** Fixed demo "today" so seeds, statuses and timelines are deterministic across renders and reloads. */
export const DEMO_TODAY = Date.UTC(2026, 10, 18, 9, 0, 0);
export const DAY = 86_400_000;

export const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const parseIso = (s: string) => Date.parse(`${s}T00:00:00Z`);
export const addDays = (ms: number, days: number) => ms + days * DAY;
export const daysUntil = (isoDate: string) => Math.round((parseIso(isoDate) - DEMO_TODAY) / DAY);

type Loc = "en" | "ar";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const monthsFor = (locale: Loc) => (locale === "ar" ? MONTHS_AR : MONTHS);
export const monthLabel = (ms: number, locale: Loc = "en") => monthsFor(locale)[new Date(ms).getUTCMonth()];
export function fmtDayMonth(ms: number | string, locale: Loc = "en") {
  const d = new Date(typeof ms === "string" ? parseIso(ms) : ms);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${monthsFor(locale)[d.getUTCMonth()]}`;
}
export function fmtDate(ms: number | string, locale: Loc = "en") {
  const d = new Date(typeof ms === "string" ? parseIso(ms) : ms);
  return `${fmtDayMonth(ms, locale)} ${d.getUTCFullYear()}`;
}
export function fmtDateTime(ms: number, locale: Loc = "en") {
  const d = new Date(ms);
  return `${fmtDate(ms, locale)} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Locale-bound date formatters for rendering (English month names in "en", Arabic in "ar"; Latin digits). */
export function useDateFormat() {
  const { locale } = useLocale();
  return {
    fmtDate: (ms: number | string) => fmtDate(ms, locale),
    fmtDayMonth: (ms: number | string) => fmtDayMonth(ms, locale),
    fmtDateTime: (ms: number) => fmtDateTime(ms, locale),
    monthLabel: (ms: number) => monthLabel(ms, locale),
  };
}

/** FNV-1a based hex digest — a deterministic, decorative "hash" (not cryptographic). */
export function hashHex(input: string, len = 16) {
  let out = "";
  let salt = 0;
  while (out.length < len) {
    let h = 0x811c9dc5 ^ salt;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    out += (h >>> 0).toString(16).padStart(8, "0");
    salt += 0x9e3779b9;
  }
  return out.slice(0, len);
}
export const shortHash = (h: string) => `0x${h.slice(0, 6)}…${h.slice(-4)}`;

/** Small deterministic PRNG (mulberry32 over a string hash). */
export function rng(seed: string) {
  let a = parseInt(hashHex(seed, 8), 16) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const isFoodLike = (f: Factory) => /food|beverage|dairy|bakery|snack|juice|meat|poultry|confection|agro|edible|oil|spice/i.test(`${f.industry} ${f.products.join(" ")}`);
export const isTextileLike = (f: Factory) => /textile|garment|apparel|fabric|cotton|yarn|knit|cloth/i.test(`${f.industry} ${f.products.join(" ")}`);
export const productsOf = (f: Factory) => (f.products.length ? f.products.slice(0, 4) : ["Main product line"]);

/**
 * Simulated AI / processing actions: a short fake delay, then a deterministic callback.
 * Timers are cleared on unmount.
 */
export function useSimulatedAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  const run = useCallback((key: string, fn: () => void, ms = 900) => {
    setBusy(key);
    const t = window.setTimeout(() => {
      fn();
      setBusy((b) => (b === key ? null : b));
    }, ms);
    timers.current.push(t);
  }, []);
  return { busy, run };
}
