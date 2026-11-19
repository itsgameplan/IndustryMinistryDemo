// JAHEZ national observatory + public registry — SAMPLE / SIMULATED DATA ONLY.
// Every figure, licence and factory below (except the two live demo factories) is fictional and
// generated deterministically. Nothing here is an official Ministry of Industry statistic or record.

import { FACTORIES } from "@/lib/data/factories";
import type { DemoFactoryId, TierLevel } from "@/lib/types";

// ---------------------------------------------------------------------------
// Deterministic pseudo-randomness
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit string hash. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG seeded from a string — same seed, same sequence, on server and client. */
export function seededRandom(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Split an integer total across weights so parts are integers that sum exactly to total. */
function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / sum) * total);
  const floors = raw.map(Math.floor);
  let remaining = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors;
}

// ---------------------------------------------------------------------------
// Sectors & governorates
// ---------------------------------------------------------------------------

export type SectorId = "textiles" | "food" | "engineering" | "chemicals" | "building" | "pharma" | "furniture";

export interface Sector {
  id: SectorId;
  name: string;
  nameAr: string;
  /** Illustrative average headcount used for jobs impact. */
  avgEmployees: number;
}

export const SECTORS: Sector[] = [
  { id: "textiles", name: "Textiles & garments", nameAr: "المنسوجات", avgEmployees: 140 },
  { id: "food", name: "Food & beverage", nameAr: "الصناعات الغذائية", avgEmployees: 95 },
  { id: "engineering", name: "Engineering & auto", nameAr: "الصناعات الهندسية", avgEmployees: 160 },
  { id: "chemicals", name: "Chemicals & plastics", nameAr: "الكيماويات", avgEmployees: 120 },
  { id: "building", name: "Building materials", nameAr: "مواد البناء", avgEmployees: 110 },
  { id: "pharma", name: "Pharmaceuticals", nameAr: "الأدوية", avgEmployees: 210 },
  { id: "furniture", name: "Furniture & wood", nameAr: "الأثاث", avgEmployees: 45 },
];

export const sectorById = (id: SectorId) => SECTORS.find((s) => s.id === id) ?? SECTORS[0];

export type Region = "Greater Cairo" | "Delta" | "Canal & Sinai" | "Alexandria & North Coast" | "Upper Egypt";

export interface Governorate {
  id: string;
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
  region: Region;
  /** Factories onboarded on Jahez (simulated). */
  factories: number;
  /** Digital maturity bias: positive shifts the tier mix upward. */
  maturity: number;
  /** Sector concentration multipliers relative to the national mix. */
  specialisms: Partial<Record<SectorId, number>>;
}

