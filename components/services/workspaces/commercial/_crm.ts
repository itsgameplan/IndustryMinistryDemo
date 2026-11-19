// CRM data model + deterministic seed. Shared by the crm-pipeline workspace and the sales chatbot
// ("Send to CRM" writes into the crm-pipeline service data using exactly this shape).
import { seedKeyFor } from "@/components/services/kit";
import type { Factory } from "@/lib/types";
import { hashRange, productProfiles } from "./_shared";

export type Stage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export const STAGES: { id: Stage; label: string; probability: number; color: string }[] = [
  { id: "new", label: "New", probability: 0.1, color: "#94A3B8" },
  { id: "qualified", label: "Qualified", probability: 0.25, color: "#38BDF8" },
  { id: "proposal", label: "Proposal", probability: 0.5, color: "#6366F1" },
  { id: "negotiation", label: "Negotiation", probability: 0.75, color: "#C9A24B" },
  { id: "won", label: "Won", probability: 1, color: "#0FA396" },
  { id: "lost", label: "Lost", probability: 0, color: "#EF4444" },
];
export const stageMeta = (s: Stage) => STAGES.find((x) => x.id === s) ?? STAGES[0];

export type DealSource = "Referral" | "Trade fair" | "Website" | "Sales chatbot" | "Tender" | "Marketplace" | "Repeat customer";

export interface Deal {
  id: string;
  company: string;
  country: string;
  contact: string;
  product: string;
  /** Deal value in USD. */
  value: number;
  stage: Stage;
  /** AI lead score 0–100. */
  score: number;
  /** Days since last logged activity. */
  idleDays: number;
  /** Expected close, months from now (0 = this month … 5). */
  closeIn: number;
  source: DealSource;
  note?: string;
}

export interface CrmData {
  deals: Deal[];
  /** Ids of deals created in this session's chatbot hand-off, highlighted on the board. */
  highlighted: string[];
}

export const AT_RISK_DAYS = 14;
export const isAtRisk = (d: Deal) => d.stage !== "won" && d.stage !== "lost" && d.idleDays >= AT_RISK_DAYS;

/** Deterministic "AI" score from deal attributes. */
export function scoreDeal(d: Pick<Deal, "stage" | "idleDays" | "value" | "source">, avgValue: number): number {
  const stagePts: Record<Stage, number> = { new: 18, qualified: 30, proposal: 42, negotiation: 52, won: 60, lost: 5 };
  const sourcePts: Record<DealSource, number> = { "Repeat customer": 20, Referral: 16, Tender: 10, "Trade fair": 12, "Sales chatbot": 11, Marketplace: 8, Website: 9 };
  const valuePts = Math.min(18, Math.round((d.value / Math.max(1, avgValue)) * 9));
  const idlePenalty = Math.min(30, Math.round(d.idleDays * 1.3));
  return Math.max(3, Math.min(99, stagePts[d.stage] + sourcePts[d.source] + valuePts - idlePenalty + 8));
}

type Row = [company: string, country: string, contact: string, productIdx: number, value: number, stage: Stage, idle: number, closeIn: number, source: DealSource];

const AL_NOOR_ROWS: Row[] = [
  ["Cairo Medica Hospitals", "Egypt", "Dr. Rania Fawzy", 3, 68000, "negotiation", 4, 0, "Tender"],
  ["Horizon Uniforms Co.", "Egypt", "Tarek Mansour", 2, 42000, "proposal", 9, 1, "Referral"],
  ["Sahara Retail Group", "Egypt", "Mai Selim", 1, 35000, "qualified", 17, 2, "Repeat customer"],
  ["Iberia Textil Trading S.L.", "Spain", "Lucía Romero", 0, 91000, "proposal", 6, 2, "Trade fair"],
  ["Rhein Workwear GmbH", "Germany", "Jonas Keller", 2, 120000, "qualified", 21, 3, "Marketplace"],
  ["Gulf Hospitality Supplies LLC", "UAE", "Omar Al Hashimi", 3, 54000, "negotiation", 2, 1, "Referral"],
  ["Najd Medical Supplies", "Saudi Arabia", "Faisal Al Qahtani", 3, 76000, "new", 3, 4, "Website"],
  ["Nairobi Garment Hub Ltd", "Kenya", "Grace Wanjiru", 0, 28000, "new", 15, 5, "Trade fair"],
  ["Alex Port Uniforms", "Egypt", "Hany Saad", 2, 22000, "won", 5, 0, "Repeat customer"],
  ["Delta School Wear", "Egypt", "Nadia Farouk", 1, 18000, "won", 11, 0, "Referral"],
  ["Levant Linen Traders", "Jordan", "Sami Haddad", 3, 31000, "lost", 40, 0, "Marketplace"],
  ["Coastal Resorts Group", "Egypt", "Yasmine Adel", 3, 26000, "proposal", 16, 1, "Website"],
];

