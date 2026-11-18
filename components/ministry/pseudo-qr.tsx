"use client";

import { useMemo } from "react";
import { seededRandom } from "@/lib/data/national";

const SIZE = 25;

/** Is (x, y) inside one of the three 7×7 finder patterns or their 1-module quiet separator? */
function finderZone(x: number, y: number) {
  const inBox = (ox: number, oy: number) => x >= ox - 1 && x <= ox + 7 && y >= oy - 1 && y <= oy + 7;
  return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
}

/**
 * Deterministic QR-*like* visual drawn as SVG. It is decorative and intentionally not a
 * scannable QR code — no library, no encoded payload.
 */
export function PseudoQr({ seed, className, size = 148 }: { seed: string; className?: string; size?: number }) {
  const modules = useMemo(() => {
    const rand = seededRandom(`qr:${seed}`);
    const cells: [number, number][] = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (finderZone(x, y)) continue;
        // Timing patterns like a real QR, plus pseudo-random data modules.
        if (y === 6 || x === 6) {
          if ((x + y) % 2 === 0) cells.push([x, y]);
          continue;
        }
        if (rand() > 0.52) cells.push([x, y]);
      }
    }
    return cells;
  }, [seed]);

  const finders: [number, number][] = [[0, 0], [SIZE - 7, 0], [0, SIZE - 7]];
  return (
    <svg viewBox={`-2 -2 ${SIZE + 4} ${SIZE + 4}`} width={size} height={size} className={className} role="img" aria-label="Decorative verification pattern (sample, not a scannable QR code)" shapeRendering="crispEdges">
      <rect x={-2} y={-2} width={SIZE + 4} height={SIZE + 4} fill="#fff" />
      {modules.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0B1F3A" />)}
      {finders.map(([x, y]) => (
        <g key={`f-${x}-${y}`}>
          <rect x={x} y={y} width={7} height={7} fill="#0B1F3A" />
          <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill="#0FA396" />
        </g>
      ))}
      {/* Centre mark */}
      <rect x={10} y={10} width={5} height={5} rx={1} fill="#fff" />
      <rect x={11} y={11} width={3} height={3} rx={0.6} fill="#C9A24B" />
    </svg>
  );
}
