"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { BadgeCheck, Building2, ChevronRight, FileSearch, Loader2, QrCode, Search, SearchX, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button, Card, DemoDisclaimer } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import { PublicHeader } from "@/components/ministry/public-header";
import { VerificationCertificate, useVerificationView } from "@/components/ministry/verification-certificate";
import { REGISTRY, SAMPLE_LICENCES, findRecords, governorateById, type LicenceStatus, type RegistryRecord } from "@/lib/data/national";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

export default function VerifyPage() {
  const t = useT();
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas">
        <PublicHeader current="verify" context="Public licence verification" />
        <Suspense fallback={<VerifyFallback />}>
          <VerifyExperience />
        </Suspense>
        <footer className="mx-auto max-w-5xl px-4 pb-10 md:px-8">
          <DemoDisclaimer>
            {t("SAMPLE — Demonstration simulation. Not an official Ministry of Industry record. Licence numbers, statuses and tiers shown here are fictional and confer no authorisation.")}
          </DemoDisclaimer>
        </footer>
      </div>
    </MotionConfig>
  );
}

function VerifyFallback() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="h-56 animate-pulse rounded-3xl bg-white" />
    </div>
  );
}

const LOOKUP_MS = 800;
const STATUS_DOT: Record<LicenceStatus, string> = { valid: "bg-emerald-500", expired: "bg-amber-500", suspended: "bg-red-500" };
const STATUS_LABEL: Record<LicenceStatus, string> = { valid: "valid", expired: "expired", suspended: "suspended" };

interface Resolution {
  key: string;
  at: number;
  matches: RegistryRecord[];
}

function VerifyExperience() {
  const t = useT();
  const { locale } = useLocale();
  const params = useSearchParams();
  const router = useRouter();
  const id = (params.get("id") ?? "").trim();
  const [nonce, setNonce] = useState(0);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const lookupKey = `${id}#${nonce}`;

  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => setResolution({ key: lookupKey, at: Date.now(), matches: findRecords(id) }), LOOKUP_MS);
    return () => clearTimeout(timer);
  }, [id, lookupKey]);

  const loading = Boolean(id) && resolution?.key !== lookupKey;
  const result = !loading && id ? resolution : null;

  const lookup = (q: string) => {
    const next = q.trim();
    if (next === id) setNonce((n) => n + 1);
    else router.replace(`/verify?id=${encodeURIComponent(next)}`, { scroll: false });
  };

  return (
    <main>
      <section className="bg-grid relative overflow-hidden border-b border-line bg-white">
        <div className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full bg-teal-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 start-10 size-72 rounded-full bg-gold-100/50 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-300/70 bg-gold-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-600">
              <TriangleAlert className="size-3.5 shrink-0" /> {t("Sample — demonstration only · not an official record")}
            </div>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-navy-900 md:text-[40px] md:leading-[1.1]">{t("Verify a factory licence & digital maturity tier")}</h1>
            <p className="mt-3 max-w-2xl text-[15px] text-muted">
              {t("Buyers, lenders and partners can confirm a factory's licence status and its Jahez maturity tier in seconds. Search by licence number, registration number or factory name.")}
            </p>
          </motion.div>

          <SearchForm key={id} initial={id} busy={loading} onSubmit={lookup} />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">{t("Try a sample:")}</span>
            {SAMPLE_LICENCES.map((lic) => {
              const rec = REGISTRY.find((r) => r.licenseNo === lic);
              return (
                <button
                  key={lic}
                  type="button"
                  onClick={() => lookup(lic)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 font-mono text-[11px] font-medium text-navy-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                    id === lic ? "border-teal-400 ring-2 ring-teal-100" : "border-line"
                  )}
                  title={rec ? `${locale === "ar" ? rec.nameAr : rec.name} — ${t(STATUS_LABEL[rec.status])}` : lic}
                >
                  {rec ? <span className={cn("size-1.5 rounded-full", STATUS_DOT[rec.status])} aria-hidden /> : null}
                  {lic}
                  {rec?.live ? <span className="rounded bg-teal-50 px-1 font-sans text-[9px] font-bold uppercase tracking-wider text-teal-700">{t("Live")}</span> : null}
                  {rec && rec.status !== "valid" ? <span className="sr-only">({t(STATUS_LABEL[rec.status])})</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10" aria-live="polite" aria-busy={loading}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingState query={id} />
            </motion.div>
          ) : !result ? (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IdleState />
            </motion.div>
          ) : result.matches.length === 0 ? (
            <motion.div key={`nf-${result.key}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <NotFound query={id} />
            </motion.div>
          ) : result.matches.length > 1 ? (
            <motion.div key={`multi-${result.key}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MatchList matches={result.matches} onPick={(r) => lookup(r.licenseNo)} />
            </motion.div>
          ) : (
            <motion.div key={`cert-${result.key}`} exit={{ opacity: 0 }}>
              <ResolvedCertificate record={result.matches[0]} at={result.at} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

function SearchForm({ initial, busy, onSubmit }: { initial: string; busy: boolean; onSubmit: (q: string) => void }) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      role="search"
      className="mt-7"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q.length < 3) {
          setError(t("Enter at least 3 characters — a licence no. (e.g. {example}), registration no. or factory name.", { example: "DEMO-LIC-AN-0417" }));
          return;
        }
        setError(null);
        onSubmit(q);
      }}
    >
      <label htmlFor="verify-q" className="sr-only">{t("Licence number, registration number or factory name")}</label>
      <div className={cn("flex flex-col gap-2 rounded-2xl border bg-white p-2 shadow-lift sm:flex-row sm:items-center", error ? "border-red-300" : "border-line")}>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
          <Search className="size-5 shrink-0 text-navy-500" aria-hidden />
          <input
            id="verify-q"
            value={value}
            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
            placeholder={t("Licence no., registration no. or name")}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "verify-err" : undefined}
            className="h-12 w-full min-w-0 bg-transparent text-[15px] text-navy-900 placeholder:text-muted/70 focus:outline-none"
          />
        </div>
        <Button type="submit" size="lg" disabled={busy} className="sm:min-w-36">
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} {busy ? t("Verifying…") : t("Verify")}
        </Button>
      </div>
      {error ? <p id="verify-err" role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-red-700"><TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}</p> : null}
    </form>
  );
}

