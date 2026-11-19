"use client";

// Private helpers for the operations workspaces (process reengineering, process mining, BI, governance).
import { useCallback, useEffect, useRef, useState } from "react";
import type { Factory } from "@/lib/types";
import { seedKeyFor } from "@/components/services/kit";

/** Two operating "flavours" drive most seed data: paper-based (Al Noor-like) vs ERP-connected (Delta-like). */
export type Flavour = "paper" | "erp";

export function flavourFor(factory: Factory): Flavour {
  const key = seedKeyFor(factory);
  if (key === "al-noor") return "paper";
  if (key === "delta") return "erp";
  return factory.baselineTier >= 2 ? "erp" : "paper";
}

/** Deterministic 32-bit string hash. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let counter = 0;
/** Id for items created by user actions (never used during seeding). */
export function newId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Annual revenue in EGP millions parsed from the factory profile, with a headcount-based fallback. */
export function annualRevenueM(factory: Factory): number {
  const m = /([\d.]+)\s*([MB])/i.exec(factory.annualRevenueEgp ?? "");
  if (m) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v) && v > 0) return m[2].toUpperCase() === "B" ? v * 1000 : v;
  }
  return Math.max(12, Math.round(factory.employees * 0.6));
}

/** Simulated AI action: short deterministic delay, then runs the callback. */
export function useSimulatedAI() {
  const [running, setRunning] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const run = useCallback((key: string, fn: () => void, ms = 900) => {
    if (timer.current) clearTimeout(timer.current);
    setRunning(key);
    timer.current = setTimeout(() => {
      timer.current = null;
      setRunning(null);
      fn();
    }, Math.max(600, Math.min(1200, ms)));
  }, []);
  return { running, run };
}

export const hours = (h: number) => (h >= 24 ? `${(h / 24).toFixed(1)} d` : `${h.toFixed(h < 10 ? 1 : 0)} h`);
export const pct = (v: number, digits = 0) => `${v.toFixed(digits)}%`;