export const GOVERNORATES: Governorate[] = [
  { id: "cairo", name: "Cairo", nameAr: "القاهرة", lat: 30.04, lng: 31.24, region: "Greater Cairo", factories: 1180, maturity: 0.35, specialisms: { pharma: 1.8, food: 1.1, engineering: 1.2 } },
  { id: "giza", name: "Giza", nameAr: "الجيزة", lat: 29.97, lng: 30.95, region: "Greater Cairo", factories: 1420, maturity: 0.05, specialisms: { textiles: 2.1, food: 1.1, pharma: 1.3 } },
  { id: "qalyubia", name: "Qalyubia", nameAr: "القليوبية", lat: 30.3, lng: 31.32, region: "Greater Cairo", factories: 980, maturity: 0.1, specialisms: { chemicals: 1.6, engineering: 1.3, food: 1.1 } },
  { id: "alexandria", name: "Alexandria", nameAr: "الإسكندرية", lat: 31.2, lng: 29.92, region: "Alexandria & North Coast", factories: 1310, maturity: 0.4, specialisms: { chemicals: 1.9, pharma: 1.5, food: 1.2 } },
  { id: "beheira", name: "Beheira", nameAr: "البحيرة", lat: 30.85, lng: 30.35, region: "Alexandria & North Coast", factories: 470, maturity: -0.15, specialisms: { food: 1.9, building: 1.2 } },
  { id: "sharqia", name: "Sharqia", nameAr: "الشرقية", lat: 30.45, lng: 31.72, region: "Delta", factories: 1260, maturity: 0.3, specialisms: { engineering: 2.0, building: 1.2, food: 1.1 } },
  { id: "dakahlia", name: "Dakahlia", nameAr: "الدقهلية", lat: 31.04, lng: 31.38, region: "Delta", factories: 540, maturity: -0.1, specialisms: { food: 1.6, textiles: 1.2 } },
  { id: "gharbia", name: "Gharbia", nameAr: "الغربية", lat: 30.86, lng: 31.03, region: "Delta", factories: 760, maturity: -0.2, specialisms: { textiles: 2.3, food: 1.1 } },
  { id: "monufia", name: "Monufia", nameAr: "المنوفية", lat: 30.48, lng: 30.75, region: "Delta", factories: 610, maturity: 0.15, specialisms: { engineering: 1.5, food: 1.4, chemicals: 1.2 } },
  { id: "damietta", name: "Damietta", nameAr: "دمياط", lat: 31.42, lng: 31.81, region: "Delta", factories: 390, maturity: -0.05, specialisms: { furniture: 3.6, food: 1.1 } },
  { id: "port-said", name: "Port Said", nameAr: "بورسعيد", lat: 31.26, lng: 32.3, region: "Canal & Sinai", factories: 280, maturity: 0.25, specialisms: { textiles: 1.4, food: 1.2 } },
  { id: "ismailia", name: "Ismailia", nameAr: "الإسماعيلية", lat: 30.6, lng: 32.27, region: "Canal & Sinai", factories: 330, maturity: 0.2, specialisms: { chemicals: 1.5, food: 1.3 } },
  { id: "suez", name: "Suez", nameAr: "السويس", lat: 29.85, lng: 32.45, region: "Canal & Sinai", factories: 420, maturity: 0.3, specialisms: { chemicals: 2.0, building: 2.0, engineering: 1.2 } },
  { id: "beni-suef", name: "Beni Suef", nameAr: "بني سويف", lat: 29.07, lng: 31.1, region: "Upper Egypt", factories: 300, maturity: -0.2, specialisms: { building: 2.6, textiles: 1.1 } },
  { id: "minya", name: "Minya", nameAr: "المنيا", lat: 28.1, lng: 30.75, region: "Upper Egypt", factories: 260, maturity: -0.35, specialisms: { building: 2.0, food: 1.5 } },
  { id: "assiut", name: "Assiut", nameAr: "أسيوط", lat: 27.18, lng: 31.18, region: "Upper Egypt", factories: 240, maturity: -0.3, specialisms: { building: 1.6, food: 1.4, chemicals: 1.2 } },
  { id: "sohag", name: "Sohag", nameAr: "سوهاج", lat: 26.55, lng: 31.7, region: "Upper Egypt", factories: 190, maturity: -0.45, specialisms: { food: 1.6, textiles: 1.3 } },
  { id: "qena", name: "Qena", nameAr: "قنا", lat: 26.16, lng: 32.72, region: "Upper Egypt", factories: 160, maturity: -0.4, specialisms: { food: 2.0, building: 1.3 } },
  { id: "aswan", name: "Aswan", nameAr: "أسوان", lat: 24.09, lng: 32.9, region: "Upper Egypt", factories: 130, maturity: -0.35, specialisms: { building: 1.8, food: 1.3 } },
];

export const governorateById = (id: string) => GOVERNORATES.find((g) => g.id === id);

// ---------------------------------------------------------------------------
// Governorate × sector × tier cube (simulated)
// ---------------------------------------------------------------------------

export type TierCounts = [number, number, number, number, number];

export interface CubeCell {
  governorate: string;
  sector: SectorId;
  tiers: TierCounts;
}

const NATIONAL_SECTOR_MIX: Record<SectorId, number> = { textiles: 0.19, food: 0.22, engineering: 0.17, chemicals: 0.12, building: 0.13, pharma: 0.06, furniture: 0.11 };

