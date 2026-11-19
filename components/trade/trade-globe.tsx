"use client";

// Interactive 3D globe for the Export / Import explorer: Earth texture, atmosphere, trade routes
// from Egypt, and animated cargo ships and planes. The globe turns to face the selected country.
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Flag } from "./flag";
import { useT } from "@/lib/i18n";
import { HOME, TRADE_COUNTRIES, type TradeCountry } from "@/lib/data/trade";

const R = 1;
const EARTH_TEXTURE = "https://unpkg.com/three-globe@2.41.12/example/img/earth-blue-marble.jpg";
const D2R = Math.PI / 180;

export function latLngToVec3(lat: number, lng: number, r = R) {
  const phi = (90 - lat) * D2R;
  const theta = (lng + 180) * D2R;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** Great-circle arc between two points, lifted off the surface by `alt` at its midpoint. */
function arcCurve(a: { lat: number; lng: number }, b: { lat: number; lng: number }, alt: number) {
  const v0 = latLngToVec3(a.lat, a.lng).normalize();
  const v1 = latLngToVec3(b.lat, b.lng).normalize();
  const angle = v0.angleTo(v1);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const s = Math.sin(angle);
    const p = s < 1e-6 ? v0.clone() : v0.clone().multiplyScalar(Math.sin((1 - t) * angle) / s).add(v1.clone().multiplyScalar(Math.sin(t * angle) / s));
    pts.push(p.normalize().multiplyScalar(R + alt * Math.sin(Math.PI * t) * (0.4 + angle)));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function Earth() {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    new THREE.TextureLoader().load(
      EARTH_TEXTURE,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        t.needsUpdate = true;
        if (alive) setTex(t);
      },
      undefined,
      () => undefined // offline: keep the stylised ocean sphere
    );
    return () => {
      alive = false;
    };
  }, []);
  return (
    <mesh>
      <sphereGeometry args={[R, 96, 96]} />
      {tex ? <meshBasicMaterial key="textured" map={tex} toneMapped={false} /> : <meshBasicMaterial key="plain" color="#1E4A86" />}
    </mesh>
  );
}

function Atmosphere() {
  return (
    <>
      <mesh scale={1.035}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshBasicMaterial color="#7DD3FC" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function Ship() {
  return (
    <group scale={0.9}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.018, 0.008, 0.05]} />
        <meshStandardMaterial color="#E2E8F0" />
      </mesh>
      <mesh position={[0, 0.007, -0.006]}>
        <boxGeometry args={[0.016, 0.007, 0.026]} />
        <meshStandardMaterial color="#F59E0B" />
      </mesh>
      <mesh position={[0, 0.011, -0.022]}>
        <boxGeometry args={[0.012, 0.012, 0.008]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function Plane() {
  return (
    <group scale={0.9}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0045, 0.003, 0.05, 8]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#E0F2FE" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[0.055, 0.002, 0.012]} />
        <meshStandardMaterial color="#F8FAFC" emissive="#E0F2FE" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.005, -0.022]}>
        <boxGeometry args={[0.018, 0.008, 0.006]} />
        <meshStandardMaterial color="#38BDF8" />
      </mesh>
    </group>
  );
}

function Vehicle({ curve, speed, offset, kind, animate }: { curve: THREE.CatmullRomCurve3; speed: number; offset: number; kind: "ship" | "plane"; animate: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), n: new THREE.Vector3() }), []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = animate ? (clock.elapsedTime * speed + offset) % 1 : offset % 1;
    curve.getPointAt(t, tmp.p);
    curve.getPointAt(Math.min(t + 0.01, 1), tmp.n);
    if (t > 0.99) tmp.n.copy(tmp.p).add(tmp.p.clone().sub(curve.getPointAt(0.98)));
    g.position.copy(tmp.p);
    g.up.copy(tmp.p).normalize();
    g.lookAt(tmp.n);
  });
  return <group ref={ref}>{kind === "ship" ? <Ship /> : <Plane />}</group>;
}

interface Route { country: TradeCountry; sea: THREE.CatmullRomCurve3; air: THREE.CatmullRomCurve3 }

function Routes({ selectedId, animate }: { selectedId: string; animate: boolean }) {
  const routes = useMemo<Route[]>(
    () => TRADE_COUNTRIES.map((c) => ({ country: c, sea: arcCurve(HOME, c, 0.025), air: arcCurve(HOME, c, 0.16) })),
    []
  );
  return (
    <>
      {routes.map((r, i) => {
        const sel = r.country.id === selectedId;
        return (
          <group key={r.country.id}>
            <Line points={r.sea.getPoints(80)} color={sel ? "#FBBF24" : "#5EEAD4"} lineWidth={sel ? 2.4 : 1} transparent opacity={sel ? 0.95 : 0.35} />
            <Line points={r.air.getPoints(80)} color={sel ? "#FDE68A" : "#93C5FD"} lineWidth={sel ? 1.8 : 0.8} transparent opacity={sel ? 0.85 : 0.25} dashed dashSize={0.03} gapSize={0.02} />
            <Vehicle curve={r.sea} kind="ship" speed={0.018 + (i % 4) * 0.004} offset={(i * 0.37) % 1} animate={animate} />
            {sel || i % 2 === 0 ? <Vehicle curve={r.air} kind="plane" speed={0.05 + (i % 3) * 0.01} offset={(i * 0.61) % 1} animate={animate} /> : null}
            {sel ? <Vehicle curve={r.sea} kind="ship" speed={0.022} offset={0.55} animate={animate} /> : null}
          </group>
        );
      })}
    </>
  );
}

