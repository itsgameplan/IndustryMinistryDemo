"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle, ArrowRight, ArrowUp, ArrowDown, Box, Factory, Gauge, HeartPulse, Info, Layers, Play, ShieldCheck, Sparkles, Truck, Wrench, Zap, Bell,
  Check, Cpu,
} from "lucide-react";
import { BuildWithAIButton } from "@/components/shell/shared";
import { AssessmentNudge } from "@/components/product/factory-status";
import { CountUp, MaturityCard, SystemsGrid } from "@/components/product/dashboard-kit";
import { HeroBackdrop, TierPath } from "@/components/product/command-hero";
import { DELTA_MACHINES } from "@/lib/data/machines";
import { SOLUTIONS } from "@/lib/data/solutions";
import { readingAt, useLiveTelemetry } from "@/lib/telemetry";
import { nextTierProgress, useActiveFactory } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { MachineReading } from "@/lib/types";

const EASE = [0.16, 1, 0.3, 1] as const;
const STATUS_BAR = { healthy: "bg-teal-500", watch: "bg-amber-400", critical: "bg-red-500" } as const;
const card = "rounded-[24px] border border-white bg-white/85 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_16px_40px_-22px_rgba(11,31,58,0.25)] backdrop-blur";

/** Delta style: live, operational — clean Apple-like command center. */
export function CommandCenterDashboard() {
  const { factory, state, tier } = useActiveFactory();
  const { readings, alerts, now } = useLiveTelemetry(2000);
  const reduce = useReducedMotion();
  const t = useT();
  const { locale, isRtl } = useLocale();
  const ar = locale === "ar";
  const p = nextTierProgress(state.completedRequirements);
  const maintenanceLive = state.unlockedSolutions.includes("maintenance");

  // Fleet KPIs now vs. one hour ago (both from the same simulated telemetry model).
  const hourAgo = useMemo(() => DELTA_MACHINES.map((m) => readingAt(m, now - 3_600_000)), [now]);
  const kpi = (rs: MachineReading[]) => {
    const avg = (f: (r: MachineReading) => number) => rs.reduce((s, r) => s + f(r), 0) / Math.max(1, rs.length);
    return { oee: avg((r) => r.efficiency) * 0.93, load: rs.reduce((s, r) => s + r.current * 0.4 * 1.732 * 0.85, 0), health: avg((r) => r.health) };
  };
  const cur = kpi(readings);
  const prev = kpi(hourAgo);
  const connectedNote = factory.systems.find((s) => s.name.includes("OPC-UA"))?.note ?? "";
  const connected = Number(connectedNote.match(/(\d+)\s+machines/)?.[1] ?? DELTA_MACHINES.length);
  const critical = readings.filter((r) => r.status === "critical").length;
  const atRisk = readings.filter((r) => r.status !== "healthy").length;
  const time = new Date(now).toLocaleTimeString(ar ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const kpis = [
    { label: "Plant OEE", value: cur.oee, decimals: 1, suffix: "%", delta: cur.oee - prev.oee, deltaLabel: (d: number) => `${Math.abs(d).toFixed(1)} pp`, icon: Gauge },
    { label: "Total Load", value: cur.load, decimals: 0, suffix: " kW", delta: ((cur.load - prev.load) / Math.max(1, prev.load)) * 100, deltaLabel: (d: number) => `${Math.abs(d).toFixed(1)}%`, icon: Zap },
    { label: "Connected Machines", value: connected, decimals: 0, suffix: "", delta: 0, deltaLabel: () => "", icon: Layers },
    { label: "Fleet Health", value: cur.health, decimals: 0, suffix: "/100", delta: cur.health - prev.health, deltaLabel: (d: number) => `${Math.abs(d).toFixed(0)}`, icon: HeartPulse },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#070F1F] px-6 py-7 text-white shadow-lift md:px-9 md:py-9">
        <HeroBackdrop />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-3 rounded-full bg-white/[0.07] px-4 py-2 text-[13px] ring-1 ring-white/10 backdrop-blur">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-400" /></span>
                {t("Live")}
              </span>
              <span className="h-4 w-px bg-white/20" />
              <span className="tabular-nums text-white/80">{time}</span>
              <span className="hidden text-white/80 sm:inline">{ar ? factory.nameAr : factory.name}</span>
            </motion.div>
            <motion.h1 initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: EASE }} className="mt-5 text-3xl font-semibold tracking-[-0.025em] md:text-[46px] md:leading-[1.05]">
              {ar ? <>{t("Manufacturing Command Center")}</> : <><span className="text-white/75">Manufacturing</span> Command Center</>}
            </motion.h1>
            <motion.p initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-3 text-[15px] text-white/70 md:text-base">
              {t("Real-time operations, asset health, and digital maturity in one view.")}
            </motion.p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/digital-twin" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white/[0.06] px-5 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition hover:bg-white/[0.12]">
              <Box className="size-4" /> {t("Digital Twin")}
            </Link>
            {maintenanceLive ? (
              <Link href={SOLUTIONS.maintenance.route} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-navy-900 shadow-lg transition hover:-translate-y-0.5">
                {t("Predictive Maintenance")} <ArrowRight className="size-4 rtl:-scale-x-100" />
              </Link>
            ) : (
              <BuildWithAIButton solutionId="maintenance" label={t("Deploy Predictive Maintenance")} className="h-11 rounded-2xl" />
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, i) => {
            const up = k.delta >= 0;
            return (
              <motion.div
                key={k.label}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: EASE }}
                whileHover={reduce ? undefined : { y: -3 }}
                className="flex items-center gap-4 rounded-[20px] bg-white/[0.05] p-4 ring-1 ring-white/10 backdrop-blur-md transition-colors hover:bg-white/[0.08] md:p-5"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10"><k.icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-white/70">{t(k.label)}</div>
                  <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight md:text-[28px]"><CountUp value={k.value} decimals={k.decimals} suffix={k.suffix} /></div>
                </div>
                {k.deltaLabel(k.delta) ? (
                  <span className={cn("hidden shrink-0 items-center gap-0.5 self-end text-xs font-semibold tabular-nums sm:inline-flex", up ? "text-emerald-400" : "text-rose-400")}>
                    {up ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}{k.deltaLabel(k.delta)}
                  </span>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        <TierPath tier={tier} next={p.next} done={p.done} total={p.total} ratio={p.ratio} />
      </section>

      <AssessmentNudge />

      {/* Asset health · maturity · alerts */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr_1fr]">
        <motion.section initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1, ease: EASE }} className={cn(card, "p-6")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Layers className="mt-0.5 size-5 text-navy-800" />
              <div>
                <h2 className="font-semibold text-navy-900">{t("Asset Health")}</h2>
                <p className="text-xs text-muted">{t("Twin-monitored machines · live")}</p>
              </div>
            </div>
            {critical ? (
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600"><AlertTriangle className="size-3.5" /> {t("{count} Critical", { count: critical })}</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Check className="size-3.5" /> {t("Stable")}</span>
            )}
          </div>
          <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {readings.map((r, i) => {
              const m = DELTA_MACHINES.find((x) => x.id === r.machineId);
              return (
                <li key={r.machineId}>
                  <Link href={`/digital-twin?machine=${r.machineId}`} className="group block">
                    <div className="flex items-baseline justify-between text-[13px]">
                      <span className="font-medium text-navy-900 group-hover:text-teal-700">{m?.name.split(" ")[0]}</span>
                      <span className="tabular-nums text-navy-700">{r.health}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-900/[0.06]">
                      <motion.div
                        className={cn("h-full rounded-full", STATUS_BAR[r.status])}
                        initial={reduce ? false : { width: 0 }}
                        animate={{ width: `${r.health}%` }}
                        transition={{ duration: 0.9, delay: reduce ? 0 : 0.25 + i * 0.05, ease: EASE }}
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </motion.section>

        <MaturityCard />

        <motion.section initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2, ease: EASE }} className={cn(card, "p-6")}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 font-semibold text-navy-900"><Bell className="size-5 text-navy-800" /> {t("Open Alerts")}</h2>
            <Link href={maintenanceLive ? SOLUTIONS.maintenance.route : "/digital-twin"} aria-label={t("View all alerts")} className="grid size-8 place-items-center rounded-full text-navy-700 transition hover:bg-canvas">
              <ArrowRight className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
          <ul className="mt-4 space-y-2.5">
            {alerts.slice(0, 4).map((a, i) => {
              const m = DELTA_MACHINES.find((x) => x.id === a.machineId);
              const tone = a.severity === "critical" ? "bg-red-50 text-red-600" : a.severity === "warning" ? "bg-amber-50 text-amber-600" : "bg-canvas text-navy-600";
              const Icon = a.severity === "info" ? Info : AlertTriangle;
              return (
                <motion.li key={a.id} initial={reduce ? false : { opacity: 0, x: isRtl ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
                  <Link href={`/digital-twin?machine=${a.machineId}`} className={cn("flex items-center gap-3 rounded-2xl px-3.5 py-3 transition hover:brightness-[0.98]", tone)}>
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-navy-900">
                      {m?.name.split(" ")[0]} – {maintenanceLive ? t(a.title.replace(/^.*?—\s*/, "")) : a.severity === "critical" ? t("Threshold breach") : t("Above baseline")}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium capitalize opacity-80">{t(a.severity)}</span>
                  </Link>
                </motion.li>
              );
            })}
            {!alerts.length ? <li className="rounded-2xl bg-emerald-50 px-3.5 py-3 text-[13px] font-medium text-emerald-700">{t("All machines within baseline")}</li> : null}
          </ul>
        </motion.section>
      </div>

      {/* Workstreams */}
      <Workstreams atRisk={atRisk} maintenanceLive={maintenanceLive} completed={state.completedRequirements} />

      <SystemsGrid />
    </div>
  );
}

function Workstreams({ atRisk, maintenanceLive, completed }: { atRisk: number; maintenanceLive: boolean; completed: string[] }) {
  const reduce = useReducedMotion();
  const t = useT();
  const has = (id: string) => completed.includes(id);
  const items = [
    { label: "Production", icon: Play, ok: has("t3-production"), href: "/digital-twin" },
    { label: "Maintenance", icon: Wrench, ok: maintenanceLive, href: maintenanceLive ? SOLUTIONS.maintenance.route : "/deployments/maintenance" },
    { label: "Quality", icon: ShieldCheck, ok: has("t3-quality"), href: "/roadmap" },
    { label: "Energy & Utilities", icon: Zap, ok: has("t4-energy"), href: "/roadmap" },
    { label: "Supply Chain", icon: Truck, ok: has("t3-suppliers"), href: "/roadmap" },
    { label: "Governance", icon: Factory, ok: has("t3-governance"), href: "/roadmap" },
    { label: "Cybersecurity", icon: Cpu, ok: has("t4-cyber"), href: "/roadmap" },
  ];
  return (
    <section aria-labelledby="ws-title">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 id="ws-title" className="flex items-center gap-2 font-semibold text-navy-900"><Layers className="size-4" /> {t("Workstreams")}</h2>
        <Link href="/roadmap" className="inline-flex items-center gap-1 text-sm font-medium text-navy-700 hover:text-teal-700">{t("View all")} <ArrowRight className="size-4 rtl:-scale-x-100" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-[repeat(7,minmax(0,1fr))_1.7fr]">
        {items.map((w, i) => (
          <motion.div key={w.label} initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: EASE }} whileHover={reduce ? undefined : { y: -4 }}>
            <Link href={w.href} className={cn(card, "group relative flex h-full flex-col p-4 transition-shadow hover:shadow-lift")}>
              <span className={cn("absolute end-4 top-4 size-2 rounded-full", w.ok ? "bg-emerald-500" : "bg-amber-400")} />
              <w.icon className="size-5 text-navy-800 transition-transform duration-300 group-hover:scale-110" />
              <span className="mt-3 text-[13.5px] font-semibold leading-tight text-navy-900">{t(w.label)}</span>
              <span className={cn("mt-2.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", w.ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                {w.ok ? <Check className="size-3" /> : <AlertTriangle className="size-3" />} {w.ok ? t("On track") : t("Attention")}
              </span>
            </Link>
          </motion.div>
        ))}
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7, ease: EASE }} whileHover={reduce ? undefined : { y: -4 }} className="col-span-2 sm:col-span-4 xl:col-span-1">
          <Link href={maintenanceLive ? SOLUTIONS.maintenance.route : "/digital-twin"} className="group relative flex h-full items-center gap-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-50 via-white to-violet-100 p-5 shadow-[0_16px_40px_-22px_rgba(99,102,241,0.45)] ring-1 ring-indigo-100">
            <motion.span aria-hidden className="absolute -end-10 -top-10 size-36 rounded-full bg-violet-300/40 blur-2xl" animate={reduce ? undefined : { scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-navy-900"><Sparkles className="size-4 text-indigo-500" /> {t("AI Insight")}</div>
              <p className="mt-1.5 text-[13px] leading-snug text-navy-700">{atRisk ? t(atRisk > 1 ? "{count} machines show early signs of degradation." : "{count} machine shows early signs of degradation.", { count: atRisk }) : t("All machines operating within baseline.")}</p>
            </div>
            <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white text-indigo-600 shadow-md transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"><ArrowRight className="size-4 rtl:-scale-x-100" /></span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
