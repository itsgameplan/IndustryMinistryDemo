"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, Anchor, BadgeCheck, Boxes, Check, ChevronDown, ClipboardCheck, Cpu, Factory as FactoryIcon, Link2, Loader2, MapPin, PackageCheck, QrCode, RotateCcw, ScanLine, ShieldAlert, ShieldCheck, Ship, Smartphone, Truck, X,
} from "lucide-react";
import { AIInsight, CHART_COLORS, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button } from "@/components/ui";
import { PseudoQr } from "@/components/ministry/pseudo-qr";
import { DELTA_MACHINES } from "@/lib/data/machines";
import { historyFor } from "@/lib/telemetry";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { DAY, DEMO_TODAY, hashHex, productsOf, rng, shortHash, uid, useDateFormat } from "./shared";

// ---------------- Types ----------------
type StepKind = "receipt" | "manufacturing" | "inspection" | "packaging" | "shipping";
interface Fact { label: string; value: string }
interface Reading { label: string; unit: string; values: number[]; min?: number; max?: number }
interface Block { index: number; hash: string; prev: string; signer: string }
interface Step { kind: StepKind; title: string; ts: number; location: string; actor: string; facts: Fact[]; machine?: string; readings?: Reading[]; done: boolean; block?: Block }
interface Batch { id: string; product: string; qty: string; destination: string; steps: Step[]; certs: string[] }
interface AuditEvent { id: string; ts: number; batchId: string; event: string; actor: string; block: string; result: "ok" | "info" | "warn" | "fail" }
interface Tamper { batchId: string; step: number; original: string }
interface TraceData { batches: Batch[]; selected: string; tamper: Tamper | null; lastVerified: Record<string, { ts: number; ok: boolean }>; audit: AuditEvent[] }
type BlockCheck = "ok" | "content" | "link";

const GENESIS = "0".repeat(16);
const STEP_META: Record<StepKind, { label: string; icon: typeof Boxes }> = {
  receipt: { label: "Raw material receipt", icon: Boxes },
  manufacturing: { label: "Manufacturing", icon: FactoryIcon },
  inspection: { label: "Inspection", icon: ClipboardCheck },
  packaging: { label: "Packaging", icon: PackageCheck },
  shipping: { label: "Shipping", icon: Ship },
};

const payloadOf = (batchId: string, s: Step) => [batchId, s.kind, s.ts, s.location, s.actor, ...s.facts.map((f) => `${f.label}=${f.value}`)].join("|");

/** Assigns simulated ledger blocks to completed steps, each linking to the previous hash. */
function chain(batchId: string, steps: Step[], signers: string[]): Step[] {
  let prev = GENESIS;
  let index = 0;
  return steps.map((s, i) => {
    if (!s.done) return s;
    const hash = hashHex(`${prev}|${payloadOf(batchId, s)}`);
    const block = { index: ++index, hash, prev, signer: signers[i] };
    prev = hash;
    return { ...s, block };
  });
}

/** Recompute the chain from the (possibly edited) records and compare with the stored blocks. */
function verifyChain(batch: Batch): BlockCheck[] {
  let prev = GENESIS;
  return batch.steps.filter((s) => s.block).map((s) => {
    const b = s.block!;
    const linkOk = b.prev === prev;
    const recomputed = hashHex(`${prev}|${payloadOf(batch.id, s)}`);
    prev = recomputed;
    if (!linkOk) return "link";
    return recomputed === b.hash ? "ok" : "content";
  });
}

// ---------------- Seeds ----------------
interface Spec {
  code: string; product: string; qty: string; destination: string; port: string; carrier: string; container: string;
  done: number; daysAgo: number; receipt: Fact[]; machine: string; mfg: Fact[]; readings: (ts: number) => Reading[]; inspection: Fact[]; packaging: Fact[];
}

function deltaReadings(machineId: string) {
  return (ts: number): Reading[] => {
    const m = DELTA_MACHINES.find((x) => x.id === machineId) ?? DELTA_MACHINES[0];
    const h = historyFor(m, 14, 10 * 60 * 1000, ts);
    return [
      { label: "Bearing temperature", unit: "°C", values: h.map((r) => r.temperature), max: Math.round(m.baseTemp * 1.3) },
      { label: "Spindle vibration", unit: "mm/s", values: h.map((r) => r.vibration), max: 4.5 },
      { label: "Motor current", unit: "A", values: h.map((r) => r.current), max: Math.round(18 + m.baseVibration * 4 + 9) },
    ];
  };
}
const machineName = (id: string) => DELTA_MACHINES.find((m) => m.id === id)?.name ?? id;

function bandSeries(seed: string, centre: number, spread: number, n = 14, digits = 1) {
  const r = rng(seed);
  let v = centre;
  return Array.from({ length: n }, () => {
    v = v + (r() - 0.5) * spread * 0.6 + (centre - v) * 0.35;
    return Math.round(v * 10 ** digits) / 10 ** digits;
  });
}

