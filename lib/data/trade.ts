// Simulated global-trade data for the Export / Import explorer.
// Every figure is deterministically generated from a seed — illustrative only, not real trade statistics.

export type TradeDirection = "export" | "import";
export type TradeRegion = "EU" | "GCC" | "Africa" | "Americas" | "Asia" | "Europe";

export interface TradeCountry {
  id: string;
  /** ISO 3166-1 alpha-2 code (lowercase) for the flag image. */
  iso: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  region: TradeRegion;
  port: string;
  /** Rough economy-size factor used to scale generated numbers. */
  scale: number;
}

/** Shipments originate from / arrive at Egypt (the demo factories' home market). */
export const HOME = { id: "egypt", iso: "eg", name: "Egypt", flag: "🇪🇬", lat: 31.2, lng: 32.3, port: "Port Said / Alexandria" } as const;

export const TRADE_COUNTRIES: TradeCountry[] = [
  { id: "saudi-arabia", iso: "sa", name: "Saudi Arabia", flag: "🇸🇦", lat: 23.9, lng: 45.1, region: "GCC", port: "Jeddah Islamic Port", scale: 1.1 },
  { id: "uae", iso: "ae", name: "United Arab Emirates", flag: "🇦🇪", lat: 24.4, lng: 54.4, region: "GCC", port: "Jebel Ali", scale: 0.9 },
  { id: "germany", iso: "de", name: "Germany", flag: "🇩🇪", lat: 51.2, lng: 10.4, region: "EU", port: "Hamburg", scale: 2.2 },
  { id: "italy", iso: "it", name: "Italy", flag: "🇮🇹", lat: 41.9, lng: 12.6, region: "EU", port: "Genoa", scale: 1.6 },
  { id: "spain", iso: "es", name: "Spain", flag: "🇪🇸", lat: 40.4, lng: -3.7, region: "EU", port: "Valencia", scale: 1.3 },
  { id: "france", iso: "fr", name: "France", flag: "🇫🇷", lat: 46.2, lng: 2.2, region: "EU", port: "Marseille-Fos", scale: 1.9 },
  { id: "uk", iso: "gb", name: "United Kingdom", flag: "🇬🇧", lat: 54.0, lng: -2.5, region: "Europe", port: "Felixstowe", scale: 1.8 },
  { id: "turkey", iso: "tr", name: "Türkiye", flag: "🇹🇷", lat: 39.0, lng: 35.2, region: "Europe", port: "Mersin", scale: 1.2 },
  { id: "morocco", iso: "ma", name: "Morocco", flag: "🇲🇦", lat: 31.8, lng: -7.1, region: "Africa", port: "Tanger Med", scale: 0.6 },
  { id: "kenya", iso: "ke", name: "Kenya", flag: "🇰🇪", lat: -1.3, lng: 36.8, region: "Africa", port: "Mombasa", scale: 0.4 },
  { id: "nigeria", iso: "ng", name: "Nigeria", flag: "🇳🇬", lat: 9.1, lng: 8.7, region: "Africa", port: "Lagos (Apapa)", scale: 0.8 },
  { id: "south-africa", iso: "za", name: "South Africa", flag: "🇿🇦", lat: -30.6, lng: 22.9, region: "Africa", port: "Durban", scale: 0.9 },
  { id: "india", iso: "in", name: "India", flag: "🇮🇳", lat: 20.6, lng: 78.9, region: "Asia", port: "Nhava Sheva", scale: 2.4 },
  { id: "china", iso: "cn", name: "China", flag: "🇨🇳", lat: 35.9, lng: 104.2, region: "Asia", port: "Shanghai", scale: 3.2 },
  { id: "japan", iso: "jp", name: "Japan", flag: "🇯🇵", lat: 36.2, lng: 138.3, region: "Asia", port: "Yokohama", scale: 2.0 },
  { id: "usa", iso: "us", name: "United States", flag: "🇺🇸", lat: 37.1, lng: -95.7, region: "Americas", port: "New York / New Jersey", scale: 3.0 },
  { id: "brazil", iso: "br", name: "Brazil", flag: "🇧🇷", lat: -14.2, lng: -51.9, region: "Americas", port: "Santos", scale: 1.5 },
];

