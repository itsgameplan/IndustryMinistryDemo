"use client";

// Private helpers shared by the commercial (marketing, sales & export) workspaces.
import { useCallback, useEffect, useRef, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { seedKeyFor } from "@/components/services/kit";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Factory } from "@/lib/types";

/** Small deterministic string hash (FNV-1a). */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic integer in [min, max] derived from a key. */
export const hashRange = (key: string, min: number, max: number) => min + (hashStr(key) % (max - min + 1));

export const usd = (n: number, digits = 0) => `US$${n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
export const usdCompact = (n: number) => (n >= 1_000_000 ? `US$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `US$${Math.round(n / 1000)}K` : `US$${Math.round(n)}`);

let uidCounter = 0;
/** Unique id for user-created records (event handlers only — never call during render/seed). */
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`;

/**
 * Simulated AI generation: short fake delay, then run a deterministic callback.
 * `busy` holds the key of the running job so several buttons can share one hook.
 */
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
      setBusy(null);
    }, ms);
    timers.current.push(t);
  }, []);
  return { busy, run };
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin motion-reduce:animate-none", className)} aria-hidden />;
}

/** Inline "simulated / illustrative" label. */
export function SimTag({ children = "Simulated", className }: { children?: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-600 ring-1 ring-inset ring-gold-300/60", className)}>
      <FlaskConical className="size-3" aria-hidden /> {typeof children === "string" ? t(children) : children}
    </span>
  );
}

/** Segmented control built from real buttons (aria-pressed). */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = "md" }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; label: string; className?: string; size?: "sm" | "md" }) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex items-center gap-0.5 rounded-xl bg-navy-900/[0.05] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg font-medium text-navy-600 transition hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 [&_svg]:size-3.5",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.value && "bg-white text-navy-900 shadow-sm"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Native select styled to match the UI kit. */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("h-10 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100", className)} {...props} />;
}

// ---------------- Product profiles (shared by catalogue, chatbot, documents) ----------------

export interface ProductProfile {
  key: string;
  name: string;
  nameAr: string;
  nameFr: string;
  hs: string;
  unit: string;
  unitAr: string;
  moq: number;
  fobMin: number;
  fobMax: number;
  leadDays: [number, number];
  /** Indicative net kg per unit — used for packing lists. */
  kgPerUnit: number;
  unitsPerCarton: number;
  spec: string;
  certs: string[];
}

const AL_NOOR: ProductProfile[] = [
  { key: "knit-fabric", name: "Cotton knit fabric", nameAr: "أقمشة تريكو قطنية", nameFr: "Tissu tricoté en coton", hs: "6006.22", unit: "kg", unitAr: "كجم", moq: 1500, fobMin: 4.2, fobMax: 5.6, leadDays: [21, 30], kgPerUnit: 1, unitsPerCarton: 25, spec: "Single jersey and piqué, 160–220 gsm, 100% Egyptian-grown cotton or 60/40 CVC, reactive-dyed", certs: ["OEKO-TEX® Standard 100 (in preparation)"] },
  { key: "polo-tee", name: "Polo & T-shirts", nameAr: "قمصان بولو وتيشيرت", nameFr: "Polos et T-shirts", hs: "6105.10", unit: "pcs", unitAr: "قطعة", moq: 1000, fobMin: 2.8, fobMax: 4.9, leadDays: [30, 45], kgPerUnit: 0.22, unitsPerCarton: 60, spec: "Piqué polos and jersey tees, private label, sizes XS–3XL, embroidery or screen print", certs: ["Social compliance audit (planned)"] },
  { key: "workwear", name: "Workwear uniforms", nameAr: "ملابس عمل موحدة", nameFr: "Vêtements de travail", hs: "6203.42", unit: "sets", unitAr: "طقم", moq: 500, fobMin: 9.5, fobMax: 14.0, leadDays: [35, 50], kgPerUnit: 0.85, unitsPerCarton: 20, spec: "Twill trousers and jackets, reflective tape option, industrial-wash tested", certs: ["Reflective tape to EN ISO 20471 (supplier-certified)"] },
  { key: "hospital-linen", name: "Hospital linen", nameAr: "مفروشات المستشفيات", nameFr: "Linge hospitalier", hs: "6302.31", unit: "pcs", unitAr: "قطعة", moq: 2000, fobMin: 3.1, fobMax: 6.8, leadDays: [25, 40], kgPerUnit: 0.6, unitsPerCarton: 40, spec: "Percale bed sheets, pillow cases and scrubs, 75 °C wash-resistant, colour-coded", certs: ["Ministry of Health tender history (local)"] },
];

const DELTA: ProductProfile[] = [
  { key: "brake-discs", name: "Brake discs & drums", nameAr: "طنابير وأقراص الفرامل", nameFr: "Disques et tambours de frein", hs: "8708.30", unit: "pcs", unitAr: "قطعة", moq: 800, fobMin: 18, fobMax: 46, leadDays: [30, 45], kgPerUnit: 7.5, unitsPerCarton: 4, spec: "GG20/GG25 grey cast iron, OE-equivalent dimensions, balanced and anti-corrosion coated", certs: ["IATF 16949", "ISO 9001", "ECE R90 (per reference, partner lab)"] },
  { key: "knuckles", name: "Steering knuckles", nameAr: "مفاصل التوجيه", nameFr: "Fusées de direction", hs: "8708.94", unit: "pcs", unitAr: "قطعة", moq: 500, fobMin: 32, fobMax: 68, leadDays: [40, 55], kgPerUnit: 5.2, unitsPerCarton: 6, spec: "Ductile iron GGG50, 5-axis machined, 100% crack-tested, PPAP level 3 available", certs: ["IATF 16949", "PPAP level 3"] },
  { key: "housings", name: "CNC-machined housings", nameAr: "أغلفة مشغولة CNC", nameFr: "Carters usinés CNC", hs: "8483.30", unit: "pcs", unitAr: "قطعة", moq: 300, fobMin: 24, fobMax: 95, leadDays: [35, 50], kgPerUnit: 3.4, unitsPerCarton: 10, spec: "Aluminium and cast-iron housings, ±0.01 mm tolerance, CMM-inspected", certs: ["IATF 16949", "ISO 14001"] },
  { key: "shafts", name: "Precision shafts", nameAr: "أعمدة دقيقة", nameFr: "Arbres de précision", hs: "8483.10", unit: "pcs", unitAr: "قطعة", moq: 1000, fobMin: 8.5, fobMax: 29, leadDays: [30, 40], kgPerUnit: 2.1, unitsPerCarton: 20, spec: "Induction-hardened 42CrMo4 and C45 shafts, ground to h6, splined options", certs: ["IATF 16949", "ISO 9001"] },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product";

/** Deterministic product profiles for a factory (bespoke for the demo accounts, derived for sign-ups). */
export function productProfiles(factory: Factory): ProductProfile[] {
  const key = seedKeyFor(factory);
  if (key === "al-noor") return AL_NOOR;
  if (key === "delta") return DELTA;
  const names = (factory.products?.filter((p) => p.trim()) ?? []).slice(0, 5);
  const list = names.length ? names : [factory.industry || "Main product"];
  return list.map((name, i) => {
    const k = `${factory.name}|${name}`;
    const fobMin = hashRange(k, 2, 40);
    return {
      key: `${slug(name)}-${i}`,
      name,
      nameAr: name,
      nameFr: name,
      hs: "TBC",
      unit: "units",
      unitAr: "وحدة",
      moq: hashRange(`${k}|moq`, 2, 20) * 100,
      fobMin,
      fobMax: fobMin + hashRange(`${k}|span`, 2, 18),
      leadDays: [hashRange(`${k}|lead`, 20, 35), hashRange(`${k}|lead`, 20, 35) + 15] as [number, number],
      kgPerUnit: hashRange(`${k}|kg`, 2, 40) / 10,
      unitsPerCarton: hashRange(`${k}|ctn`, 2, 12) * 5,
      spec: `${name} manufactured in ${factory.governorate || "Egypt"} by ${factory.name} (${(factory.industry || "manufacturing").toLowerCase()})`,
      certs: ["Certifications to be confirmed"],
    };
  });
}

/** Lightweight bar used in several ranking views. */
export function MiniBar({ value, color = "#0FA396", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-navy-900/[0.06]", className)} aria-hidden>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }} />
    </div>
  );
}
