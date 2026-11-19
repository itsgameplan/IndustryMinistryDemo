"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { AlertOctagon, AlertTriangle, CheckCircle2, ClipboardCheck, FileText, Package, Plus, Printer, Ship, Trash2, Wand2 } from "lucide-react";
import { AIInsight, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useT, type TFunction } from "@/lib/i18n";
import { Segmented, Select, SimTag, Spinner, newId, productProfiles, usd, useSimulatedAI, type ProductProfile } from "./_shared";

type Tab = "invoice" | "packing" | "shipment";
type Dest = "ES" | "DE" | "SA" | "AE" | "KE" | "MA" | "TR" | "ZA";
interface InvLine { id: string; description: string; hs: string; qty: number; unit: string; unitPrice: number }
interface PackLine { ref: string; description: string; hs: string; cartons: number; qty: number; netKg: number; grossKg: number }
interface DocsData {
  tab: Tab;
  dest: Dest;
  invoice: { number: string; date: string; buyer: string; buyerAddress: string; incoterm: string; payment: string; freight: number; insurance: number; lines: InvLine[] };
  packing: { marks: string; lines: PackLine[] };
  shipment: { consignee: string; notify: string; portLoading: string; portDischarge: string; vessel: string; container: string; mode: string; blType: string; instructions: string };
  checklist: string[];
}

interface CheckItem { id: string; label: string; origin?: boolean }
const DESTS: Record<Dest, { name: string; port: string; group: string }> = {
  ES: { name: "Spain (EU)", port: "Valencia, Spain", group: "EU" },
  DE: { name: "Germany (EU)", port: "Hamburg, Germany", group: "EU" },
  SA: { name: "Saudi Arabia", port: "Jeddah Islamic Port, Saudi Arabia", group: "GCC" },
  AE: { name: "United Arab Emirates", port: "Jebel Ali, UAE", group: "GCC" },
  KE: { name: "Kenya", port: "Mombasa, Kenya", group: "COMESA" },
  MA: { name: "Morocco", port: "Casablanca, Morocco", group: "Agadir" },
  TR: { name: "Turkey", port: "Mersin, Turkey", group: "FTA" },
  ZA: { name: "South Africa", port: "Durban, South Africa", group: "Non-preferential" },
};
const COMMON: CheckItem[] = [{ id: "inv", label: "Commercial invoice signed & stamped" }, { id: "pl", label: "Packing list matches invoice" }, { id: "bl", label: "Bill of lading / shipping instructions" }];
const GROUP_ITEMS: Record<string, CheckItem[]> = {
  EU: [{ id: "eur1", label: "EUR.1 movement certificate or origin declaration", origin: true }, { id: "label", label: "Product labelling & conformity (e.g. textile labelling / CE where applicable)" }, { id: "reach", label: "REACH substances declaration from supplier" }],
  GCC: [{ id: "coo", label: "Arab certificate of origin (GAFTA), chamber-certified", origin: true }, { id: "legal", label: "Invoice legalisation by chamber of commerce" }, { id: "conf", label: "Conformity certificate / product registration (e.g. SABER for KSA)" }],
  COMESA: [{ id: "coo", label: "COMESA certificate of origin", origin: true }, { id: "pvoc", label: "Pre-export verification of conformity (PVoC) certificate" }, { id: "idf", label: "Importer's declaration form (IDF) reference from buyer" }],
  Agadir: [{ id: "coo", label: "EUR-MED / Agadir certificate of origin", origin: true }, { id: "conf", label: "Technical conformity documents for regulated parts" }],
  FTA: [{ id: "coo", label: "EUR.1 / FTA certificate of origin", origin: true }, { id: "tse", label: "Conformity documents required by importer" }],
  "Non-preferential": [{ id: "coo", label: "Non-preferential certificate of origin", origin: true }, { id: "nrcs", label: "Importer to confirm regulated-product approvals (e.g. NRCS)" }],
};
const checklistFor = (d: Dest) => [...COMMON, ...(GROUP_ITEMS[DESTS[d].group] ?? [])];

const HS_RE = /^\d{4}\.\d{2}$/;
const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP"];

