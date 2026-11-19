"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, CheckCircle2, Circle, Compass, Gauge, Globe2, Scale, SlidersHorizontal, Star, Swords, Target, TrendingUp, Users } from "lucide-react";
import { AIInsight, CHART_COLORS, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { MiniBar, SimTag, Spinner, hashRange, productProfiles, useSimulatedAI } from "./_shared";

type Region = "Europe" | "Gulf" | "Africa" | "Mediterranean" | "Levant";
interface Buyer { name: string; type: string; city: string; interest: string; size: string; fit: number }
interface Market {
  code: string; name: string; region: Region;
  demand: number; access: number; competition: number; fit: number;
  trend: number[]; importValue: string;
  tariff: string; competitionNote: string; fitNote: string;
  segments: { name: string; share: number }[];
  buyers: Buyer[];
}
interface Weights { demand: number; access: number; competition: number; fit: number }
interface IntelData { selected: string; shortlist: string[]; stepsDone: string[]; weights: Weights }

const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025"];
const REGION_COLOR: Record<Region, string> = { Europe: "#6366F1", Gulf: "#C9A24B", Africa: "#0FA396", Mediterranean: "#38BDF8", Levant: "#EC4899" };

// ---------------- Illustrative market data ----------------
const M = (code: string, name: string, region: Region, s: [number, number, number, number], trend: number[], importValue: string, tariff: string, competitionNote: string, fitNote: string, segments: [string, number][], buyers: [string, string, string, string, string, number][]): Market => ({
  code, name, region, demand: s[0], access: s[1], competition: s[2], fit: s[3], trend, importValue, tariff, competitionNote, fitNote,
  segments: segments.map(([n, share]) => ({ name: n, share })),
  buyers: buyers.map(([bn, type, city, interest, size, fit]) => ({ name: bn, type, city, interest, size, fit })),
});

const AL_NOOR_MARKETS: Market[] = [
  M("ES", "Spain", "Europe", [74, 86, 52, 78], [100, 92, 104, 108, 113, 117], "Large knitwear & home-textile import market", "EU–Egypt Association Agreement: generally duty-free for qualifying goods with EUR.1 / proof of origin (rules of origin apply).", "Strong competition from Turkey, Morocco and Portugal on speed; Egypt competes on cotton quality.", "Hospital linen and private-label polos match Spanish distributor demand; Spanish-language listings needed.", [["Hotel & hospital linen distributors", 38], ["Private-label apparel brands", 34], ["Workwear importers", 28]], [["Iberia Textil Trading S.L.", "Importer / distributor", "Valencia", "Hospital linen", "Mid-size", 86], ["Costa Hostelería Suministros", "Hospitality supplier", "Málaga", "Bed linen", "Small", 72], ["Moda Básica Etiqueta Privada", "Private-label brand", "Barcelona", "Polo & T-shirts", "Mid-size", 68]]),
  M("DE", "Germany", "Europe", [88, 86, 40, 64], [100, 95, 101, 103, 106, 108], "Largest EU apparel & workwear importer", "EU–Egypt Association Agreement: generally duty-free with valid proof of origin. Buyers often expect OEKO-TEX® and social-compliance audits.", "Crowded: Bangladesh, Turkey and Pakistan dominate basics; differentiation needed.", "Workwear has fit, but certifications (OEKO-TEX®, audit) are prerequisites for most German buyers.", [["Workwear & PPE distributors", 41], ["Corporate uniform programmes", 33], ["Discount retail private label", 26]], [["Rhein Workwear GmbH", "Workwear distributor", "Cologne", "Workwear uniforms", "Large", 74], ["Nordklinik Textilservice", "Healthcare laundry", "Hamburg", "Hospital linen", "Mid-size", 70], ["Basis Moden Handels GmbH", "Retail buyer", "Düsseldorf", "Polo & T-shirts", "Large", 55]]),
  M("SA", "Saudi Arabia", "Gulf", [82, 78, 58, 80], [100, 106, 114, 121, 127, 134], "Fast-growing healthcare & hospitality build-out", "Greater Arab Free Trade Area (GAFTA): generally duty-free for Arab-origin goods with certificate of origin; SASO / product registration may apply.", "Competition from China, India and Turkey; Arabic service and short transit favour Egypt.", "Hospital linen and workwear align with healthcare and giga-project demand.", [["Hospital procurement", 40], ["Facility-management contractors", 35], ["Hospitality groups", 25]], [["Najd Medical Supplies", "Medical distributor", "Riyadh", "Hospital linen", "Mid-size", 84], ["Red Sea Hospitality Procurement", "Hotel procurement", "Jeddah", "Bed linen", "Large", 77], ["Eastern Facilities Services", "FM contractor", "Dammam", "Workwear uniforms", "Large", 73]]),
  M("AE", "UAE", "Gulf", [70, 80, 48, 72], [100, 103, 110, 115, 119, 124], "Regional re-export & hospitality hub", "GAFTA: generally duty-free with Arab certificate of origin; Dubai re-export hubs serve wider GCC.", "Very competitive trading hub; price-sensitive re-exporters.", "Good for hospitality linen and uniforms; re-export partners can open GCC-wide demand.", [["Hospitality suppliers", 45], ["Uniform makers & traders", 30], ["Re-exporters", 25]], [["Gulf Hospitality Supplies LLC", "Hospitality supplier", "Dubai", "Hospital linen", "Mid-size", 81], ["Emirates Uniform House", "Uniform trader", "Sharjah", "Workwear uniforms", "Small", 66]]),
  M("KE", "Kenya", "Africa", [62, 70, 66, 70], [100, 104, 109, 116, 124, 131], "Growing garment & fabric demand", "COMESA: preferential access for qualifying Egyptian-origin goods with COMESA certificate of origin.", "Asian fabric imports dominate on price; fewer suppliers offering short lead times.", "Cotton knit fabric by the kilo suits local garment makers and EPZ cut-and-sew units.", [["Garment manufacturers", 48], ["School-uniform makers", 30], ["Fabric wholesalers", 22]], [["Nairobi Garment Hub Ltd", "Garment maker", "Nairobi", "Cotton knit fabric", "Mid-size", 79], ["Mombasa Fabrics Wholesale", "Fabric wholesaler", "Mombasa", "Cotton knit fabric", "Small", 64]]),
];

const DELTA_MARKETS: Market[] = [
  M("MA", "Morocco", "Africa", [76, 84, 60, 82], [100, 108, 117, 125, 133, 140], "Expanding automotive assembly & aftermarket", "Agadir Agreement: generally duty-free for qualifying industrial goods with proof of origin.", "European suppliers and local assembly clusters; Egyptian IATF certification is a differentiator.", "Brake discs and knuckles fit both aftermarket distributors and bus/truck assemblers.", [["Aftermarket distributors", 44], ["Bus & truck assemblers", 32], ["Tier-1 suppliers", 24]], [["Atlas Auto Parts SARL", "Aftermarket distributor", "Casablanca", "Brake discs & drums", "Large", 86], ["Casablanca Bus Body Works", "Bus body builder", "Casablanca", "Steering knuckles", "Mid-size", 74], ["Tanger Drive Components", "Tier-1 supplier", "Tangier", "Precision shafts", "Large", 70]]),
  M("TR", "Turkey", "Mediterranean", [80, 74, 38, 66], [100, 101, 107, 109, 112, 114], "Large automotive manufacturing base", "Egypt–Turkey FTA: tariff preferences for qualifying industrial goods; check product-specific schedules.", "Highly competitive domestic suppliers; opportunity in capacity overflow and machined parts.", "CNC housings and shafts can serve overflow demand from Turkish Tier-1s.", [["Tier-1 overflow sourcing", 46], ["Aftermarket importers", 30], ["Commercial-vehicle OEMs", 24]], [["Anatolia Brake Systems A.Ş.", "Brake manufacturer", "Bursa", "Brake discs & drums", "Large", 71], ["Marmara Precision Döküm", "Tier-1 supplier", "Kocaeli", "CNC-machined housings", "Mid-size", 69]]),
  M("DE", "Germany", "Europe", [92, 82, 34, 74], [100, 94, 97, 99, 101, 102], "Largest European automotive supply chain", "EU–Egypt Association Agreement: generally duty-free with proof of origin; buyers require PPAP, IATF 16949 and often ECE R90 for brake parts.", "Mature, quality-driven supply base; cost pressure is pushing near-shoring to MENA.", "IATF 16949 and PPAP level 3 put Delta on the shortlist for Tier-2 machined parts.", [["Tier-2 machining buyers", 42], ["Aftermarket brands", 33], ["Industrial drives", 25]], [["Rhein Fahrzeugtechnik GmbH", "Tier-1 supplier", "Stuttgart", "CNC-machined housings", "Large", 82], ["Bavaria Precision Drives", "Drivetrain maker", "Munich", "Precision shafts", "Mid-size", 78], ["Nordbrems Ersatzteile", "Aftermarket brand", "Hanover", "Brake discs & drums", "Mid-size", 66]]),
  M("SA", "Saudi Arabia", "Gulf", [78, 80, 62, 76], [100, 107, 115, 122, 130, 138], "Fleet growth & new local assembly", "GAFTA: generally duty-free for Arab-origin goods with certificate of origin; SASO conformity may apply to vehicle parts.", "Imports from China and India dominate price-driven aftermarket; quality segment underserved.", "Heavy-duty drums and knuckles suit fleet operators and new bus assembly.", [["Fleet operators", 40], ["Aftermarket distributors", 36], ["Local assemblers", 24]], [["Riyadh Fleet Services", "Fleet operator", "Riyadh", "Brake discs & drums", "Large", 80], ["Jeddah Commercial Vehicle Parts", "Distributor", "Jeddah", "Steering knuckles", "Mid-size", 72]]),
  M("ZA", "South Africa", "Africa", [66, 58, 56, 68], [100, 97, 103, 106, 110, 113], "Established vehicle manufacturing hub", "No bilateral FTA in force; AfCFTA preferences are being phased in — confirm current tariff schedules.", "Local and Asian suppliers; logistics distance is a cost factor.", "Precision shafts and drums for axle distributors; longer transit needs buffer stock.", [["Axle & driveline distributors", 45], ["Mining-vehicle maintenance", 30], ["OEM spares", 25]], [["Cape Axle Distributors (Pty) Ltd", "Distributor", "Cape Town", "Precision shafts", "Mid-size", 75], ["Highveld Mining Spares", "Maintenance supplier", "Johannesburg", "Brake discs & drums", "Mid-size", 63]]),
];

function genericMarkets(factory: Factory): Market[] {
  const prod = productProfiles(factory);
  const p0 = prod[0]?.name ?? "Main product";
  const p1 = prod[1]?.name ?? p0;
  const base: [string, string, Region][] = [["SA", "Saudi Arabia", "Gulf"], ["AE", "UAE", "Gulf"], ["KE", "Kenya", "Africa"], ["DE", "Germany", "Europe"], ["JO", "Jordan", "Levant"]];
  const tariffs: Record<string, string> = {
    SA: "GAFTA: generally duty-free for Arab-origin goods with certificate of origin.",
    AE: "GAFTA: generally duty-free with Arab certificate of origin; re-export hub.",
    KE: "COMESA: preferential access for qualifying Egyptian-origin goods.",
    DE: "EU–Egypt Association Agreement: generally duty-free with proof of origin.",
    JO: "GAFTA and Agadir Agreement preferences for qualifying goods.",
  };
  return base.map(([code, name, region], i) => {
    const k = `${factory.name}|${code}`;
    const s: [number, number, number, number] = [hashRange(`${k}d`, 55, 88), hashRange(`${k}a`, 60, 88), hashRange(`${k}c`, 35, 70), hashRange(`${k}f`, 50, 82)];
    const g = hashRange(`${k}g`, 2, 7);
    return M(code, name, region, s, YEARS.map((_, y) => 100 + y * g + (y % 2 ? -2 : 1)), "Indicative import demand — to be researched", tariffs[code], "Competitive landscape to be assessed with trade data.", `${i % 2 ? p1 : p0} appears relevant to local importers (illustrative).`, [["Importers & distributors", 45], ["Wholesalers", 30], ["Project buyers", 25]], [[`${name} Trading Partners`, "Importer", name === "UAE" ? "Dubai" : name === "Kenya" ? "Nairobi" : name === "Germany" ? "Hamburg" : name === "Jordan" ? "Amman" : "Riyadh", i % 2 ? p1 : p0, "Mid-size", hashRange(`${k}b1`, 60, 85)], [`${code} Industrial Sourcing Co.`, "Distributor", "Capital region", p0, "Small", hashRange(`${k}b2`, 55, 78)]]);
  });
}

function marketsFor(factory: Factory): Market[] {
  const k = seedKeyFor(factory);
  return k === "al-noor" ? AL_NOOR_MARKETS : k === "delta" ? DELTA_MARKETS : genericMarkets(factory);
}

// ---------------- Readiness ----------------
interface Step { id: string; label: string; area: string; gain: number }
interface Readiness { areas: { name: string; score: number }[]; steps: Step[] }
function readinessFor(factory: Factory): Readiness {
  const k = seedKeyFor(factory);
  if (k === "al-noor")
    return {
      areas: [{ name: "Product & quality", score: 58 }, { name: "Certifications", score: 22 }, { name: "Capacity", score: 62 }, { name: "Export pricing", score: 45 }, { name: "Documentation", score: 25 }, { name: "Digital presence", score: 18 }],
      steps: [
        { id: "s1", label: "Obtain OEKO-TEX® Standard 100 for knit fabric and polos", area: "Certifications", gain: 35 },
        { id: "s2", label: "Register on the exporters' register and prepare certificate-of-origin process", area: "Documentation", gain: 35 },
        { id: "s3", label: "Publish an EN/AR/ES product catalogue and B2B marketplace profile", area: "Digital presence", gain: 40 },
        { id: "s4", label: "Build FOB / CIF price sheets per product and destination", area: "Export pricing", gain: 30 },
        { id: "s5", label: "Reserve 15% of knitting capacity for export trial orders", area: "Capacity", gain: 15 },
        { id: "s6", label: "Commission a social-compliance audit for EU buyers", area: "Certifications", gain: 25 },
      ],
    };
  if (k === "delta")
    return {
      areas: [{ name: "Product & quality", score: 88 }, { name: "Certifications", score: 84 }, { name: "Capacity", score: 70 }, { name: "Export pricing", score: 66 }, { name: "Documentation", score: 72 }, { name: "Digital presence", score: 52 }],
      steps: [
        { id: "s1", label: "Complete ECE R90 testing for top brake-disc references sold in EU aftermarket", area: "Certifications", gain: 10 },
        { id: "s2", label: "Publish an English/German technical capability profile with PPAP samples", area: "Digital presence", gain: 25 },
        { id: "s3", label: "Model landed-cost pricing for Morocco, Germany and Saudi Arabia", area: "Export pricing", gain: 20 },
        { id: "s4", label: "Free 2 CNC cells for export programmes via predictive maintenance", area: "Capacity", gain: 15 },
        { id: "s5", label: "Digitise export documents and HS master data", area: "Documentation", gain: 15 },
      ],
    };
  const r = (s: string, a: number, b: number) => hashRange(`${factory.name}|${s}`, a, b);
  return {
    areas: [{ name: "Product & quality", score: r("pq", 45, 75) }, { name: "Certifications", score: r("ce", 15, 55) }, { name: "Capacity", score: r("ca", 40, 75) }, { name: "Export pricing", score: r("pr", 30, 60) }, { name: "Documentation", score: r("do", 15, 50) }, { name: "Digital presence", score: r("di", 10, 45) }],
    steps: [
      { id: "s1", label: "Confirm 6-digit HS codes for every product", area: "Documentation", gain: 25 },
      { id: "s2", label: "Identify certifications required by the top two target markets", area: "Certifications", gain: 25 },
      { id: "s3", label: "Create an English/Arabic export catalogue", area: "Digital presence", gain: 35 },
      { id: "s4", label: "Prepare FOB price sheets with MOQs", area: "Export pricing", gain: 25 },
      { id: "s5", label: "Estimate spare monthly capacity for export orders", area: "Capacity", gain: 15 },
    ],
  };
}

function seed(factory: Factory): IntelData {
  const markets = marketsFor(factory);
  const w = { demand: 35, access: 25, competition: 15, fit: 25 };
  const ranked = [...markets].sort((a, b) => scoreOf(b, w) - scoreOf(a, w));
  return { selected: ranked[0]?.code ?? "", shortlist: ranked.slice(0, 2).map((m) => m.code), stepsDone: [], weights: w };
}

function scoreOf(m: Market, w: Weights) {
  const total = w.demand + w.access + w.competition + w.fit || 1;
  return Math.round((m.demand * w.demand + m.access * w.access + m.competition * w.competition + m.fit * w.fit) / total);
}
const scoreColor = (s: number) => (s >= 75 ? "#0FA396" : s >= 65 ? "#C9A24B" : "#94A3B8");

// ---------------- Workspace ----------------
export default function ExportIntelligenceWorkspace({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<IntelData>(service.id, seed);
  const markets = useMemo(() => marketsFor(factory), [factory]);
  const readiness = useMemo(() => readinessFor(factory), [factory]);
  const reduce = useReducedMotion();
  const ai = useSimulatedAI();
  const [showWeights, setShowWeights] = useState(false);
  const t = useT();

  const ranked = [...markets].map((m) => ({ ...m, score: scoreOf(m, data.weights) })).sort((a, b) => b.score - a.score);
  const sel = ranked.find((m) => m.code === data.selected) ?? ranked[0];

  const areaScores = readiness.areas.map((a) => {
    const gain = readiness.steps.filter((s) => s.area === a.name && data.stepsDone.includes(s.id)).reduce((x, s) => x + s.gain, 0);
    return { ...a, score: Math.min(100, a.score + gain), base: a.score };
  });
  const readinessScore = Math.round(areaScores.reduce((x, a) => x + a.score, 0) / areaScores.length);

  const toggleShort = (code: string) => setData((prev) => ({ ...prev, shortlist: prev.shortlist.includes(code) ? prev.shortlist.filter((c) => c !== code) : [...prev.shortlist, code] }));
  const toggleStep = (id: string) => setData((prev) => ({ ...prev, stepsDone: prev.stepsDone.includes(id) ? prev.stepsDone.filter((s) => s !== id) : [...prev.stepsDone, id] }));
  const setWeight = (k: keyof Weights, v: number) => setData((prev) => ({ ...prev, weights: { ...prev.weights, [k]: v } }));

  return (
    <WorkspaceFrame
      service={service}
      onReset={reset}
      notice={t("Market scores, tariff notes and buyer leads are illustrative — not verified research. Confirm trade rules with official sources.")}
      actions={<Button variant="subtle" size="sm" onClick={() => ai.run("rescan", () => toast.success(t("Market scan refreshed"), { description: t("Same illustrative dataset — live trade data requires licensed sources.") }), 1100)} disabled={ai.busy === "rescan"}>{ai.busy === "rescan" ? <Spinner /> : <Compass />} {t("Re-scan markets")}</Button>}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Opportunity matrix */}
        <Panel
          title={t("Market opportunity matrix")}
          description={t("Demand (→) vs product fit (↑) · bubble size = market access · colour = opportunity score")}
          actions={<><SimTag>{t("Illustrative")}</SimTag><Button variant="ghost" size="sm" aria-expanded={showWeights} onClick={() => setShowWeights((v) => !v)}><SlidersHorizontal /> <span className="hidden sm:inline">{t("Weights")}</span></Button></>}
        >
          {showWeights ? (
            <div className="mb-4 grid gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-2">
              {(["demand", "access", "competition", "fit"] as const).map((k) => (
                <div key={k}>
                  <label htmlFor={`w-${k}`} className="flex justify-between text-xs font-semibold capitalize text-navy-700"><span>{k === "competition" ? t("Competitive room") : t(k)}</span><span className="tabular-nums text-muted">{data.weights[k]}</span></label>
                  <input id={`w-${k}`} type="range" min={0} max={50} step={5} value={data.weights[k]} onChange={(e) => setWeight(k, Number(e.target.value))} className="mt-1 w-full accent-teal-600" />
                </div>
              ))}
            </div>
          ) : null}
          <div className="relative h-72 rounded-xl border border-line bg-[linear-gradient(to_right,#E5E8EE_1px,transparent_1px),linear-gradient(to_bottom,#E5E8EE_1px,transparent_1px)] bg-[size:25%_25%]">
            <span className="absolute right-2 top-2 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-700">{t("Sweet spot")}</span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-wider text-muted">{t("Demand →")}</span>
            <span className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium uppercase tracking-wider text-muted">{t("Fit →")}</span>
            {ranked.map((m) => {
              const x = ((m.demand - 40) / 60) * 100;
              const y = ((m.fit - 40) / 60) * 100;
              const size = 34 + (m.access - 50) * 0.6;
              const active = m.code === sel?.code;
              return (
                <motion.button
                  key={m.code}
                  type="button"
                  aria-label={t("{market}, opportunity score {score}", { market: t(m.name), score: m.score })}
                  aria-pressed={active}
                  onClick={() => setData((prev) => ({ ...prev, selected: m.code }))}
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn("absolute grid -translate-x-1/2 translate-y-1/2 place-items-center rounded-full text-[11px] font-bold text-white shadow-card transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-200", active && "ring-4 ring-navy-900/20")}
                  style={{ left: `${Math.max(6, Math.min(94, x))}%`, bottom: `${Math.max(8, Math.min(92, y))}%`, width: size, height: size, backgroundColor: scoreColor(m.score) }}
                >
                  {m.code}
                </motion.button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#0FA396]" /> {t("Score 75+")}</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#C9A24B]" /> 65–74</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-[#94A3B8]" /> {t("Below 65")}</span>
          </div>
        </Panel>

        {/* Ranking */}
        <Panel title={t("Ranked target markets")} description={t("Click to open · star to shortlist")} bodyClassName="p-2">
          <ol className="space-y-1">
            {ranked.map((m, i) => {
              const active = m.code === sel?.code;
              const short = data.shortlist.includes(m.code);
              return (
                <li key={m.code} className={cn("flex items-center gap-2 rounded-xl px-2 py-2 transition", active ? "bg-teal-50" : "hover:bg-canvas")}>
                  <button type="button" onClick={() => setData((prev) => ({ ...prev, selected: m.code }))} aria-pressed={active} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300">
                    <span className="w-4 text-xs font-semibold tabular-nums text-muted">{i + 1}</span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: REGION_COLOR[m.region] }}>{m.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-navy-900">{t(m.name)}</span><span className="text-sm font-semibold tabular-nums" style={{ color: scoreColor(m.score) }}>{m.score}</span></span>
                      <MiniBar value={m.score} color={scoreColor(m.score)} className="mt-1" />
                      <span className="mt-0.5 block text-[11px] text-muted">{t(m.region)}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => { toggleShort(m.code); toast(short ? t("{market} removed from shortlist", { market: t(m.name) }) : t("{market} shortlisted", { market: t(m.name) })); }} aria-pressed={short} aria-label={short ? t("Remove {market} from shortlist", { market: t(m.name) }) : t("Shortlist {market}", { market: t(m.name) })} className="grid size-8 shrink-0 place-items-center rounded-lg text-gold-500 transition hover:bg-gold-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
                    <Star className={cn("size-4", short && "fill-gold-400")} />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mx-2 mt-2 rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">
            {t("Shortlist:")} {data.shortlist.length ? ranked.filter((m) => data.shortlist.includes(m.code)).map((m) => t(m.name)).join(" · ") : t("none yet")}
          </div>
        </Panel>
      </div>

      {/* Market dossier */}
      {sel ? (
        <section className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-card">
          <div className="flex flex-col gap-4 border-b border-line bg-gradient-to-r from-navy-950 to-navy-800 p-5 text-white md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-bold" style={{ backgroundColor: REGION_COLOR[sel.region] }}>{sel.code}</span>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-white/60">{t("Market dossier · {region}", { region: t(sel.region) })}</div>
                <h2 className="text-xl font-semibold">{t(sel.name)}</h2>
                <div className="text-sm text-white/70">{t(sel.importValue)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-end"><div className="text-3xl font-semibold tabular-nums">{sel.score}</div><div className="text-[11px] uppercase tracking-wider text-white/60">{t("Opportunity score")}</div></div>
              <Button variant={data.shortlist.includes(sel.code) ? "gold" : "dark"} size="sm" onClick={() => toggleShort(sel.code)}><Star /> {data.shortlist.includes(sel.code) ? t("Shortlisted") : t("Shortlist")}</Button>
            </div>
          </div>

          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {([["Demand", sel.demand, TrendingUp], ["Market access", sel.access, Scale], ["Competitive room", sel.competition, Swords], ["Product fit", sel.fit, Target]] as const).map(([label, v, Icon]) => (
                  <div key={label} className="rounded-xl bg-canvas p-3">
                    <div className="flex items-center justify-between text-xs text-muted"><span className="flex items-center gap-1.5"><Icon className="size-3.5" /> {t(label)}</span><span className="font-semibold tabular-nums text-navy-900">{v}</span></div>
                    <MiniBar value={v} color={scoreColor(v)} className="mt-2" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-navy-900">{t("Demand trend index")}</h3><SimTag>{t("Illustrative")}</SimTag></div>
                <div className="mt-2 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sel.trend.map((v, i) => ({ year: YEARS[i], v }))} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs><linearGradient id="ei-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} /><stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis domain={["dataMin - 5", "dataMax + 5"]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748B" }} />
                      <Tooltip formatter={(v) => [v, t("Index (2020 = 100)")]} contentStyle={{ borderRadius: 12, borderColor: "#E5E8EE", fontSize: 12 }} />
                      <Area type="monotone" dataKey="v" stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#ei-grad)" isAnimationActive={!reduce} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="rounded-xl border border-line p-3"><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Scale className="size-3.5" /> {t("Tariff & market access")}</dt><dd className="mt-1 text-navy-800">{t(sel.tariff)}</dd></div>
                <div className="rounded-xl border border-line p-3"><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Swords className="size-3.5" /> {t("Competition")}</dt><dd className="mt-1 text-navy-800">{t(sel.competitionNote)}</dd></div>
                <div className="rounded-xl border border-line p-3"><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted"><Target className="size-3.5" /> {t("Fit for {factory}", { factory: factory.name })}</dt><dd className="mt-1 text-navy-800">{t(sel.fitNote)}</dd></div>
              </dl>
            </div>

            <div className="min-w-0 space-y-5">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-navy-900"><Users className="size-4 text-teal-600" /> {t("Buyer segments")}</h3>
                <div className="mt-2 flex h-3 overflow-hidden rounded-full">
                  {sel.segments.map((s, i) => <div key={s.name} style={{ width: `${s.share}%`, backgroundColor: CHART_COLORS[i + 1] }} title={`${t(s.name)} ${s.share}%`} />)}
                </div>
                <ul className="mt-2 space-y-1 text-xs">
                  {sel.segments.map((s, i) => <li key={s.name} className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-navy-800"><span className="size-2 rounded-sm" style={{ backgroundColor: CHART_COLORS[i + 1] }} /> {t(s.name)}</span><span className="tabular-nums text-muted">{s.share}%</span></li>)}
                </ul>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-navy-900"><Building2 className="size-4 text-teal-600" /> {t("Prospective buyer leads")}</h3>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-inset ring-amber-200">{t("Illustrative — not verified research")}</span>
                </div>
                <div className="mt-2 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-canvas text-start text-[11px] uppercase tracking-wider text-muted"><tr><th scope="col" className="px-3 py-2 text-start">{t("Buyer (fictional)")}</th><th scope="col" className="px-3 py-2 text-start">{t("Type")}</th><th scope="col" className="px-3 py-2 text-start">{t("Interest")}</th><th scope="col" className="px-3 py-2 text-end">{t("Fit")}</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {sel.buyers.map((b) => (
                        <tr key={b.name}>
                          <th scope="row" className="px-3 py-2.5 text-start"><div className="font-semibold text-navy-900">{b.name}</div><div className="text-[11px] font-normal text-muted">{t(b.city)} · {t(b.size)}</div></th>
                          <td className="px-3 py-2.5 text-xs text-navy-700">{t(b.type)}</td>
                          <td className="px-3 py-2.5 text-xs text-navy-700">{t(b.interest)}</td>
                          <td className="px-3 py-2.5 text-end"><StatusPill tone={b.fit >= 75 ? "good" : b.fit >= 65 ? "warn" : "neutral"}>{b.fit}</StatusPill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <AIInsight title={t("Entry play · {market}", { market: t(sel.name) })}>
                {sel.buyers[0] ? t("Lead with {segment} — start conversations with profiles like {buyer}.", { segment: sel.segments[0] ? t(sel.segments[0].name).toLowerCase() : "", buyer: sel.buyers[0].name }) : t("Lead with {segment}.", { segment: sel.segments[0] ? t(sel.segments[0].name).toLowerCase() : "" })} {sel.access >= 80 ? t("Preferential access makes landed price competitive; make sure proof-of-origin paperwork is right first time.") : t("Access is the main constraint — confirm tariff schedules and conformity requirements before quoting.")}
              </AIInsight>
            </div>
          </div>
        </section>
      ) : null}

      {/* Readiness */}
      <section className="mt-6 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={t("Export readiness")} description={t("Simulated assessment")}>
          <div className="flex flex-col items-center">
            <ReadinessRing value={readinessScore} reduce={!!reduce} />
            <ul className="mt-4 w-full space-y-2">
              {areaScores.map((a) => (
                <li key={a.name}>
                  <div className="flex justify-between text-xs"><span className="text-navy-800">{t(a.name)}</span><span className="tabular-nums text-muted">{a.score}{a.score > a.base ? <span className="ms-1 text-emerald-600">+{a.score - a.base}</span> : null}</span></div>
                  <MiniBar value={a.score} color={scoreColor(a.score)} className="mt-1" />
                </li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel title={t("Recommended next steps")} description={t("Tick steps as they are completed — the readiness score updates")} actions={<Gauge className="size-4 text-muted" />} bodyClassName="p-2">
          <ul className="space-y-1">
            {readiness.steps.map((s) => {
              const done = data.stepsDone.includes(s.id);
              return (
                <li key={s.id}>
                  <button type="button" aria-pressed={done} onClick={() => toggleStep(s.id)} className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300", done ? "bg-emerald-50/60" : "hover:bg-canvas")}>
                    {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 size-5 shrink-0 text-navy-500/40" />}
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm font-medium", done ? "text-navy-600 line-through decoration-navy-500/30" : "text-navy-900")}>{t(s.label)}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted"><span>{t(s.area)}</span><span className="font-semibold text-teal-700">{t("+{gain} pts", { gain: s.gain })}</span></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="m-2 flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs text-muted"><Globe2 className="mt-0.5 size-3.5 shrink-0" /> {t("Pair this with the Export Documentation toolkit and Digital Export Marketing services to close documentation and digital-presence gaps.")}</div>
        </Panel>
      </section>
    </WorkspaceFrame>
  );
}

function ReadinessRing({ value, reduce }: { value: number; reduce: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = scoreColor(value);
  const t = useT();
  return (
    <div className="relative size-40" role="img" aria-label={t("Export readiness {value} out of 100", { value })}>
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#EEF1F5" strokeWidth="12" />
        <motion.circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} initial={reduce ? false : { strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: reduce ? 0 : 0.8, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><div className="text-3xl font-semibold tabular-nums text-navy-900">{value}</div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{value >= 75 ? t("Export-ready") : value >= 50 ? t("Developing") : t("Early stage")}</div></div>
      </div>
    </div>
  );
}
