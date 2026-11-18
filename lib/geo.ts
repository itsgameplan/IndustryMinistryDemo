// Geospatial helpers for Satellite Factory Intelligence (owned by the geo agent).
// All maths is plain TypeScript — no map library dependency — so it can run on the server or client.

export interface LatLng {
  lat: number;
  lng: number;
}

/** Local planar coordinates in metres (x = east, y = north). */
export interface XY {
  x: number;
  y: number;
}

export const EARTH_RADIUS_M = 6_371_008.8;
export const M2_TO_FT2 = 10.7639;
export const M2_PER_FEDDAN = 4200.83;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export const m2ToFt2 = (m2: number) => m2 * M2_TO_FT2;
export const m2ToFeddan = (m2: number) => m2 / M2_PER_FEDDAN;

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Geodesic polygon area in m² using the spherical-excess line integral
 * (same formulation as Google's `computeArea`). Works for any simple polygon; orientation-independent.
 */
export function polygonAreaM2(points: LatLng[]): number {
  if (points.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Closed-ring perimeter in metres. */
export function polygonPerimeterM(points: LatLng[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  const n = points.length;
  for (let i = 0; i < (n > 2 ? n : n - 1); i++) total += distanceM(points[i], points[(i + 1) % n]);
  return total;
}

// ---------- Local projection (equirectangular around an origin — accurate to <0.1 % at site scale) ----------

export function project(p: LatLng, origin: LatLng): XY {
  return {
    x: toRad(p.lng - origin.lng) * EARTH_RADIUS_M * Math.cos(toRad(origin.lat)),
    y: toRad(p.lat - origin.lat) * EARTH_RADIUS_M,
  };
}

export function unproject(p: XY, origin: LatLng): LatLng {
  return {
    lat: origin.lat + toDeg(p.y / EARTH_RADIUS_M),
    lng: origin.lng + toDeg(p.x / (EARTH_RADIUS_M * Math.cos(toRad(origin.lat)))),
  };
}

/** Move a point by metres east / north. */
export function offsetM(origin: LatLng, eastM: number, northM: number): LatLng {
  return unproject({ x: eastM, y: northM }, origin);
}

function planarSignedArea(pts: XY[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** Area-weighted centroid of the polygon (falls back to vertex mean for degenerate shapes). */
export function polygonCentroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const origin = points[0];
  const mean = {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
  if (points.length < 3) return mean;
  const pts = points.map((p) => project(p, origin));
  const a = planarSignedArea(pts);
  if (Math.abs(a) < 1e-6) return mean;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return unproject({ x: cx / (6 * a), y: cy / (6 * a) }, origin);
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

export interface PolygonMetrics {
  areaM2: number;
  areaFt2: number;
  areaFeddan: number;
  perimeterM: number;
  vertices: number;
  centroid: LatLng | null;
}

export function polygonMetrics(points: LatLng[]): PolygonMetrics {
  const areaM2 = polygonAreaM2(points);
  return {
    areaM2,
    areaFt2: m2ToFt2(areaM2),
    areaFeddan: m2ToFeddan(areaM2),
    perimeterM: polygonPerimeterM(points),
    vertices: points.length,
    centroid: polygonCentroid(points),
  };
}

/** True when two non-adjacent edges of the closed ring cross (self-intersecting boundary). */
export function isSelfIntersecting(points: LatLng[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  const origin = points[0];
  const p = points.map((pt) => project(pt, origin));
  const cross = (o: XY, a: XY, b: XY) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const intersects = (a: XY, b: XY, c: XY, d: XY) => {
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (intersects(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return true;
    }
  }
  return false;
}

// ---------- Suggested boundary ----------

/**
 * A plausible industrial plot outline (rotated rectangle with one chamfered corner and a slight
 * road-side jog) centred on `center` and scaled so its geodesic area equals `targetAreaM2`.
 */
export function suggestedBoundary(center: LatLng, targetAreaM2: number, rotationDeg = 14): LatLng[] {
  const shape: XY[] = [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: -0.5 },
    { x: 0.5, y: 0.22 },
    { x: 0.36, y: 0.5 },
    { x: -0.12, y: 0.5 },
    { x: -0.12, y: 0.44 },
    { x: -0.5, y: 0.44 },
  ];
  const aspect = 1.45; // width : depth
  const rot = toRad(rotationDeg);
  const place = (scale: number) =>
    shape.map(({ x, y }) => {
      const sx = x * scale * aspect;
      const sy = y * scale;
      return unproject({ x: sx * Math.cos(rot) - sy * Math.sin(rot), y: sx * Math.sin(rot) + sy * Math.cos(rot) }, center);
    });
  const unit = polygonAreaM2(place(100));
  const scale = 100 * Math.sqrt(targetAreaM2 / unit);
  return place(scale);
}

// ---------- Illustrative analysis zones ----------

/** Sutherland–Hodgman: clip an arbitrary subject polygon by a convex, counter-clockwise clip polygon. */
function clipPolygon(subject: XY[], clip: XY[]): XY[] {
  let output = subject;
  for (let i = 0; i < clip.length && output.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const inside = (p: XY) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
    const intersect = (p: XY, q: XY): XY => {
      const a1 = q.y - p.y;
      const b1 = p.x - q.x;
      const c1 = a1 * p.x + b1 * p.y;
      const a2 = b.y - a.y;
      const b2 = a.x - b.x;
      const c2 = a2 * a.x + b2 * a.y;
      const det = a1 * b2 - a2 * b1;
      if (Math.abs(det) < 1e-12) return q;
      return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det };
    };
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) output.push(intersect(prev, cur));
        output.push(cur);
      } else if (inside(prev)) {
        output.push(intersect(prev, cur));
      }
    }
  }
  return output;
}

export interface SiteFrame {
  origin: LatLng;
  angle: number; // radians — orientation of the longest edge
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
  local: XY[]; // polygon in the rotated frame (CCW)
}

/** Builds a site-aligned frame: rotated so the longest boundary edge runs along +u. */
export function siteFrame(points: LatLng[]): SiteFrame | null {
  if (points.length < 3) return null;
  const origin = polygonCentroid(points) ?? points[0];
  const xy = points.map((p) => project(p, origin));
  let best = 0;
  let angle = 0;
  for (let i = 0; i < xy.length; i++) {
    const a = xy[i];
    const b = xy[(i + 1) % xy.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > best) {
      best = len;
      angle = Math.atan2(b.y - a.y, b.x - a.x);
    }
  }
  const c = Math.cos(-angle);
  const s = Math.sin(-angle);
  let local = xy.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
  if (planarSignedArea(local) < 0) local = [...local].reverse();
  const us = local.map((p) => p.x);
  const vs = local.map((p) => p.y);
  return { origin, angle, minU: Math.min(...us), maxU: Math.max(...us), minV: Math.min(...vs), maxV: Math.max(...vs), local };
}

function frameToLatLng(frame: SiteFrame, p: XY): LatLng {
  const c = Math.cos(frame.angle);
  const s = Math.sin(frame.angle);
  return unproject({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }, frame.origin);
}

/** Rectangle in normalised frame coords (0..1 along u and v), clipped to the site polygon. */
export function zoneRect(frame: SiteFrame, u0: number, u1: number, v0: number, v1: number): LatLng[] {
  const w = frame.maxU - frame.minU;
  const h = frame.maxV - frame.minV;
  const U = (t: number) => frame.minU + t * w;
  const V = (t: number) => frame.minV + t * h;
  const rect: XY[] = [
    { x: U(u0), y: V(v0) },
    { x: U(u1), y: V(v0) },
    { x: U(u1), y: V(v1) },
    { x: U(u0), y: V(v1) },
  ];
  const clipped = clipPolygon(frame.local, rect);
  return clipped.length >= 3 ? clipped.map((p) => frameToLatLng(frame, p)) : [];
}

export function framePoint(frame: SiteFrame, u: number, v: number): LatLng {
  return frameToLatLng(frame, { x: frame.minU + u * (frame.maxU - frame.minU), y: frame.minV + v * (frame.maxV - frame.minV) });
}

export interface SiteZones {
  roof: LatLng[];
  panelRows: LatLng[][];
  expansion: LatLng[];
  yard: LatLng[];
  loadingBays: LatLng[][];
  turningCircle: { center: LatLng; radiusM: number } | null;
  storage: LatLng[];
  /** Usable short dimension of the yard in metres (drives truck-turning feasibility). */
  yardDepthM: number;
  yardLengthM: number;
}

/** Illustrative overlay zones laid out inside the boundary, aligned to the plot's dominant edge. */
export function computeSiteZones(points: LatLng[]): SiteZones | null {
  const frame = siteFrame(points);
  if (!frame) return null;
  const w = frame.maxU - frame.minU;
  const h = frame.maxV - frame.minV;
  // Main building / roof block, warehouse slice at its end, yard + expansion on the remaining strip.
  const roof = zoneRect(frame, 0.05, 0.6, 0.1, 0.86);
  const storage = zoneRect(frame, 0.45, 0.6, 0.1, 0.86);
  const expansion = zoneRect(frame, 0.66, 0.95, 0.08, 0.44);
  const yard = zoneRect(frame, 0.64, 0.95, 0.5, 0.92);

  const panelRows: LatLng[][] = [];
  const rows = Math.max(4, Math.min(12, Math.round((h * 0.76) / 8)));
  for (let r = 0; r < rows; r++) {
    const v0 = 0.13 + (r / rows) * 0.7;
    const v1 = v0 + (0.7 / rows) * 0.55;
    const row = zoneRect(frame, 0.08, 0.43, v0, v1);
    if (row.length) panelRows.push(row);
  }

  const yardLengthM = 0.31 * w;
  const yardDepthM = 0.42 * h;
  const bayCount = Math.max(2, Math.min(10, Math.floor((0.36 * h) / 4.5)));
  const loadingBays: LatLng[][] = [];
  for (let b = 0; b < bayCount; b++) {
    const v0 = 0.52 + (b / bayCount) * 0.38;
    const v1 = v0 + (0.38 / bayCount) * 0.7;
    const bay = zoneRect(frame, 0.605, 0.635, v0, v1);
    if (bay.length) loadingBays.push(bay);
  }
  const radiusM = Math.max(4, Math.min(12.5, Math.min(yardLengthM, yardDepthM) / 2 - 1));
  const turningCircle = yard.length ? { center: framePoint(frame, 0.795, 0.71), radiusM } : null;

  return { roof, panelRows, expansion, yard, loadingBays, turningCircle, storage, yardDepthM, yardLengthM };
}

// ---------- Formatting ----------

export const formatArea = (m2: number) => `${Math.round(m2).toLocaleString("en-US")} m²`;
export const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m).toLocaleString("en-US")} m`);
