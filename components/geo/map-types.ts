import type { LatLng, SiteZones } from "@/lib/geo";

export type EditorMode = "view" | "draw" | "edit";
export type ImageryProvider = "esri" | "google";
export type TileStatus = "loading" | "ok" | "offline";

export interface OverlayToggles {
  solar: boolean;
  expansion: boolean;
  yard: boolean;
  storage: boolean;
}

/** Contract shared by the Leaflet and Google map implementations. */
export interface SiteMapProps {
  /** Camera target; `flyKey` changes trigger an animated fly-to. */
  center: LatLng;
  zoom: number;
  flyKey: number;
  /** Increment to fit the camera to `points`. */
  fitKey: number;
  points: LatLng[];
  mode: EditorMode;
  selectedVertex: number | null;
  zones: SiteZones | null;
  overlays: OverlayToggles;
  showLabels: boolean;
  /** Anchor + scale for the offline stylised site plan. */
  planCenter: LatLng;
  planAreaM2: number;
  onAddPoint: (p: LatLng) => void;
  onFinish: () => void;
  onVertexDrag: (index: number, p: LatLng) => void;
  onVertexDragEnd: (index: number, p: LatLng) => void;
  onVertexSelect: (index: number | null) => void;
  onInsertVertex: (afterIndex: number, p: LatLng) => void;
  onDeleteVertex: (index: number) => void;
  onTileStatus?: (status: TileStatus) => void;
  onProviderError?: () => void;
}

export const ZONE_COLORS = {
  boundary: "#2DBFB0",
  solar: "#C9A24B",
  solarRow: "#A9853A",
  expansion: "#0FA396",
  yard: "#3B82F6",
  storage: "#8B5CF6",
} as const;

/** Pixel distance below which a click is treated as a duplicate of the previous vertex (double-click guard). */
export const DUPLICATE_CLICK_PX = 8;
