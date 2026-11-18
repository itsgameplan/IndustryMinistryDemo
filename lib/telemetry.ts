"use client";

import { useEffect, useState } from "react";
import { DELTA_MACHINES } from "@/lib/data/machines";
import type { Machine, MachineAlert, MachineReading } from "@/lib/types";

/** Shared, deterministic mock telemetry used by the digital twin and predictive maintenance. */

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function noise(seed: number, t: number) {
  const i = Math.floor(t);
  const f = t - i;
  const a = hash(seed * 1000 + i);
  const b = hash(seed * 1000 + i + 1);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u; // 0..1
}
const seedOf = (id: string) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/** Reading for a machine at a given epoch ms. Same inputs → same output. */
export function readingAt(m: Machine, timestamp: number): MachineReading {
  const seed = seedOf(m.id);
  const t = timestamp / 4000; // a "step" every 4 s
  const d = m.degradation;
  const wobble = noise(seed, t) - 0.5;
  const slow = Math.sin(timestamp / 90000 + seed) * 0.5;
  const temperature = m.baseTemp * (1 + d * 0.28) + wobble * 3 + slow * 2;
  const vibration = m.baseVibration * (1 + d * 0.9) + wobble * 0.5 * (1 + d) + Math.max(0, slow) * d;
  const current = 18 + m.baseVibration * 4 + wobble * 2 + d * 6;
  const pressure = 6.5 + wobble * 0.4 - d * 0.6;
  const efficiency = Math.min(99, m.baseEfficiency - d * 8 + wobble * 2);
  const health = Math.max(8, Math.min(99, 100 - d * 72 - Math.max(0, wobble) * 6));
  const failureProbability = Math.min(0.97, Math.max(0.01, d * d * 0.95 + Math.max(0, wobble) * 0.05));
  const rulDays = Math.max(2, Math.round((1 - d) * 160 + wobble * 6));
  const status: MachineReading["status"] = health < 45 ? "critical" : health < 72 ? "watch" : "healthy";
  return {
    machineId: m.id,
    timestamp,
    temperature: round(temperature),
    vibration: round(vibration, 2),
    current: round(current),
    pressure: round(pressure, 2),
    efficiency: round(efficiency),
    health: Math.round(health),
    rulDays,
    failureProbability: round(failureProbability, 2),
    status,
  };
}

/** History of readings ending at `end`, `points` samples spaced `stepMs` apart. */
export function historyFor(m: Machine, points = 48, stepMs = 30 * 60 * 1000, end = Date.now()) {
  const out: (MachineReading & { label: string })[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const ts = end - i * stepMs;
    // degradation ramps up over the window so trends look believable
    const ramp = { ...m, degradation: Math.max(0, m.degradation - (i / points) * m.degradation * 0.35) };
    const r = readingAt(ramp, ts);
    const date = new Date(ts);
    out.push({ ...r, label: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` });
  }
  return out;
}

export function alertsFor(readings: MachineReading[]): MachineAlert[] {
  const alerts: MachineAlert[] = [];
  for (const r of readings) {
    const m = DELTA_MACHINES.find((x) => x.id === r.machineId);
    if (!m) continue;
    if (r.status === "critical") {
      alerts.push({
        id: `${m.id}-critical`,
        machineId: m.id,
        severity: "critical",
        title: `${m.name.split(" ")[0]} bearing failure risk`,
        detail: `Vibration ${r.vibration} mm/s (baseline ${m.baseVibration}) · bearing ${r.temperature}°C · ${Math.round(r.failureProbability * 100)}% failure probability in 14 days.`,
        recommendation: `Replace spindle bearing within ${Math.min(r.rulDays, 7)} days; schedule during Saturday low-load shift.`,
      });
    } else if (r.status === "watch") {
      alerts.push({
        id: `${m.id}-watch`,
        machineId: m.id,
        severity: "warning",
        title: `${m.name.split(" ")[0]} trending above baseline`,
        detail: `Health ${r.health}/100 · vibration ${r.vibration} mm/s · RUL ≈ ${r.rulDays} days.`,
        recommendation: m.type === "compressor" ? "Inspect intake filter and check for air leaks; oil analysis recommended." : "Lubrication check and hydraulic seal inspection at next planned stop.",
      });
    }
  }
  return alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1));
}

/** Live readings for all Delta machines, refreshed every `intervalMs`. */
export function useLiveTelemetry(intervalMs = 2000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  const readings = DELTA_MACHINES.map((m) => readingAt(m, now));
  return { now, readings, alerts: alertsFor(readings) };
}
