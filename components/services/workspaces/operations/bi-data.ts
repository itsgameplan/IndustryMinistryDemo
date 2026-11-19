// Deterministic mock data model for the Enterprise BI workspace (fictional, illustrative).
import type { Factory } from "@/lib/types";
import { seedKeyFor } from "@/components/services/kit";
import { annualRevenueM, hashStr, rng } from "./shared";

export type Period = "month" | "quarter" | "ytd" | "12m";
export type Area = "financial" | "sales" | "production" | "hr" | "operations";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** 24 months: Dec 2024 … Nov 2026. */
export const MONTH_LABELS = Array.from({ length: 24 }, (_, i) => {
  const mi = (11 + i) % 12;
  const y = 2024 + Math.floor((11 + i) / 12);
  return `${MONTHS[mi]} ${String(y).slice(2)}`;
});

export interface MonthRow {
  rev: number[][]; // [line][customer] EGP M
  cogs: number[]; // per line EGP M
  cost: { materials: number; labour: number; energy: number; overhead: number };
  oee: number[]; // per production line %
  units: number;
  otd: number;
  headcount: number[]; // per department
  absenteeism: number;
  turnover: number;
  ccc: number;
  scrap: number;
  leadTime: number;
  inventoryDays: number;
  energyPerUnit: number;
}

export interface BIModel {
  lines: string[];
  customers: string[];
  departments: string[];
  prodLines: string[];
  downtime: { name: string; hours: number }[];
  lateCauses: { name: string; share: number }[];
  months: MonthRow[];
  oeeEstimated: boolean;
  annualRevenue: number;
  unitLabel: string;
  weakLineNote: string;
  /** Translatable template for weakLineNote (rendered with the line's OEE value as {v}). */
  weakLineMsg?: InsightMsg;
}

