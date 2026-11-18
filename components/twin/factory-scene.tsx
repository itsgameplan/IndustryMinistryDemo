"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { DELTA_MACHINES } from "@/lib/data/machines";
import type { MachineReading } from "@/lib/types";
import { MACHINE_FOOTPRINT, PALETTE, type CameraGoal, type TwinLayers } from "./constants";
import { FactoryEnvironment } from "./environment";
import { MachineNode } from "./machines";
import { SensorHotspots } from "./hotspots";
import { TwinMotionContext } from "./motion-context";

export interface FactorySceneProps {
  readings: MachineReading[];
  layers: TwinLayers;
  selectedMachineId: string | null;
  selectedSensorId: string | null;
  maintenanceUnlocked: boolean;
  goal: CameraGoal;
  animate: boolean;
  onSelectMachine: (id: string) => void;
  onSelectSensor: (machineId: string, sensorId: string) => void;
  /** Fired once the first frame has rendered (hides the loading veil). */
  onReady?: () => void;
}

type Controls = ComponentRef<typeof OrbitControls>;

const OVERVIEW = { position: new THREE.Vector3(25, 22, 28), target: new THREE.Vector3(0, 0.5, 0.8) };
// Inside maxDistance so OrbitControls does not clamp the opening fly-in.
const START_POSITION: [number, number, number] = [-46, 42, 44];

function goalPose(goal: CameraGoal) {
  if (goal.kind === "overview") return { position: OVERVIEW.position.clone(), target: OVERVIEW.target.clone() };
  const m = DELTA_MACHINES.find((x) => x.id === goal.id);
  if (!m) return { position: OVERVIEW.position.clone(), target: OVERVIEW.target.clone() };
  const fp = MACHINE_FOOTPRINT[m.type];
  const target = new THREE.Vector3(m.position[0], fp.top * 0.5, m.position[1]);
  const dist = 7.5 + fp.radius * 1.6;
  const dir = new THREE.Vector3(0.55, 0.62, 0.95).normalize();
  return { position: target.clone().addScaledVector(dir, dist), target };
}

/** Smoothly tweens camera + orbit target toward the goal; user interaction cancels the tween. */
function CameraRig({ goal, animate }: { goal: CameraGoal; animate: boolean }) {
  const controls = useRef<Controls>(null);
  const camera = useThree((s) => s.camera);
  const tweening = useRef(false);
  const to = useRef(goalPose(goal));

  useEffect(() => {
    to.current = goalPose(goal);
    if (!animate) {
      camera.position.copy(to.current.position);
      controls.current?.target.copy(to.current.target);
      controls.current?.update();
      tweening.current = false;
      return;
    }
    tweening.current = true;
  }, [goal, animate, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (tweening.current) {
      const k = 1 - Math.exp(-Math.min(dt, 0.05) * 2.4);
      camera.position.lerp(to.current.position, k);
      c.target.lerp(to.current.target, k);
      if (camera.position.distanceTo(to.current.position) < 0.03 && c.target.distanceTo(to.current.target) < 0.03) tweening.current = false;
    }
    // keep the orbit target over the factory floor
    c.target.x = THREE.MathUtils.clamp(c.target.x, -22, 22);
    c.target.y = THREE.MathUtils.clamp(c.target.y, 0, 6);
    c.target.z = THREE.MathUtils.clamp(c.target.z, -14, 14);
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={80}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.15}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      panSpeed={0.8}
      onStart={() => {
        tweening.current = false;
      }}
    />
  );
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady?.();
  });
  return null;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#FFFFFF", "#AEBBD0", 1.15]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[18, 32, 14]} intensity={1.7} color="#FFF8EC" />
      <directionalLight position={[-24, 14, -18]} intensity={0.45} color="#9FE3DA" />
    </>
  );
}

export default function FactoryScene({
  readings,
  layers,
  selectedMachineId,
  selectedSensorId,
  maintenanceUnlocked,
  goal,
  animate,
  onSelectMachine,
  onSelectSensor,
  onReady,
}: FactorySceneProps) {
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null);
  const onHover = useCallback((id: string, on: boolean) => setHoveredSensor((cur) => (on ? id : cur === id ? null : cur)), []);
  const byId = useMemo(() => new Map(readings.map((r) => [r.machineId, r])), [readings]);

  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: START_POSITION, fov: 36, near: 0.5, far: 400 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <TwinMotionContext.Provider value={animate}>
        <Lights />
        <FactoryEnvironment layers={layers} />
        {DELTA_MACHINES.map((m) => {
          const r = byId.get(m.id);
          if (!r) return null;
          return (
            <MachineNode
              key={m.id}
              machine={m}
              reading={r}
              selected={selectedMachineId === m.id}
              showRisk={maintenanceUnlocked}
              showLabel={layers.labels}
              showHeat={layers.heatmap}
              onSelect={onSelectMachine}
            />
          );
        })}
        {layers.sensors ? (
          <SensorHotspots machines={DELTA_MACHINES} readings={readings} selectedSensorId={selectedSensorId} hoveredSensorId={hoveredSensor} onHover={onHover} onSelect={onSelectSensor} />
        ) : null}
        <ContactShadows position={[0, 0.004, 0]} scale={[44, 28]} resolution={1024} far={7} blur={2.6} opacity={0.42} color={PALETTE.plinth} frames={1} />
        <CameraRig goal={goal} animate={animate} />
        <ReadySignal onReady={onReady} />
      </TwinMotionContext.Provider>
    </Canvas>
  );
}
