"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertOctagon, ArrowUpRight, BadgeCheck, CalendarClock, Clock3, Copy, FlaskConical, Fingerprint, MapPin, ShieldAlert, Sparkles, Users } from "lucide-react";
import { Badge, Button, Progress } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { PseudoQr } from "@/components/ministry/pseudo-qr";
import { SampleWatermark } from "@/components/ministry/public-header";
import { tierDef, REQUIREMENTS } from "@/lib/data/tiers";
import { FACTORIES } from "@/lib/data/factories";
import { fakeHash, governorateById, type LicenceStatus, type RegistryRecord } from "@/lib/data/national";
import { computeTier, maturityScore, useHydrated, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { DemoFactoryId, TierLevel } from "@/lib/types";

export type TierAttestation = "verified" | "provisional" | "baseline";

export interface VerificationView {
  record: RegistryRecord;
  tier: TierLevel;
  score: number;
  /** Last tier confirmed by (simulated) inspection. */
  verifiedTier: TierLevel;
  attestation: TierAttestation;
  requirementsMet?: number;
}

/** Completed requirement ids for the live demo factories (baseline until the store has hydrated). */
export function useLiveCompleted(): Record<DemoFactoryId, string[]> {
  const hydrated = useHydrated();
  const alNoor = useJahez((s) => s.factories["al-noor"].completedRequirements);
  const delta = useJahez((s) => s.factories.delta.completedRequirements);
  return useMemo(
    () => ({
      "al-noor": hydrated ? alNoor : FACTORIES["al-noor"].baselineRequirements,
      delta: hydrated ? delta : FACTORIES.delta.baselineRequirements,
    }),
    [hydrated, alNoor, delta]
  );
}

/** Pure resolver: fictional records use static tiers, live factories compute from requirements. */
export function resolveView(record: RegistryRecord, live: Record<DemoFactoryId, string[]>): VerificationView {
  if (!record.live) {
    return { record, tier: record.tier, score: record.score, verifiedTier: record.tier, attestation: record.tierStatus };
  }
  const baseline = FACTORIES[record.live].baselineTier;
  const completed = live[record.live];
  const tier = computeTier(completed);
  const attestation: TierAttestation = tier !== baseline ? "provisional" : tier === 0 ? "baseline" : "verified";
  return { record, tier, score: maturityScore(completed), verifiedTier: baseline, attestation, requirementsMet: completed.length };
}

/** Resolve a registry record's tier — LIVE from the demo store for the two Jahez factories. */
export function useVerificationView(record: RegistryRecord | null): VerificationView | null {
  const live = useLiveCompleted();
  return record ? resolveView(record, live) : null;
}

const STATUS_META: Record<LicenceStatus, { label: string; tone: "green" | "amber" | "red"; icon: React.ReactNode; ring: string }> = {
  valid: { label: "Valid", tone: "green", icon: <BadgeCheck />, ring: "from-emerald-500/15" },
  expired: { label: "Expired", tone: "amber", icon: <CalendarClock />, ring: "from-amber-500/15" },
  suspended: { label: "Suspended", tone: "red", icon: <AlertOctagon />, ring: "from-red-500/15" },
};

const ATTESTATION_TEXT: Record<TierAttestation, string> = {
  verified: "Verified by inspection (simulated)",
  provisional: "Provisional — AI-assessed, pending evidence review & inspection",
  baseline: "Baseline record — no digital tier assessed yet (simulated)",
};

const dateLocale = (locale: string) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");
export const formatDate = (iso: string, locale: string = "en") => new Date(`${iso}T00:00:00Z`).toLocaleDateString(dateLocale(locale), { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function VerificationCertificate({ view, verifiedAt }: { view: VerificationView; verifiedAt: number }) {
  const router = useRouter();
  const tr = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const setActive = useJahez((s) => s.setActiveFactory);
  const { record, tier, score, attestation, verifiedTier } = view;
  const status = STATUS_META[record.status];
  const gov = governorateById(record.governorateId);
  const t = tierDef(tier);
  const hash = fakeHash(`${record.licenseNo}|${record.status}|${tier}|${score}`);
  const ts = new Date(verifiedAt);
  const stamp = `${ts.toLocaleDateString(dateLocale(locale), { day: "2-digit", month: "short", year: "numeric" })} · ${ts.toLocaleTimeString(dateLocale(locale), { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

  const copyLink = async () => {
    const url = `${window.location.origin}/verify?id=${encodeURIComponent(record.licenseNo)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(tr("Verification link copied"));
    } catch {
      toast.error(tr("Couldn't access the clipboard"));
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="cert-title"
      className="relative overflow-hidden rounded-3xl border border-line bg-white shadow-lift"
    >
      <SampleWatermark />

      {/* Header band */}
      <div className="bg-grid-dark relative overflow-hidden bg-navy-900 px-5 py-5 text-white md:px-8">
        <div className={cn("absolute inset-y-0 end-0 w-2/3 bg-gradient-to-l to-transparent rtl:bg-gradient-to-r", status.ring)} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">
              <Fingerprint className="size-3.5" /> {tr("Jahez verification certificate")}
            </div>
            <h2 id="cert-title" className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">{ar ? record.nameAr : record.name}</h2>
            {ar ? <p lang="en" dir="ltr" className="mt-0.5 text-base text-white/70">{record.name}</p> : <p lang="ar" className="font-arabic mt-0.5 text-base text-white/70">{record.nameAr}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/50 bg-gold-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
              <FlaskConical className="size-3.5" /> {tr("Sample")}
            </span>
            {record.live ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-200">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-300 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-teal-300" /></span>
                {tr("Live from Jahez demo")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative grid gap-6 p-5 md:grid-cols-[1fr_auto] md:gap-8 md:p-8">
        <div className="min-w-0 space-y-6">
          {/* Status */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">{tr("Licence status")}</span>
            <Badge tone={status.tone} className="px-3 py-1 text-xs">{status.icon} {tr(status.label)}</Badge>
          </div>
          {record.statusNote ? (
            <p className={cn("flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm", record.status === "suspended" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800")}>
              <ShieldAlert className="mt-0.5 size-4 shrink-0" /> {tr(record.statusNote)}
            </p>
          ) : null}

          {/* Facts */}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Fact label={tr("Licence no.")} value={<span className="font-mono" dir="ltr">{record.licenseNo}</span>} />
            <Fact label={tr("Registration no.")} value={<span className="font-mono" dir="ltr">{record.registrationNo}</span>} />
            <Fact label={tr("Industry")} value={ar ? record.industryAr : record.industry} sub={ar ? undefined : record.industryAr} />
            <Fact label={tr("Governorate")} value={<span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-teal-600" />{(ar ? gov?.nameAr : gov?.name) ?? "—"}</span>} sub={ar ? undefined : gov?.nameAr} />
            <Fact label={tr("Validity")} value={`${formatDate(record.issuedOn, locale)} ${ar ? "←" : "→"} ${formatDate(record.expiresOn, locale)}`} />
            <Fact label={tr("Workforce (declared)")} value={<span className="inline-flex items-center gap-1"><Users className="size-3.5 text-teal-600" />{record.employees.toLocaleString("en-US")}</span>} />
          </dl>

          {/* Tier */}
          <section aria-label={tr("Digital maturity")} className="rounded-2xl border border-line bg-canvas/70 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">{tr("Jahez digital maturity")}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TierBadge tier={tier} size="lg" />
                  {ar ? null : <span className="font-arabic text-sm text-muted" lang="ar">{t.nameAr}</span>}
                </div>
              </div>
              <div className="text-end">
                <div className="text-3xl font-semibold tabular-nums tracking-tight text-navy-900">{score}<span className="text-base text-muted">/100</span></div>
                <div className="text-xs text-muted">{tr("maturity score")}</div>
              </div>
            </div>
            <Progress value={score} className="mt-4 h-1.5" barClassName="bg-gradient-to-r from-teal-500 to-teal-400" />
            <div className={cn(
              "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium",
              attestation === "verified" && "bg-emerald-50 text-emerald-800",
              attestation === "provisional" && "bg-gold-50 text-gold-600",
              attestation === "baseline" && "bg-navy-900/5 text-navy-700"
            )}>
              {attestation === "provisional" ? <Sparkles className="mt-px size-3.5 shrink-0" /> : <BadgeCheck className="mt-px size-3.5 shrink-0" />}
              <span>
                {tr(ATTESTATION_TEXT[attestation])}
                {attestation === "provisional" ? <span className="block font-normal opacity-80">{tr("Last inspection-verified tier: Tier {tier} · {name}", { tier: verifiedTier, name: ar ? tierDef(verifiedTier).nameAr : tierDef(verifiedTier).name })}</span> : null}
              </span>
            </div>
            {view.requirementsMet !== undefined ? (
              <p className="mt-3 text-xs text-muted">{tr("{met} of {total} framework requirements met", { met: view.requirementsMet, total: REQUIREMENTS.length })} · {tr(t.tagline)}</p>
            ) : (
              <p className="mt-3 text-xs text-muted">{tr(t.tagline)}{record.lastInspection ? ` · ${tr("last inspection {date} (simulated)", { date: formatDate(record.lastInspection, locale) })}` : ""}</p>
            )}
          </section>
        </div>

        {/* Seal column */}
        <aside className="flex flex-col items-center gap-4 border-t border-line pt-6 md:w-56 md:border-s md:border-t-0 md:ps-8 md:pt-0">
          <div className="rounded-2xl border border-line bg-white p-2.5 shadow-card">
            <PseudoQr seed={`${record.licenseNo}:${tier}`} />
          </div>
          <p className="text-center text-[11px] leading-snug text-muted">{tr("Decorative pattern — not a scannable or official code")}</p>
          <div className="w-full space-y-3 text-xs">
            <div>
              <div className="flex items-center gap-1 font-semibold uppercase tracking-wider text-muted"><Clock3 className="size-3" /> {tr("Verified at")}</div>
              <div className="mt-1 tabular-nums text-navy-900">{stamp}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 font-semibold uppercase tracking-wider text-muted"><Fingerprint className="size-3" /> {tr("Verification hash")}</div>
              <div className="mt-1 break-all font-mono text-[10.5px] leading-relaxed text-navy-700" dir="ltr" title={tr("Simulated hash — no cryptographic meaning")}>0x{hash}</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="relative flex flex-col gap-3 border-t border-line bg-gold-50/70 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <p className="flex items-start gap-2 text-xs font-medium text-gold-600">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
          {tr("SAMPLE — Demonstration simulation. Not an official Ministry of Industry record.")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}><Copy /> {tr("Copy link")}</Button>
          {record.live ? (
            <Button size="sm" onClick={() => { if (record.live) { setActive(record.live); router.push("/dashboard"); } }}>
              {tr("Open in Jahez")} <ArrowUpRight />
            </Button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

function Fact({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-navy-900">
        {value}
        {sub ? <span className="font-arabic mt-0.5 block text-xs font-normal text-muted" lang="ar">{sub}</span> : null}
      </dd>
    </div>
  );
}
