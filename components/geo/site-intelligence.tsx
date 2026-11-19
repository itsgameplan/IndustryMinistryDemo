"use client";

// Satellite Factory Intelligence — boundary editor, live area metrics and illustrative AI site analysis.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Banknote, Check, CheckCircle2, ChevronDown, Crosshair, Expand, Eye, EyeOff, Factory as FactoryIcon, Layers, Leaf, Loader2,
  MapPin, MousePointerClick, PenLine, Pencil, RotateCcw, Ruler, Satellite, Scan, Search, Sparkles, Sun, Tags, Trash2,
  TriangleAlert, Truck, Undo2, Warehouse, WifiOff, X, Zap,
} from "lucide-react";
import { Badge, Button, Card, DemoDisclaimer, Progress, Skeleton } from "@/components/ui";
import { PageHeader } from "@/components/shell/shared";
import { FACTORIES } from "@/lib/data/factories";
import { useActiveFactory, useHydrated, useJahez } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import { formatDistance, isSelfIntersecting, polygonAreaM2, polygonCentroid, polygonMetrics, suggestedBoundary, type LatLng } from "@/lib/geo";
import type { DemoFactoryId, Factory, FactoryId } from "@/lib/types";
import { ANALYSIS_STEPS, analyzeSite, formatEgp, type SiteAnalysis } from "./analysis";
import { MAP_GROUND_STYLE } from "./fallback-plan";
import { ZONE_COLORS, type EditorMode, type ImageryProvider, type OverlayToggles, type SiteMapProps, type TileStatus } from "./map-types";

function MapLoading() {
  const t = useT();
  return (
    <div className="relative grid h-full w-full place-items-center" style={MAP_GROUND_STYLE}>
      <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-navy-700 shadow-lift backdrop-blur-md">
        <Loader2 className="size-4 animate-spin text-teal-600" /> {t("Loading satellite imagery…")}
      </div>
    </div>
  );
}

const LeafletSiteMap = dynamic<SiteMapProps>(() => import("./site-map-leaflet"), { ssr: false, loading: () => <MapLoading /> });
const GoogleSiteMap = dynamic<SiteMapProps>(() => import("./site-map-google"), { ssr: false, loading: () => <MapLoading /> });

const HAS_GOOGLE_KEY = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

// ---------------- Locations ----------------

interface LocationPreset {
  id: string;
  label: string;
  /** Arabic label, when the preset is a factory with an Arabic name. */
  labelAr?: string;
  sub: string;
  coords: LatLng;
  kind: "factory" | "jahez" | "zone";
}

const DEMO_ZONES: LocationPreset[] = [
  { id: "october", label: "6th of October Industrial Zone", sub: "Giza · alternative plot", coords: { lat: 29.9175, lng: 30.9025 }, kind: "zone" },
  { id: "sadat", label: "Sadat City Industrial Zone", sub: "Menoufia · alternative plot", coords: { lat: 30.3836, lng: 30.5108 }, kind: "zone" },
  { id: "borg", label: "Borg El Arab Industrial Zone", sub: "Alexandria · alternative plot", coords: { lat: 30.8705, lng: 29.6044 }, kind: "zone" },
  { id: "sokhna", label: "SCZone — Ain Sokhna", sub: "Suez · alternative plot", coords: { lat: 29.6006, lng: 32.3266 }, kind: "zone" },
];

function presetsFor(factoryId: FactoryId, profile: Factory): LocationPreset[] {
  const own = profile;
  const otherId: DemoFactoryId = factoryId === "al-noor" ? "delta" : "al-noor";
  const other = FACTORIES[otherId];
  return [
    { id: `f-${own.id}`, label: own.name, labelAr: own.nameAr, sub: own.location, coords: own.coordinates, kind: "factory" },
    { id: `f-${other.id}`, label: other.name, labelAr: other.nameAr, sub: other.location, coords: other.coordinates, kind: "jahez" },
    ...DEMO_ZONES,
  ];
}

const zoomForArea = (areaM2: number) => (areaM2 > 20_000 ? 17 : 18);

// ---------------- Root ----------------

