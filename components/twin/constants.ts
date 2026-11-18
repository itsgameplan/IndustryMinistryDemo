import type { Machine, MachineReading, MachineType } from "@/lib/types";

/** Toggleable scene layers. */
export interface TwinLayers {
  sensors: boolean;
  labels: boolean;
  heatmap: boolean;
  flows: boolean;
}

export type SensorKind = Machine["sensors"][number]["kind"];
export type TwinStatus = MachineReading["status"];

/** Where the camera should travel. `nonce` re-triggers the same goal (e.g. "Reset view" twice). */
export type CameraGoal = { kind: "overview"; nonce: number } | { kind: "machine"; id: string; nonce: number };

export const STATUS_COLOR: Record<TwinStatus, string> = {
  healthy: "#2DBFB0",
  watch: "#F5A524",
  critical: "#EF4444",
};

export const STATUS_LABEL: Record<TwinStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  critical: "Critical",
};

export const PALETTE = {
  floor: "#EEF1F5",
  plinth: "#0E2442",
  navy: "#1E3A63",
  navyDeep: "#132B4D",
  steel: "#B9C3D0",
  steelLight: "#DDE3EA",
  steelDark: "#6B7A8F",
  teal: "#0FA396",
  tealGlow: "#2DBFB0",
  gold: "#C9A24B",
  glass: "#9FD8E8",
  wall: "#E4E8EE",
  truss: "#8E9BB0",
} as const;

/** Approximate footprint radius (for rings / heat tint) and hotspot height per machine type. */
export const MACHINE_FOOTPRINT: Record<MachineType, { radius: number; top: number }> = {
  cnc: { radius: 2.1, top: 2.9 },
  lathe: { radius: 2.3, top: 1.9 },
  press: { radius: 1.9, top: 5.6 },
  robot: { radius: 2.2, top: 3.3 },
  furnace: { radius: 2.2, top: 3.6 },
  compressor: { radius: 2.0, top: 2.3 },
  conveyor: { radius: 3.4, top: 1.6 },
  loom: { radius: 2, top: 2 },
  dyeing: { radius: 2, top: 2 },
};

const RANK: Record<TwinStatus, number> = { healthy: 0, watch: 1, critical: 2 };
const byRank = (r: number): TwinStatus => (r >= 2 ? "critical" : r === 1 ? "watch" : "healthy");

/** Raw-threshold status for one sensor, never worse than the machine's shared telemetry status. */
export function sensorStatus(kind: SensorKind, machine: Machine, reading: MachineReading): TwinStatus {
  let raw: TwinStatus = reading.status;
  if (kind === "temperature") {
    const ratio = reading.temperature / machine.baseTemp;
    raw = ratio > 1.2 ? "critical" : ratio > 1.1 ? "watch" : "healthy";
  } else if (kind === "vibration") {
    const ratio = reading.vibration / machine.baseVibration;
    raw = ratio > 1.6 ? "critical" : ratio > 1.3 ? "watch" : "healthy";
  } else if (kind === "pressure") {
    raw = reading.pressure < 5.9 ? "critical" : reading.pressure < 6.25 ? "watch" : "healthy";
  }
  return byRank(Math.min(RANK[raw], RANK[reading.status]));
}

/** Live value + unit for a sensor kind. */
export function sensorValue(kind: SensorKind, reading: MachineReading): { value: string; unit: string } {
  switch (kind) {
    case "temperature":
      return { value: reading.temperature.toFixed(1), unit: "°C" };
    case "vibration":
      return { value: reading.vibration.toFixed(2), unit: "mm/s" };
    case "current":
      return { value: reading.current.toFixed(1), unit: "A" };
    case "pressure":
      return { value: reading.pressure.toFixed(2), unit: "bar" };
    case "acoustic":
      return { value: (62 + reading.vibration * 4).toFixed(0), unit: "dB" };
  }
}

/** Zones drawn on the floor (x0, z0, x1, z1) in twin units. */
export const ZONES: { id: string; label: string; rect: [number, number, number, number]; color: string }[] = [
  { id: "a", label: "Line A · Housings", rect: [-16, -9.5, -1.6, -2.6], color: "#2E4C78" },
  { id: "b", label: "Line B · Shafts", rect: [-0.8, -9.5, 5.4, -2.6], color: "#0FA396" },
  { id: "c", label: "Line C · Knuckles", rect: [6.2, -9.5, 14.2, 6.4], color: "#C9A24B" },
  { id: "u", label: "Utilities", rect: [-18.6, 1.8, -10.2, 7.6], color: "#64748B" },
  { id: "s", label: "Finished goods", rect: [15.2, -10.6, 19.4, 10.6], color: "#4A6591" },
];

/** AGV loop + material flow, as floor polylines. */
export const AGV_LOOP: [number, number][] = [
  [-16.5, -0.9],
  [14.6, -0.9],
  [14.6, 8.6],
  [-16.5, 8.6],
  [-16.5, -0.9],
];

export const FLOW_ARROWS: [number, number][][] = [
  [
    [-12, -3.6],
    [-12, -1.6],
  ],
  [
    [-5, -3.6],
    [-5, 1.6],
  ],
  [
    [2, -3.6],
    [2, -1.6],
  ],
  [
    [10, -3.6],
    [10, 1.2],
  ],
  [
    [8.1, 3.6],
    [5.4, 3.9],
  ],
  [
    [3, 6],
    [3, 7.9],
  ],
];
