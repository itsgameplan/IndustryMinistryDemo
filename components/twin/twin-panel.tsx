"use client";

import { useId, useMemo } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { AlertTriangle, ArrowUpRight, Crosshair, Gauge, Lock, Radio, Sparkles, Thermometer, Activity, Zap, Wind, TrendingUp } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { BuildWithAIButton } from "@/components/shell/shared";
import { historyFor } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import type { Machine, MachineAlert, MachineReading } from "@/lib/types";
import { STATUS_COLOR, STATUS_LABEL, sensorStatus, sensorValue, type TwinStatus } from "./constants";

const STATUS_TONE: Record<TwinStatus, "teal" | "amber" | "red"> = { healthy: "teal", watch: "amber", critical: "red" };

type HistoryPoint = ReturnType<typeof historyFor>[number];
type TrendKey = "temperature" | "vibration" | "health" | "current";

function Sparkline({ data, dataKey, color, unit, label }: { data: HistoryPoint[]; dataKey: TrendKey; color: string; unit: string; label: string }) {
  const gid = `tw-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const values = data.map((d) => d[dataKey]);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const delta = first ? ((last - first) / first) * 100 : 0;
  return (
    <div className="rounded-xl border border-line bg-white px-3 pb-1 pt-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <span className={cn("text-[10px] font-semibold tabular-nums", dataKey === "health" ? (delta < -1 ? "text-red-600" : "text-muted") : delta > 3 ? "text-amber-600" : "text-muted")}>
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}% · 24h
        </span>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              cursor={{ stroke: "#CBD5E1", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0];
                if (!active || !p) return null;
                const point = p.payload as HistoryPoint;
                return (
                  <div className="rounded-md bg-navy-950 px-2 py-1 text-[10px] text-white shadow-lift">
                    <span className="text-white/60">{point.label}</span> · <span className="font-semibold tabular-nums">{String(p.value)}</span> {unit}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.6} fill={`url(#${gid})`} isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Reading({ icon, label, value, unit, tone }: { icon: React.ReactNode; label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums tracking-tight text-navy-900" style={tone ? { color: tone } : undefined}>
          {value}
        </span>
        {unit ? <span className="text-[11px] text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-600">{children}</h4>
      {aside}
    </div>
  );
}

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
  // History refreshes once a minute rather than on every 2 s tick.
  const minute = Math.floor(now / 60000) * 60000;
  const history = useMemo(() => historyFor(machine, 48, 30 * 60 * 1000, minute), [machine, minute]);
  const machineAlerts = alerts.filter((a) => a.machineId === machine.id);
  const status = reading.status;
  const short = machine.name.split(" ")[0];
  const riskColor = reading.failureProbability >= 0.4 ? STATUS_COLOR.critical : reading.failureProbability >= 0.15 ? STATUS_COLOR.watch : STATUS_COLOR.healthy;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-600">{machine.line}</div>
            <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-navy-900">{machine.name}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {machine.model} · Installed {machine.installed}
            </p>
          </div>
          <Badge tone={STATUS_TONE[status]} className="shrink-0">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
            {STATUS_LABEL[status]}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onFocus}>
            <Crosshair /> Focus in 3D
          </Button>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-teal-500" />
            </span>
            Live · {new Date(reading.timestamp).toLocaleTimeString("en-GB")}
          </span>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
        {maintenanceUnlocked ? (
          <div className="mt-4 overflow-hidden rounded-2xl bg-navy-900 p-4 text-white shadow-lift">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-gold-400" /> AI failure forecast
              </span>
              <span className="normal-case tracking-normal text-white/40">14-day horizon</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] text-white/55">Failure prob.</div>
                <div className="text-2xl font-semibold tabular-nums" style={{ color: riskColor }}>
                  {Math.round(reading.failureProbability * 100)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-white/55">Remaining life</div>
                <div className="text-2xl font-semibold tabular-nums">
                  {reading.rulDays}
                  <span className="ml-0.5 text-xs font-normal text-white/55">days</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-white/55">Health</div>
                <div className="text-2xl font-semibold tabular-nums">
                  {reading.health}
                  <span className="ml-0.5 text-xs font-normal text-white/55">/100</span>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${reading.health}%`, backgroundColor: STATUS_COLOR[status] }} />
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-teal-300 bg-teal-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-teal-600 shadow-card">
                <Lock className="size-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-navy-900">Failure forecasts are locked</div>
                <p className="mt-0.5 text-xs text-muted">Deploy predictive maintenance to get failure forecasts, remaining-useful-life estimates and AI diagnosis for every machine.</p>
              </div>
            </div>
            <BuildWithAIButton solutionId="maintenance" size="sm" className="mt-3 w-full" label="Deploy predictive maintenance" />
          </div>
        )}

        <SectionTitle>Live readings</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          <Reading icon={<Thermometer />} label="Temperature" value={reading.temperature.toFixed(1)} unit="°C" />
          <Reading icon={<Activity />} label="Vibration" value={reading.vibration.toFixed(2)} unit="mm/s" tone={reading.vibration / machine.baseVibration > 1.6 ? STATUS_COLOR.critical : undefined} />
          <Reading icon={<Zap />} label="Current" value={reading.current.toFixed(1)} unit="A" />
          <Reading icon={<Wind />} label="Pressure" value={reading.pressure.toFixed(2)} unit="bar" />
          <Reading icon={<TrendingUp />} label="Efficiency" value={reading.efficiency.toFixed(1)} unit="%" />
          <Reading icon={<Gauge />} label="Health" value={maintenanceUnlocked ? String(reading.health) : "—"} unit={maintenanceUnlocked ? "/100" : undefined} />
          <Reading icon={<Sparkles />} label="RUL" value={maintenanceUnlocked ? String(reading.rulDays) : "—"} unit={maintenanceUnlocked ? "days" : undefined} />
          <Reading icon={<AlertTriangle />} label="Failure prob." value={maintenanceUnlocked ? `${Math.round(reading.failureProbability * 100)}` : "—"} unit={maintenanceUnlocked ? "%" : undefined} tone={maintenanceUnlocked ? riskColor : undefined} />
        </div>

        <SectionTitle aside={<span className="text-[10px] text-muted">48 samples · 30 min</span>}>Trends</SectionTitle>
        <div className="grid gap-2">
          <Sparkline data={history} dataKey="temperature" color="#C9A24B" unit="°C" label="Bearing temperature" />
          <Sparkline data={history} dataKey="vibration" color={STATUS_COLOR[status]} unit="mm/s" label="Vibration RMS" />
          {maintenanceUnlocked ? <Sparkline data={history} dataKey="health" color="#4A6591" unit="/100" label="Health index" /> : <Sparkline data={history} dataKey="current" color="#4A6591" unit="A" label="Motor current" />}
        </div>

        <SectionTitle aside={machineAlerts.length ? <Badge tone={machineAlerts.some((a) => a.severity === "critical") ? "red" : "amber"}>{machineAlerts.length}</Badge> : null}>Active alerts</SectionTitle>
        {machineAlerts.length === 0 ? (
          <div className="rounded-xl border border-line bg-white px-3 py-3 text-xs text-muted">No active alerts. All channels within baseline.</div>
        ) : (
          <div className="grid gap-2">
            {machineAlerts.map((a) => (
              <div key={a.id} className={cn("rounded-xl border px-3 py-2.5", a.severity === "critical" ? "border-red-200 bg-red-50/70" : "border-amber-200 bg-amber-50/70")}>
                <div className={cn("flex items-center gap-1.5 text-xs font-semibold", a.severity === "critical" ? "text-red-700" : "text-amber-700")}>
                  <AlertTriangle className="size-3.5" />
                  {maintenanceUnlocked ? a.title : `${short} ${a.severity === "critical" ? "threshold breach" : "above baseline"}`}
                </div>
                {maintenanceUnlocked ? (
                  <>
                    <p className="mt-1 text-xs text-navy-700">{a.detail}</p>
                    <p className="mt-1.5 text-xs text-navy-900">
                      <span className="font-semibold">Recommended: </span>
                      {a.recommendation}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-navy-700">
                    Vibration {reading.vibration} mm/s vs {machine.baseVibration} baseline · {reading.temperature}°C. Diagnosis requires predictive maintenance.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <SectionTitle aside={<span className="text-[10px] text-muted">Click to locate in 3D</span>}>IoT sensors</SectionTitle>
        <div className="grid gap-1.5">
          {machine.sensors.map((s) => {
            const st = sensorStatus(s.kind, machine, reading);
            const v = sensorValue(s.kind, reading);
            const active = selectedSensorId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSensor(machine.id, s.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                  active ? "border-navy-900 bg-navy-900 text-white shadow-card" : "border-line bg-white hover:border-teal-300 hover:bg-teal-50/40"
                )}
              >
                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full opacity-50" style={{ backgroundColor: STATUS_COLOR[st] }} />
                  <span className="relative inline-flex size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[st] }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-xs font-medium", active ? "text-white" : "text-navy-900")}>{s.label}</span>
                  <span className={cn("block font-mono text-[10px]", active ? "text-white/50" : "text-muted")}>{s.id.toUpperCase()}</span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="text-sm font-semibold">{v.value}</span>
                  <span className={cn("ml-0.5 text-[10px]", active ? "text-white/60" : "text-muted")}>{v.unit}</span>
                </span>
                <Radio className={cn("size-3.5 shrink-0", active ? "text-gold-400" : "text-muted/50")} />
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {maintenanceUnlocked ? (
            <Button asChild variant="primary" className="w-full">
              <Link href={`/solutions/maintenance?machine=${machine.id}`}>
                Open in Predictive Maintenance <ArrowUpRight />
              </Link>
            </Button>
          ) : null}
          <p className="mt-3 text-center text-[10px] text-muted">Simulated telemetry for demonstration · refreshed every 2 s</p>
        </div>
      </div>
    </div>
  );
}