function Markers({ selectedId, onSelect, labelRoot, labels }: { selectedId: string; onSelect: (id: string) => void; labelRoot: React.RefObject<HTMLDivElement | null>; labels: { home: string; selected: string } }) {
  const ring = useRef<THREE.Mesh>(null);
  const sel = TRADE_COUNTRIES.find((c) => c.id === selectedId);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const s = 1 + ((clock.elapsedTime * 0.8) % 1) * 1.8;
    ring.current.scale.setScalar(s);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - ((clock.elapsedTime * 0.8) % 1));
  });
  const home = latLngToVec3(HOME.lat, HOME.lng, R * 1.004);
  return (
    <>
      <mesh position={home}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshBasicMaterial color="#2DD4BF" />
      </mesh>
      <Html position={latLngToVec3(HOME.lat, HOME.lng, R * 1.03)} center zIndexRange={[10, 0]} portal={labelRoot as React.MutableRefObject<HTMLElement>}>
        <div className="pointer-events-none flex items-center gap-1 whitespace-nowrap rounded-full bg-teal-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow"><Flag iso="eg" /> {labels.home}</div>
      </Html>
      {TRADE_COUNTRIES.map((c) => {
        const p = latLngToVec3(c.lat, c.lng, R * 1.004);
        const active = c.id === selectedId;
        return (
          <mesh
            key={c.id}
            position={p}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(c.id);
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <sphereGeometry args={[active ? 0.02 : 0.013, 16, 16]} />
            <meshBasicMaterial color={active ? "#FBBF24" : "#E0F2FE"} />
          </mesh>
        );
      })}
      {sel ? (
        <>
          <mesh ref={ring} position={latLngToVec3(sel.lat, sel.lng, R * 1.006)} onUpdate={(m) => m.lookAt(0, 0, 0)}>
            <ringGeometry args={[0.022, 0.03, 32]} />
            <meshBasicMaterial color="#FBBF24" transparent side={THREE.DoubleSide} />
          </mesh>
          <Html position={latLngToVec3(sel.lat, sel.lng, R * 1.05)} center zIndexRange={[10, 0]} portal={labelRoot as React.MutableRefObject<HTMLElement>}>
            <div className="pointer-events-none flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy-900 shadow-lg">
              <Flag iso={sel.iso} /> {labels.selected}
            </div>
          </Html>
        </>
      ) : null}
    </>
  );
}

/** Turns the globe so the target country faces the camera; resets the camera on each new target. */
function GlobeRig({ target, animate, children }: { target: { lat: number; lng: number }; animate: boolean; children: React.ReactNode }) {
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const resetting = useRef(true);
  const goal = useMemo(() => {
    const yaw = -Math.atan2(Math.cos(target.lng * D2R), -Math.sin(target.lng * D2R));
    return { pitch: THREE.MathUtils.clamp(target.lat * D2R, -1.1, 1.1), yaw };
  }, [target.lat, target.lng]);

  useEffect(() => {
    resetting.current = true;
  }, [goal]);

  useFrame((_, dt) => {
    const k = animate ? 1 - Math.exp(-Math.min(dt, 0.05) * 2.6) : 1;
    if (tilt.current) tilt.current.rotation.x += (goal.pitch - tilt.current.rotation.x) * k;
    if (spin.current) {
      let d = goal.yaw - spin.current.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest way round
      spin.current.rotation.y += d * k;
    }
    if (resetting.current) {
      const home = new THREE.Vector3(0, 0, 4.1);
      camera.position.lerp(home, k);
      controls.current?.target.lerp(new THREE.Vector3(0, 0, 0), k);
      controls.current?.update();
      if (camera.position.distanceTo(home) < 0.01) resetting.current = false;
    }
  });

  return (
    <>
      <group ref={tilt}>
        <group ref={spin}>{children}</group>
      </group>
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={2}
        maxDistance={6}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        enableDamping
        onStart={() => {
          resetting.current = false;
        }}
      />
    </>
  );
}

export default function TradeGlobe({ selected, onSelect, animate }: { selected: TradeCountry; onSelect: (id: string) => void; animate: boolean }) {
  // Labels render into a div this component owns, so they unmount cleanly when leaving the page.
  const labelRoot = useRef<HTMLDivElement>(null);
  const t = useT();
  const labels = { home: t("Egypt"), selected: t(selected.name) };
  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);
  return (
    <>
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.1], fov: 40, near: 0.1, far: 200 }} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 3, 5]} intensity={1.6} />
      <directionalLight position={[-5, -2, -3]} intensity={0.35} color="#7DD3FC" />
      <Stars radius={60} depth={30} count={2500} factor={3} fade speed={animate ? 0.6 : 0} />
      <GlobeRig target={selected} animate={animate}>
        <Earth />
        <Routes selectedId={selected.id} animate={animate} />
        <Markers selectedId={selected.id} onSelect={onSelect} labelRoot={labelRoot} labels={labels} />
      </GlobeRig>
      <Atmosphere />
    </Canvas>
    <div ref={labelRoot} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </>
  );
}
