// Strategy & Balanced Scorecard workspaces (JZ-027) — deterministic seeds and pure helpers.
// Everything here is fictional demo content. No network calls, no randomness at module scope.
import { seedKeyFor, type SeedKey } from "@/components/services/kit";
import { tierDef } from "@/lib/data/tiers";
import type { BusinessObjective, Factory, TierLevel } from "@/lib/types";

// ---------------------------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------------------------

/** Deterministic 32-bit string hash. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BASE_YEAR = 2026;

export const egpM = (m: number) => (m >= 1000 ? `EGP ${(m / 1000).toFixed(m >= 10000 ? 0 : 1)}B` : m >= 10 ? `EGP ${Math.round(m)}M` : `EGP ${m.toFixed(1)}M`);

const rotate = <T,>(arr: T[], by: number) => (arr.length ? arr.map((_, i) => arr[(i + by) % arr.length]) : arr);

// ---------------------------------------------------------------------------------------------
// Factory profile
// ---------------------------------------------------------------------------------------------

export type Sector = "textile" | "engineering" | "food" | "process" | "general";

export interface StrategyProfile {
  key: SeedKey;
  name: string;
  industry: string;
  sector: Sector;
  products: string[];
  product: string;
  employees: number;
  revenueM: number;
  tier: TierLevel;
  tierName: string;
  nextTier: TierLevel;
  nextTierName: string;
  objectives: BusinessObjective[];
  exportsNow: boolean;
  exportShare: number; // current share of revenue, 0-1
}

export function sectorOf(industry: string): Sector {
  const s = industry.toLowerCase();
  if (/textile|garment|apparel|knit|cotton|fashion|leather/.test(s)) return "textile";
  if (/engineer|metal|auto|steel|machin|electr|component/.test(s)) return "engineering";
  if (/food|beverage|agri|dairy|bakery/.test(s)) return "food";
  if (/chemic|plastic|pharma|paint|packag|paper|glass|ceramic/.test(s)) return "process";
  return "general";
}

export function parseRevenueM(raw: string | undefined, employees: number): number {
  const fallback = Math.max(5, Math.round(employees * 0.45));
  if (!raw) return fallback;
  const m = /([\d.,]+)\s*(b|bn|m|mn|k)?/i.exec(raw);
  if (!m) return fallback;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit.startsWith("b")) return n * 1000;
  if (unit === "k") return n / 1000;
  if (unit.startsWith("m")) return n;
  return n > 100000 ? n / 1_000_000 : n;
}

export function profileOf(factory: Factory, tier: TierLevel): StrategyProfile {
  const key = seedKeyFor(factory);
  const next = Math.min(4, tier + 1) as TierLevel;
  const exportShare = key === "delta" ? 0.18 : key === "al-noor" ? 0 : factory.exportStatus === "regular" ? 0.2 : factory.exportStatus === "occasional" ? 0.08 : 0;
  return {
    key,
    name: factory.name,
    industry: factory.industry || "Manufacturing",
    sector: key === "al-noor" ? "textile" : key === "delta" ? "engineering" : sectorOf(factory.industry ?? ""),
    products: factory.products?.length ? factory.products : ["core products"],
    product: (factory.products?.[0] ?? "core products").toLowerCase(),
    employees: factory.employees || 50,
    revenueM: parseRevenueM(factory.annualRevenueEgp, factory.employees || 50),
    tier,
    tierName: tierDef(tier).name,
    nextTier: next,
    nextTierName: tierDef(next).name,
    objectives: factory.objectives ?? [],
    exportsNow: exportShare > 0,
    exportShare,
  };
}

// ---------------------------------------------------------------------------------------------
// Corporate strategy (service 5)
// ---------------------------------------------------------------------------------------------

export type Perspective = "financial" | "customer" | "process" | "learning";
export const PERSPECTIVES: { id: Perspective; label: string; short: string; color: string; question: string }[] = [
  { id: "financial", label: "Financial", short: "FIN", color: "#0B1F3A", question: "How do we create value for owners?" },
  { id: "customer", label: "Customer", short: "CUS", color: "#0FA396", question: "How must buyers see us?" },
  { id: "process", label: "Internal process", short: "PRO", color: "#6366F1", question: "Which processes must we excel at?" },
  { id: "learning", label: "Learning & growth", short: "L&G", color: "#C9A24B", question: "Which capabilities must we build?" },
];
export const perspectiveMeta = (p: Perspective) => PERSPECTIVES.find((x) => x.id === p) ?? PERSPECTIVES[0];

export type SectionId = "vision" | "context" | "objectives" | "priorities" | "roadmap" | "investment" | "kpis" | "risks";
export const SECTION_ORDER: { id: SectionId; label: string }[] = [
  { id: "vision", label: "Vision" },
  { id: "context", label: "Strategic context" },
  { id: "objectives", label: "Strategic objectives" },
  { id: "priorities", label: "Priorities" },
  { id: "roadmap", label: "Roadmap & milestones" },
  { id: "investment", label: "Investment plan" },
  { id: "kpis", label: "Suggested KPIs" },
  { id: "risks", label: "Risks" },
];

export interface StrategyObjective { id: string; perspective: Perspective; title: string; detail: string }
export interface StrategyPriority { id: string; title: string; detail: string }
export interface RoadmapYear { year: number; theme: string; milestones: string[] }
export interface InvestmentLine { id: string; item: string; year: number; minM: number; maxM: number; category: string }
export interface StrategyKpi { id: string; name: string; baseline: string; target3: string; target5: string }
export type Level = "Low" | "Medium" | "High";
export interface StrategyRisk { id: string; risk: string; likelihood: Level; impact: Level; mitigation: string }

export interface StrategyData {
  version: 1;
  horizon: 3 | 5;
  vision: string;
  context: string;
  objectives: StrategyObjective[];
  priorities: StrategyPriority[];
  roadmap: { "3": RoadmapYear[]; "5": RoadmapYear[] };
  roadmapPace: string;
  investments: InvestmentLine[];
  investmentStance: string;
  kpis: StrategyKpi[];
  risks: StrategyRisk[];
  status: Record<SectionId, "draft" | "approved">;
  variants: Record<SectionId, number>;
}

// ---- Vision ----
function visionCore(p: StrategyProfile) {
  if (p.key === "al-noor") return ["a recognised Egyptian knitwear and uniform maker that export buyers can find, trust and reorder from", "the most reliable mid-size supplier of cotton knit, workwear and hospital linen in Greater Cairo — and a credible exporter to the EU and Gulf"];
  if (p.key === "delta") return ["an AI-enabled, Tier 4 precision-components partner trusted by OEMs across Europe, North Africa and the Gulf", "the benchmark Egyptian supplier of safety-critical automotive components — zero-defect, data-driven and export-led"];
  return [
    `a digitally organised ${p.industry.toLowerCase()} manufacturer known for reliable ${p.product}`,
    `a trusted, ${p.nextTierName.toLowerCase()} supplier of ${p.product} that competes on quality and service beyond Egypt`,
  ];
}
export function genVision(p: StrategyProfile, variant: number, horizon: 3 | 5): string {
  const [a, b] = visionCore(p);
  const year = BASE_YEAR + horizon;
  switch (variant % 3) {
    case 1:
      return `Our ambition for ${year}: to be ${b}.\n\nWe will get there by combining the craft our people already have with the digital systems, certifications and market visibility that buyers now expect.`;
    case 2:
      return `${p.name} in ${year} — ${a}.\n\nEvery investment, hire and process change over the next ${horizon} years should move us visibly closer to that picture.`;
    default:
      return `By ${year}, ${p.name} will be ${a}.\n\nGrowth will come from disciplined digital transformation — moving from Tier ${p.tier} (${p.tierName}) toward Tier ${Math.min(4, p.tier + (horizon === 5 ? 2 : 1))} — and from customers who choose us for consistency, transparency and speed.`;
  }
}

// ---- Context ----
function sectorContext(p: StrategyProfile): string[] {
  switch (p.sector) {
    case "textile":
      return [
        "European and Gulf apparel buyers are diversifying sourcing toward near-shore suppliers with short lead times and traceable cotton.",
        "Buyers increasingly ask for social-compliance audits, product certifications and digital order tracking before placing trial orders.",
        "Local institutional demand (uniforms, hospital linen) provides a stable base while export capability is built.",
      ];
    case "engineering":
      return [
        "Automotive OEMs are regionalising supply chains; Egypt competes with Morocco and Türkiye on cost, logistics and quality systems.",
        "EU carbon-reporting rules (e.g. CBAM for iron and steel inputs) and OEM sustainability scorecards are raising data requirements for suppliers.",
        "Connected-machine data creates an opportunity for predictive maintenance and AI quality inspection — the core of Tier 4 readiness.",
      ];
    case "food":
      return ["Regional demand for processed food is growing, with retailers demanding food-safety certification and traceability.", "Energy and packaging costs are the main margin pressures.", "Export markets reward consistent quality and documented HACCP/ISO 22000 systems."];
    case "process":
      return ["Customers increasingly require documented quality, safety and environmental performance.", "Energy and imported raw-material costs drive margin volatility.", "Digital process control is becoming a differentiator for consistency and yield."];
    default:
      return ["Buyers increasingly select suppliers that are visible online, digitally organised and able to document quality.", "Input-cost and currency volatility make planning discipline essential.", "Export markets reward certification, traceability and responsive communication."];
  }
}
export function genContext(p: StrategyProfile, variant: number): string {
  const facts = `${p.name} employs ${p.employees} people with annual revenue of about ${egpM(p.revenueM)} (as declared). Its current Jahez maturity is Tier ${p.tier} — ${p.tierName}. Main products: ${p.products.join(", ")}.`;
  const ctx = sectorContext(p);
  const strength = p.key === "al-noor" ? "Strengths: loyal local customers, skilled knitting and sewing teams, 24 circular knitting machines. Gaps: no website or business email, paper records, no certifications buyers recognise." : p.key === "delta" ? "Strengths: IATF 16949 quality system, ERP/MES, 32 machines streaming telemetry, established OEM relationships. Gaps: calendar-based maintenance, energy data not analysed, export share still modest." : `Strengths: established production of ${p.product} and an experienced workforce. Gaps: the systems required for Tier ${p.nextTier} (${p.nextTierName}) are not yet fully in place.`;
  switch (variant % 3) {
    case 1:
      return `Market outlook\n${ctx.map((c) => `• ${c}`).join("\n")}\n\nStarting position\n${facts}\n${strength}`;
    case 2:
      return `What has changed: ${ctx[0]} ${ctx[1]}\n\nWhere we stand: ${facts}\n\nImplication: ${p.tier <= 1 ? "visibility and basic digital organisation are the first unlock — without them, buyers cannot find or qualify us." : "the next gains come from using data we already collect, and from proving it to demanding export customers."}`;
    default:
      return `${facts}\n\n${ctx.join(" ")}\n\n${strength}`;
  }
}

// ---- Objectives ----
type ObjTpl = { perspective: Perspective; titles: [string, string]; detail: string };
function objectiveTemplates(p: StrategyProfile): ObjTpl[] {
  if (p.key === "al-noor")
    return [
      { perspective: "financial", titles: ["Grow revenue 50% with first export sales", "Reach EGP 57M+ revenue, 10–15% from exports"], detail: "Balanced growth: protect local uniform and linen contracts while adding export orders for polos and T-shirts." },
      { perspective: "customer", titles: ["Become visible and credible to export buyers", "Be found, trusted and shortlisted by international buyers"], detail: "Website, business email, digital catalogue and B2B marketplace profiles — the foundations of Tier 1 (Visible)." },
      { perspective: "customer", titles: ["Win three repeat export buyers (EU and Gulf)", "Convert trial orders into three repeat export accounts"], detail: "Targeted outreach, sample programme and responsive quotation process." },
      { perspective: "process", titles: ["Digitise order-to-delivery and quality records", "Replace paper ledgers with digital order, stock and QC records"], detail: "Simple ERP and production tracking so orders, lots and defects are visible daily." },
      { perspective: "process", titles: ["Prepare for buyer-required certifications", "Become audit-ready for OEKO-TEX® and ISO 9001"], detail: "Documented SOPs, chemical inventory and quality records to pass buyer and certification audits (certification bodies decide)." },
      { perspective: "learning", titles: ["Build digital and export skills in the leadership team", "Grow a team that can sell, quote and report digitally"], detail: "Training for supervisors and sales staff; one export-sales coordinator role." },
    ];
  if (p.key === "delta")
    return [
      { perspective: "financial", titles: ["Raise export share of revenue from 18% to 35%", "Grow export revenue to over one third of sales"], detail: "Focus on brake discs and steering knuckles for EU and Moroccan assembly programmes." },
      { perspective: "financial", titles: ["Cut cost of poor quality and downtime by 25%", "Release 2–3 margin points from quality and maintenance losses"], detail: "Scrap, rework, warranty and unplanned stops are the largest controllable losses." },
      { perspective: "customer", titles: ["Qualify for two additional OEM programmes", "Win nominations on two new OEM platforms"], detail: "PPAP-ready launches with digital quality evidence and on-time delivery above 98%." },
      { perspective: "process", titles: ["Achieve Tier 4 — predictive maintenance and AI quality inspection", "Turn connected-machine data into predictive operations (Tier 4)"], detail: "Use the 32 streaming machines for predictive maintenance, AI visual inspection and energy optimisation." },
      { perspective: "process", titles: ["Establish CBAM-ready carbon and energy reporting", "Measure product carbon footprint for EU customers"], detail: "Energy metering analytics and embedded-emissions data for steel inputs (illustrative regulatory scope)." },
      { perspective: "learning", titles: ["Upskill engineers in data analytics and Industry 4.0", "Build an in-house data and automation competence centre"], detail: "Certified training for maintenance, quality and process engineers; data-literacy for supervisors." },
    ];
  // Generic — derived from registration objectives.
  const map: Partial<Record<BusinessObjective, ObjTpl>> = {
    "grow-local-sales": { perspective: "customer", titles: [`Grow domestic market share for ${p.product}`, `Become a preferred local supplier of ${p.product}`], detail: "Clear value proposition, digital presence and a structured sales pipeline." },
    "start-exporting": { perspective: "customer", titles: [`Secure first export buyers for ${p.product}`, "Enter one priority export market with repeat orders"], detail: "Market selection, export pricing and buyer outreach, supported by required certifications." },
    "grow-exports": { perspective: "financial", titles: ["Double the export share of revenue", "Make exports a growth engine for the business"], detail: "Prioritise markets where certification and logistics give an advantage." },
    "reduce-costs": { perspective: "financial", titles: ["Reduce unit production cost by 10–15%", "Release margin from energy, scrap and waiting time"], detail: "Data-driven cost tracking per product line." },
    "improve-quality": { perspective: "process", titles: ["Cut defect and rework rates by 30%", "Build quality in at the source"], detail: "Digital quality records, root-cause analysis and supplier quality controls." },
    certification: { perspective: "process", titles: ["Achieve priority certifications for target markets", "Become audit-ready for buyer and market certifications"], detail: "Documented processes and evidence; certification bodies issue certificates." },
    "digitalise-operations": { perspective: "process", titles: [`Digitise core operations to reach Tier ${p.nextTier} (${p.nextTierName})`, `Complete the digital foundations for Tier ${p.nextTier}`], detail: "Prioritised systems from the Jahez roadmap, introduced in sequence." },
    "access-finance": { perspective: "financial", titles: ["Build a bankable investment case for growth finance", "Unlock finance with credible plans and records"], detail: "Clean financial records, a phased investment plan and documented strategy." },
  };
  const picked: ObjTpl[] = [];
  for (const o of p.objectives) {
    const t = map[o];
    if (t && !picked.includes(t)) picked.push(t);
  }
  if (!picked.some((x) => x.perspective === "financial")) picked.unshift({ perspective: "financial", titles: ["Grow revenue profitably by 30–40%", "Grow sales while protecting gross margin"], detail: "Growth targets balanced with margin discipline." });
  if (!picked.some((x) => x.perspective === "customer")) picked.push({ perspective: "customer", titles: ["Be visible and responsive to every qualified buyer", "Make it easy for buyers to find and trust us"], detail: "Website, catalogue and fast, professional quotations." });
  if (!picked.some((x) => x.perspective === "process")) picked.push(map["digitalise-operations"] as ObjTpl);
  picked.push({ perspective: "learning", titles: ["Build digital skills and a data culture across teams", "Develop people who run the business with data"], detail: "Training plan, clear roles and simple dashboards for supervisors." });
  return picked.slice(0, 6);
}
export function genObjectives(p: StrategyProfile, variant: number): StrategyObjective[] {
  return objectiveTemplates(p).map((t, i) => ({ id: `obj-${i + 1}`, perspective: t.perspective, title: t.titles[variant % 2], detail: t.detail }));
}

// ---- Priorities ----
export function genPriorities(p: StrategyProfile, variant: number): StrategyPriority[] {
  const pool: [string, string][] =
    p.key === "al-noor"
      ? [
          ["Get visible first", "Launch a bilingual website, business email and digital catalogue within 90 days."],
          ["Document how we work", "Write the 12 core SOPs and quality checklists so audits and new staff are manageable."],
          ["Digitise orders and stock", "Move from paper ledgers to a simple cloud ERP for orders, stock and invoicing."],
          ["Prepare an export starter kit", "Export pricing, sample programme, spec sheets and two target markets."],
          ["Protect the local base", "Lock in uniform and hospital-linen frame agreements to fund the transition."],
          ["Invest in people", "Appoint an export coordinator and train supervisors on digital tools."],
        ]
      : p.key === "delta"
        ? [
            ["Predict, don't react", "Deploy predictive maintenance across forging and CNC lines."],
            ["Zero-defect launches", "AI visual inspection on brake-disc machining; digital PPAP evidence packs."],
            ["Export programme office", "A dedicated team to pursue EU and Moroccan OEM nominations."],
            ["Carbon & energy transparency", "Energy analytics and product carbon footprints ready for customer and CBAM requests."],
            ["Data competence centre", "A small cross-functional team owning data platforms, models and training."],
            ["Supplier digital integration", "EDI and quality data exchange with key steel and casting suppliers."],
          ]
        : [
            ["Close the Tier gap", `Introduce the systems required for Tier ${p.nextTier} (${p.nextTierName}) in priority order.`],
            ["Be visible to buyers", "Website, catalogue and responsive sales channels."],
            ["Measure what matters", "A small set of KPIs reviewed monthly by leadership."],
            ["Quality as a selling point", "Documented quality controls and readiness for certification."],
            ["Market focus", `Concentrate on the two most promising markets for ${p.product}.`],
            ["People & skills", "Train supervisors and office staff on the new digital tools."],
          ];
  const shift = variant % 3 === 1 ? 2 : variant % 3 === 2 ? 1 : 0;
  return rotate(pool, shift).slice(0, 5).map(([title, detail], i) => ({ id: `pri-${i + 1}`, title, detail }));
}

// ---- Roadmap ----
type Track = "digital" | "market" | "capability" | "compliance";
interface MilestoneTpl { text: string; track: Track; order: number }
function milestonePool(p: StrategyProfile): MilestoneTpl[] {
  if (p.key === "al-noor")
    return [
      { text: "Website, business email and digital catalogue live", track: "digital", order: 1 },
      { text: "Core SOPs and quality checklists documented", track: "compliance", order: 2 },
      { text: "Tier 1 (Visible) verification", track: "compliance", order: 3 },
      { text: "Cloud accounting and order management in use", track: "digital", order: 4 },
      { text: "First trade fair and buyer sample programme", track: "market", order: 5 },
      { text: "Export coordinator appointed and trained", track: "capability", order: 6 },
      { text: "OEKO-TEX® / ISO 9001 readiness audit (by certification body)", track: "compliance", order: 7 },
      { text: "First export orders shipped", track: "market", order: 8 },
      { text: "Tier 2 (Organised) verification", track: "compliance", order: 9 },
      { text: "Production tracking on all knitting machines", track: "digital", order: 10 },
      { text: "Three repeat export buyers", track: "market", order: 11 },
      { text: "Exports reach 10–15% of revenue", track: "market", order: 12 },
      { text: "Tier 3 (Connected) readiness review", track: "compliance", order: 13 },
      { text: "Supervisors using daily digital dashboards", track: "capability", order: 14 },
      { text: "AI demand forecasting pilot", track: "digital", order: 15 },
    ];
  if (p.key === "delta")
    return [
      { text: "Predictive maintenance live on forging and CNC lines", track: "digital", order: 1 },
      { text: "Energy analytics on all metered lines", track: "digital", order: 2 },
      { text: "Product carbon-footprint method agreed with key customers", track: "compliance", order: 3 },
      { text: "AI visual inspection pilot on brake-disc machining", track: "digital", order: 4 },
      { text: "Export programme office established", track: "market", order: 5 },
      { text: "Tier 4 (Intelligent) verification", track: "compliance", order: 6 },
      { text: "Data competence centre staffed (6 engineers)", track: "capability", order: 7 },
      { text: "First new EU OEM nomination (PPAP approved)", track: "market", order: 8 },
      { text: "Supplier quality data exchange with top-5 suppliers", track: "digital", order: 9 },
      { text: "Export share reaches 25%", track: "market", order: 10 },
      { text: "Line-wide digital twin for machining", track: "digital", order: 11 },
      { text: "Second OEM programme in serial production", track: "market", order: 12 },
      { text: "Cost of poor quality down 25% vs 2026", track: "capability", order: 13 },
      { text: "Export share reaches 35%", track: "market", order: 14 },
      { text: "Regional technical service hub for OEM customers", track: "market", order: 15 },
    ];
  const tiers = [1, 2, 3, 4].filter((t) => t > p.tier);
  const pool: MilestoneTpl[] = [
    { text: "Leadership agrees strategy and KPI set", track: "capability", order: 1 },
    { text: p.tier < 1 ? "Website and business email live" : "Digital catalogue and B2B profiles updated", track: "digital", order: 2 },
    { text: "Monthly KPI review in place", track: "capability", order: 3 },
    { text: "Core processes documented as SOPs", track: "compliance", order: 4 },
    { text: `Priority market study for ${p.product}`, track: "market", order: 5 },
    { text: "Accounting, HR and stock systems digitised", track: "digital", order: 6 },
    { text: "Certification readiness assessment", track: "compliance", order: 8 },
    { text: "First trade mission or buyer meetings", track: "market", order: 9 },
    { text: "Production and quality tracking introduced", track: "digital", order: 10 },
    { text: "Supervisor digital-skills programme complete", track: "capability", order: 11 },
    { text: "Repeat orders from new market", track: "market", order: 12 },
    { text: "AI pilots in planning or quality", track: "digital", order: 14 },
  ];
  tiers.forEach((t, i) => pool.push({ text: `Tier ${t} (${tierDef(t).name}) verification`, track: "compliance", order: 3.5 + i * 4 }));
  return pool;
}
const PACES = ["Phased", "Export-first", "Digital-first"] as const;
export function genRoadmap(p: StrategyProfile, variant: number, horizon: 3 | 5): RoadmapYear[] {
  const pace = PACES[variant % 3];
  const pool = milestonePool(p)
    .map((m) => ({ ...m, k: m.order - (pace === "Export-first" && m.track === "market" ? 2.5 : 0) - (pace === "Digital-first" && m.track === "digital" ? 2.5 : 0) }))
    .sort((a, b) => a.k - b.k);
  const themes =
    p.key === "delta"
      ? ["Predict & measure", "Become Intelligent (Tier 4)", "Win new programmes", "Scale exports", "Regional leadership"]
      : [1, 2, 3, 4].filter((t) => t > p.tier).map((t) => `Become ${tierDef(t).name}`).concat(["Scale & export", "Optimise & lead"]).slice(0, 5);
  const years: RoadmapYear[] = Array.from({ length: horizon }, (_, i) => ({ year: BASE_YEAR + 1 + i, theme: themes[Math.min(themes.length - 1, horizon === 3 ? Math.min(4, Math.round(i * 1.6)) : i)], milestones: [] }));
  pool.forEach((m, i) => {
    const idx = Math.min(horizon - 1, Math.floor((i * horizon) / pool.length));
    years[idx].milestones.push(m.text);
  });
  return years.map((y) => ({ ...y, milestones: y.milestones.slice(0, horizon === 3 ? 5 : 3) }));
}
export const paceFor = (variant: number) => PACES[variant % 3];

// ---- Investments ----
type InvTpl = { item: string; year: number; min: number; max: number; category: string }; // min/max as % of revenue
function investmentTemplates(p: StrategyProfile): InvTpl[] {
  if (p.key === "delta")
    return [
      { item: "Predictive maintenance & condition monitoring", year: 1, min: 0.6, max: 1.0, category: "Digital" },
      { item: "AI visual inspection cells (2 lines)", year: 2, min: 0.9, max: 1.5, category: "Digital" },
      { item: "Energy analytics and carbon accounting", year: 1, min: 0.2, max: 0.4, category: "Compliance" },
      { item: "Data competence centre & training", year: 2, min: 0.3, max: 0.5, category: "People" },
      { item: "Export programme office & OEM launches", year: 3, min: 0.5, max: 0.9, category: "Market" },
      { item: "Machining digital twin", year: 4, min: 0.8, max: 1.4, category: "Digital" },
      { item: "Capacity expansion for new programmes", year: 5, min: 2.0, max: 3.5, category: "Capacity" },
    ];
  return [
    { item: "Website, email and digital catalogue", year: 1, min: 0.6, max: 1.2, category: "Market" },
    { item: "Cloud ERP: accounting, orders and stock", year: 1, min: 1.0, max: 2.0, category: "Digital" },
    { item: "SOPs, quality system & certification readiness", year: 2, min: 0.8, max: 1.6, category: "Compliance" },
    { item: "Trade fairs, samples and export marketing", year: 2, min: 0.8, max: 1.5, category: "Market" },
    { item: "Production tracking (machine counters, tablets)", year: 3, min: 1.2, max: 2.4, category: "Digital" },
    { item: "Training and new export/sales roles", year: 2, min: 0.6, max: 1.0, category: "People" },
    { item: "Energy-efficiency upgrades", year: 4, min: 1.5, max: 3.0, category: "Capacity" },
    { item: "AI planning & quality pilots", year: 5, min: 1.0, max: 2.0, category: "Digital" },
  ];
}
const STANCES = [["Balanced", 1], ["Lean", 0.8], ["Ambitious", 1.3]] as const;
export function genInvestments(p: StrategyProfile, variant: number): InvestmentLine[] {
  const [, mult] = STANCES[variant % 3];
  const round = (x: number) => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10);
  return investmentTemplates(p).map((t, i) => ({ id: `inv-${i + 1}`, item: t.item, year: t.year, category: t.category, minM: round((p.revenueM * t.min * mult) / 100), maxM: round((p.revenueM * t.max * mult) / 100) }));
}
export const stanceFor = (variant: number) => STANCES[variant % 3][0];

// ---- KPIs ----
export function genStrategyKpis(p: StrategyProfile, variant: number): StrategyKpi[] {
  const pool: [string, string, string, string][] =
    p.key === "al-noor"
      ? [
          ["Revenue (EGP M)", "38", "50", "60"],
          ["Export share of revenue", "0%", "8%", "15%"],
          ["Qualified buyer enquiries / month", "2", "15", "30"],
          ["On-time delivery", "78%", "92%", "96%"],
          ["Defect rate (second-quality pieces)", "6.5%", "3.5%", "2%"],
          ["Staff trained on digital tools", "5%", "60%", "90%"],
          ["Orders processed digitally", "0%", "80%", "100%"],
        ]
      : p.key === "delta"
        ? [
            ["Export share of revenue", "18%", "26%", "35%"],
            ["Cost of poor quality (% of sales)", "3.2%", "2.4%", "1.8%"],
            ["Customer PPM (external defects)", "85", "40", "15"],
            ["Unplanned downtime", "6.8%", "3.5%", "2%"],
            ["OEE on CNC lines", "68%", "76%", "82%"],
            ["Energy per tonne machined (kWh)", "1,450", "1,250", "1,100"],
            ["Engineers certified in data analytics", "4", "20", "40"],
          ]
        : [
            [`Revenue (${egpM(p.revenueM)} baseline)`, "100", "125", "150"],
            ["Export share of revenue", `${Math.round(p.exportShare * 100)}%`, `${Math.round(p.exportShare * 100) + 8}%`, `${Math.round(p.exportShare * 100) + 15}%`],
            ["On-time delivery", "80%", "92%", "96%"],
            ["Defect / rework rate", "5%", "3%", "2%"],
            [`Jahez maturity tier`, `Tier ${p.tier}`, `Tier ${Math.min(4, p.tier + 1)}`, `Tier ${Math.min(4, p.tier + 2)}`],
            ["Staff trained on digital tools", "10%", "60%", "90%"],
            ["Gross margin", "22%", "25%", "27%"],
          ];
  return rotate(pool, variant % 3).slice(0, 6).map(([name, baseline, target3, target5], i) => ({ id: `skpi-${i + 1}`, name, baseline, target3, target5 }));
}

// ---- Risks ----
export function genRisks(p: StrategyProfile, variant: number): StrategyRisk[] {
  const pool: StrategyRisk[] = [
    p.sector === "textile"
      ? { id: "", risk: "Cotton and yarn price volatility squeezes margins", likelihood: "High", impact: "High", mitigation: "Quarterly yarn contracts, price-adjustment clauses with institutional customers." }
      : p.sector === "engineering"
        ? { id: "", risk: "Steel and casting input-price spikes", likelihood: "Medium", impact: "High", mitigation: "Index-linked pricing with OEMs; dual sourcing for castings." }
        : { id: "", risk: "Raw-material price volatility", likelihood: "High", impact: "Medium", mitigation: "Forward contracts and price-review clauses." },
    { id: "", risk: "EGP/USD exchange-rate swings affect imported inputs and pricing", likelihood: "High", impact: "Medium", mitigation: "Natural hedge through export revenue; USD-denominated export quotes." },
    { id: "", risk: "Leadership bandwidth — transformation competes with daily operations", likelihood: "Medium", impact: "High", mitigation: "Named owner per objective; monthly scorecard review (services 17–19)." },
    p.sector === "engineering"
      ? { id: "", risk: "EU carbon reporting (CBAM) and OEM sustainability demands", likelihood: "High", impact: "Medium", mitigation: "Energy analytics and product carbon footprints from year 1." }
      : { id: "", risk: "Buyer certification requirements delay first export orders", likelihood: "Medium", impact: "High", mitigation: "Start certification readiness in year 1; prioritise buyers with achievable requirements." },
    { id: "", risk: "Staff resistance to new digital tools", likelihood: "Medium", impact: "Medium", mitigation: "Champions on each shift, simple tools first, visible quick wins." },
    { id: "", risk: "Energy subsidy reform raises operating costs", likelihood: "Medium", impact: "Medium", mitigation: "Energy audit and efficiency investments; track energy per unit as a KPI." },
    { id: "", risk: "Port congestion and freight-rate spikes disrupt export lead times", likelihood: "Low", impact: "Medium", mitigation: "Buffer stock for key export SKUs; alternative routings via Damietta / Alexandria." },
  ];
  return rotate(pool, (variant % 3) * 2).slice(0, 5).map((r, i) => ({ ...r, id: `risk-${i + 1}` }));
}

export function seedStrategy(factory: Factory, tier: TierLevel): StrategyData {
  const p = profileOf(factory, tier);
  const horizon: 3 | 5 = p.key === "delta" ? 5 : 3;
  return {
    version: 1,
    horizon,
    vision: genVision(p, 0, horizon),
    context: genContext(p, 0),
    objectives: genObjectives(p, 0),
    priorities: genPriorities(p, 0),
    roadmap: { "3": genRoadmap(p, 0, 3), "5": genRoadmap(p, 0, 5) },
    roadmapPace: paceFor(0),
    investments: genInvestments(p, 0),
    investmentStance: stanceFor(0),
    kpis: genStrategyKpis(p, 0),
    risks: genRisks(p, 0),
    status: { vision: "draft", context: "draft", objectives: "draft", priorities: "draft", roadmap: "draft", investment: "draft", kpis: "draft", risks: "draft" },
    variants: { vision: 0, context: 0, objectives: 0, priorities: 0, roadmap: 0, investment: 0, kpis: 0, risks: 0 },
  };
}

const isStrategyData = (d: unknown): d is StrategyData => typeof d === "object" && d !== null && Array.isArray((d as StrategyData).objectives) && (d as StrategyData).version === 1;

/** Objectives from the persisted corporate-strategy workspace, or the deterministic seeded set. */
export function getStrategyObjectives(data: unknown, factory: Factory, tier?: TierLevel): StrategyObjective[] {
  if (isStrategyData(data)) return data.objectives;
  return genObjectives(profileOf(factory, tier ?? factory.baselineTier), 0);
}