export function buildModel(factory: Factory): BIModel {
  const key = seedKeyFor(factory);
  const r = rng(hashStr(`bi:${factory.id}:${factory.name}`));
  const annual = annualRevenueM(factory);
  const lines = factory.products.slice(0, 4).length ? factory.products.slice(0, 4) : ["Core products", "Custom orders", "Spare parts"];
  const shares = [0.38, 0.27, 0.21, 0.14].slice(0, lines.length);
  const shareSum = shares.reduce((a, b) => a + b, 0);
  const margins = key === "delta" ? [0.24, 0.29, 0.33, 0.27] : key === "al-noor" ? [0.22, 0.31, 0.27, 0.19] : lines.map(() => 0.2 + r() * 0.14);
  const growth = key === "delta" ? [0.09, 0.14, 0.18, 0.06] : key === "al-noor" ? [0.04, 0.12, 0.08, -0.03] : lines.map(() => -0.02 + r() * 0.16);

  const customers =
    key === "delta" ? ["Nile Motors Assembly", "Suez Auto Group", "Cairo Truck Works", "Aftermarket distributors"]
      : key === "al-noor" ? ["Retail chains", "Hospital tenders", "Corporate uniforms", "Wholesale traders"]
        : ["Distributor network", "Direct industrial buyers", "Retail chains", "Government tenders"];
  const custMatrix = lines.map(() => {
    const raw = customers.map(() => 0.4 + r());
    const s = raw.reduce((a, b) => a + b, 0);
    return raw.map((v) => v / s);
  });

  const departments = key === "delta" ? ["Production", "Maintenance", "Quality", "Engineering", "Admin & sales"]
    : key === "al-noor" ? ["Knitting", "Dyeing", "Sewing", "QC & packing", "Admin & sales"]
      : ["Production", "Maintenance", "Quality", "Logistics", "Admin & sales"];
  const deptShare = [0.46, 0.12, 0.12, 0.12, 0.18];
  const prodLines = key === "delta" ? ["Line A · Housings", "Line B · Shafts", "Line C · Knuckles"] : key === "al-noor" ? ["Knitting", "Dyeing", "Sewing"] : ["Line 1", "Line 2", "Line 3"];
  const oeeBase = key === "delta" ? [71, 82, 78] : key === "al-noor" ? [64, 55, 61] : [66, 70, 62];

  const monthlyBase = annual / 12;
  const months: MonthRow[] = Array.from({ length: 24 }, (_, i) => {
    const calMonth = (11 + i) % 12;
    const season = 1 + 0.07 * Math.sin(((calMonth - 2) / 12) * Math.PI * 2) + (calMonth === 7 ? -0.06 : 0);
    const t = (i - 12) / 12;
    const rev = lines.map((_, li) => {
      const total = monthlyBase * (shares[li] / shareSum) * season * (1 + growth[li] * t) * (0.94 + r() * 0.12);
      return custMatrix[li].map((c) => total * c);
    });
    const cogs = rev.map((row, li) => row.reduce((a, b) => a + b, 0) * (1 - margins[li] * (0.9 + r() * 0.2)));
    const cogsTotal = cogs.reduce((a, b) => a + b, 0);
    const energyShare = 0.1 + i * 0.0015;
    const cncDip = key === "delta" && i >= 17 && i <= 21 ? -(4 - Math.abs(19 - i) * 1.3) : 0;
    const oee = oeeBase.map((b, li) => Math.min(92, b + i * 0.15 + (li === 0 ? cncDip : 0) + (r() - 0.5) * 3));
    const hc = Math.round(factory.employees * (0.94 + 0.06 * (i / 23)));
    return {
      rev, cogs,
      cost: { materials: cogsTotal * (0.6 - energyShare / 2), labour: cogsTotal * 0.21, energy: cogsTotal * energyShare, overhead: cogsTotal * (0.19 - energyShare / 2) },
      oee,
      units: Math.round((key === "delta" ? 52000 : key === "al-noor" ? 38000 : 20000) * season * (1 + 0.08 * t) * (0.95 + r() * 0.1)),
      otd: Math.min(98, (key === "delta" ? 88 : key === "al-noor" ? 74 : 81) + i * 0.22 + (r() - 0.5) * 4 + cncDip * 0.6),
      headcount: deptShare.map((s, di) => (di === deptShare.length - 1 ? hc - deptShare.slice(0, -1).reduce((a, x) => a + Math.round(hc * x), 0) : Math.round(hc * s))),
      absenteeism: (key === "al-noor" ? 6.2 : 3.9) - i * 0.03 + (r() - 0.5) * 0.8,
      turnover: (key === "al-noor" ? 2.6 : 1.4) + (r() - 0.5) * 0.6,
      ccc: (key === "delta" ? 72 : key === "al-noor" ? 98 : 84) - i * 0.4 + (r() - 0.5) * 4,
      scrap: Math.max(0.6, (key === "delta" ? 3.1 : 4.6) - i * 0.03 + (r() - 0.5) * 0.6 - cncDip * 0.15),
      leadTime: (key === "delta" ? 11 : 15) - i * 0.06 + (r() - 0.5) * 1.2,
      inventoryDays: (key === "delta" ? 46 : 63) - i * 0.25 + (r() - 0.5) * 3,
      energyPerUnit: (key === "delta" ? 4.1 : 1.8) * (1 + i * 0.004) * (0.97 + r() * 0.06),
    };
  });

  return {
    lines, customers, departments, prodLines, months, annualRevenue: annual,
    oeeEstimated: key !== "delta" && factory.baselineTier < 3,
    unitLabel: key === "delta" ? "parts" : key === "al-noor" ? "garments" : "units",
    downtime: key === "delta"
      ? [{ name: "Breakdowns (CNC-07)", hours: 118 }, { name: "Changeovers", hours: 96 }, { name: "Material waits", hours: 54 }, { name: "Quality holds", hours: 38 }, { name: "Planned maintenance", hours: 72 }]
      : [{ name: "Breakdowns", hours: 84 }, { name: "Changeovers", hours: 70 }, { name: "Material waits", hours: 92 }, { name: "Colour / quality holds", hours: 46 }, { name: "Power cuts", hours: 28 }],
    lateCauses: key === "delta"
      ? [{ name: "CNC capacity", share: 41 }, { name: "Heat-treatment queue", share: 24 }, { name: "Quality rework", share: 21 }, { name: "Transport", share: 14 }]
      : [{ name: "Colour approval", share: 34 }, { name: "Material shortage", share: 27 }, { name: "Rework", share: 22 }, { name: "Transport", share: 17 }],
    weakLineNote: key === "delta" ? "Line A · Housings is held back by CNC-07's degraded condition" : `${prodLines[1]} has the lowest equipment effectiveness`,
    weakLineMsg: key === "delta" ? { k: "Line A · Housings is held back by CNC-07's degraded condition ({v}%)." } : { k: "{line} has the lowest equipment effectiveness ({v}%).", v: { line: prodLines[1] } },
  };
}

