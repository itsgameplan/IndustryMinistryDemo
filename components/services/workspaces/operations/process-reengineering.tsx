"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, ArrowRightLeft, Bot, Check, Clock, Copy, FileText, Hand, Monitor, Plus, ScanSearch, Trash2, Undo2, X,
} from "lucide-react";
import { AIInsight, EditableText, KpiTile, Panel, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
import { flavourFor, hours, newId, useSimulatedAI, type Flavour } from "./shared";

// ---------------- Types ----------------
type StepType = "manual" | "digital" | "automated";
type Issue = "none" | "waiting" | "duplicate" | "paper";
type ProcessKey = "o2c" | "p2p" | "p2m";
type View = "current" | "future";

interface Step { id: string; name: string; lane: number; type: StepType; work: number; wait: number; issue: Issue }
interface Rec { id: string; stepId: string; issue: Exclude<Issue, "none">; title: string; detail: string; saving: number; status: "proposed" | "accepted" | "rejected" }
interface ProcessDoc { lanes: string[]; current: Step[]; future: Step[]; recs: Rec[] }
interface BprData { active: ProcessKey; view: View; processes: Record<ProcessKey, ProcessDoc> }

const PROCESS_META: Record<ProcessKey, { name: string; short: string; description: string }> = {
  o2c: { name: "Order-to-cash", short: "O2C", description: "Customer order to cash collected" },
  p2p: { name: "Procure-to-pay", short: "P2P", description: "Material need to supplier paid" },
  p2m: { name: "Plan-to-produce", short: "P2M", description: "Production plan to finished goods" },
};

const TYPE_META: Record<StepType, { label: string; icon: typeof Hand; tone: string; dot: string }> = {
  manual: { label: "Manual", icon: Hand, tone: "border-amber-200 bg-amber-50", dot: "#F59E0B" },
  digital: { label: "Digital", icon: Monitor, tone: "border-sky-200 bg-sky-50", dot: "#38BDF8" },
  automated: { label: "Automated", icon: Bot, tone: "border-teal-200 bg-teal-50", dot: "#0FA396" },
};

const ISSUE_META: Record<Exclude<Issue, "none">, { label: string; icon: typeof Clock }> = {
  waiting: { label: "Waiting", icon: Clock },
  duplicate: { label: "Re-keying", icon: Copy },
  paper: { label: "Paper", icon: FileText },
};

// ---------------- Seed ----------------
type Tuple = [name: string, lane: number, type: StepType, work: number, wait: number, issue?: Issue];

function build(prefix: string, rows: Tuple[]): Step[] {
  return rows.map(([name, lane, type, work, wait, issue], i) => ({ id: `${prefix}-${i + 1}`, name, lane, type, work, wait, issue: issue ?? "none" }));
}

function seedProcesses(flavour: Flavour, factory: Factory): Record<ProcessKey, Omit<ProcessDoc, "recs">> {
  const product = (factory.products[0] ?? "products").toLowerCase();
  if (flavour === "paper") {
    return {
      o2c: {
        lanes: ["Customer", "Sales / owner", "Production planning", "Warehouse & dispatch", "Finance"],
        current: build("o2c-c", [
          ["Buyer sends order by WhatsApp to owner's mobile", 0, "manual", 0.2, 4, "waiting"],
          ["Order rewritten into paper order ledger", 1, "manual", 0.5, 2, "duplicate"],
          ["Price & credit confirmed by phone with owner", 1, "manual", 0.5, 8, "waiting"],
          ["Order slip hand-carried to planning", 2, "manual", 0.3, 6, "paper"],
          ["Capacity checked on whiteboard and Excel", 2, "manual", 1, 12, "duplicate"],
          ["Delivery date confirmed to buyer by phone", 1, "manual", 0.3, 4],
          [`Pick & pack ${product} against paper slip`, 3, "manual", 2, 6, "paper"],
          ["Handwritten delivery note, truck dispatched", 3, "manual", 1, 2],
          ["Invoice typed in Excel from delivery note", 4, "manual", 0.8, 24, "duplicate"],
          ["Payment chased by phone", 4, "manual", 1, 72, "waiting"],
        ]),
        future: build("o2c-f", [
          ["Order placed through WhatsApp Business catalogue form", 0, "digital", 0.1, 0.5],
          ["Order auto-created in cloud order book", 1, "automated", 0, 0.2],
          ["Automatic price-list & credit-limit check", 1, "automated", 0, 0.1],
          ["Planner reviews live capacity board", 2, "digital", 0.5, 2],
          ["Automatic delivery-date confirmation to buyer", 1, "automated", 0, 0.1],
          ["Mobile pick list with barcode scan", 3, "digital", 1.5, 2],
          ["e-Delivery note + e-invoice generated", 4, "automated", 0.1, 0.5],
          ["Payment reminders & bank reconciliation", 4, "automated", 0.2, 48],
        ]),
      },
      p2p: {
        lanes: ["Production floor", "Purchasing / owner", "Supplier", "Stores", "Finance"],
        current: build("p2p-c", [
          ["Material shortage noticed on floor, told verbally", 0, "manual", 0.2, 8, "waiting"],
          ["Owner approves purchase by phone", 1, "manual", 0.3, 24, "waiting"],
          ["Quotes collected from 3 suppliers by WhatsApp", 1, "manual", 2, 24],
          ["Handwritten purchase order", 1, "manual", 0.5, 4, "paper"],
          ["Supplier delivers material", 2, "manual", 0, 72],
          ["Stores counts bags and writes GRN in ledger", 3, "manual", 1, 4, "paper"],
          ["Invoice matched against GRN by hand", 4, "manual", 1, 48, "duplicate"],
          ["Cheque signed by owner", 4, "manual", 0.5, 72, "waiting"],
        ]),
        future: build("p2p-f", [
          ["Min-stock alert from digital stock sheet", 3, "automated", 0, 0.5],
          ["Digital purchase request with mobile approval", 1, "digital", 0.2, 2],
          ["RFQ sent to approved suppliers via shared form", 1, "digital", 1, 24],
          ["e-PO generated from approved quote", 1, "automated", 0.1, 0.5],
          ["Supplier delivers material", 2, "manual", 0, 72],
          ["GRN captured by barcode & scale", 3, "digital", 0.5, 1],
          ["Automatic three-way match (PO · GRN · invoice)", 4, "automated", 0.1, 4],
          ["Scheduled bank transfer", 4, "digital", 0.2, 24],
        ]),
      },
      p2m: {
        lanes: ["Management", "Planning", "Knitting / primary", "Dyeing / processing", "Sewing & QC"],
        current: build("p2m-c", [
          ["Weekly plan agreed in owner meeting", 0, "manual", 2, 48, "waiting"],
          ["Plan written on workshop whiteboard", 1, "manual", 1, 4, "paper"],
          ["Machines assigned verbally by shift master", 2, "manual", 0.5, 6],
          ["Output rolls logged on paper sheets", 2, "manual", 0.5, 8, "paper"],
          ["Batch waits for colour approval by phone", 3, "manual", 0.5, 24, "waiting"],
          ["Output counted by hand at shift end", 4, "manual", 1, 12, "duplicate"],
          ["QC rejects noted in a notebook", 4, "manual", 0.5, 8, "paper"],
          ["Owner compiles weekly report in Excel", 0, "manual", 3, 24, "duplicate"],
        ]),
        future: build("p2m-f", [
          ["Rolling plan generated from the order book", 1, "digital", 1, 8],
          ["Digital job cards pushed to line tablet", 2, "digital", 0.2, 1],
          ["Output tagged with QR labels", 2, "digital", 0.2, 1],
          ["Photo-based colour approval & digital sign-off", 3, "digital", 0.3, 6],
          ["Hourly output captured on line tablet", 4, "digital", 0.2, 1],
          ["Digital QC checklist with defect codes", 4, "digital", 0.3, 1],
          ["Automatic daily management dashboard", 0, "automated", 0, 0.5],
        ]),
      },
    };
  }
  const erp = factory.systems.find((s) => s.status === "active" && /erp|odoo|sap/i.test(s.name))?.name.split(" ")[0] ?? "ERP";
  return {
    o2c: {
      lanes: ["OEM customer", "Customer service", "Planning (MES)", "Production", "Logistics (WMS)", "Finance"],
      current: build("o2c-c", [
        ["OEM releases call-off on supplier portal", 0, "digital", 0, 2],
        [`Call-off downloaded and re-keyed into ${erp} sales order`, 1, "manual", 1.5, 6, "duplicate"],
        ["Drawing revision confirmed with engineering by email", 1, "manual", 0.5, 16, "waiting"],
        ["Planner exports to Excel to sequence CNC lines", 2, "manual", 2, 8, "duplicate"],
        ["MES work order released", 3, "digital", 0.2, 4],
        ["Printed traveller card follows parts through QC", 3, "manual", 0.5, 10, "paper"],
        ["WMS pick; ASN typed into OEM portal", 4, "manual", 1, 4, "duplicate"],
        [`Invoice posted in ${erp}, e-invoice submitted`, 5, "digital", 0.3, 24],
        ["Remittance matched manually to invoices", 5, "manual", 1, 48, "waiting"],
      ]),
      future: build("o2c-f", [
        [`Call-off received via EDI / API into ${erp}`, 0, "automated", 0, 0.2],
        ["Sales order auto-created with drawing-revision check", 1, "automated", 0, 0.5],
        ["APS sequencing in MES with CNC availability", 2, "digital", 0.5, 2],
        ["Work order + QR digital traveller", 3, "digital", 0.2, 2],
        ["Inline QC results recorded in MES", 3, "digital", 0.3, 4],
        ["WMS pick with automatic ASN to OEM", 4, "automated", 0.5, 1],
        ["Automatic e-invoice & bank reconciliation", 5, "automated", 0.1, 24],
      ]),
    },
    p2p: {
      lanes: ["Procurement", "Approvers", "Supplier", "Warehouse / QA", "Finance"],
      current: build("p2p-c", [
        [`Weekly MRP run in ${erp}`, 0, "digital", 0.5, 72, "waiting"],
        ["Shortages exported to Excel; RFQs emailed", 0, "manual", 2, 24, "duplicate"],
        ["PO approved through printed signature chain", 1, "manual", 0.5, 36, "paper"],
        ["Steel bar delivered with paper mill certificate", 2, "manual", 0, 120],
        ["Mill certificate scanned and filed by QA", 3, "manual", 0.8, 8, "paper"],
        ["Goods receipt posted in WMS", 3, "digital", 0.3, 2],
        [`Supplier invoice keyed into ${erp}`, 4, "manual", 0.6, 24, "duplicate"],
        ["Weekly payment run", 4, "digital", 0.3, 48],
      ]),
      future: build("p2p-f", [
        ["Daily MRP with automatic purchase requests", 0, "automated", 0, 2],
        ["RFQ through supplier portal", 0, "digital", 0.5, 12],
        ["Threshold-based workflow approval", 1, "automated", 0.1, 2],
        ["Delivery with ASN + digital mill certificate", 2, "digital", 0, 120],
        ["Certificate auto-linked to material lot", 3, "automated", 0.1, 0.5],
        ["Goods receipt posted in WMS", 3, "digital", 0.3, 1],
        ["OCR invoice capture + three-way match", 4, "automated", 0.1, 4],
        ["Payment run", 4, "digital", 0.2, 24],
      ]),
    },
    p2m: {
      lanes: ["Planning", "CNC machining", "Forging & heat treatment", "Quality", "Maintenance"],
      current: build("p2m-c", [
        [`Master schedule built in Excel from ${erp} export`, 0, "manual", 3, 24, "duplicate"],
        ["Supervisors re-sequence jobs on paper", 1, "manual", 1, 8, "paper"],
        ["Unplanned CNC-07 stoppage triggers re-plan", 4, "manual", 2, 12, "waiting"],
        ["Forging batch waits for furnace slot", 2, "manual", 0.5, 18, "waiting"],
        ["Heat-treatment records kept on paper charts", 2, "manual", 0.5, 4, "paper"],
        ["First-article inspection typed into MES", 3, "manual", 1, 6, "duplicate"],
        ["Daily OEE compiled manually", 0, "manual", 2, 12, "duplicate"],
      ]),
      future: build("p2m-f", [
        [`APS schedule generated from ${erp} demand`, 0, "automated", 0.3, 2],
        ["Predictive maintenance window for CNC-07 planned", 4, "digital", 0.5, 2],
        ["MES dispatch list to CNC cells", 1, "digital", 0.2, 1],
        ["Furnace batching optimiser", 2, "automated", 0.1, 6],
        ["Furnace data logged automatically", 2, "automated", 0, 0.5],
        ["CMM results streamed to MES", 3, "automated", 0.2, 2],
        ["Real-time OEE dashboard", 0, "automated", 0, 0.2],
      ]),
    },
  };
}

function recsFor(steps: Step[], flavour: Flavour, previous: Rec[] = []): Rec[] {
  const prev = new Map(previous.map((r) => [`${r.stepId}:${r.issue}`, r]));
  return steps.flatMap((s) => {
    if (s.issue === "none") return [];
    const issue = s.issue;
    const old = prev.get(`${s.id}:${issue}`);
    const saving = Math.round((s.wait * (issue === "waiting" ? 0.7 : 0.55) + s.work * 0.6) * 10) / 10;
    const title = issue === "duplicate" ? "Capture once, reuse everywhere" : issue === "paper" ? "Replace the paper hand-off" : "Remove the wait";
    const detail =
      issue === "duplicate"
        ? `Eliminate re-keying at “${s.name}” by ${flavour === "erp" ? "integrating the source record through an API / EDI connector" : "using one shared cloud record from the first entry"}.`
        : issue === "paper"
          ? `Digitise “${s.name}” with a mobile form or QR traveller so the next lane is notified instantly.`
          : `Set a response SLA and automatic notification for “${s.name}”; escalate when the SLA is breached.`;
    return [{ id: old?.id ?? `rec-${s.id}-${issue}`, stepId: s.id, issue, title, detail, saving, status: old?.status ?? "proposed" }];
  });
}

function seed(factory: Factory): BprData {
  const flavour = flavourFor(factory);
  const base = seedProcesses(flavour, factory);
  const processes = Object.fromEntries(
    (Object.keys(base) as ProcessKey[]).map((k) => [k, { ...base[k], recs: recsFor(base[k].current, flavour) }])
  ) as Record<ProcessKey, ProcessDoc>;
  return { active: "o2c", view: "current", processes };
}

// ---------------- Metrics ----------------
function metrics(steps: Step[]) {
  const work = steps.reduce((a, s) => a + s.work, 0);
  const wait = steps.reduce((a, s) => a + s.wait, 0);
  const manual = steps.filter((s) => s.type === "manual").length;
  const handoffs = steps.reduce((a, s, i) => (i > 0 && steps[i - 1].lane !== s.lane ? a + 1 : a), 0);
  const digital = steps.length ? Math.round(((steps.length - manual) / steps.length) * 100) : 0;
  const issues = steps.filter((s) => s.issue !== "none").length;
  return { work, wait, cycle: work + wait, manual, handoffs, digital, issues, count: steps.length };
}

const change = (before: number, after: number) => (before === 0 ? 0 : Math.round(((after - before) / before) * 100));
const signed = (n: number, unit = "") => `${n > 0 ? "+" : ""}${n}${unit}`;

// ---------------- Swimlane ----------------
const LABEL_W = 120;
const COL_W = 176;
const LANE_H = 104;
const CARD_W = 148;
const CARD_H = 78;

function Swimlane({ lanes, steps, selected, onSelect, view, tName }: { lanes: string[]; steps: Step[]; selected: string | null; onSelect: (id: string) => void; view: View; tName: (s: string) => string }) {
  const reduce = useReducedMotion();
  const t = useT();
  const width = LABEL_W + Math.max(steps.length, 1) * COL_W + 16;
  const height = lanes.length * LANE_H;
  const pos = (i: number, s: Step) => ({ x: LABEL_W + i * COL_W + 16, y: Math.min(s.lane, lanes.length - 1) * LANE_H + (LANE_H - CARD_H) / 2 });
  return (
    <div dir="ltr" className="overflow-x-auto rounded-xl border border-line bg-canvas/60" role="region" aria-label={view === "current" ? t("Current state swimlane diagram") : t("Future state swimlane diagram")} tabIndex={0}>
      <div className="relative" style={{ width, height }}>
        {lanes.map((l, i) => (
          <div key={i} className={cn("absolute left-0 w-full border-b border-line/80", i % 2 === 0 ? "bg-white/70" : "bg-transparent")} style={{ top: i * LANE_H, height: LANE_H }}>
            <div className="sticky left-0 z-10 flex h-full items-center border-r border-line bg-white/95 px-3 text-[10.5px] font-semibold uppercase leading-tight tracking-wider text-navy-600 backdrop-blur" style={{ width: LABEL_W }}>{t(l)}</div>
          </div>
        ))}
        <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
          <defs>
            <marker id={`bpr-arrow-${view}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4A6591" /></marker>
            <marker id={`bpr-arrow-h-${view}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#C9A24B" /></marker>
          </defs>
          {steps.slice(1).map((s, idx) => {
            const a = pos(idx, steps[idx]);
            const b = pos(idx + 1, s);
            const x1 = a.x + CARD_W, y1 = a.y + CARD_H / 2, x2 = b.x - 2, y2 = b.y + CARD_H / 2;
            const handoff = steps[idx].lane !== s.lane;
            const mid = (x1 + x2) / 2;
            return (
              <path key={`${steps[idx].id}-${s.id}`} d={handoff ? `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`} fill="none"
                stroke={handoff ? "#C9A24B" : "#4A6591"} strokeWidth={handoff ? 1.8 : 1.4} strokeDasharray={handoff ? "5 4" : undefined} markerEnd={`url(#${handoff ? "bpr-arrow-h" : "bpr-arrow"}-${view})`} />
            );
          })}
        </svg>
        <AnimatePresence initial={false}>
          {steps.map((s, i) => {
            const p = pos(i, s);
            const T = TYPE_META[s.type];
            const Icon = T.icon;
            const issue = s.issue !== "none" ? ISSUE_META[s.issue] : null;
            const IssueIcon = issue?.icon;
            return (
              <motion.button
                key={s.id}
                type="button"
                initial={reduce ? false : { opacity: 0, scale: 0.94, left: p.x, top: p.y }}
                animate={{ opacity: 1, scale: 1, left: p.x, top: p.y }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                transition={{ duration: reduce ? 0 : 0.25 }}
                onClick={() => onSelect(s.id)}
                aria-pressed={selected === s.id}
                aria-label={issue ? t("Step {n}: {name}. {type}. Work {work}, wait {wait}. Issue: {issue}", { n: i + 1, name: tName(s.name), type: t(T.label), work: hours(s.work), wait: hours(s.wait), issue: t(issue.label) }) : t("Step {n}: {name}. {type}. Work {work}, wait {wait}", { n: i + 1, name: tName(s.name), type: t(T.label), work: hours(s.work), wait: hours(s.wait) })}
                className={cn("absolute flex flex-col rounded-xl border p-2 text-left shadow-card transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", T.tone, selected === s.id && "ring-2 ring-navy-800")}
                style={{ width: CARD_W, height: CARD_H }}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-navy-600">
                  <span className="grid size-4 place-items-center rounded bg-white text-navy-700"><Icon className="size-3" /></span>
                  <span className="tabular-nums">#{i + 1}</span>
                  {issue && IssueIcon ? <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-px text-[9px] font-semibold text-red-700 ring-1 ring-red-200"><IssueIcon className="size-2.5" />{t(issue.label)}</span> : null}
                </div>
                <div className="mt-1 line-clamp-2 text-[11.5px] font-medium leading-tight text-navy-900" dir="auto">{tName(s.name)}</div>
                <div className="mt-auto flex items-center gap-2 text-[10px] tabular-nums text-muted">
                  <span>{t("Work {value}", { value: hours(s.work) })}</span>
                  <span className={cn(s.wait >= 24 && "font-semibold text-red-600")}>{t("Wait {value}", { value: hours(s.wait) })}</span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------- Step editor ----------------
const selectCls = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100";

function StepEditor({ step, index, total, lanes, onChange, onMove, onRemove, onAddAfter, onClose }: {
  step: Step; index: number; total: number; lanes: string[];
  onChange: (patch: Partial<Step>) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void; onAddAfter: () => void; onClose: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("Step {n} of {total}", { n: index + 1, total })}</span>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("Close step editor")}><X /></Button>
      </div>
      <div>
        <Label htmlFor="bpr-step-name">{t("Step name")}</Label>
        <Input id="bpr-step-name" value={step.name} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div>
        <Label htmlFor="bpr-step-lane">{t("Lane / owner")}</Label>
        <select id="bpr-step-lane" value={step.lane} onChange={(e) => onChange({ lane: Number(e.target.value) })} className={selectCls}>
          {lanes.map((l, i) => <option key={i} value={i}>{t(l)}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-navy-600">{t("Step type")}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-navy-900/[0.05] p-1">
          {(Object.keys(TYPE_META) as StepType[]).map((st) => {
            const Icon = TYPE_META[st].icon;
            return (
              <button key={st} type="button" aria-pressed={step.type === st} onClick={() => onChange({ type: st })}
                className={cn("inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-xs font-medium text-navy-600 transition", step.type === st && "bg-white text-navy-900 shadow-sm")}>
                <Icon className="size-3.5" />{t(TYPE_META[st].label)}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bpr-work">{t("Work (h)")}</Label>
          <Input id="bpr-work" type="number" min={0} step={0.1} value={step.work} onChange={(e) => onChange({ work: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <div>
          <Label htmlFor="bpr-wait">{t("Wait after (h)")}</Label>
          <Input id="bpr-wait" type="number" min={0} step={0.5} value={step.wait} onChange={(e) => onChange({ wait: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
      </div>
      <div>
        <Label htmlFor="bpr-issue">{t("Inefficiency flag")}</Label>
        <select id="bpr-issue" value={step.issue} onChange={(e) => onChange({ issue: e.target.value as Issue })} className={selectCls}>
          <option value="none">{t("None")}</option>
          <option value="waiting">{t("Waiting")}</option>
          <option value="duplicate">{t("Duplicate entry / re-keying")}</option>
          <option value="paper">{t("Paper hand-off")}</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="outline" size="sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={t("Move step earlier")}><ArrowLeft /></Button>
        <Button variant="outline" size="sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={t("Move step later")}><ArrowRight /></Button>
        <Button variant="subtle" size="sm" onClick={onAddAfter}><Plus /> {t("Add after")}</Button>
        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={onRemove} disabled={total <= 1}><Trash2 /> {t("Remove")}</Button>
      </div>
    </div>
  );
}

// ---------------- Comparison ----------------
function CompareRow({ label, before, after, format, lowerIsBetter = true }: { label: string; before: number; after: number; format: (v: number) => string; lowerIsBetter?: boolean }) {
  const max = Math.max(before, after, 0.0001);
  const c = change(before, after);
  const good = lowerIsBetter ? c < 0 : c > 0;
  const t = useT();
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-navy-800">{label}</span>
        <span className={cn("font-semibold tabular-nums", c === 0 ? "text-muted" : good ? "text-emerald-600" : "text-red-600")}>{signed(c, "%")}</span>
      </div>
      <div className="mt-1.5 space-y-1">
        {([["Before", before, "bg-navy-500"], ["After", after, "bg-teal-500"]] as const).map(([l, v, c2]) => (
          <div key={l} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-[10px] uppercase tracking-wider text-muted">{t(l)}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-900/[0.05]"><div className={cn("h-full rounded-full transition-[width] duration-500", c2)} style={{ width: `${(v / max) * 100}%` }} /></div>
            <span className="w-14 shrink-0 text-end text-[11px] tabular-nums text-navy-700">{format(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- Workspace ----------------
export default function ProcessReengineering({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<BprData>(service.id, seed);
  const flavour = flavourFor(factory);
  const [selected, setSelected] = useState<string | null>(null);
  const [recFilter, setRecFilter] = useState<"all" | Rec["status"]>("all");
  const ai = useSimulatedAI();
  const t = useT();
  const { locale } = useLocale();
  // Step names embed the ERP name / first product for some seeds — translate them through placeholders.
  const erpName = factory.systems.find((s) => s.status === "active" && /erp|odoo|sap/i.test(s.name))?.name.split(" ")[0] ?? "ERP";
  const productName = (factory.products[0] ?? "products").toLowerCase();
  const tName = (s: string) => {
    const w = t(s);
    if (w !== s) return w;
    let k = s;
    const v: Record<string, string> = {};
    if (flavour === "erp" && k.includes(erpName)) { k = k.split(erpName).join("{erp}"); v.erp = erpName; }
    if (flavour === "paper" && productName && k.includes(productName)) { k = k.split(productName).join("{product}"); v.product = productName; }
    return k === s ? s : t(k, v);
  };
  const doc = data.processes[data.active];
  const steps = doc[data.view];
  const { current, future } = doc;
  const before = useMemo(() => metrics(current), [current]);
  const after = useMemo(() => metrics(future), [future]);
  const shown = data.view === "current" ? before : after;
  const accepted = doc.recs.filter((r) => r.status === "accepted");
  const acceptedSaving = accepted.reduce((a, r) => a + r.saving, 0);
  const selIndex = steps.findIndex((s) => s.id === selected);
  const selStep = selIndex >= 0 ? steps[selIndex] : null;
  const recDetail = (r: Rec) => {
    const step = current.find((s) => s.id === r.stepId);
    if (locale !== "ar" || !step) return r.detail;
    const name = tName(step.name);
    if (r.issue === "duplicate") return flavour === "erp" ? t("Eliminate re-keying at “{step}” by integrating the source record through an API / EDI connector.", { step: name }) : t("Eliminate re-keying at “{step}” by using one shared cloud record from the first entry.", { step: name });
    if (r.issue === "paper") return t("Digitise “{step}” with a mobile form or QR traveller so the next lane is notified instantly.", { step: name });
    return t("Set a response SLA and automatic notification for “{step}”; escalate when the SLA is breached.", { step: name });
  };

  const updateDoc = (fn: (d: ProcessDoc) => ProcessDoc) =>
    setData((prev) => ({ ...prev, processes: { ...prev.processes, [prev.active]: fn(prev.processes[prev.active]) } }));
  const updateSteps = (fn: (s: Step[]) => Step[]) => updateDoc((d) => ({ ...d, [data.view]: fn(d[data.view]) }));

  const patchStep = (id: string, patch: Partial<Step>) => updateSteps((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const moveStep = (id: string, dir: -1 | 1) =>
    updateSteps((list) => {
      const i = list.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const removeStep = (id: string) => {
    updateSteps((list) => (list.length > 1 ? list.filter((s) => s.id !== id) : list));
    setSelected(null);
  };
  const addStep = (afterId: string | null) => {
    const id = newId(data.view === "current" ? "step-c" : "step-f");
    updateSteps((list) => {
      const found = afterId ? list.findIndex((s) => s.id === afterId) : -1;
      const i = found >= 0 ? found : list.length - 1;
      const lane = i >= 0 ? list[i].lane : 0;
      const step: Step = { id, name: "New step", lane, type: data.view === "future" ? "digital" : "manual", work: 0.5, wait: 2, issue: "none" };
      const next = [...list];
      next.splice(i + 1, 0, step);
      return next;
    });
    setSelected(id);
  };
  const setRec = (id: string, status: Rec["status"]) => updateDoc((d) => ({ ...d, recs: d.recs.map((r) => (r.id === id ? { ...r, status } : r)) }));

  const rescan = () =>
    ai.run("scan", () => {
      updateDoc((d) => ({ ...d, recs: recsFor(d.current, flavour, d.recs) }));
      toast.success(t("Opportunities refreshed"), { description: t("Re-scanned the current-state map for waits, re-keying and paper hand-offs (simulated).") });
    }, 1000);

  const visibleRecs = doc.recs.filter((r) => recFilter === "all" || r.status === recFilter);
  const topIssue = doc.current.filter((s) => s.issue !== "none").sort((a, b) => b.wait - a.wait)[0];

  return (
    <WorkspaceFrame service={service} onReset={() => { reset(); setSelected(null); }} notice={t("Cycle times are illustrative estimates entered per step, not measured from systems.")}>
      {/* Process selector */}
      <div className="mb-5 grid gap-2 sm:grid-cols-3" role="tablist" aria-label={t("Process family")}>
        {(Object.keys(PROCESS_META) as ProcessKey[]).map((k) => {
          const m = PROCESS_META[k];
          const mb = metrics(data.processes[k].current);
          const ma = metrics(data.processes[k].future);
          const active = data.active === k;
          return (
            <button key={k} type="button" role="tab" aria-selected={active} onClick={() => { setData((p) => ({ ...p, active: k })); setSelected(null); }}
              className={cn("rounded-2xl border p-4 text-start transition", active ? "border-navy-900 bg-navy-900 text-white shadow-lift" : "border-line bg-white shadow-card hover:border-navy-500/30")}>
              <div className="flex items-center justify-between gap-2">
                <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider", active ? "bg-white/15 text-teal-200" : "bg-teal-50 text-teal-700")}>{m.short}</span>
                <span className={cn("text-xs font-semibold tabular-nums", active ? "text-teal-200" : "text-emerald-600")}>{t("{change} cycle time", { change: signed(change(mb.cycle, ma.cycle), "%") })}</span>
              </div>
              <div className="mt-2 text-sm font-semibold">{t(m.name)}</div>
              <div className={cn("text-xs", active ? "text-white/70" : "text-muted")}>{t(m.description)} · {hours(mb.cycle)} <span className="inline-block rtl:-scale-x-100">→</span> {hours(ma.cycle)}</div>
            </button>
          );
        })}
      </div>

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label={t("Future cycle time")} value={hours(after.cycle)} delta={signed(change(before.cycle, after.cycle), "%")} tone={after.cycle <= before.cycle ? "good" : "bad"} hint={t("Today: {value}", { value: hours(before.cycle) })} icon={<Clock />} />
        <KpiTile label={t("Manual touches")} value={after.manual} delta={signed(after.manual - before.manual)} tone={after.manual <= before.manual ? "good" : "bad"} hint={t("Today: {manual} of {count} steps", { manual: before.manual, count: before.count })} icon={<Hand />} />
        <KpiTile label={t("Lane hand-offs")} value={after.handoffs} delta={signed(after.handoffs - before.handoffs)} tone={after.handoffs <= before.handoffs ? "good" : "bad"} hint={t("Today: {value}", { value: before.handoffs })} icon={<ArrowRightLeft />} />
        <KpiTile label={t("Digital / automated")} value={`${after.digital}%`} delta={signed(after.digital - before.digital, t(" pts"))} tone={after.digital >= before.digital ? "good" : "bad"} hint={t("Today: {value}", { value: `${before.digital}%` })} icon={<Bot />} />
      </div>

      {/* Map + editor */}
      <Panel
        title={`${t(PROCESS_META[data.active].name)} · ${data.view === "current" ? t("Current state (as-is)") : t("Future state (to-be)")}`}
        description={t("Click a step to rename it or change its type, lane and timing. Dashed gold connectors are hand-offs between lanes.")}
        actions={
          <div className="inline-flex rounded-xl bg-navy-900/[0.05] p-1" role="group" aria-label={t("Process state")}>
            {(["current", "future"] as View[]).map((v) => (
              <button key={v} type="button" aria-pressed={data.view === v} onClick={() => { setData((p) => ({ ...p, view: v })); setSelected(null); }}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium text-navy-600 transition", data.view === v && "bg-white text-navy-900 shadow-sm")}>
                {v === "current" ? t("Current") : t("Future")}
              </button>
            ))}
          </div>
        }
        className="mb-5"
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
          {(Object.keys(TYPE_META) as StepType[]).map((ty) => (
            <span key={ty} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: TYPE_META[ty].dot }} />{t(TYPE_META[ty].label)}</span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-gold-500" />{t("Hand-off")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-red-500" />{t("Inefficiency")}</span>
          <Button variant="outline" size="sm" className="ms-auto" onClick={() => addStep(selected)}><Plus /> {t("Add step")}</Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <Swimlane lanes={doc.lanes} steps={steps} selected={selected} onSelect={setSelected} view={data.view} tName={tName} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-canvas px-2 py-2"><div className="text-muted">{t("Touch time")}</div><div className="font-semibold tabular-nums text-navy-900">{hours(shown.work)}</div></div>
              <div className="rounded-xl bg-canvas px-2 py-2"><div className="text-muted">{t("Waiting")}</div><div className="font-semibold tabular-nums text-navy-900">{hours(shown.wait)}</div></div>
              <div className="rounded-xl bg-canvas px-2 py-2"><div className="text-muted">{t("Flagged steps")}</div><div className="font-semibold tabular-nums text-navy-900">{shown.issues}</div></div>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4">
            {selStep ? (
              <StepEditor
                step={selStep} index={selIndex} total={steps.length} lanes={doc.lanes}
                onChange={(p) => patchStep(selStep.id, p)} onMove={(d) => moveStep(selStep.id, d)} onRemove={() => removeStep(selStep.id)}
                onAddAfter={() => addStep(selStep.id)} onClose={() => setSelected(null)}
              />
            ) : (
              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-600"><ScanSearch className="size-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-navy-900">{t("Select a step to edit")}</p>
                    <p className="text-xs text-muted">{t("Metrics recompute instantly.")}</p>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{t("Lanes (shared by both states)")}</div>
                  {doc.lanes.map((l, i) => (
                    <EditableText key={i} value={l} ariaLabel={t("lane {n} name", { n: i + 1 })} className="text-sm"
                      onChange={(v) => updateDoc((d) => ({ ...d, lanes: d.lanes.map((x, j) => (j === i ? v.trim() || x : x)) }))} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Opportunities + comparison */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          title={t("Automation & improvement opportunities")}
          description={t("Derived from inefficiencies flagged on the current-state map.")}
          actions={<Button variant="subtle" size="sm" onClick={rescan} disabled={ai.running === "scan"}><ScanSearch /> {ai.running === "scan" ? t("Scanning…") : t("Re-scan")}</Button>}
          bodyClassName="p-0"
        >
          <div className="flex flex-wrap gap-1 border-b border-line px-5 py-2.5">
            {(["all", "proposed", "accepted", "rejected"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={recFilter === f} onClick={() => setRecFilter(f)}
                className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize text-muted transition hover:text-navy-900", recFilter === f && "bg-navy-900 text-white hover:text-white")}>
                {t(f)} <span className="tabular-nums opacity-70">{f === "all" ? doc.recs.length : doc.recs.filter((r) => r.status === f).length}</span>
              </button>
            ))}
          </div>
          {visibleRecs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t("No recommendations in this view. Flag inefficiencies on current-state steps, then re-scan.")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {visibleRecs.map((r) => {
                const step = doc.current.find((s) => s.id === r.stepId);
                const Icon = ISSUE_META[r.issue].icon;
                return (
                  <li key={r.id} className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start", r.status === "rejected" && "opacity-60")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-navy-900">{t(r.title)}</span>
                        <StatusPill tone={r.status === "accepted" ? "good" : r.status === "rejected" ? "neutral" : "info"}>{t(r.status)}</StatusPill>
                        {!step ? <StatusPill tone="warn">{t("step removed")}</StatusPill> : null}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted">{recDetail(r)}</p>
                      <div className="mt-1 text-xs font-medium text-emerald-700">{t("Est. cycle-time saving ≈ {value}", { value: hours(r.saving) })}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {r.status === "proposed" ? (
                        <>
                          <Button size="sm" variant="accent" onClick={() => setRec(r.id, "accepted")}><Check /> {t("Accept")}</Button>
                          <Button size="sm" variant="outline" onClick={() => setRec(r.id, "rejected")}><X /> {t("Reject")}</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setRec(r.id, "proposed")}><Undo2 /> {t("Undo")}</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title={t("Before → after")} description={t("Recomputed from the current and future step lists.")}>
            <div className="-my-2.5 divide-y divide-line">
              <CompareRow label={t("Cycle time")} before={before.cycle} after={after.cycle} format={hours} />
              <CompareRow label={t("Waiting time")} before={before.wait} after={after.wait} format={hours} />
              <CompareRow label={t("Manual touches")} before={before.manual} after={after.manual} format={(v) => String(v)} />
              <CompareRow label={t("Hand-offs")} before={before.handoffs} after={after.handoffs} format={(v) => String(v)} />
              <CompareRow label={t("Digital / automated share")} before={before.digital} after={after.digital} format={(v) => `${v}%`} lowerIsBetter={false} />
            </div>
            <div className="mt-4 rounded-xl bg-teal-50 px-3 py-2 text-xs text-teal-800">
              {t("{count} accepted opportunities · combined estimated saving ≈ {value} per cycle", { count: accepted.length, value: hours(acceptedSaving) })}
            </div>
          </Panel>
          <AIInsight title={t("Design agent summary")}>
            {topIssue ? (
              <>{t("The largest single delay in today's {process} is “{step}” ({wait} waiting). The future-state design removes {manual} manual touches and {handoffs} hand-offs, changing cycle time by {change}.", { process: locale === "ar" ? t(PROCESS_META[data.active].name) : PROCESS_META[data.active].name.toLowerCase(), step: tName(topIssue.name), wait: hours(topIssue.wait), manual: Math.max(0, before.manual - after.manual), handoffs: Math.max(0, before.handoffs - after.handoffs), change: signed(change(before.cycle, after.cycle), "%") })} {flavour === "paper" ? t("Start with a shared digital order book and WhatsApp Business forms — low cost, no ERP required.") : t("Prioritise EDI/API integration with OEM portals and MES-linked digital travellers to remove re-keying.")}</>
            ) : (
              <>{t("No inefficiencies are flagged on the current-state map. Flag waits, re-keying or paper hand-offs to generate recommendations.")}</>
            )}
          </AIInsight>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
