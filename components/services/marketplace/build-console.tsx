"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, Circle, Clock, Loader2, LogOut, PartyPopper, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Button, DemoDisclaimer } from "@/components/ui";
import { CategoryGlyph, CategoryIcon } from "@/components/services/kit";
import { getDeployable, localizeDeployLog } from "@/lib/data/deployables";
import { categoryOf } from "@/lib/data/services";
import { deploymentKey, deploymentProgress, useActiveFactory, useJahez, useNow } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLocalName, useServiceTitle } from "./shared";
import type { DeploymentLog, ServiceDefinition } from "@/lib/types";

const AGENT_TONES = [
  "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  "bg-indigo-400/15 text-indigo-300 ring-indigo-400/30",
  "bg-gold-400/15 text-gold-300 ring-gold-400/30",
  "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  "bg-rose-400/15 text-rose-300 ring-rose-400/30",
];
const clock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Compact live console for an IMC service build (mirrors the flagship deployment console). */
export function ServiceBuildConsole({ service }: { service: ServiceDefinition }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const localName = useLocalName();
  const serviceTitle = useServiceTitle();
  const { id: factoryId, factory } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, service.id)]);
  const now = useNow(250);
  const script = useMemo(() => getDeployable(service.id, factory), [service.id, factory]);
  const category = categoryOf(service.category);
  const agents = useMemo(() => Array.from(new Set(script.stages.map((s) => s.agent))), [script]);
  const toneFor = (agent: string) => AGENT_TONES[Math.max(0, agents.indexOf(agent)) % AGENT_TONES.length];

  const p = deploymentProgress(dep, now);
  const pct = Math.round(p.ratio * 100);
  const finishing = p.elapsed >= script.durationSeconds;
  const eta = script.durationSeconds - p.elapsed;
  const stageIdx = script.stages.reduce((acc, s, i) => (s.startsAt <= p.elapsed ? i : acc), 0);
  const active = script.stages[stageIdx];
  const logs = script.logs.filter((l) => l.at <= p.elapsed).map((l) => ({ ...l, message: localizeDeployLog(l.message, t) }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ms-2"><Link href="/services"><ArrowLeft className="rtl:-scale-x-100" /> {t("Marketplace||services")}</Link></Button>
        <span className="text-xs text-muted">{t("{factory} · build {id}", { factory: locale === "ar" ? (factory.nameAr ?? factory.name) : factory.name, id: service.id })}</span>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-navy-950 text-white shadow-lift" aria-live="polite">
        <div className="bg-grid-dark absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full blur-3xl" style={{ backgroundColor: `${category.accent}33` }} aria-hidden />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative shrink-0 self-start">
              {!reduce ? <span className="absolute inset-0 animate-pulse-ring rounded-2xl" style={{ backgroundColor: `${category.accent}40` }} aria-hidden /> : null}
              <span className="relative grid size-16 place-items-center rounded-2xl [&_svg]:size-8" style={{ backgroundColor: `${category.accent}26`, color: category.accent, boxShadow: `inset 0 0 0 1px ${category.accent}66` }}>
                <CategoryIcon icon={category.icon} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/15 px-2.5 py-0.5 font-semibold text-teal-200"><Loader2 className="size-3 animate-spin" /> {finishing ? t("Finalising") : t("Building")}</span>
                <span className="text-white/50">{t("Service {number} · {category}", { number: service.number, category: localName(category) })}</span>
              </div>
              <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight md:text-2xl">{t("Preparing {service}", { service: serviceTitle(service) })}</h1>
              <AnimatePresence mode="wait">
                <motion.p key={finishing ? "fin" : active.id} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -4 }} className="mt-1 text-sm text-white/65">
                  {finishing ? t("Publishing your workspace…") : <>{t("Stage {current}/{total}", { current: stageIdx + 1, total: script.stages.length })} · <span className="text-white">{t(active.label)}</span> — {t(active.agent)}</>}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="flex shrink-0 gap-6 md:flex-col md:items-end md:gap-2">
              <div className="md:text-end">
                <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/45 md:justify-end"><Clock className="size-3" /> {t("ETA")}</div>
                <div className="font-mono text-3xl tabular-nums">{clock(eta)}</div>
              </div>
              <div className="md:text-end">
                <div className="text-[11px] uppercase tracking-wider text-white/45">{t("Progress")}</div>
                <div className="font-mono text-3xl tabular-nums text-teal-300">{pct}%</div>
              </div>
            </div>
          </div>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("Build progress")}>
            <div className="h-full rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-teal-400 to-teal-300 transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center">
        <LogOut className="size-5 shrink-0 text-teal-600" aria-hidden />
        <p className="flex-1 text-sm text-navy-700"><span className="font-semibold text-navy-900">{t("You can leave this page.")}</span> {t("Agents keep working and you'll be notified when the workspace is ready.")}</p>
        <Button variant="outline" size="sm" onClick={() => { router.push("/services"); toast(t("Build continues in the background"), { description: t("{service} · {time} remaining", { service: serviceTitle(service), time: clock(eta) }) }); }}>
          {t("Back to marketplace")}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="font-semibold text-navy-900">{t("Agent pipeline")}</span>
            <span className="text-xs tabular-nums text-muted">{finishing ? script.stages.length : stageIdx}/{script.stages.length}</span>
          </div>
          <ol className="space-y-3">
            {script.stages.map((s, i) => {
              const next = script.stages[i + 1]?.startsAt ?? script.durationSeconds;
              const status = p.elapsed >= next ? "done" : s.startsAt <= p.elapsed ? "active" : "pending";
              const local = status === "active" ? Math.min(1, (p.elapsed - s.startsAt) / (next - s.startsAt)) : status === "done" ? 1 : 0;
              return (
                <li key={s.id} className="flex gap-3">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", status === "done" ? "bg-teal-500 text-white" : status === "active" ? "bg-teal-50 text-teal-600 ring-2 ring-teal-400" : "bg-canvas text-navy-500/50 ring-1 ring-line")}>
                    {status === "done" ? <CheckCircle2 className="size-3.5" /> : status === "active" ? <Loader2 className="size-3.5 animate-spin" /> : <Circle className="size-2.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-sm font-medium", status === "pending" ? "text-muted" : "text-navy-900")}>{t(s.label)}</div>
                    <div className="text-xs text-muted">{t(s.agent)}</div>
                    {status === "active" ? (
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-teal-50">
                        <div className="h-full rounded-full bg-teal-400 transition-[width] duration-300 ease-linear" style={{ width: `${local * 100}%` }} />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <BuildTerminal serviceId={service.id} factoryId={factoryId} logs={logs} total={script.logs.length} elapsed={p.elapsed} agents={agents.length} toneFor={toneFor} />
      </div>

      <section aria-labelledby="build-deliverables">
        <h2 id="build-deliverables" className="mb-3 text-sm font-semibold text-navy-900">{t("Workspace deliverables")}</h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {service.demoDeliverables.map((d, i) => {
            const ready = p.ratio >= (i + 1) / (service.demoDeliverables.length + 1);
            return (
              <li key={d} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors", ready ? "border-teal-200 bg-teal-50/60 text-navy-900" : "border-line bg-white text-muted")}>
                {ready ? <CheckCircle2 className="size-4 shrink-0 text-teal-600" /> : <Circle className="size-4 shrink-0 text-navy-500/30" />}
                <span className="min-w-0">{t(d)}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <DemoDisclaimer>{t("Simulated AI build for demonstration. Outputs are generated from demo data; no external systems are contacted or modified. Activating a service never changes your maturity tier.")}</DemoDisclaimer>
    </div>
  );
}

function BuildTerminal({ serviceId, factoryId, logs, total, elapsed, agents, toneFor }: { serviceId: string; factoryId: string; logs: DeploymentLog[]; total: number; elapsed: number; agents: number; toneFor: (a: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  const last = logs[logs.length - 1];
  const typed = last ? Math.min(last.message.length, Math.floor((elapsed - last.at) * 90) + 6) : undefined;

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length, typed]);

  return (
    <div className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-2xl border border-navy-800 bg-navy-950 shadow-card">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /></span>
        <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-xs text-white/55"><Terminal className="size-3.5 shrink-0" /> jahez-agents · service/{serviceId}</span>
        <span className="ms-auto font-mono text-[11px] tabular-nums text-white/40">{logs.length}/{total}</span>
      </div>
      <div ref={ref} className="scrollbar-thin max-h-[380px] flex-1 space-y-1.5 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed" role="log" aria-live="polite" aria-label={t("Agent activity log")}>
        <div className="break-all text-white/35" dir="ltr">$ jahez service activate {serviceId} --factory {factoryId} --agents {agents}</div>
        {logs.map((l, i) => {
          const isLast = i === logs.length - 1;
          const text = isLast && typed != null ? l.message.slice(0, typed) : l.message;
          return (
            <div key={`${l.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="tabular-nums text-white/30">[{clock(l.at)}]</span>
              <span className={cn("rounded px-1.5 py-px text-[11px] ring-1 ring-inset", toneFor(l.agent))}>{t(l.agent)}</span>
              <span className={cn("min-w-0 basis-full break-words sm:basis-auto sm:flex-1", l.level === "success" ? "text-emerald-300" : l.level === "warn" ? "text-amber-300" : "text-white/80")}>
                {l.level === "success" ? "✓ " : l.level === "warn" ? "! " : ""}
                {text}
                {isLast ? <span className="ms-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-teal-300" aria-hidden /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Brief success banner shown above a freshly installed workspace. Self-hiding after a few seconds
 * (own ticker, so the workspace below is not re-rendered).
 */
export function BuildSuccessBanner({ service }: { service: ServiceDefinition }) {
  const reduce = useReducedMotion();
  const t = useT();
  const { id: factoryId } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, service.id)]);
  const now = useNow(1000);
  const category = categoryOf(service.category);
  const fresh = !!dep?.completedAt && now - dep.completedAt < 9000;
  return (
    <AnimatePresence>
      {fresh ? (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, height: 0, marginBottom: 0 }}
          className="mb-5 overflow-hidden"
          role="status"
        >
          <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-navy-950 p-4 text-white md:p-5">
            <div className="bg-grid-dark absolute inset-0" aria-hidden />
            <div className="pointer-events-none absolute -start-10 -top-16 size-48 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
            <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-400 text-navy-950"><PartyPopper className="size-5" /></span>
            <div className="relative min-w-0 flex-1">
              <div className="text-sm font-semibold">{t("Workspace ready — built by {count} AI agents in {seconds}s", { count: service.buildAgents.length + 1, seconds: service.deploySeconds })}</div>
              <p className="text-xs text-white/65">{t("Everything below is editable and saved for this factory. Simulated outputs — review before real-world use.")}</p>
            </div>
            <span className="relative hidden sm:block"><CategoryGlyph category={category} size="sm" className="bg-white/10" /></span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

