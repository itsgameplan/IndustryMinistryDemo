"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BrainCircuit, CalendarCheck, ChevronLeft, ChevronRight, Database, GitBranch, Repeat, Search, Timer, X } from "lucide-react";
import { AIInsight, KpiTile, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type SeedKey, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import { hashStr, hours, rng, useSimulatedAI } from "./shared";

// ---------------- Model ----------------
interface PNode { id: string; label: string; x: number; y: number; service: number; resources: string[]; kind?: "start" | "end" | "rework" }
interface PEdge { from: string; to: string; median: number; bend?: number }
interface Variant { share: number; path: string[] }
interface Diagnosis {
  id: string; nodes: string[]; title: string; summary: string;
  hypotheses: { text: string; confidence: number }[];
  improvements: { id: string; text: string; impact: number }[];
}
interface Model { caseLabel: string; caseCount: number; process: string; targetDays: number; nodes: PNode[]; edges: PEdge[]; variants: Variant[]; diagnoses: Diagnosis[]; note?: string }

const DELTA: Model = {
  caseLabel: "SO-26-", caseCount: 240, process: "Order-to-delivery · machined & forged parts", targetDays: 9,
  nodes: [
    { id: "n1", label: "Order received (EDI)", x: 80, y: 70, service: 0.2, resources: ["OEM portal", "EDI gateway"], kind: "start" },
    { id: "n2", label: "Planned & released", x: 250, y: 70, service: 0.5, resources: ["Planner · M. Saad", "Planner · R. Fathy"] },
    { id: "n3", label: "Material issued", x: 420, y: 70, service: 0.8, resources: ["WMS · Store 1", "WMS · Store 2"] },
    { id: "n4", label: "CNC machining", x: 590, y: 70, service: 3.5, resources: ["CNC-07", "CNC-07", "CNC-03"] },
    { id: "n5", label: "Deburr & wash", x: 760, y: 70, service: 0.8, resources: ["Wash cell 1"] },
    { id: "n6", label: "Heat treatment", x: 880, y: 200, service: 6, resources: ["FURNACE-01"] },
    { id: "n7", label: "Final QC (CMM)", x: 760, y: 340, service: 1.2, resources: ["CMM-1", "CMM-2"] },
    { id: "n8", label: "Rework", x: 590, y: 220, service: 2, resources: ["CNC-03", "Rework bench"], kind: "rework" },
    { id: "n9", label: "Packing & ASN", x: 420, y: 340, service: 1, resources: ["Dispatch bay"] },
    { id: "n10", label: "Shipped", x: 160, y: 340, service: 0.1, resources: ["Logistics"], kind: "end" },
  ],
  edges: [
    { from: "n1", to: "n2", median: 6 }, { from: "n2", to: "n3", median: 10 }, { from: "n2", to: "n4", median: 2, bend: 52 }, { from: "n3", to: "n4", median: 30 },
    { from: "n4", to: "n5", median: 3 }, { from: "n5", to: "n6", median: 22 }, { from: "n5", to: "n7", median: 4 }, { from: "n6", to: "n7", median: 8 },
    { from: "n7", to: "n8", median: 4 }, { from: "n8", to: "n4", median: 24 }, { from: "n7", to: "n9", median: 3 }, { from: "n9", to: "n10", median: 12 },
  ],
  variants: [
    { share: 0.44, path: ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n9", "n10"] },
    { share: 0.38, path: ["n1", "n2", "n3", "n4", "n5", "n7", "n9", "n10"] },
    { share: 0.1, path: ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n4", "n5", "n6", "n7", "n9", "n10"] },
    { share: 0.06, path: ["n1", "n2", "n3", "n4", "n5", "n7", "n8", "n4", "n5", "n7", "n9", "n10"] },
    { share: 0.02, path: ["n1", "n2", "n4", "n5", "n7", "n9", "n10"] },
  ],
  diagnoses: [
    {
      id: "d-cnc", nodes: ["n4"], title: "Queue before CNC machining",
      summary: "Orders wait longest before CNC machining. Most housing jobs are routed to CNC-07, which runs at reduced efficiency with rising spindle vibration.",
      hypotheses: [
        { text: "CNC-07 is the default MES routing for housings; its degraded condition adds micro-stops and longer cycles", confidence: 0.82 },
        { text: "Weekly batch release from planning creates Monday queue peaks", confidence: 0.64 },
        { text: "Rework parts re-enter the same CNC queue and compete with new orders", confidence: 0.48 },
      ],
      improvements: [
        { id: "imp-cnc-route", text: "Re-route ~30% of housing jobs from CNC-07 to CNC-03 in MES", impact: 9 },
        { id: "imp-cnc-pdm", text: "Schedule the CNC-07 spindle maintenance window flagged by predictive maintenance", impact: 7 },
        { id: "imp-cnc-wip", text: "Release daily instead of weekly, with a WIP cap per cell", impact: 6 },
      ],
    },
    {
      id: "d-ht", nodes: ["n6"], title: "Parts waiting for a furnace batch",
      summary: "Knuckles and shafts wait for FURNACE-01 to fill a full load. There is a single furnace and its schedule is not visible to planners.",
      hypotheses: [
        { text: "Furnace is only started at full load, regardless of waiting time", confidence: 0.78 },
        { text: "Single furnace with no backup capacity on peak days", confidence: 0.6 },
        { text: "Heat-treatment schedule is not visible in MES, so upstream release ignores it", confidence: 0.45 },
      ],
      improvements: [
        { id: "imp-ht-batch", text: "Batching rule with a maximum waiting time (e.g. 10 h)", impact: 8 },
        { id: "imp-ht-shift", text: "Add a third heat-treatment shift on peak days", impact: 5 },
        { id: "imp-ht-mes", text: "Publish furnace schedule in MES for planners", impact: 3 },
      ],
    },
    {
      id: "d-qc", nodes: ["n7", "n8"], title: "Rework loop from CMM inspection",
      summary: "Around one in six orders loop back from final QC to rework and re-queue at CNC, adding more than a day each time.",
      hypotheses: [
        { text: "Bore-diameter drift on CNC-07 parts correlates with spindle vibration", confidence: 0.74 },
        { text: "CMM program revision mismatch on two housing part numbers", confidence: 0.52 },
        { text: "First-article inspection skipped on night shift", confidence: 0.4 },
      ],
      improvements: [
        { id: "imp-qc-spc", text: "SPC on bore diameter with automatic alert to the cell", impact: 10 },
        { id: "imp-qc-tool", text: "Tool-wear compensation on CNC-07", impact: 6 },
        { id: "imp-qc-fai", text: "Mandatory digital first-article checklist on every shift", impact: 4 },
      ],
    },
  ],
};

function paperModel(factory: Factory, generic: boolean): Model {
  const L = generic
    ? { a1: "Order received", a2: "Order confirmed", a3: "Material issued", a4: "Primary processing", a5: "Secondary processing", a6: "Preparation", a7: "Assembly / making", a8: "Quality inspection", a9: "Rework", a10: "Packing", a11: "Dispatched" }
    : { a1: "Order received (WhatsApp)", a2: "Order logged in ledger", a3: "Yarn issued", a4: "Knitting", a5: "Dyeing & finishing", a6: "Cutting", a7: "Sewing", a8: "QC inspection", a9: "Re-sew (rework)", a10: "Packing", a11: "Dispatched" };
  const R = generic
    ? { a1: ["Sales phone", "Email"], a2: ["Order book"], a3: ["Store"], a4: ["Line 1", "Line 2"], a5: ["Process cell A", "Process cell B"], a6: ["Prep bench"], a7: ["Assembly line 1", "Assembly line 2"], a8: ["QC bench"], a9: ["Rework bench"], a10: ["Packing area"], a11: ["Transport"] }
    : { a1: ["Owner mobile", "Sales mobile"], a2: ["Order ledger"], a3: ["Yarn store"], a4: ["Knitter 04", "Knitter 11", "Knitter 17"], a5: ["Dye jet 1", "Dye jet 2"], a6: ["Cutting table A"], a7: ["Sewing line 1", "Sewing line 2", "Sewing line 3"], a8: ["QC table"], a9: ["Sewing line 3"], a10: ["Packing area"], a11: ["Hired truck"] };
  const product = (factory.products[0] ?? "goods").toLowerCase();
  return {
    caseLabel: generic ? "ORD-" : "AN-", caseCount: 150, process: generic ? `Order-to-dispatch · ${product}` : "Order-to-dispatch · knitted garments", targetDays: 12,
    note: generic ? undefined : "Al Noor keeps paper job cards today — this simulated log shows what becomes visible once orders and job cards are captured digitally.",
    nodes: [
      { id: "a1", label: L.a1, x: 80, y: 70, service: 0.2, resources: R.a1, kind: "start" },
      { id: "a2", label: L.a2, x: 240, y: 70, service: 0.3, resources: R.a2 },
      { id: "a3", label: L.a3, x: 400, y: 70, service: 0.5, resources: R.a3 },
      { id: "a4", label: L.a4, x: 560, y: 70, service: 8, resources: R.a4 },
      { id: "a5", label: L.a5, x: 720, y: 70, service: 10, resources: R.a5 },
      { id: "a6", label: L.a6, x: 870, y: 200, service: 2, resources: R.a6 },
      { id: "a7", label: L.a7, x: 760, y: 340, service: 12, resources: R.a7 },
      { id: "a8", label: L.a8, x: 560, y: 340, service: 1.5, resources: R.a8 },
      { id: "a9", label: L.a9, x: 560, y: 210, service: 2, resources: R.a9, kind: "rework" },
      { id: "a10", label: L.a10, x: 360, y: 340, service: 2, resources: R.a10 },
      { id: "a11", label: L.a11, x: 150, y: 340, service: 0.5, resources: R.a11, kind: "end" },
    ],
    edges: [
      { from: "a1", to: "a2", median: 9 }, { from: "a1", to: "a3", median: 4, bend: 52 }, { from: "a2", to: "a3", median: 14 }, { from: "a3", to: "a4", median: 6 },
      { from: "a4", to: "a5", median: 36 }, { from: "a5", to: "a6", median: 10 }, { from: "a6", to: "a7", median: 8 }, { from: "a7", to: "a8", median: 5 },
      { from: "a8", to: "a9", median: 3 }, { from: "a9", to: "a8", median: 18 }, { from: "a8", to: "a10", median: 6 }, { from: "a10", to: "a11", median: 26 },
    ],
    variants: [
      { share: 0.62, path: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a10", "a11"] },
      { share: 0.18, path: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a8", "a10", "a11"] },
      { share: 0.12, path: ["a1", "a3", "a4", "a5", "a6", "a7", "a8", "a10", "a11"] },
      { share: 0.08, path: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a8", "a9", "a8", "a10", "a11"] },
    ],
    diagnoses: [
      {
        id: "d-dye", nodes: ["a5"], title: generic ? "Queue before secondary processing" : "Batches waiting for colour approval",
        summary: generic ? "Work waits longest between primary and secondary processing, typically for approvals or batch consolidation." : "Knitted rolls wait more than a day before dyeing, mostly for lab-dip colour approval by phone and for full dye-jet loads.",
        hypotheses: generic
          ? [{ text: "Approvals are given verbally or by phone with no SLA", confidence: 0.72 }, { text: "Batches are consolidated to fill equipment capacity", confidence: 0.58 }, { text: "No visibility of upstream output", confidence: 0.41 }]
          : [{ text: "Colour approval depends on the owner or buyer answering a phone call", confidence: 0.81 }, { text: "Dye batches are held until the jet can be filled", confidence: 0.6 }, { text: "Dye house has no visibility of knitting output", confidence: 0.42 }],
        improvements: [
          { id: "imp-dye-approval", text: generic ? "Digital approval with a 4-hour SLA" : "Photo-based lab-dip approval via WhatsApp Business with a 4-hour SLA", impact: 14 },
          { id: "imp-dye-track", text: "QR roll / batch tracking shared with the next department", impact: 6 },
          { id: "imp-dye-batch", text: "Smaller batch rule for urgent orders", impact: 5 },
        ],
      },
      {
        id: "d-qc", nodes: ["a8", "a9"], title: "Rework loop after inspection",
        summary: "About a quarter of orders loop through rework at least once; repeated loops add almost a day each.",
        hypotheses: [
          { text: generic ? "Defects are concentrated on one line or shift" : "Seam defects concentrated on sewing line 3", confidence: 0.7 },
          { text: "Inspection happens only at the end, not in-line", confidence: 0.55 },
          { text: "Defect causes are not recorded, so the same faults recur", confidence: 0.46 },
        ],
        improvements: [
          { id: "imp-qc-inline", text: "In-line inspection at the end of each line", impact: 8 },
          { id: "imp-qc-codes", text: "Digital QC checklist with defect codes", impact: 4 },
          { id: "imp-qc-train", text: generic ? "Targeted operator coaching on the worst line" : "Targeted operator coaching on line 3", impact: 3 },
        ],
      },
      {
        id: "d-dispatch", nodes: ["a11"], title: "Finished goods waiting to leave",
        summary: "Packed orders wait more than a day for transport or payment confirmation before dispatch.",
        hypotheses: [
          { text: "Transport is hired ad hoc per order", confidence: 0.66 },
          { text: "Dispatch is held until payment is confirmed by phone", confidence: 0.58 },
        ],
        improvements: [
          { id: "imp-disp-route", text: "Fixed twice-weekly transport schedule", impact: 10 },
          { id: "imp-disp-credit", text: "Agreed credit terms and e-invoice at packing", impact: 6 },
        ],
      },
    ],
  };
}

function modelFor(key: SeedKey, factory: Factory): Model {
  return key === "delta" ? DELTA : paperModel(factory, key === "generic");
}

// ---------------- Simulated event log ----------------
interface Ev { caseId: string; activity: string; ts: number; resource: string; wait: number; rework: boolean }
const BASE = Date.UTC(2026, 6, 1, 7, 0);
const H = 3600_000;

function generate(model: Model, seedNum: number) {
  const r = rng(seedNum);
  const normal = () => (r() + r() + r() + r() - 2) * 1.7;
  const edgeMedian = new Map(model.edges.map((e) => [`${e.from}>${e.to}`, e.median]));
  const node = new Map(model.nodes.map((n) => [n.id, n]));
  const events: Ev[] = [];
  const cases: { id: string; start: number; end: number; rework: boolean; variant: number }[] = [];
  const spacing = (92 * 24) / model.caseCount;
  for (let i = 0; i < model.caseCount; i++) {
    let pick = r();
    let vi = 0;
    while (vi < model.variants.length - 1 && pick > model.variants[vi].share) { pick -= model.variants[vi].share; vi++; }
    const path = model.variants[vi].path;
    const caseId = `${model.caseLabel}${String(4100 + i * 3 + Math.floor(r() * 3))}`;
    let t = BASE + (i * spacing + r() * spacing) * H;
    const start = t;
    const seen = new Set<string>();
    let rework = false;
    path.forEach((id, k) => {
      const n = node.get(id)!;
      let wait = 0;
      if (k > 0) {
        const med = edgeMedian.get(`${path[k - 1]}>${id}`) ?? 4;
        wait = Math.max(0.1, med * Math.exp(0.55 * normal()));
      }
      const svc = n.service * (0.7 + r() * 0.6);
      t += (wait + svc) * H;
      const again = seen.has(id) || n.kind === "rework";
      if (again) rework = true;
      seen.add(id);
      events.push({ caseId, activity: id, ts: t, resource: n.resources[Math.floor(r() * n.resources.length)], wait: Math.round(wait * 10) / 10, rework: again });
    });
    cases.push({ id: caseId, start, end: t, rework, variant: vi });
  }
  return { events, cases };
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};

const fmtTs = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

// ---------------- Persisted state ----------------
type Sel = { kind: "node" | "edge"; id: string };
interface MiningData { planned: string[]; diagnosed: string[]; selection: Sel | null }

function seed(factory: Factory): MiningData {
  const m = modelFor(seedKeyFor(factory), factory);
  const first = m.diagnoses[0];
  return { planned: [], diagnosed: [first.id], selection: { kind: "node", id: first.nodes[0] } };
}

/** Translate a value; composite "A · B" labels are translated part by part when there is no whole-string entry. */
const tPart = (t: TFunction, s: string) => { const w = t(s); return w !== s || !s.includes(" · ") ? w : s.split(" · ").map((p) => t(p)).join(" · "); };

const severity = (h: number) => (h >= 20 ? "bad" : h >= 8 ? "warn" : "good");
const SEV_COLOR = { good: "#0FA396", warn: "#F59E0B", bad: "#EF4444" } as const;

// ---------------- Graph ----------------
const NW = 136;
const NH = 54;

function trim(ax: number, ay: number, tx: number, ty: number) {
  const dx = tx - ax, dy = ty - ay;
  const t = Math.min(dx ? (NW / 2 + 4) / Math.abs(dx) : Infinity, dy ? (NH / 2 + 4) / Math.abs(dy) : Infinity);
  return { x: ax + dx * t, y: ay + dy * t };
}

function ProcessGraph({ model, edgeStats, nodeStats, selection, onSelect, highlight, bottleneckNodes }: {
  model: Model;
  edgeStats: Map<string, { count: number; median: number }>;
  nodeStats: Map<string, { visits: number; inWait: number }>;
  selection: Sel | null;
  onSelect: (s: Sel) => void;
  highlight: string[] | null;
  bottleneckNodes: Set<string>;
}) {
  const reduce = useReducedMotion();
  const t = useT();
  const pos = new Map(model.nodes.map((n) => [n.id, n]));
  const maxCount = Math.max(...[...edgeStats.values()].map((s) => s.count), 1);
  const hlEdges = highlight ? new Set(highlight.slice(1).map((id, i) => `${highlight[i]}>${id}`)) : null;
  const hlNodes = highlight ? new Set(highlight) : null;
  const keyAct = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-[radial-gradient(circle_at_1px_1px,#E5E8EE_1px,transparent_0)] [background-size:18px_18px]" role="region" aria-label={t("Discovered process map")} tabIndex={0}>
      <svg viewBox="0 0 960 410" className="block w-full min-w-[760px]">
        <defs>
          {(Object.keys(SEV_COLOR) as (keyof typeof SEV_COLOR)[]).map((k) => (
            <marker key={k} id={`pm-arrow-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={SEV_COLOR[k]} /></marker>
          ))}
        </defs>
        {model.edges.map((e) => {
          const key = `${e.from}>${e.to}`;
          const st = edgeStats.get(key);
          if (!st) return null;
          const a = pos.get(e.from)!, b = pos.get(e.to)!;
          const reverse = model.edges.some((o) => o.from === e.to && o.to === e.from);
          const back = pos.get(e.to)!.kind === "rework" || pos.get(e.from)!.kind === "rework" || reverse;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = b.x - a.x, dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const bend = e.bend ?? (back ? 46 : 0);
          const cx = mx + (-dy / len) * bend, cy = my + (dx / len) * bend;
          const s = trim(a.x, a.y, cx === mx && cy === my ? b.x : cx, cx === mx && cy === my ? b.y : cy);
          const te = trim(b.x, b.y, cx === mx && cy === my ? a.x : cx, cx === mx && cy === my ? a.y : cy);
          const d = `M${s.x} ${s.y} Q${cx} ${cy} ${te.x} ${te.y}`;
          const lx = 0.25 * s.x + 0.5 * cx + 0.25 * te.x, ly = 0.25 * s.y + 0.5 * cy + 0.25 * te.y;
          const sev = severity(st.median);
          const w = 1.4 + (st.count / maxCount) * 7;
          const dim = hlEdges && !hlEdges.has(key);
          const sel = selection?.kind === "edge" && selection.id === key;
          const label = `${hours(st.median)}`;
          return (
            <g key={key} role="button" tabIndex={0} aria-label={t("Transition {from} to {to}: {count} cases, median wait {wait}", { from: t(a.label), to: t(b.label), count: st.count, wait: label })} aria-pressed={sel}
              onClick={() => onSelect({ kind: "edge", id: key })} onKeyDown={keyAct(() => onSelect({ kind: "edge", id: key }))}
              className="cursor-pointer outline-none [&:focus-visible_.pm-hit]:stroke-teal-300/60" style={{ opacity: dim ? 0.15 : 1, transition: "opacity .25s" }}>
              <path d={d} fill="none" stroke="transparent" strokeWidth={18} className="pm-hit" />
              {sel ? <path d={d} fill="none" stroke="#0B1F3A" strokeOpacity={0.18} strokeWidth={w + 8} strokeLinecap="round" /> : null}
              <path d={d} fill="none" stroke={SEV_COLOR[sev]} strokeOpacity={0.85} strokeWidth={w} strokeLinecap="round" markerEnd={`url(#pm-arrow-${sev})`} strokeDasharray={back ? "6 4" : undefined} />
              <g transform={`translate(${lx} ${ly})`}>
                <rect x={-21} y={-9} width={42} height={18} rx={9} fill="white" stroke={SEV_COLOR[sev]} strokeOpacity={0.5} />
                <text textAnchor="middle" dy={4} fontSize={10} fontWeight={600} fill={sev === "good" ? "#0C6962" : sev === "warn" ? "#B45309" : "#B91C1C"}>{label}</text>
              </g>
            </g>
          );
        })}
        {model.nodes.map((n) => {
          const st = nodeStats.get(n.id);
          const sel = selection?.kind === "node" && selection.id === n.id;
          const bott = bottleneckNodes.has(n.id);
          const dim = hlNodes && !hlNodes.has(n.id);
          const fill = n.kind === "start" ? "#0B1F3A" : n.kind === "end" ? "#0FA396" : "#FFFFFF";
          const text = n.kind === "start" || n.kind === "end" ? "#FFFFFF" : "#0B1F3A";
          const nl = t(n.label);
          return (
            <g key={n.id} transform={`translate(${n.x - NW / 2} ${n.y - NH / 2})`} role="button" tabIndex={0}
              aria-label={bott ? t("{label}: {count} events, bottleneck", { label: nl, count: st?.visits ?? 0 }) : t("{label}: {count} events", { label: nl, count: st?.visits ?? 0 })} aria-pressed={sel}
              onClick={() => onSelect({ kind: "node", id: n.id })} onKeyDown={keyAct(() => onSelect({ kind: "node", id: n.id }))}
              className="cursor-pointer outline-none [&:focus-visible_rect.pm-node]:stroke-teal-400" style={{ opacity: dim ? 0.3 : 1, transition: "opacity .25s" }}>
              {bott && !reduce ? (
                <motion.rect x={-4} y={-4} width={NW + 8} height={NH + 8} rx={16} fill="none" stroke="#EF4444" strokeWidth={2}
                  animate={{ opacity: [0.6, 0.1, 0.6] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }} />
              ) : bott ? <rect x={-4} y={-4} width={NW + 8} height={NH + 8} rx={16} fill="none" stroke="#EF4444" strokeOpacity={0.4} strokeWidth={2} /> : null}
              <rect className="pm-node" width={NW} height={NH} rx={12} fill={fill} stroke={sel ? "#0B1F3A" : bott ? "#EF4444" : n.kind === "rework" ? "#F59E0B" : "#E5E8EE"} strokeWidth={sel ? 2.5 : 1.5}
                strokeDasharray={n.kind === "rework" ? "4 3" : undefined} style={{ filter: "drop-shadow(0 2px 6px rgba(11,31,58,0.08))" }} />
              <text x={NW / 2} y={22} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={text}>{nl.length > 22 ? `${nl.slice(0, 21)}…` : nl}</text>
              <text x={NW / 2} y={39} textAnchor="middle" fontSize={10} fill={n.kind === "start" || n.kind === "end" ? "#CCF5EF" : "#64748B"}>{t("{count} events", { count: st?.visits ?? 0 })}{st && st.inWait > 0 ? ` · ${t("{wait} in-queue", { wait: hours(st.inWait) })}` : ""}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------- Workspace ----------------
const PAGE = 12;

export default function ProcessMining({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<MiningData>(service.id, seed);
  const key = seedKeyFor(factory);
  const model = useMemo(() => modelFor(key, factory), [key, factory]);
  const ai = useSimulatedAI();
  const [variantHl, setVariantHl] = useState<number | null>(null);
  const [actFilter, setActFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [reworkOnly, setReworkOnly] = useState(false);
  const [page, setPage] = useState(0);
  const t = useT();
  const { locale } = useLocale();
  const tp = (s: string) => tPart(t, s);

  const { events, cases } = useMemo(() => generate(model, hashStr(`${factory.id}:${model.process}`)), [model, factory.id]);
  const nodeById = useMemo(() => new Map(model.nodes.map((n) => [n.id, n])), [model]);

  const { edgeStats, nodeStats, edgeWaits, nodeWaits } = useMemo(() => {
    const ew = new Map<string, number[]>();
    const nw = new Map<string, number[]>();
    const visits = new Map<string, number>();
    let prev: Ev | null = null;
    for (const ev of events) {
      visits.set(ev.activity, (visits.get(ev.activity) ?? 0) + 1);
      if (prev && prev.caseId === ev.caseId) {
        const k = `${prev.activity}>${ev.activity}`;
        if (!ew.has(k)) ew.set(k, []);
        ew.get(k)!.push(ev.wait);
        if (!nw.has(ev.activity)) nw.set(ev.activity, []);
        nw.get(ev.activity)!.push(ev.wait);
      }
      prev = ev;
    }
    const es = new Map([...ew.entries()].map(([k, v]) => [k, { count: v.length, median: median(v) }]));
    const ns = new Map(model.nodes.map((n) => [n.id, { visits: visits.get(n.id) ?? 0, inWait: median(nw.get(n.id) ?? []) }]));
    return { edgeStats: es, nodeStats: ns, edgeWaits: ew, nodeWaits: nw };
  }, [events, model]);

  const cycles = useMemo(() => cases.map((c) => (c.end - c.start) / H), [cases]);
  const medCycle = median(cycles);
  const p90 = quantile(cycles, 0.9);
  const reworkRate = (cases.filter((c) => c.rework).length / cases.length) * 100;
  const onTime = (cycles.filter((c) => c <= model.targetDays * 24).length / cases.length) * 100;
  const totalWait = events.reduce((a, e) => a + e.wait, 0);
  const waitShare = (totalWait / cycles.reduce((a, c) => a + c, 0)) * 100;
  const allImprovements = model.diagnoses.flatMap((d) => d.improvements);
  const plannedHours = allImprovements.filter((i) => data.planned.includes(i.id)).reduce((a, i) => a + i.impact, 0);
  const projected = Math.max(medCycle * 0.4, medCycle - plannedHours);

  const bottleneckNodes = useMemo(() => new Set(model.diagnoses.flatMap((d) => d.nodes)), [model]);

  const variants = useMemo(() => {
    const counts = new Map<string, { path: string[]; n: number; cycles: number[] }>();
    cases.forEach((c, i) => {
      const path = model.variants[c.variant].path;
      const k = path.join(">");
      if (!counts.has(k)) counts.set(k, { path, n: 0, cycles: [] });
      const v = counts.get(k)!;
      v.n++;
      v.cycles.push(cycles[i]);
    });
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  }, [cases, cycles, model]);

  // Selection details
  const sel = data.selection;
  const selWaits = useMemo(() => (sel ? (sel.kind === "edge" ? edgeWaits.get(sel.id) : nodeWaits.get(sel.id)) ?? [] : []), [sel, edgeWaits, nodeWaits]);
  const selTitle = sel ? (sel.kind === "edge" ? sel.id.split(">").map((id) => t(nodeById.get(id)?.label ?? id)).join(locale === "ar" ? " ← " : " → ") : t(nodeById.get(sel.id)?.label ?? sel.id)) : "";
  const selTarget = sel ? (sel.kind === "edge" ? sel.id.split(">")[1] : sel.id) : null;
  const diag = selTarget ? model.diagnoses.find((d) => d.nodes.includes(selTarget)) : undefined;
  const histogram = useMemo(() => {
    if (!selWaits.length) return [];
    const max = Math.max(...selWaits);
    const bins = 8;
    const step = Math.max(1, Math.ceil(max / bins));
    return Array.from({ length: bins }, (_, i) => ({ bin: `${i * step}–${(i + 1) * step}h`, cases: selWaits.filter((w) => w >= i * step && (w < (i + 1) * step || (i === bins - 1 && w >= i * step))).length }));
  }, [selWaits]);
  const reworkLoops = selTarget ? events.filter((e) => e.activity === selTarget && e.rework).length : 0;
  const reworkCases = selTarget ? new Set(events.filter((e) => e.activity === selTarget && e.rework).map((e) => e.caseId)).size : 0;

  const select = (s: Sel) => setData((p) => ({ ...p, selection: s }));
  const togglePlanned = (id: string) => setData((p) => ({ ...p, planned: p.planned.includes(id) ? p.planned.filter((x) => x !== id) : [...p.planned, id] }));
  const diagnose = (id: string) =>
    ai.run(`diag-${id}`, () => {
      setData((p) => ({ ...p, diagnosed: p.diagnosed.includes(id) ? p.diagnosed : [...p.diagnosed, id] }));
      toast.success(t("Root-cause hypotheses generated"), { description: t("Based on the simulated event log — validate on the shop floor.") });
    }, 1100);

  // Event log filtering
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => (actFilter === "all" || e.activity === actFilter) && (!q || e.caseId.toLowerCase().includes(q) || e.resource.toLowerCase().includes(q)) && (!reworkOnly || e.rework));
  }, [events, actFilter, query, reworkOnly]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const curPage = Math.min(page, pages - 1);
  const rows = filtered.slice(curPage * PAGE, curPage * PAGE + PAGE);

  return (
    <WorkspaceFrame service={service} onReset={() => { reset(); setVariantHl(null); }} notice={t("Process map, variants and event log are generated from a simulated log, not from real ERP/MES data.")}>
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-navy-800 bg-navy-900 px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-teal-300"><Database className="size-4" /></span>
          <div>
            <div className="text-sm font-semibold">{t("Simulated event log — no real ERP ingestion")}</div>
            <div className="text-xs text-white/70">{tp(model.process)} · {t("{cases} cases · {events} events · Jul–Sep 2026 (fictional)", { cases: cases.length, events: events.length.toLocaleString("en-US") })}{model.note ? ` · ${t(model.note)}` : ""}</div>
          </div>
        </div>
        <StatusPill tone="warn" className="self-start sm:self-center">{t("Demo data")}</StatusPill>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile label={t("Median cycle time")} value={hours(medCycle)} hint={t("Target ≤ {days} d", { days: model.targetDays })} icon={<Timer />} tone={medCycle <= model.targetDays * 24 ? "good" : "bad"} />
        <KpiTile label={t("90th percentile")} value={hours(p90)} hint={t("Slowest 10% of cases")} icon={<Timer />} />
        <KpiTile label={t("On-time vs target")} value={`${onTime.toFixed(0)}%`} icon={<CalendarCheck />} />
        <KpiTile label={t("Rework rate")} value={`${reworkRate.toFixed(0)}%`} hint={t("Cases with a loop")} icon={<Repeat />} />
        <KpiTile label={t("Waiting share")} value={`${waitShare.toFixed(0)}%`} hint={t("of total elapsed time")} icon={<AlertTriangle />} className="col-span-2 md:col-span-1" />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel
          title={t("Discovered process map")}
          description={t("Edge thickness = number of transitions · colour = median waiting time. Click any activity or transition.")}
          actions={variantHl !== null ? <Button variant="ghost" size="sm" onClick={() => setVariantHl(null)}><X /> {t("Clear variant")}</Button> : null}
        >
          <ProcessGraph model={model} edgeStats={edgeStats} nodeStats={nodeStats} selection={sel} onSelect={select}
            highlight={variantHl !== null ? variants[variantHl]?.path ?? null : null} bottleneckNodes={bottleneckNodes} />
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-[#0FA396]" />{t("< 8 h wait")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-[#F59E0B]" />8–20 h</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-[#EF4444]" />≥ 20 h</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-navy-500" />{t("Loop / back-flow")}</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full ring-2 ring-red-400" />{t("Diagnosed bottleneck")}</span>
          </div>
        </Panel>

        {/* Side panel */}
        <Panel title={sel ? selTitle : t("Select an activity")} description={sel ? (sel.kind === "edge" ? t("Transition") : t("Activity")) + (diag ? t(" · bottleneck") : "") : t("Click a node or edge on the map.")}
          actions={sel ? <Button variant="ghost" size="icon" aria-label={t("Clear selection")} onClick={() => setData((p) => ({ ...p, selection: null }))}><X /></Button> : null}>
          {!sel ? (
            <div className="space-y-2">
              {model.diagnoses.map((d) => (
                <button key={d.id} type="button" onClick={() => select({ kind: "node", id: d.nodes[0] })} className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 p-3 text-start text-sm transition hover:bg-red-50">
                  <AlertTriangle className="size-4 shrink-0 text-red-600" />
                  <span className="font-medium text-navy-900">{t(d.title)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-canvas p-2"><div className="text-[10px] uppercase tracking-wider text-muted">{t("Cases")}</div><div className="text-sm font-semibold tabular-nums">{selWaits.length}</div></div>
                <div className="rounded-xl bg-canvas p-2"><div className="text-[10px] uppercase tracking-wider text-muted">{t("Median wait")}</div><div className="text-sm font-semibold tabular-nums">{hours(median(selWaits))}</div></div>
                <div className="rounded-xl bg-canvas p-2"><div className="text-[10px] uppercase tracking-wider text-muted">{t("P90 wait")}</div><div className="text-sm font-semibold tabular-nums">{hours(quantile(selWaits, 0.9))}</div></div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-navy-800">{t("Waiting-time distribution")}</div>
                {histogram.length ? (
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histogram} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#EEF1F5" />
                        <XAxis dataKey="bin" tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} interval={1} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748B" }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: "#0B1F3A08" }} contentStyle={{ borderRadius: 10, border: "1px solid #E5E8EE", fontSize: 12 }} />
                        <Bar dataKey="cases" name={t("Cases")} fill={SEV_COLOR[severity(median(selWaits))]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-xs text-muted">{t("Start activity — no waiting time before it.")}</p>}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs">
                <Repeat className="size-3.5 text-amber-600" />
                <span className="text-navy-800">{t("{loops} rework / repeat executions in {cases} cases", { loops: reworkLoops, cases: reworkCases })}</span>
              </div>
              {diag ? (
                data.diagnosed.includes(diag.id) ? (
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-navy-800">{t(diag.summary)}</p>
                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-navy-800">{t("Root-cause hypotheses")}</div>
                      <ul className="space-y-2">
                        {diag.hypotheses.map((h) => (
                          <li key={h.text} className="text-xs">
                            <div className="flex justify-between gap-2"><span className="text-navy-800">{t(h.text)}</span><span className="shrink-0 font-semibold tabular-nums text-muted">{Math.round(h.confidence * 100)}%</span></div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-900/[0.06]"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${h.confidence * 100}%` }} /></div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-1.5 text-xs font-semibold text-navy-800">{t("Suggested improvements")}</div>
                      <ul className="space-y-1.5">
                        {diag.improvements.map((imp) => {
                          const on = data.planned.includes(imp.id);
                          return (
                            <li key={imp.id} className={cn("flex items-start gap-2 rounded-xl border p-2.5 text-xs", on ? "border-teal-200 bg-teal-50/70" : "border-line")}>
                              <div className="min-w-0 flex-1">
                                <div className="text-navy-900">{t(imp.text)}</div>
                                <div className="mt-0.5 text-[11px] text-emerald-700">{t("≈ −{hours} median cycle time", { hours: hours(imp.impact) })}</div>
                              </div>
                              <Button size="sm" variant={on ? "accent" : "outline"} aria-pressed={on} onClick={() => togglePlanned(imp.id)}>{on ? t("Planned") : t("Mark planned")}</Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Button variant="accent" className="w-full" onClick={() => diagnose(diag.id)} disabled={ai.running === `diag-${diag.id}`}>
                    <BrainCircuit /> {ai.running === `diag-${diag.id}` ? t("Analysing log…") : t("Diagnose root causes")}
                  </Button>
                )
              ) : (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{t("No significant bottleneck detected here — waiting time is within the normal range for this process.")}</p>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title={t("Top process variants")} description={t("Click a variant to trace its path on the map.")} bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {variants.map((v, i) => {
              const pctCases = (v.n / cases.length) * 100;
              const on = variantHl === i;
              return (
                <li key={v.path.join(">")}>
                  <button type="button" aria-pressed={on} onClick={() => setVariantHl(on ? null : i)} className={cn("w-full px-5 py-3 text-start transition hover:bg-canvas", on && "bg-teal-50/60")}>
                    <div className="flex items-center gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-navy-900 text-[11px] font-bold text-white"><GitBranch className="size-3.5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-semibold text-navy-900">{t("Variant {n}", { n: i + 1 })}</span>
                          <span className="text-xs tabular-nums text-muted">{t("{count} cases · {pct}% · median {median}", { count: v.n, pct: pctCases.toFixed(0), median: hours(median(v.cycles)) })}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-900/[0.06]"><div className="h-full rounded-full bg-teal-500" style={{ width: `${pctCases}%` }} /></div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 ps-10">
                      {v.path.map((id, k) => {
                        const n = nodeById.get(id)!;
                        const repeat = v.path.indexOf(id) !== k || n.kind === "rework";
                        return <span key={k} className={cn("rounded-md px-1.5 py-0.5 text-[10px]", repeat ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "bg-navy-900/[0.05] text-navy-700")}>{t(n.label)}</span>;
                      })}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel title={t("Improvement plan")} description={t("Improvements marked as planned and their projected effect.")}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-muted">{t("Projected median cycle time")}</div>
                <div className="text-2xl font-semibold tabular-nums text-navy-900">{hours(projected)}</div>
              </div>
              <div className="text-end text-xs">
                <div className="text-muted">{t("vs today {value}", { value: hours(medCycle) })}</div>
                <div className="font-semibold text-emerald-600 tabular-nums">−{(((medCycle - projected) / medCycle) * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {allImprovements.filter((i) => data.planned.includes(i.id)).map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 rounded-lg bg-teal-50/70 px-3 py-1.5 text-xs">
                  <span className="text-navy-800">{t(i.text)}</span>
                  <button type="button" onClick={() => togglePlanned(i.id)} className="shrink-0 rounded p-0.5 text-muted hover:text-red-600" aria-label={t("Remove {item} from plan", { item: t(i.text) })}><X className="size-3.5" /></button>
                </div>
              ))}
              {data.planned.length === 0 ? <p className="text-xs text-muted">{t("Nothing planned yet — open a bottleneck and mark improvements as planned.")}</p> : null}
            </div>
          </Panel>
          <AIInsight title={t("Diagnosis agent")}>
            {t("{count} bottlenecks explain most of the waiting time: {list}. Waiting accounts for {share}% of elapsed time, so removing queues matters more than speeding up machines.", { count: model.diagnoses.length, list: model.diagnoses.map((d) => t(d.title).toLowerCase()).join(locale === "ar" ? "؛ " : "; "), share: waitShare.toFixed(0) })} {key === "delta" ? t("CNC-07's degraded condition links two of the three bottlenecks — coordinate with the predictive-maintenance plan.") : t("Capturing approvals and job cards digitally is the first step to measuring these waits for real.")}
          </AIInsight>
        </div>
      </div>

      <Panel title={t("Event log")} description={t("Simulated case-level events (case id, activity, completion timestamp, resource).")} bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-line px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input aria-label={t("Search case id or resource")} placeholder={t("Case id or resource…")} className="h-9 ps-9" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          </div>
          <select aria-label={t("Filter by activity")} value={actFilter} onChange={(e) => { setActFilter(e.target.value); setPage(0); }} className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100">
            <option value="all">{t("All activities")}</option>
            {model.nodes.map((n) => <option key={n.id} value={n.id}>{t(n.label)}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-xs text-navy-700">
            <input type="checkbox" checked={reworkOnly} onChange={(e) => { setReworkOnly(e.target.checked); setPage(0); }} className="size-4 accent-teal-600" /> {t("Rework / repeats only")}
          </label>
          <span className="text-xs tabular-nums text-muted sm:ms-auto">{t("{count} events", { count: filtered.length.toLocaleString("en-US") })}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-start text-xs">
            <thead className="bg-canvas text-[10.5px] uppercase tracking-wider text-muted">
              <tr><th className="px-5 py-2 text-start font-semibold">{t("Case id")}</th><th className="px-3 py-2 text-start font-semibold">{t("Activity")}</th><th className="px-3 py-2 text-start font-semibold">{t("Timestamp (UTC)")}</th><th className="px-3 py-2 text-start font-semibold">{t("Resource")}</th><th className="px-5 py-2 text-end font-semibold">{t("Wait before")}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((e, i) => (
                <tr key={`${e.caseId}-${e.ts}-${i}`} className="hover:bg-canvas/70">
                  <td className="px-5 py-2 font-mono text-[11px] text-navy-800">{e.caseId}</td>
                  <td className="px-3 py-2 text-navy-900">{t(nodeById.get(e.activity)?.label ?? "")}{e.rework ? <StatusPill tone="warn" className="ms-1.5">{t("repeat")}</StatusPill> : null}</td>
                  <td className="px-3 py-2 tabular-nums text-muted">{fmtTs(e.ts)}</td>
                  <td className="px-3 py-2 text-navy-700">{tp(e.resource)}</td>
                  <td className={cn("px-5 py-2 text-end tabular-nums", e.wait >= 20 ? "font-semibold text-red-600" : "text-navy-700")}>{e.wait ? hours(e.wait) : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">{t("No events match these filters.")}</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-xs text-muted">
          <span>{t("Page {page} of {pages}", { page: curPage + 1, pages })}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="size-8" aria-label={t("Previous page")} disabled={curPage === 0} onClick={() => setPage(curPage - 1)}><ChevronLeft className="rtl:-scale-x-100" /></Button>
            <Button variant="outline" size="icon" className="size-8" aria-label={t("Next page")} disabled={curPage >= pages - 1} onClick={() => setPage(curPage + 1)}><ChevronRight className="rtl:-scale-x-100" /></Button>
          </div>
        </div>
      </Panel>
    </WorkspaceFrame>
  );
}