export function periodWindows(p: Period): { cur: number[]; cmp: number[]; chart: number[]; label: string; cmpLabel: string } {
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  switch (p) {
    case "month": return { cur: [23], cmp: [22], chart: range(12, 23), label: "Nov 2026", cmpLabel: "Oct 2026" };
    case "quarter": return { cur: range(21, 23), cmp: range(18, 20), chart: range(12, 23), label: "Sep–Nov 2026", cmpLabel: "previous quarter" };
    case "ytd": return { cur: range(13, 23), cmp: range(1, 11), chart: range(13, 23), label: "YTD 2026", cmpLabel: "YTD 2025" };
    default: return { cur: range(12, 23), cmp: range(0, 11), chart: range(12, 23), label: "Last 12 months", cmpLabel: "prior 12 months" };
  }
}

export interface Filters { line: number; customer: number }

export const lineRevenue = (m: MonthRow, li: number, f: Filters) => m.rev[li].reduce((a, v, ci) => (f.customer < 0 || f.customer === ci ? a + v : a), 0);
export const revenue = (m: MonthRow, f: Filters) => m.rev.reduce((a, _, li) => (f.line < 0 || f.line === li ? a + lineRevenue(m, li, f) : a), 0);
export function grossMargin(m: MonthRow, f: Filters) {
  let rev = 0, cogs = 0;
  m.rev.forEach((_, li) => {
    if (f.line >= 0 && f.line !== li) return;
    const full = m.rev[li].reduce((a, b) => a + b, 0);
    const part = lineRevenue(m, li, f);
    rev += part;
    cogs += full ? m.cogs[li] * (part / full) : 0;
  });
  return rev ? ((rev - cogs) / rev) * 100 : 0;
}
export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const oeeAvg = (m: MonthRow) => avg(m.oee);

/** Translatable message: English template key plus variables (string variables are translated at render time). */
export interface InsightMsg { k: string; v?: Record<string, string | number> }
export interface Insight { tone: "good" | "warn" | "bad"; title: string; text: string; i18n?: { title: InsightMsg; text: InsightMsg[] } }

export function contextKey(period: Period, area: Area, f: Filters) {
  return `${period}|${area}|${f.line}|${f.customer}`;
}