export interface TradeProduct { id: string; name: string; hs: string }
export interface TradeIndustry { id: string; name: string; products: TradeProduct[] }

export const TRADE_INDUSTRIES: TradeIndustry[] = [
  { id: "textiles", name: "Textiles & garments", products: [
    { id: "cotton-yarn", name: "Cotton yarn", hs: "5205" },
    { id: "knit-fabric", name: "Knitted fabric", hs: "6006" },
    { id: "garments", name: "Ready-made garments", hs: "6109" },
    { id: "home-textiles", name: "Home textiles & linen", hs: "6302" },
  ] },
  { id: "food", name: "Food & agriculture", products: [
    { id: "citrus", name: "Citrus fruit", hs: "0805" },
    { id: "frozen-veg", name: "Frozen vegetables", hs: "0710" },
    { id: "dates", name: "Dates", hs: "0804" },
    { id: "olive-oil", name: "Olive oil", hs: "1509" },
  ] },
  { id: "engineering", name: "Engineering & auto parts", products: [
    { id: "brake-parts", name: "Brake components", hs: "8708.30" },
    { id: "fasteners", name: "Steel fasteners", hs: "7318" },
    { id: "machined", name: "Precision machined parts", hs: "8483" },
    { id: "cables", name: "Cables & wiring harnesses", hs: "8544" },
  ] },
  { id: "chemicals", name: "Chemicals & plastics", products: [
    { id: "fertilisers", name: "Nitrogen fertilisers", hs: "3102" },
    { id: "polymers", name: "Polyethylene & polymers", hs: "3901" },
    { id: "paints", name: "Paints & coatings", hs: "3208" },
  ] },
  { id: "building", name: "Building materials", products: [
    { id: "cement", name: "Cement", hs: "2523" },
    { id: "tiles", name: "Ceramic tiles", hs: "6907" },
    { id: "glass", name: "Flat glass", hs: "7005" },
  ] },
  { id: "pharma", name: "Pharmaceuticals", products: [
    { id: "generics", name: "Generic medicines", hs: "3004" },
    { id: "consumables", name: "Medical consumables", hs: "9018" },
  ] },
  { id: "electrical", name: "Electrical & electronics", products: [
    { id: "transformers", name: "Power transformers", hs: "8504" },
    { id: "appliances", name: "Home appliances", hs: "8418" },
    { id: "led", name: "LED lighting", hs: "9405" },
  ] },
];

// ---------------- Deterministic generator ----------------
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
const pickN = <T,>(r: () => number, arr: readonly T[], n: number) => {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
};
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

const RESOURCES = ["Natural gas", "Crude oil", "Solar capacity", "Wind capacity", "Fresh water", "Arable land", "Iron ore", "Copper", "Cotton", "Skilled labour", "Phosphates", "Timber", "Rare earths", "Hydropower", "Wheat", "Port capacity"] as const;
const EXPORT_GOODS = ["Refined petroleum", "Motor vehicles", "Machinery", "Pharmaceuticals", "Integrated circuits", "Iron & steel", "Fresh produce", "Garments", "Aircraft parts", "Fertilisers", "Natural gas (LNG)", "Electrical equipment", "Chemicals", "Gold"] as const;
const IMPORT_GOODS = ["Crude oil", "Machinery", "Wheat & grains", "Vehicles & parts", "Electronics", "Pharmaceuticals", "Plastics", "Textile inputs", "Medical devices", "Steel products", "Processed food", "Industrial chemicals"] as const;

export interface CountryProfile {
  energyDemandTwh: number;
  energyGrowthPct: number;
  renewableSharePct: number;
  topExport: { name: string; valueBn: number };
  topImport: { name: string; valueBn: number };
  surpluses: string[];
  shortages: string[];
  vesselsInTransit: number;
  flightsInTransit: number;
}