/** Indicative total investment (midpoint, EGP M) within the strategy horizon — used by scenario planning. */
export function getStrategyInvestment(data: unknown, factory: Factory, tier: TierLevel): { totalMid: number; horizon: 3 | 5; fromStrategy: boolean } {
  const d = isStrategyData(data) ? data : seedStrategy(factory, tier);
  const lines = d.investments.filter((l) => l.year <= d.horizon);
  return { totalMid: lines.reduce((s, l) => s + (l.minM + l.maxM) / 2, 0), horizon: d.horizon, fromStrategy: isStrategyData(data) };
}

// ---------------------------------------------------------------------------------------------
// Balanced Scorecard (services 17-19)
// ---------------------------------------------------------------------------------------------

export type Frequency = "Weekly" | "Monthly" | "Quarterly";
export interface BscObjective { id: string; perspective: Perspective; title: string; strategyRef?: string }
export interface BscKpi {
  id: string;
  name: string;
  objectiveId: string;
  department: string;
  unit: string;
  baseline: number;
  target: number;
  direction: "up" | "down";
  owner: string;
  frequency: Frequency;
}
export interface BscDesignData { version: 1; objectives: BscObjective[]; links: [string, string][]; kpis: BscKpi[] }

export function departmentsFor(key: SeedKey): string[] {
  if (key === "al-noor") return ["Management", "Sales & Export", "Production", "Quality", "HR & Admin", "Finance"];
  if (key === "delta") return ["Executive", "OEM Sales", "Machining", "Quality (IATF)", "Maintenance", "HR & Training", "Finance"];
  return ["Leadership", "Sales & Marketing", "Production", "Quality", "HR & Training", "Finance"];
}

