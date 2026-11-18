"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Machine, MachineReading } from "@/lib/types";
import { MACHINE_FOOTPRINT, PALETTE, STATUS_COLOR, type TwinStatus } from "./constants";
import { useTwinMotion } from "./motion-context";

type Vec3 = [number, number, number];

/** Shared radial-gradient texture for soft floor glows (generated in code, no external asset). */
let glowTexture: THREE.CanvasTexture | null = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

function Box({ size, position, color, roughness = 0.6, metalness = 0.25, rotation }: { size: Vec3; position: Vec3; color: string; roughness?: number; metalness?: number; rotation?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

function Screen({ position, size = [0.36, 0.26] }: { position: Vec3; size?: [number, number] }) {
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#0B1F3A" emissive={PALETTE.tealGlow} emissiveIntensity={0.55} roughness={0.3} />
    </mesh>
  );
}

function StatusTower({ position, status }: { position: Vec3; status: TwinStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.44, 8]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.18, 14]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- machine models

function CncModel({ status }: { status: TwinStatus }) {
  const animate = useTwinMotion();
  const spindle = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (animate && spindle.current) spindle.current.rotation.y += dt * 18;
  });
  return (
    <group>
      <Box size={[3.2, 0.35, 2.4]} position={[0, 0.175, 0]} color={PALETTE.navyDeep} />
      <Box size={[2.8, 2.0, 2.1]} position={[0, 1.35, 0]} color={PALETTE.steelLight} roughness={0.45} metalness={0.35} />
      <Box size={[2.86, 0.18, 2.16]} position={[0, 2.44, 0]} color={PALETTE.navy} />
      <Box size={[2.86, 0.06, 2.16]} position={[0, 0.38, 0]} color={PALETTE.teal} roughness={0.4} />
      <mesh position={[-0.25, 1.45, 1.07]}>
        <boxGeometry args={[1.5, 1.05, 0.04]} />
        <meshStandardMaterial color={PALETTE.glass} transparent opacity={0.38} roughness={0.05} metalness={0.5} depthWrite={false} />
      </mesh>
      <mesh ref={spindle} position={[-0.25, 1.75, 0.5]}>
        <cylinderGeometry args={[0.13, 0.08, 0.75, 10]} />
        <meshStandardMaterial color="#D9DEE5" metalness={0.9} roughness={0.2} />
      </mesh>
      <Box size={[0.9, 0.2, 0.7]} position={[-0.25, 0.95, 0.4]} color={PALETTE.steelDark} metalness={0.6} />
      <Box size={[0.52, 0.95, 0.14]} position={[1.12, 1.5, 1.12]} color={PALETTE.navy} />
      <Screen position={[1.12, 1.62, 1.195]} />
      <Box size={[0.5, 0.55, 2.0]} position={[1.75, 0.45, -0.05]} color={PALETTE.steelDark} />
      <StatusTower position={[1.15, 2.53, -0.75]} status={status} />
    </group>
  );
}

function LatheModel({ status }: { status: TwinStatus }) {
  const animate = useTwinMotion();
  const chuck = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (animate && chuck.current) chuck.current.rotation.x += dt * 14;
  });
  return (
    <group>
      <Box size={[3.8, 0.6, 1.5]} position={[0, 0.3, 0]} color={PALETTE.navyDeep} />
      <Box size={[3.6, 1.0, 1.3]} position={[0, 1.1, 0]} color={PALETTE.steelLight} roughness={0.45} metalness={0.35} />
      <Box size={[3.62, 0.08, 1.32]} position={[0, 1.62, 0]} color={PALETTE.teal} />
      <Box size={[0.95, 1.25, 1.34]} position={[-1.35, 1.22, 0]} color={PALETTE.navy} />
      <mesh position={[0.1, 1.18, 0.66]}>
        <boxGeometry args={[1.9, 0.62, 0.04]} />
        <meshStandardMaterial color={PALETTE.glass} transparent opacity={0.38} roughness={0.05} metalness={0.5} depthWrite={false} />
      </mesh>
      <group ref={chuck} position={[-0.78, 1.2, 0.15]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 6]} />
          <meshStandardMaterial color="#C9D1DB" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 1.1, 10]} />
          <meshStandardMaterial color="#E7EBF0" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      <Box size={[0.45, 0.5, 0.6]} position={[1.0, 1.2, 0.15]} color={PALETTE.steelDark} metalness={0.6} />
      <Box size={[0.5, 0.8, 0.14]} position={[1.55, 1.25, 0.72]} color={PALETTE.navy} />
      <Screen position={[1.55, 1.35, 0.795]} size={[0.34, 0.24]} />
      <StatusTower position={[1.6, 1.66, -0.45]} status={status} />
    </group>
  );
}