const SECTOR_TIER_BASE: Record<SectorId, TierCounts> = {
  textiles: [38, 30, 20, 9, 3],
  food: [30, 30, 24, 12, 4],
  engineering: [21, 26, 28, 18, 7],
  chemicals: [20, 24, 30, 19, 7],
  building: [34, 32, 22, 10, 2],
  pharma: [10, 18, 32, 28, 12],
  furniture: [42, 32, 18, 7, 1],
};

/** Specific simulated hotspots referenced by the AI insights. */
const CELL_SHIFT: Record<string, number> = {
  "giza:textiles": -0.8, // Tier 1 visibility gap in Giza textile clusters
  "gharbia:textiles": -0.45,
  "damietta:furniture": -0.35,
  "sharqia:engineering": 0.35,
  "alexandria:pharma": 0.3,
  "suez:chemicals": 0.25,
};

function buildCube(): CubeCell[] {
  const cells: CubeCell[] = [];
  for (const g of GOVERNORATES) {
    const rand = seededRandom(`jahez-gov-${g.id}`);
    const mix = SECTORS.map((s) => NATIONAL_SECTOR_MIX[s.id] * (g.specialisms[s.id] ?? 1) * (0.85 + rand() * 0.3));
    const perSector = apportion(g.factories, mix);
    SECTORS.forEach((s, si) => {
      const shift = g.maturity + (CELL_SHIFT[`${g.id}:${s.id}`] ?? 0);
      const weights = SECTOR_TIER_BASE[s.id].map((w, t) => w * Math.exp(shift * (t - 1.5) * 0.75) * (0.9 + rand() * 0.2));
      const tiers = apportion(perSector[si], weights) as TierCounts;
      cells.push({ governorate: g.id, sector: s.id, tiers });
    });
  }
  return cells;
}

/** Baseline simulated cube, excluding the two live demo factories. */
export const BASE_CUBE: CubeCell[] = buildCube();

/** Where the live demo factories sit in the cube. */
export const LIVE_FACTORY_CELL: Record<DemoFactoryId, { governorate: string; sector: SectorId }> = {
  "al-noor": { governorate: "giza", sector: "textiles" },
  delta: { governorate: "sharqia", sector: "engineering" },
};

/** Add the live demo factories (at their current tier) into the cube. */
export function withLiveFactories(cube: CubeCell[], live: Record<DemoFactoryId, TierLevel>): CubeCell[] {
  return cube.map((c) => {
    let tiers = c.tiers;
    for (const id of Object.keys(live) as DemoFactoryId[]) {
      const pos = LIVE_FACTORY_CELL[id];
      if (pos.governorate === c.governorate && pos.sector === c.sector) {
        tiers = [...tiers] as TierCounts;
        tiers[live[id]] += 1;
      }
    }
    return tiers === c.tiers ? c : { ...c, tiers };
  });
}

export interface NationalFilter {
  sector: SectorId | "all";
  governorate: string | "all";
}

export const filterCube = (cube: CubeCell[], f: NationalFilter) =>
  cube.filter((c) => (f.sector === "all" || c.sector === f.sector) && (f.governorate === "all" || c.governorate === f.governorate));

/** Illustrative mean maturity score (0-100) for factories sitting at each tier. */
export const TIER_MEAN_SCORE: TierCounts = [7, 25, 47, 70, 91];

export const sumTiers = (cells: CubeCell[]): TierCounts =>
  cells.reduce<TierCounts>((acc, c) => acc.map((v, i) => v + c.tiers[i]) as TierCounts, [0, 0, 0, 0, 0]);

export interface Aggregate {
  total: number;
  tiers: TierCounts;
  avgScore: number;
  tier3PlusPct: number;
}

export function aggregateTiers(tiers: TierCounts): Aggregate {
  const total = tiers.reduce((a, b) => a + b, 0);
  const avgScore = total ? tiers.reduce((a, n, i) => a + n * TIER_MEAN_SCORE[i], 0) / total : 0;
  const tier3PlusPct = total ? ((tiers[3] + tiers[4]) / total) * 100 : 0;
  return { total, tiers, avgScore, tier3PlusPct };
}