/** Fictional people used across the BSC workspaces. */
export function peopleFor(factory: Factory): { id: string; name: string; role: string; dept: string }[] {
  const key = seedKeyFor(factory);
  const owner = { id: "p-1", name: factory.owner?.name ?? "Managing Director", role: factory.owner?.title ?? "Managing Director", dept: departmentsFor(key)[0] };
  if (key === "al-noor")
    return [owner, { id: "p-2", name: "Nadia Fawzy", role: "Sales & Export Manager", dept: "Sales & Export" }, { id: "p-3", name: "Karim Mostafa", role: "Production Manager", dept: "Production" }, { id: "p-4", name: "Salma Ibrahim", role: "Quality Supervisor", dept: "Quality" }, { id: "p-5", name: "Ahmed Soliman", role: "Finance & Admin Lead", dept: "Finance" }, { id: "p-6", name: "Mariam Adel", role: "HR Officer", dept: "HR & Admin" }];
  if (key === "delta")
    return [owner, { id: "p-2", name: "Eng. Tarek Hamdy", role: "Operations Director", dept: "Machining" }, { id: "p-3", name: "Yasmine Fathy", role: "OEM Sales Director", dept: "OEM Sales" }, { id: "p-4", name: "Eng. Sherif Nabil", role: "Quality & IATF Manager", dept: "Quality (IATF)" }, { id: "p-5", name: "Eng. Hany Ragab", role: "Maintenance Manager", dept: "Maintenance" }, { id: "p-6", name: "Rania Zaki", role: "CFO", dept: "Finance" }, { id: "p-7", name: "Omar Lotfy", role: "HR & Training Manager", dept: "HR & Training" }];
  return [owner, { id: "p-2", name: "Sales Lead (to assign)", role: "Sales & Marketing Lead", dept: "Sales & Marketing" }, { id: "p-3", name: "Production Lead (to assign)", role: "Production Manager", dept: "Production" }, { id: "p-4", name: "Quality Lead (to assign)", role: "Quality Lead", dept: "Quality" }, { id: "p-5", name: "Finance Lead (to assign)", role: "Finance Manager", dept: "Finance" }];
}

