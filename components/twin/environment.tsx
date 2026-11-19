"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Grid, Html, Line } from "@react-three/drei";
import { useT } from "@/lib/i18n";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AGV_LOOP, FLOW_ARROWS, PALETTE, ZONES, type TwinLayers } from "./constants";
import { useTwinMotion } from "./motion-context";

const FLOOR_W = 40;
const FLOOR_D = 24;

type BoxSpec = { size: [number, number, number]; pos: [number, number, number]; rot?: [number, number, number] };

function mergeBoxes(specs: BoxSpec[]): THREE.BufferGeometry {
  const geos = specs.map(({ size, pos, rot }) => {
    const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
    if (rot) g.rotateX(rot[0]).rotateY(rot[1]).rotateZ(rot[2]);
    g.translate(pos[0], pos[1], pos[2]);
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

/** Floor slab, plinth and fine grid. */
function Floor() {
  return (
    <group>
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[FLOOR_W + 1.6, 1.1, FLOOR_D + 1.6]} />
        <meshStandardMaterial color={PALETTE.plinth} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[FLOOR_W + 0.6, 0.24, FLOOR_D + 0.6]} />
        <meshStandardMaterial color={PALETTE.floor} roughness={0.92} metalness={0} />
      </mesh>
      {/* thin gold rim on the slab edge */}
      <mesh position={[0, -0.215, 0]}>
        <boxGeometry args={[FLOOR_W + 0.7, 0.03, FLOOR_D + 0.7]} />
        <meshStandardMaterial color={PALETTE.gold} roughness={0.4} metalness={0.6} />
      </mesh>
      <Grid
        position={[0, 0.003, 0]}
        args={[FLOOR_W, FLOOR_D]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#D3D9E2"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#B8C2D0"
        fadeDistance={140}
        fadeStrength={1}
      />
    </group>
  );
}

/** Cut-away building: two partial walls, perimeter columns and roof trusses. */
function Building() {
  const { frame, glass } = useMemo(() => {
    const specs: BoxSpec[] = [];
    // back wall (z = -12) and left wall (x = -20), lower solid band
    specs.push({ size: [FLOOR_W, 2.4, 0.25], pos: [0, 1.2, -FLOOR_D / 2 - 0.12] });
    specs.push({ size: [0.25, 2.4, FLOOR_D], pos: [-FLOOR_W / 2 - 0.12, 1.2, 0] });
    // low curb on the open sides
    specs.push({ size: [FLOOR_W, 0.25, 0.2], pos: [0, 0.12, FLOOR_D / 2 + 0.1] });
    specs.push({ size: [0.2, 0.25, FLOOR_D], pos: [FLOOR_W / 2 + 0.1, 0.12, 0] });
    // perimeter columns
    for (let x = -20; x <= 20; x += 8) {
      specs.push({ size: [0.4, 7.6, 0.4], pos: [x, 3.8, -12.1] });
      specs.push({ size: [0.4, 7.6, 0.4], pos: [x, 3.8, 12.1] });
    }
    for (const z of [-4, 4]) {
      specs.push({ size: [0.4, 7.6, 0.4], pos: [-20.1, 3.8, z] });
      specs.push({ size: [0.4, 7.6, 0.4], pos: [20.1, 3.8, z] });
    }
    // roof trusses spanning z, one per column line
    for (let x = -20; x <= 20; x += 8) {
      specs.push({ size: [0.16, 0.16, FLOOR_D + 0.4], pos: [x, 7.6, 0] }); // bottom chord
      // gentle pitched top chords
      const half = FLOOR_D / 2 + 0.2;
      const rise = 1.4;
      const len = Math.hypot(half, rise);
      const ang = Math.atan2(rise, half);
      specs.push({ size: [0.16, 0.16, len], pos: [x, 7.6 + rise / 2, -half / 2], rot: [-ang, 0, 0] });
      specs.push({ size: [0.16, 0.16, len], pos: [x, 7.6 + rise / 2, half / 2], rot: [ang, 0, 0] });
      // web members
      for (let z = -10; z <= 10; z += 2.5) {
        const h = rise * (1 - Math.abs(z) / half);
        if (h > 0.15) specs.push({ size: [0.08, h, 0.08], pos: [x, 7.6 + h / 2, z] });
      }
    }
    // purlins along x
    for (const z of [-12, -6, 0, 6, 12]) {
      const h = 7.6 + 1.4 * (1 - Math.abs(z) / (FLOOR_D / 2 + 0.2));
      specs.push({ size: [FLOOR_W, 0.1, 0.1], pos: [0, h + 0.1, z] });
    }
    const glassSpecs: BoxSpec[] = [
      { size: [FLOOR_W, 1.1, 0.06], pos: [0, 2.95, -FLOOR_D / 2 - 0.12] },
      { size: [0.06, 1.1, FLOOR_D], pos: [-FLOOR_W / 2 - 0.12, 2.95, 0] },
    ];
    return { frame: mergeBoxes(specs), glass: mergeBoxes(glassSpecs) };
  }, []);

  return (
    <group>
      <mesh geometry={frame}>
        <meshStandardMaterial color={PALETTE.wall} roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh geometry={glass}>
        <meshStandardMaterial color={PALETTE.glass} transparent opacity={0.28} roughness={0.1} metalness={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Pallet racking: four merged meshes for ~20 bays. */
function Racks() {
  const geos = useMemo(() => {
    const posts: BoxSpec[] = [];
    const beams: BoxSpec[] = [];
    const pallets: BoxSpec[] = [];
    const goods: BoxSpec[] = [];
    const levels = [0.15, 1.35, 2.55];
    const bay = 2.4;
    const depth = 1.1;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const addRun = (start: [number, number], bays: number, alongX: boolean) => {
      for (let b = 0; b <= bays; b++) {
        const a = b * bay;
        for (const side of [-depth / 2, depth / 2]) {
          const x = alongX ? start[0] + a : start[0] + side;
          const z = alongX ? start[1] + side : start[1] + a;
          posts.push({ size: [0.1, 3.7, 0.1], pos: [x, 1.85, z] });
        }
      }
      for (let b = 0; b < bays; b++) {
        const c = b * bay + bay / 2;
        for (const lv of levels.slice(1).concat([3.6])) {
          for (const side of [-depth / 2, depth / 2]) {
            const x = alongX ? start[0] + c : start[0] + side;
            const z = alongX ? start[1] + side : start[1] + c;
            beams.push({ size: alongX ? [bay, 0.12, 0.08] : [0.08, 0.12, bay], pos: [x, lv - 0.06, z] });
          }
        }
        for (const lv of levels) {
          for (const off of [-0.55, 0.55]) {
            if (rnd() < 0.18) continue;
            const x = alongX ? start[0] + c + off : start[0];
            const z = alongX ? start[1] : start[1] + c + off;
            pallets.push({ size: [0.95, 0.12, 0.95], pos: [x, lv + 0.06, z] });
            const h = 0.45 + rnd() * 0.5;
            goods.push({ size: [0.85, h, 0.85], pos: [x, lv + 0.12 + h / 2, z] });
          }
        }
      }
    };
    addRun([16.2, -9.6], 8, false);
    addRun([18.6, -9.6], 8, false);
    addRun([-14.4, 10.7], 6, true);
    addRun([0.8, 10.7], 3, true);
    return { posts: mergeBoxes(posts), beams: mergeBoxes(beams), pallets: mergeBoxes(pallets), goods: mergeBoxes(goods) };
  }, []);

  return (
    <group>
      <mesh geometry={geos.posts}>
        <meshStandardMaterial color={PALETTE.navy} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh geometry={geos.beams}>
        <meshStandardMaterial color={PALETTE.gold} roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh geometry={geos.pallets}>
        <meshStandardMaterial color="#C8A97E" roughness={0.9} />
      </mesh>
      <mesh geometry={geos.goods}>
        <meshStandardMaterial color="#F4F6F8" roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Zone fills, borders and labels. */
function Zones({ showLabels }: { showLabels: boolean }) {
  // Drei <Html> renders into its own React root, so translate here (inside the bridged R3F tree).
  const t = useT();
  return (
    <group>
      {ZONES.map((z) => {
        const [x0, z0, x1, z1] = z.rect;
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        const border: [number, number, number][] = [
          [x0, 0.012, z0],
          [x1, 0.012, z0],
          [x1, 0.012, z1],
          [x0, 0.012, z1],
          [x0, 0.012, z0],
        ];
        return (
          <group key={z.id}>
            <mesh position={[cx, 0.006, cz]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[x1 - x0, z1 - z0]} />
              <meshBasicMaterial color={z.color} transparent opacity={0.06} depthWrite={false} />
            </mesh>
            <Line points={border} color={z.color} lineWidth={1.2} transparent opacity={0.55} dashed dashSize={0.5} gapSize={0.3} />
            {showLabels ? (
              <Html position={[x0 + 0.2, 0.05, z0 + 0.25]} zIndexRange={[8, 0]} pointerEvents="none">
                <div className="pointer-events-none select-none whitespace-nowrap rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-700 shadow-sm ring-1 ring-navy-900/10 backdrop-blur-sm">
                  {t(z.label)}
                </div>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

/** Polyline helpers for the AGV loop. */
function useLoop() {
  return useMemo(() => {
    const pts = AGV_LOOP.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const segs: { a: THREE.Vector3; b: THREE.Vector3; len: number; start: number }[] = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = pts[i].distanceTo(pts[i + 1]);
      segs.push({ a: pts[i], b: pts[i + 1], len, start: total });
      total += len;
    }
    return { segs, total };
  }, []);
}

function Agv({ offset }: { offset: number }) {
  const ref = useRef<THREE.Group>(null);
  const animate = useTwinMotion();
  const { segs, total } = useLoop();

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = animate ? clock.getElapsedTime() : 0;
    const d = (offset * total + t * 2.2) % total;
    const seg = segs.find((s) => d >= s.start && d < s.start + s.len) ?? segs[0];
    const k = (d - seg.start) / seg.len;
    g.position.set(seg.a.x + (seg.b.x - seg.a.x) * k, 0, seg.a.z + (seg.b.z - seg.a.z) * k);
    g.rotation.y = Math.atan2(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.9, 0.3, 1.3]} />
        <meshStandardMaterial color="#F7F9FB" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.39, 0]}>
        <boxGeometry args={[0.82, 0.04, 1.22]} />
        <meshStandardMaterial color={PALETTE.navy} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.25, 0.66]}>
        <boxGeometry args={[0.6, 0.06, 0.02]} />
        <meshStandardMaterial color={PALETTE.tealGlow} emissive={PALETTE.tealGlow} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.6, -0.1]}>
        <boxGeometry args={[0.7, 0.4, 0.7]} />
        <meshStandardMaterial color="#E9DCC3" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Flows() {
  const loop = AGV_LOOP.map(([x, z]) => [x, 0.015, z] as [number, number, number]);
  return (
    <group>
      <Line points={loop} color={PALETTE.teal} lineWidth={2.2} transparent opacity={0.75} />
      <Line points={loop.map(([x, y, z]) => [x, y, z + 0.55] as [number, number, number])} color={PALETTE.teal} lineWidth={1} transparent opacity={0.35} dashed dashSize={0.4} gapSize={0.4} />
      {FLOW_ARROWS.map((seg, i) => {
        const [[ax, az], [bx, bz]] = seg;
        const ang = Math.atan2(-(bz - az), bx - ax);
        return (
          <group key={i}>
            <Line points={[[ax, 0.02, az], [bx, 0.02, bz]]} color={PALETTE.gold} lineWidth={2} dashed dashSize={0.3} gapSize={0.2} />
            <mesh position={[bx, 0.03, bz]} rotation={[-Math.PI / 2, 0, ang]}>
              <circleGeometry args={[0.28, 3]} />
              <meshBasicMaterial color={PALETTE.gold} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function FactoryEnvironment({ layers }: { layers: TwinLayers }) {
  return (
    <group>
      <Floor />
      <Building />
      <Zones showLabels={layers.labels} />
      <Racks />
      {layers.flows ? <Flows /> : null}
      <Agv offset={0} />
      <Agv offset={0.52} />
    </group>
  );
}