function lineFrom(p: ProductProfile, qty: number, id: string): InvLine {
  return { id, description: p.name, hs: p.hs, qty, unit: p.unit, unitPrice: +((p.fobMin + p.fobMax) / 2).toFixed(2) };
}
function packFrom(p: ProductProfile | undefined, line: InvLine): PackLine {
  const kg = p?.kgPerUnit ?? 1;
  const per = p?.unitsPerCarton ?? 20;
  const net = Math.round(line.qty * kg);
  return { ref: line.id, description: line.description, hs: line.hs, cartons: Math.ceil(line.qty / per), qty: line.qty, netKg: net, grossKg: Math.round(net * 1.06 + Math.ceil(line.qty / per) * 0.8) };
}

function seed(factory: Factory): DocsData {
  const key = seedKeyFor(factory);
  const products = productProfiles(factory);
  const picks = key === "al-noor" ? [products[3], products[1]] : [products[0], products[1] ?? products[0]];
  const qtys = key === "delta" ? [1600, 800] : key === "al-noor" ? [4000, 2400] : [picks[0].moq * 2, picks[1].moq];
  const lines = picks.map((p, i) => lineFrom(p, qtys[i], `L${i + 1}`));
  const packing = lines.map((l, i) => packFrom(picks[i], l));
  // Deliberate demo discrepancy: the second packing line carries a different HS sub-heading.
  if (packing[1] && HS_RE.test(packing[1].hs)) packing[1] = { ...packing[1], hs: `${packing[1].hs.slice(0, 6)}${packing[1].hs.endsWith("9") ? "0" : "9"}` };
  const dest: Dest = key === "al-noor" ? "ES" : key === "delta" ? "MA" : "SA";
  const buyer = key === "al-noor" ? "Iberia Textil Trading S.L." : key === "delta" ? "Atlas Auto Parts SARL" : "Gulf Wholesale Partners";
  const buyerAddress = key === "al-noor" ? "Polígono Industrial (fictional), Valencia, Spain" : key === "delta" ? "Zone Industrielle (fictional), Casablanca, Morocco" : "Industrial Area (fictional), Riyadh, Saudi Arabia";
  const prefix = factory.name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3);
  return {
    tab: "invoice",
    dest,
    invoice: { number: `${prefix}-EXP-0142`, date: "2026-11-20", buyer, buyerAddress, incoterm: "FOB", payment: "30% advance, 70% against B/L copy (T/T)", freight: 0, insurance: 0, lines },
    packing: { marks: `${buyer.split(" ")[0].toUpperCase()} / ${DESTS[dest].port.split(",")[0].toUpperCase()} / C/NO. 1-UP / MADE IN EGYPT`, lines: packing },
    shipment: { consignee: buyer, notify: "Same as consignee", portLoading: key === "delta" ? "Ain Sokhna, Egypt" : "Alexandria, Egypt", portDischarge: DESTS[dest].port, vessel: "", container: "1 × 40' HC", mode: "Sea", blType: "Original B/L (3/3)", instructions: "Freight collect. Do not stack above 6 cartons." },
    checklist: [`${dest}:inv`, `${dest}:bl`],
  };
}