export function countryProfile(c: TradeCountry): CountryProfile {
  const r = rng(`profile:${c.id}`);
  const surpluses = pickN(r, RESOURCES, 3);
  const shortages = pickN(r, RESOURCES.filter((x) => !surpluses.includes(x)), 3);
  return {
    energyDemandTwh: Math.round((180 + r() * 420) * c.scale * c.scale),
    energyGrowthPct: round(0.6 + r() * 4.2),
    renewableSharePct: Math.round(8 + r() * 44),
    topExport: { name: pick(r, EXPORT_GOODS), valueBn: round((6 + r() * 40) * c.scale) },
    topImport: { name: pick(r, IMPORT_GOODS), valueBn: round((5 + r() * 32) * c.scale) },
    surpluses,
    shortages,
    vesselsInTransit: Math.round(4 + r() * 18),
    flightsInTransit: Math.round(2 + r() * 9),
  };
}

export interface TradeOpportunity {
  marketSizeM: number;
  egyptSharePct: number;
  tariffPct: number;
  demandGrowthPct: number;
  score: number;
  leadTimeDays: number;
  mode: "Sea freight" | "Air freight" | "Sea + road";
  competitors: string[];
  trend: number[];
}

const COMPETITORS = ["China", "India", "Türkiye", "Vietnam", "Bangladesh", "Italy", "Germany", "Morocco", "Pakistan", "Spain", "USA", "Brazil", "Jordan", "Tunisia"] as const;

export function opportunity(c: TradeCountry, product: TradeProduct, dir: TradeDirection): TradeOpportunity {
  const r = rng(`opp:${c.id}:${product.id}:${dir}`);
  const far = ["Asia", "Americas"].includes(c.region);
  return {
    marketSizeM: Math.round((40 + r() * 900) * c.scale),
    egyptSharePct: round(dir === "export" ? 0.4 + r() * 9 : 2 + r() * 25),
    tariffPct: c.region === "EU" || c.region === "GCC" ? round(r() * 3) : round(2 + r() * 16),
    demandGrowthPct: round(-1.5 + r() * 9),
    score: Math.round(38 + r() * 58),
    leadTimeDays: Math.round((far ? 22 : 6) + r() * (far ? 18 : 12)),
    mode: far ? (r() > 0.75 ? "Air freight" : "Sea freight") : c.region === "GCC" ? "Sea + road" : "Sea freight",
    competitors: pickN(r, COMPETITORS.filter((x) => x !== c.name), 3),
    trend: Array.from({ length: 8 }, (_, i) => Math.round(60 + i * (2 + r() * 4) + r() * 14)),
  };
}

// ---------------- Partners & legal requirements ----------------
export interface TradePartner { name: string; role: string; city: string; contact: string; email: string; phone: string; rating: number }

const FIRST = ["Amira", "Karim", "Laila", "Omar", "Nour", "Youssef", "Sara", "Hany", "Mona", "Tarek", "Elena", "Marco", "Aisha", "James", "Chen", "Priya"];
const LAST = ["Hassan", "Fahmy", "Saeed", "Nasser", "Rossi", "Weber", "Okafor", "Mensah", "Patel", "Tanaka", "García", "Dubois", "Smith", "Wang"];
const PREFIX = ["Blue", "Delta", "Meridian", "Crescent", "Atlas", "Horizon", "Pyramid", "Gateway", "Nile", "Harbor", "Summit", "Silk Route"];

export function tradePartners(c: TradeCountry, product: TradeProduct, dir: TradeDirection): TradePartner[] {
  const r = rng(`partners:${c.id}:${product.id}:${dir}`);
  const roles = [
    { role: "Freight forwarder", suffix: "Logistics", city: HOME.port.split(" /")[0] },
    { role: "Customs broker", suffix: "Customs Brokerage", city: dir === "export" ? "Alexandria" : "Port Said" },
    { role: dir === "export" ? "Importer & distributor" : "Supplier & exporter", suffix: "Trading", city: c.port.split(" (")[0] },
    { role: "Inspection & certification", suffix: "Quality Services", city: c.name === "United States" ? "Houston" : c.port.split(" ")[0] },
  ];
  return roles.map((x) => {
    const name = `${pick(r, PREFIX)} ${x.suffix}`;
    const person = `${pick(r, FIRST)} ${pick(r, LAST)}`;
    const domain = name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-$/, "");
    return {
      name,
      role: x.role,
      city: x.city,
      contact: person,
      email: `${person.split(" ")[0].toLowerCase()}@${domain}.demo`,
      phone: `+${10 + Math.floor(r() * 89)} ${Math.floor(100 + r() * 899)} ${Math.floor(1000 + r() * 8999)}`,
      rating: round(3.9 + r() * 1.1),
    };
  });
}

