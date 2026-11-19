"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ChevronRight, Cpu, Radio, Zap } from "lucide-react";
import { DELTA_MACHINES } from "@/lib/data/machines";
import { useLiveTelemetry } from "@/lib/telemetry";
import { useActiveFactory } from "@/lib/store";
import type { MachineReading } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { CameraGoal, TwinLayers } from "./constants";
import { TwinPanel } from "./twin-panel";
import { TwinMachineDock, TwinTopBar } from "./twin-overlay";

const FactoryScene = dynamic(() => import("./factory-scene"), { ssr: false, loading: () => null });

const RANK: Record<MachineReading["status"], number> = { healthy: 0, watch: 1, critical: 2 };

export function TwinLoading({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={`absolute inset-0 z-30 grid place-items-center bg-[radial-gradient(ellipse_at_50%_40%,#1E3A63_0%,#0B1F3A_55%,#050E1F_100%)] ${className ?? ""}`}>
      <div className="bg-grid-dark absolute inset-0 opacity-60" />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-teal-400/60" />
          <span className="absolute inset-2 animate-pulse-ring rounded-full border border-gold-400/40 [animation-delay:0.6s]" />
          <Cpu className="relative size-6 text-teal-300" />
        </div>
        <div className="mt-5 text-sm font-semibold tracking-tight text-white">{t("Initialising digital twin…")}</div>
        <div className="mt-1 text-xs text-white/50">{t("Loading shop-floor geometry and IoT sensor streams")}</div>
        <div className="mt-4 h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="animate-shimmer h-full w-full bg-[linear-gradient(90deg,transparent_0%,#2DBFB0_50%,transparent_100%)] bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}

export function DigitalTwinView() {
  const t = useT();
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
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);
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
      <header className="mb-7 flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("Connected Operations")} <ChevronRight className="size-3.5 rtl:-scale-x-100" /> {t("Tier 3")}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-navy-900 md:text-[40px]">{t("3D Factory Digital Twin")}</h1>
          <p className="mt-2 text-[15px] text-muted md:text-base">{t("A live, spatial view of your production floor with real-time machine data, telemetry, and AI insights.")}</p>
        </motion.div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeaderPill icon={<Cpu />} color="#10B981" label={t("Machines Online")} value={`${DELTA_MACHINES.length}/${DELTA_MACHINES.length}`} i={0} />
          <HeaderPill icon={<Radio />} color="#14B8A6" label={t("IoT Sensors")} value={String(stats.sensors)} i={1} />
          <HeaderPill icon={<Zap />} color="#10B981" label={t("Avg. Efficiency")} value={`${stats.eff.toFixed(1)}%`} i={2} />
          <HeaderPill icon={<AlertTriangle />} color="#F59E0B" label={maintenanceUnlocked ? t("At-Risk Assets") : t("Threshold Alerts")} value={String((maintenanceUnlocked ? stats.atRisk : alerts.length))} i={3} />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div ref={stageRef} className={cn("relative h-[64vh] min-h-[480px] overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#1E3A63_0%,#0B1F3A_52%,#050E1F_100%)] shadow-[0_30px_60px_-30px_rgba(5,14,31,0.6)] ring-1 ring-navy-900/10 lg:h-[76vh]", fullscreen ? "rounded-none" : "rounded-[28px]")}>
          <div className="bg-grid-dark pointer-events-none absolute inset-0 opacity-50" />
          {!webgl ? (
            <div className="absolute inset-0 z-40 grid place-items-center p-8 text-center text-white">
              <div className="max-w-sm">
                <AlertTriangle className="mx-auto mb-3 size-8 text-gold-400" />
                <div className="text-base font-semibold">{t("3D view unavailable on this device")}</div>
                <p className="mt-1 text-sm text-white/60">{t("WebGL is disabled or unsupported in this browser. Live machine readings remain available in the side panel and the machine dock below.")}</p>
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
          <TwinTopBar layers={layers} onToggle={(k) => setLayers((l) => ({ ...l, [k]: !l[k] }))} onReset={resetView} onFocus={() => focus(selectedId)} canFocus={Boolean(selectedId)} fullscreen={fullscreen} onFullscreen={toggleFullscreen} />
          <TwinMachineDock machines={DELTA_MACHINES} readings={readings} selectedId={selectedId} onSelect={selectFromDock} />
          <AnimatePresence>
            {!ready && webgl ? (
              <motion.div key="loading" className="absolute inset-0 z-30" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.6 }}>
                <TwinLoading />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="scrollbar-thin -me-2 pe-2 lg:h-[76vh] lg:overflow-y-auto">
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
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">{t("Drag to orbit · scroll to zoom · simulated telemetry")}</p>
    </div>
  );
}

function HeaderPill({ icon, color, label, value, i }: { icon: React.ReactNode; color: string; label: string; value: string; i: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + i * 0.06 }}
      whileHover={reduce ? undefined : { y: -2 }}
      className="flex items-center gap-3.5 rounded-[20px] border border-white bg-white/80 px-5 py-4 shadow-[0_1px_2px_rgba(11,31,58,0.04),0_12px_32px_-18px_rgba(11,31,58,0.22)] backdrop-blur"
    >
      <span className="[&_svg]:size-6" style={{ color }}>{icon}</span>
      <div className="leading-tight">
        <div className="whitespace-nowrap text-[13px] text-navy-700">{label}</div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-navy-900">{value}</div>
      </div>
    </motion.div>
  );
}
