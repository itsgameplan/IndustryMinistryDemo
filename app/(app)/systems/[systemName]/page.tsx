"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { Button, Card, Progress } from "@/components/ui";
import { PageHeader } from "@/components/shell/shared";
import { useActiveFactory, useHydrated, useJahez, useNow } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import { localName } from "@/lib/utils";

const BUILD_SECONDS = 12;

export default function SystemPage() {
  const params = useParams<{ systemName: string }>();
  const raw = params?.systemName ?? "";
  let name = raw;
  try { name = decodeURIComponent(raw); } catch { /* Invalid names fall through to the not-found view. */ }
  const { factory, state, id } = useActiveFactory();
  const hydrated = useHydrated();
  const now = useNow(250);
  const t = useT();
  const { locale } = useLocale();
  const startBuild = useJahez((s) => s.startSystemBuild);
  const system = factory.systems.find((item) => item.name === name);
  const build = state.systemBuilds?.[name];
  const ready = system?.status === "active" || build?.status === "completed";
  const elapsed = build ? Math.min(BUILD_SECONDS, Math.max(0, (now - build.startedAt) / 1000)) : 0;
  const progress = Math.round(elapsed / BUILD_SECONDS * 100);
  const factoryName = localName(factory, locale);
  const systemName = t(name);

  if (!hydrated) return <div className="h-64 animate-pulse rounded-2xl bg-white" />;
  if (!system) return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-xl font-semibold text-navy-900">{t("System not found")}</h1>
      <p className="mt-2 text-sm text-muted">{t("This system is not listed for {factory}.", { factory: factoryName })}</p>
      <Button asChild className="mt-5"><Link href="/dashboard">{t("Back to dashboard")}</Link></Button>
    </Card>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-teal-700"><ArrowLeft className="size-4 rtl:-scale-x-100" /> {t("Dashboard")}</Link>
      <PageHeader eyebrow={t("Your systems")} title={systemName} description={`${factoryName} · ${ready ? t("System workspace") : build ? t("Build in progress") : t("Set up this system")}`} />

      {ready ? (
        <Card className="overflow-hidden">
          <div className="flex items-start gap-4 border-b border-line bg-emerald-50/60 p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-5" /></span>
            <div>
              <h2 className="font-semibold text-navy-900">{t("{name} is available", { name: systemName })}</h2>
              <p className="mt-1 text-sm text-navy-700">{build ? t("The simulated build is complete and this system is now live in your dashboard.") : t("This system was reported as active for your factory.")}</p>
            </div>
          </div>
          <div className="grid gap-5 p-6 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("Factory")}</h3>
              <p className="mt-2 text-sm font-medium text-navy-900">{factoryName}</p>
              <p className="mt-1 text-sm text-muted">{locale === "ar" ? (factory.industryAr || t(factory.industry)) : factory.industry}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("System status")}</h3>
              <p className="mt-2 text-sm font-medium text-emerald-700">{t("Live")}</p>
              {system.note ? <p className="mt-1 text-sm text-muted">{t(system.note)}</p> : null}
            </div>
          </div>
        </Card>
      ) : build?.status === "running" ? (
        <Card className="p-6 md:p-8" aria-live="polite">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><Sparkles className="size-5 animate-pulse" /></span><div><h2 className="font-semibold text-navy-900">{t("Building {name}", { name: systemName })}</h2><p className="text-sm text-muted">{t("Preparing your simulated system workspace")}</p></div></div>
          <Progress value={progress} className="mt-6" />
          <div className="mt-2 flex justify-between text-xs text-muted"><span>{t("{progress}% complete", { progress })}</span><span>{t("{seconds} seconds remaining", { seconds: Math.max(0, Math.ceil(BUILD_SECONDS - elapsed)) })}</span></div>
          <ol className="mt-6 grid gap-3 text-sm text-navy-700 sm:grid-cols-3">
            <li className={progress >= 15 ? "text-teal-700" : ""}>1. {t("Review factory profile")}</li>
            <li className={progress >= 50 ? "text-teal-700" : ""}>2. {t("Configure system")}</li>
            <li className={progress >= 85 ? "text-teal-700" : ""}>3. {t("Publish workspace")}</li>
          </ol>
        </Card>
      ) : (
        <Card className="p-6 md:p-8">
          <span className="grid size-12 place-items-center rounded-xl bg-teal-50 text-teal-700"><Sparkles className="size-6" /></span>
          <h2 className="mt-5 text-xl font-semibold text-navy-900">{t("Build {name} for {factory}", { name: systemName, factory: factoryName })}</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">{system.note ? t(system.note) : t("This system has not been set up yet.")} {t("Run a short simulation to make its workspace available in your dashboard.")}</p>
          <div className="mt-5 flex items-center gap-2 text-xs text-muted"><Clock3 className="size-4" /> {t("About {seconds} seconds · Demo build", { seconds: BUILD_SECONDS })}</div>
          <Button className="mt-6" variant="accent" onClick={() => startBuild(id, name)}><Sparkles /> {system.status === "partial" ? t("Complete build") : t("Build with AI")}</Button>
        </Card>
      )}
    </div>
  );
}
