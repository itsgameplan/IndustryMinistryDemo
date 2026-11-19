// JZ-022 simulated sign-up — static lookups, requirement mapping and profile builder. Pure, no side effects.
import { REQUIREMENTS, tierDef } from "@/lib/data/tiers";
import { computeTier } from "@/lib/tier";
import type { Assessment, BusinessObjective, EmployeeRange, ExportStatus, Factory, FactoryId, Requirement, TierLevel } from "@/lib/types";

export const DEMO_OTP = "123456";
export const CURRENT_YEAR = new Date().getFullYear();

// ---------------- Wizard draft ----------------
export type SystemId =
  | "website" | "email" | "whatsapp" | "accounting" | "einvoice" | "hr" | "policies" | "sops"
  | "safety" | "inventory" | "erp" | "mes" | "qms" | "iot" | "crm" | "none";

export type IndustryId = "textiles" | "food" | "engineering" | "chemicals" | "building" | "furniture" | "pharma" | "electrical" | "printing" | "other";
export type PlanId = "starter" | "growth" | "industry40";

export interface AccountDraft {
  name: string;
  email: string;
  whatsapp: string;
  verified: boolean;
}

export interface FactoryDraft {
  whatsapp: string;
  name: string;
  nameAr: string;
  registrationNo: string;
  address: string;
  governorate: string;
  founded: string;
  products: string[];
  industry: IndustryId | "";
  employeeRange: EmployeeRange | "";
  systems: SystemId[];
  exportStatus: ExportStatus | "";
  objectives: BusinessObjective[];
}

/** Never contains a password — the optional password field lives only in Step 1 component state. */
export interface Draft {
  step: number;
  account: AccountDraft;
  factory: FactoryDraft;
  plan: PlanId | null;
}

export const EMPTY_DRAFT: Draft = {
  step: 0,
  account: { name: "", email: "", whatsapp: "", verified: false },
  factory: { whatsapp: "", name: "", nameAr: "", registrationNo: "", address: "", governorate: "", founded: "", products: [], industry: "", employeeRange: "", systems: [], exportStatus: "", objectives: [] },
  plan: null,
};

export const STEPS = [
  { id: "account", label: "Account" },
  { id: "factory", label: "Factory details" },
  { id: "analysis", label: "AI assessment" },
  { id: "results", label: "Results" },
  { id: "plan", label: "Subscription" },
  { id: "activate", label: "Activation" },
] as const;

// ---------------- Lookups ----------------
export const GOVERNORATES = [
  "Cairo", "Giza", "Alexandria", "Qalyubia", "Sharqia", "Dakahlia", "Gharbia", "Monufia", "Beheira", "Kafr El Sheikh",
  "Damietta", "Port Said", "Ismailia", "Suez", "Faiyum", "Beni Suef", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan",
  "Red Sea", "New Valley", "Matrouh", "North Sinai", "South Sinai",
] as const;

/** Approximate industrial-area coordinates; anything else falls back to Cairo. */
const GOVERNORATE_COORDS: Record<string, { lat: number; lng: number }> = {
  Cairo: { lat: 30.0444, lng: 31.2357 },
  Giza: { lat: 30.0131, lng: 31.2089 },
  Alexandria: { lat: 31.2001, lng: 29.9187 },
  Qalyubia: { lat: 30.1286, lng: 31.2422 },
  Sharqia: { lat: 30.2936, lng: 31.7451 },
  Dakahlia: { lat: 31.0409, lng: 31.3785 },
  Gharbia: { lat: 30.9697, lng: 31.1681 },
  Monufia: { lat: 30.3667, lng: 30.5167 },
  Beheira: { lat: 31.0341, lng: 30.4682 },
  Damietta: { lat: 31.4165, lng: 31.8133 },
  "Port Said": { lat: 31.2653, lng: 32.3019 },
  Ismailia: { lat: 30.5965, lng: 32.2715 },
  Suez: { lat: 29.9668, lng: 32.5498 },
  Faiyum: { lat: 29.3084, lng: 30.8428 },
  "Beni Suef": { lat: 29.0661, lng: 31.0994 },
  Minya: { lat: 28.0871, lng: 30.7618 },
  Asyut: { lat: 27.1783, lng: 31.1859 },
  Sohag: { lat: 26.5591, lng: 31.6957 },
};
export const coordsFor = (gov: string) => GOVERNORATE_COORDS[gov] ?? GOVERNORATE_COORDS.Cairo;

