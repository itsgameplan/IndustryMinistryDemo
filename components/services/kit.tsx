"use client";

// Shared IMC service-workspace kit (orchestrator-owned). Workspace agents import, never edit.
// Every service workspace is rendered inside <WorkspaceFrame> and persists its editable output
// through useServiceWorkspace(), so results survive refresh and are scoped per factory.
import { useCallback, useState } from "react";
import { motion } from "motion/react";
import {
  BadgeCheck, BarChart3, Compass, FlaskConical, Megaphone, Palette, Pencil, RotateCcw, Ship, Sparkles, Target, Users, Workflow,
} from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { categoryOf, SERVICES } from "@/lib/data/services";
import { useLocale, useT } from "@/lib/i18n";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn, JAHEZ_BRAND } from "@/lib/utils";
import type { Factory, FactoryId, ServiceCategory, ServiceDefinition, ServiceId } from "@/lib/types";

export interface WorkspaceProps {
  service: ServiceDefinition;
}

/** Which seed family to use for a factory: bespoke data for the two demo accounts, generic otherwise. */
export type SeedKey = "al-noor" | "delta" | "generic";
export const seedKeyFor = (factory: Factory): SeedKey => (factory.id === "al-noor" || factory.id === "delta" ? factory.id : "generic");

/**
 * Persisted, per-factory workspace state.
 * `seed(factory)` must be deterministic; it is used until the user edits something.
 */
export function useServiceWorkspace<T>(serviceId: ServiceId, seed: (factory: Factory) => T) {
  const { id: factoryId, factory, tier } = useActiveFactory();
  const stored = useJahez((s) => s.factories[factoryId]?.serviceData?.[serviceId]) as T | undefined;
  const save = useJahez((s) => s.setServiceData);
  const [fallback] = useState(() => seed(factory));
  const data = stored ?? fallback;
  const setData = useCallback(
    (next: T | ((prev: T) => T)) => {
      const cur = (useJahez.getState().factories[factoryId]?.serviceData?.[serviceId] as T | undefined) ?? fallback;
      save(factoryId, serviceId, typeof next === "function" ? (next as (p: T) => T)(cur) : next);
    },
    [factoryId, serviceId, save, fallback]
  );
  const reset = useCallback(() => save(factoryId, serviceId, undefined), [factoryId, serviceId, save]);
  return { factoryId: factoryId as FactoryId, factory, tier, data, setData, reset, edited: stored !== undefined };
}

// ---------------- Category icon ----------------
const ICONS = { megaphone: Megaphone, compass: Compass, workflow: Workflow, users: Users, palette: Palette, ship: Ship, "bar-chart": BarChart3, target: Target, "badge-check": BadgeCheck } as const;

export function CategoryIcon({ icon, className }: { icon: ServiceCategory["icon"]; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
}

/** Coloured tile with the category icon. */
export function CategoryGlyph({ category, size = "md", className }: { category: ServiceCategory; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xl", size === "sm" && "size-8 [&_svg]:size-4", size === "md" && "size-10 [&_svg]:size-5", size === "lg" && "size-14 rounded-2xl [&_svg]:size-7", className)}
      style={{ backgroundColor: `${category.accent}14`, color: category.accent, boxShadow: `inset 0 0 0 1px ${category.accent}33` }}
    >
      <CategoryIcon icon={category.icon} />
    </span>
  );
}

// ---------------- Workspace frame ----------------
export function WorkspaceFrame({
  service,
  actions,
  children,
  notice,
  onReset,
}: {
  service: ServiceDefinition;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Extra limitation text shown in the footer (in addition to the standard simulation notice). */
  notice?: React.ReactNode;
  onReset?: () => void;
}) {
  const category = categoryOf(service.category);
  const { factory } = useActiveFactory();
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-card md:p-6">
        <div className="pointer-events-none absolute -end-20 -top-24 size-64 rounded-full blur-3xl" style={{ backgroundColor: `${category.accent}1F` }} aria-hidden />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <CategoryGlyph category={category} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: category.accent }}>
                <span>{t("Service {number} · {category}", { number: service.number, category: ar ? (category.nameAr ?? category.name) : category.name })}</span>
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-navy-900 md:text-2xl"><span className="text-teal-600">{ar ? JAHEZ_BRAND.ar : JAHEZ_BRAND.en}</span> {ar ? (service.nameAr ?? service.name) : service.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>{t("Prepared for")} <span className="font-medium text-navy-800">{ar ? (factory.nameAr ?? factory.name) : factory.name}</span></span>
                <Badge tone="teal"><Sparkles /> {t("AI workspace")}</Badge>
                <Badge tone="gold"><FlaskConical /> {t("Simulated")}</Badge>
                {service.humanDelivered ? <Badge tone="amber"><Users /> {t("Consultant-led in production")}</Badge> : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
            {onReset ? <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw /> {t("Reset")}</Button> : null}
          </div>
        </div>
      </div>
      <motion.div className="jz-workspace min-w-0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {children}
      </motion.div>
      <div className="mt-6 flex items-start gap-2 rounded-xl border border-gold-300/60 bg-gold-50 px-4 py-3 text-xs text-gold-600">
        <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {t("Demonstration workspace. All figures, names, buyers, certifications and AI outputs are fictional simulations prepared from demo data and must be reviewed by qualified people before real-world use.")}
          {service.limitations.length ? ` ${service.limitations.map((l) => t(l)).join(" · ")}.` : ""} {notice}
        </span>
      </div>
    </div>
  );
}

