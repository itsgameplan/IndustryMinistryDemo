"use client";

// Leaflet implementation of the site map (Esri World Imagery). Client-only — import via next/dynamic with ssr:false.
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polygon, Polyline, SVGOverlay, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { midpoint, offsetM, type LatLng } from "@/lib/geo";
import { useT } from "@/lib/i18n";
import { FallbackPlanSvg, MAP_GROUND_STYLE } from "./fallback-plan";
import { DUPLICATE_CLICK_PX, ZONE_COLORS, type SiteMapProps, type TileStatus } from "./map-types";

const ESRI_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_PLACES = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const ESRI_ROADS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "Imagery © Esri, Maxar, Earthstar Geographics";

const toLL = (p: LatLng): L.LatLngExpression => [p.lat, p.lng];
const fromLL = (p: L.LatLng): LatLng => ({ lat: p.lat, lng: p.lng });

function vertexIcon(kind: "vertex" | "selected" | "first" | "draw"): L.DivIcon {
  const size = kind === "selected" ? 20 : kind === "first" ? 18 : 15;
  const ring = kind === "selected" ? "#C9A24B" : kind === "first" ? "#0FA396" : "#0B1F3A";
  const fill = kind === "first" ? "#CCF5EF" : "#FFFFFF";
  return L.divIcon({
    className: "jahez-vertex",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${fill};border:3px solid ${ring};box-shadow:0 0 0 3px rgba(255,255,255,0.55),0 2px 6px rgba(5,14,31,0.45);cursor:${kind === "draw" ? "crosshair" : "grab"}"></div>`,
  });
}

const midpointIcon = L.divIcon({
  className: "jahez-midpoint",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: `<div style="width:16px;height:16px;border-radius:999px;background:rgba(255,255,255,0.8);border:1.5px solid #0FA396;display:grid;place-items:center;color:#0A8379;font:700 12px/1 system-ui;box-shadow:0 1px 4px rgba(5,14,31,0.35);cursor:copy">+</div>`,
});

/** Camera + interaction-mode side effects. */
function MapController({ center, zoom, flyKey, fitKey, points, mode }: Pick<SiteMapProps, "center" | "zoom" | "flyKey" | "fitKey" | "points" | "mode">) {
  const map = useMap();
  const latest = useRef({ center, zoom, points });
  useEffect(() => {
    latest.current = { center, zoom, points };
  });

  useEffect(() => {
    if (flyKey === 0) return;
    const { center: c, zoom: z } = latest.current;
    map.flyTo([c.lat, c.lng], z, { duration: 1.4 });
  }, [flyKey, map]);

  useEffect(() => {
    if (fitKey === 0) return;
    const pts = latest.current.points;
    if (pts.length >= 2) map.flyToBounds(L.latLngBounds(pts.map(toLL)), { padding: [70, 70], maxZoom: 19, duration: 1 });
  }, [fitKey, map]);

  useEffect(() => {
    const el = map.getContainer();
    if (mode === "draw") {
      map.doubleClickZoom.disable();
      el.style.cursor = "crosshair";
    } else {
      map.doubleClickZoom.enable();
      el.style.cursor = "";
    }
  }, [mode, map]);

  return null;
}

function DrawInteractions({ points, mode, onAddPoint, onFinish, onVertexSelect, onCursor }: Pick<SiteMapProps, "points" | "mode" | "onAddPoint" | "onFinish" | "onVertexSelect"> & { onCursor: (p: LatLng | null) => void }) {
  const ref = useRef({ points, mode, onAddPoint, onFinish, onVertexSelect, onCursor });
  useEffect(() => {
    ref.current = { points, mode, onAddPoint, onFinish, onVertexSelect, onCursor };
  });
  const map = useMapEvents({
    click(e) {
      const { mode: m, points: pts, onAddPoint: add, onVertexSelect: select } = ref.current;
      if (m === "draw") {
        const last = pts[pts.length - 1];
        if (last) {
          const a = map.latLngToContainerPoint(toLL(last));
          if (a.distanceTo(e.containerPoint) < DUPLICATE_CLICK_PX) return; // second click of a double-click
        }
        add(fromLL(e.latlng));
      } else if (m === "edit") {
        select(null);
      }
    },
    dblclick() {
      if (ref.current.mode === "draw") ref.current.onFinish();
    },
    mousemove(e) {
      if (ref.current.mode === "draw") ref.current.onCursor(fromLL(e.latlng));
    },
    mouseout() {
      ref.current.onCursor(null);
    },
  });
  return null;
}