// ---------------- Validation ----------------
interface Issue { id: string; level: "error" | "warn"; text: string; tab: Tab }
function validate(d: DocsData, t: TFunction): Issue[] {
  const out: Issue[] = [];
  d.invoice.lines.forEach((l, i) => {
    const n = i + 1;
    if (!HS_RE.test(l.hs)) out.push({ id: `hs-${l.id}`, level: "error", text: t("Invoice line {n}: HS code \"{hs}\" is not a 6-digit code", { n, hs: l.hs || t("blank") }), tab: "invoice" });
    const p = d.packing.lines.find((x) => x.ref === l.id);
    if (!p) out.push({ id: `nopack-${l.id}`, level: "error", text: t("Invoice line {n} has no packing-list entry", { n }), tab: "packing" });
    else {
      if (p.hs.trim() !== l.hs.trim()) out.push({ id: `hsmm-${l.id}`, level: "error", text: t("HS code mismatch on line {n}: invoice {a} vs packing list {b}", { n, a: l.hs || "—", b: p.hs || "—" }), tab: "packing" });
      if (p.qty !== l.qty) out.push({ id: `qty-${l.id}`, level: "error", text: t("Quantity mismatch on line {n}: invoice {a} vs packing list {b}", { n, a: l.qty.toLocaleString("en-US"), b: p.qty.toLocaleString("en-US") }), tab: "packing" });
      if (p.grossKg <= p.netKg) out.push({ id: `kg-${l.id}`, level: "warn", text: t("Line {n}: gross weight should exceed net weight", { n }), tab: "packing" });
    }
    if (l.unitPrice <= 0) out.push({ id: `price-${l.id}`, level: "warn", text: t("Invoice line {n} has no unit price", { n }), tab: "invoice" });
  });
  if (!d.invoice.lines.length) out.push({ id: "nolines", level: "error", text: t("Invoice has no lines"), tab: "invoice" });
  if (!d.invoice.buyer.trim()) out.push({ id: "buyer", level: "error", text: t("Buyer name is missing"), tab: "invoice" });
  if (!d.shipment.consignee.trim()) out.push({ id: "consignee", level: "error", text: t("Consignee is missing on shipping instructions"), tab: "shipment" });
  if (!d.shipment.portDischarge.trim()) out.push({ id: "pod", level: "error", text: t("Port of discharge is missing"), tab: "shipment" });
  if (!d.shipment.vessel.trim()) out.push({ id: "vessel", level: "warn", text: t("Vessel / voyage not yet booked"), tab: "shipment" });
  if (["CIF", "CFR"].includes(d.invoice.incoterm) && d.invoice.freight <= 0) out.push({ id: "freight", level: "warn", text: t("{incoterm} selected but no freight amount on the invoice", { incoterm: d.invoice.incoterm }), tab: "invoice" });
  if (d.invoice.incoterm === "CIF" && d.invoice.insurance <= 0) out.push({ id: "ins", level: "warn", text: t("CIF selected but no insurance amount on the invoice"), tab: "invoice" });
  const origin = checklistFor(d.dest).find((c) => c.origin);
  if (origin && !d.checklist.includes(`${d.dest}:${origin.id}`)) out.push({ id: "coo", level: "warn", text: t("Missing certificate of origin for {dest} — \"{doc}\"", { dest: t(DESTS[d.dest].name), doc: t(origin.label) }), tab: "shipment" });
  if (!d.shipment.portDischarge.toLowerCase().includes(DESTS[d.dest].name.split(" (")[0].toLowerCase().replace("united arab emirates", "uae"))) out.push({ id: "podmm", level: "warn", text: t("Port of discharge does not appear to be in {dest}", { dest: t(DESTS[d.dest].name) }), tab: "shipment" });
  return out;
}