function PressModel({ status }: { status: TwinStatus }) {
  const animate = useTwinMotion();
  const ram = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ram.current) return;
    if (!animate) {
      ram.current.position.y = 3.4;
      return;
    }
    const p = (clock.getElapsedTime() % 3.2) / 3.2;
    // quick strike, slow return
    const stroke = p < 0.18 ? p / 0.18 : p < 0.3 ? 1 : 1 - (p - 0.3) / 0.7;
    ram.current.position.y = 3.6 - stroke * 1.85;
  });
  return (
    <group>
      <Box size={[2.9, 0.95, 2.3]} position={[0, 0.475, 0]} color={PALETTE.navyDeep} />
      <Box size={[2.9, 0.1, 0.02]} position={[0, 0.8, 1.16]} color={PALETTE.gold} roughness={0.4} />
      <Box size={[1.8, 0.3, 1.4]} position={[0, 1.1, 0]} color={PALETTE.steelDark} metalness={0.7} roughness={0.3} />
      {([-1.1, 1.1] as const).flatMap((x) =>
        ([-0.8, 0.8] as const).map((z) => <Box key={`${x}${z}`} size={[0.45, 3.7, 0.45]} position={[x, 2.75, z]} color={PALETTE.navy} metalness={0.4} />)
      )}
      <Box size={[3.1, 1.0, 2.5]} position={[0, 5.05, 0]} color={PALETTE.navy} metalness={0.35} />
      <Box size={[3.12, 0.08, 2.52]} position={[0, 4.6, 0]} color={PALETTE.gold} roughness={0.4} />
      <mesh position={[0, 5.85, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.6, 18]} />
        <meshStandardMaterial color={PALETTE.steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <group ref={ram} position={[0, 3.4, 0]}>
        <Box size={[1.9, 0.6, 1.5]} position={[0, 0, 0]} color={PALETTE.steelLight} metalness={0.5} roughness={0.35} />
        <mesh position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 1.2, 12]} />
          <meshStandardMaterial color="#E7EBF0" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
      <Box size={[0.55, 1.1, 0.4]} position={[1.75, 0.95, 1.0]} color={PALETTE.navy} />
      <Screen position={[1.75, 1.1, 1.205]} size={[0.38, 0.3]} />
      <StatusTower position={[1.75, 1.5, 1.0]} status={status} />
    </group>
  );
}