const DELTA_ROWS: Row[] = [
  ["Nile Motors Assembly", "Egypt", "Eng. Khaled Ramzy", 1, 640000, "negotiation", 3, 1, "Repeat customer"],
  ["Atlas Auto Parts SARL", "Morocco", "Youssef Benali", 0, 310000, "proposal", 8, 2, "Trade fair"],
  ["Anatolia Brake Systems A.Ş.", "Turkey", "Elif Yıldız", 0, 450000, "qualified", 19, 3, "Marketplace"],
  ["Rhein Fahrzeugtechnik GmbH", "Germany", "Markus Brandt", 2, 780000, "proposal", 5, 3, "Referral"],
  ["Riyadh Fleet Services", "Saudi Arabia", "Abdullah Al Otaibi", 0, 260000, "negotiation", 16, 1, "Website"],
  ["Cape Axle Distributors (Pty) Ltd", "South Africa", "Thabo Nkosi", 3, 190000, "new", 2, 4, "Trade fair"],
  ["Suez Truck Components", "Egypt", "Ahmed Lotfy", 3, 140000, "won", 6, 0, "Repeat customer"],
  ["Ghazl Agricultural Machinery", "Egypt", "Mona Hegazy", 2, 95000, "won", 12, 0, "Referral"],
  ["Orion Pump Works", "Egypt", "Sherif Nabil", 2, 120000, "lost", 33, 0, "Tender"],
  ["MENA Aftermarket Hub", "UAE", "Rami Khoury", 0, 210000, "qualified", 7, 2, "Marketplace"],
  ["Casablanca Bus Body Works", "Morocco", "Salma Idrissi", 1, 175000, "new", 22, 5, "Website"],
  ["Bavaria Precision Drives", "Germany", "Katrin Vogel", 3, 520000, "qualified", 4, 4, "Trade fair"],
];

const GENERIC_COMPANIES: [string, string][] = [
  ["Nile Distribution Co.", "Egypt"], ["Canal Trading House", "Egypt"], ["Gulf Wholesale Partners", "UAE"], ["Najd Industrial Supply", "Saudi Arabia"], ["Mediterranean Sourcing S.L.", "Spain"],
  ["Upper Egypt Retail Group", "Egypt"], ["Amman Procurement Co.", "Jordan"], ["East Africa Imports Ltd", "Kenya"], ["Hanseatic Buyers GmbH", "Germany"], ["Delta Projects Contracting", "Egypt"],
];
const GENERIC_STAGES: Stage[] = ["new", "qualified", "proposal", "negotiation", "won", "proposal", "qualified", "new", "lost", "negotiation"];
const GENERIC_SOURCES: DealSource[] = ["Referral", "Website", "Trade fair", "Repeat customer", "Tender", "Marketplace", "Referral", "Website", "Marketplace", "Repeat customer"];
const CONTACTS = ["Ahmed Samir", "Laila Mostafa", "Karim Adel", "Sara Nabil", "Hossam Fathy", "Dina Kamal", "Walid Saber", "Reem Hassan", "Mahmoud Ezz", "Noha Youssef"];

export function crmSeed(factory: Factory): CrmData {
  const products = productProfiles(factory);
  const key = seedKeyFor(factory);
  let rows: Row[];
  if (key === "al-noor") rows = AL_NOOR_ROWS;
  else if (key === "delta") rows = DELTA_ROWS;
  else {
    const scale = Math.max(1, Math.round((factory.employees || 50) / 50));
    rows = GENERIC_COMPANIES.map(([company, country], i) => {
      const k = `${factory.name}|${company}`;
      return [company, country, CONTACTS[i], i % products.length, hashRange(k, 8, 60) * 1000 * scale, GENERIC_STAGES[i], hashRange(`${k}|idle`, 1, 24), GENERIC_STAGES[i] === "won" || GENERIC_STAGES[i] === "lost" ? 0 : hashRange(`${k}|close`, 0, 5), GENERIC_SOURCES[i]];
    });
  }
  const avg = rows.reduce((a, r) => a + r[4], 0) / rows.length;
  const deals: Deal[] = rows.map(([company, country, contact, pi, value, stage, idleDays, closeIn, source], i) => {
    const d = { id: `deal-${i + 1}`, company, country, contact, product: products[pi % products.length].name, value, stage, idleDays, closeIn, source, score: 0 };
    return { ...d, score: scoreDeal(d, avg) };
  });
  return { deals, highlighted: [] };
}