export function SiteIntelligence() {
  const hydrated = useHydrated();
  const { id, factory } = useActiveFactory();
  const t = useT();
  const { locale } = useLocale();
  const factoryName = locale === "ar" ? (factory.nameAr ?? factory.name) : factory.name;
  return (
    <div>
      <PageHeader
        eyebrow={t("Satellite Factory Intelligence")}
        title={t("Site intelligence")}
        description={t("Map the {name} plot on live satellite imagery, measure it precisely and let JAHEZ AI surface solar, expansion and logistics opportunities.", { name: factoryName })}
        actions={
          <Badge tone="teal" className="px-3 py-1 text-xs">
            <Satellite /> {t(factory.location)}
          </Badge>
        }
      />
      {hydrated ? (
        <Workspace key={id} factory={factory} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[560px] rounded-3xl lg:h-[min(72vh,760px)]" />
          <div className="space-y-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-64" />
            <Skeleton className="h-40" />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Workspace ----------------

function Workspace({ factory }: { factory: Factory }) {
  const factoryId = factory.id;
  const saved = useJahez((s) => s.factories[factoryId]?.siteBoundary);
  const setSiteBoundary = useJahez((s) => s.setSiteBoundary);
  const presets = useMemo(() => presetsFor(factoryId, factory), [factoryId, factory]);
  const t = useT();
  const { isRtl } = useLocale();

  const [points, setPoints] = useState<LatLng[]>(() => saved?.points ?? []);
  const [draft, setDraft] = useState<LatLng[]>([]);
  const [mode, setMode] = useState<EditorMode>("view");
  const [selected, setSelected] = useState<number | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<number | undefined>(() => saved?.analyzedAt);
  const [stale, setStale] = useState(false);
  const [location, setLocation] = useState<LocationPreset>(presets[0]);
  const [camera, setCamera] = useState(() => {
    const c = saved && saved.points.length >= 3 ? polygonCentroid(saved.points) : null;
    return { center: c ?? factory.coordinates, zoom: zoomForArea(factory.siteAreaM2), flyKey: 0, fitKey: saved && saved.points.length >= 3 ? 1 : 0 };
  });
  const [provider, setProvider] = useState<ImageryProvider>(HAS_GOOGLE_KEY ? "google" : "esri");
  const [tileStatus, setTileStatus] = useState<TileStatus>("loading");
  const [showLabels, setShowLabels] = useState(false);
  const [overlays, setOverlays] = useState<OverlayToggles>({ solar: true, expansion: true, yard: true, storage: true });
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);

  const livePoints = mode === "draw" ? draft : points;
  const metrics = useMemo(() => polygonMetrics(livePoints), [livePoints]);
  const selfIntersecting = useMemo(() => isSelfIntersecting(livePoints), [livePoints]);
  const analysis = useMemo<SiteAnalysis | null>(() => (points.length >= 3 ? analyzeSite(points, factory) : null), [points, factory]);
  const hasBoundary = points.length >= 3;
  const showResults = Boolean(analyzedAt && analysis && !running);

  // ---- persistence ----
  const persist = useCallback(
    (pts: LatLng[]) => {
      if (pts.length >= 3) setSiteBoundary(factoryId, { points: pts, areaM2: Math.round(polygonAreaM2(pts)) });
      else setSiteBoundary(factoryId, undefined);
      if (analyzedAt) {
        setAnalyzedAt(undefined);
        setStale(true);
      }
    },
    [factoryId, setSiteBoundary, analyzedAt]
  );

  // ---- editor actions ----
  const startDraw = () => {
    setDraft([]);
    setSelected(null);
    setMode("draw");
  };
  const addPoint = useCallback((p: LatLng) => setDraft((d) => [...d, p]), []);
  const undoPoint = () => setDraft((d) => d.slice(0, -1));
  const cancelDraw = () => {
    setDraft([]);
    setMode("view");
  };
  const finishDraw = () => {
    if (draft.length < 3) {
      toast.error(t("Add at least 3 points to close the boundary"));
      return;
    }
    if (isSelfIntersecting(draft)) toast.warning(t("Boundary edges cross — drag vertices to untangle for an accurate area"));
    setPoints(draft);
    persist(draft);
    setDraft([]);
    setMode("edit");
    toast.success(t("Boundary saved"), { description: t("{area} m² · drag vertices to refine", { area: formatNumber(polygonAreaM2(draft)) }) });
  };
  const startEdit = () => {
    if (!hasBoundary) return;
    setMode("edit");
  };
  const doneEdit = () => {
    setSelected(null);
    setMode("view");
  };
  const vertexDrag = (i: number, p: LatLng) => setPoints((ps) => ps.map((q, j) => (j === i ? p : q)));
  const vertexDragEnd = (i: number, p: LatLng) => {
    const next = points.map((q, j) => (j === i ? p : q));
    setPoints(next);
    persist(next);
  };
  const insertVertex = (after: number, p: LatLng) => {
    const next = [...points.slice(0, after + 1), p, ...points.slice(after + 1)];
    setPoints(next);
    persist(next);
    setSelected(after + 1);
  };
  const deleteVertex = (i: number) => {
    if (points.length <= 3) {
      toast.error(t("A boundary needs at least 3 vertices"));
      return;
    }
    const next = points.filter((_, j) => j !== i);
    setPoints(next);
    persist(next);
    setSelected(null);
  };
  const clearBoundary = () => {
    setPoints([]);
    setDraft([]);
    setSelected(null);
    setMode("view");
    setSiteBoundary(factoryId, undefined);
    setAnalyzedAt(undefined);
    setStale(false);
    toast(t("Boundary cleared"));
  };
  const applySuggested = () => {
    const pts = suggestedBoundary(location.coords, factory.siteAreaM2);
    setPoints(pts);
    setDraft([]);
    setSelected(null);
    persist(pts);
    setMode("edit");
    setCamera((c) => ({ ...c, fitKey: c.fitKey + 1 }));
    toast.success(t("Suggested boundary placed"), { description: t("Sized to the registered {area} m² plot — drag vertices to match the imagery.", { area: formatNumber(factory.siteAreaM2) }) });
  };
  const fitToBoundary = () => setCamera((c) => ({ ...c, fitKey: c.fitKey + 1 }));
  const goTo = (p: LocationPreset) => {
    setLocation(p);
    setCamera((c) => ({ ...c, center: p.coords, zoom: zoomForArea(factory.siteAreaM2), flyKey: c.flyKey + 1 }));
  };

  // ---- analysis ----
  const runAnalysis = () => {
    if (!hasBoundary || running) return;
    setMode("view");
    setSelected(null);
    setStep(0);
    setRunning(true);
  };
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (step >= ANALYSIS_STEPS.length - 1) {
        const at = Date.now();
        setSiteBoundary(factoryId, { points, areaM2: Math.round(polygonAreaM2(points)), analyzedAt: at });
        setAnalyzedAt(at);
        setStale(false);
        setRunning(false);
        setOverlays({ solar: true, expansion: true, yard: true, storage: true });
        toast.success(t("Site analysis complete"), { description: t("Opportunity overlays are now drawn on the map.") });
      } else {
        setStep(step + 1);
      }
    }, 520);
    return () => window.clearTimeout(timer);
  }, [running, step, factoryId, points, setSiteBoundary, t]);

  // ---- keyboard ----
  const keyRef = useRef({ mode, selected, finishDraw, cancelDraw, undoPoint, deleteVertex, doneEdit, t });
  useEffect(() => {
    keyRef.current = { mode, selected, finishDraw, cancelDraw, undoPoint, deleteVertex, doneEdit, t };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = keyRef.current;
      if (k.mode === "draw") {
        if (e.key === "Escape") {
          e.preventDefault();
          k.cancelDraw();
          toast(k.t("Drawing cancelled"));
        } else if (e.key === "Enter") {
          e.preventDefault();
          k.finishDraw();
        } else if ((e.key === "z" && (e.ctrlKey || e.metaKey)) || e.key === "Backspace") {
          e.preventDefault();
          k.undoPoint();
        }
      } else if (k.mode === "edit") {
        if ((e.key === "Delete" || e.key === "Backspace") && k.selected !== null) {
          e.preventDefault();
          k.deleteVertex(k.selected);
        } else if (e.key === "Escape") {
          k.doneEdit();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onTileStatus = useCallback((s: TileStatus) => setTileStatus(s), []);
  const onProviderError = useCallback(() => {
    setProvider("esri");
    setTileStatus("loading");
    toast.warning(t("Google Maps unavailable"), { description: t("Switched to Esri World Imagery.") });
  }, [t]);

  const mapProps: SiteMapProps = {
    center: camera.center,
    zoom: camera.zoom,
    flyKey: camera.flyKey,
    fitKey: camera.fitKey,
    points: livePoints,
    mode,
    selectedVertex: selected,
    zones: showResults && analysis ? analysis.zones : null,
    overlays,
    showLabels,
    planCenter: location.coords,
    planAreaM2: factory.siteAreaM2,
    onAddPoint: addPoint,
    onFinish: finishDraw,
    onVertexDrag: vertexDrag,
    onVertexDragEnd: vertexDragEnd,
    onVertexSelect: setSelected,
    onInsertVertex: insertVertex,
    onDeleteVertex: deleteVertex,
    onTileStatus,
    onProviderError,
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- Map hero ---------- */}
        <div className="relative isolate h-[560px] overflow-hidden rounded-3xl border border-line bg-navy-900 shadow-lift lg:h-[min(72vh,760px)] lg:min-h-[600px]">
          {provider === "google" ? <GoogleSiteMap {...mapProps} /> : <LeafletSiteMap {...mapProps} />}

          {/* Top bar */}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[1100] flex flex-wrap items-start justify-between gap-2">
            <LocationPicker presets={presets} value={location} onSelect={goTo} />
            <div className="pointer-events-auto flex items-center gap-1.5">
              <ImageryBadge provider={provider} status={tileStatus} />
              <GlassIconButton label={showLabels ? t("Hide labels & roads") : t("Show labels & roads")} active={showLabels} onClick={() => setShowLabels((v) => !v)} disabled={provider === "esri" && tileStatus === "offline"}>
                <Tags />
              </GlassIconButton>
              <GlassIconButton label={t("Zoom to boundary")} onClick={fitToBoundary} disabled={!hasBoundary && mode !== "draw"}>
                <Scan />
              </GlassIconButton>
              <GlassIconButton label={t("Re-centre on location")} onClick={() => goTo(location)}>
                <Crosshair />
              </GlassIconButton>
            </div>
          </div>

          {/* Mode hint */}
          <AnimatePresence>
            {mode !== "view" ? (
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="pointer-events-none absolute left-1/2 top-[7.25rem] z-[1050] sm:top-[4.25rem] w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-full bg-navy-950/80 px-4 py-1.5 text-center text-xs font-medium text-white shadow-lift backdrop-blur-md"
                role="status"
              >
                {mode === "draw" ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MousePointerClick className="size-3.5 text-teal-300" />
                    {draft.length === 0
                      ? t("Click on the map to place the first corner")
                      : draft.length < 3
                        ? draft.length > 1 ? t("{count} points · keep clicking corners", { count: draft.length }) : t("{count} point · keep clicking corners", { count: draft.length })
                        : t("Double-click, press Enter or click the first point to finish · Esc cancels")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Pencil className="size-3.5 text-gold-300" /> {t("Drag vertices · click + to insert · select then Delete (or right-click) to remove")}
                  </span>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Empty-state prompt */}
          {!hasBoundary && mode === "view" ? (
            <div className="pointer-events-none absolute inset-0 z-[1040] grid place-items-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="pointer-events-auto max-w-sm rounded-2xl border border-white/50 bg-white/85 p-5 text-center shadow-lift backdrop-blur-xl">
                <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-navy-900 text-teal-300">
                  <PenLine className="size-5" />
                </div>
                <h3 className="text-[15px] font-semibold text-navy-900">{t("Outline your factory plot")}</h3>
                <p className="mt-1 text-sm text-muted">{t("Trace the site perimeter on the imagery, or start from a boundary sized to the registered {area} m².", { area: formatNumber(factory.siteAreaM2) })}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button size="sm" variant="primary" onClick={startDraw}>
                    <PenLine /> {t("Draw boundary")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={applySuggested}>
                    <Sparkles /> {t("Use suggested")}
                  </Button>
                </div>
              </motion.div>
            </div>
          ) : null}

          {/* Editor toolbar */}
          <div className="pointer-events-none absolute inset-x-3 bottom-7 z-[1100] flex justify-start md:justify-center">
            <div role="toolbar" aria-label={t("Boundary editor")} className="pointer-events-auto flex max-w-[calc(100%-3.25rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/50 bg-white/85 p-1.5 shadow-lift backdrop-blur-xl md:max-w-none">
              {mode === "draw" ? (
                <>
                  <ToolButton label={t("Undo last point (Backspace)")} onClick={undoPoint} disabled={draft.length === 0}>
                    <Undo2 /> <span>{t("Undo")}</span>
                  </ToolButton>
                  <ToolButton label={t("Finish boundary (Enter)")} onClick={finishDraw} disabled={draft.length < 3} tone="accent">
                    <Check /> <span>{t("Finish")}</span>
                  </ToolButton>
                  <ToolDivider />
                  <ToolButton label={t("Cancel drawing (Esc)")} onClick={cancelDraw}>
                    <X /> <span>{t("Cancel")}</span>
                  </ToolButton>
                </>
              ) : (
                <>
                  <ToolButton label={t("Draw a new boundary")} onClick={startDraw} disabled={running}>
                    <PenLine /> <span>{t("Draw")}</span>
                  </ToolButton>
                  <ToolButton label={mode === "edit" ? t("Finish editing") : t("Edit vertices")} onClick={mode === "edit" ? doneEdit : startEdit} disabled={!hasBoundary || running} active={mode === "edit"}>
                    {mode === "edit" ? <Check /> : <Pencil />} <span>{mode === "edit" ? t("Done") : t("Edit")}</span>
                  </ToolButton>
                  {mode === "edit" ? (
                    <ToolButton label={t("Delete selected vertex (Delete)")} onClick={() => selected !== null && deleteVertex(selected)} disabled={selected === null || points.length <= 3}>
                      <Trash2 /> <span className="hidden sm:inline">{t("Vertex")}</span>
                    </ToolButton>
                  ) : null}
                  <ToolButton label={t("Use a suggested boundary sized to the registered site area")} onClick={applySuggested} disabled={running}>
                    <Sparkles /> <span className="hidden sm:inline">{t("Suggested")}</span>
                  </ToolButton>
                  <ToolDivider />
                  <ToolButton label={t("Clear boundary")} onClick={clearBoundary} disabled={!hasBoundary || running} tone="danger">
                    <RotateCcw /> <span className="hidden sm:inline">{t("Clear")}</span>
                  </ToolButton>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <AnimatePresence>
            {showResults ? (
              <motion.div initial={{ opacity: 0, x: isRtl ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRtl ? 8 : -8 }} className="absolute bottom-24 start-3 z-[1100] hidden rounded-xl border border-white/50 bg-white/85 p-2.5 shadow-lift backdrop-blur-xl md:block">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-navy-600">
                  <Layers className="size-3" /> {t("AI overlays")}
                </div>
                <div className="space-y-1">
                  {OVERLAY_META.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setOverlays((v) => ({ ...v, [o.key]: !v[o.key] }))}
                      aria-pressed={overlays[o.key]}
                      className={cn("flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-start text-xs transition hover:bg-navy-900/5", !overlays[o.key] && "opacity-45")}
                    >
                      <span className="size-2.5 rounded-sm" style={{ backgroundColor: o.color, outline: o.dashed ? `1px dashed ${o.color}` : undefined, outlineOffset: 1 }} />
                      <span className="text-navy-800">{t(o.label)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ---------- Side panel ---------- */}
        <div className="space-y-4">
          <FactorySiteCard factory={factory} drawnAreaM2={hasBoundary ? polygonAreaM2(points) : null} />
          <AreaPanel metrics={metrics} drawing={mode === "draw"} selfIntersecting={selfIntersecting} />
          <AnalysisPanel
            hasBoundary={hasBoundary}
            running={running}
            step={step}
            analyzedAt={showResults ? analyzedAt : undefined}
            stale={stale && !analyzedAt}
            editing={mode === "draw"}
            onRun={runAnalysis}
            onStartDraw={startDraw}
            onSuggested={applySuggested}
          />
        </div>
      </div>

      <AnimatePresence>{showResults && analysis ? <AnalysisResults key={analyzedAt} analysis={analysis} factory={factory} overlays={overlays} onToggle={(k) => setOverlays((v) => ({ ...v, [k]: !v[k] }))} /> : null}</AnimatePresence>
    </div>
  );
}

// ---------------- Map chrome ----------------

function GlassIconButton({ label, children, onClick, active, disabled }: { label: string; children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-9 place-items-center rounded-xl border border-white/50 bg-white/85 text-navy-800 shadow-lift backdrop-blur-xl transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-40 [&_svg]:size-4",
        active && "bg-navy-900 text-white hover:bg-navy-800"
      )}
    >
      {children}
    </button>
  );
}

function ToolButton({ label, children, onClick, disabled, active, tone }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; tone?: "accent" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-navy-800 transition hover:bg-navy-900/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4",
        active && "bg-navy-900 text-white hover:bg-navy-800",
        tone === "accent" && "bg-teal-500 text-white hover:bg-teal-600",
        tone === "danger" && "text-red-600 hover:bg-red-50"
      )}
    >
      {children}
    </button>
  );
}

const ToolDivider = () => <span className="mx-0.5 h-6 w-px shrink-0 bg-navy-900/10" aria-hidden />;

function ImageryBadge({ provider, status }: { provider: ImageryProvider; status: TileStatus }) {
  const t = useT();
  const offline = provider === "esri" && status === "offline";
  const label = offline ? t("Offline site plan") : provider === "google" ? t("Google Maps · Satellite") : t("Esri World Imagery");
  return (
    <div className="flex h-9 items-center gap-2 rounded-xl border border-white/50 bg-white/85 px-3 text-xs font-semibold text-navy-800 shadow-lift backdrop-blur-xl" title={offline ? t("Satellite tiles unreachable — showing a stylised site plan. Boundary tools still work.") : t("Imagery source: {label}", { label })}>
      {offline ? (
        <WifiOff className="size-3.5 text-amber-600" />
      ) : (
        <span className="relative flex size-2">
          <span className={cn("absolute inline-flex size-full rounded-full opacity-70", status === "ok" ? "animate-ping bg-emerald-400" : "bg-amber-400")} />
          <span className={cn("relative inline-flex size-2 rounded-full", status === "ok" ? "bg-emerald-500" : "bg-amber-500")} />
        </span>
      )}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{offline ? t("Offline") : provider === "google" ? "Google" : "Esri"}</span>
    </div>
  );
}

function LocationPicker({ presets, value, onSelect }: { presets: LocationPreset[]; value: LocationPreset; onSelect: (p: LocationPreset) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const t = useT();
  const { locale } = useLocale();
  const labelOf = useCallback((p: LocationPreset) => (locale === "ar" ? (p.labelAr ?? t(p.label)) : p.label), [locale, t]);
  const subOf = useCallback((p: LocationPreset) => (p.kind === "jahez" ? t("{location} · reference site", { location: t(p.sub) }) : t(p.sub)), [t]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? presets.filter((p) => `${p.label} ${p.sub} ${labelOf(p)} ${subOf(p)}`.toLowerCase().includes(q)) : presets;
  }, [presets, query, labelOf, subOf]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (p: LocationPreset) => {
    onSelect(p);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrap} className="pointer-events-auto relative w-full max-w-[330px] sm:w-[330px]">
      <div className="flex h-11 items-center gap-2 rounded-2xl border border-white/50 bg-white/85 px-3 shadow-lift backdrop-blur-xl focus-within:ring-2 focus-within:ring-teal-300">
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          value={open ? query : ""}
          placeholder={open ? t("Search sites & industrial zones") : labelOf(value)}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={t("Search location presets")}
          role="combobox"
          aria-expanded={open}
          aria-controls="site-location-list"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-navy-900 placeholder:text-navy-800 focus:outline-none focus:placeholder:text-muted/70"
        />
        <button type="button" aria-label={t("Show locations")} onClick={() => setOpen((o) => !o)} className="rounded-md p-1 text-muted hover:bg-navy-900/5">
          <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.ul
            id="site-location-list"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute inset-x-0 top-full mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/60 bg-white/95 p-1.5 shadow-lift backdrop-blur-xl scrollbar-thin"
          >
            {results.length === 0 ? <li className="px-3 py-4 text-center text-sm text-muted">{t("No matching sites")}</li> : null}
            {results.map((p, i) => (
              <li key={p.id} role="option" aria-selected={p.id === value.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(p)}
                  className={cn("flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-start transition", i === active ? "bg-navy-900/[0.05]" : "")}
                >
                  <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", p.kind === "factory" ? "bg-teal-500 text-white" : p.kind === "jahez" ? "bg-navy-900 text-white" : "bg-gold-50 text-gold-600")}>
                    {p.kind === "zone" ? <MapPin className="size-3.5" /> : <FactoryIcon className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-navy-900">{labelOf(p)}</span>
                    <span className="block truncate text-xs text-muted">{subOf(p)}</span>
                  </span>
                  {p.id === value.id ? <Check className="mt-1 size-4 text-teal-600" /> : null}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ---------------- Side panel ----------------

function FactorySiteCard({ factory, drawnAreaM2 }: { factory: Factory; drawnAreaM2: number | null }) {
  const diff = drawnAreaM2 ? (drawnAreaM2 - factory.siteAreaM2) / factory.siteAreaM2 : null;
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-white">
          <FactoryIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-navy-900">{ar ? (factory.nameAr ?? factory.name) : factory.name}</div>
          <div className="truncate text-xs text-muted">
            {ar ? (factory.industryAr ?? t(factory.industry)) : factory.industry} · {t(factory.governorate)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-xs">
        <span className="text-muted">{t("Registered site area")}</span>
        <span className="font-semibold tabular-nums text-navy-900">{formatNumber(factory.siteAreaM2)} m²</span>
      </div>
      {diff !== null ? (
        <div className="mt-2 flex items-center justify-between px-1 text-xs">
          <span className="text-muted">{t("Drawn vs registered")}</span>
          <span className={cn("font-semibold tabular-nums", Math.abs(diff) <= 0.1 ? "text-emerald-600" : "text-amber-600")}>
            {diff >= 0 ? "+" : ""}
            {(diff * 100).toFixed(1)}%
          </span>
        </div>
      ) : null}
    </Card>
  );
}

function AreaPanel({ metrics, drawing, selfIntersecting }: { metrics: ReturnType<typeof polygonMetrics>; drawing: boolean; selfIntersecting: boolean }) {
  const valid = metrics.vertices >= 3;
  const t = useT();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <Ruler className="size-4 text-teal-600" /> {t("Live measurements")}
        </div>
        {drawing ? (
          <Badge tone="teal">
            <span className="size-1.5 animate-pulse rounded-full bg-teal-500" /> {t("Drawing")}
          </Badge>
        ) : valid ? (
          <Badge tone="green">
            <Check /> {t("Saved")}
          </Badge>
        ) : (
          <Badge tone="outline">{t("No boundary")}</Badge>
        )}
      </div>
      <div className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Site area")}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight text-navy-900 tabular-nums">{valid ? formatNumber(metrics.areaM2) : "—"}</span>
          <span className="text-sm font-medium text-muted">m²</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Metric label={t("Square feet")} value={valid ? formatNumber(metrics.areaFt2) : "—"} unit="ft²" />
          <Metric label={t("Feddan")} value={valid ? formatNumber(metrics.areaFeddan, 2) : "—"} unit="fd" />
          <Metric label={t("Perimeter")} value={metrics.vertices >= 2 ? formatDistance(metrics.perimeterM) : "—"} />
          <Metric label={t("Vertices")} value={String(metrics.vertices)} />
        </div>
        {selfIntersecting ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {t("Edges cross each other — area may be inaccurate. Drag vertices to untangle.")}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas/60 px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-navy-900">
        {value}
        {unit && value !== "—" ? <span className="ms-1 text-xs font-medium text-muted">{unit}</span> : null}
      </div>
    </div>
  );
}

function AnalysisPanel({
  hasBoundary, running, step, analyzedAt, stale, editing, onRun, onStartDraw, onSuggested,
}: {
  hasBoundary: boolean; running: boolean; step: number; analyzedAt?: number; stale: boolean; editing: boolean;
  onRun: () => void; onStartDraw: () => void; onSuggested: () => void;
}) {
  const t = useT();
  const { isRtl } = useLocale();
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal-50/80 to-transparent" aria-hidden />
      <div className="relative p-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-navy-900 text-teal-300">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-navy-900">{t("AI site analysis")}</div>
            <div className="text-xs text-muted">{t("Solar · expansion · yard · storage")}</div>
          </div>
        </div>

        <div className="mt-4">
          {running ? (
            <div aria-live="polite">
              <Progress value={((step + 1) / ANALYSIS_STEPS.length) * 100} className="h-1.5" />
              <ol className="mt-3 space-y-1.5">
                {ANALYSIS_STEPS.map((s, i) => (
                  <motion.li key={s} initial={{ opacity: 0, x: isRtl ? 4 : -4 }} animate={{ opacity: i <= step ? 1 : 0.4, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-2 text-xs">
                    {i < step ? <CheckCircle2 className="size-3.5 text-teal-600" /> : i === step ? <Loader2 className="size-3.5 animate-spin text-teal-600" /> : <span className="size-3.5 rounded-full border border-line" />}
                    <span className={cn(i === step ? "font-medium text-navy-900" : "text-navy-700")}>{t(s)}</span>
                  </motion.li>
                ))}
              </ol>
            </div>
          ) : !hasBoundary ? (
            <div className="rounded-xl border border-dashed border-line bg-canvas/60 p-4 text-center">
              <p className="text-sm text-navy-800">{editing ? t("Close the boundary to enable analysis.") : t("Outline the plot to unlock the analysis.")}</p>
              {!editing ? (
                <div className="mt-3 flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={onStartDraw}>
                    <PenLine /> {t("Draw")}
                  </Button>
                  <Button size="sm" variant="subtle" onClick={onSuggested}>
                    <Sparkles /> {t("Suggested")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {analyzedAt ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {t("Analysis ready · {date}", { date: new Date(analyzedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) })}
                  </span>
                </div>
              ) : stale ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {t("Boundary changed since the last analysis — re-run to refresh results.")}
                </div>
              ) : (
                <p className="text-xs text-muted">{t("Runs a ~3 second simulated AI pass over the drawn boundary and imagery.")}</p>
              )}
              <Button variant={analyzedAt ? "outline" : "accent"} className="w-full" onClick={onRun} disabled={editing}>
                {analyzedAt ? <RotateCcw /> : <Sparkles />} {analyzedAt ? t("Re-run analysis") : t("Generate site analysis")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------- Results ----------------

const OVERLAY_META: { key: keyof OverlayToggles; label: string; color: string; dashed?: boolean }[] = [
  { key: "solar", label: "Solar roof zone", color: ZONE_COLORS.solar },
  { key: "expansion", label: "Expansion zone", color: ZONE_COLORS.expansion, dashed: true },
  { key: "yard", label: "Logistics yard", color: ZONE_COLORS.yard },
  { key: "storage", label: "Storage / racking", color: ZONE_COLORS.storage },
];

function OverlaySwitch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  const t = useT();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={on ? t("Hide {label} on map", { label }) : t("Show {label} on map", { label })}
      title={on ? t("Hide on map") : t("Show on map")}
      onClick={onToggle}
      className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", on ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-navy-700 hover:bg-canvas")}
    >
      {on ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />} {on ? t("On map") : t("Hidden")}
    </button>
  );
}

function Illustrative() {
  const t = useT();
  return <p className="mt-3 border-t border-line pt-2.5 text-[11px] italic text-muted">{t("Illustrative estimate — requires on-site survey.")}</p>;
}

function ResultCard({ color, icon, title, subtitle, overlayKey, overlays, onToggle, children, className }: {
  color: string; icon: React.ReactNode; title: string; subtitle: string; overlayKey: keyof OverlayToggles; overlays: OverlayToggles;
  onToggle: (k: keyof OverlayToggles) => void; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={cn("flex flex-col p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5" style={{ backgroundColor: `${color}1A`, color }}>
            {icon}
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-navy-900">{title}</h3>
            <p className="text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        <OverlaySwitch on={overlays[overlayKey]} onToggle={() => onToggle(overlayKey)} label={title} />
      </div>
      <div className="mt-4 flex-1">{children}</div>
      <Illustrative />
    </Card>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas/50 px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums text-navy-900" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {hint ? <div className="text-[11px] text-muted">{hint}</div> : null}
    </div>
  );
}

function AnalysisResults({ analysis, factory, overlays, onToggle }: { analysis: SiteAnalysis; factory: Factory; overlays: OverlayToggles; onToggle: (k: keyof OverlayToggles) => void }) {
  const { solar, expansion, yard, storage } = analysis;
  const t = useT();
  const { locale } = useLocale();
  const factoryName = locale === "ar" ? (factory.nameAr ?? factory.name) : factory.name;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.35 }} aria-label={t("Site analysis results")}>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">{t("AI site analysis")}</div>
          <h2 className="text-lg font-semibold tracking-tight text-navy-900">
            {t("Opportunities for {name} · {area} m² plot", { name: factoryName, area: formatNumber(analysis.siteAreaM2) })}
          </h2>
        </div>
        <DemoDisclaimer className="md:max-w-md">{t("Illustrative estimates from imagery and the drawn boundary only — every figure requires an on-site survey before investment decisions.")}</DemoDisclaimer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Solar */}
        <ResultCard className="lg:col-span-2" color={ZONE_COLORS.solar} icon={<Sun />} title={t("Rooftop solar opportunity")} subtitle={t("≈{pct}% of the site is usable roof", { pct: Math.round(solar.roofShare * 100) })} overlayKey="solar" overlays={overlays} onToggle={onToggle}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="grid grid-cols-2 gap-2">
              <Kpi label={t("Usable roof area")} value={`${formatNumber(solar.roofM2)} m²`} />
              <Kpi label={t("System size")} value={`${formatNumber(solar.kWp)} kWp`} hint={t("0.18 kWp per m²")} accent={ZONE_COLORS.solarRow} />
              <Kpi label={t("Annual generation")} value={`${formatNumber(solar.annualMWh)} MWh`} hint={t("≈1,750 kWh per kWp")} />
              <Kpi label={t("CO₂ avoided")} value={t("{value} t/yr", { value: formatNumber(solar.co2Tonnes) })} hint={t("≈{count} homes' use", { count: formatNumber(solar.homesEquivalent) })} />
              <Kpi label={t("Energy savings")} value={t("{value}/yr", { value: formatEgp(solar.savingsEgp) })} hint={t("at EGP 2.1 / kWh")} accent="#0A8379" />
              <Kpi label={t("Indicative payback")} value={t("{value} yrs", { value: solar.paybackYears.toFixed(1) })} hint={t("Capex ≈ {value}", { value: formatEgp(solar.capexEgp) })} />
            </div>
            <div className="rounded-xl border border-line p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-navy-800">{t("Monthly generation (MWh)")}</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                  <Zap className="size-3 text-gold-500" /> {t("Peak {month}", { month: t(solar.monthly.reduce((a, b) => (b.mwh > a.mwh ? b : a)).month) })}
                </span>
              </div>
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={solar.monthly} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid vertical={false} stroke="#E5E8EE" />
                    <XAxis dataKey="month" tickFormatter={(m: string) => t(m)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} width={44} />
                    <Tooltip
                      cursor={{ fill: "rgba(201,162,75,0.08)" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #E5E8EE", boxShadow: "0 16px 40px -12px rgba(11,31,58,0.18)", fontSize: 12 }}
                      labelFormatter={(m) => t(String(m))}
                      formatter={(v) => [`${formatNumber(Number(v), 1)} MWh`, t("Generation")]}
                    />
                    <Bar dataKey="mwh" fill={ZONE_COLORS.solar} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ResultCard>

        {/* Expansion */}
        <ResultCard color={ZONE_COLORS.expansion} icon={<Expand />} title={t("Expansion potential")} subtitle={t("Buildable area after building, yard & setbacks")} overlayKey="expansion" overlays={overlays} onToggle={onToggle}>
          <div className="grid grid-cols-2 gap-2">
            <Kpi label={t("Buildable remaining")} value={`${formatNumber(expansion.buildableM2)} m²`} accent="#0A8379" hint={t("{pct}% of plot", { pct: (expansion.shareOfSite * 100).toFixed(0) })} />
            <Kpi label={t("Existing footprint")} value={`${formatNumber(expansion.builtM2)} m²`} hint={t("Setbacks {area} m²", { area: formatNumber(expansion.setbackM2) })} />
          </div>
          <SplitBar
            parts={[
              { label: t("Building||structure"), value: expansion.builtM2, color: ZONE_COLORS.solar },
              { label: t("Yard & circulation"), value: yard.yardM2, color: ZONE_COLORS.yard },
              { label: t("Setbacks"), value: expansion.setbackM2, color: "#94A3B8" },
              { label: t("Expandable"), value: expansion.buildableM2, color: ZONE_COLORS.expansion },
            ]}
          />
          <p className="mt-3 text-sm text-navy-800">
            <span className="font-medium">{t("Suggested use:")}</span> {t(expansion.suggestedUse)}.
          </p>
        </ResultCard>

        {/* Yard */}
        <ResultCard color={ZONE_COLORS.yard} icon={<Truck />} title={t("Yard optimisation")} subtitle={t("Truck turning & loading for a {vehicle}", { vehicle: t(yard.vehicle) })} overlayKey="yard" overlays={overlays} onToggle={onToggle}>
          <div className="grid grid-cols-3 gap-2">
            <Kpi label={t("Yard area")} value={`${formatNumber(yard.yardM2)} m²`} />
            <Kpi label={t("Loading bays")} value={String(yard.loadingBays)} hint={t("at 4.5 m spacing")} accent="#2563EB" />
            <Kpi label={t("Turning space")} value={`${formatNumber(yard.turningDiameterM)} m`} hint={t("needs {value} m", { value: yard.requiredDiameterM })} />
          </div>
          <div className={cn("mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs", yard.turningOk ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-amber-200 bg-amber-50 text-amber-700")}>
            {yard.turningOk ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />}
            {yard.turningOk ? t("A full turning circle fits inside the yard — no reversing onto the public road.") : t("Turning circle is tight — consider a drive-through loop or a reversing bay with a banksman.")}
          </div>
          <p className="mt-3 text-sm text-navy-800">{t(yard.note)}</p>
        </ResultCard>

        {/* Storage */}
        <ResultCard className="lg:col-span-2" color={ZONE_COLORS.storage} icon={<Warehouse />} title={t("Storage & logistics improvements")} subtitle={t("Racking, warehouse layout and material flow")} overlayKey="storage" overlays={overlays} onToggle={onToggle}>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="grid grid-cols-3 gap-2">
              <Kpi label={t("Warehouse zone")} value={`${formatNumber(storage.warehouseM2)} m²`} />
              <Kpi label={t("Positions today")} value={formatNumber(storage.positionsNow)} hint={t(storage.unit)} />
              <Kpi label={t("Optimised")} value={formatNumber(storage.positionsOptimised)} hint={t("+{pct}% capacity", { pct: Math.round(storage.uplift * 100) })} accent={ZONE_COLORS.storage} />
            </div>
            <ul className="space-y-2 text-sm text-navy-800">
              <li className="flex gap-2">
                <Leaf className="mt-0.5 size-4 shrink-0 text-teal-600" /> {t(storage.note)}
              </li>
              <li className="flex gap-2">
                <Banknote className="mt-0.5 size-4 shrink-0 text-teal-600" /> {t("Defers new warehouse construction by an estimated 2–3 years at current growth.")}
              </li>
              <li className="flex gap-2">
                <Truck className="mt-0.5 size-4 shrink-0 text-teal-600" /> {t("Place dispatch staging next to the {count} loading bays to shorten pick-to-truck travel.", { count: yard.loadingBays })}
              </li>
            </ul>
          </div>
        </ResultCard>
      </div>
    </motion.section>
  );
}

function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="mt-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-navy-900/5">
        {parts.map((p) => (
          <motion.div key={p.label} initial={{ width: 0 }} animate={{ width: `${(p.value / total) * 100}%` }} transition={{ duration: 0.6 }} style={{ backgroundColor: p.color }} title={`${p.label}: ${formatNumber(p.value)} m²`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <span className="size-2 rounded-sm" style={{ backgroundColor: p.color }} /> {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
