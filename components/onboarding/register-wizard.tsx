"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, FlaskConical } from "lucide-react";
import { DemoDisclaimer, Progress } from "@/components/ui";
import { Logo } from "@/components/shell/app-shell";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import { EMPTY_DRAFT, STEPS, assess, normalizeEgyptMobile, type AccountDraft, type Draft, type FactoryDraft, type PlanId } from "./data";
import { StepAccount } from "./step-account";
import { StepFactory } from "./step-factory";
import { StepAnalysis } from "./step-analysis";
import { StepResults } from "./step-results";
import { StepPlan } from "./step-plan";
import { StepActivate } from "./step-activate";

const DRAFT_KEY = "jahez-register-draft";

/** Restores the (password-free) draft from sessionStorage. Never resumes on the activation step. */
function loadDraft(): Draft {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    const draft: Draft = {
      step: typeof parsed.step === "number" ? parsed.step : 0,
      account: { ...EMPTY_DRAFT.account, ...parsed.account },
      factory: { ...EMPTY_DRAFT.factory, ...parsed.factory },
      plan: parsed.plan ?? null,
    };
    draft.step = Math.max(0, Math.min(4, draft.step));
    if (!draft.account.verified) draft.step = 0;
    return draft;
  } catch {
    return EMPTY_DRAFT;
  }
}

export function RegisterWizard() {
  const t = useT();
  const hydrated = useHydrated();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:px-6">
          <Logo />
          <span className="hidden items-center gap-1 rounded-full bg-gold-50 px-2.5 py-0.5 text-[11px] font-semibold text-gold-600 ring-1 ring-inset ring-gold-300/60 sm:inline-flex">
            <FlaskConical className="size-3" aria-hidden /> {t("Demo simulation")}
          </span>
          <Link href="/#accounts" className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-navy-700 transition hover:bg-navy-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
            <ArrowLeft className="size-4 rtl:-scale-x-100" aria-hidden /> <span className="hidden sm:inline">{t("Back to demo accounts")}</span><span className="sm:hidden">{t("Demo accounts")}</span>
          </Link>
        </div>
      </header>
      {hydrated ? <Wizard /> : <WizardSkeleton />}
    </div>
  );
}

function WizardSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6" aria-busy="true">
      <div className="h-10 animate-pulse rounded-xl bg-white" />
      <div className="mt-6 h-[480px] animate-pulse rounded-3xl bg-white" />
    </main>
  );
}

function Wizard() {
  const t = useT();
  const { isRtl } = useLocale();
  const flip = isRtl ? -1 : 1;
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [dir, setDir] = useState(1);
  const step = draft.step;

  // Persist the draft (never includes a password) for the browser tab session only.
  useEffect(() => {
    try {
      if (step >= 5) window.sessionStorage.removeItem(DRAFT_KEY);
      else window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable — draft simply isn't restored */
    }
  }, [draft, step]);

  // Each step starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const go = useCallback(
    (to: number) => {
      setDir(to >= step ? 1 : -1);
      setDraft((d) => ({ ...d, step: to }));
    },
    [step]
  );

  const patchAccount = useCallback((patch: Partial<AccountDraft>) => setDraft((d) => ({ ...d, account: { ...d.account, ...patch } })), []);
  const patchFactory = useCallback((patch: Partial<FactoryDraft>) => setDraft((d) => ({ ...d, factory: { ...d.factory, ...patch } })), []);
  const setPlan = useCallback((plan: PlanId) => setDraft((d) => ({ ...d, plan })), []);

  const afterVerified = useCallback(() => {
    setDir(1);
    setDraft((d) => ({
      ...d,
      step: 1,
      factory: d.factory.whatsapp ? d.factory : { ...d.factory, whatsapp: normalizeEgyptMobile(d.account.whatsapp) ?? d.account.whatsapp },
    }));
  }, []);
  const toResults = useCallback(() => go(3), [go]);
  const clearDraft = useCallback(() => {
    try {
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const { tier } = assess(draft);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 md:px-6 md:pt-8">
      <StepIndicator step={step} onJump={(i) => go(i)} />

      <div className="mt-6 rounded-3xl border border-line bg-white p-5 shadow-card sm:p-7 md:p-10">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 * dir * flip }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 * dir * flip }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 0 ? <StepAccount value={draft.account} onChange={patchAccount} onVerified={afterVerified} /> : null}
            {step === 1 ? <StepFactory value={draft.factory} onChange={patchFactory} onBack={() => go(0)} onNext={() => go(2)} /> : null}
            {step === 2 ? <StepAnalysis draft={draft} onBack={() => go(1)} onDone={toResults} /> : null}
            {step === 3 ? <StepResults draft={draft} onBack={() => go(1)} onNext={() => go(4)} /> : null}
            {step === 4 ? <StepPlan tier={tier} plan={draft.plan} onSelect={setPlan} onBack={() => go(3)} onActivate={() => go(5)} /> : null}
            {step === 5 ? <StepActivate draft={draft} onRegistered={clearDraft} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <DemoDisclaimer className="mt-6">
        {t("Simulated sign-up. No account, message, verification or payment is real; details stay in this browser. Any tier shown is proposed and unverified — no certificate or official classification is issued.")}
      </DemoDisclaimer>
    </main>
  );
}

function StepIndicator({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  const t = useT();
  const locked = step >= 5;
  return (
    <nav aria-label={t("Sign-up progress")}>
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-navy-900">{t(STEPS[step].label)}</span>
          <span className="tabular-nums text-muted">{t("Step {current} of {total}", { current: step + 1, total: STEPS.length })}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-2 h-1.5" />
      </div>
      {/* Desktop */}
      <ol className="hidden items-center gap-2 sm:flex">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          const canJump = done && !locked && i !== 2;
          const content = (
            <>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors", done ? "bg-teal-500 text-white" : current ? "bg-navy-900 text-white" : "bg-navy-900/[0.06] text-navy-500")}>
                {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cn("hidden truncate text-[13px] font-medium md:inline", current ? "text-navy-900" : done ? "text-navy-700" : "text-muted")}>{t(s.label)}</span>
            </>
          );
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
              {canJump ? (
                <button type="button" onClick={() => onJump(i)} className="flex min-w-0 items-center gap-2 rounded-lg p-1 -m-1 transition hover:bg-navy-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" aria-label={t("Go back to {step}", { step: t(s.label) })}>
                  {content}
                </button>
              ) : (
                <span className="flex min-w-0 items-center gap-2">{content}<span className="sr-only">{current ? ` (${t("current step")})` : done ? ` (${t("completed")})` : ""}</span></span>
              )}
              {i < STEPS.length - 1 ? <span className={cn("h-px min-w-3 flex-1 rounded-full", done ? "bg-teal-400" : "bg-line")} aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
