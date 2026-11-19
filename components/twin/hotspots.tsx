"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Billboard, Html } from "@react-three/drei";
import type { Machine, MachineReading } from "@/lib/types";
import { MACHINE_FOOTPRINT, STATUS_COLOR, STATUS_LABEL, sensorStatus, sensorValue, type TwinStatus } from "./constants";
import { useTwinMotion } from "./motion-context";
import { useT } from "@/lib/i18n";

type Sensor = Machine["sensors"][number];

function Hotspot({
  machine,
  sensor,
  reading,
  position,
  phase,
  selected,
  hovered,
  onHover,
  onSelect,
}: {
  machine: Machine;
  sensor: Sensor;
  reading: MachineReading;
  position: [number, number, number];
  phase: number;
  selected: boolean;
  hovered: boolean;
  onHover: (id: string, on: boolean) => void;
  onSelect: (machineId: string, sensorId: string) => void;
}) {
  const animate = useTwinMotion();
  // Drei <Html> renders into its own React root, so translate here (inside the bridged R3F tree).
  const t = useT();
  const pulse = useRef<THREE.Mesh>(null);
  const pulseMat = useRef<THREE.MeshBasicMaterial>(null);
  const status: TwinStatus = sensorStatus(sensor.kind, machine, reading);
  const color = STATUS_COLOR[status];
  const speed = status === "critical" ? 1.3 : status === "watch" ? 0.9 : 0.6;

  useFrame(({ clock }) => {
    const p = animate ? (clock.getElapsedTime() * speed + phase) % 1 : 0.35;
    if (pulse.current) pulse.current.scale.setScalar(1 + p * 1.6);
    if (pulseMat.current) pulseMat.current.opacity = 0.75 * (1 - p);
  });

  const { value, unit } = sensorValue(sensor.kind, reading);
  const active = selected || hovered;

  return (
    <group position={position}>
      <Billboard>
        <mesh ref={pulse}>
          <ringGeometry args={[0.2, 0.26, 32]} />
          <meshBasicMaterial ref={pulseMat} color={color} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
        </mesh>
        {active ? (
          <mesh>
            <ringGeometry args={[0.27, 0.33, 32]} />
            <meshBasicMaterial color={selected ? "#FFFFFF" : color} toneMapped={false} />
          </mesh>
        ) : null}
      </Billboard>
      <mesh scale={active ? 1.25 : 1}>
        <sphereGeometry args={[0.15, 18, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      {/* generous invisible hit area */}
      <mesh
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(sensor.id, true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(sensor.id, false);
          document.body.style.cursor = "";
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(machine.id, sensor.id);
        }}
      >
        <sphereGeometry args={[0.34, 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {active ? (
        <Html position={[0, 0.42, 0]} center zIndexRange={[12, 10]} pointerEvents="none">
          <div className="pointer-events-none min-w-[150px] select-none rounded-xl border border-white/10 bg-navy-950/90 px-3 py-2 text-white shadow-lift backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
              <span>{machine.name.split(" ")[0]}</span>
              <span className="flex items-center gap-1" style={{ color }}>
                <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                {t(STATUS_LABEL[status])}
              </span>
            </div>
            <div className="mt-1 whitespace-nowrap text-xs text-white/80">{t(sensor.label)}</div>
            <div className="mt-0.5 flex items-baseline gap-1 font-semibold tabular-nums">
              <span className="text-lg leading-none">{value}</span>
              <span className="text-[11px] text-white/60">{unit}</span>
            </div>
            <div className="mt-1 font-mono text-[9px] text-white/40">{sensor.id.toUpperCase()}</div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

export function SensorHotspots({
  machines,
  readings,
  selectedSensorId,
  hoveredSensorId,
  onHover,
  onSelect,
}: {
  machines: Machine[];
  readings: MachineReading[];
  selectedSensorId: string | null;
  hoveredSensorId: string | null;
  onHover: (id: string, on: boolean) => void;
  onSelect: (machineId: string, sensorId: string) => void;
}) {
  return (
    <group>
      {machines.map((m, mi) => {
        const reading = readings.find((r) => r.machineId === m.id);
        if (!reading) return null;
        const top = MACHINE_FOOTPRINT[m.type].top;
        const n = m.sensors.length;
        return m.sensors.map((s, i) => (
          <Hotspot
            key={s.id}
            machine={m}
            sensor={s}
            reading={reading}
            position={[m.position[0] + (i - (n - 1) / 2) * 0.72, top + 0.45, m.position[1]]}
            phase={(mi * 0.37 + i * 0.21) % 1}
            selected={selectedSensorId === s.id}
            hovered={hoveredSensorId === s.id}
            onHover={onHover}
            onSelect={onSelect}
          />
        ));
      })}
    </group>
  );
}