export const aggregate = (cells: CubeCell[]) => aggregateTiers(sumTiers(cells));

export function bySector(cells: CubeCell[]) {
  return SECTORS.map((s) => ({ sector: s, ...aggregate(cells.filter((c) => c.sector === s.id)) }));
}

export function byGovernorate(cells: CubeCell[]) {
  return GOVERNORATES.map((g) => ({ governorate: g, ...aggregate(cells.filter((c) => c.governorate === g.id)) }));
}

// ---------------------------------------------------------------------------
// Time series (18 months, simulated)
// ---------------------------------------------------------------------------

export const MONTHS = ["Jun 25", "Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26", "Jul 26", "Aug 26", "Sep 26", "Oct 26", "Nov 26"];

/** Cumulative share of today's onboarded base reached by each month. */
const ONBOARDING_CURVE = [0.04, 0.06, 0.09, 0.13, 0.18, 0.24, 0.31, 0.39, 0.47, 0.55, 0.62, 0.69, 0.75, 0.81, 0.86, 0.91, 0.96, 1];
/** Cumulative share of today's Tier 3+ base reached by each month (lags onboarding). */
const ADVANCED_CURVE = [0.03, 0.04, 0.05, 0.07, 0.1, 0.13, 0.17, 0.22, 0.28, 0.35, 0.42, 0.5, 0.58, 0.66, 0.75, 0.84, 0.92, 1];
/** National AI solutions deployed per month. */
const SOLUTIONS_PER_MONTH = [38, 57, 81, 108, 146, 188, 236, 292, 361, 433, 512, 594, 681, 772, 858, 947, 1036, 1128];

export const NATIONAL_TOTAL = aggregate(BASE_CUBE).total;

export interface TrendPoint {
  month: string;
  onboarded: number;
  advanced: number;
  solutions: number;
}

/** Scale the national curves to a filtered slice of the cube. */
export function trendSeries(agg: Aggregate): TrendPoint[] {
  const share = agg.total / NATIONAL_TOTAL;
  const advanced = agg.tiers[3] + agg.tiers[4];
  return MONTHS.map((month, i) => ({
    month,
    onboarded: Math.round(agg.total * ONBOARDING_CURVE[i]),
    advanced: Math.round(advanced * ADVANCED_CURVE[i]),
    solutions: Math.round(SOLUTIONS_PER_MONTH[i] * share),
  }));
}

// ---------------------------------------------------------------------------
// Export readiness & impact (illustrative)
// ---------------------------------------------------------------------------

export function exportPipeline(tiers: TierCounts) {
  const [, , , t3, t4] = tiers;
  return [
    { id: "eligible", label: "Tier 3+ connected factories", value: t3 + t4 },
    { id: "traceability", label: "Traceability in place", value: Math.round(t3 * 0.46 + t4 * 0.92) },
    { id: "docs", label: "Export documentation ready", value: Math.round(t3 * 0.24 + t4 * 0.78) },
    { id: "certified", label: "International certification", value: Math.round(t3 * 0.11 + t4 * 0.6) },
    { id: "exporting", label: "Actively exporting (self-reported)", value: Math.round(t3 * 0.06 + t4 * 0.45) },
  ];
}

export function impactEstimate(cells: CubeCell[]) {
  let jobs = 0;
  let energyGwh = 0;
  for (const c of cells) {
    const s = sectorById(c.sector);
    const total = c.tiers.reduce((a, b) => a + b, 0);
    jobs += total * s.avgEmployees;
    energyGwh += c.tiers[2] * 0.04 + c.tiers[3] * 0.15 + c.tiers[4] * 0.36;
  }
  return { jobs, energyGwh, co2Tonnes: energyGwh * 470 };
}

// ---------------------------------------------------------------------------
// AI policy insights (pre-written, illustrative)
// ---------------------------------------------------------------------------

