"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { motion, useReducedMotion } from "motion/react";
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, Crosshair, Gauge, Heart, Lock, Radio, Sparkles, Thermometer, TrendingUp, Zap } from "lucide-react";
import { BuildWithAIButton } from "@/components/shell/shared";
import { historyFor } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import { localizeAlertText } from "@/components/solutions/maintenance/model";
import type { Machine, MachineAlert, MachineReading } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL, sensorStatus, sensorValue } from "./constants";

type HistoryPoint = ReturnType<typeof historyFor>[number];
type TrendKey = "temperature" | "vibration" | "current";

const card = "rounded-[22px] border border-white bg-white/80 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-18px_rgba(11,31,58,0.22)] backdrop-blur";
const heading = "text-[12px] font-semibold uppercase tracking-[0.16em] text-navy-700";

const PERIODS = [
  { id: "30m", label: "Last 30 min", step: 37_500 },
  { id: "6h", label: "Last 6 hours", step: 7.5 * 60_000 },
  { id: "24h", label: "Last 24 hours", step: 30 * 60_000 },
] as const;

const TRENDS: { key: TrendKey; label: string; unit: string; color: string }[] = [
  { key: "temperature", label: "Machine Temperature", unit: "°C", color: "#F59E0B" },
  { key: "vibration", label: "Vibration RMS", unit: "mm/s", color: "#EF4444" },
  { key: "current", label: "Motor Current", unit: "A", color: "#6366F1" },
];

export interface TwinPanelProps {
  machine: Machine;
  reading: MachineReading;
  alerts: MachineAlert[];
  now: number;
  maintenanceUnlocked: boolean;
  selectedSensorId: string | null;
  onSelectSensor: (machineId: string, sensorId: string) => void;
  onFocus: () => void;
}

