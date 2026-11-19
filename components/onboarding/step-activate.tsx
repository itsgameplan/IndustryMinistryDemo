"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { maturityScore, useJahez } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { assess, buildAnswers, buildFactoryProfile, type Draft } from "./data";

const LINES = ["Creating your factory workspace", "Saving your proposed (unverified) profile", "Preparing roadmap & recommended services"];

export function StepActivate({ draft, onRegistered }: { draft: Draft; onRegistered: () => void }) {
  const tr = useT();
  const router = useRouter();
  const reduce = useReducedMotion();
  const registerFactory = useJahez((s) => s.registerFactory);
  const [shown, setShown] = useState(0);
  const fired = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const done = shown >= LINES.length;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const stepMs = reduce ? 150 : 700;
    if (shown < LINES.length) {
      const t = setTimeout(() => setShown((s) => s + 1), stepMs);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      const now = Date.now();
      const profile = buildFactoryProfile(draft, now);
      const { completed, tier } = assess(draft);
      registerFactory(profile, {
        completedRequirements: completed,
        assessment: { completedAt: now, answers: buildAnswers(draft), provisionalTier: tier, score: maturityScore(completed) },
      });
      onRegistered();
      router.push("/dashboard");
    }, reduce ? 300 : 900);
    return () => clearTimeout(t);
  }, [shown, reduce, draft, registerFactory, onRegistered, router]);

  return (
    <div className="mx-auto max-w-lg py-6 text-center md:py-12" role="status" aria-live="polite">
      <div className="relative mx-auto grid size-28 place-items-center">
        {!reduce ? <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/30" aria-hidden /> : null}
        <motion.span
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lift"
        >
          <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.25 }} />
          </svg>
        </motion.span>
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-semibold tracking-tight text-navy-900 outline-none">
        {tr("Welcome to Jahez, {name}", { name: draft.account.name.trim().split(/\s+/)[0] || tr("there") })}
      </h1>
      <p className="mt-1.5 text-sm text-muted">{tr("Your demo account for {factory} is being activated.", { factory: draft.factory.name.trim() || tr("your factory") })}</p>
      <ul className="mx-auto mt-8 max-w-sm space-y-3 text-start">
        {LINES.map((l, i) => {
          const st = i < shown ? "done" : i === shown ? "active" : "pending";
          return (
            <li key={l} className={st === "pending" ? "flex items-center gap-3 text-sm text-muted opacity-50" : "flex items-center gap-3 text-sm text-navy-800"}>
              <span className={st === "done" ? "grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" : "grid size-5 shrink-0 place-items-center rounded-full bg-navy-900/[0.06] text-navy-600"}>
                {st === "done" ? <Check className="size-3" strokeWidth={3} aria-hidden /> : st === "active" ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
              </span>
              {tr(l)}
            </li>
          );
        })}
      </ul>
      <p className="mt-8 text-xs text-muted">{done ? tr("Opening your dashboard…") : tr("Demo simulation — nothing is sent to any server.")}</p>
    </div>
  );
}