export function seedBscDesign(factory: Factory, tier: TierLevel): BscDesignData {
  const p = profileOf(factory, tier);
  const strat = genObjectives(p, 0);
  const objectives: BscObjective[] = strat.map((o) => ({ id: `b-${o.id}`, perspective: o.perspective, title: o.title, strategyRef: o.id }));
  const supporting: Record<Perspective, string> =
    p.key === "delta"
      ? { financial: "Improve working-capital efficiency", customer: "Deliver 98%+ on time to every OEM", process: "Integrate supplier quality data", learning: "Embed a continuous-improvement culture" }
      : p.key === "al-noor"
        ? { financial: "Protect gross margin on local contracts", customer: "Respond to every enquiry within 24 hours", process: "Reduce changeover and waiting time", learning: "Create a culture of measuring and improving" }
        : { financial: "Improve cash and margin discipline", customer: "Improve delivery reliability", process: "Standardise core processes", learning: "Strengthen leadership and accountability" };
  (["financial", "customer", "process", "learning"] as Perspective[]).forEach((per) => {
    if (objectives.filter((o) => o.perspective === per).length < 2) objectives.push({ id: `b-sup-${per}`, perspective: per, title: supporting[per] });
  });
  const by = (per: Perspective) => objectives.filter((o) => o.perspective === per).map((o) => o.id);
  const links: [string, string][] = [];
  const connect = (from: Perspective, to: Perspective) => {
    const a = by(from), b = by(to);
    a.forEach((id, i) => links.push([id, b[i % b.length]]));
    if (b.length > a.length) b.slice(a.length).forEach((id, i) => links.push([a[i % a.length], id]));
  };
  connect("learning", "process");
  connect("process", "customer");
  connect("customer", "financial");
  return { version: 1, objectives, links, kpis: seedKpis(p, objectives, factory) };
}