export function TwinPanel({ machine, reading, alerts, now, maintenanceUnlocked, selectedSensorId, onSelectSensor, onFocus }: TwinPanelProps) {
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const status = reading.status;
  const machineAlerts = alerts.filter((a) => a.machineId === machine.id);
  const vibHigh = reading.vibration / machine.baseVibration > 1.6;
  const [line, area] = machine.line.split(" · ");
  const enter = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const } });

  return (
    <div className="flex flex-col gap-4">
      {/* Identity */}
      <motion.section key={`id-${machine.id}`} {...enter(0)} className={cn(card, "p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t(line)}{area ? <><span className="mx-1 text-muted/60">{locale === "ar" ? "‹" : "›"}</span> {t(area)}</> : null}
            </div>
            <h3 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-navy-900">{machine.name}</h3>
            <p className="mt-0.5 text-sm text-muted">{machine.model} • {t("Installed {year}", { year: machine.installed })}</p>
          </div>
          <StatusChip status={status} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={onFocus} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-canvas px-3.5 text-xs font-semibold text-navy-800 ring-1 ring-inset ring-line transition hover:bg-white hover:shadow-card">
            <Crosshair className="size-3.5" /> {t("Focus in 3D")}
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {new Date(reading.timestamp).toLocaleTimeString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB")}
          </span>
        </div>
      </motion.section>

      {/* AI forecast */}
      {maintenanceUnlocked ? (
        <motion.section {...enter(1)} className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0E1B33] to-[#0A1428] p-5 text-white shadow-[0_18px_40px_-18px_rgba(5,14,31,0.7)]">
          <ForecastGlow />
          <div className="relative flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em]">
            <Sparkles className="size-4" /> {t("AI Failure Forecast")}
          </div>
          <div className="relative mt-4 grid grid-cols-3">
            <Metric label={t("Failure Prob.")} value={`${Math.round(reading.failureProbability * 100)}%`} color={reading.failureProbability >= 0.4 ? "#FB7185" : reading.failureProbability >= 0.15 ? "#FBBF24" : "#34D399"} />
            <Metric label={t("Remaining Life")} value={String(reading.rulDays)} unit={t("days")} divider />
            <Metric label={t("Health")} value={String(reading.health)} unit="/100" divider />
          </div>
        </motion.section>
      ) : (
        <motion.section {...enter(1)} className={cn(card, "p-5")}>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-navy-900 text-white"><Lock className="size-4" /></span>
            <div>
              <div className="text-sm font-semibold text-navy-900">{t("AI forecast locked")}</div>
              <p className="mt-0.5 text-xs text-muted">{t("Deploy predictive maintenance to see failure risk and remaining life.")}</p>
            </div>
          </div>
          <BuildWithAIButton solutionId="maintenance" size="sm" className="mt-4 w-full rounded-full" label={t("Deploy predictive maintenance")} />
        </motion.section>
      )}

      {/* Live readings */}
      <motion.section {...enter(2)} className={cn(card, "p-5")}>
        <h4 className={heading}>{t("Live Readings")}</h4>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Reading icon={<Thermometer />} label={t("Temperature")} value={reading.temperature.toFixed(1)} unit="°C" />
          <Reading icon={<Activity />} label={t("Vibration")} value={reading.vibration.toFixed(2)} unit="mm/s" alert={vibHigh} />
          <Reading icon={<Zap />} label={t("Current||electric")} value={reading.current.toFixed(1)} unit="A" />
          <Reading icon={<Gauge />} label={t("Pressure")} value={reading.pressure.toFixed(2)} unit="bar" />
          <Reading icon={<TrendingUp />} label={t("Efficiency")} value={reading.efficiency.toFixed(1)} unit="%" />
          <Reading icon={<Heart />} label={t("Health")} value={maintenanceUnlocked ? String(reading.health) : "—"} unit={maintenanceUnlocked ? "/100" : undefined} />
        </div>
      </motion.section>

      {/* Trends */}
      <motion.section {...enter(3)} className={cn(card, "p-5")}>
        <Trends machine={machine} now={now} />
      </motion.section>

      {/* Alerts */}
      {machineAlerts.length ? (
        <motion.section {...enter(4)} className={cn(card, "p-5")}>
          <h4 className={heading}>{t("Alerts")}</h4>
          <div className="mt-3 grid gap-2">
            {machineAlerts.map((a) => (
              <div key={a.id} className={cn("rounded-2xl px-3.5 py-3", a.severity === "critical" ? "bg-red-50" : "bg-amber-50")}>
                <div className={cn("flex items-center gap-1.5 text-[13px] font-semibold", a.severity === "critical" ? "text-red-700" : "text-amber-700")}>
                  <AlertTriangle className="size-3.5" />
                  {maintenanceUnlocked ? localizeAlertText(a.title, t) : a.severity === "critical" ? t("{machine} threshold breach", { machine: machine.name.split(" ")[0] }) : t("{machine} above baseline", { machine: machine.name.split(" ")[0] })}
                </div>
                <p className="mt-1 text-xs text-navy-700">{maintenanceUnlocked ? localizeAlertText(a.recommendation, t) : t("Diagnosis requires predictive maintenance.")}</p>
              </div>
            ))}
          </div>
        </motion.section>
      ) : null}

      {/* Sensors */}
      <motion.section {...enter(5)} className={cn(card, "p-5")}>
        <h4 className={heading}>{t("IoT Sensors")}</h4>
        <div className="mt-3 grid gap-1.5">
          {machine.sensors.map((s) => {
            const st = sensorStatus(s.kind, machine, reading);
            const v = sensorValue(s.kind, reading);
            const active = selectedSensorId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSensor(machine.id, s.id)}
                className={cn("flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-start transition", active ? "bg-navy-900 text-white shadow-card" : "bg-canvas/70 hover:bg-canvas")}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR[st], boxShadow: `0 0 8px ${STATUS_COLOR[st]}` }} />
                <span className={cn("min-w-0 flex-1 truncate text-[13px] font-medium", active ? "text-white" : "text-navy-900")}>{t(s.label)}</span>
                <span className="tabular-nums">
                  <span className="text-sm font-semibold">{v.value}</span>
                  <span className={cn("ms-0.5 text-[11px]", active ? "text-white/60" : "text-muted")}>{v.unit}</span>
                </span>
                <Radio className={cn("size-3.5 shrink-0", active ? "text-teal-300" : "text-muted/40")} />
              </button>
            );
          })}
        </div>
      </motion.section>

      {maintenanceUnlocked ? (
        <Link href={`/solutions/maintenance?machine=${machine.id}`} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-navy-900 text-sm font-semibold text-white transition hover:bg-navy-800">
          {t("Open in Predictive Maintenance")} <ArrowUpRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function StatusChip({ status }: { status: MachineReading["status"] }) {
  const t = useT();
  const styles = { healthy: "bg-emerald-50 text-emerald-700", watch: "bg-amber-50 text-amber-700", critical: "bg-red-50 text-red-600" } as const;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", styles[status])}>
      {status === "healthy" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
      {t(STATUS_LABEL[status])}
    </span>
  );
}

function Metric({ label, value, unit, color, divider }: { label: string; value: string; unit?: string; color?: string; divider?: boolean }) {
  return (
    <div className={cn("min-w-0", divider && "border-s border-white/15 ps-4")}>
      <div className="text-[12px] text-white/70">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[28px] font-semibold leading-none tabular-nums" style={color ? { color } : undefined}>{value}</span>
        {unit ? <span className="text-sm text-white/60">{unit}</span> : null}
      </div>
    </div>
  );
}

/** Animated red glow curve, bottom-right of the forecast card. */
function ForecastGlow() {
  const reduce = useReducedMotion();
  const gid = `fg-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg aria-hidden viewBox="0 0 200 120" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 right-0 h-full w-1/2">
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0%" stopColor="#F43F5E" stopOpacity="0" />
          <stop offset="100%" stopColor="#F43F5E" stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${gid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,118 C80,116 120,100 150,70 C170,50 185,40 200,36 L200,120 L0,120Z" fill={`url(#${gid}-f)`} />
      <motion.path
        d="M0,118 C80,116 120,100 150,70 C170,50 185,40 200,36"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="2.5"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        style={{ filter: "drop-shadow(0 0 6px #F43F5E)" }}
      />
    </svg>
  );
}

function Reading({ icon, label, value, unit, alert }: { icon: React.ReactNode; label: string; value: string; unit?: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-2xl px-3.5 py-3 transition", alert ? "bg-red-50 ring-1 ring-inset ring-red-100" : "bg-white ring-1 ring-inset ring-line/80")}>
      <div className={cn("flex items-center gap-1.5 text-[12px] font-medium [&_svg]:size-3.5", alert ? "text-red-500" : "text-navy-700")}>
        {icon}
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("text-[22px] font-semibold tabular-nums tracking-tight", alert ? "text-red-500" : "text-navy-900")}>{value}</span>
        {unit ? <span className={cn("text-xs", alert ? "text-red-400" : "text-muted")}>{unit}</span> : null}
      </div>
    </div>
  );
}

function Trends({ machine, now }: { machine: Machine; now: number }) {
  const tr = useT();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("30m");
  const [metric, setMetric] = useState<TrendKey>("temperature");
  const p = PERIODS.find((x) => x.id === period)!;
  const t = TRENDS.find((x) => x.key === metric)!;
  // Refresh once a minute rather than on every 2 s tick.
  const minute = Math.floor(now / 60000) * 60000;
  const data = useMemo(() => historyFor(machine, 48, p.step, minute), [machine, p.step, minute]);
  const values = data.map((d) => d[metric]);
  const delta = values[0] ? ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0;
  const gid = `tr-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h4 className={heading}>{tr("Trends")}</h4>
        <label className="relative">
          <span className="sr-only">{tr("Period")}</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="h-8 cursor-pointer appearance-none rounded-full bg-canvas ps-3 pe-8 text-xs font-semibold text-navy-800 outline-none ring-1 ring-inset ring-line focus:ring-teal-300">
            {PERIODS.map((x) => <option key={x.id} value={x.id}>{tr(x.label)}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
        </label>
      </div>
      <div className="mt-3 flex gap-1 rounded-full bg-canvas p-1" role="group" aria-label={tr("Metric")}>
        {TRENDS.map((x) => (
          <button key={x.key} type="button" aria-pressed={metric === x.key} onClick={() => setMetric(x.key)} className={cn("flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition", metric === x.key ? "bg-white text-navy-900 shadow-sm" : "text-muted hover:text-navy-900")}>
            {tr(x.label.split(" ").pop() ?? x.label)}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-white px-4 pb-2 pt-3 ring-1 ring-inset ring-line/80">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-navy-800">{tr(t.label)}</span>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums" style={{ color: t.color }}>
            {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% <ArrowUpRight className={cn("size-3.5", delta < 0 && "rotate-90")} />
          </span>
        </div>
        <div className="mt-1 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={t.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                cursor={{ stroke: "#CBD5E1", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const pt = payload?.[0];
                  if (!active || !pt) return null;
                  const point = pt.payload as HistoryPoint;
                  return (
                    <div className="rounded-lg bg-navy-950 px-2 py-1 text-[10px] text-white shadow-lift">
                      <span className="text-white/60">{point.label}</span> · <span className="font-semibold tabular-nums">{String(pt.value)}</span> {t.unit}
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey={metric} stroke={t.color} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