function RobotModel({ status }: { status: TwinStatus }) {
  const animate = useTwinMotion();
  const base = useRef<THREE.Group>(null);
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const wrist = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = animate ? clock.getElapsedTime() : 1.2;
    if (base.current) base.current.rotation.y = Math.sin(t * 0.55) * 1.25;
    if (shoulder.current) shoulder.current.rotation.z = -0.35 + Math.sin(t * 0.9) * 0.28;
    if (elbow.current) elbow.current.rotation.z = -0.9 + Math.sin(t * 0.9 + 1.1) * 0.35;
    if (wrist.current) wrist.current.rotation.x = t * 1.4;
  });
  const body = "#F4F6F8";
  return (
    <group>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.08, 48]} />
        <meshBasicMaterial color={PALETTE.gold} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.5, 20]} />
        <meshStandardMaterial color={PALETTE.navy} metalness={0.4} roughness={0.45} />
      </mesh>
      <group ref={base} position={[0, 0.5, 0]}>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.46, 0.5, 0.34, 20]} />
          <meshStandardMaterial color={body} roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <torusGeometry args={[0.36, 0.04, 8, 28]} />
          <meshStandardMaterial color={PALETTE.tealGlow} emissive={PALETTE.tealGlow} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
        <group ref={shoulder} position={[0, 0.5, 0]}>
          <mesh position={[0, 0.8, 0]}>
            <boxGeometry args={[0.36, 1.6, 0.4]} />
            <meshStandardMaterial color={body} roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.52, 18]} />
            <meshStandardMaterial color={PALETTE.navy} metalness={0.4} roughness={0.4} />
          </mesh>
          <group ref={elbow} position={[0, 1.6, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.46, 16]} />
              <meshStandardMaterial color={PALETTE.navy} metalness={0.4} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[0.26, 1.3, 0.28]} />
              <meshStandardMaterial color={body} roughness={0.4} metalness={0.2} />
            </mesh>
            <group ref={wrist} position={[0, 1.36, 0]}>
              <mesh>
                <cylinderGeometry args={[0.12, 0.12, 0.22, 12]} />
                <meshStandardMaterial color={PALETTE.steelDark} metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0.09, 0.2, 0]}>
                <boxGeometry args={[0.05, 0.22, 0.14]} />
                <meshStandardMaterial color={PALETTE.gold} metalness={0.6} roughness={0.3} />
              </mesh>
              <mesh position={[-0.09, 0.2, 0]}>
                <boxGeometry args={[0.05, 0.22, 0.14]} />
                <meshStandardMaterial color={PALETTE.gold} metalness={0.6} roughness={0.3} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      <Box size={[1.1, 0.85, 1.0]} position={[1.45, 0.425, 0.6]} color={PALETTE.steelDark} metalness={0.5} />
      <Box size={[0.45, 0.25, 0.45]} position={[1.45, 0.98, 0.6]} color="#9AA7B8" metalness={0.8} roughness={0.25} />
      <Box size={[0.5, 0.9, 0.4]} position={[-1.4, 0.45, 0.9]} color={PALETTE.navy} />
      <StatusTower position={[-1.4, 0.9, 0.9]} status={status} />
    </group>
  );
}

function FurnaceModel({ status }: { status: TwinStatus }) {
  const animate = useTwinMotion();
  const door = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => getGlowTexture(), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const f = animate ? 0.85 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 7.7) * 0.05 : 0.9;
    if (door.current) door.current.emissiveIntensity = 2.4 * f;
    if (halo.current) halo.current.opacity = 0.55 * f;
  });
  return (
    <group>
      <Box size={[3.2, 0.25, 2.6]} position={[0, 0.125, 0]} color={PALETTE.navyDeep} />
      <Box size={[3.0, 2.5, 2.4]} position={[0, 1.5, 0]} color={PALETTE.steelLight} roughness={0.55} metalness={0.3} />
      <Box size={[3.04, 0.1, 2.44]} position={[0, 2.2, 0]} color={PALETTE.navy} />
      <Box size={[2.4, 0.55, 1.8]} position={[0, 3.03, -0.1]} color={PALETTE.navy} metalness={0.4} />
      <mesh position={[0.9, 3.6, -0.55]}>
        <cylinderGeometry args={[0.18, 0.2, 1.0, 14]} />
        <meshStandardMaterial color={PALETTE.steelDark} metalness={0.6} roughness={0.35} />
      </mesh>
      <Box size={[1.75, 1.55, 0.12]} position={[0, 1.3, 1.24]} color={PALETTE.navyDeep} />
      <mesh position={[0, 1.3, 1.31]}>
        <boxGeometry args={[1.35, 1.15, 0.03]} />
        <meshStandardMaterial ref={door} color="#3A1405" emissive="#FF7A1A" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 2.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 2.2]} />
        <meshBasicMaterial ref={halo} map={tex} color="#FF8A3D" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[0, 1.3, 2.1]} color="#FF8A3D" intensity={4} distance={6} decay={2} />
      <Box size={[0.5, 0.9, 0.14]} position={[1.25, 1.35, 1.28]} color={PALETTE.navy} />
      <Screen position={[1.25, 1.45, 1.355]} size={[0.34, 0.26]} />
      <StatusTower position={[-1.2, 2.25, 0.9]} status={status} />
    </group>
  );
}

