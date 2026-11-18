"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, AlertTriangle, Cpu, Radio } from "lucide-react";
import { Card } from "@/components/ui";
import { PageHeader } from "@/components/shell/shared";
import { DELTA_MACHINES } from "@/lib/data/machines";
import { useLiveTelemetry } from "@/lib/telemetry";
import { useActiveFactory } from "@/lib/store";
import type { MachineReading } from "@/lib/types";
import type { CameraGoal, TwinLayers } from "./constants";
import { TwinPanel } from "./twin-panel";
import { TwinMachineDock, TwinTopBar } from "./twin-overlay";

const FactoryScene = dynamic(() => import("./factory-scene"), { ssr: false, loading: () => null });

const RANK: Record<MachineReading["status"], number> = { healthy: 0, watch: 1, critical: 2 };

export function TwinLoading({ className }: { className?: string }) {
  return (
    <div className={`absolute inset-0 z-30 grid place-items-center bg-[radial-gradient(ellipse_at_50%_40%,#1E3A63_0%,#0B1F3A_55%,#050E1F_100%)] ${className ?? ""}`}>
      <div className="bg-grid-dark absolute inset-0 opacity-60" />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-teal-400/60" />
          <span className="absolute inset-2 animate-pulse-ring rounded-full border border-gold-400/40 [animation-delay:0.6s]" />
          <Cpu className="relative size-6 text-teal-300" />
        </div>
        <div className="mt-5 text-sm font-semibold tracking-tight text-white">Initialising digital twin…</div>
        <div className="mt-1 text-xs text-white/50">Loading shop-floor geometry and IoT sensor streams</div>
        <div className="mt-4 h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="animate-shimmer h-full w-full bg-[linear-gradient(90deg,transparent_0%,#2DBFB0_50%,transparent_100%)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}

export function DigitalTwinView() {
  const params = useSearchParams();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const animate = !reduced;
  const { state } = useActiveFactory();
  const maintenanceUnlocked = state.unlockedSolutions.includes("maintenance");
  const { now, readings, alerts } = useLiveTelemetry(2000);

  const paramMachine = params.get("machine");
  const initialMachine = DELTA_MACHINES.some((m) => m.id === paramMachine) ? paramMachine : null;

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialMachine) return initialMachine;
    const worst = [...readings].sort((a, b) => RANK[b.status] - RANK[a.status] || a.health - b.health)[0];
    return worst?.machineId ?? DELTA_MACHINES[0].id;
  });
  const [sensorId, setSensorId] = useState<string | null>(null);
  const [layers, setLayers] = useState<TwinLayers>({ sensors: true, labels: true, heatmap: false, flows: true });
  const [goal, setGoal] = useState<CameraGoal>(() => (initialMachine ? { kind: "machine", id: initialMachine, nonce: 0 } : { kind: "overview", nonce: 0 }));
  const [ready, setReady] = useState(false);
  const [webgl] = useState(() => {
    if (typeof document === "undefined") return true;
    try {
      const c = document.createElement("canvas");
      return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
    } catch {
      return false;
    }
  });

  // Keep ?machine= in sync for deep links without triggering a navigation.
  useEffect(() => {
    const url = `${pathname}?machine=${encodeURIComponent(selectedId)}`;
    window.history.replaceState(window.history.state, "", url);
  }, [selectedId, pathname]);

  const focus = useCallback((id: string) => setGoal((g) => ({ kind: "machine", id, nonce: g.nonce + 1 })), []);
  const resetView = useCallback(() => setGoal((g) => ({ kind: "overview", nonce: g.nonce + 1 })), []);

  const selectFromScene = useCallback((id: string) => {
    setSelectedId(id);
    setSensorId(null);
  }, []);
  const selectSensorFromScene = useCallback((machineId: string, sid: string) => {
    setSelectedId(machineId);
    setSensorId(sid);
  }, []);
  const selectFromDock = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSensorId(null);
      focus(id);
    },
    [focus]
  );
  const selectSensorFromPanel = useCallback(
    (machineId: string, sid: string) => {
      setSelectedId(machineId);
      setSensorId(sid);
      setLayers((l) => (l.sensors ? l : { ...l, sensors: true }));
      focus(machineId);
    },
    [focus]
  );
  const onReady = useCallback(() => setReady(true), []);
  // Safety net: never leave the loading veil up (e.g. if the first frame is delayed by a background tab).
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const machine = DELTA_MACHINES.find((m) => m.id === selectedId) ?? DELTA_MACHINES[0];
  const reading = readings.find((r) => r.machineId === machine.id) ?? readings[0];

  const stats = useMemo(() => {
    const sensors = DELTA_MACHINES.reduce((n, m) => n + m.sensors.length, 0);
    const eff = readings.reduce((s, r) => s + r.efficiency, 0) / readings.length;
    const atRisk = readings.filter((r) => r.status !== "healthy").length;
    return { sensors, eff, atRisk };
  }, [readings]);

  return (
    <div>
      <PageHeader
        eyebrow="Tier 3 · Connected operations"
        title="3D factory digital twin"
        description="A live, spatial view of Delta Precision's shop floor. Every machine streams IoT telemetry into the twin — select a machine or sensor to inspect it."
        actions={
          <>
            <HeaderPill icon={<Cpu />} label="Machines online" value={`${DELTA_MACHINES.length}/${DELTA_MACHINES.length}`} />
            <HeaderPill icon={<Radio />} label="IoT sensors" value={String(stats.sensors)} />
            <HeaderPill icon={<Activity />} label="Avg. efficiency" value={`${stats.eff.toFixed(1)}%`} />
            <HeaderPill icon={<AlertTriangle />} label={maintenanceUnlocked ? "At-risk assets" : "Threshold alerts"} value={String(maintenanceUnlocked ? stats.atRisk : alerts.length)} warn={(maintenanceUnlocked ? stats.atRisk : alerts.length) > 0} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative h-[64vh] min-h-[440px] overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_30%,#1E3A63_0%,#0B1F3A_52%,#050E1F_100%)] shadow-lift ring-1 ring-navy-900/20 lg:h-[70vh]">
          <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-50" />
          {!webgl ? (
            <div className="absolute inset-0 z-40 grid place-items-center p-8 text-center text-white">
              <div className="max-w-sm">
                <AlertTriangle className="mx-auto mb-3 size-8 text-gold-400" />
                <div className="text-base font-semibold">3D view unavailable on this device</div>
                <p className="mt-1 text-sm text-white/60">WebGL is disabled or unsupported in this browser. Live machine readings remain available in the side panel and the machine dock below.</p>
              </div>
            </div>
          ) : null}
          {webgl ? <FactoryScene
            readings={readings}
            layers={layers}
            selectedMachineId={selectedId}
            selectedSensorId={sensorId}
            maintenanceUnlocked={maintenanceUnlocked}
            goal={goal}
            animate={animate}
            onSelectMachine={selectFromScene}
            onSelectSensor={selectSensorFromScene}
            onReady={onReady}
          /> : null}
          <TwinTopBar layers={layers} onToggle={(k) => setLayers((l) => ({ ...l, [k]: !l[k] }))} onReset={resetView} onFocus={() => focus(selectedId)} canFocus={Boolean(selectedId)} />
          <TwinMachineDock machines={DELTA_MACHINES} readings={readings} selectedId={selectedId} onSelect={selectFromDock} />
          <AnimatePresence>
            {!ready && webgl ? (
              <motion.div key="loading" className="absolute inset-0 z-30" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.6 }}>
                <TwinLoading />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <Card className="overflow-hidden lg:h-[70vh]">
          <TwinPanel
            machine={machine}
            reading={reading}
            alerts={alerts}
            now={now}
            maintenanceUnlocked={maintenanceUnlocked}
            selectedSensorId={sensorId}
            onSelectSensor={selectSensorFromPanel}
            onFocus={() => focus(machine.id)}
          />
        </Card>
      </div>
      <p className="mt-3 text-xs text-muted">Drag to orbit · scroll to zoom · right-drag to pan. All values are simulated telemetry for demonstration purposes.</p>
    </div>
  );
}

function HeaderPill({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2 shadow-card">
      <span className={`grid size-7 place-items-center rounded-lg [&_svg]:size-3.5 ${warn ? "bg-amber-50 text-amber-600" : "bg-teal-50 text-teal-600"}`}>{icon}</span>
      <div className="leading-tight">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted">{label}</div>
        <div className="text-sm font-semibold tabular-nums text-navy-900">{value}</div>
      </div>
    </div>
  );
}