function specsFor(factory: Factory): { specs: Spec[]; signers: string[]; certs: string[] } {
  const key = seedKeyFor(factory);
  const signers = ["Stores clerk · key ••a41c", "Line supervisor · key ••7f02", "QC inspector · key ••c9e8", "Packing lead · key ••12bd", "Logistics coordinator · key ••e05a"];
  const carrier = "Nile Blue Lines (fictional)";
  if (key === "delta") {
    return {
      signers,
      certs: ["IATF 16949", "ISO 14001", "ECE R90 test evidence"],
      specs: [
        { code: "DPM-BD-2611-014", product: "Vented brake disc Ø280 mm", qty: "1,200 pcs", destination: "Hamburg, Germany", port: "Port Said East", carrier, container: "NBLU 482190-3", done: 5, daysAgo: 9, machine: machineName("cnc-03"), readings: deltaReadings("cnc-03"),
          receipt: [{ label: "Material", value: "Grey cast iron GG20 castings" }, { label: "Supplier lot", value: "FC-77812 (fictional foundry)" }, { label: "Mill cert", value: "MC-2611-0419" }, { label: "Qty received", value: "1,236 castings" }],
          mfg: [{ label: "Operation", value: "Finish turning & drilling" }, { label: "Machine", value: "CNC-03 Machining Centre" }, { label: "Shift", value: "B (14:00–22:00)" }, { label: "Operator", value: "Op. #2174" }],
          inspection: [{ label: "Run-out", value: "≤ 0.03 mm (sample 80/80)" }, { label: "DTV", value: "≤ 0.008 mm" }, { label: "Hardness", value: "190–220 HB" }, { label: "Result", value: "Released — 1,200 pass" }],
          packaging: [{ label: "Format", value: "VCI-wrapped, 10 per carton" }, { label: "Pallets", value: "8 × EUR pallet" }, { label: "Labels", value: "Batch + QR on every carton" }] },
        { code: "DPM-SK-2610-022", product: "Forged steering knuckle LH/RH", qty: "640 pcs", destination: "Valencia, Spain", port: "Alexandria", carrier, container: "NBLU 397554-1", done: 5, daysAgo: 24, machine: machineName("press-01"), readings: deltaReadings("press-01"),
          receipt: [{ label: "Material", value: "42CrMo4 billets Ø60" }, { label: "Supplier lot", value: "ST-55190 (fictional mill)" }, { label: "Mill cert", value: "MC-2610-0287" }, { label: "Qty received", value: "3.1 t" }],
          mfg: [{ label: "Operation", value: "Hot forging + trim" }, { label: "Machine", value: "PRESS-01 Forging Press" }, { label: "Shift", value: "A (06:00–14:00)" }, { label: "Operator", value: "Op. #1408" }],
          inspection: [{ label: "Crack test", value: "MPI 100% — 0 indications" }, { label: "Dimensional", value: "CMM 32/32 conforming" }, { label: "Hardness", value: "28–32 HRC" }, { label: "Result", value: "Released — 640 pass" }],
          packaging: [{ label: "Format", value: "Returnable racks, 40 per rack" }, { label: "Racks", value: "16" }, { label: "Labels", value: "Customer label + batch QR" }] },
        { code: "DPM-HS-2611-031", product: "CNC-machined gearbox housing", qty: "300 pcs", destination: "Jeddah, Saudi Arabia", port: "Sokhna", carrier, container: "Not yet booked", done: 2, daysAgo: 3, machine: machineName("cnc-07"), readings: deltaReadings("cnc-07"),
          receipt: [{ label: "Material", value: "AlSi9Cu3 die castings" }, { label: "Supplier lot", value: "AL-20931 (fictional)" }, { label: "Mill cert", value: "MC-2611-0533" }, { label: "Qty received", value: "312 castings" }],
          mfg: [{ label: "Operation", value: "5-axis milling, bores & threads" }, { label: "Machine", value: "CNC-07 Machining Centre" }, { label: "Shift", value: "C (22:00–06:00)" }, { label: "Operator", value: "Op. #3051" }],
          inspection: [{ label: "Bore Ø", value: "Pending" }], packaging: [{ label: "Format", value: "Pending" }] },
        { code: "DPM-PS-2611-009", product: "Precision drive shaft 32 mm", qty: "2,000 pcs", destination: "Lagos, Nigeria", port: "Alexandria", carrier, container: "Awaiting booking", done: 4, daysAgo: 6, machine: machineName("lathe-02"), readings: deltaReadings("lathe-02"),
          receipt: [{ label: "Material", value: "C45 bright bar" }, { label: "Supplier lot", value: "BB-44102 (fictional)" }, { label: "Mill cert", value: "MC-2611-0461" }, { label: "Qty received", value: "4.6 t" }],
          mfg: [{ label: "Operation", value: "CNC turning + induction hardening" }, { label: "Machine", value: "LATHE-02 Turning Cell" }, { label: "Shift", value: "A (06:00–14:00)" }, { label: "Operator", value: "Op. #1993" }],
          inspection: [{ label: "Diameter", value: "32 h6 — Cpk 1.67" }, { label: "Straightness", value: "≤ 0.02 mm" }, { label: "Case depth", value: "1.2 mm" }, { label: "Result", value: "Released — 2,000 pass" }],
          packaging: [{ label: "Format", value: "Oiled, tubes of 20" }, { label: "Pallets", value: "5 × EUR pallet" }, { label: "Labels", value: "Batch + QR per tube" }] },
      ],
    };
  }
  if (key === "al-noor") {
    const textile = (seed: string) => (ts: number): Reading[] => [
      { label: "Knitting machine speed", unit: "rpm", values: bandSeries(`${seed}-rpm-${ts}`, 26, 1.6), min: 22, max: 30 },
      { label: "Dye bath temperature", unit: "°C", values: bandSeries(`${seed}-t-${ts}`, 60, 1.4), min: 58, max: 62 },
      { label: "Dye bath pH", unit: "pH", values: bandSeries(`${seed}-ph-${ts}`, 10.8, 0.25, 14, 2), min: 10.4, max: 11.2 },
    ];
    const machine = "KN-04 circular knitter → DY-02 jet dyeing";
    return {
      signers,
      certs: ["OEKO-TEX Standard 100", "BSCI / amfori audit", "ISO 9001"],
      specs: [
        { code: "ANT-KF-2611-031", product: "Single-jersey cotton knit, 180 gsm", qty: "4,800 m", destination: "Barcelona, Spain", port: "Alexandria", carrier, container: "NBLU 510877-6", done: 5, daysAgo: 8, machine, readings: textile("kf"),
          receipt: [{ label: "Material", value: "Combed cotton yarn Ne 30/1" }, { label: "Supplier lot", value: "YR-30-8812 (fictional spinner)" }, { label: "Origin", value: "Egyptian cotton (supplier-declared)" }, { label: "Qty received", value: "1,050 kg" }],
          mfg: [{ label: "Operation", value: "Knitting → reactive dyeing" }, { label: "Machines", value: "KN-04 / DY-02" }, { label: "Shift", value: "Day (08:00–16:00)" }, { label: "Dye recipe", value: "RX-NAVY-12 (restricted-substance screened)" }],
          inspection: [{ label: "Weight", value: "180 gsm ± 3%" }, { label: "Wash fastness", value: "Grade 4 (in-house)" }, { label: "Shrinkage", value: "≤ 5% L/W" }, { label: "Result", value: "Released" }],
          packaging: [{ label: "Format", value: "Rolls, poly-wrapped" }, { label: "Units", value: "96 rolls" }, { label: "Labels", value: "Roll ticket + QR" }] },
        { code: "ANT-PL-2610-022", product: "Piqué polo shirt, navy", qty: "6,000 pcs", destination: "Lyon, France", port: "Alexandria", carrier, container: "NBLU 488012-9", done: 5, daysAgo: 21, machine, readings: textile("pl"),
          receipt: [{ label: "Material", value: "Cotton piqué fabric (in-house)" }, { label: "Trims lot", value: "TR-2210 buttons & labels" }, { label: "Origin", value: "Al Noor knit batch ANT-KF-2610-011" }, { label: "Qty received", value: "2,300 m" }],
          mfg: [{ label: "Operation", value: "Knit, dye, cut, sew, finish" }, { label: "Machines", value: "KN-04 / DY-02 + sewing line 2" }, { label: "Shift", value: "Day (08:00–16:00)" }, { label: "Line", value: "Sewing line 2" }],
          inspection: [{ label: "AQL", value: "2.5 — 0 critical" }, { label: "Measurements", value: "Size set within tolerance" }, { label: "Colour", value: "Approved vs. buyer standard" }, { label: "Result", value: "Released" }],
          packaging: [{ label: "Format", value: "Polybag, 24 per carton" }, { label: "Cartons", value: "250" }, { label: "Labels", value: "Care label + carton QR" }] },
        { code: "ANT-HL-2611-008", product: "Hospital bed sheet, 200 TC", qty: "2,400 pcs", destination: "Riyadh, Saudi Arabia", port: "Sokhna", carrier, container: "Awaiting booking", done: 4, daysAgo: 5, machine, readings: textile("hl"),
          receipt: [{ label: "Material", value: "Cotton/poly yarn 65/35" }, { label: "Supplier lot", value: "YR-CP-2207 (fictional)" }, { label: "Origin", value: "Supplier-declared Egypt" }, { label: "Qty received", value: "820 kg" }],
          mfg: [{ label: "Operation", value: "Knitting → bleaching → hemming" }, { label: "Machines", value: "KN-04 / DY-02" }, { label: "Shift", value: "Evening (16:00–24:00)" }, { label: "Process", value: "Industrial-wash finish" }],
          inspection: [{ label: "Dimensions", value: "160 × 260 cm ± 1%" }, { label: "Wash test", value: "50 cycles (in-house)" }, { label: "Defects", value: "AQL 2.5 — pass" }, { label: "Result", value: "Released" }],
          packaging: [{ label: "Format", value: "Bundles of 10" }, { label: "Cartons", value: "120" }, { label: "Labels", value: "Batch + QR" }] },
        { code: "ANT-WW-2611-017", product: "Workwear coverall, hi-vis trim", qty: "1,500 pcs", destination: "Nairobi, Kenya", port: "Sokhna", carrier, container: "Not yet booked", done: 2, daysAgo: 2, machine, readings: textile("ww"),
          receipt: [{ label: "Material", value: "Twill fabric 260 gsm" }, { label: "Trims lot", value: "HV-0912 reflective tape" }, { label: "Origin", value: "Supplier-declared" }, { label: "Qty received", value: "3,100 m" }],
          mfg: [{ label: "Operation", value: "Dyeing → cut & sew" }, { label: "Machines", value: "DY-02 + sewing line 1" }, { label: "Shift", value: "Day (08:00–16:00)" }, { label: "Line", value: "Sewing line 1" }],
          inspection: [{ label: "AQL", value: "Pending" }], packaging: [{ label: "Format", value: "Pending" }] },
      ],
    };
  }
  const products = productsOf(factory);
  const code = factory.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "FAC";
  const dests = ["Hamburg, Germany", "Jeddah, Saudi Arabia", "Lagos, Nigeria"];
  const generic = (seed: string) => (ts: number): Reading[] => [
    { label: "Process temperature", unit: "°C", values: bandSeries(`${seed}-t-${ts}`, 72, 2.5), min: 65, max: 80 },
    { label: "Line speed", unit: "units/min", values: bandSeries(`${seed}-s-${ts}`, 42, 4), min: 35, max: 50 },
    { label: "Relative humidity", unit: "%", values: bandSeries(`${seed}-h-${ts}`, 48, 4), min: 35, max: 60 },
  ];
  return {
    signers,
    certs: ["ISO 9001"],
    specs: products.slice(0, 3).map((p, i) => ({
      code: `${code}-${String(i + 1).padStart(2, "0")}-2611-${String(11 + i * 7).padStart(3, "0")}`, product: p, qty: `${(i + 1) * 800} units`, destination: dests[i % 3], port: i === 1 ? "Sokhna" : "Alexandria",
      carrier, container: i === 0 ? "NBLU 600114-2" : "Not yet booked", done: [5, 4, 2][i], daysAgo: [8, 5, 2][i], machine: "Line 1 process station", readings: generic(`g${i}`),
      receipt: [{ label: "Material", value: "Primary raw material lot" }, { label: "Supplier lot", value: `RM-${4100 + i * 37} (fictional)` }, { label: "Qty received", value: "As per purchase order" }],
      mfg: [{ label: "Operation", value: `${p} production run` }, { label: "Machine", value: "Line 1 process station" }, { label: "Shift", value: "Day (08:00–16:00)" }],
      inspection: [{ label: "Sampling", value: "AQL 2.5" }, { label: "Result", value: "Released" }],
      packaging: [{ label: "Format", value: "Export cartons" }, { label: "Labels", value: "Batch + QR" }],
    })),
  };
}