// ---------------- Workspace ----------------
export default function ExportDocumentationWorkspace({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<DocsData>(service.id, seed);
  const ai = useSimulatedAI();
  const reduce = useReducedMotion();
  const products = productProfiles(factory);
  const t = useT();
  const issues = useMemo(() => validate(data, t), [data, t]);
  const errors = issues.filter((i) => i.level === "error");
  const checklist = checklistFor(data.dest);
  const checked = checklist.filter((c) => data.checklist.includes(`${data.dest}:${c.id}`)).length;

  const required = [data.invoice.number, data.invoice.date, data.invoice.buyer, data.invoice.buyerAddress, data.invoice.incoterm, data.invoice.payment, data.shipment.consignee, data.shipment.portLoading, data.shipment.portDischarge, data.shipment.vessel, data.shipment.container, data.packing.marks];
  const fieldPct = required.filter((v) => v.trim()).length / required.length;
  const completion = Math.round(fieldPct * 40 + (checked / checklist.length) * 40 + (errors.length ? 0 : 20));

  const subtotal = data.invoice.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const total = subtotal + data.invoice.freight + data.invoice.insurance;

  const setInv = (patch: Partial<DocsData["invoice"]>) => setData((p) => ({ ...p, invoice: { ...p.invoice, ...patch } }));
  const setShip = (patch: Partial<DocsData["shipment"]>) => setData((p) => ({ ...p, shipment: { ...p.shipment, ...patch } }));
  const setInvLine = (id: string, patch: Partial<InvLine>) => setInv({ lines: data.invoice.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const setPackLine = (ref: string, patch: Partial<PackLine>) => setData((p) => ({ ...p, packing: { ...p.packing, lines: p.packing.lines.map((l) => (l.ref === ref ? { ...l, ...patch } : l)) } }));
  const addLine = () => {
    const p = products[data.invoice.lines.length % products.length];
    const line = lineFrom(p, p.moq, newId("L"));
    setData((prev) => ({ ...prev, invoice: { ...prev.invoice, lines: [...prev.invoice.lines, line] }, packing: { ...prev.packing, lines: [...prev.packing.lines, packFrom(p, line)] } }));
  };
  const removeLine = (id: string) => setData((prev) => ({ ...prev, invoice: { ...prev.invoice, lines: prev.invoice.lines.filter((l) => l.id !== id) }, packing: { ...prev.packing, lines: prev.packing.lines.filter((l) => l.ref !== id) } }));
  const syncPacking = () =>
    ai.run("sync", () => {
      setData((prev) => ({
        ...prev,
        packing: {
          ...prev.packing,
          lines: prev.invoice.lines.map((l) => {
            const existing = prev.packing.lines.find((x) => x.ref === l.id);
            const prof = products.find((p) => p.name === l.description);
            const fresh = packFrom(prof, l);
            return existing && existing.qty === l.qty ? { ...existing, description: l.description, hs: l.hs } : fresh;
          }),
        },
      }));
      toast.success(t("Packing list re-synced from invoice"), { description: t("HS codes, descriptions and quantities aligned; weights estimated from product master data.") });
    }, 900);
  const setDest = (dest: Dest) => {
    setData((prev) => ({ ...prev, dest, shipment: { ...prev.shipment, portDischarge: DESTS[dest].port } }));
    toast(t("Destination set to {dest}", { dest: t(DESTS[dest].name) }), { description: t("Port of discharge pre-filled: {port}", { port: DESTS[dest].port }) });
  };
  const toggleCheck = (id: string) => {
    const k = `${data.dest}:${id}`;
    setData((prev) => ({ ...prev, checklist: prev.checklist.includes(k) ? prev.checklist.filter((x) => x !== k) : [...prev.checklist, k] }));
  };

  return (
    <WorkspaceFrame
      service={service}
      onReset={reset}
      notice={t("No official certificates or customs submissions are generated. Destination rules shown are illustrative.")}
      actions={<Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> {t("Print")}</Button>}
    >
      {/* Shipment bar */}
      <div className="grid gap-4 rounded-2xl border border-line bg-white p-4 shadow-card md:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto] md:items-center">
        <div>
          <label htmlFor="ed-dest" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-navy-600">{t("Destination market")}</label>
          <Select id="ed-dest" value={data.dest} onChange={(e) => setDest(e.target.value as Dest)}>
            {(Object.keys(DESTS) as Dest[]).map((d) => <option key={d} value={d}>{t(DESTS[d].name)}</option>)}
          </Select>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs"><span className="font-semibold text-navy-800">{t("Shipment file completion")}</span><span className="tabular-nums text-muted">{completion}%</span></div>
          <Progress value={completion} className="mt-1.5" barClassName={completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-teal-500" : "bg-amber-500"} />
          <div className="mt-1 text-[11px] text-muted">{t("Fields {pct}% · checklist {checked}/{total}", { pct: Math.round(fieldPct * 100), checked, total: checklist.length })} · {errors.length ? t("{count} blocking issue(s)", { count: errors.length }) : t("no blocking issues")}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone={errors.length ? "bad" : "good"}>{errors.length ? <AlertOctagon /> : <CheckCircle2 />} {t("{count} errors", { count: errors.length })}</StatusPill>
          <StatusPill tone={issues.length - errors.length ? "warn" : "good"}><AlertTriangle /> {t("{count} warnings", { count: issues.length - errors.length })}</StatusPill>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented<Tab> label={t("Document")} value={data.tab} onChange={(tab) => setData((p) => ({ ...p, tab }))} options={[{ value: "invoice", label: <><FileText /> <span className="hidden sm:inline">{t("Commercial Invoice")}</span><span className="sm:hidden">{t("Invoice")}</span></> }, { value: "packing", label: <><Package /> {t("Packing list")}</> }, { value: "shipment", label: <><Ship /> {t("Shipment")}</> }]} />
            {data.tab === "packing" ? <Button variant="subtle" size="sm" onClick={syncPacking} disabled={ai.busy === "sync"}>{ai.busy === "sync" ? <Spinner /> : <Wand2 />} {t("Auto-fill from invoice")}</Button> : null}
          </div>

          {/* Paper */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={data.tab} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }} className="mt-3 rounded-lg border border-line bg-white p-5 shadow-lift md:p-8">
              <header className="flex flex-col gap-4 border-b-2 border-navy-900 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-base font-bold text-navy-900">{factory.name}</div>
                  <div className="text-xs text-muted">{factory.location}</div>
                  <div className="text-xs text-muted">{t("Reg. {no} (fictional)", { no: factory.registrationNo })}</div>
                </div>
                <div className="sm:text-end">
                  <div className="text-lg font-bold uppercase tracking-[0.2em] text-navy-900">{data.tab === "invoice" ? t("Commercial Invoice") : data.tab === "packing" ? t("Packing List") : t("Shipping Instructions")}</div>
                  <div className="mt-1 flex items-center gap-2 sm:justify-end"><SimTag>{t("Draft · not an official document")}</SimTag></div>
                </div>
              </header>

              {data.tab === "invoice" ? (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <DocField id="inv-no" label={t("Invoice no.")} value={data.invoice.number} onChange={(v) => setInv({ number: v })} mono />
                    <DocField id="inv-date" label={t("Date")} type="date" value={data.invoice.date} onChange={(v) => setInv({ date: v })} mono />
                    <DocField id="inv-buyer" label={t("Buyer")} value={data.invoice.buyer} onChange={(v) => setInv({ buyer: v })} />
                    <DocField id="inv-addr" label={t("Buyer address")} value={data.invoice.buyerAddress} onChange={(v) => setInv({ buyerAddress: v })} />
                    <div>
                      <label htmlFor="inv-inco" className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{t("Incoterm (2020)")}</label>
                      <select id="inv-inco" value={data.invoice.incoterm} onChange={(e) => setInv({ incoterm: e.target.value })} className="mt-1 w-full border-0 border-b border-dashed border-navy-500/30 bg-transparent px-0 py-1 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-0">
                        {INCOTERMS.map((i) => <option key={i}>{i}</option>)}
                      </select>
                    </div>
                    <DocField id="inv-pay" label={t("Payment terms")} value={data.invoice.payment} onChange={(v) => setInv({ payment: v })} />
                  </div>
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead><tr className="border-y border-navy-900 text-start text-[10px] uppercase tracking-wider text-navy-700"><th scope="col" className="py-2 pe-2">#</th><th scope="col" className="py-2 pe-2">{t("Description")}</th><th scope="col" className="py-2 pe-2">{t("HS code")}</th><th scope="col" className="py-2 pe-2 text-end">{t("Qty")}</th><th scope="col" className="py-2 pe-2">{t("Unit")}</th><th scope="col" className="py-2 pe-2 text-end">{t("Unit price")}</th><th scope="col" className="py-2 text-end">{t("Amount")}</th><th className="w-8"><span className="sr-only">{t("Remove")}</span></th></tr></thead>
                      <tbody>
                        {data.invoice.lines.map((l, i) => (
                          <tr key={l.id} className="border-b border-line align-top">
                            <td className="py-2 pe-2 font-mono text-xs text-muted">{i + 1}</td>
                            <td className="py-1 pe-2"><CellInput label={t("Line {n} description", { n: i + 1 })} value={l.description} onChange={(v) => setInvLine(l.id, { description: v })} /></td>
                            <td className="w-24 py-1 pe-2"><CellInput label={t("Line {n} HS code", { n: i + 1 })} value={l.hs} onChange={(v) => setInvLine(l.id, { hs: v })} mono invalid={!HS_RE.test(l.hs)} /></td>
                            <td className="w-24 py-1 pe-2"><CellInput label={t("Line {n} quantity", { n: i + 1 })} value={String(l.qty)} onChange={(v) => setInvLine(l.id, { qty: Number(v.replace(/[^\d]/g, "")) || 0 })} mono right /></td>
                            <td className="w-16 py-1 pe-2"><CellInput label={t("Line {n} unit", { n: i + 1 })} value={l.unit} onChange={(v) => setInvLine(l.id, { unit: v })} /></td>
                            <td className="w-24 py-1 pe-2"><CellInput label={t("Line {n} unit price", { n: i + 1 })} value={String(l.unitPrice)} onChange={(v) => setInvLine(l.id, { unitPrice: Number(v.replace(/[^\d.]/g, "")) || 0 })} mono right /></td>
                            <td className="py-2 text-end font-mono text-xs tabular-nums text-navy-900">{usd(l.qty * l.unitPrice, 2)}</td>
                            <td className="py-1 text-end"><button type="button" onClick={() => removeLine(l.id)} aria-label={t("Remove line {n}", { n: i + 1 })} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"><Trash2 className="size-3.5" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2"><Button variant="ghost" size="sm" onClick={addLine}><Plus /> {t("Add line")}</Button></div>
                  <div className="mt-4 ms-auto w-full max-w-xs space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted">{t("Subtotal ({incoterm})", { incoterm: data.invoice.incoterm })}</span><span className="font-mono tabular-nums">{usd(subtotal, 2)}</span></div>
                    <div className="flex items-center justify-between gap-3"><label htmlFor="inv-fr" className="text-muted">{t("Freight")}</label><input id="inv-fr" inputMode="decimal" value={String(data.invoice.freight)} onChange={(e) => setInv({ freight: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} className="w-28 border-0 border-b border-dashed border-navy-500/30 bg-transparent py-0.5 text-end font-mono text-sm focus:border-teal-500 focus:outline-none" /></div>
                    <div className="flex items-center justify-between gap-3"><label htmlFor="inv-ins" className="text-muted">{t("Insurance")}</label><input id="inv-ins" inputMode="decimal" value={String(data.invoice.insurance)} onChange={(e) => setInv({ insurance: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} className="w-28 border-0 border-b border-dashed border-navy-500/30 bg-transparent py-0.5 text-end font-mono text-sm focus:border-teal-500 focus:outline-none" /></div>
                    <div className="flex justify-between border-t-2 border-navy-900 pt-2 text-base font-bold text-navy-900"><span>{t("Total (USD)")}</span><span className="font-mono tabular-nums">{usd(total, 2)}</span></div>
                  </div>
                  <p className="mt-6 text-[11px] text-muted">{t("We certify that this invoice is true and correct and that the goods are of Egyptian origin. (Template wording — signature and stamp required in production.)")}</p>
                </>
              ) : null}

              {data.tab === "packing" ? (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("Invoice ref.")}</div><div className="mt-1 font-mono text-sm text-navy-900">{data.invoice.number}</div></div>
                    <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("Consignee")}</div><div className="mt-1 text-sm text-navy-900">{data.shipment.consignee || "—"}</div></div>
                    <div className="sm:col-span-2"><DocField id="pl-marks" label={t("Shipping marks")} value={data.packing.marks} onChange={(v) => setData((p) => ({ ...p, packing: { ...p.packing, marks: v } }))} mono /></div>
                  </div>
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead><tr className="border-y border-navy-900 text-start text-[10px] uppercase tracking-wider text-navy-700"><th scope="col" className="py-2 pe-2">#</th><th scope="col" className="py-2 pe-2">{t("Description")}</th><th scope="col" className="py-2 pe-2">{t("HS code")}</th><th scope="col" className="py-2 pe-2 text-end">{t("Cartons")}</th><th scope="col" className="py-2 pe-2 text-end">{t("Qty")}</th><th scope="col" className="py-2 pe-2 text-end">{t("Net kg")}</th><th scope="col" className="py-2 text-end">{t("Gross kg")}</th></tr></thead>
                      <tbody>
                        {data.packing.lines.map((l, i) => {
                          const inv = data.invoice.lines.find((x) => x.id === l.ref);
                          return (
                            <tr key={l.ref} className="border-b border-line">
                              <td className="py-2 pe-2 font-mono text-xs text-muted">{i + 1}</td>
                              <td className="py-1 pe-2"><CellInput label={t("Packing line {n} description", { n: i + 1 })} value={l.description} onChange={(v) => setPackLine(l.ref, { description: v })} /></td>
                              <td className="w-24 py-1 pe-2"><CellInput label={t("Packing line {n} HS code", { n: i + 1 })} value={l.hs} onChange={(v) => setPackLine(l.ref, { hs: v })} mono invalid={!!inv && inv.hs !== l.hs} /></td>
                              <td className="w-20 py-1 pe-2"><CellInput label={t("Packing line {n} cartons", { n: i + 1 })} value={String(l.cartons)} onChange={(v) => setPackLine(l.ref, { cartons: Number(v.replace(/[^\d]/g, "")) || 0 })} mono right /></td>
                              <td className="w-24 py-1 pe-2"><CellInput label={t("Packing line {n} quantity", { n: i + 1 })} value={String(l.qty)} onChange={(v) => setPackLine(l.ref, { qty: Number(v.replace(/[^\d]/g, "")) || 0 })} mono right invalid={!!inv && inv.qty !== l.qty} /></td>
                              <td className="w-24 py-1 pe-2"><CellInput label={t("Packing line {n} net kg", { n: i + 1 })} value={String(l.netKg)} onChange={(v) => setPackLine(l.ref, { netKg: Number(v.replace(/[^\d.]/g, "")) || 0 })} mono right /></td>
                              <td className="w-24 py-1"><CellInput label={t("Packing line {n} gross kg", { n: i + 1 })} value={String(l.grossKg)} onChange={(v) => setPackLine(l.ref, { grossKg: Number(v.replace(/[^\d.]/g, "")) || 0 })} mono right invalid={l.grossKg <= l.netKg} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-navy-900 font-mono text-sm font-bold text-navy-900">
                          <td colSpan={3} className="py-2 font-sans text-xs uppercase tracking-wider">{t("Totals")}</td>
                          <td className="py-2 pe-2 text-end">{data.packing.lines.reduce((a, l) => a + l.cartons, 0).toLocaleString("en-US")}</td>
                          <td className="py-2 pe-2 text-end">{data.packing.lines.reduce((a, l) => a + l.qty, 0).toLocaleString("en-US")}</td>
                          <td className="py-2 pe-2 text-end">{data.packing.lines.reduce((a, l) => a + l.netKg, 0).toLocaleString("en-US")}</td>
                          <td className="py-2 text-end">{data.packing.lines.reduce((a, l) => a + l.grossKg, 0).toLocaleString("en-US")}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : null}

              {data.tab === "shipment" ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <DocField id="sh-shipper" label={t("Shipper")} value={factory.name} onChange={() => undefined} readOnly />
                  <DocField id="sh-cons" label={t("Consignee")} value={data.shipment.consignee} onChange={(v) => setShip({ consignee: v })} />
                  <DocField id="sh-notify" label={t("Notify party")} value={data.shipment.notify} onChange={(v) => setShip({ notify: v })} />
                  <DocField id="sh-mode" label={t("Mode of transport")} value={data.shipment.mode} onChange={(v) => setShip({ mode: v })} />
                  <DocField id="sh-pol" label={t("Port of loading")} value={data.shipment.portLoading} onChange={(v) => setShip({ portLoading: v })} />
                  <DocField id="sh-pod" label={t("Port of discharge")} value={data.shipment.portDischarge} onChange={(v) => setShip({ portDischarge: v })} />
                  <DocField id="sh-vessel" label={t("Vessel / voyage")} value={data.shipment.vessel} onChange={(v) => setShip({ vessel: v })} placeholder={t("To be booked with forwarder")} />
                  <DocField id="sh-cont" label={t("Container")} value={data.shipment.container} onChange={(v) => setShip({ container: v })} mono />
                  <DocField id="sh-bl" label={t("B/L type")} value={data.shipment.blType} onChange={(v) => setShip({ blType: v })} />
                  <div><div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("Gross weight (from packing list)")}</div><div className="mt-1 font-mono text-sm text-navy-900">{data.packing.lines.reduce((a, l) => a + l.grossKg, 0).toLocaleString("en-US")} kg</div></div>
                  <div className="sm:col-span-2">
                    <label htmlFor="sh-instr" className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{t("Special instructions")}</label>
                    <textarea id="sh-instr" rows={3} value={data.shipment.instructions} onChange={(e) => setShip({ instructions: e.target.value })} className="mt-1 w-full resize-none border-0 border-b border-dashed border-navy-500/30 bg-transparent px-0 py-1 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-0" />
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <aside className="min-w-0 space-y-5">
          <Panel title={t("Cross-document checks")} description={t("Updates as you edit")} bodyClassName="p-3">
            {issues.length ? (
              <ul className="space-y-1.5" aria-live="polite">
                {issues.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => setData((p) => ({ ...p, tab: i.tab }))} className={cn("flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-start text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300", i.level === "error" ? "bg-red-50 text-red-800 hover:bg-red-100" : "bg-amber-50 text-amber-800 hover:bg-amber-100")}>
                      {i.level === "error" ? <AlertOctagon className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}
                      <span>{i.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800"><CheckCircle2 className="size-4" /> {t("All documents are consistent.")}</div>
            )}
          </Panel>

          <Panel title={t("{dest} checklist", { dest: t(DESTS[data.dest].name) })} description={t("{group} rules · illustrative", { group: t(DESTS[data.dest].group) })} actions={<span className="text-xs font-semibold tabular-nums text-muted">{checked}/{checklist.length}</span>} bodyClassName="p-2">
            <ul>
              {checklist.map((c) => {
                const on = data.checklist.includes(`${data.dest}:${c.id}`);
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-canvas">
                      <input type="checkbox" checked={on} onChange={() => toggleCheck(c.id)} className="mt-0.5 size-4 shrink-0 accent-teal-600" />
                      <span className={cn("min-w-0", on ? "text-navy-600 line-through decoration-navy-500/30" : "text-navy-900")}>{t(c.label)}{c.origin ? <span className="ms-1.5 align-middle"><StatusPill tone={on ? "good" : "warn"}>{t("Origin")}</StatusPill></span> : null}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <AIInsight title={t("Document assistant")}>
            {errors.length
              ? <>{t("Fix {count} blocking issue(s) first — mismatched HS codes or quantities between invoice and packing list are a common cause of customs holds.", { count: errors.length })} {data.tab !== "packing" && errors.some((e) => e.tab === "packing") ? t("Open the packing list and use “Auto-fill from invoice”.") : ""}</>
              : checked < checklist.length
                ? t("Documents are consistent. {count} checklist item(s) remain for {dest} — arrange origin and conformity documents with the relevant chamber or authority.", { count: checklist.length - checked, dest: t(DESTS[data.dest].name) })
                : t("The shipment file looks complete for {dest}. Share drafts with your freight forwarder and customs broker for review.", { dest: t(DESTS[data.dest].name) })}
          </AIInsight>
          <div className="flex items-start gap-2 rounded-xl border border-line bg-white p-3 text-xs text-muted"><ClipboardCheck className="mt-0.5 size-3.5 shrink-0" /> {t("No official certificates or customs submissions are generated by this toolkit.")}</div>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}

// ---------------- Paper form controls ----------------
function DocField({ id, label, value, onChange, mono, type = "text", placeholder, readOnly }: { id: string; label: string; value: string; onChange: (v: string) => void; mono?: boolean; type?: string; placeholder?: string; readOnly?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</label>
      <input id={id} type={type} value={value} readOnly={readOnly} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn("mt-1 w-full border-0 border-b border-dashed border-navy-500/30 bg-transparent px-0 py-1 text-sm text-navy-900 placeholder:text-amber-600/70 focus:border-teal-500 focus:outline-none focus:ring-0", mono && "font-mono", readOnly && "border-transparent text-navy-700", !value.trim() && !readOnly && "border-amber-400")} />
    </div>
  );
}

function CellInput({ label, value, onChange, mono, right, invalid }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean; right?: boolean; invalid?: boolean }) {
  return <input aria-label={label} aria-invalid={invalid || undefined} value={value} onChange={(e) => onChange(e.target.value)} className={cn("w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-navy-900 hover:border-line focus:border-teal-400 focus:bg-white focus:outline-none", mono && "font-mono text-xs", right && "text-end", invalid && "border-red-300 bg-red-50 text-red-800")} />;
}