export const INDUSTRIES: { id: IndustryId; en: string; ar: string }[] = [
  { id: "textiles", en: "Textiles & garments", ar: "المنسوجات والملابس الجاهزة" },
  { id: "food", en: "Food & beverages", ar: "الصناعات الغذائية والمشروبات" },
  { id: "engineering", en: "Engineering & automotive components", ar: "الصناعات الهندسية ومكونات السيارات" },
  { id: "chemicals", en: "Chemicals & plastics", ar: "الكيماويات والبلاستيك" },
  { id: "building", en: "Building materials", ar: "مواد البناء" },
  { id: "furniture", en: "Furniture & wood", ar: "الأثاث والأخشاب" },
  { id: "pharma", en: "Pharmaceuticals", ar: "الصناعات الدوائية" },
  { id: "electrical", en: "Electrical & electronics", ar: "الصناعات الكهربائية والإلكترونية" },
  { id: "printing", en: "Printing & packaging", ar: "الطباعة والتغليف" },
  { id: "other", en: "Other manufacturing", ar: "صناعات أخرى" },
];
export const industryOf = (id: IndustryId | "") => INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES[INDUSTRIES.length - 1];

export const EMPLOYEE_RANGES: { id: EmployeeRange; label: string; midpoint: number; siteArea: number }[] = [
  { id: "1-49", label: "1–49", midpoint: 25, siteArea: 1800 },
  { id: "50-199", label: "50–199", midpoint: 120, siteArea: 6500 },
  { id: "200-499", label: "200–499", midpoint: 340, siteArea: 18000 },
  { id: "500+", label: "500+", midpoint: 650, siteArea: 42000 },
];

export const EXPORT_OPTIONS: { id: ExportStatus; label: string; hint: string }[] = [
  { id: "none", label: "Not exporting", hint: "Local market only" },
  { id: "exploring", label: "Exploring", hint: "Looking at first markets" },
  { id: "occasional", label: "Occasional", hint: "Some export orders" },
  { id: "regular", label: "Regular exporter", hint: "Exports every year" },
];

export const SYSTEMS: { id: SystemId; label: string }[] = [
  { id: "website", label: "Website" },
  { id: "email", label: "Business email" },
  { id: "whatsapp", label: "WhatsApp Business" },
  { id: "accounting", label: "Accounting software" },
  { id: "einvoice", label: "E-invoicing (ETA)" },
  { id: "hr", label: "HR & payroll" },
  { id: "policies", label: "Written policies" },
  { id: "sops", label: "Documented SOPs" },
  { id: "safety", label: "Safety management" },
  { id: "inventory", label: "Inventory system" },
  { id: "erp", label: "ERP" },
  { id: "mes", label: "MES / production tracking" },
  { id: "qms", label: "Quality management system (ISO 9001)" },
  { id: "iot", label: "Connected machines / IoT" },
  { id: "crm", label: "CRM" },
  { id: "none", label: "None yet" },
];
export const systemLabel = (id: SystemId) => SYSTEMS.find((s) => s.id === id)?.label ?? id;

// ---------------- Requirement mapping (deterministic) ----------------
export function mapRequirements(systems: SystemId[]): string[] {
  const has = (s: SystemId) => systems.includes(s);
  const out: string[] = [];
  if (has("website")) out.push("t1-website");
  if ((has("email") && has("whatsapp")) || (has("website") && (has("email") || has("whatsapp")))) out.push("t1-contact");
  if (has("policies")) out.push("t1-governance");
  if (has("sops")) out.push("t1-sop");
  if (has("accounting") && has("einvoice")) out.push("t2-accounting");
  if (has("hr")) out.push("t2-hr");
  if (has("safety")) out.push("t2-safety");
  if (has("policies") && has("sops")) out.push("t2-policies");
  if (has("inventory")) out.push("t3-inventory");
  if (has("erp")) out.push("t3-suppliers");
  if (has("mes")) out.push("t3-production");
  if (has("qms")) out.push("t3-quality");
  if (has("qms") && has("policies") && has("erp")) out.push("t3-governance");
  return out;
}