export function generateInsights(model: BIModel, period: Period, area: Area, f: Filters): Insight[] {
  const w = periodWindows(period);
  const pick = (idx: number[]) => idx.map((i) => model.months[i]);
  const cur = pick(w.cur), cmp = pick(w.cmp);
  const revCur = sum(cur.map((m) => revenue(m, f))), revCmp = sum(cmp.map((m) => revenue(m, f)));
  const revChg = revCmp ? ((revCur - revCmp) / revCmp) * 100 : 0;
  const scope = [f.line >= 0 ? model.lines[f.line] : null, f.customer >= 0 ? model.customers[f.customer] : null].filter(Boolean).join(" · ") || "all business";
  const lineGrowth = model.lines.map((name, li) => {
    if (f.line >= 0 && f.line !== li) return null;
    const a = sum(cur.map((m) => lineRevenue(m, li, f))), b = sum(cmp.map((m) => lineRevenue(m, li, f)));
    const marg = avg(cur.map((m) => grossMargin(m, { line: li, customer: f.customer })));
    return { name, g: b ? ((a - b) / b) * 100 : 0, marg };
  }).filter((x): x is { name: string; g: number; marg: number } => x !== null);
  const best = [...lineGrowth].sort((a, b) => b.g - a.g)[0];
  const lowMargin = [...lineGrowth].sort((a, b) => a.marg - b.marg)[0];
  const gmCur = avg(cur.map((m) => grossMargin(m, f))), gmCmp = avg(cmp.map((m) => grossMargin(m, f)));
  const oeeCur = avg(cur.map(oeeAvg)), oeeCmp = avg(cmp.map(oeeAvg));
  const lineOee = model.prodLines.map((n, i) => ({ n, v: avg(cur.map((m) => m.oee[i])) })).sort((a, b) => a.v - b.v);
  const otd = avg(cur.map((m) => m.otd));
  const ccc = cur[cur.length - 1].ccc, cccPrev = cmp[cmp.length - 1].ccc;
  const daily = model.annualRevenue / 365;
  const hc = sum(cur[cur.length - 1].headcount), hcPrev = sum(cmp[cmp.length - 1].headcount);
  const abs = avg(cur.map((m) => m.absenteeism));
  const scrap = avg(cur.map((m) => m.scrap)), scrapPrev = avg(cmp.map((m) => m.scrap));

  const sgn = (n: number, d: number) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;
  const weak = model.weakLineMsg ?? { k: "{line} has the lowest equipment effectiveness ({v}%).", v: { line: lineOee[0].n } };
  const i18n: Record<string, Insight["i18n"]> = {
    revenue: { title: { k: revChg >= 0 ? "Revenue up {pct}%" : "Revenue down {pct}%", v: { pct: Math.abs(revChg).toFixed(1) } }, text: [{ k: "{period} revenue for {scope} is EGP {value}M vs {cmp}.", v: { period: w.label, scope, value: revCur.toFixed(1), cmp: w.cmpLabel } }, ...(best && lineGrowth.length > 1 ? [{ k: "{line} is the fastest-growing line ({growth}%).", v: { line: best.name, growth: sgn(best.g, 0) } }] : [])] },
    margin: { title: { k: "Gross margin {gm}% ({delta} pts)", v: { gm: gmCur.toFixed(1), delta: sgn(gmCur - gmCmp, 1) } }, text: [lowMargin && lineGrowth.length > 1 ? { k: "{line} has the lowest margin at {margin}% — review pricing and material cost before growing volume.", v: { line: lowMargin.name, margin: lowMargin.marg.toFixed(1) } } : { k: "Margin trend for {scope}; energy now represents a rising share of production cost.", v: { scope } }] },
    oee: { title: { k: model.oeeEstimated ? "Estimated OEE {v}% ({delta} pts)" : "OEE {v}% ({delta} pts)", v: { v: oeeCur.toFixed(1), delta: sgn(oeeCur - oeeCmp, 1) } }, text: [{ k: weak.k, v: { ...weak.v, v: lineOee[0].v.toFixed(0) } }, { k: "World-class benchmark is ~85%." }, ...(model.oeeEstimated ? [{ k: "Figures are estimated from manual counts until machine data is captured." }] : [])] },
    otd: { title: { k: "On-time delivery {v}%", v: { v: otd.toFixed(1) } }, text: [{ k: "Below a 95% target. {cause1} explains {share1}% of late orders, followed by {cause2} ({share2}%).", v: { cause1: model.lateCauses[0].name, share1: model.lateCauses[0].share, cause2: model.lateCauses[1].name, share2: model.lateCauses[1].share } }] },
    cash: { title: { k: "Cash conversion cycle {v} days", v: { v: ccc.toFixed(0) } }, text: [{ k: ccc <= cccPrev ? "Improved by {days} days vs {cmp}. Each 5-day reduction frees roughly EGP {value}M of working capital." : "Worsened by {days} days vs {cmp}. Each 5-day reduction frees roughly EGP {value}M of working capital.", v: { days: Math.abs(ccc - cccPrev).toFixed(0), cmp: w.cmpLabel, value: (daily * 5).toFixed(1) } }] },
    people: { title: { k: "Headcount {hc} ({delta})", v: { hc, delta: sgn(hc - hcPrev, 0) } }, text: [{ k: "Absenteeism averages {abs}%. {dept} holds {share}% of staff — prioritise multi-skilling there.", v: { abs: abs.toFixed(1), dept: model.departments[0], share: Math.round((cur[cur.length - 1].headcount[0] / hc) * 100) } }] },
    scrap: { title: { k: "Scrap rate {v}%", v: { v: scrap.toFixed(1) } }, text: [{ k: scrap <= scrapPrev ? "Down from {prev}%." : "Up from {prev}%.", v: { prev: scrapPrev.toFixed(1) } }, { k: "At current volume, every 1 pt of scrap costs about EGP {value}M per month in materials and labour.", v: { value: ((revCur / Math.max(1, w.cur.length)) * 0.01 * 0.7).toFixed(2) } }] },
  };
  const items: Record<string, Insight> = {
    revenue: { tone: revChg >= 0 ? "good" : "bad", title: `Revenue ${revChg >= 0 ? "up" : "down"} ${Math.abs(revChg).toFixed(1)}%`, text: `${w.label} revenue for ${scope} is EGP ${revCur.toFixed(1)}M vs ${w.cmpLabel}.${best && lineGrowth.length > 1 ? ` ${best.name} is the fastest-growing line (${best.g >= 0 ? "+" : ""}${best.g.toFixed(0)}%).` : ""}` },
    margin: { tone: gmCur >= gmCmp ? "good" : "warn", title: `Gross margin ${gmCur.toFixed(1)}% (${gmCur - gmCmp >= 0 ? "+" : ""}${(gmCur - gmCmp).toFixed(1)} pts)`, text: lowMargin && lineGrowth.length > 1 ? `${lowMargin.name} has the lowest margin at ${lowMargin.marg.toFixed(1)}% — review pricing and material cost before growing volume.` : `Margin trend for ${scope}; energy now represents a rising share of production cost.` },
    oee: { tone: oeeCur >= 75 ? "good" : "warn", title: `${model.oeeEstimated ? "Estimated " : ""}OEE ${oeeCur.toFixed(1)}% (${oeeCur - oeeCmp >= 0 ? "+" : ""}${(oeeCur - oeeCmp).toFixed(1)} pts)`, text: `${model.weakLineNote} (${lineOee[0].v.toFixed(0)}%). World-class benchmark is ~85%.${model.oeeEstimated ? " Figures are estimated from manual counts until machine data is captured." : ""}` },
    otd: { tone: otd >= 95 ? "good" : otd >= 85 ? "warn" : "bad", title: `On-time delivery ${otd.toFixed(1)}%`, text: `Below a 95% target. ${model.lateCauses[0].name} explains ${model.lateCauses[0].share}% of late orders, followed by ${model.lateCauses[1].name.toLowerCase()} (${model.lateCauses[1].share}%).` },
    cash: { tone: ccc <= cccPrev ? "good" : "warn", title: `Cash conversion cycle ${ccc.toFixed(0)} days`, text: `${ccc <= cccPrev ? "Improved" : "Worsened"} by ${Math.abs(ccc - cccPrev).toFixed(0)} days vs ${w.cmpLabel}. Each 5-day reduction frees roughly EGP ${(daily * 5).toFixed(1)}M of working capital.` },
    people: { tone: abs < 4.5 ? "good" : "warn", title: `Headcount ${hc} (${hc - hcPrev >= 0 ? "+" : ""}${hc - hcPrev})`, text: `Absenteeism averages ${abs.toFixed(1)}%. ${model.departments[0]} holds ${Math.round((cur[cur.length - 1].headcount[0] / hc) * 100)}% of staff — prioritise multi-skilling there.` },
    scrap: { tone: scrap <= scrapPrev ? "good" : "warn", title: `Scrap rate ${scrap.toFixed(1)}%`, text: `${scrap <= scrapPrev ? "Down" : "Up"} from ${scrapPrev.toFixed(1)}%. At current volume, every 1 pt of scrap costs about EGP ${((revCur / Math.max(1, w.cur.length)) * 0.01 * 0.7).toFixed(2)}M per month in materials and labour.` },
  };
  const order: Record<Area, string[]> = {
    financial: ["revenue", "margin", "cash", "oee"],
    sales: ["revenue", "margin", "otd", "cash"],
    production: ["oee", "scrap", "otd", "margin"],
    hr: ["people", "oee", "revenue"],
    operations: ["otd", "scrap", "cash", "oee", "revenue"],
  };
  return order[area].map((k) => ({ ...items[k], i18n: i18n[k] }));
}