function seed(factory: Factory): TraceData {
  const { specs, signers, certs } = specsFor(factory);
  const site = factory.location;
  const audit: AuditEvent[] = [];
  const batches: Batch[] = specs.map((s) => {
    const start = DEMO_TODAY - s.daysAgo * DAY;
    const ts = [start + 7 * 3600e3, start + DAY + 15 * 3600e3, start + 2 * DAY + 10 * 3600e3, start + 3 * DAY + 11 * 3600e3, start + 4 * DAY + 16 * 3600e3];
    const raw: Step[] = [
      { kind: "receipt", title: "Raw material received & identified", ts: ts[0], location: `${site} — Goods-in`, actor: "Stores", facts: s.receipt, done: s.done > 0 },
      { kind: "manufacturing", title: "Production run", ts: ts[1], location: `${site} — Production hall`, actor: "Production", facts: s.mfg, machine: s.machine, readings: s.done > 1 ? s.readings(ts[1]) : undefined, done: s.done > 1 },
      { kind: "inspection", title: "Final inspection & release", ts: ts[2], location: `${site} — QC lab`, actor: "Quality", facts: s.inspection, done: s.done > 2 },
      { kind: "packaging", title: "Packed, labelled & QR-tagged", ts: ts[3], location: `${site} — Dispatch`, actor: "Dispatch", facts: s.packaging, done: s.done > 3 },
      { kind: "shipping", title: s.done > 4 ? `Shipped to ${s.destination}` : `Planned shipment to ${s.destination}`, ts: ts[4], location: s.port, actor: "Logistics",
        facts: [{ label: "Carrier", value: s.carrier }, { label: "Container", value: s.container }, { label: "Port of loading", value: s.port }, { label: "Destination", value: s.destination }], done: s.done > 4 },
    ];
    const steps = chain(s.code, raw, signers);
    steps.forEach((st) => {
      if (!st.block) return;
      audit.push({ id: `${s.code}-b${st.block.index}`, ts: st.ts + 4 * 60e3, batchId: s.code, event: `${STEP_META[st.kind].label} recorded`, actor: st.block.signer.split(" · ")[0], block: `#${st.block.index}`, result: "ok" });
      if (st.kind === "manufacturing") audit.push({ id: `${s.code}-iot`, ts: st.ts + 30 * 60e3, batchId: s.code, event: `IoT stream anchored (${st.readings?.length ?? 0} sensors, 14 samples)`, actor: "IoT gateway", block: `#${st.block.index}`, result: "info" });
    });
    if (s.done > 4) audit.push({ id: `${s.code}-qr`, ts: ts[4] + 2 * 3600e3, batchId: s.code, event: "QR product journey published", actor: "Portal", block: "—", result: "info" });
    if (s.done > 4 && s.daysAgo > 15) audit.push({ id: `${s.code}-scan`, ts: ts[4] + 9 * DAY, batchId: s.code, event: `Buyer scanned QR (${s.destination.split(",")[0]})`, actor: "Public page", block: "—", result: "info" });
    return { id: s.code, product: s.product, qty: s.qty, destination: s.destination, steps, certs };
  });
  return { batches, selected: batches[0]?.id ?? "", tamper: null, lastVerified: {}, audit };
}