// ---------------- Panels & tiles ----------------
export function Panel({ title, description, actions, children, className, bodyClassName }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {title || actions ? (
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold text-navy-900">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function KpiTile({ label, value, delta, tone = "neutral", icon, hint, className }: { label: string; value: React.ReactNode; delta?: string; tone?: "neutral" | "good" | "bad" | "warn"; icon?: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted">
        <span className="truncate">{label}</span>
        {icon ? <span className="text-navy-500 [&_svg]:size-4">{icon}</span> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-navy-900">{value}</span>
        {delta ? (
          <span className={cn("text-xs font-semibold tabular-nums", tone === "good" && "text-emerald-600", tone === "bad" && "text-red-600", tone === "warn" && "text-amber-600", tone === "neutral" && "text-muted")}>{delta}</span>
        ) : null}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

/** Highlighted AI-generated insight / recommendation. */
export function AIInsight({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700"><Sparkles className="size-3.5" /> {title ?? t("AI insight")}</div>
      <div className="mt-1.5 text-sm text-navy-800">{children}</div>
    </div>
  );
}

/** Click-to-edit text. Multiline uses a textarea. */
export function EditableText({ value, onChange, multiline, className, placeholder, ariaLabel }: { value: string; onChange: (v: string) => void; multiline?: boolean; className?: string; placeholder?: string; ariaLabel?: string }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };
  if (editing) {
    const common = {
      autoFocus: true,
      value: draft,
      "aria-label": ariaLabel,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      className: cn("w-full rounded-lg border border-teal-300 bg-white px-2 py-1 text-navy-900 outline-none ring-2 ring-teal-100", className),
    };
    return multiline ? (
      <textarea rows={Math.max(3, draft.split("\n").length + 1)} {...common} onKeyDown={(e) => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }} />
    ) : (
      <input {...common} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }} />
    );
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel ? t("Edit {field}", { field: ariaLabel }) : t("Edit")}
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn("group/edit relative w-full rounded-lg px-2 py-1 text-start transition hover:bg-teal-50/60 hover:ring-1 hover:ring-teal-200", multiline && "whitespace-pre-line", className)}
    >
      {value || <span className="text-muted">{placeholder ?? t("Click to edit")}</span>}
      <Pencil className="absolute end-1.5 top-1.5 size-3 text-teal-600 opacity-0 transition group-hover/edit:opacity-100" />
    </button>
  );
}

const STATUS_TONES = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  bad: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  neutral: "bg-navy-900/5 text-navy-700 ring-line",
} as const;

export function StatusPill({ tone = "neutral", children, className }: { tone?: keyof typeof STATUS_TONES; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset [&_svg]:size-3", STATUS_TONES[tone], className)}>{children}</span>;
}

/** Chart palette consistent with the Jahez design language. */
export const CHART_COLORS = ["#0FA396", "#0B1F3A", "#C9A24B", "#6366F1", "#38BDF8", "#EC4899", "#F59E0B", "#94A3B8"] as const;

export const serviceById = (id: ServiceId) => SERVICES[id];
