import type { Machine, MachineReading } from "@/lib/types";

/** Illustrative economics used for "downtime avoided" estimates (EGP per hour of unplanned stop). */
const DOWNTIME_COST_PER_HOUR: Record<Machine["type"], number> = {
  cnc: 21_000, press: 34_000, lathe: 14_000, robot: 12_000, furnace: 26_000, compressor: 18_000, conveyor: 9_000, loom: 6_000, dyeing: 8_000,
};
/** Typical unplanned repair duration (hours) when a failure is not caught early. */
const REPAIR_HOURS: Record<Machine["type"], number> = {
  cnc: 38, press: 52, lathe: 20, robot: 16, furnace: 44, compressor: 22, conveyor: 10, loom: 8, dyeing: 12,
};

export function downtimeAvoided(m: Machine, r: MachineReading) {
  if (r.status === "healthy") return 0;
  return r.failureProbability * REPAIR_HOURS[m.type] * DOWNTIME_COST_PER_HOUR[m.type];
}

export function fleetMtbfHours(readings: MachineReading[]) {
  const avg = readings.reduce((s, r) => s + r.health, 0) / Math.max(1, readings.length);
  return Math.round(240 + avg * 4.6);
}

const FEATURES: Partial<Record<Machine["type"], string[]>> & { default: string[] } = {
  cnc: ["Spindle vibration RMS (1×/2× harmonics)", "Bearing temperature rise", "Spindle motor current", "Spindle load cycles since service", "Coolant temperature"],
  press: ["Hydraulic pressure variance", "Ram guide vibration", "Hydraulic oil temperature", "Strokes since last service", "Main motor current"],
  compressor: ["Discharge pressure drop", "Motor current draw", "Oil temperature", "Airend vibration RMS", "Loaded run hours"],
  furnace: ["Chamber temperature overshoot", "Heater element current", "Door-seal heat loss", "Cycle count"],
  default: ["Vibration RMS", "Temperature rise", "Motor current draw", "Run hours since service"],
};

function seeded(id: string, i: number) {
  const s = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) * 31 + i * 17;
  const x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

/** Deterministic, plausible model attribution for the selected machine (illustrative). */
export function featureImportance(m: Machine) {
  const names = FEATURES[m.type] ?? FEATURES.default;
  const raw = names.map((_, i) => (1 / (i + 1.25)) * (0.75 + seeded(m.id, i) * 0.5));
  if (m.id === "cnc-07") raw.splice(0, raw.length, 0.41, 0.24, 0.16, 0.12, 0.07);
  const total = raw.reduce((a, b) => a + b, 0);
  return names.map((name, i) => ({ name, weight: raw[i] / total }));
}

export function diagnosis(m: Machine, r: MachineReading) {
  const vibUp = Math.round(((r.vibration - m.baseVibration) / m.baseVibration) * 100);
  const tempUp = Math.round(r.temperature - m.baseTemp);
  if (r.status === "critical") {
    return `Spindle vibration is ${vibUp}% above its commissioning baseline with a +${tempUp} °C bearing temperature rise. The pattern — growing 1× and 2× harmonics with stable load — matches outer-race bearing wear seen in similar machining centres. Replacing the spindle bearing in a planned stop avoids an unplanned teardown.`;
  }
  if (r.status === "watch") {
    return m.type === "compressor"
      ? `Discharge pressure is drifting down while motor current rises (+${tempUp} °C on oil temperature). Most likely causes are a clogging intake filter or a developing air leak. Not urgent, but worth inspecting at the next planned stop.`
      : `Vibration is ${vibUp}% above baseline with a gradual temperature rise. Early-stage wear is likely; a lubrication check and seal inspection at the next planned stop should restore margin.`;
  }
  return `All monitored signals are within their normal operating envelope. Vibration is ${Math.abs(vibUp)}% ${vibUp >= 0 ? "above" : "below"} baseline — no action needed beyond the calendar plan.`;
}

export const thresholds = (m: Machine) => ({
  vibration: { baseline: m.baseVibration, alarm: Math.round(m.baseVibration * 1.6 * 10) / 10 },
  temperature: { baseline: m.baseTemp, alarm: Math.round(m.baseTemp * 1.22) },
  health: { baseline: 72, alarm: 45 },
});

export const shortName = (m: Machine) => m.name.split(" ")[0];