function CompressorModel({ status }: { status: TwinStatus }) {
  const animate = useTwinMotion();
  const fan = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (animate && fan.current) fan.current.rotation.y += dt * 9;
  });
  return (
    <group>
      <Box size={[2.6, 0.2, 2.8]} position={[0, 0.1, -0.2]} color={PALETTE.navyDeep} />
      <Box size={[2.3, 1.55, 1.4]} position={[0, 0.98, 0.35]} color="#2E4C78" roughness={0.45} metalness={0.35} />
      <Box size={[2.32, 0.08, 1.42]} position={[0, 1.3, 0.35]} color={PALETTE.teal} />
      <Box size={[1.5, 0.6, 0.04]} position={[-0.3, 0.75, 1.06]} color="#1A2E4E" />
      <Box size={[0.4, 0.5, 0.1]} position={[0.75, 1.0, 1.08]} color={PALETTE.navyDeep} />
      <Screen position={[0.75, 1.02, 1.135]} size={[0.28, 0.22]} />
      <mesh position={[0.5, 1.8, 0.35]}>
        <cylinderGeometry args={[0.48, 0.48, 0.1, 22]} />
        <meshStandardMaterial color={PALETTE.navyDeep} roughness={0.5} />
      </mesh>
      <mesh ref={fan} position={[0.5, 1.87, 0.35]}>
        <boxGeometry args={[0.85, 0.03, 0.12]} />
        <meshStandardMaterial color={PALETTE.steel} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.72, -0.95]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.48, 1.5, 6, 18]} />
        <meshStandardMaterial color={PALETTE.steelLight} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[-0.8, 1.05, -0.35]}>
        <cylinderGeometry args={[0.07, 0.07, 0.75, 8]} />
        <meshStandardMaterial color={PALETTE.gold} metalness={0.6} roughness={0.3} />
      </mesh>
      <StatusTower position={[-0.95, 1.76, 0.75]} status={status} />
    </group>
  );
}

