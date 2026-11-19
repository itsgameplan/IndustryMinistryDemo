"use client";

// Private helpers shared by the Strategy & BSC workspaces (JZ-027).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Link2, Link2Off } from "lucide-react";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import { fmtVal, getBscDesign, getStrategyObjectives, type StrategyObjective } from "./_seeds";

/** Simulated AI generation: a short deterministic delay keyed by task. Timers are cleared on unmount. */
export function useSimulatedAI() {
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

/** Live links to the corporate-strategy and bsc-design workspaces of the active factory. */
export function useStrategyLinks() {
  const { id, factory, tier, state } = useActiveFactory();
  const strategyRaw = useJahez((s) => s.factories[id]?.serviceData?.["corporate-strategy"]);
  const designRaw = useJahez((s) => s.factories[id]?.serviceData?.["bsc-design"]);
  const installed = state.installedServices;
  return useMemo(() => {
    const objectives: StrategyObjective[] = getStrategyObjectives(strategyRaw, factory, tier);
    const { design, fromDesign } = getBscDesign(designRaw, factory, tier);
    return {
      objectives,
      strategyLinked: strategyRaw !== undefined || installed.includes("corporate-strategy"),
      design,
      designLinked: fromDesign || installed.includes("bsc-design"),
      objectiveTitle: (ref?: string) => objectives.find((o) => o.id === ref)?.title,
    };
  }, [strategyRaw, designRaw, factory, tier, installed]);
}

export function LinkIndicator({ linked, linkedLabel, unlinkedLabel, href, className }: { linked: boolean; linkedLabel: string; unlinkedLabel: string; href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
        linked ? "bg-teal-50 text-teal-700 ring-teal-200" : "bg-amber-50 text-amber-700 ring-amber-200",
        className
      )}
    >
      {linked ? <Link2 className="size-3" aria-hidden /> : <Link2Off className="size-3" aria-hidden />}
      {linked ? linkedLabel : unlinkedLabel}
    </Link>
  );
}

/** Compact segmented control (radio group semantics). */
export function Segmented<T extends string | number>({ value, onChange, options, label, size = "sm", className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; label: string; size?: "sm" | "xs"; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex items-center gap-0.5 rounded-lg bg-navy-900/[0.05] p-0.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]",
            o.value === value ? "bg-white text-navy-900 shadow-sm" : "text-navy-600 hover:text-navy-900"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const uidLocal = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/** Numeric input that commits on blur / Enter (so partial input like "1." is not lost). Remount with `key` to resync. */
export function NumberField({ value, onCommit, label, className, step = "any", min }: { value: number; onCommit: (v: number) => void; label: string; className?: string; step?: number | "any"; min?: number }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n)) setDraft(String(value));
    else if (n !== value) onCommit(min !== undefined ? Math.max(min, n) : n);
  };
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      aria-label={label}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setDraft(String(value)); }}
      className={cn("h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm tabular-nums text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100", className)}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Localisation of generated seed text (seeds stay English; translated at render time).
// ---------------------------------------------------------------------------------------------

/** Templates of interpolated seed strings. Each key exists verbatim in the services-strategy dictionary. */
const SEED_TEMPLATES = [
  // Vision
  "By {year}, {name} will be {core}.",
  "Our ambition for {year}: to be {core}.",
  "{name} in {year} — {core}.",
  "Growth will come from disciplined digital transformation — moving from Tier {tier} ({tierName}) toward Tier {next} — and from customers who choose us for consistency, transparency and speed.",
  "Every investment, hire and process change over the next {horizon} years should move us visibly closer to that picture.",
  "a digitally organised {industry} manufacturer known for reliable {product}",
  "a trusted, {tierName} supplier of {product} that competes on quality and service beyond Egypt",
  // Context
  "{name} employs {employees} people with annual revenue of about {revenue} (as declared). Its current Jahez maturity is Tier {tier} — {tierName}. Main products: {products}.",
  "Strengths: established production of {product} and an experienced workforce. Gaps: the systems required for Tier {tier} ({tierName}) are not yet fully in place.",
  "What has changed: {text}",
  "Where we stand: {text}",
  // Objectives, priorities, roadmap, KPIs
  "Grow domestic market share for {product}",
  "Become a preferred local supplier of {product}",
  "Secure first export buyers for {product}",
  "Digitise core operations to reach Tier {tier} ({tierName})",
  "Complete the digital foundations for Tier {tier}",
  "Introduce the systems required for Tier {tier} ({tierName}) in priority order.",
  "Concentrate on the two most promising markets for {product}.",
  "Priority market study for {product}",
  "Tier {tier} ({tierName}) verification",
  "Tier {tier} ({tierName}) readiness review",
  "Become {tierName}",
  "Revenue ({revenue} baseline)",
  "Tier {tier}",
  // Workshops
  "{name} — Balanced Scorecard leadership alignment",
  "{place} · management meeting room",
  "Validate the {count} scorecard objectives and their cause-and-effect logic",
  "- Are the targets ambitious but achievable for {name}?",
  "Strategy map approved with {count} objectives across four perspectives",
  "{count} KPIs adopted; targets accepted for 2027 subject to baseline check",
  "{kpi} prioritised as the lead indicator for the first quarter",
  "Assign accountable owners for {count} KPI without an “A”",
  "Assign accountable owners for {count} KPIs without an “A”",
  "Follow-up summary — {name}, {date}. The leadership team validated the strategy map ({objectives} objectives), adopted {kpis} KPIs with {owners} named owners and agreed a monthly review rhythm. {gap}{actions} follow-up actions were assigned; the first scorecard review is planned for early January. (Simulated summary — a human facilitator would validate it.)",
  "{count} KPI still needs an accountable owner. ",
  "{count} KPIs still need an accountable owner. ",
  // Dates such as "Dec 2026"
  "Jan {year}", "Feb {year}", "Mar {year}", "Apr {year}", "May {year}", "Jun {year}", "Jul {year}", "Aug {year}", "Sep {year}", "Oct {year}", "Nov {year}", "Dec {year}",
];

