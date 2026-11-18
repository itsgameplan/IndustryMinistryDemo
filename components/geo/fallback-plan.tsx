"use client";

// Stylised aerial-style site plan used when satellite tiles cannot load (offline demo).
// Rendered as SVG in a 1000×1000 viewBox; the caller anchors it geographically.
import { useMemo } from "react";

function seeded(seed: number) {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: string;
  ridges: number;
}

export function FallbackPlanSvg({ seed }: { seed: number }) {
  const { blocks, trees } = useMemo(() => {
    const rnd = seeded(seed);
    const roofTones = ["#C9CED6", "#B8C0CB", "#D6D2C8", "#A9B4C2", "#CFC6B4", "#BFC9D4"];
    const out: Block[] = [];
    // Parcels between a road grid at 0-250-500-750-1000 with 26-unit roads.
    for (let gx = 0; gx < 4; gx++) {
      for (let gy = 0; gy < 4; gy++) {
        const x0 = gx * 250 + 22;
        const y0 = gy * 250 + 22;
        if (gx >= 1 && gx <= 2 && gy >= 1 && gy <= 2) continue; // keep the centre parcel clear for the subject site
        const n = 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) {
          const w = 60 + rnd() * 120;
          const h = 50 + rnd() * 110;
          out.push({ x: x0 + rnd() * (200 - w), y: y0 + rnd() * (200 - h), w, h, tone: roofTones[Math.floor(rnd() * roofTones.length)], ridges: 2 + Math.floor(rnd() * 6) });
        }
      }
    }
    const t: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 70; i++) t.push({ x: rnd() * 1000, y: rnd() * 1000, r: 3 + rnd() * 6 });
    return { blocks: out, trees: t };
  }, [seed]);

  return (
    <>
      <defs>
        <pattern id="fp-sand" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#E9E1D0" />
          <circle cx="3" cy="4" r="0.9" fill="#DCD1BA" />
          <circle cx="10" cy="11" r="0.7" fill="#D8CCB3" />
        </pattern>
        <linearGradient id="fp-vignette" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B1F3A" stopOpacity="0.04" />
          <stop offset="1" stopColor="#0B1F3A" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="1000" height="1000" fill="url(#fp-sand)" />
      {/* Road grid */}
      {[0, 250, 500, 750, 1000].map((p) => (
        <g key={p}>
          <rect x={p - 13} y={0} width={26} height={1000} fill="#8E949C" />
          <rect x={0} y={p - 13} width={1000} height={26} fill="#8E949C" />
          <line x1={p} y1={0} x2={p} y2={1000} stroke="#F4F1E8" strokeWidth={1.2} strokeDasharray="10 12" />
          <line x1={0} y1={p} x2={1000} y2={p} stroke="#F4F1E8" strokeWidth={1.2} strokeDasharray="10 12" />
        </g>
      ))}
      {/* Subject parcel hint */}
      <rect x={272} y={272} width={456} height={456} fill="#E2D8C3" stroke="#CDBE9E" strokeWidth={2} strokeDasharray="6 6" />
      {blocks.map((b, i) => (
        <g key={i}>
          <rect x={b.x + 4} y={b.y + 5} width={b.w} height={b.h} fill="#0B1F3A" opacity={0.12} />
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.tone} stroke="#9AA3AF" strokeWidth={1} />
          {Array.from({ length: b.ridges }).map((_, r) => (
            <line key={r} x1={b.x + ((r + 1) * b.w) / (b.ridges + 1)} y1={b.y + 2} x2={b.x + ((r + 1) * b.w) / (b.ridges + 1)} y2={b.y + b.h - 2} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1} />
          ))}
        </g>
      ))}
      {trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={t.r} fill="#7F9A6B" opacity={0.75} />
      ))}
      <rect width="1000" height="1000" fill="url(#fp-vignette)" />
    </>
  );
}

/** CSS background used behind the map container so it is never blank, even before tiles/overlays load. */
export const MAP_GROUND_STYLE: React.CSSProperties = {
  backgroundColor: "#E6DECB",
  backgroundImage:
    "linear-gradient(rgba(142,148,156,0.55) 2px, transparent 2px), linear-gradient(90deg, rgba(142,148,156,0.55) 2px, transparent 2px), radial-gradient(rgba(11,31,58,0.07) 1px, transparent 1px)",
  backgroundSize: "180px 180px, 180px 180px, 14px 14px",
};
