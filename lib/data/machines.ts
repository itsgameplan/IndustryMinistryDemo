import type { Machine } from "@/lib/types";

const s = (id: string) => [
  { id: `${id}-T`, kind: "temperature" as const, label: "Bearing temperature" },
  { id: `${id}-V`, kind: "vibration" as const, label: "Spindle vibration" },
  { id: `${id}-I`, kind: "current" as const, label: "Motor current" },
];

/** Delta Precision shop floor. Positions are in twin units on a 40 x 24 floor centred at origin. */
export const DELTA_MACHINES: Machine[] = [
  { id: "cnc-03", name: "CNC-03 Machining Centre", type: "cnc", line: "Line A · Housings", model: "DMG Mori NHX 5000", installed: 2017, position: [-12, -6], baseTemp: 48, baseVibration: 2.1, baseEfficiency: 88, degradation: 0.12, sensors: s("cnc-03") },
  { id: "cnc-07", name: "CNC-07 Machining Centre", type: "cnc", line: "Line A · Housings", model: "Mazak Variaxis i-700", installed: 2014, position: [-5, -6], baseTemp: 52, baseVibration: 3.4, baseEfficiency: 79, degradation: 0.78, sensors: s("cnc-07") },
  { id: "lathe-02", name: "LATHE-02 Turning Cell", type: "lathe", line: "Line B · Shafts", model: "Okuma LB3000 EX II", installed: 2019, position: [2, -6], baseTemp: 44, baseVibration: 1.6, baseEfficiency: 91, degradation: 0.08, sensors: s("lathe-02") },
  { id: "press-01", name: "PRESS-01 Forging Press", type: "press", line: "Line C · Knuckles", model: "Schuler MSP 1600", installed: 2011, position: [10, -6], baseTemp: 61, baseVibration: 4.2, baseEfficiency: 83, degradation: 0.46, sensors: [...s("press-01"), { id: "press-01-P", kind: "pressure" as const, label: "Hydraulic pressure" }] },
  { id: "robot-04", name: "ROBOT-04 Handling Cell", type: "robot", line: "Line C · Knuckles", model: "KUKA KR 210", installed: 2020, position: [10, 3], baseTemp: 39, baseVibration: 0.9, baseEfficiency: 94, degradation: 0.05, sensors: s("robot-04") },
  { id: "furnace-01", name: "FURNACE-01 Heat Treatment", type: "furnace", line: "Line C · Knuckles", model: "Ipsen TQ-15", installed: 2013, position: [3, 4], baseTemp: 68, baseVibration: 0.6, baseEfficiency: 86, degradation: 0.22, sensors: [{ id: "furnace-01-T", kind: "temperature" as const, label: "Chamber thermocouple" }, { id: "furnace-01-I", kind: "current" as const, label: "Heater current" }] },
  { id: "comp-02", name: "COMP-02 Air Compressor", type: "compressor", line: "Utilities", model: "Atlas Copco GA 90", installed: 2016, position: [-13, 5], baseTemp: 57, baseVibration: 2.8, baseEfficiency: 81, degradation: 0.55, sensors: [...s("comp-02"), { id: "comp-02-P", kind: "pressure" as const, label: "Discharge pressure" }] },
  { id: "conv-01", name: "CONV-01 Transfer Conveyor", type: "conveyor", line: "Line A → Dispatch", model: "Interroll Modular", installed: 2018, position: [-5, 3], baseTemp: 36, baseVibration: 1.2, baseEfficiency: 95, degradation: 0.1, sensors: [{ id: "conv-01-V", kind: "vibration" as const, label: "Drive vibration" }, { id: "conv-01-I", kind: "current" as const, label: "Drive current" }] },
];

export const machineById = (id: string) => DELTA_MACHINES.find((m) => m.id === id);
