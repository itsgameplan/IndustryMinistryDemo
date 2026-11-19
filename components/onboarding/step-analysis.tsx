"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Brain, Check, Cpu, Factory as FactoryIcon, Globe, Layers, Loader2, Puzzle, ShieldCheck, SkipForward } from "lucide-react";
import { Button } from "@/components/ui";
import { tierDef } from "@/lib/data/tiers";
import { cn } from "@/lib/utils";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import { EMPLOYEE_RANGES, SYSTEMS, assess, industryOf, missingForNextTier, type Draft } from "./data";

const STEP_MS = 1100;

function buildChecks(draft: Draft, t: TFunction, ar: boolean) {
  const f = draft.factory;
  const has = (id: (typeof SYSTEMS)[number]["id"]) => f.systems.includes(id);
  const { completed, tier } = assess(draft);
  const { next, missing } = missingForNextTier(completed);
  const range = EMPLOYEE_RANGES.find((r) => r.id === f.employeeRange);
  const active = SYSTEMS.filter((s) => s.id !== "none" && has(s.id));
  const presence = [has("website") && "website", has("email") && "business email", has("whatsapp") && "WhatsApp Business"].filter(Boolean).map((s) => t(s as string));
  const governance = [has("policies") && "written policies", has("sops") && "documented SOPs", has("safety") && "safety management", has("qms") && "ISO 9001 QMS"].filter(Boolean).map((s) => t(s as string));
  const sep = ar ? "، " : ", ";
  const industry = industryOf(f.industry);

  return [
    {
      icon: FactoryIcon,
      label: "Industry identification",
      finding: `${ar ? industry.ar : industry.en} · ${t("{range} employees", { range: range?.label ?? "—" })} · ${t(f.governorate || "Cairo")}${f.products.length ? ` · ${f.products.slice(0, 2).join(sep)}` : ""}`,
    },
    {
      icon: Cpu,
      label: "Existing technology",
      finding: active.length
        ? `${t("{count} of {total} systems in place:", { count: active.length, total: SYSTEMS.length - 1 })} ${active.slice(0, 3).map((s) => t(s.label)).join(sep)}${active.length > 3 ? ` ${t("+{count} more", { count: active.length - 3 })}` : ""}${has("iot") ? ` — ${t("connected machines are a real strength")}` : ""}`
        : t("No digital systems reported yet — a clean starting point"),
    },
    {
      icon: Globe,
      label: "Digital presence",
      finding: presence.length === 3 ? t("Fully discoverable: website, business email and WhatsApp Business") : presence.length ? t("Partial presence ({items}) — buyers may struggle to verify you", { items: presence.join(sep) }) : t("Not yet discoverable online by buyers or partners"),
    },
    {
      icon: ShieldCheck,
      label: "Governance readiness",
      finding: governance.length ? t("Foundations found: {items}", { items: governance.join(sep) }) : t("No written policies or SOPs yet — knowledge lives with people"),
    },
    {
      icon: Puzzle,
      label: "Missing capabilities",
      finding: next ? `${t(missing.length === 1 ? "{count} requirement open for Tier {tier}:" : "{count} requirements open for Tier {tier}:", { count: missing.length, tier: next })} ${missing.slice(0, 2).map((r) => t(r.title).toLowerCase()).join(sep)}${missing.length > 2 ? "…" : ""}` : t("All tier requirements reported as met"),
    },
    {
      icon: Layers,
      label: "Recommended starting tier",
      finding: t("Tier {tier} · {name} — proposed, pending verification", { tier, name: ar ? tierDef(tier).nameAr : tierDef(tier).name }),
    },
  ];
}

export function StepAnalysis({ draft, onBack, onDone }: { draft: Draft; onBack: () => void; onDone: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const reduce = useReducedMotion();
  const checks = useMemo(() => buildChecks(draft, t, ar), [draft, t, ar]);
  const [step, setStep] = useState(0);
  const done = reduce ? checks.length : step;
  const finished = done >= checks.length;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (reduce) return;
    if (done < checks.length) {
      const timer = setTimeout(() => setStep((d) => d + 1), STEP_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [done, checks.length, reduce, onDone]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white shadow-lift sm:p-8 md:p-10">
        <div className="bg-grid-dark absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -end-20 -top-20 size-64 rounded-full bg-teal-500/20 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex flex-col items-center text-center">
            <div className="relative grid size-20 place-items-center">
              {!reduce && !finished ? <span className="absolute inset-0 animate-pulse-ring rounded-full bg-teal-400/30" aria-hidden /> : null}
              <motion.span
                animate={reduce || finished ? undefined : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed border-teal-300/40"
                aria-hidden
              />
              <span className={cn("grid size-14 place-items-center rounded-2xl shadow-lift transition-colors", finished ? "bg-emerald-500" : "bg-teal-500")}>
                {finished ? <Check className="size-7" strokeWidth={3} aria-hidden /> : <Brain className="size-7" aria-hidden />}
              </span>
            </div>
            <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">{t("Step 3 · AI factory assessment")}</div>
            <h1 ref={headingRef} tabIndex={-1} className="mt-1.5 text-xl font-semibold tracking-tight outline-none md:text-2xl">
              {finished ? t("Assessment complete") : t("Jahez AI is assessing {factory}", { factory: draft.factory.name.trim() || t("your factory") })}
            </h1>
            <p className="mt-1 text-sm text-white/55">{t("Simulated analysis of your answers against the five-tier framework")}</p>
          </div>

          <ul className="mx-auto mt-8 max-w-xl space-y-2.5" aria-live="polite">
            {checks.map((c, i) => {
              const st = i < done ? "done" : i === done ? "active" : "pending";
              return (
                <li key={c.label} className={cn("rounded-2xl border px-4 py-3 transition-colors duration-300", st === "done" ? "border-white/10 bg-white/[0.04]" : st === "active" ? "border-teal-400/40 bg-teal-400/[0.06]" : "border-white/5 opacity-40")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", st === "done" ? "bg-teal-500 text-white" : "bg-white/10 text-white/70")}>
                      {st === "done" ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : st === "active" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <c.icon className="size-3.5" aria-hidden />}
                    </span>
                    <span className="text-sm font-medium">{t(c.label)}</span>
                    {st === "active" ? <span className="ms-auto text-[11px] text-teal-300">{t("Analysing…")}</span> : null}
                  </div>
                  <AnimatePresence initial={false}>
                    {st === "done" ? (
                      <motion.p
                        initial={reduce ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden ps-10 text-[13px] leading-snug text-white/65"
                      >
                        <span className="block pt-1">{c.finding}</span>
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>

          <div className="mx-auto mt-6 h-1 max-w-xl overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-teal-400 transition-[width] duration-700 ease-out" style={{ width: `${(done / checks.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-navy-700 transition hover:bg-navy-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
          <span className="inline-block rtl:-scale-x-100" aria-hidden>←</span> {t("Edit factory details")}
        </button>
        {finished ? (
          <Button size="lg" onClick={onDone}>{t("View results")} <ArrowRight className="rtl:-scale-x-100" /></Button>
        ) : (
          <Button size="lg" variant="outline" onClick={() => setStep(checks.length)}><SkipForward className="rtl:-scale-x-100" /> {t("Skip animation")}</Button>
        )}
      </div>
    </div>
  );
}
