import type { FactoryId, Requirement } from "@/lib/types";

export type Axis = "Presence" | "Governance" | "Finance & people" | "Operations" | "Quality & safety" | "AI & data";

export const AXES: { axis: Axis; categories: Requirement["category"][] }[] = [
  { axis: "Presence", categories: ["presence"] },
  { axis: "Governance", categories: ["governance"] },
  { axis: "Finance & people", categories: ["finance", "people"] },
  { axis: "Operations", categories: ["operations", "supply"] },
  { axis: "Quality & safety", categories: ["quality", "safety"] },
  { axis: "AI & data", categories: ["ai", "security", "export"] },
];

export interface Question {
  id: string;
  axis: Axis;
  title: string;
  help: string;
  /** Ordered from least to most mature. */
  options: { value: string; label: string; hint: string }[];
}

export const QUESTIONS: Question[] = [
  {
    id: "web",
    axis: "Presence",
    title: "How do buyers find your factory online?",
    help: "Export buyers and large retailers usually shortlist suppliers through a search before they ever call.",
    options: [
      { value: "none", label: "They don't — referrals only", hint: "No website or listings" },
      { value: "social", label: "A social media page", hint: "Facebook or Instagram only" },
      { value: "basic", label: "A basic website", hint: "Single language, rarely updated" },
      { value: "bilingual", label: "Bilingual website with catalogue", hint: "Arabic & English, products, contact" },
    ],
  },
  {
    id: "contact",
    axis: "Presence",
    title: "How do customers contact you for orders?",
    help: "Consistent business channels build trust and make inquiries traceable.",
    options: [
      { value: "personal", label: "Personal mobile numbers", hint: "Owner or sales staff phones" },
      { value: "shared", label: "A shared free email inbox", hint: "e.g. a Gmail account" },
      { value: "business", label: "Business email & WhatsApp Business", hint: "On a company domain" },
      { value: "crm", label: "Tracked in a CRM", hint: "Inquiries logged and assigned" },
    ],
  },
  {
    id: "accounting",
    axis: "Finance & people",
    title: "How is accounting and invoicing handled?",
    help: "Tier 2 requires digital accounting integrated with ETA e-invoicing.",
    options: [
      { value: "paper", label: "Paper ledgers", hint: "Accountant reconciles periodically" },
      { value: "excel", label: "Paper plus Excel", hint: "Spreadsheets at month end" },
      { value: "software", label: "Accounting software", hint: "Not connected to e-invoicing" },
      { value: "integrated", label: "Integrated with ETA e-invoicing", hint: "Within an ERP or accounting suite" },
    ],
  },
  {
    id: "hr",
    axis: "Finance & people",
    title: "How are attendance and payroll managed?",
    help: "Covers employee records, attendance, payroll and social insurance.",
    options: [
      { value: "none", label: "Informally", hint: "No central records" },
      { value: "book", label: "Manual attendance book", hint: "Payroll calculated by hand" },
      { value: "sheet", label: "Spreadsheets", hint: "Partly digital" },
      { value: "system", label: "HR & payroll system", hint: "Biometric attendance, digital payroll" },
    ],
  },
  {
    id: "sops",
    axis: "Governance",
    title: "Are policies and SOPs documented?",
    help: "Written procedures protect quality and safety when experienced staff are absent.",
    options: [
      { value: "none", label: "Not documented", hint: "Knowledge held by supervisors" },
      { value: "informal", label: "A few informal notes", hint: "Not approved or versioned" },
      { value: "partial", label: "Some approved SOPs", hint: "Key processes only" },
      { value: "full", label: "Complete approved set", hint: "Owned, versioned and reviewed" },
    ],
  },
  {
    id: "quality",
    axis: "Quality & safety",
    title: "How are quality and safety managed?",
    help: "From inspection records to a certified management system.",
    options: [
      { value: "adhoc", label: "Ad hoc checks", hint: "No written records" },
      { value: "paper", label: "Paper checklists", hint: "Inspection and incident logs" },
      { value: "digital", label: "Digital records", hint: "Incidents, PPE and inspections tracked" },
      { value: "certified", label: "Certified QMS", hint: "ISO 9001 / IATF 16949 aligned" },
    ],
  },
  {
    id: "erp",
    axis: "Operations",
    title: "How do you plan and track production?",
    help: "Inventory, work orders and line performance visibility.",
    options: [
      { value: "none", label: "Whiteboards and memory", hint: "No system" },
      { value: "sheets", label: "Spreadsheets", hint: "Updated daily or weekly" },
      { value: "partial", label: "Some ERP modules", hint: "Inventory or purchasing only" },
      { value: "full", label: "Full ERP with MES", hint: "Real-time work orders and OEE" },
    ],
  },
  {
    id: "machines",
    axis: "AI & data",
    title: "Are your machines connected?",
    help: "Sensor data is the foundation for predictive maintenance and AI operations.",
    options: [
      { value: "none", label: "No connectivity", hint: "Manual readings" },
      { value: "meters", label: "Some meters installed", hint: "Energy or counters, not analysed" },
      { value: "some", label: "Some machines stream data", hint: "Pilot line or PLC exports" },
      { value: "streaming", label: "Fleet streams telemetry", hint: "OPC-UA / MQTT across lines" },
    ],
  },
];

export const DEFAULT_ANSWERS: Record<FactoryId, Record<string, string>> = {
  "al-noor": { web: "none", contact: "personal", accounting: "excel", hr: "book", sops: "none", quality: "paper", erp: "sheets", machines: "none" },
  delta: { web: "bilingual", contact: "crm", accounting: "integrated", hr: "system", sops: "full", quality: "certified", erp: "full", machines: "streaming" },
};

/** Self-reported 0-100 per axis from questionnaire answers. */
export function selfReportedByAxis(answers: Record<string, string | string[]>): Record<Axis, number> {
  const acc = new Map<Axis, number[]>();
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    const idx = q.options.findIndex((o) => o.value === a);
    if (idx < 0) continue;
    acc.set(q.axis, [...(acc.get(q.axis) ?? []), (idx / (q.options.length - 1)) * 100]);
  }
  const out = {} as Record<Axis, number>;
  for (const { axis } of AXES) {
    const v = acc.get(axis);
    out[axis] = v && v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0;
  }
  return out;
}