function ResolvedCertificate({ record, at }: { record: RegistryRecord; at: number }) {
  const view = useVerificationView(record);
  if (!view) return null;
  return <VerificationCertificate view={view} verifiedAt={at} />;
}

function LoadingState({ query }: { query: string }) {
  const t = useT();
  const { isRtl } = useLocale();
  const steps = ["Normalising identifier", "Querying sample registry", "Resolving Jahez maturity tier"];
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <div className="relative grid size-16 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-teal-400/30" />
        <span className="relative grid size-14 place-items-center rounded-full bg-navy-900 text-white shadow-lift">
          <Loader2 className="size-6 animate-spin" aria-hidden />
        </span>
      </div>
      <h2 className="mt-5 break-all text-lg font-semibold text-navy-900">{t("Verifying")} <span className="font-mono text-base" dir="auto">{query}</span></h2>
      <ul className="mt-4 space-y-1.5 text-sm text-muted">
        {steps.map((s, i) => (
          <motion.li key={s} initial={{ opacity: 0, x: isRtl ? 6 : -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.22 }} className="flex items-center justify-center gap-2">
            <span className="size-1.5 rounded-full bg-teal-500" /> {t(s)}
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}

function IdleState() {
  const t = useT();
  const items = [
    { icon: <FileSearch />, title: "Search the sample registry", body: "Look up by licence no., commercial registration no. or factory name (English or Arabic)." },
    { icon: <BadgeCheck />, title: "Confirm status", body: "See whether the licence is valid, expired or suspended in this simulated registry." },
    { icon: <QrCode />, title: "Check digital maturity", body: "Jahez tiers update live as factories deploy solutions — AI-assessed tiers stay provisional until inspected." },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((it, i) => (
        <motion.div key={it.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
          <Card className="h-full p-5">
            <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600 [&_svg]:size-5">{it.icon}</div>
            <h2 className="mt-4 text-[15px] font-semibold text-navy-900">{t(it.title)}</h2>
            <p className="mt-1 text-sm text-muted">{t(it.body)}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function NotFound({ query }: { query: string }) {
  const t = useT();
  const [before, after = ""] = t("Nothing in the sample registry matches {query}. Check the number for typos, or try one of the sample licences above.").split("{query}");
  return (
    <Card className="bg-grid flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-white text-red-600 shadow-card"><SearchX className="size-6" /></div>
      <h2 className="mt-5 text-lg font-semibold text-navy-900">{t("No record found")}</h2>
      <p className="mt-1 max-w-md break-words text-sm text-muted">
        {before}<span className="font-mono font-medium text-navy-900" dir="auto">“{query}”</span>{after}
      </p>
      <p className="mt-4 max-w-md text-xs text-muted">{t("This demo registry only contains fictional records — a missing result says nothing about any real factory.")}</p>
    </Card>
  );
}

function MatchList({ matches, onPick }: { matches: RegistryRecord[]; onPick: (r: RegistryRecord) => void }) {
  const t = useT();
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-navy-900">{t("{count} matching factories", { count: matches.length })}</h2>
        <p className="mt-0.5 text-sm text-muted">{t("Select a record to view its verification certificate.")}</p>
      </div>
      <ul className="divide-y divide-line">
        {matches.map((r) => <MatchRow key={r.licenseNo} record={r} onPick={onPick} />)}
      </ul>
    </Card>
  );
}

function MatchRow({ record, onPick }: { record: RegistryRecord; onPick: (r: RegistryRecord) => void }) {
  const view = useVerificationView(record);
  const { locale } = useLocale();
  const ar = locale === "ar";
  const gov = governorateById(record.governorateId);
  return (
    <li>
      <button type="button" onClick={() => onPick(record)} className="flex w-full items-center gap-4 px-5 py-4 text-start transition hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900/5 text-navy-700"><Building2 className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy-900">{ar ? record.nameAr : record.name}</span>
          <span className="block truncate text-xs text-muted"><span dir="ltr">{record.licenseNo}</span> · {ar ? gov?.nameAr : gov?.name}</span>
        </span>
        {view ? <TierBadge tier={view.tier} size="sm" className="hidden sm:inline-flex" /> : null}
        <ChevronRight className="size-4 text-muted rtl:-scale-x-100" />
      </button>
    </li>
  );
}
