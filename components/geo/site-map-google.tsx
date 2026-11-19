"use client";

// Google Maps satellite implementation of the site map. Used only when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set.
import { useEffect, useRef, useState } from "react";
import { APIProvider, Circle, Map, Marker, Polygon, Polyline, useMap } from "@vis.gl/react-google-maps";
import { midpoint, type LatLng } from "@/lib/geo";
import { useT } from "@/lib/i18n";
import { MAP_GROUND_STYLE } from "./fallback-plan";
import { DUPLICATE_CLICK_PX, ZONE_COLORS, type SiteMapProps } from "./map-types";

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

const metersPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
const roughDistanceM = (a: LatLng, b: LatLng) => {
  const dy = (b.lat - a.lat) * 111_320;
  const dx = (b.lng - a.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};
const fromEvent = (e: google.maps.MapMouseEvent): LatLng | null => (e.latLng ? { lat: e.latLng.lat(), lng: e.latLng.lng() } : null);

function Camera({ center, zoom, flyKey, fitKey, points }: Pick<SiteMapProps, "center" | "zoom" | "flyKey" | "fitKey" | "points">) {
  const map = useMap();
  const latest = useRef({ center, zoom, points });
  useEffect(() => {
    latest.current = { center, zoom, points };
  });
  useEffect(() => {
    if (!map || flyKey === 0) return;
    map.panTo(latest.current.center);
    map.setZoom(latest.current.zoom);
  }, [flyKey, map]);
  useEffect(() => {
    if (!map || fitKey === 0) return;
    const pts = latest.current.points;
    if (pts.length < 2) return;
    const b = new google.maps.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    map.fitBounds(b, 70);
  }, [fitKey, map]);
  return null;
}

function circleSymbol(fill: string, stroke: string, scale: number): google.maps.Symbol {
  return { path: google.maps.SymbolPath.CIRCLE, fillColor: fill, fillOpacity: 1, strokeColor: stroke, strokeWeight: 3, scale };
}

function Layers(props: SiteMapProps & { cursor: LatLng | null }) {
  const { points, mode, selectedVertex, zones, overlays, cursor } = props;
  const map = useMap();
  const t = useT();
  if (!map) return null;
  const closed = mode !== "draw" && points.length >= 3;
  const preview = mode === "draw" && cursor && points.length > 0 ? [points[points.length - 1], cursor, ...(points.length >= 2 ? [points[0]] : [])] : null;
  const dashed = (color: string): google.maps.IconSequence[] => [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: color, scale: 2.5 }, offset: "0", repeat: "12px" }];

  return (
    <>
      {zones && closed ? (
        <>
          {overlays.solar && zones.roof.length ? (
            <>
              <Polygon paths={zones.roof} clickable={false} strokeColor={ZONE_COLORS.solar} strokeWeight={2} fillColor={ZONE_COLORS.solar} fillOpacity={0.22} />
              {zones.panelRows.map((r, i) => (
                <Polygon key={`row-${i}`} paths={r} clickable={false} strokeWeight={0} fillColor={ZONE_COLORS.solarRow} fillOpacity={0.6} />
              ))}
            </>
          ) : null}
          {overlays.storage && zones.storage.length ? <Polygon paths={zones.storage} clickable={false} strokeColor={ZONE_COLORS.storage} strokeWeight={2} fillColor={ZONE_COLORS.storage} fillOpacity={0.24} /> : null}
          {overlays.expansion && zones.expansion.length ? (
            <>
              <Polygon paths={zones.expansion} clickable={false} strokeOpacity={0} fillColor={ZONE_COLORS.expansion} fillOpacity={0.16} />
              <Polyline path={[...zones.expansion, zones.expansion[0]]} clickable={false} strokeOpacity={0} icons={dashed(ZONE_COLORS.expansion)} />
            </>
          ) : null}
          {overlays.yard && zones.yard.length ? (
            <>
              <Polygon paths={zones.yard} clickable={false} strokeColor={ZONE_COLORS.yard} strokeWeight={2} fillColor={ZONE_COLORS.yard} fillOpacity={0.16} />
              {zones.loadingBays.map((b, i) => (
                <Polygon key={`bay-${i}`} paths={b} clickable={false} strokeColor="#FFFFFF" strokeWeight={1} fillColor={ZONE_COLORS.yard} fillOpacity={0.7} />
              ))}
              {zones.turningCircle ? <Circle center={zones.turningCircle.center} radius={zones.turningCircle.radiusM} clickable={false} strokeColor="#FFFFFF" strokeWeight={2} fillColor={ZONE_COLORS.yard} fillOpacity={0.12} /> : null}
            </>
          ) : null}
        </>
      ) : null}

      {closed ? <Polygon paths={points} clickable={false} strokeColor={ZONE_COLORS.boundary} strokeWeight={3} fillColor={ZONE_COLORS.boundary} fillOpacity={0.12} /> : null}
      {mode === "draw" && points.length >= 2 ? <Polyline path={points} clickable={false} strokeColor={ZONE_COLORS.boundary} strokeWeight={3} /> : null}
      {mode === "draw" && points.length >= 3 ? <Polygon paths={points} clickable={false} strokeWeight={0} fillColor={ZONE_COLORS.boundary} fillOpacity={0.12} /> : null}
      {preview ? <Polyline path={preview} clickable={false} strokeOpacity={0} icons={dashed("#FFFFFF")} /> : null}

      {mode === "draw"
        ? points.map((p, i) => (
            <Marker
              key={`d-${i}`}
              position={p}
              title={i === 0 && points.length >= 3 ? t("Click to close the boundary") : t("Vertex {n}", { n: i + 1 })}
              icon={circleSymbol(i === 0 && points.length >= 3 ? "#CCF5EF" : "#FFFFFF", i === 0 && points.length >= 3 ? "#0FA396" : "#0B1F3A", i === 0 ? 7 : 6)}
              onClick={() => {
                if (i === 0 && points.length >= 3) props.onFinish();
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
                    position={m}
                    title={t("Click or drag to insert a vertex")}
                    draggable
                    icon={{ path: google.maps.SymbolPath.CIRCLE, fillColor: "#FFFFFF", fillOpacity: 0.8, strokeColor: "#0FA396", strokeWeight: 1.5, scale: 5 }}
                    onClick={() => props.onInsertVertex(i, m)}
                    onDragEnd={(e) => {
                      const ll = fromEvent(e);
                      if (ll) props.onInsertVertex(i, ll);
                    }}
                  />
                );
              })
            : null}
          {points.map((p, i) => (
            <Marker
              key={`v-${i}`}
              position={p}
              draggable
              zIndex={1000}
              title={t("Vertex {n} — drag to move, right-click to delete", { n: i + 1 })}
              icon={circleSymbol("#FFFFFF", selectedVertex === i ? "#C9A24B" : "#0B1F3A", selectedVertex === i ? 9 : 7)}
              onClick={() => props.onVertexSelect(i)}
              onDragStart={() => props.onVertexSelect(i)}
              onDrag={(e) => {
                const ll = fromEvent(e);
                if (ll) props.onVertexDrag(i, ll);
              }}
              onDragEnd={(e) => {
                const ll = fromEvent(e);
                if (ll) props.onVertexDragEnd(i, ll);
              }}
            />
          ))}
          <VertexContextMenu points={points} onDelete={props.onDeleteVertex} />
        </>
      ) : null}
    </>
  );
}