/** Plain-language technology upgrade for each requirement. */
export const TECH_FOR_REQUIREMENT: Record<string, { tech: string; detail: string }> = {
  "t1-website": { tech: "Bilingual business website", detail: "Arabic/English site with products, capabilities and map location." },
  "t1-contact": { tech: "Business email + WhatsApp Business", detail: "A company domain email and a verified WhatsApp Business profile." },
  "t1-governance": { tech: "Policy starter pack", detail: "Code of conduct, data handling and health & safety statements." },
  "t1-sop": { tech: "Digital SOP library", detail: "Step-by-step procedures for your core production processes." },
  "t2-accounting": { tech: "Cloud accounting with ETA e-invoicing", detail: "Invoices issued and submitted to the Tax Authority automatically." },
  "t2-hr": { tech: "HR & payroll system", detail: "Digital attendance, payroll and social insurance records." },
  "t2-safety": { tech: "Safety management app", detail: "Incident reporting, PPE tracking and training logs on mobile." },
  "t2-policies": { tech: "Policy & SOP management workspace", detail: "Approved, versioned policies covering every operational area." },
  "t3-inventory": { tech: "Inventory & warehouse system", detail: "Live stock of raw material, WIP and finished goods." },
  "t3-suppliers": { tech: "ERP purchasing & supplier module", detail: "Purchase orders, supplier qualification and scoring." },
  "t3-production": { tech: "MES / production tracking", detail: "Digital work orders and line-level OEE." },
  "t3-quality": { tech: "Quality management system", detail: "ISO 9001-aligned inspections and non-conformance workflow." },
  "t3-governance": { tech: "Internal audit & risk register", detail: "Management review cadence backed by QMS and ERP data." },
  "t4-predictive": { tech: "Machine sensors + predictive maintenance", detail: "Vibration and temperature sensors feeding failure prediction." },
  "t4-ai-ops": { tech: "AI operations copilot", detail: "AI recommendations in daily planning with human oversight." },
  "t4-quality-ai": { tech: "Vision-based quality control", detail: "Cameras and AI models that flag defects on the line." },
  "t4-energy": { tech: "Smart energy metering", detail: "Sub-meters with AI load and tariff optimisation." },
  "t4-cyber": { tech: "OT/IT cybersecurity programme", detail: "Asset inventory, security policy and incident response plan." },
  "t4-export": { tech: "Traceability & export documentation", detail: "Batch traceability and complete export paperwork." },
};

export function missingForNextTier(completed: string[]): { next: TierLevel | null; missing: Requirement[] } {
  const tier = computeTier(completed);
  if (tier === 4) return { next: null, missing: [] };
  const next = (tier + 1) as TierLevel;
  return { next, missing: REQUIREMENTS.filter((r) => r.tier === next && !completed.includes(r.id)) };
}

// ---------------- Subscription plans (illustrative) ----------------
export const PLANS: { id: PlanId; name: string; tiers: string; priceEgp: number; tagline: string; features: string[] }[] = [
  {
    id: "starter",
    name: "Starter",
    tiers: "For Tier 0–1 factories",
    priceEgp: 24000,
    tagline: "Get visible and organised",
    features: ["AI-built bilingual website", "Policy & SOP starter workspace", "Maturity roadmap & tier tracking", "2 IMC service workspaces"],
  },
  {
    id: "growth",
    name: "Growth",
    tiers: "For Tier 2 factories",
    priceEgp: 72000,
    tagline: "Connect the back office",
    features: ["Everything in Starter", "Compliance & safety workspaces", "Export and sales AI services", "6 IMC service workspaces", "Quarterly advisor review (simulated)"],
  },
  {
    id: "industry40",
    name: "Industry 4.0",
    tiers: "For Tier 3–4 factories",
    priceEgp: 180000,
    tagline: "AI-driven operations",
    features: ["Everything in Growth", "Predictive maintenance & digital twin", "Enterprise BI & process mining", "All 21 IMC service workspaces", "Dedicated transformation lead (simulated)"],
  },
];
export const planForTier = (tier: TierLevel): PlanId => (tier <= 1 ? "starter" : tier === 2 ? "growth" : "industry40");

