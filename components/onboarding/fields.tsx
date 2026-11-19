"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** Step heading that takes focus when a step mounts, so keyboard and screen-reader users land on the new step. */
export function StepHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">{eyebrow}</div>
      <h1 ref={ref} tabIndex={-1} className="mt-1.5 text-2xl font-semibold tracking-tight text-navy-900 outline-none md:text-[28px]">{title}</h1>
      {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted md:text-[15px]">{description}</p> : null}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600" role="alert">
      <AlertCircle className="size-3.5 shrink-0" aria-hidden /> {message}
    </p>
  );
}

/** Label + control + hint + inline error. The render prop receives the a11y ids to spread on the control. */
export function Field({
  id: idProp,
  label,
  optional,
  hint,
  error,
  className,
  children,
}: {
  id?: string;
  label: string;
  optional?: boolean;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const t = useT();
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wider text-navy-600">
        {label}
        {optional ? <span className="text-[10px] font-medium normal-case tracking-normal text-muted">{t("Optional")}</span> : null}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error ? <p id={hintId} className="mt-1.5 text-xs text-muted">{hint}</p> : null}
      <FieldError id={errId} message={error} />
    </div>
  );
}

export const inputClass = (error?: string) =>
  cn(
    "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-navy-900 placeholder:text-muted/70 transition focus:outline-none focus:ring-2",
    error ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-line focus:border-teal-400 focus:ring-teal-100"
  );

export function SelectInput({ error, className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <div className="relative">
      <select className={cn(inputClass(error), "appearance-none pe-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}

/** Toggle chip (button with aria-pressed). */
export function Chip({ id, selected, onClick, children, className }: { id?: string; selected: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      id={id}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-start text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1",
        selected ? "border-teal-400 bg-teal-50 text-teal-700" : "border-line bg-white text-navy-700 hover:border-navy-500/30",
        className
      )}
    >
      <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border transition", selected ? "border-teal-500 bg-teal-500 text-white" : "border-navy-500/30")} aria-hidden>
        {selected ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
      </span>
      {children}
    </button>
  );
}

/** Free-text tag input: Enter or comma adds, Backspace on an empty field removes the last tag. */
export function TagInput({
  value,
  onChange,
  placeholder,
  error,
  max = 8,
  a11y,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: string;
  max?: number;
  a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string };
}) {
  const t = useT();
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (next.length < max && !next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 40));
    onChange(next);
    setText("");
  };
  return (
    <div
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2 py-1.5 transition focus-within:ring-2",
        error ? "border-red-300 focus-within:ring-red-100" : "border-line focus-within:border-teal-400 focus-within:ring-teal-100"
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-navy-900/[0.06] py-1 ps-2.5 pe-1 text-[13px] font-medium text-navy-800">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} className="grid size-5 place-items-center rounded-md text-navy-500 hover:bg-navy-900/10 hover:text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" aria-label={t("Remove {tag}", { tag })}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        {...a11y}
        value={text}
        onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (text.trim()) {
              e.preventDefault();
              add(text);
            }
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(text)}
        placeholder={value.length >= max ? t("Maximum reached") : value.length ? t("Add another…") : placeholder}
        disabled={value.length >= max}
        className="h-8 min-w-[140px] flex-1 bg-transparent px-1.5 text-sm text-navy-900 placeholder:text-muted/70 focus:outline-none"
      />
    </div>
  );
}

/** Wizard footer with back / next. */
export function StepActions({ onBack, backLabel = "Back", next, className }: { onBack?: () => void; backLabel?: string; next: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <div className={cn("mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between", className)}>
      {onBack ? (
        <button type="button" onClick={onBack} className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-navy-700 transition hover:bg-navy-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
          <span className="rtl:-scale-x-100 inline-block" aria-hidden>←</span> {t(backLabel)}
        </button>
      ) : <span />}
      <div className="flex flex-col gap-2 sm:flex-row">{next}</div>
    </div>
  );
}