const CONVEYOR_LEN = 8;
function ConveyorModel({ status }: { status: TwinStatus }) {
  const animate = useTwinMotion();
  const boxes = useRef<(THREE.Mesh | null)[]>([]);
  const count = 6;
  useFrame(({ clock }) => {
    const t = animate ? clock.getElapsedTime() : 0;
    const span = CONVEYOR_LEN - 0.8;
    boxes.current.forEach((b, i) => {
      if (!b) return;
      const p = ((t * 0.9 + (i * span) / count) % span) - span / 2;
      b.position.x = p;
    });
  });
  return (
    <group>
      {[-3.6, -1.2, 1.2, 3.6].map((x) =>
        [-0.42, 0.42].map((z) => <Box key={`${x}${z}`} size={[0.1, 0.8, 0.1]} position={[x, 0.4, z]} color={PALETTE.steelDark} metalness={0.6} />)
      )}
      <Box size={[CONVEYOR_LEN, 0.14, 1.0]} position={[0, 0.86, 0]} color="#273246" roughness={0.85} metalness={0.1} />
      <Box size={[CONVEYOR_LEN, 0.16, 0.08]} position={[0, 0.98, 0.54]} color={PALETTE.steelLight} metalness={0.5} />
      <Box size={[CONVEYOR_LEN, 0.16, 0.08]} position={[0, 0.98, -0.54]} color={PALETTE.steelLight} metalness={0.5} />
      <Box size={[CONVEYOR_LEN, 0.03, 0.02]} position={[0, 1.07, 0.585]} color={PALETTE.teal} />
      {[-CONVEYOR_LEN / 2, CONVEYOR_LEN / 2].map((x) => (
        <mesh key={x} position={[x, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1.04, 14]} />
          <meshStandardMaterial color={PALETTE.steel} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <Box size={[0.5, 0.45, 0.45]} position={[CONVEYOR_LEN / 2 - 0.3, 0.55, -0.75]} color={PALETTE.navy} />
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          position={[0, 1.18, 0]}
        >
          <boxGeometry args={[0.6, 0.44, 0.6]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#D8C3A0" : "#E5D3B3"} roughness={0.85} />
        </mesh>
      ))}
      <StatusTower position={[CONVEYOR_LEN / 2 - 0.3, 0.78, -0.75]} status={status} />
    </group>
  );
}

function MachineBody({ machine, status }: { machine: Machine; status: TwinStatus }) {
  switch (machine.type) {
    case "cnc":
      return <CncModel status={status} />;
    case "lathe":
      return <LatheModel status={status} />;
    case "press":
      return <PressModel status={status} />;
    case "robot":
      return <RobotModel status={status} />;
    case "furnace":
      return <FurnaceModel status={status} />;
    case "compressor":
      return <CompressorModel status={status} />;
    case "conveyor":
      return <ConveyorModel status={status} />;
    default:
      return <Box size={[2, 1.6, 2]} position={[0, 0.8, 0]} color={PALETTE.navy} />;
  }
}

/** Pulsing floor ring for at-risk machines (only when predictive maintenance is deployed). */
function RiskRing({ radius, status }: { radius: number; status: TwinStatus }) {
  const animate = useTwinMotion();
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const haloMat = useRef<THREE.MeshBasicMaterial>(null);
  const tex = useMemo(() => getGlowTexture(), []);
  const color = STATUS_COLOR[status];
  useFrame(({ clock }) => {
    const t = animate ? clock.getElapsedTime() : 0;
    const p = (t * (status === "critical" ? 0.9 : 0.55)) % 1;
    if (ring.current) ring.current.scale.setScalar(1 + p * 0.35);
    if (ringMat.current) ringMat.current.opacity = animate ? 0.85 * (1 - p) : 0.7;
    if (haloMat.current) haloMat.current.opacity = (status === "critical" ? 0.55 : 0.4) * (animate ? 0.8 + Math.sin(t * 2.4) * 0.2 : 1);
  });
  return (
    <group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[radius * 3, radius * 3]} />
        <meshBasicMaterial ref={haloMat} map={tex} color={color} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.1, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.06, 64]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function HeatTint({ radius, color }: { radius: number; color: string }) {
  const tex = useMemo(() => getGlowTexture(), []);
  return (
    <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[radius * 3.4, radius * 3.4]} />
      <meshBasicMaterial map={tex} color={color} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

/** Health → colour ramp for the heatmap layer (teal → amber → red). */
function healthColor(health: number) {
  const c = new THREE.Color();
  const teal = new THREE.Color(STATUS_COLOR.healthy);
  const amber = new THREE.Color(STATUS_COLOR.watch);
  const red = new THREE.Color(STATUS_COLOR.critical);
  if (health >= 72) return `#${c.copy(teal).getHexString()}`;
  if (health >= 45) return `#${c.copy(amber).lerp(teal, (health - 45) / 27).getHexString()}`;
  return `#${c.copy(red).lerp(amber, Math.max(0, (health - 20) / 25)).getHexString()}`;
}

export interface MachineNodeProps {
  machine: Machine;
  reading: MachineReading;
  selected: boolean;
  showRisk: boolean;
  showLabel: boolean;
  showHeat: boolean;
  onSelect: (id: string) => void;
}

/** Machines face the open (+z) side of the cut-away so the camera sees their fronts. */
const facing = (m: Machine) => (m.type === "robot" && m.position[0] > 0 ? -Math.PI / 2 : 0);

export function MachineNode({ machine, reading, selected, showRisk, showLabel, showHeat, onSelect }: MachineNodeProps) {
  const [hovered, setHovered] = useState(false);
  const fp = MACHINE_FOOTPRINT[machine.type];
  const [x, z] = machine.position;
  const status = reading.status;
  const atRisk = showRisk && status !== "healthy";

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    setHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group position={[x, 0, z]}>
      {showHeat ? <HeatTint radius={fp.radius} color={healthColor(showRisk ? reading.health : status === "critical" ? 30 : status === "watch" ? 60 : 90)} /> : null}
      {atRisk ? <RiskRing radius={fp.radius} status={status} /> : null}
      {selected ? (
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[fp.radius + 0.25, fp.radius + 0.38, 64]} />
          <meshBasicMaterial color={PALETTE.gold} toneMapped={false} />
        </mesh>
      ) : null}
      <group
        rotation={[0, facing(machine), 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(machine.id);
        }}
        onPointerOver={over}
        onPointerOut={out}
      >
        <MachineBody machine={machine} status={status} />
      </group>
      {showLabel ? (
        <Html position={[0, fp.top + 1.25, 0]} center zIndexRange={[9, 0]} pointerEvents="none">
          <div
            className={`pointer-events-none flex select-none items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-md ring-1 transition-colors ${
              selected ? "bg-navy-900 text-white ring-gold-400" : hovered ? "bg-white text-navy-900 ring-teal-300" : "bg-white/90 text-navy-800 ring-navy-900/10"
            }`}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
            {machine.name.split(" ")[0]}
          </div>
        </Html>
      ) : null}
    </group>
  );
}