function seedKpis(p: StrategyProfile, objectives: BscObjective[], factory: Factory): BscKpi[] {
  const people = peopleFor(factory);
  const ownerOf = (dept: string) => people.find((x) => x.dept === dept)?.name ?? people[0].name;
  const obj = (per: Perspective, n = 0) => objectives.filter((o) => o.perspective === per)[n]?.id ?? objectives[0].id;
  const depts = departmentsFor(p.key);
  type Row = [string, Perspective, number, string, string, number, number, "up" | "down", Frequency];
  const rows: Row[] =
    p.key === "al-noor"
      ? [
          ["Monthly revenue", "financial", 0, depts[5], "EGP M", 3.2, 4.2, "up", "Monthly"],
          ["Gross margin", "financial", 1, depts[5], "%", 21, 25, "up", "Monthly"],
          ["Export revenue share", "financial", 0, depts[1], "%", 0, 8, "up", "Quarterly"],
          ["Qualified buyer enquiries", "customer", 0, depts[1], "per month", 2, 15, "up", "Monthly"],
          ["Enquiry response time", "customer", 2, depts[1], "hours", 72, 24, "down", "Weekly"],
          ["On-time delivery", "customer", 1, depts[2], "%", 78, 92, "up", "Monthly"],
          ["Second-quality rate", "process", 1, depts[3], "%", 6.5, 3.5, "down", "Weekly"],
          ["Orders processed digitally", "process", 0, depts[0], "%", 0, 80, "up", "Monthly"],
          ["SOPs documented", "process", 1, depts[3], "count", 0, 12, "up", "Monthly"],
          ["Knitting machine utilisation", "process", 2, depts[2], "%", 64, 75, "up", "Weekly"],
          ["Staff trained on digital tools", "learning", 0, depts[4], "%", 5, 60, "up", "Quarterly"],
          ["Absenteeism", "learning", 1, depts[4], "%", 7, 4, "down", "Monthly"],
        ]
      : p.key === "delta"
        ? [
            ["Export revenue share", "financial", 0, depts[1], "%", 18, 26, "up", "Quarterly"],
            ["Cost of poor quality", "financial", 1, depts[6], "% of sales", 3.2, 2.4, "down", "Monthly"],
            ["EBITDA margin", "financial", 2, depts[6], "%", 14, 17, "up", "Monthly"],
            ["On-time delivery to OEMs", "customer", 2, depts[1], "%", 95.5, 98, "up", "Weekly"],
            ["Customer PPM", "customer", 0, depts[3], "PPM", 85, 40, "down", "Monthly"],
            ["New OEM programmes quoted", "customer", 1, depts[1], "count", 1, 4, "up", "Quarterly"],
            ["OEE — CNC lines", "process", 0, depts[2], "%", 68, 76, "up", "Weekly"],
            ["Unplanned downtime", "process", 0, depts[4], "%", 6.8, 3.5, "down", "Weekly"],
            ["Energy per tonne machined", "process", 1, depts[2], "kWh/t", 1450, 1250, "down", "Monthly"],
            ["Predictive alerts acted on in 48 h", "process", 2, depts[4], "%", 40, 90, "up", "Weekly"],
            ["Engineers certified in data analytics", "learning", 0, depts[5], "count", 4, 20, "up", "Quarterly"],
            ["Improvement ideas implemented", "learning", 1, depts[5], "per month", 6, 15, "up", "Monthly"],
          ]
        : [
            ["Monthly revenue growth (YoY)", "financial", 0, depts[5], "%", 4, 12, "up", "Monthly"],
            ["Gross margin", "financial", 1, depts[5], "%", 22, 25, "up", "Monthly"],
            ["New qualified buyers", "customer", 0, depts[1], "per quarter", 2, 6, "up", "Quarterly"],
            ["On-time delivery", "customer", 1, depts[2], "%", 80, 92, "up", "Monthly"],
            ["Defect / rework rate", "process", 0, depts[3], "%", 5, 3, "down", "Weekly"],
            ["Processes documented as SOPs", "process", 1, depts[3], "count", 2, 12, "up", "Monthly"],
            ["Production plan adherence", "process", 0, depts[2], "%", 72, 88, "up", "Weekly"],
            ["Staff trained on digital tools", "learning", 0, depts[4], "%", 10, 60, "up", "Quarterly"],
            ["Monthly KPI reviews held", "learning", 1, depts[0], "count", 0, 1, "up", "Monthly"],
          ];
  return rows.map(([name, per, n, dept, unit, baseline, target, direction, frequency], i) => ({ id: `kpi-${i + 1}`, name, objectiveId: obj(per, n), department: dept, unit, baseline, target, direction, owner: ownerOf(dept), frequency }));
}

