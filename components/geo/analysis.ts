// Deterministic, illustrative site-analysis model for Satellite Factory Intelligence.
// Every figure is a planning-grade estimate for the demo and must be labelled as such in the UI.
import type { Factory } from "@/lib/types";
import { computeSiteZones, polygonAreaM2, polygonPerimeterM, type LatLng, type SiteZones } from "@/lib/geo";

/** Share of annual PV yield per month for a Lower-Egypt latitude (sums to 1). */
const MONTHLY_SHARE = [0.062, 0.068, 0.085, 0.093, 0.101, 0.104, 0.103, 0.099, 0.088, 0.078, 0.063, 0.056];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const KWP_PER_M2 = 0.18;
const MWH_PER_KWP = 1.75;
const GRID_T_CO2_PER_MWH = 0.47; // illustrative Egyptian grid emission factor
const TARIFF_EGP_PER_KWH = 2.1; // illustrative industrial tariff
const CAPEX_EGP_PER_KWP = 28_000; // illustrative turnkey rooftop PV cost

interface FactoryProfile {
  roofShare: number; // 0.45–0.55
  storageShareOfBuilding: number;
  yardShare: number;
  heavyVehicle: string;
  storageUnit: string;
  storageNote: string;
  expansionUse: string;
  yardNote: string;
}

const PROFILES: Record<Factory["id"], FactoryProfile> = {
  "al-noor": {
    roofShare: 0.52,
    storageShareOfBuilding: 0.16,
    yardShare: 0.2,
    heavyVehicle: "12 m rigid truck",
    storageUnit: "fabric-roll & carton positions",
    storageNote: "Cantilever racking for fabric rolls and two-level carton shelving next to the cutting room would free floor space now used for staging.",
    expansionUse: "Finishing & packing hall or a raw-yarn store",
    yardNote: "Separate inbound yarn deliveries from outbound garment dispatch to stop morning queueing at the single gate.",
  },
  delta: {
    roofShare: 0.47,
    storageShareOfBuilding: 0.21,
    yardShare: 0.24,
    heavyVehicle: "16.5 m articulated truck",
    storageUnit: "pallet positions",
    storageNote: "Very-narrow-aisle pallet racking in the finished-goods store and a supermarket for line-side kanban would cut forklift travel.",
    expansionUse: "Second CNC machining bay or a heat-treatment annex",
    yardNote: "A one-way loop with dedicated dock doors for castings inbound and OEM dispatch keeps articulated trucks out of the forklift zone.",
  },
};

export interface SiteAnalysis {
  siteAreaM2: number;
  perimeterM: number;
  solar: {
    roofM2: number;
    roofShare: number;
    kWp: number;
    annualMWh: number;
    co2Tonnes: number;
    savingsEgp: number;
    capexEgp: number;
    paybackYears: number;
    homesEquivalent: number;
    monthly: { month: string; mwh: number }[];
  };
  expansion: {
    buildableM2: number;
    shareOfSite: number;
    builtM2: number;
    setbackM2: number;
    suggestedUse: string;
  };
  yard: {
    yardM2: number;
    loadingBays: number;
    turningDiameterM: number;
    requiredDiameterM: number;
    turningOk: boolean;
    vehicle: string;
    note: string;
  };
  storage: {
    warehouseM2: number;
    positionsNow: number;
    positionsOptimised: number;
    uplift: number;
    unit: string;
    note: string;
  };
  zones: SiteZones | null;
}

export function analyzeSite(points: LatLng[], factory: Factory): SiteAnalysis {
  const profile = PROFILES[factory.id];
  const siteAreaM2 = polygonAreaM2(points);
  const perimeterM = polygonPerimeterM(points);
  const zones = computeSiteZones(points);

  // Solar
  const roofM2 = siteAreaM2 * profile.roofShare;
  const kWp = roofM2 * KWP_PER_M2;
  const annualMWh = kWp * MWH_PER_KWP;
  const savingsEgp = annualMWh * 1000 * TARIFF_EGP_PER_KWH;
  const capexEgp = kWp * CAPEX_EGP_PER_KWP;

  // Expansion: what remains after the building, yard / circulation and a 3 m perimeter setback.
  const setbackM2 = perimeterM * 3;
  const yardM2 = siteAreaM2 * profile.yardShare;
  const buildableM2 = Math.max(0, siteAreaM2 - roofM2 - yardM2 - setbackM2);

  // Yard
  const requiredDiameterM = factory.id === "delta" ? 25 : 21;
  const turningDiameterM = zones ? Math.min(zones.yardDepthM, zones.yardLengthM) : 0;
  const loadingBays = zones?.loadingBays.length ?? 0;

  // Storage
  const warehouseM2 = roofM2 * profile.storageShareOfBuilding;
  const positionsNow = Math.round(warehouseM2 * 0.55);
  const uplift = factory.id === "delta" ? 0.42 : 0.35;
  const positionsOptimised = Math.round(positionsNow * (1 + uplift));

  return {
    siteAreaM2,
    perimeterM,
    solar: {
      roofM2,
      roofShare: profile.roofShare,
      kWp,
      annualMWh,
      co2Tonnes: annualMWh * GRID_T_CO2_PER_MWH,
      savingsEgp,
      capexEgp,
      paybackYears: savingsEgp > 0 ? capexEgp / savingsEgp : 0,
      homesEquivalent: Math.round((annualMWh * 1000) / 2_100),
      monthly: MONTHLY_SHARE.map((s, i) => ({ month: MONTHS[i], mwh: Math.round(annualMWh * s * 10) / 10 })),
    },
    expansion: {
      buildableM2,
      shareOfSite: siteAreaM2 > 0 ? buildableM2 / siteAreaM2 : 0,
      builtM2: roofM2,
      setbackM2,
      suggestedUse: profile.expansionUse,
    },
    yard: {
      yardM2,
      loadingBays,
      turningDiameterM,
      requiredDiameterM,
      turningOk: turningDiameterM >= requiredDiameterM,
      vehicle: profile.heavyVehicle,
      note: profile.yardNote,
    },
    storage: {
      warehouseM2,
      positionsNow,
      positionsOptimised,
      uplift,
      unit: profile.storageUnit,
      note: profile.storageNote,
    },
    zones,
  };
}

export const ANALYSIS_STEPS = [
  "Fetching latest satellite tile mosaic",
  "Segmenting rooftops, yards & access roads",
  "Estimating roof orientation & shading",
  "Modelling solar yield for local irradiance",
  "Checking truck turning envelopes & docks",
  "Composing site recommendations",
] as const;

export const formatEgp = (n: number) => {
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `EGP ${Math.round(n / 1_000).toLocaleString("en-US")}K`;
  return `EGP ${Math.round(n).toLocaleString("en-US")}`;
};
