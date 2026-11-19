"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Info, MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { DEMO_OTP, isEmail, normalizeEgyptMobile, type AccountDraft } from "./data";
import { Field, FieldError, StepActions, StepHeading, inputClass } from "./fields";

type Errors = Partial<Record<"name" | "email" | "whatsapp" | "password", string>>;

export function StepAccount({ value, onChange, onVerified }: { value: AccountDraft; onChange: (patch: Partial<AccountDraft>) => void; onVerified: () => void }) {
  const t = useT();
  // Visual-only password: lives in this component's state, never written to the draft, storage or the store.
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [otpOpen, setOtpOpen] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (value.name.trim().length < 2) e.name = t("Please enter the owner or manager's full name.");
    if (!isEmail(value.email)) e.email = t("Please enter a valid email address, e.g. name@company.com.");
    if (!normalizeEgyptMobile(value.whatsapp)) e.whatsapp = t("Enter an Egyptian mobile number, e.g. +20 100 123 4567.");
    if (password && password.length < 8) e.password = t("Use at least 8 characters, or leave it empty for the demo.");
    return e;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = (["name", "email", "whatsapp", "password"] as const).find((k) => e[k]);
      document.getElementById(`acc-${first}`)?.focus();
      return;
    }
    onChange({ whatsapp: normalizeEgyptMobile(value.whatsapp) ?? value.whatsapp });
    if (value.verified) onVerified();
    else setOtpOpen(true);
  };

  if (otpOpen) return <OtpScreen phone={normalizeEgyptMobile(value.whatsapp) ?? value.whatsapp} onBack={() => setOtpOpen(false)} onSuccess={() => { onChange({ verified: true }); onVerified(); }} />;

  return (
    <form onSubmit={submit} noValidate>
      <StepHeading eyebrow={t("Step 1 · Create account")} title={t("Create your factory account")} description={t("Tell us who manages the factory. We'll verify your WhatsApp number with a one-time code (simulated).")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="acc-name" label={t("Owner / manager name")} error={errors.name} className="sm:col-span-2">
          {(a) => <input {...a} id="acc-name" autoComplete="name" value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={t("e.g. Karim Mostafa")} className={inputClass(errors.name)} />}
        </Field>
        <Field id="acc-email" label={t("Business email")} error={errors.email}>
          {(a) => <input {...a} id="acc-email" type="email" autoComplete="email" inputMode="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="name@factory.com" className={inputClass(errors.email)} />}
        </Field>
        <Field id="acc-whatsapp" label={t("WhatsApp number")} error={errors.whatsapp} hint={t("Egyptian mobile in +20 format, e.g. +20 100 123 4567")}>
          {(a) => (
            <div className="relative">
              <MessageCircle className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-emerald-600" aria-hidden />
              <input {...a} id="acc-whatsapp" type="tel" autoComplete="tel" inputMode="tel" value={value.whatsapp} onChange={(e) => onChange({ whatsapp: e.target.value, verified: false })} placeholder="+20 100 123 4567" dir="ltr" className={cn(inputClass(errors.whatsapp), "pl-10")} />
            </div>
          )}
        </Field>
        <Field id="acc-password" label={t("Password")} optional error={errors.password} hint={t("Visual only in this demo — it is never saved or sent anywhere.")} className="sm:col-span-2">
          {(a) => (
            <div className="relative">
              <input {...a} id="acc-password" type={showPw ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("At least 8 characters")} className={cn(inputClass(errors.password), "pe-11")} />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute end-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-navy-900/5 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" aria-label={showPw ? t("Hide password") : t("Show password")}>
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          )}
        </Field>
      </div>
      <div className="mt-5 flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-3 text-xs text-navy-700">
        <Info className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
        {t("No account is created on a server. Your details stay in this browser for the demonstration only.")}
      </div>
      <StepActions
        next={
          value.verified ? (
            <Button type="submit" size="lg"><ShieldCheck /> {t("Verified · Continue")} <ArrowRight className="rtl:-scale-x-100" /></Button>
          ) : (
            <Button type="submit" size="lg">{t("Send verification code")} <ArrowRight className="rtl:-scale-x-100" /></Button>
          )
        }
      />
    </form>
  );
}

// ---------------- OTP ----------------
const RESEND_SECONDS = 30;

function OtpScreen({ phone, onBack, onSuccess }: { phone: string; onBack: () => void; onSuccess: () => void }) {
  const tr = useT();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string>();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setAt = (i: number, v: string) => {
    setError(undefined);
    setDigits((d) => d.map((x, j) => (j === i ? v : x)));
  };

  const fill = (from: number, text: string) => {
    const chars = text.replace(/\D/g, "").slice(0, 6 - from).split("");
    if (!chars.length) return;
    setError(undefined);
    setDigits((d) => d.map((x, j) => (j >= from && j < from + chars.length ? chars[j - from] : x)));
    refs.current[Math.min(5, from + chars.length)]?.focus();
  };

  const verify = (ev: React.FormEvent) => {
    ev.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError(tr("Enter all 6 digits of the code."));
      refs.current[digits.findIndex((d) => !d)]?.focus();
      return;
    }
    if (code !== DEMO_OTP) {
      setError(tr("That code doesn't match. Use the demo code shown above."));
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
      return;
    }
    toast.success(tr("Number verified (simulated)"));
    onSuccess();
  };

  const resend = () => {
    setSeconds(RESEND_SECONDS);
    setDigits(Array(6).fill(""));
    setError(undefined);
    refs.current[0]?.focus();
    toast.info(tr("Demo code re-issued — no message was sent"), { description: tr("Use {code}.", { code: DEMO_OTP }) });
  };

  return (
    <form onSubmit={verify} noValidate>
      <StepHeading eyebrow={tr("Step 1 · Verify WhatsApp")} title={tr("Enter your verification code")} description={tr("In a live service a 6-digit code would be sent to {phone} on WhatsApp.", { phone: `\u2066${phone}\u2069` })} />
      <div className="flex items-start gap-3 rounded-2xl border border-gold-300/70 bg-gold-50 px-4 py-3.5" role="note">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-500 text-navy-950"><ShieldCheck className="size-4.5" aria-hidden /></span>
        <div>
          <div className="text-sm font-semibold text-navy-900">
            {tr("Demo code:")} <span className="font-mono text-base tracking-[0.25em] text-gold-600">{DEMO_OTP}</span>
          </div>
          <p className="text-xs text-navy-700">{tr("No message is sent — this is a simulated verification.")}</p>
        </div>
      </div>

      <fieldset className="mt-7">
        <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-600">{tr("6-digit code")}</legend>
        <div dir="ltr" className="flex gap-2 sm:gap-3" aria-describedby={error ? "otp-err" : undefined}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={6}
              aria-label={tr("Digit {n} of 6", { n: i + 1 })}
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (v.length > 1) return fill(i, v);
                setAt(i, v);
                if (v && i < 5) refs.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) {
                  e.preventDefault();
                  setAt(i - 1, "");
                  refs.current[i - 1]?.focus();
                } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
              }}
              onPaste={(e) => {
                e.preventDefault();
                fill(i, e.clipboardData.getData("text"));
              }}
              onFocus={(e) => e.target.select()}
              className={cn(
                "h-14 w-full min-w-0 max-w-14 rounded-xl border bg-white text-center text-xl font-semibold tabular-nums text-navy-900 transition focus:outline-none focus:ring-2",
                error ? "border-red-300 focus:ring-red-100" : d ? "border-teal-400 focus:ring-teal-100" : "border-line focus:border-teal-400 focus:ring-teal-100"
              )}
            />
          ))}
        </div>
        <FieldError id="otp-err" message={error} />
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
        {tr("Didn't get it?")}
        {seconds > 0 ? (
          <span className="tabular-nums" aria-live="polite">{tr("Resend available in {time}", { time: `0:${String(seconds).padStart(2, "0")}` })}</span>
        ) : (
          <button type="button" onClick={resend} className="inline-flex items-center gap-1 rounded-md font-medium text-teal-700 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
            <RotateCcw className="size-3.5" aria-hidden /> {tr("Resend code")}
          </button>
        )}
      </div>

      <StepActions onBack={onBack} backLabel="Edit details" next={<Button type="submit" size="lg">{tr("Verify & continue")} <ArrowRight className="rtl:-scale-x-100" /></Button>} />
    </form>
  );
}