export default function SiteMapLeaflet(props: SiteMapProps) {
  const { center, zoom, points, mode, selectedVertex, zones, overlays, showLabels, planCenter, planAreaM2, onTileStatus } = props;
  const t = useT();
  const [cursor, setCursor] = useState<LatLng | null>(null);
  const [tileStatus, setTileStatus] = useState<TileStatus>(() => (typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "loading"));
  const counts = useRef({ ok: 0, err: 0 });

  const report = (s: TileStatus) => {
    setTileStatus((prev) => (prev === s ? prev : s));
    onTileStatus?.(s);
  };

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) onTileStatus?.("offline");
    const off = () => {
      if (counts.current.ok === 0) {
        setTileStatus("offline");
        onTileStatus?.("offline");
      }
    };
    window.addEventListener("offline", off);
    // If nothing has loaded after a grace period, assume tiles are unreachable.
    const t = window.setTimeout(() => {
      if (counts.current.ok === 0) {
        setTileStatus("offline");
        onTileStatus?.("offline");
      }
    }, 9000);
    return () => {
      window.removeEventListener("offline", off);
      window.clearTimeout(t);
    };
  }, [onTileStatus]);

  const icons = useMemo(() => ({ vertex: vertexIcon("vertex"), selected: vertexIcon("selected"), first: vertexIcon("first"), draw: vertexIcon("draw") }), []);

  const planBounds = useMemo(() => {
    const half = Math.max(420, Math.sqrt(Math.max(planAreaM2, 1000)) * 3.2);
    const sw = offsetM(planCenter, -half, -half);
    const ne = offsetM(planCenter, half, half);
    return L.latLngBounds([sw.lat, sw.lng], [ne.lat, ne.lng]);
  }, [planCenter, planAreaM2]);

  const closed = mode !== "draw" && points.length >= 3;
  const latlngs = points.map(toLL);
  const drawPreview = mode === "draw" && cursor && points.length > 0 ? [toLL(points[points.length - 1]), toLL(cursor), ...(points.length >= 2 ? [toLL(points[0])] : [])] : null;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      maxZoom={20}
      zoomControl={false}
      attributionControl
      className="h-full w-full"
      style={MAP_GROUND_STYLE}
      keyboard
    >
      <MapController center={center} zoom={zoom} flyKey={props.flyKey} fitKey={props.fitKey} points={points} mode={mode} />
      <DrawInteractions points={points} mode={mode} onAddPoint={props.onAddPoint} onFinish={props.onFinish} onVertexSelect={props.onVertexSelect} onCursor={setCursor} />
      <ZoomControl position="bottomright" />

      <TileLayer
        url={ESRI_IMAGERY}
        attribution={ESRI_ATTRIBUTION}
        maxNativeZoom={19}
        maxZoom={20}
        eventHandlers={{
          tileload: () => {
            counts.current.ok += 1;
            report("ok");
          },
          tileerror: () => {
            counts.current.err += 1;
            if (counts.current.ok === 0 && counts.current.err >= 4) report("offline");
          },
        }}
      />
      {showLabels && tileStatus !== "offline" ? (
        <>
          <TileLayer url={ESRI_ROADS} maxNativeZoom={19} maxZoom={20} opacity={0.85} />
          <TileLayer url={ESRI_PLACES} maxNativeZoom={19} maxZoom={20} />
        </>
      ) : null}

      {tileStatus === "offline" ? (
        <SVGOverlay bounds={planBounds} attributes={{ viewBox: "0 0 1000 1000", preserveAspectRatio: "none" }} interactive={false}>
          <FallbackPlanSvg seed={Math.round(planCenter.lat * 1e4 + planCenter.lng * 1e3)} />
        </SVGOverlay>
      ) : null}

      {/* Analysis overlays (illustrative) */}
      {zones && closed ? (
        <>
          {overlays.solar && zones.roof.length ? (
            <>
              <Polygon positions={zones.roof.map(toLL)} interactive={false} pathOptions={{ color: ZONE_COLORS.solar, weight: 2, fillColor: ZONE_COLORS.solar, fillOpacity: 0.22 }} />
              {zones.panelRows.map((r, i) => (
                <Polygon key={`row-${i}`} positions={r.map(toLL)} interactive={false} pathOptions={{ color: ZONE_COLORS.solarRow, weight: 0.5, fillColor: ZONE_COLORS.solarRow, fillOpacity: 0.6 }} />
              ))}
            </>
          ) : null}
          {overlays.storage && zones.storage.length ? (
            <Polygon positions={zones.storage.map(toLL)} interactive={false} pathOptions={{ color: ZONE_COLORS.storage, weight: 2, dashArray: "2 6", fillColor: ZONE_COLORS.storage, fillOpacity: 0.24 }} />
          ) : null}
          {overlays.expansion && zones.expansion.length ? (
            <Polygon positions={zones.expansion.map(toLL)} interactive={false} pathOptions={{ color: ZONE_COLORS.expansion, weight: 2.5, dashArray: "8 7", fillColor: ZONE_COLORS.expansion, fillOpacity: 0.16 }} />
          ) : null}
          {overlays.yard && zones.yard.length ? (
            <>
              <Polygon positions={zones.yard.map(toLL)} interactive={false} pathOptions={{ color: ZONE_COLORS.yard, weight: 2, fillColor: ZONE_COLORS.yard, fillOpacity: 0.16 }} />
              {zones.loadingBays.map((b, i) => (
                <Polygon key={`bay-${i}`} positions={b.map(toLL)} interactive={false} pathOptions={{ color: "#FFFFFF", weight: 1, fillColor: ZONE_COLORS.yard, fillOpacity: 0.7 }} />
              ))}
              {zones.turningCircle ? (
                <Circle center={toLL(zones.turningCircle.center)} radius={zones.turningCircle.radiusM} interactive={false} pathOptions={{ color: "#FFFFFF", weight: 2, dashArray: "4 5", fillColor: ZONE_COLORS.yard, fillOpacity: 0.12 }} />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {/* Boundary */}
      {closed ? (
        <Polygon positions={latlngs} interactive={false} pathOptions={{ color: ZONE_COLORS.boundary, weight: 3, fillColor: ZONE_COLORS.boundary, fillOpacity: mode === "edit" ? 0.14 : 0.1 }} />
      ) : null}
      {closed ? <Polygon positions={latlngs} interactive={false} pathOptions={{ color: "#FFFFFF", weight: 1, opacity: 0.9, fill: false, dashArray: "1 6" }} /> : null}
      {mode === "draw" && points.length >= 2 ? <Polyline positions={latlngs} interactive={false} pathOptions={{ color: ZONE_COLORS.boundary, weight: 3 }} /> : null}
      {mode === "draw" && points.length >= 3 ? <Polygon positions={latlngs} interactive={false} pathOptions={{ stroke: false, fillColor: ZONE_COLORS.boundary, fillOpacity: 0.12 }} /> : null}
      {drawPreview ? <Polyline positions={drawPreview} interactive={false} pathOptions={{ color: "#FFFFFF", weight: 2, dashArray: "6 6", opacity: 0.95 }} /> : null}

      {/* Vertex handles */}
      {mode === "draw"
        ? points.map((p, i) => (
            <Marker
              key={`d-${i}`}
              position={toLL(p)}
              icon={i === 0 && points.length >= 3 ? icons.first : icons.draw}
              keyboard={false}
              title={i === 0 && points.length >= 3 ? t("Click to close the boundary") : t("Vertex {n}", { n: i + 1 })}
              eventHandlers={{
                click: () => {
                  if (i === 0 && points.length >= 3) props.onFinish();
                },
              }}
            />
          ))
        : null}

      {mode === "edit" ? (
        <>
          {points.length >= 3
            ? points.map((p, i) => {
                const m = midpoint(p, points[(i + 1) % points.length]);
                return (
                  <Marker
                    key={`m-${i}-${m.lat.toFixed(7)}-${m.lng.toFixed(7)}`}
                    position={toLL(m)}
                    icon={midpointIcon}
                    draggable
                    title={t("Click or drag to insert a vertex")}
                    alt={t("Insert vertex")}
                    eventHandlers={{
                      click: () => props.onInsertVertex(i, m),
                      dragend: (e) => props.onInsertVertex(i, fromLL((e.target as L.Marker).getLatLng())),
                    }}
                  />
                );
              })
            : null}
          {points.map((p, i) => (
            <Marker
              key={`v-${i}`}
              position={toLL(p)}
              icon={selectedVertex === i ? icons.selected : icons.vertex}
              draggable
              zIndexOffset={1000}
              title={t("Vertex {n} — drag to move, right-click to delete", { n: i + 1 })}
              alt={t("Vertex {n}", { n: i + 1 })}
              eventHandlers={{
                click: () => props.onVertexSelect(i),
                dragstart: () => props.onVertexSelect(i),
                drag: (e) => props.onVertexDrag(i, fromLL((e.target as L.Marker).getLatLng())),
                dragend: (e) => props.onVertexDragEnd(i, fromLL((e.target as L.Marker).getLatLng())),
                contextmenu: (e) => {
                  L.DomEvent.preventDefault(e.originalEvent);
                  props.onDeleteVertex(i);
                },
              }}
            />
          ))}
        </>
      ) : null}
    </MapContainer>
  );
}