/** Right-click near a vertex deletes it (Marker has no contextmenu prop, so we listen on the map). */
function VertexContextMenu({ points, onDelete }: { points: LatLng[]; onDelete: (i: number) => void }) {
  const map = useMap();
  const ref = useRef({ points, onDelete });
  useEffect(() => {
    ref.current = { points, onDelete };
  });
  useEffect(() => {
    if (!map) return;
    const l = map.addListener("rightclick", (e: google.maps.MapMouseEvent) => {
      const ll = fromEvent(e);
      if (!ll) return;
      const tol = metersPerPixel(ll.lat, map.getZoom() ?? 18) * 14;
      const idx = ref.current.points.findIndex((p) => roughDistanceM(p, ll) < tol);
      if (idx >= 0) ref.current.onDelete(idx);
    });
    return () => l.remove();
  }, [map]);
  return null;
}

export default function SiteMapGoogle(props: SiteMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [cursor, setCursor] = useState<LatLng | null>(null);
  const [zoom, setZoom] = useState(props.zoom);
  const { onProviderError, onTileStatus } = props;

  useEffect(() => {
    window.gm_authFailure = () => onProviderError?.();
    return () => {
      window.gm_authFailure = undefined;
    };
  }, [onProviderError]);

  const handleClick = (e: { detail: { latLng: google.maps.LatLngLiteral | null } }) => {
    const ll = e.detail.latLng;
    if (!ll) return;
    if (props.mode === "draw") {
      const last = props.points[props.points.length - 1];
      if (last && roughDistanceM(last, ll) < metersPerPixel(ll.lat, zoom) * DUPLICATE_CLICK_PX) return;
      props.onAddPoint(ll);
    } else if (props.mode === "edit") {
      props.onVertexSelect(null);
    }
  };

  return (
    <APIProvider apiKey={apiKey} onError={() => onProviderError?.()} onLoad={() => onTileStatus?.("ok")}>
      <Map
        defaultCenter={props.center}
        defaultZoom={props.zoom}
        mapTypeId={props.showLabels ? "hybrid" : "satellite"}
        tilt={0}
        disableDefaultUI
        zoomControl
        scaleControl
        gestureHandling="greedy"
        disableDoubleClickZoom={props.mode === "draw"}
        draggableCursor={props.mode === "draw" ? "crosshair" : undefined}
        clickableIcons={false}
        style={{ width: "100%", height: "100%", ...MAP_GROUND_STYLE }}
        onZoomChanged={(e) => setZoom(e.detail.zoom)}
        onClick={handleClick}
        onDblclick={() => {
          if (props.mode === "draw") props.onFinish();
        }}
        onMousemove={(e) => {
          if (props.mode === "draw") setCursor(e.detail.latLng);
        }}
        onMouseout={() => setCursor(null)}
      >
        <Camera center={props.center} zoom={props.zoom} flyKey={props.flyKey} fitKey={props.fitKey} points={props.points} />
        <Layers {...props} cursor={props.mode === "draw" ? cursor : null} />
      </Map>
    </APIProvider>
  );
}