export interface PolicyInsight {
  id: string;
  title: string;
  body: string;
  severity: "risk" | "opportunity" | "watch";
  filter: Partial<NationalFilter>;
}

export const INSIGHTS: PolicyInsight[] = [
  {
    id: "giza-textiles",
    title: "Giza textile clusters lag on Tier 1 visibility",
    body: "Nearly two-thirds of onboarded Giza textile factories remain at Tier 0 — no website or business contact channels. A bundled website + SOP programme could lift several hundred to Tier 1 within one quarter.",
    severity: "risk",
    filter: { governorate: "giza", sector: "textiles" },
  },
  {
    id: "sharqia-engineering",
    title: "Sharqia engineering is the Tier 4 frontier",
    body: "10th of Ramadan engineering suppliers already stream machine data. Predictive maintenance and energy optimisation are the shortest path to Tier 4 and automotive export readiness.",
    severity: "opportunity",
    filter: { governorate: "sharqia", sector: "engineering" },
  },
  {
    id: "damietta-furniture",
    title: "Damietta furniture: high density, low digitisation",
    body: "Small workshops dominate and few progress past Tier 1. Shared-cluster services (common e-invoicing, export catalogues) may be more effective than per-factory upgrades.",
    severity: "watch",
    filter: { governorate: "damietta", sector: "furniture" },
  },
  {
    id: "upper-egypt",
    title: "Upper Egypt needs a Tier 2 back-office push",
    body: "Minya, Assiut and Sohag combine the lowest average maturity with the smallest Tier 2+ share. Prioritising accounting & HR system rollouts with local training partners would lift them to Tier 2.",
    severity: "opportunity",
    filter: { governorate: "assiut" },
  },
];

// ---------------------------------------------------------------------------
// Public licence registry (fictional)
// ---------------------------------------------------------------------------

export type LicenceStatus = "valid" | "expired" | "suspended";

export interface RegistryRecord {
  licenseNo: string;
  registrationNo: string;
  name: string;
  nameAr: string;
  industry: string;
  industryAr: string;
  governorateId: string;
  sector: SectorId;
  status: LicenceStatus;
  statusNote?: string;
  issuedOn: string;
  expiresOn: string;
  employees: number;
  /** Set for the two live demo factories — tier/score are then read from the store. */
  live?: DemoFactoryId;
  /** Static tier for fictional records; baseline tier for live factories. */
  tier: TierLevel;
  score: number;
  tierStatus: "verified" | "provisional";
  lastInspection?: string;
}

const liveRecord = (id: DemoFactoryId, sector: SectorId, issuedOn: string, expiresOn: string, lastInspection?: string): RegistryRecord => {
  const f = FACTORIES[id];
  return {
    licenseNo: f.licenseNo,
    registrationNo: f.registrationNo,
    name: f.name,
    nameAr: f.nameAr,
    industry: f.industry,
    industryAr: f.industryAr,
    governorateId: LIVE_FACTORY_CELL[id].governorate,
    sector,
    status: "valid",
    issuedOn,
    expiresOn,
    employees: f.employees,
    live: id,
    tier: f.baselineTier,
    score: 0,
    tierStatus: "verified",
    lastInspection,
  };
};