const isBscDesign = (d: unknown): d is BscDesignData => typeof d === "object" && d !== null && Array.isArray((d as BscDesignData).kpis) && (d as BscDesignData).version === 1;

/** BSC design (persisted if present, otherwise the deterministic seed). */
export function getBscDesign(data: unknown, factory: Factory, tier: TierLevel): { design: BscDesignData; fromDesign: boolean } {
  return isBscDesign(data) ? { design: data, fromDesign: true } : { design: seedBscDesign(factory, tier), fromDesign: false };
}

// ---- Simulated actuals (bsc-execution) ----
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
/** Months with actuals in the demo period (Jan–Oct 2026). */
export const ACTUAL_MONTHS = 10;

/** Deterministic monthly actuals — trending from baseline toward a factory/KPI-specific attainment of the design target. */
export function simulateActuals(kpi: BscKpi, factoryKey: string): number[] {
  const r = rng(hashString(`${factoryKey}:${kpi.id}:${kpi.name}`));
  const attainment = 0.78 + r() * 0.3; // 0.78 – 1.08 of the journey
  const end = kpi.baseline + (kpi.target - kpi.baseline) * attainment;
  const span = Math.abs(kpi.target - kpi.baseline) || Math.abs(kpi.target) * 0.1 || 1;
  const out: number[] = [];
  for (let m = 0; m < ACTUAL_MONTHS; m++) {
    const t = (m + 1) / ACTUAL_MONTHS;
    const ease = 1 - Math.pow(1 - t, 1.6);
    const noise = (r() - 0.5) * span * 0.18;
    const v = kpi.baseline + (end - kpi.baseline) * ease + noise;
    out.push(Math.max(0, Math.round(v * 100) / 100));
  }
  return out;
}

export type Rag = "green" | "amber" | "red";
/** Attainment ratio (1 = on target) — direction aware. */
export function attainment(actual: number, target: number, baseline: number, direction: "up" | "down"): number {
  if (direction === "up") return target === 0 ? 1 : actual / target;
  if (actual <= target) return 1 + (target - actual) / Math.max(Math.abs(baseline - target), 1e-6) * 0.1;
  const span = Math.max(Math.abs(baseline - target), Math.abs(target) * 0.25, 1e-6);
  return Math.max(0, 1 - (actual - target) / span);
}
export const ragOf = (ratio: number): Rag => (ratio >= 0.97 ? "green" : ratio >= 0.88 ? "amber" : "red");

export const fmtVal = (v: number, unit: string) => {
  const n = Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : Number.isInteger(v) ? String(v) : v.toFixed(1);
  return unit === "%" ? `${n}%` : unit.startsWith("%") ? `${n}${unit}` : `${n} ${unit}`;
};