// ---------------- Display localisation ----------------
// Seeded records stay in English (their text feeds the simulated hashes); these helpers translate
// composite strings at render time only.
/** "Hamburg, Germany" / "Site — Goods-in" → each part translated. */
const trParts = (s: string, sep: string, tr: TFunction, joinAr = sep) => s.split(sep).map((p) => tr(p)).join(joinAr);
const trPlace = (s: string, tr: TFunction) => trParts(trParts(s, " — ", tr), ", ", tr, "، ");
/** "1,200 pcs" → "1,200 قطعة". */
function trQty(s: string, tr: TFunction) {
  const m = s.match(/^([\d.,]+)\s+(.+)$/);
  return m ? `${m[1]} ${tr(m[2])}` : tr(s);
}
/** "Stores clerk · key ••a41c" → role and "key" translated. */
function trSigner(s: string, tr: TFunction) {
  const [role, key] = s.split(" · ");
  return key ? `${tr(role)} · ${key.replace(/^key /, `${tr("key")} `)}` : tr(role);
}
const EDITED = " (edited after signing)";
const trFact = (v: string, tr: TFunction) => (v.endsWith(EDITED) ? `${tr(v.slice(0, -EDITED.length))} ${tr("(edited after signing)")}` : tr(v));
function trStepTitle(s: string, tr: TFunction) {
  let m = s.match(/^Shipped to (.+)$/);
  if (m) return tr("Shipped to {destination}", { destination: trPlace(m[1], tr) });
  m = s.match(/^Planned shipment to (.+)$/);
  if (m) return tr("Planned shipment to {destination}", { destination: trPlace(m[1], tr) });
  return tr(s);
}
function trEvent(s: string, tr: TFunction) {
  let m = s.match(/^Record edited off-ledger: (.+) \(demo tamper\)$/);
  if (m) return tr("Record edited off-ledger: {stage} (demo tamper)", { stage: tr(m[1]) });
  m = s.match(/^IoT stream anchored \((\d+) sensors, (\d+) samples\)$/);
  if (m) return tr("IoT stream anchored ({sensors} sensors, {samples} samples)", { sensors: m[1], samples: m[2] });
  m = s.match(/^Buyer scanned QR \((.+)\)$/);
  if (m) return tr("Buyer scanned QR ({city})", { city: tr(m[1]) });
  m = s.match(/^Chain verified — (\d+)\/(\d+) blocks valid$/);
  if (m) return tr("Chain verified — {valid}/{total} blocks valid", { valid: m[1], total: m[2] });
  m = s.match(/^Integrity check failed at block #(\d+)$/);
  if (m) return tr("Integrity check failed at block #{block}", { block: m[1] });
  m = s.match(/^(.+) recorded$/);
  if (m) return tr("{stage} recorded", { stage: tr(m[1]) });
  return tr(s);
}

const statusOf = (b: Batch) => {
  const done = b.steps.filter((s) => s.done).length;
  if (done === 5) return { label: "Shipped", tone: "good" as const };
  if (done === 4) return { label: "Ready to ship", tone: "info" as const };
  return { label: "In production", tone: "warn" as const };
};

// ---------------- Component ----------------
type VerifyState = { batchId: string; cursor: number; results: BlockCheck[] } | null;

export default function Traceability({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<TraceData>(service.id, seed);
  const reduce = useReducedMotion();
  const tr = useT();
  const { isRtl } = useLocale();
  const { fmtDate, fmtDateTime } = useDateFormat();
  const [openStep, setOpenStep] = useState<number>(1);
  const [verify, setVerify] = useState<VerifyState>(null);
  const [auditScope, setAuditScope] = useState<"batch" | "all">("batch");
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const t = timer;
    return () => { if (t.current) window.clearInterval(t.current); };
  }, []);

  const batch = data.batches.find((b) => b.id === data.selected) ?? data.batches[0];
  if (!batch) return <WorkspaceFrame service={service} onReset={reset}><Panel>{tr("No batches available.")}</Panel></WorkspaceFrame>;

  const blocks = batch.steps.filter((s) => s.block);
  const tampered = data.tamper?.batchId === batch.id ? data.tamper : null;
  const v = verify?.batchId === batch.id ? verify : null;
  const verifying = Boolean(v && v.cursor < v.results.length);
  const last = data.lastVerified[batch.id];
  const doneCount = batch.steps.filter((s) => s.done).length;
  const status = statusOf(batch);

  const stopTimer = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };

  const selectBatch = (id: string) => {
    stopTimer();
    setVerify(null);
    setOpenStep(1);
    setData((d) => ({ ...d, selected: id }));
  };

  const log = (event: string, result: AuditEvent["result"]) =>
    setData((d) => ({ ...d, audit: [{ id: uid("ev"), ts: Date.now(), batchId: batch.id, event, actor: "You (demo user)", block: "—", result }, ...d.audit] }));

  const runVerify = () => {
    stopTimer();
    const results = verifyChain(batch);
    const finish = () => {
      const ok = results.every((r) => r === "ok");
      const firstBad = results.findIndex((r) => r !== "ok");
      const now = Date.now();
      setData((d) => ({
        ...d,
        lastVerified: { ...d.lastVerified, [batch.id]: { ts: now, ok } },
        audit: [{ id: uid("ev"), ts: now, batchId: batch.id, event: ok ? `Chain verified — ${results.length}/${results.length} blocks valid` : `Integrity check failed at block #${firstBad + 1}`, actor: "Ledger verifier", block: ok ? `#1–#${results.length}` : `#${firstBad + 1}`, result: ok ? "ok" : "fail" }, ...d.audit],
      }));
      if (ok) toast.success(tr("Simulated chain verified"), { description: tr("{count} blocks recomputed — all hashes and links match.", { count: results.length }) });
      else toast.error(tr("Tampering detected (simulated)"), { description: tr("Block #{block} no longer matches its stored hash.", { block: firstBad + 1 }) });
    };
    if (reduce) {
      setVerify({ batchId: batch.id, cursor: results.length, results });
      finish();
      return;
    }
    setVerify({ batchId: batch.id, cursor: 0, results });
    let c = 0;
    timer.current = window.setInterval(() => {
      c += 1;
      setVerify({ batchId: batch.id, cursor: c, results });
      if (c >= results.length) { stopTimer(); finish(); }
    }, 420);
  };

  const simulateTamper = () => {
    const inspection = batch.steps.findIndex((s) => s.kind === "inspection" && s.block);
    const idx = inspection >= 0 ? inspection : batch.steps.findIndex((s) => s.block);
    if (idx < 0) return;
    const target = batch.steps[idx];
    const fi = target.facts.length - 1;
    stopTimer();
    setVerify(null);
    setData((d) => ({
      ...d,
      tamper: { batchId: batch.id, step: idx, original: target.facts[fi].value },
      batches: d.batches.map((b) => (b.id !== batch.id ? b : { ...b, steps: b.steps.map((s, i) => (i !== idx ? s : { ...s, facts: s.facts.map((f, j) => (j === fi ? { ...f, value: `${f.value} (edited after signing)` } : f)) })) })),
      audit: [{ id: uid("ev"), ts: Date.now(), batchId: batch.id, event: `Record edited off-ledger: ${STEP_META[target.kind].label} (demo tamper)`, actor: "Unknown user", block: `#${target.block?.index ?? "?"}`, result: "warn" }, ...d.audit],
    }));
    setOpenStep(idx);
    toast.warning(tr("A signed record was edited (simulation)"), { description: tr("Run “Verify chain” to see how the ledger exposes it.") });
  };

  const restore = () => {
    if (!tampered) return;
    stopTimer();
    setVerify(null);
    setData((d) => ({
      ...d,
      tamper: null,
      batches: d.batches.map((b) => (b.id !== tampered.batchId ? b : { ...b, steps: b.steps.map((s, i) => (i !== tampered.step ? s : { ...s, facts: s.facts.map((f, j) => (j === s.facts.length - 1 ? { ...f, value: tampered.original } : f)) })) })),
      audit: [{ id: uid("ev"), ts: Date.now(), batchId: tampered.batchId, event: "Original record restored from signed copy", actor: "You (demo user)", block: "—", result: "info" }, ...d.audit],
    }));
  };

  const blockState = (i: number): "idle" | "checking" | BlockCheck => {
    if (!v) return "idle";
    if (i < v.cursor) return v.results[i];
    if (i === v.cursor && verifying) return "checking";
    return "idle";
  };

  const mfg = batch.steps.find((s) => s.kind === "manufacturing");
  const hot = mfg?.readings?.find((r) => (r.max !== undefined && Math.max(...r.values) > r.max) || (r.min !== undefined && Math.min(...r.values) < r.min));
  const audit = data.audit.filter((e) => auditScope === "all" || e.batchId === batch.id).sort((a, b) => b.ts - a.ts);
  const totalBlocks = data.batches.reduce((n, b) => n + b.steps.filter((s) => s.block).length, 0);

  return (
    <WorkspaceFrame service={service} onReset={() => { stopTimer(); setVerify(null); reset(); }} notice={tr("The ledger, hashes, signer keys, IoT readings and QR page are simulated for demonstration; no blockchain network is used.")}>
      {/* Simulated ledger banner */}
      <div className="mb-5 flex flex-col gap-3 overflow-hidden rounded-2xl bg-navy-950 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-500/15 text-gold-400 ring-1 ring-gold-500/30"><Link2 className="size-5" /></span>
          <div>
            <p className="text-base font-semibold tracking-tight text-gold-300 sm:text-lg">{tr("Simulated ledger — not a real blockchain")}</p>
            <p className="text-xs text-white/60">{tr("Hashes are decorative digests computed in your browser to illustrate tamper evidence.")}</p>
          </div>
        </div>
        <div className="flex gap-5 text-xs text-white/70">
          <span><span className="block text-lg font-semibold tabular-nums text-white">{data.batches.length}</span>{tr("batches")}</span>
          <span><span className="block text-lg font-semibold tabular-nums text-white">{totalBlocks}</span>{tr("blocks")}</span>
          <span><span className="block text-lg font-semibold tabular-nums text-white">{Object.values(data.lastVerified).filter((x) => x.ok).length}</span>{tr("verified")}</span>
        </div>
      </div>

      {/* Batch selector */}
      <div role="radiogroup" aria-label={tr("Select batch")} className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.batches.map((b) => {
          const st = statusOf(b);
          const on = b.id === batch.id;
          const lv = data.lastVerified[b.id];
          return (
            <button key={b.id} role="radio" aria-checked={on} onClick={() => selectBatch(b.id)} className={cn("min-w-0 rounded-2xl border bg-white p-4 text-start shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", on ? "border-teal-400 ring-2 ring-teal-100" : "border-line hover:border-navy-500/30")}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px] font-semibold text-navy-600">{b.id}</span>
                <StatusPill tone={st.tone}>{tr(st.label)}</StatusPill>
              </div>
              <p className="mt-1.5 truncate text-sm font-semibold text-navy-900">{tr(b.product)}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted"><MapPin className="size-3 shrink-0" /> {trPlace(b.destination, tr)} · {trQty(b.qty, tr)}</p>
              <div className="mt-3 flex items-center gap-1" aria-hidden>
                {b.steps.map((s, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", s.done ? "bg-teal-500" : "bg-navy-900/10")} />)}
              </div>
              {lv ? <p className={cn("mt-2 text-[11px] font-medium", lv.ok ? "text-emerald-700" : "text-red-700")}>{lv.ok ? tr("Chain verified") : tr("Integrity issue found")}</p> : null}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        {/* Journey */}
        <Panel title={tr("Batch journey")} description={tr("{product} · {done}/5 stages recorded", { product: tr(batch.product), done: doneCount })} actions={<StatusPill tone={status.tone}>{tr(status.label)}</StatusPill>}>
          <ol className="relative">
            {batch.steps.map((s, i) => {
              const Icon = STEP_META[s.kind].icon;
              const open = openStep === i;
              const isTampered = tampered?.step === i;
              const next = batch.steps[i + 1];
              return (
                <motion.li key={`${batch.id}-${s.kind}`} initial={reduce ? false : { opacity: 0, x: isRtl ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduce ? 0 : i * 0.08, duration: 0.3 }} className="relative flex gap-3 pb-4 last:pb-0">
                  {next ? (
                    <span className="absolute bottom-0 start-[17px] top-10 w-0.5 overflow-hidden bg-navy-900/10" aria-hidden>
                      <motion.span className="block h-full w-full origin-top bg-teal-500" initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: s.done && next.done ? 1 : s.done ? 0.5 : 0 }} transition={{ delay: reduce ? 0 : 0.2 + i * 0.12, duration: reduce ? 0 : 0.5 }} />
                    </span>
                  ) : null}
                  <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2", s.done ? "border-teal-500 bg-teal-50 text-teal-700" : "border-dashed border-navy-900/20 bg-white text-navy-400", isTampered && "border-red-400 bg-red-50 text-red-600")}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => setOpenStep(open ? -1 : i)} aria-expanded={open} className="flex w-full items-start justify-between gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">{tr(STEP_META[s.kind].label)}</span>
                        <span className={cn("block text-sm font-semibold", s.done ? "text-navy-900" : "text-navy-500")}>{trStepTitle(s.title, tr)}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                          <span>{s.done ? fmtDateTime(s.ts) : tr("Pending")}</span>
                          <span className="flex min-w-0 items-center gap-1"><MapPin className="size-3 shrink-0" /><span className="truncate">{trPlace(s.location, tr)}</span></span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {s.block ? <span className="hidden font-mono text-[10px] text-navy-500 sm:inline">{tr("block #{index}", { index: s.block.index })}</span> : null}
                        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open ? (
                        <motion.div initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }} className="overflow-hidden">
                          <div className="mt-3 rounded-xl border border-line bg-canvas/60 p-3">
                            {s.done ? (
                              <>
                                <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                                  {s.facts.map((f, j) => (
                                    <div key={j} className="min-w-0">
                                      <dt className="text-[11px] font-medium text-muted">{tr(f.label)}</dt>
                                      <dd className={cn("break-words text-sm text-navy-900", isTampered && j === s.facts.length - 1 && "rounded bg-red-50 px-1 text-red-700")}>{trFact(f.value, tr)}</dd>
                                    </div>
                                  ))}
                                </dl>
                                {s.readings ? <IotReadings step={s} /> : null}
                                {s.block ? (
                                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2 font-mono text-[11px] text-navy-600">
                                    <span>{tr("block #{index}", { index: s.block.index })}</span>
                                    <span>{tr("hash")} <span dir="ltr">{shortHash(s.block.hash)}</span></span>
                                    <span>{tr("prev")} <span dir="ltr">{shortHash(s.block.prev)}</span></span>
                                    <span className="font-sans text-muted">{tr("signed by {signer}", { signer: trSigner(s.block.signer, tr) })}</span>
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <p className="text-sm text-muted">{tr("Not yet recorded. A block will be appended when this stage is signed off.")}</p>
                            )}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </Panel>

        {/* Ledger */}
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={tr("Ledger blocks")} description={tr("Each block stores the previous block’s hash")} bodyClassName="p-4"
            actions={<Button size="sm" variant="accent" onClick={runVerify} disabled={verifying || blocks.length === 0}>{verifying ? <Loader2 className="animate-spin" /> : <ShieldCheck />} {tr("Verify chain")}</Button>}>
            <ol aria-live="polite">
              {blocks.map((s, i) => {
                const st = blockState(i);
                const tone = st === "ok" ? "border-emerald-300 bg-emerald-50" : st === "content" || st === "link" ? "border-red-300 bg-red-50" : st === "checking" ? "border-teal-300 bg-teal-50/60" : "border-line bg-white";
                return (
                  <li key={s.kind}>
                    {i > 0 ? (
                      <div className="flex h-5 items-center ps-6" aria-hidden>
                        <span className={cn("h-full w-0.5", st === "link" ? "bg-red-300" : st === "ok" ? "bg-emerald-300" : "bg-navy-900/15")} />
                      </div>
                    ) : null}
                    <div className={cn("rounded-xl border px-3 py-2.5 transition-colors duration-300", tone)}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-navy-900">#{s.block!.index} · {tr(STEP_META[s.kind].label)}</span>
                        {st === "checking" ? <Loader2 className="size-4 shrink-0 animate-spin text-teal-600" aria-label={tr("Checking")} />
                          : st === "ok" ? <StatusPill tone="good"><Check /> {tr("Valid")}</StatusPill>
                          : st === "content" ? <StatusPill tone="bad"><X /> {tr("Hash mismatch")}</StatusPill>
                          : st === "link" ? <StatusPill tone="bad"><X /> {tr("Broken link")}</StatusPill>
                          : <span className="shrink-0 text-[11px] text-muted">{fmtDate(s.ts)}</span>}
                      </div>
                      <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 font-mono text-[10.5px] text-navy-600">
                        <span className="text-muted">{tr("hash")}</span><span className="truncate" dir="ltr">{shortHash(s.block!.hash)}</span>
                        <span className="text-muted">{tr("prev")}</span><span className="truncate" dir="ltr">{shortHash(s.block!.prev)}</span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted">{tr("Signer: {signer}", { signer: trSigner(s.block!.signer, tr) })}</p>
                    </div>
                  </li>
                );
              })}
              {blocks.length === 0 ? <li className="text-sm text-muted">{tr("No blocks yet.")}</li> : null}
            </ol>
            {v && !verifying ? (
              v.results.every((r) => r === "ok") ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> {tr("All {count} simulated blocks recomputed — hashes and links match.", { count: v.results.length })}</div>
              ) : (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"><ShieldAlert className="mt-0.5 size-4 shrink-0" /> {tr("A record was changed after signing: its hash no longer matches, and every later block’s link breaks.")}</div>
              )
            ) : last ? (
              <p className="mt-4 text-xs text-muted">{tr("Last check: {result} · {time} UTC", { result: last.ok ? tr("valid") : tr("failed"), time: fmtDateTime(last.ts) })}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              {tampered ? (
                <Button size="sm" variant="outline" onClick={restore}><RotateCcw /> {tr("Restore original record")}</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={simulateTamper} disabled={blocks.length === 0 || Boolean(data.tamper) || verifying}><AlertTriangle /> {tr("Simulate tampering")}</Button>
              )}
            </div>
          </Panel>
          {hot ? (
            <AIInsight title={tr("AI quality signal")}>
              {tr("{reading} on {machine} left its band during this batch (peak {peak} {unit}, limit {limit} {unit}). Consider a targeted re-inspection of parts produced in that window before release — the same machine is flagged in the digital twin.", { reading: tr(hot.label), machine: tr(mfg?.machine ?? ""), peak: Math.max(...hot.values), limit: hot.max ?? "", unit: tr(hot.unit) })}
            </AIInsight>
          ) : (
            <AIInsight title={tr("AI traceability note")}>
              {tr("All IoT readings for this batch stayed within their bands. The record links {count} stages; buyers can follow them from the QR page without seeing internal cost or supplier pricing.", { count: doneCount })}
            </AIInsight>
          )}
        </div>
      </div>

      {/* QR journey */}
      <div className="mt-5">
        <Panel title={tr("QR product-journey preview")} description={tr("What a buyer would see after scanning the carton label (simulated public page)")}>
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-2xl border border-line bg-white p-3 shadow-card">
                <PseudoQr seed={batch.id} size={150} />
              </div>
              <div className="min-w-0 space-y-3 text-sm">
                <p className="flex items-center gap-2 font-semibold text-navy-900"><QrCode className="size-4 shrink-0 text-teal-600" /> <span className="truncate">{tr("Carton label · {id}", { id: batch.id })}</span></p>
                <p className="text-muted">{tr("Printed on every carton at packaging. The pattern shown is decorative and not scannable; in production it would point to a public, read-only journey page.")}</p>
                <ul className="space-y-1 text-xs text-navy-700">
                  <li>• {tr("Shows origin, stages and declared certifications")}</li>
                  <li>• {tr("Hides supplier prices, operators and internal notes")}</li>
                  <li>• {tr("Links each stage to its ledger block")}</li>
                </ul>
                <Button size="sm" variant="outline" onClick={() => { toast.success(tr("Demo link copied"), { description: `trace.jahez.demo/${batch.id.toLowerCase()}` }); log("QR journey link shared (demo)", "info"); }}><ScanLine /> {tr("Copy demo link")}</Button>
              </div>
            </div>
            <PhonePreview batch={batch} factory={factory} verified={last} />
          </div>
        </Panel>
      </div>

      {/* Audit */}
      <div className="mt-5">
        <Panel title={tr("Audit events")} description={tr("Append-only event log (simulated)")} bodyClassName="p-0"
          actions={
            <div role="tablist" aria-label={tr("Audit scope")} className="inline-flex rounded-lg bg-navy-900/5 p-0.5 text-xs">
              {(["batch", "all"] as const).map((k) => (
                <button key={k} role="tab" aria-selected={auditScope === k} onClick={() => setAuditScope(k)} className={cn("rounded-md px-2.5 py-1 font-medium", auditScope === k ? "bg-white text-navy-900 shadow-sm" : "text-navy-600")}>{k === "batch" ? tr("This batch") : tr("All")}</button>
              ))}
            </div>
          }>
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[600px] text-start text-sm">
              <thead className="sticky top-0 bg-canvas text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">{tr("Time (UTC)")}</th>
                  {auditScope === "all" ? <th className="px-4 py-2 font-semibold">{tr("Batch")}</th> : null}
                  <th className="px-4 py-2 font-semibold">{tr("Event")}</th>
                  <th className="px-4 py-2 font-semibold">{tr("Actor")}</th>
                  <th className="px-4 py-2 font-semibold">{tr("Block")}</th>
                  <th className="px-4 py-2 font-semibold">{tr("Result")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {audit.map((e) => (
                  <tr key={e.id} className="hover:bg-canvas/60">
                    <td className="whitespace-nowrap px-4 py-2 text-xs tabular-nums text-muted">{fmtDateTime(e.ts)}</td>
                    {auditScope === "all" ? <td className="whitespace-nowrap px-4 py-2 font-mono text-[11px] text-navy-600">{e.batchId}</td> : null}
                    <td className="px-4 py-2 text-navy-900">{trEvent(e.event, tr)}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-navy-700">{tr(e.actor)}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-navy-600">{e.block}</td>
                    <td className="px-4 py-2"><StatusPill tone={e.result === "ok" ? "good" : e.result === "fail" ? "bad" : e.result === "warn" ? "warn" : "info"}>{e.result === "ok" ? tr("Valid") : e.result === "fail" ? tr("Failed") : e.result === "warn" ? tr("Warning") : tr("Info")}</StatusPill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </WorkspaceFrame>
  );
}

// ---------------- Sub-components ----------------
function IotReadings({ step }: { step: Step }) {
  const tr = useT();
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-700"><Cpu className="size-3.5 shrink-0" /> <span className="truncate">{tr("IoT readings · {machine}", { machine: tr(step.machine ?? "") })}</span></p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(step.readings ?? []).map((r, k) => {
          const peak = Math.max(...r.values);
          const low = Math.min(...r.values);
          const out = (r.max !== undefined && peak > r.max) || (r.min !== undefined && low < r.min);
          const lastV = r.values[r.values.length - 1];
          return (
            <div key={r.label} className={cn("min-w-0 rounded-lg border bg-white p-2", out ? "border-amber-300" : "border-line")}>
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] text-muted">{tr(r.label)}</span>
                <Activity className={cn("size-3 shrink-0", out ? "text-amber-600" : "text-teal-600")} />
              </div>
              <p className="text-sm font-semibold tabular-nums text-navy-900">{lastV} <span className="text-[11px] font-normal text-muted">{tr(r.unit)}</span></p>
              <div className="h-10" aria-hidden dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={r.values.map((y, i) => ({ i, y }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                    <YAxis hide domain={[Math.min(low, r.min ?? low), Math.max(peak, r.max ?? peak)]} />
                    {r.max !== undefined ? <ReferenceLine y={r.max} stroke="#F59E0B" strokeDasharray="3 3" /> : null}
                    {r.min !== undefined ? <ReferenceLine y={r.min} stroke="#F59E0B" strokeDasharray="3 3" /> : null}
                    <Line type="monotone" dataKey="y" stroke={out ? CHART_COLORS[6] : CHART_COLORS[k % 2 === 0 ? 0 : 3]} strokeWidth={1.75} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted">{r.min !== undefined ? tr("Band {min}–{max}", { min: r.min, max: r.max ?? "" }) : tr("Limit {max}", { max: r.max ?? "" })} {tr(r.unit)}{out ? ` · ${tr("excursion")}` : ""}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhonePreview({ batch, factory, verified }: { batch: Batch; factory: Factory; verified?: { ts: number; ok: boolean } }) {
  const recorded = batch.steps.filter((s) => s.done).length;
  const tr = useT();
  const { locale } = useLocale();
  const { fmtDate } = useDateFormat();
  return (
    <figure className="mx-auto w-[260px] max-w-full shrink-0 rounded-[2.2rem] border-[9px] border-navy-950 bg-navy-950 shadow-lift" aria-label={tr("Phone preview of the public product-journey page")}>
      <div className="relative overflow-hidden rounded-[1.6rem] bg-white">
        <div className="mx-auto mt-1.5 h-4 w-20 rounded-full bg-navy-950" aria-hidden />
        <div className="flex items-center gap-1.5 px-4 pt-2 text-[10px] text-muted"><Smartphone className="size-3" /> trace.jahez.demo</div>
        <div className="max-h-[440px] overflow-y-auto px-4 pb-4 pt-2">
          <div className="rounded-xl bg-gradient-to-br from-navy-900 to-navy-700 p-3 text-white">
            <p className="text-[10px] uppercase tracking-wider text-white/60">{tr("Product journey")}</p>
            <p className="mt-0.5 text-sm font-semibold leading-snug">{tr(batch.product)}</p>
            <p className="mt-1 font-mono text-[10px] text-white/70">{batch.id} · {trQty(batch.qty, tr)}</p>
          </div>
          <div className="mt-3 space-y-1.5 text-[11px]">
            <p className="flex items-start gap-1.5"><FactoryIcon className="mt-0.5 size-3 shrink-0 text-teal-600" /><span><span className="font-semibold text-navy-900">{tr("Made in Egypt · {factory}", { factory: locale === "ar" ? (factory.nameAr ?? factory.name) : factory.name })}</span><br /><span className="text-muted">{tr(factory.location)}</span></span></p>
            <p className="flex items-center gap-1.5"><Truck className="size-3 shrink-0 text-teal-600" /><span className="text-navy-800">{tr("Destination: {destination}", { destination: trPlace(batch.destination, tr) })}</span></p>
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Certifications (manufacturer-declared)")}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {batch.certs.map((c) => <span key={c} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-800 ring-1 ring-inset ring-teal-200"><BadgeCheck className="size-2.5" />{tr(c)}</span>)}
          </div>
          <p className="mt-0.5 text-[9.5px] text-muted">{tr("Illustrative — not verified by JAHEZ.")}</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">{tr("Journey")}</p>
          <ol className="mt-1.5 space-y-2">
            {batch.steps.map((s) => (
              <li key={s.kind} className="flex items-start gap-2">
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", s.done ? "bg-teal-500 text-white" : "border border-dashed border-navy-900/25")}>{s.done ? <Check className="size-2.5" strokeWidth={3} /> : null}</span>
                <span className="min-w-0">
                  <span className={cn("block text-[11px] font-medium", s.done ? "text-navy-900" : "text-muted")}>{tr(STEP_META[s.kind].label)}</span>
                  <span className="block truncate text-[10px] text-muted">{s.done ? `${fmtDate(s.ts)} · ${trPlace(s.kind === "shipping" ? s.location : s.location.split(" — ")[1] ?? s.location, tr)}` : tr("Upcoming")}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className={cn("mt-3 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[10px]", verified?.ok ? "bg-emerald-50 text-emerald-800" : verified ? "bg-red-50 text-red-800" : "bg-navy-900/5 text-navy-700")}>
            {verified?.ok ? <ShieldCheck className="mt-px size-3 shrink-0" /> : <Anchor className="mt-px size-3 shrink-0" />}
            <span>{verified ? (verified.ok ? tr("Record chain checked {date}", { date: fmtDate(verified.ts) }) : tr("Record chain check failed")) : tr("{count} records anchored", { count: recorded })} · {tr("simulated ledger")}</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
