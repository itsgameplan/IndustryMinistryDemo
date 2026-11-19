"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, ArrowUpRight, BellOff, Box, BrainCircuit, CalendarClock, CalendarPlus, Check, Clock3, Cpu, Gauge as GaugeIcon, HeartPulse, Radio, Thermometer, TrendingDown, Waves, Wrench, Zap,
} from "lucide-react";
import { Badge, Button, Dialog, DialogContent, Input, Label, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/shell/shared";
import { DELTA_MACHINES, machineById } from "@/lib/data/machines";
import { historyFor, useLiveTelemetry } from "@/lib/telemetry";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Machine, MachineAlert, MachineReading } from "@/lib/types";
import { Gauge, STATUS_COLOR, Sparkline, TrendChart, healthColor } from "./charts";
import { FloorMap } from "./floor-map";
import { diagnosis, downtimeAvoided, featureImportance, fleetMtbfHours, localizeAlertText, shortName, thresholds } from "./model";

const DEFAULT_MACHINE = "cnc-07";
const STATUS_LABEL = { healthy: "Healthy", watch: "Watch", critical: "Critical" } as const;
type Metric = "vibration" | "temperature" | "health";
type Range = "24h" | "7d";

const egp = (v: number) => (v >= 1_000_000 ? `EGP ${formatNumber(v / 1_000_000, 2)}M` : `EGP ${formatNumber(Math.round(v / 1000))}K`);
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateLocale = (locale: string) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");
const prettyDate = (s: string, dl = "en-GB") => new Date(`${s}T00:00:00`).toLocaleDateString(dl, { weekday: "short", day: "numeric", month: "short" });

/** Next Saturday (low-load shift) that is no later than the RUL-based deadline; falls back to the deadline. */
function suggestedDate(rulDays: number) {
  const now = new Date();
  const deadline = Math.max(1, Math.min(rulDays, 7));
  for (let i = 1; i <= deadline; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (d.getDay() === 6) return isoDate(d);
  }
  const d = new Date(now);
  d.setDate(now.getDate() + deadline);
  return isoDate(d);
}

const ROUTINE_PLAN = [
  { machineId: "lathe-02", task: "Quarterly preventive service — way lubrication and chuck inspection", inDays: 9 },
  { machineId: "robot-04", task: "Gearbox grease change (A1–A3) per OEM interval", inDays: 16 },
  { machineId: "conv-01", task: "Belt tension and roller bearing check", inDays: 23 },
];