// ---------------- Validation helpers ----------------
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Accepts 01XXXXXXXXX, +201XXXXXXXXX, 00201XXXXXXXXX (spaces/dashes allowed). Returns +20 1XX XXX XXXX or null. */
export function normalizeEgyptMobile(v: string): string | null {
  let d = v.replace(/[^\d]/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^1[0125]\d{8}$/.test(d)) return null;
  return `+20 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "F";

// ---------------- Derived assessment ----------------
export function assess(draft: Draft) {
  const completed = mapRequirements(draft.factory.systems);
  const tier = computeTier(completed);
  return { completed, tier };
}

export function buildAnswers(draft: Draft): Assessment["answers"] {
  const f = draft.factory;
  return {
    contactName: draft.account.name.trim(),
    email: draft.account.email.trim(),
    whatsapp: f.whatsapp,
    factoryName: f.name.trim(),
    factoryNameAr: f.nameAr.trim(),
    registrationNo: f.registrationNo.trim(),
    address: f.address.trim(),
    governorate: f.governorate,
    founded: f.founded,
    industry: industryOf(f.industry).en,
    products: f.products,
    employeeRange: f.employeeRange,
    existingSystems: f.systems.map(systemLabel),
    exportStatus: f.exportStatus,
    objectives: f.objectives,
    plan: draft.plan ?? "",
  };
}

/** Builds a complete Factory profile from the wizard draft. `now` is passed in to keep this pure. */
export function buildFactoryProfile(draft: Draft, now: number, id: FactoryId = `reg-${now.toString(36)}`): Factory {
  const f = draft.factory;
  const { completed, tier } = assess(draft);
  const industry = industryOf(f.industry);
  const range = EMPLOYEE_RANGES.find((r) => r.id === f.employeeRange) ?? EMPLOYEE_RANGES[0];
  const name = f.name.trim() || "New factory";
  const offered = SYSTEMS.filter((s) => s.id !== "none");
  const activeCount = f.systems.filter((s) => s !== "none").length;
  const products = f.products.length ? f.products : ["General manufacturing"];
  const founded = Number.parseInt(f.founded, 10);
  const contactName = draft.account.name.trim();
  const productText = products.slice(0, 2).join(" and ").toLowerCase();

  return {
    id,
    name,
    nameAr: f.nameAr.trim() || name,
    industry: industry.en,
    industryAr: industry.ar,
    location: f.address.trim(),
    governorate: f.governorate || "Cairo",
    coordinates: coordsFor(f.governorate),
    founded: Number.isFinite(founded) && founded >= 1900 && founded <= CURRENT_YEAR ? founded : CURRENT_YEAR,
    employees: range.midpoint,
    annualRevenueEgp: "Not disclosed",
    products,
    owner: { name: contactName || "Factory owner", title: "Owner / Manager", initials: initialsOf(contactName) },
    registrationNo: f.registrationNo.trim(),
    licenseNo: "Pending verification",
    siteAreaM2: range.siteArea,
    baselineTier: tier,
    baselineRequirements: completed,
    systems: offered.map((s) => ({ name: s.label, status: f.systems.includes(s.id) ? ("active" as const) : ("missing" as const) })),
    recommendedSolutions: [],
    targetOutcome: `Ready for Tier ${Math.min(tier + 1, 4)} verification`,
    experience: "approachable",
    summary: `${name} is a ${range.label}-employee ${industry.en.toLowerCase()} manufacturer in ${f.governorate || "Cairo"} producing ${productText}, with ${activeCount} digital system${activeCount === 1 ? "" : "s"} in place and a proposed Tier ${tier} (${tierDef(tier).name}) starting point.`,
    exportStatus: f.exportStatus || undefined,
    objectives: f.objectives,
    registration: {
      contactName,
      email: draft.account.email.trim(),
      whatsapp: f.whatsapp,
      employeeRange: range.id,
      existingSystems: f.systems.filter((s) => s !== "none").map(systemLabel),
      registeredAt: now,
      verification: "unverified",
    },
  };
}