export const REGISTRY: RegistryRecord[] = [
  liveRecord("al-noor", "textiles", "2023-03-14", "2028-03-13"),
  liveRecord("delta", "engineering", "2022-09-01", "2027-08-31", "2026-05-20"),
  {
    licenseNo: "DEMO-LIC-NS-1203", registrationNo: "QL-IND-2014-01203", name: "Nile Star Food Industries", nameAr: "نجمة النيل للصناعات الغذائية",
    industry: "Food & beverage", industryAr: "الصناعات الغذائية", governorateId: "qalyubia", sector: "food", status: "valid",
    issuedOn: "2024-01-22", expiresOn: "2029-01-21", employees: 164, tier: 2, score: 46, tierStatus: "verified", lastInspection: "2026-02-11",
  },
  {
    licenseNo: "DEMO-LIC-SC-0551", registrationNo: "SZ-IND-2006-00551", name: "Sinai Cement & Building Materials", nameAr: "سيناء للأسمنت ومواد البناء",
    industry: "Building materials", industryAr: "مواد البناء", governorateId: "suez", sector: "building", status: "expired",
    statusNote: "Operating licence lapsed on 30 Jun 2026 — renewal application not yet recorded (simulated).",
    issuedOn: "2021-07-01", expiresOn: "2026-06-30", employees: 520, tier: 1, score: 27, tierStatus: "verified", lastInspection: "2025-04-03",
  },
  {
    licenseNo: "DEMO-LIC-AP-0736", registrationNo: "AX-IND-2011-00736", name: "Alex Pharma Laboratories", nameAr: "الإسكندرية للمعامل الدوائية",
    industry: "Pharmaceuticals", industryAr: "الأدوية", governorateId: "alexandria", sector: "pharma", status: "suspended",
    statusNote: "Suspended pending corrective action review (simulated scenario for demonstration).",
    issuedOn: "2023-11-05", expiresOn: "2028-11-04", employees: 380, tier: 3, score: 71, tierStatus: "verified", lastInspection: "2026-09-18",
  },
  {
    licenseNo: "DEMO-LIC-MH-0314", registrationNo: "GH-IND-2001-00314", name: "Mahalla Heritage Spinning", nameAr: "تراث المحلة للغزل",
    industry: "Textiles & garments", industryAr: "المنسوجات والملابس الجاهزة", governorateId: "gharbia", sector: "textiles", status: "valid",
    issuedOn: "2024-06-10", expiresOn: "2029-06-09", employees: 290, tier: 1, score: 22, tierStatus: "provisional",
  },
  {
    licenseNo: "DEMO-LIC-CP-0629", registrationNo: "IS-IND-2012-00629", name: "Canal Polymer Works", nameAr: "القناة لصناعة البوليمرات",
    industry: "Chemicals & plastics", industryAr: "الكيماويات والبلاستيك", governorateId: "ismailia", sector: "chemicals", status: "valid",
    issuedOn: "2025-02-17", expiresOn: "2030-02-16", employees: 210, tier: 3, score: 66, tierStatus: "verified", lastInspection: "2026-07-07",
  },
  {
    licenseNo: "DEMO-LIC-DW-0845", registrationNo: "DM-IND-2017-00845", name: "Damietta Woodcraft Furniture", nameAr: "دمياط للأثاث الخشبي",
    industry: "Furniture & wood", industryAr: "الأثاث والأخشاب", governorateId: "damietta", sector: "furniture", status: "valid",
    issuedOn: "2024-09-02", expiresOn: "2029-09-01", employees: 58, tier: 0, score: 8, tierStatus: "verified",
  },
];

export const SAMPLE_LICENCES = ["DEMO-LIC-AN-0417", "DEMO-LIC-DP-0982", "DEMO-LIC-NS-1203", "DEMO-LIC-SC-0551", "DEMO-LIC-AP-0736"];

const normaliseId = (s: string) => s.toUpperCase().replace(/[\s_]+/g, "").replace(/–|—/g, "-");

/** Look up by licence no., registration no. (exact, case/space-insensitive) or factory name (EN/AR substring). */
export function findRecords(query: string): RegistryRecord[] {
  const q = query.trim();
  if (!q) return [];
  const id = normaliseId(q);
  const exact = REGISTRY.filter((r) => normaliseId(r.licenseNo) === id || normaliseId(r.registrationNo) === id);
  if (exact.length) return exact;
  const lower = q.toLowerCase();
  return REGISTRY.filter((r) => r.name.toLowerCase().includes(lower) || r.nameAr.includes(q));
}

/** Deterministic, fake 64-hex-char "verification hash". */
export function fakeHash(seed: string): string {
  let out = "";
  let h = hashString(seed);
  for (let i = 0; i < 8; i++) {
    h = hashString(`${h}:${seed}:${i}`);
    out += h.toString(16).padStart(8, "0");
  }
  return out;
}