export function MaintenanceCommandCenter() {
  const t = useT();
  const { locale } = useLocale();
  const dl = dateLocale(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const param = params.get("machine");
  const selectedId = param && machineById(param) ? param : DEFAULT_MACHINE;
  const machine = machineById(selectedId) as Machine;

  const { id: factoryId, state } = useActiveFactory();
  const acknowledge = useJahez((s) => s.acknowledgeAlert);
  const schedule = useJahez((s) => s.scheduleMaintenance);
  const { now, readings, alerts } = useLiveTelemetry(2000);

  const [dialog, setDialog] = useState<{ machineId: string; date: string; note: string } | null>(null);

  const select = (id: string) => router.replace(`${pathname}?machine=${id}`, { scroll: false });
  const reading = readings.find((r) => r.machineId === selectedId) as MachineReading;

  const kpis = useMemo(() => {
    const avg = readings.reduce((s, r) => s + r.health, 0) / readings.length;
    const atRisk = readings.filter((r) => r.status !== "healthy");
    const avoided = readings.reduce((s, r) => s + downtimeAvoided(machineById(r.machineId) as Machine, r), 0);
    return { avg: Math.round(avg), atRisk: atRisk.length, critical: atRisk.filter((r) => r.status === "critical").length, avoided, mtbf: fleetMtbfHours(readings) };
  }, [readings]);

  const ackSet = new Set(state.acknowledgedAlerts);
  const openAlerts = alerts.filter((a) => !ackSet.has(a.id));
  const topCritical = openAlerts.find((a) => a.severity === "critical");
  const sensorCount = DELTA_MACHINES.reduce((s, m) => s + m.sensors.length, 0);

  const openSchedule = (machineId: string, note?: string) => {
    const m = machineById(machineId) as Machine;
    const r = readings.find((x) => x.machineId === machineId) as MachineReading;
    const alert = alerts.find((a) => a.machineId === machineId);
    const existing = state.scheduledMaintenance.find((s) => s.machineId === machineId);
    setDialog({
      machineId,
      date: existing?.date ?? suggestedDate(r.rulDays),
      note: existing?.note ?? (note ? localizeAlertText(note, t) : undefined) ?? (alert ? localizeAlertText(alert.recommendation, t) : undefined) ?? t("Planned inspection of {machine} — verify vibration and temperature against baseline.", { machine: shortName(m) }),
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <PageHeader
        eyebrow={t("AI Predictive Maintenance · Delta Precision")}
        title={t("Maintenance command center")}
        description={t("Live sensor streams from 8 connected machines, scored every few seconds by the failure-prediction model. All estimates are illustrative.")}
        actions={
          <>
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-medium text-navy-700 shadow-card">
              <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative size-2 rounded-full bg-emerald-500" /></span>
              {t("Live · {count} sensors", { count: sensorCount })} · <span className="tabular-nums">{new Date(now).toLocaleTimeString(dl)}</span>
            </span>
            <Button asChild variant="outline">
              <Link href={`/digital-twin?machine=${selectedId}`}><Box /> {t("Open 3D twin")}</Link>
            </Button>
          </>
        }
      />

      {/* ---------- KPI band ---------- */}
      <section className="bg-grid-dark relative overflow-hidden rounded-3xl bg-navy-950 p-5 text-white shadow-lift md:p-6">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={<HeartPulse />} label={t("Fleet average health")} value={`${kpis.avg}`} suffix="/100" accent={healthColor(kpis.avg)} hint={t("{count} machines monitored", { count: DELTA_MACHINES.length })} />
          <Kpi icon={<AlertTriangle />} label={t("Machines at risk")} value={`${kpis.atRisk}`} suffix={`/ ${DELTA_MACHINES.length}`} accent={kpis.critical ? STATUS_COLOR.critical : STATUS_COLOR.watch} hint={t("{critical} critical · {watch} on watch", { critical: kpis.critical, watch: kpis.atRisk - kpis.critical })} />
          <Kpi icon={<TrendingDown />} label={t("Downtime cost avoided")} value={egp(kpis.avoided)} accent="#D1AE5C" hint={t("Next 14 days · illustrative estimate")} />
          <Kpi icon={<Clock3 />} label={t("Fleet MTBF")} value={formatNumber(kpis.mtbf)} suffix="h" accent="#5FD6C8" hint={t("Mean time between failures · est.")} />
        </div>

        <AnimatePresence>
          {topCritical && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="relative mt-4 overflow-hidden rounded-2xl border border-red-400/30 bg-gradient-to-r from-red-500/15 via-red-500/[0.07] to-transparent">
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/20 text-red-300">
                  <span className="absolute inset-0 animate-ping rounded-xl bg-red-500/20" />
                  <AlertTriangle className="relative size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{localizeAlertText(topCritical.title, t)}</div>
                  <div className="mt-0.5 text-[13px] text-white/65">{localizeAlertText(topCritical.detail, t)}</div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {topCritical.machineId !== selectedId && <Button size="sm" variant="dark" onClick={() => select(topCritical.machineId)}><Activity /> {t("Inspect")}</Button>}
                  <Button size="sm" variant="danger" onClick={() => openSchedule(topCritical.machineId)}><CalendarPlus /> {t("Schedule repair")}</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ---------- Fleet + detail ---------- */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <FleetList readings={readings} now={now} selectedId={selectedId} onSelect={select} scheduled={state.scheduledMaintenance.map((s) => s.machineId)} />
        <MachineDetail key={machine.id} machine={machine} reading={reading} now={now} scheduled={state.scheduledMaintenance.find((s) => s.machineId === machine.id)} onSchedule={() => openSchedule(machine.id)} />
      </div>

      {/* ---------- Alerts · schedule · floor ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 2xl:grid-cols-[1.2fr_1fr_1fr]">
        <AlertsPanel alerts={alerts} acknowledged={ackSet} selectedId={selectedId} onSelect={select} onAck={(a) => { acknowledge(factoryId, a.id); toast.success(t("Alert acknowledged"), { description: t("{title} — assigned to the maintenance lead.", { title: localizeAlertText(a.title, t) }) }); }} onSchedule={(a) => openSchedule(a.machineId, a.recommendation)} />
        <SchedulePanel items={state.scheduledMaintenance} onSelect={select} onEdit={(id) => openSchedule(id)} />
        <div className="bg-grid-dark rounded-2xl border border-white/5 bg-navy-950 p-5 text-white shadow-card lg:col-span-2 2xl:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold tracking-tight">{t("Shop floor")}</div>
              <div className="text-xs text-white/50">{t("Same layout and telemetry as the 3D twin")}</div>
            </div>
            <Link href={`/digital-twin?machine=${selectedId}`} className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-teal-300 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">{t("3D view")} <ArrowUpRight className="size-3.5" /></Link>
          </div>
          <div className="mt-4"><FloorMap readings={readings} selectedId={selectedId} onSelect={select} /></div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-white/55">
            {(["healthy", "watch", "critical"] as const).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />{t(STATUS_LABEL[s])}</span>)}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">{t("Failure probabilities, remaining-useful-life and cost figures are model estimates on simulated data — illustrative only, not engineering guarantees.")}</p>

      <ScheduleDialog
        value={dialog}
        onChange={setDialog}
        onSave={(v) => {
          schedule(factoryId, v);
          setDialog(null);
          const m = machineById(v.machineId) as Machine;
          toast.success(t("Maintenance scheduled"), { description: t("{machine} · {date} · work order sent to the maintenance lead.", { machine: shortName(m), date: prettyDate(v.date, dl) }) });
        }}
      />
    </MotionConfig>
  );
}

function Kpi({ icon, label, value, suffix, hint, accent }: { icon: React.ReactNode; label: string; value: string; suffix?: string; hint: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs font-medium text-white/55">
        <span>{label}</span>
        <span className="[&_svg]:size-4" style={{ color: accent }}>{icon}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-[26px] font-semibold tracking-tight tabular-nums">{value}</span>
        {suffix ? <span className="text-sm text-white/40">{suffix}</span> : null}
      </div>
      <div className="mt-1 text-[11.5px] text-white/45">{hint}</div>
      <div className="mt-3 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </div>
  );
}

function FleetList({ readings, now, selectedId, onSelect, scheduled }: { readings: MachineReading[]; now: number; selectedId: string; onSelect: (id: string) => void; scheduled: string[] }) {
  const t = useT();
  const minute = Math.floor(now / 60000);
  const sparks = useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const m of DELTA_MACHINES) out[m.id] = historyFor(m, 24, 30 * 60 * 1000, minute * 60000).map((r) => r.health);
    return out;
  }, [minute]);
  const order = [...readings].sort((a, b) => a.health - b.health);
  return (
    <section className="rounded-2xl border border-white/5 bg-navy-950 text-white shadow-card xl:sticky xl:top-24 xl:self-start" aria-label={t("Machine fleet")}>
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div>
          <div className="text-[15px] font-semibold tracking-tight">{t("Machine health")}</div>
          <div className="text-xs text-white/50">{t("Sorted by risk · refreshes every 2 s")}</div>
        </div>
        <Radio className="size-4 text-teal-300" />
      </div>
      <ul className="p-2">
        {order.map((r) => {
          const m = machineById(r.machineId) as Machine;
          const sel = m.id === selectedId;
          const color = STATUS_COLOR[r.status];
          return (
            <motion.li layout key={m.id} transition={{ type: "spring", stiffness: 400, damping: 40 }}>
              <button onClick={() => onSelect(m.id)} aria-pressed={sel} className={cn("group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", sel ? "bg-white/[0.09] ring-1 ring-white/15" : "hover:bg-white/[0.04]")}>
                <span className="relative grid size-10 shrink-0 place-items-center">
                  <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                    <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 16} strokeDashoffset={2 * Math.PI * 16 * (1 - r.health / 100)} className="transition-[stroke-dashoffset] duration-700" />
                  </svg>
                  <span className="text-[11px] font-semibold tabular-nums">{r.health}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{shortName(m)}</span>
                    {r.status !== "healthy" && <span className="rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide" style={{ color, background: `${color}22` }}>{t(STATUS_LABEL[r.status])}</span>}
                    {scheduled.includes(m.id) && <CalendarClock className="size-3.5 text-teal-300" aria-label={t("Maintenance scheduled")} />}
                  </span>
                  <span className="block truncate text-[11.5px] text-white/45">{t(m.line)}</span>
                </span>
                <span className="w-16 shrink-0">
                  <Sparkline values={sparks[m.id]} color={color} className="h-6 w-full" />
                  <span className="block text-end text-[10.5px] tabular-nums text-white/45">{r.vibration} mm/s</span>
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

function MachineDetail({ machine: m, reading: r, now, scheduled, onSchedule }: { machine: Machine; reading: MachineReading; now: number; scheduled?: { date: string; note: string }; onSchedule: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const dl = dateLocale(locale);
  const [metric, setMetric] = useState<Metric>("vibration");
  const [range, setRange] = useState<Range>("24h");
  const th = thresholds(m);
  const history = useMemo(() => {
    const points = range === "24h" ? 48 : 56;
    const step = range === "24h" ? 30 * 60 * 1000 : 3 * 60 * 60 * 1000;
    return historyFor(m, points, step, now).map((h) => ({
      ...h,
      label: range === "24h" ? h.label : new Date(h.timestamp).toLocaleDateString(dl, { weekday: "short" }) + " " + h.label,
    }));
  }, [m, now, range, dl]);
  const features = useMemo(() => featureImportance(m), [m]);
  const color = STATUS_COLOR[r.status];

  const metricCfg: Record<Metric, { label: string; unit: string; color: string; baseline: number; alarm: number; domain?: [number, number]; invert?: boolean }> = {
    vibration: { label: t("Vibration"), unit: "mm/s", color: "#5FD6C8", ...th.vibration },
    temperature: { label: t("Temperature"), unit: "°C", color: "#D1AE5C", ...th.temperature },
    health: { label: t("Health"), unit: "/100", color: "#8FB3FF", ...th.health, domain: [0, 100], invert: true },
  };
  const cfg = metricCfg[metric];

  const live = [
    { icon: Thermometer, label: t("Temperature"), value: `${r.temperature}`, unit: "°C", warn: r.temperature > th.temperature.alarm },
    { icon: Waves, label: t("Vibration"), value: `${r.vibration}`, unit: "mm/s", warn: r.vibration > th.vibration.alarm },
    { icon: Zap, label: t("Current||electric"), value: `${r.current}`, unit: "A", warn: false },
    { icon: GaugeIcon, label: t("Pressure"), value: `${r.pressure}`, unit: "bar", warn: false },
    { icon: Cpu, label: t("Efficiency"), value: `${r.efficiency}`, unit: "%", warn: r.efficiency < m.baseEfficiency - 5 },
    { icon: HeartPulse, label: t("Health"), value: `${r.health}`, unit: "/100", warn: r.status !== "healthy" },
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="@container min-w-0 overflow-hidden rounded-2xl border border-white/5 bg-navy-900 text-white shadow-lift" aria-label={t("{machine} detail", { machine: m.name })}>
      {/* header */}
      <div className="relative border-b border-white/[0.07] px-5 py-5 md:px-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60" style={{ background: `radial-gradient(60% 120% at 100% 0%, ${color}22, transparent)` }} />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ color, background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}55` }}>
                <span className="size-1.5 rounded-full" style={{ background: color }} />{t(STATUS_LABEL[r.status])}
              </span>
              <span className="text-xs text-white/45">{t(m.line)}</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight md:text-[22px]">{m.name}</h2>
            <div className="mt-1 text-[13px] text-white/50">{m.model} · {t("installed {year}", { year: m.installed })} · {t("{count} sensors", { count: m.sensors.length })}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="dark" size="sm"><Link href={`/digital-twin?machine=${m.id}`}><Box /> {t("View in 3D twin")}</Link></Button>
            <Button variant={r.status === "critical" ? "danger" : "accent"} size="sm" onClick={onSchedule}><CalendarPlus /> {scheduled ? t("Reschedule") : t("Schedule maintenance")}</Button>
          </div>
        </div>
        {scheduled && (
          <div className="relative mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-400/10 px-3 py-1.5 text-xs text-teal-200 ring-1 ring-inset ring-teal-400/20">
            <CalendarClock className="size-3.5" /> {t("Scheduled for {date}", { date: prettyDate(scheduled.date, dl) })} — {localizeAlertText(scheduled.note, t)}
          </div>
        )}
      </div>

      {/* risk row */}
      <div className="grid gap-px bg-white/[0.06] @xl:grid-cols-2 @4xl:grid-cols-[220px_200px_minmax(0,1fr)]">
        <div className="bg-navy-900 p-5">
          <div className="text-xs font-medium text-white/55">{t("Failure probability · 14 days")}</div>
          <div className="mx-auto mt-2 max-w-[200px]"><Gauge value={r.failureProbability} label={t("Failure probability")} /></div>
        </div>
        <div className="flex flex-col justify-between bg-navy-900 p-5">
          <div>
            <div className="text-xs font-medium text-white/55">{t("Remaining useful life")}</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums" style={{ color }}>{r.rulDays}</span>
              <span className="text-sm text-white/45">{t("days")}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, (r.rulDays / 160) * 100)}%`, background: color }} />
            </div>
            <div className="mt-1.5 text-[11px] text-white/40">{t("Estimate ± 20% · illustrative")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-white/[0.06] @md:grid-cols-3 @xl:col-span-2 @4xl:col-span-1">
          {live.map(({ icon: Icon, label, value, unit, warn }) => (
            <div key={label} className="bg-navy-900 px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] text-white/45"><Icon className="size-3.5" /> {label}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <motion.span key={value} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className={cn("text-lg font-semibold tabular-nums", warn && "text-red-300")}>{value}</motion.span>
                <span className="text-[11px] text-white/40">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* trend */}
      <div className="border-t border-white/[0.07] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-white/[0.06] p-0.5" role="tablist" aria-label={t("Trend metric")}>
            {(Object.keys(metricCfg) as Metric[]).map((k) => (
              <button key={k} role="tab" aria-selected={metric === k} onClick={() => setMetric(k)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", metric === k ? "bg-white text-navy-900" : "text-white/60 hover:text-white")}>{metricCfg[k].label}</button>
            ))}
          </div>
          <div className="inline-flex rounded-lg bg-white/[0.06] p-0.5" role="tablist" aria-label={t("Time range")}>
            {(["24h", "7d"] as Range[]).map((k) => (
              <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)} className={cn("rounded-md px-2.5 py-1.5 text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", range === k ? "bg-white/15 text-white" : "text-white/50 hover:text-white")}>{k}</button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-60">
          <TrendChart data={history.map((h) => ({ label: h.label, value: h[metric] }))} color={cfg.color} baseline={cfg.baseline} alarm={cfg.alarm} unit={cfg.unit} domain={cfg.domain} invert={cfg.invert} />
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-white/45">
          <span className="inline-flex items-center gap-1.5"><span className="h-px w-4 border-t border-dashed border-white/50" /> {cfg.invert ? t("Watch below {value}", { value: cfg.baseline }) : t("Baseline {value} {unit}", { value: cfg.baseline, unit: cfg.unit })}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-px w-4 border-t border-dashed border-red-400" /> {cfg.invert ? t("Critical below {value}", { value: cfg.alarm }) : t("Alarm {value} {unit}", { value: cfg.alarm, unit: cfg.unit })}</span>
        </div>
      </div>

      {/* AI explanation */}
      <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.06] @3xl:grid-cols-2">
        <div className="bg-navy-900 px-5 py-5 md:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><BrainCircuit className="size-4 text-teal-300" /> {t("What is driving the prediction")}</div>
          <ul className="mt-4 space-y-3">
            {features.map((f, i) => (
              <li key={f.name}>
                <div className="flex justify-between gap-3 text-[12.5px]">
                  <span className="text-white/75">{t(f.name)}</span>
                  <span className="tabular-nums text-white/50">{Math.round(f.weight * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${f.weight * 100 * 2}%` }} transition={{ duration: 0.6, delay: i * 0.06 }} className="h-full max-w-full rounded-full" style={{ background: i === 0 ? color : "rgba(95,214,200,0.55)" }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-[11px] text-white/35">{t("Relative contribution to the current risk score (illustrative attribution).")}</div>
        </div>
        <div className="bg-navy-900 px-5 py-5 md:px-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><Wrench className="size-4 text-gold-400" /> {t("AI diagnosis")}</div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">{diagnosis(m, r, t)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <div className="text-white/45">{t("Model confidence")}</div>
              <div className="mt-0.5 text-base font-semibold tabular-nums">{r.status === "critical" ? "0.87" : r.status === "watch" ? "0.74" : "0.92"}</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <div className="text-white/45">{t("Avoidable downtime")}</div>
              <div className="mt-0.5 text-base font-semibold tabular-nums">{r.status === "healthy" ? "—" : egp(downtimeAvoided(m, r))}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function AlertsPanel({ alerts, acknowledged, selectedId, onSelect, onAck, onSchedule }: { alerts: MachineAlert[]; acknowledged: Set<string>; selectedId: string; onSelect: (id: string) => void; onAck: (a: MachineAlert) => void; onSchedule: (a: MachineAlert) => void }) {
  const t = useT();
  const sorted = [...alerts].sort((a, b) => Number(acknowledged.has(a.id)) - Number(acknowledged.has(b.id)));
  const open = alerts.filter((a) => !acknowledged.has(a.id)).length;
  return (
    <section className="rounded-2xl border border-line bg-white shadow-card" aria-label={t("Alerts")}>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-navy-900">{t("Predictive alerts")}</div>
          <div className="text-xs text-muted">{t("{open} open · {ack} acknowledged", { open, ack: alerts.length - open })}</div>
        </div>
        <Badge tone={open ? "red" : "green"}>{open ? t("{count} open", { count: open }) : t("All clear")}</Badge>
      </div>
      <ul className="divide-y divide-line">
        <AnimatePresence initial={false}>
          {sorted.map((a) => {
            const ack = acknowledged.has(a.id);
            const m = machineById(a.machineId) as Machine;
            return (
              <motion.li layout key={a.id} className={cn("px-5 py-4", ack && "bg-canvas/60", a.machineId === selectedId && !ack && "bg-red-50/30")}>
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", ack ? "bg-navy-900/5 text-muted" : a.severity === "critical" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}>
                    {ack ? <Check className="size-4" /> : <AlertTriangle className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => onSelect(a.machineId)} className={cn("text-start text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", ack ? "text-navy-600" : "text-navy-900")}>{localizeAlertText(a.title, t)}</button>
                      <Badge tone={ack ? "neutral" : a.severity === "critical" ? "red" : "amber"}>{ack ? t("Acknowledged") : a.severity === "critical" ? t("Critical") : t("Warning")}</Badge>
                    </div>
                    {!ack && (
                      <>
                        <p className="mt-1 text-[13px] text-muted">{localizeAlertText(a.detail, t)}</p>
                        <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-[12.5px] text-navy-700"><span className="font-semibold">{t("Recommended:")}</span> {localizeAlertText(a.recommendation, t)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="primary" onClick={() => onSchedule(a)}><CalendarPlus /> {t("Schedule")}</Button>
                          <Button size="sm" variant="outline" onClick={() => onAck(a)}><BellOff /> {t("Acknowledge")}</Button>
                          {a.machineId !== selectedId && <Button size="sm" variant="ghost" onClick={() => onSelect(a.machineId)}><Activity /> {t("Inspect {machine}", { machine: shortName(m) })}</Button>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {alerts.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted">{t("No active alerts — every machine is within its normal envelope.")}</li>}
      </ul>
    </section>
  );
}

function SchedulePanel({ items, onSelect, onEdit }: { items: { machineId: string; date: string; note: string }[]; onSelect: (id: string) => void; onEdit: (id: string) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const dl = dateLocale(locale);
  const ai = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date();
  return (
    <section className="rounded-2xl border border-line bg-white shadow-card" aria-label={t("Maintenance schedule")}>
      <div className="border-b border-line px-5 py-4">
        <div className="text-[15px] font-semibold tracking-tight text-navy-900">{t("Maintenance schedule")}</div>
        <div className="text-xs text-muted">{t("AI-recommended work orders and the calendar plan")}</div>
      </div>
      <div className="p-5">
        {ai.length === 0 ? (
          <div className="bg-grid rounded-xl border border-dashed border-line px-4 py-6 text-center">
            <CalendarPlus className="mx-auto size-5 text-teal-600" />
            <div className="mt-2 text-sm font-medium text-navy-900">{t("No predictive work orders yet")}</div>
            <div className="mt-0.5 text-xs text-muted">{t("Schedule a repair from an alert to plan it before failure.")}</div>
          </div>
        ) : (
          <ol className="space-y-2.5">
            {ai.map((s) => {
              const m = machineById(s.machineId) as Machine;
              const d = new Date(`${s.date}T00:00:00`);
              return (
                <li key={s.machineId} className="flex gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
                  <div className="grid w-12 shrink-0 place-items-center rounded-lg bg-white py-1.5 text-center shadow-sm">
                    <div className="text-[10px] font-semibold uppercase text-teal-700">{d.toLocaleDateString(dl, { month: "short" })}</div>
                    <div className="text-lg font-semibold leading-none tabular-nums text-navy-900">{d.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onSelect(m.id)} className="text-sm font-semibold text-navy-900 hover:underline">{shortName(m)}</button>
                      <Badge tone="teal">{t("AI-recommended")}</Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-navy-700">{localizeAlertText(s.note, t)}</p>
                    <button onClick={() => onEdit(m.id)} className="mt-1 text-xs font-medium text-teal-700 hover:underline">{t("Edit")}</button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Calendar plan")}</div>
        <ol className="mt-2 space-y-2">
          {ROUTINE_PLAN.map((p) => {
            const m = machineById(p.machineId) as Machine;
            const d = new Date(today);
            d.setDate(today.getDate() + p.inDays);
            return (
              <li key={p.machineId} className="flex items-start gap-3 rounded-lg px-1 py-1">
                <span className="mt-0.5 w-14 shrink-0 text-xs tabular-nums text-muted">{d.toLocaleDateString(dl, { day: "numeric", month: "short" })}</span>
                <span className="min-w-0 text-[13px] text-navy-800"><button onClick={() => onSelect(m.id)} className="font-semibold hover:underline">{shortName(m)}</button> — {t(p.task)}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function ScheduleDialog({ value, onChange, onSave }: { value: { machineId: string; date: string; note: string } | null; onChange: (v: { machineId: string; date: string; note: string } | null) => void; onSave: (v: { machineId: string; date: string; note: string }) => void }) {
  const t = useT();
  const m = value ? machineById(value.machineId) : undefined;
  const minDate = isoDate(new Date());
  return (
    <Dialog open={!!value} onOpenChange={(o) => { if (!o) onChange(null); }}>
      {value && m ? (
        <DialogContent title={t("Schedule maintenance · {machine}", { machine: shortName(m) })} description={t("{model} · {line}. A work order is sent to the maintenance lead and shift supervisor.", { model: m.model, line: t(m.line) })}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!value.date) return;
              onSave({ ...value, note: value.note.trim() || t("Planned maintenance") });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="maint-machine">{t("Machine")}</Label>
              <select id="maint-machine" value={value.machineId} onChange={(e) => onChange({ ...value, machineId: e.target.value })} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100">
                {DELTA_MACHINES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="maint-date">{t("Date")}</Label>
              <Input id="maint-date" type="date" min={minDate} value={value.date} required onChange={(e) => onChange({ ...value, date: e.target.value })} />
              <p className="mt-1 text-xs text-muted">{t("Suggested: the next Saturday low-load shift before the predicted failure window.")}</p>
            </div>
            <div>
              <Label htmlFor="maint-note">{t("Work order note")}</Label>
              <Textarea id="maint-note" rows={3} value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onChange(null)}>{t("Cancel")}</Button>
              <Button type="submit" variant="accent"><CalendarPlus /> {t("Schedule")}</Button>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