export interface LegalRequirement { title: string; body: string; authority: string }

export function legalRequirements(c: TradeCountry, product: TradeProduct, dir: TradeDirection): LegalRequirement[] {
  const hs = { title: `HS classification ${product.hs}`, body: `Classify ${product.name.toLowerCase()} under HS ${product.hs} consistently on every document.`, authority: "Customs" };
  if (dir === "export") {
    const dest: Record<TradeRegion, LegalRequirement[]> = {
      EU: [
        { title: "EUR.1 movement certificate", body: "Proof of Egyptian origin to claim preferential duty under the EU–Egypt Association Agreement.", authority: "Egyptian customs" },
        { title: "EU product rules", body: "Check REACH chemical limits, CE marking where applicable and labelling requirements for the product.", authority: "EU / importer" },
      ],
      GCC: [
        { title: "Certificate of origin (GAFTA)", body: "Arab-origin certificate for duty-free entry under the Greater Arab Free Trade Area.", authority: "Chamber of commerce" },
        { title: "GSO conformity", body: "Product conformity with Gulf Standardization Organization technical regulations.", authority: "GSO / SASO" },
      ],
      Africa: [
        { title: "AfCFTA / COMESA origin", body: "Origin certificate to access preferential tariffs where agreements apply.", authority: "Chamber of commerce" },
        { title: "Pre-shipment inspection", body: "Some destinations require a certificate of conformity issued before shipment.", authority: "Destination standards body" },
      ],
      Europe: [
        { title: "Certificate of origin", body: "Origin proof under the applicable free-trade agreement.", authority: "Egyptian customs" },
        { title: "Destination standards", body: "Confirm national product standards and labelling with the importer.", authority: "Importer" },
      ],
      Americas: [
        { title: "Importer security filing", body: "The importer files cargo data before loading (e.g. ISF in the US).", authority: "Destination customs" },
        { title: "Product compliance", body: "Confirm labelling, safety and agency registrations (e.g. FDA for food & pharma).", authority: "Destination regulator" },
      ],
      Asia: [
        { title: "Certificate of origin", body: "Standard origin certificate; check eligibility for any preferential scheme.", authority: "Chamber of commerce" },
        { title: "Registration & labelling", body: "Some products need importer registration and local-language labelling.", authority: "Destination regulator" },
      ],
    };
    return [
      { title: "Exporters' register", body: "Factory must be listed on the exporters' register before shipping.", authority: "Ministry of Trade & Industry (illustrative)" },
      hs,
      { title: "Commercial invoice & packing list", body: "Matching quantities, weights and values across all shipping documents.", authority: "Customs" },
      ...dest[c.region],
    ];
  }
  return [
    { title: "Importers' register", body: "Company must be registered as an importer before goods are cleared.", authority: "Ministry of Trade & Industry (illustrative)" },
    { title: "Advance cargo information (ACI)", body: "Shipment data submitted electronically before the goods are loaded abroad.", authority: "Egyptian customs (Nafeza)" },
    hs,
    { title: "Conformity inspection", body: `${product.name} may require quality inspection and approval on arrival.`, authority: "GOEIC (illustrative)" },
    { title: "Duties & VAT", body: "Customs duty and VAT are assessed on the CIF value at clearance.", authority: "Egyptian customs" },
  ];
}

/** Flag image (flagcdn.com) — emoji flags don't render on Windows. */
export const flagUrl = (iso: string, w: 40 | 80 = 40) => `https://flagcdn.com/w${w}/${iso}.png`;