/** Static sentences that the seeds join into longer paragraphs. */
const SEED_SENTENCES = [
  "European and Gulf apparel buyers are diversifying sourcing toward near-shore suppliers with short lead times and traceable cotton.",
  "Buyers increasingly ask for social-compliance audits, product certifications and digital order tracking before placing trial orders.",
  "Local institutional demand (uniforms, hospital linen) provides a stable base while export capability is built.",
  "Automotive OEMs are regionalising supply chains; Egypt competes with Morocco and Türkiye on cost, logistics and quality systems.",
  "EU carbon-reporting rules (e.g. CBAM for iron and steel inputs) and OEM sustainability scorecards are raising data requirements for suppliers.",
  "Connected-machine data creates an opportunity for predictive maintenance and AI quality inspection — the core of Tier 4 readiness.",
  "Regional demand for processed food is growing, with retailers demanding food-safety certification and traceability.",
  "Energy and packaging costs are the main margin pressures.",
  "Export markets reward consistent quality and documented HACCP/ISO 22000 systems.",
  "Customers increasingly require documented quality, safety and environmental performance.",
  "Energy and imported raw-material costs drive margin volatility.",
  "Digital process control is becoming a differentiator for consistency and yield.",
  "Buyers increasingly select suppliers that are visible online, digitally organised and able to document quality.",
  "Input-cost and currency volatility make planning discipline essential.",
  "Export markets reward certification, traceability and responsive communication.",
].sort((a, b) => b.length - a.length);

const NUMERIC_VARS = new Set(["tier", "next", "horizon", "count", "employees", "objectives", "kpis", "owners", "actions"]);
const escapeRe =(s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const COMPILED = SEED_TEMPLATES.map((key) => {
  const names: string[] = [];
  const source = key
    .split(/(\{\w+\})/)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (!m) return escapeRe(part);
      names.push(m[1]);
      return m[1] === "year" ? "(\\d{4})" : NUMERIC_VARS.has(m[1]) ? "(\\d+)" : "(.+?)";
    })
    .join("");
  return { key, names, re: new RegExp(`^${source}$`, "s") };
}).sort((a, b) => b.key.length - a.key.length);

function translateSeedText(t: TFunction, s: string, depth = 0): string {
  if (!s || depth > 4) return s;
  const direct = t(s);
  if (direct !== s) return direct;
  if (/^[\d\s.,%+–-]+$/.test(s)) return s;
  if (/^[a-z]/.test(s)) {
    const cap = s[0].toUpperCase() + s.slice(1);
    const capT = t(cap);
    if (capT !== cap) return capT;
  }
  if (s.includes("\n")) return s.split("\n").map((line) => translateSeedText(t, line, depth + 1)).join("\n");
  if (s.startsWith("• ")) return `• ${translateSeedText(t, s.slice(2), depth + 1)}`;
  for (const c of COMPILED) {
    const m = c.re.exec(s);
    if (!m) continue;
    const vars: Record<string, string> = {};
    c.names.forEach((n, i) => { vars[n] = translateSeedText(t, m[i + 1], depth + 1); });
    return t(c.key, vars);
  }
  let out = s;
  for (const sentence of SEED_SENTENCES) if (out.includes(sentence)) out = out.split(sentence).join(t(sentence));
  return out;
}

/**
 * Translator for seed / generated text: exact dictionary match, then known templates, then known sentences.
 * Text the user typed (no dictionary entry) is returned unchanged.
 */
export function useSeedT() {
  const t = useT();
  const { locale } = useLocale();
  return useCallback((s: string) => (locale === "ar" ? translateSeedText(t, s) : s), [t, locale]);
}

/** `fmtVal` with the unit translated. */
export function useFmtVal() {
  const t = useT();
  return useCallback((v: number, unit: string) => fmtVal(v, t(unit)), [t]);
}
