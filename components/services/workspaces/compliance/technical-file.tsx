"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  BadgeCheck, CheckCheck, ClipboardList, Eye, FileSearch, FileText, FlaskConical, Loader2, Lock, Pencil, Plus, RefreshCw, Send, ShieldAlert, Sparkles, Trash2, Undo2, UserCheck, Wand2,
} from "lucide-react";
import { AIInsight, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, DemoDisclaimer, Input } from "@/components/ui";
import { DocBody } from "@/components/solutions/compliance/doc-body";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { DEMO_TODAY, DAY, fmtDate, iso, isFoodLike, productsOf, uid, useDateFormat, useSimulatedAction } from "./shared";

// ---------------- Types ----------------
type ItemKey = "description" | "drawings" | "bom" | "risk" | "tests" | "standards" | "process" | "labelling" | "declaration";
type ItemStatus = "missing" | "ai-draft" | "prepared" | "under-review" | "approved";
interface Item { key: ItemKey; status: ItemStatus; body: string; version: number; note?: string }
interface SpecRow { id: string; param: string; value: string; unit: string }
interface Evidence { id: string; reportId: string; test: string; lab: string; date: string; result: "Pass" | "Pending" | "Conditional" }
interface ProductFile { id: string; name: string; target: string; items: Item[]; spec: SpecRow[]; evidence: Evidence[] }
interface TFData { selected: string; products: ProductFile[] }

const ITEMS: { key: ItemKey; title: string; hint: string }[] = [
  { key: "description", title: "Product description & intended use", hint: "What it is, who uses it, foreseeable misuse" },
  { key: "drawings", title: "Design / specification drawings", hint: "Drawing register and revision control" },
  { key: "bom", title: "Bill of materials & materials", hint: "Components, materials, suppliers" },
  { key: "risk", title: "Risk assessment", hint: "Hazards, controls, residual risk" },
  { key: "tests", title: "Test reports", hint: "Summary of evidence and results" },
  { key: "standards", title: "Standards applied", hint: "Harmonised / sector standards and clauses" },
  { key: "process", title: "Manufacturing & QC process", hint: "Process flow, control plan, inspection" },
  { key: "labelling", title: "Labelling & instructions", hint: "Marking, care / fitting instructions" },
  { key: "declaration", title: "Declaration draft", hint: "Manufacturer’s declaration (draft only)" },
];
const titleOf = (k: ItemKey) => ITEMS.find((i) => i.key === k)!.title;

const STATUS: Record<ItemStatus, { label: string; tone: "good" | "warn" | "bad" | "info" | "neutral"; weight: number }> = {
  missing: { label: "Missing", tone: "bad", weight: 0 },
  "ai-draft": { label: "AI draft", tone: "info", weight: 0.35 },
  prepared: { label: "Prepared", tone: "neutral", weight: 0.6 },
  "under-review": { label: "Under expert review", tone: "warn", weight: 0.85 },
  approved: { label: "Approved by expert", tone: "good", weight: 1 },
};
const REVIEWER = "External certification expert (demo)";

// ---------------- Draft generator (deterministic) ----------------
/** Arabic counterpart of draftFor — same structure (headings, bullets, numbered steps). */
function draftForAr(key: ItemKey, p: Pick<ProductFile, "name" | "target" | "spec" | "evidence">, factory: Factory, variant: number, tr: TFunction): string {
  const v = variant % 3;
  const fname = factory.nameAr ?? factory.name;
  const loc = tr(factory.location);
  const name = tr(p.name);
  const target = tr(p.target);
  const code = p.name.slice(0, 3).toUpperCase();
  const specLines = p.spec.map((s) => `- ${tr(s.param)}: ${tr(s.value)}${s.unit ? ` ${tr(s.unit)}` : ""}`).join("\n");
  const intro = [
    "أعدّ وكيل الصياغة في جاهز هذا القسم انطلاقًا من ملف المصنع وجدول المواصفات، ويجب أن يراجعه المهندس المسؤول.",
    `أُعدّ تلقائيًا من بيانات منتجات ${fname}. الصياغة نقطة انطلاق لمالك الملف الفني.`,
    `مسودة بمساعدة الذكاء الاصطناعي (المراجعة ${variant + 1}). تحقّق من كل عبارة مقابل الوثائق المضبوطة قبل الاستخدام.`,
  ][v];
  switch (key) {
    case "description":
      return `# تعريف المنتج\n${name} من تصنيع ${fname}، ${loc}، مصر.\n${intro}\n# الاستخدام المقصود\n- مسار المطابقة المستهدف: ${target} (توضيحي)\n- المستخدمون المقصودون: المشترون المحترفون وعملاؤهم في أسواق التصدير\n- سوء الاستخدام المتوقع: الاستخدام خارج حدود المواصفات المعلنة\n# الخصائص الرئيسية\n${specLines}`;
    case "drawings":
      return `# سجل الرسومات\n${intro}\n- DRW-${code}-001 المراجعة C: الترتيب العام\n- DRW-${code}-002 المراجعة B: الأبعاد والتفاوتات الحرجة\n- DRW-${code}-003 المراجعة A: موضع العلامة / الملصق\n# ضبط المراجعات\n- تُحفظ الرسومات المعتمدة في سجل ضبط الوثائق\n- تخضع التغييرات لإجراء التغيير الهندسي ويُعاد اعتمادها قبل الإنتاج`;
    case "bom":
      return `# قائمة المواد\n${intro}\n${p.spec.filter((s) => /material|composition|fabric|coating|tape|yarn/i.test(s.param)).map((s) => `- ${tr(s.param)}: ${tr(s.value)}`).join("\n") || "- المادة الرئيسية: وفق جدول المواصفات"}\n- التغليف: كرتونة تصدير، وملصق دفعة برمز QR\n# ضوابط الموردين\n- قائمة موردين معتمدين مع شهادات مواد لكل دفعة\n- طلب إقرارات المواد المقيّدة سنويًا`;
    case "risk":
      return `# المنهجية\n${intro}\nحُدّدت المخاطر لكل مرحلة من دورة الحياة وقُيّمت وفق الشدة × الاحتمالية (1–5).\n# المخاطر الرئيسية وضوابطها\n1. عدم مطابقة المواد: فحص الشهادات الواردة وأخذ عينات من الدفعات\n2. انحراف الأبعاد / الخصائص: الضبط الإحصائي أثناء التشغيل والفحص النهائي\n3. المواد المقيّدة: إقرارات الموردين والفحص المخبري الدوري\n4. الوسم غير الصحيح: التحقق من الملصقات عند التغليف\n# المخاطر المتبقية\nاقتراح الذكاء الاصطناعي: تُقدَّر المخاطر المتبقية بأنها منخفضة بعد تطبيق الضوابط — على أن يؤكد ذلك الخبير المراجع.`;
    case "tests":
      return `# ملخص أدلة الاختبار\n${intro}\n${p.evidence.map((e) => `- ${e.reportId}: ${tr(e.test)} — ${tr(e.lab)}، ${fmtDate(e.date, "ar")} — ${tr(e.result)}`).join("\n") || "- لم تُربط تقارير اختبار بعد"}\n# الفجوات\n${p.evidence.some((e) => e.result !== "Pass") ? "- يوجد تقرير واحد على الأقل معلّق أو مشروط؛ يجب إغلاقه قبل مراجعة الخبير" : "- لم يحدّد الذكاء الاصطناعي فجوات مفتوحة؛ ويؤكد الخبير تغطية الاختبارات"}`;
    case "standards":
      return `# المعايير والمتطلبات المطبّقة (توضيحي)\n${intro}\n- ${target}\n- نظام إدارة الجودة ISO 9001 (على مستوى الموقع)\n- المتطلبات الخاصة بالعميل كما وردت في مواصفات الشراء\n# مطابقة البنود\nاقتراح الذكاء الاصطناعي: اربط كل بند من بنود المتطلبات بتقرير الاختبار أو الإجراء الذي يعالجه في قائمة الأدلة.`;
    case "process":
      return `# تدفق العملية\n1. الفحص الوارد للمواد\n2. الإنتاج مع فحوص أثناء التشغيل\n3. الفحص النهائي والإفراج\n4. التغليف والوسم وتتبّع الدفعات\n# ضوابط الجودة\n${intro}\n- مرجع خطة الضبط: CP-${code}-01\n- يُعزل المنتج غير المطابق ويُسجَّل\n- تُحفظ سجلات الدفعات لمدة 10 سنوات على الأقل (توضيحي)`;
    case "labelling":
      return `# العلامات\n${intro}\n- اسم الشركة المصنّعة وعنوانها\n- مرجع المنتج ورقم الدفعة / التشغيلة\n- رمز QR يربط بصفحة رحلة المنتج\n# التعليمات\n- تعليمات التخزين والمناولة باللغتين الإنجليزية والعربية\n- تُؤكَّد النسخ اللغوية الخاصة بكل سوق حسب الوجهة`;
    case "declaration":
      return `# الإقرار (مسودة — غير موقّع وغير صادر)\n${intro}\nالشركة المصنّعة: ${fname}، ${loc}، مصر.\nالمنتج: ${name}.\n# البيان\nتعتزم الشركة المصنّعة الإقرار بأن المنتج يستوفي ${target} بعد اكتمال مراجعة الخبير وتأكيد الأدلة.\n# التوقيع\n- الاسم / المنصب: يستكمله شخص مفوَّض\n- التاريخ: يُستكمل لاحقًا\nليس لهذه المسودة أي أثر قانوني وهي ليست شهادة.`;
  }
}

function draftFor(key: ItemKey, p: Pick<ProductFile, "name" | "target" | "spec" | "evidence">, factory: Factory, variant: number, tr?: TFunction): string {
  // `tr` is only passed when the active locale is Arabic.
  if (tr) return draftForAr(key, p, factory, variant, tr);
  const v = variant % 3;
  const specLines = p.spec.map((s) => `- ${s.param}: ${s.value}${s.unit ? ` ${s.unit}` : ""}`).join("\n");
  const intro = [
    `This section was drafted by the JAHEZ Drafting Agent from the factory profile and specification table. It must be checked by the responsible engineer.`,
    `Prepared automatically from ${factory.name}'s product data. Wording is a starting point for the technical-file owner.`,
    `AI-assisted draft (revision ${variant + 1}). Verify every statement against controlled documents before use.`,
  ][v];
  switch (key) {
    case "description":
      return `# Product identification\n${p.name} manufactured by ${factory.name}, ${factory.location}, Egypt.\n${intro}\n# Intended use\n- Target conformity route: ${p.target} (illustrative)\n- Intended users: professional buyers and their customers in export markets\n- Foreseeable misuse: use outside the stated specification limits\n# Key characteristics\n${specLines}`;
    case "drawings":
      return `# Drawing register\n${intro}\n- DRW-${p.name.slice(0, 3).toUpperCase()}-001 rev C: General arrangement\n- DRW-${p.name.slice(0, 3).toUpperCase()}-002 rev B: Critical dimensions & tolerances\n- DRW-${p.name.slice(0, 3).toUpperCase()}-003 rev A: Marking / label position\n# Revision control\n- Released drawings are held in the document control register\n- Changes follow the engineering change procedure and are re-approved before production`;
    case "bom":
      return `# Bill of materials\n${intro}\n${p.spec.filter((s) => /material|composition|fabric|coating|tape|yarn/i.test(s.param)).map((s) => `- ${s.param}: ${s.value}`).join("\n") || "- Main material: as per specification table"}\n- Packaging: export carton, batch label with QR\n# Supplier controls\n- Approved-supplier list with material certificates per lot\n- Restricted-substance declarations requested annually`;
    case "risk":
      return `# Method\n${intro}\nRisks were identified per life-cycle stage and scored severity × likelihood (1–5).\n# Main hazards and controls\n1. Material non-conformity: incoming certificate check and lot sampling\n2. Dimensional / property drift: in-process SPC and final inspection\n3. Restricted substances: supplier declarations and periodic lab screening\n4. Incorrect labelling: label verification at packaging\n# Residual risk\nAI suggestion: residual risk judged low after controls — to be confirmed by the expert reviewer.`;
    case "tests":
      return `# Test evidence summary\n${intro}\n${p.evidence.map((e) => `- ${e.reportId}: ${e.test} — ${e.lab}, ${fmtDate(e.date)} — ${e.result}`).join("\n") || "- No test reports linked yet"}\n# Gaps\n${p.evidence.some((e) => e.result !== "Pass") ? "- At least one report is pending or conditional; close it before expert review" : "- No open gaps identified by the AI; expert to confirm test coverage"}`;
    case "standards":
      return `# Standards and requirements applied (illustrative)\n${intro}\n- ${p.target}\n- ISO 9001 quality management system (site level)\n- Customer-specific requirements as listed in purchase specifications\n# Clause mapping\nAI suggestion: map each requirement clause to the test report or procedure that addresses it in the evidence list.`;
    case "process":
      return `# Process flow\n1. Incoming inspection of materials\n2. Production with in-process checks\n3. Final inspection and release\n4. Packaging, labelling and batch traceability\n# Quality controls\n${intro}\n- Control plan reference: CP-${p.name.slice(0, 3).toUpperCase()}-01\n- Non-conforming product is segregated and recorded\n- Batch records retained for at least 10 years (illustrative)`;
    case "labelling":
      return `# Marking\n${intro}\n- Manufacturer name and address\n- Product reference and batch / lot number\n- QR code linking to the product journey page\n# Instructions\n- Storage and handling instructions in English and Arabic\n- Market-specific language versions to be confirmed per destination`;
    case "declaration":
      return `# Declaration (DRAFT — not signed, not issued)\n${intro}\nManufacturer: ${factory.name}, ${factory.location}, Egypt.\nProduct: ${p.name}.\n# Statement\nThe manufacturer intends to declare that the product meets ${p.target} once expert review is complete and evidence is confirmed.\n# Signature\n- Name / position: to be completed by an authorised person\n- Date: to be completed\nThis draft has no legal effect and is not a certificate.`;
  }
}

// ---------------- Seeds ----------------
type SeedProduct = { name: string; target: string; statuses: ItemStatus[]; spec: [string, string, string][]; evidence: [string, string, number, Evidence["result"]][] };

function seedProducts(factory: Factory): SeedProduct[] {
  const key = seedKeyFor(factory);
  if (key === "delta") {
    return [
      { name: "Vented brake disc Ø280 mm", target: "ECE R90 replacement brake disc approval", statuses: ["prepared", "prepared", "ai-draft", "ai-draft", "prepared", "prepared", "prepared", "missing", "missing"],
        spec: [["Outer diameter", "280", "mm"], ["Nominal thickness", "22", "mm"], ["Minimum thickness (MIN TH)", "20", "mm"], ["Material", "EN-GJL-200 grey cast iron", ""], ["Mass", "6.4", "kg"], ["Lateral run-out", "≤ 0.03", "mm"], ["Coating", "Zinc-flake, Cr(VI)-free", ""]],
        evidence: [["TR-R90-2609-012", "Dynamometer performance comparison vs. OE part", 64, "Pass"], ["TR-MAT-2610-118", "Chemical composition & tensile", 41, "Pass"], ["TR-SST-2610-033", "Neutral salt spray, 240 h", 22, "Pending"]] },
      { name: "Forged steering knuckle", target: "Customer PPAP Level 3 (IATF 16949 context)", statuses: ["prepared", "ai-draft", "missing", "missing", "prepared", "ai-draft", "prepared", "missing", "missing"],
        spec: [["Material", "42CrMo4, quenched & tempered", ""], ["Hardness", "28–32", "HRC"], ["Mass", "3.9", "kg"], ["Hub bore", "Ø62 H7", ""], ["Crack test", "MPI 100%", ""]],
        evidence: [["TR-FAT-2608-207", "Fatigue test, 2×10⁶ cycles", 95, "Pass"], ["TR-MPI-2610-054", "Magnetic particle inspection capability", 30, "Pass"]] },
      { name: "CNC-machined gearbox housing", target: "RoHS / REACH material declaration (EU)", statuses: ["ai-draft", "prepared", "prepared", "missing", "missing", "ai-draft", "prepared", "missing", "missing"],
        spec: [["Material", "AlSi9Cu3 die casting", ""], ["Mass", "2.7", "kg"], ["Bore tolerance", "H7", ""], ["Leak test", "≤ 2 cc/min @ 1 bar", ""]],
        evidence: [["TR-XRF-2610-071", "XRF screening of restricted elements", 35, "Pass"]] },
    ];
  }
  if (key === "al-noor") {
    return [
      { name: "Single-jersey cotton knit fabric", target: "OEKO-TEX Standard 100, product class II", statuses: ["prepared", "prepared", "prepared", "ai-draft", "prepared", "prepared", "ai-draft", "missing", "missing"],
        spec: [["Fibre composition", "100% cotton (combed)", ""], ["Fabric weight", "180", "g/m²"], ["Width", "180", "cm (open)"], ["Dye class", "Reactive", ""], ["Colour fastness to washing", "≥ 4", "grade"], ["pH of aqueous extract", "4.0–7.5", ""]],
        evidence: [["TR-OTX-2610-551", "pH, formaldehyde, extractable metals", 33, "Pass"], ["TR-AZO-2610-207", "Azo-amine screening of dyes", 33, "Pass"], ["TR-CF-2611-090", "Colour fastness to washing & rubbing", 9, "Pending"]] },
      { name: "Workwear coverall, hi-vis trim", target: "EN ISO 20471 high-visibility clothing (illustrative class 2)", statuses: ["ai-draft", "missing", "prepared", "missing", "prepared", "ai-draft", "prepared", "missing", "missing"],
        spec: [["Fabric", "65/35 poly-cotton twill", ""], ["Fabric weight", "260", "g/m²"], ["Retro-reflective tape", "50 mm, sewn-on", ""], ["Sizes", "S–3XL", ""]],
        evidence: [["TR-HV-2609-144", "Retro-reflection of tape (supplier report)", 70, "Conditional"]] },
      { name: "Hospital bed sheet", target: "Buyer specification for healthcare linen (illustrative)", statuses: ["prepared", "missing", "prepared", "missing", "missing", "ai-draft", "prepared", "ai-draft", "missing"],
        spec: [["Composition", "65/35 poly-cotton", ""], ["Dimensions", "160 × 260", "cm"], ["Laundry durability target", "50", "cycles"]],
        evidence: [] },
    ];
  }
  const p = productsOf(factory);
  const food = isFoodLike(factory);
  return p.slice(0, 3).map((name, i) => ({
    name,
    target: food ? (i === 0 ? "Halal certification file (illustrative)" : "Organic certification file (illustrative)") : i === 0 ? "CE marking — where applicable (illustrative)" : "ISO 9001-aligned product file",
    statuses: (i === 0 ? ["prepared", "ai-draft", "prepared", "missing", "missing", "ai-draft", "prepared", "missing", "missing"] : ["ai-draft", "missing", "missing", "missing", "missing", "ai-draft", "prepared", "missing", "missing"]) as ItemStatus[],
    spec: food ? [["Ingredients", "As per recipe sheet", ""], ["Net weight", "500", "g"], ["Shelf life", "12", "months"]] : [["Main material", "As per specification", ""], ["Dimensions", "To be confirmed", ""], ["Mass", "To be confirmed", "kg"]],
    evidence: i === 0 ? [["TR-GEN-2610-010", "Basic product test (fictional)", 30, "Pass"]] : [],
  }));
}

function seed(factory: Factory, tr?: TFunction): TFData {
  const products: ProductFile[] = seedProducts(factory).map((sp, pi) => {
    const spec: SpecRow[] = sp.spec.map(([param, value, unit], i) => ({ id: `s${pi}-${i}`, param, value, unit }));
    const evidence: Evidence[] = sp.evidence.map(([reportId, test, daysAgo, result], i) => ({ id: `e${pi}-${i}`, reportId, test, lab: ["Demo Test Lab A (fictional)", "Demo Materials Lab B (fictional)", "Demo Textile Lab C (fictional)"][i % 3], date: iso(DEMO_TODAY - daysAgo * DAY), result }));
    const base = { name: sp.name, target: sp.target, spec, evidence };
    const items: Item[] = ITEMS.map((it, i) => {
      const status = sp.statuses[i];
      return { key: it.key, status, version: status === "missing" ? 0 : 1, body: status === "missing" ? "" : draftFor(it.key, base, factory, 0, tr) };
    });
    return { id: `p${pi + 1}`, ...base, items };
  });
  return { selected: products[0]?.id ?? "", products };
}

// ---------------- Component ----------------
export default function TechnicalFile({ service }: WorkspaceProps) {
  const tr = useT();
  const { locale } = useLocale();
  const { fmtDate: fmtD } = useDateFormat();
  const { factory, data, setData, reset } = useServiceWorkspace<TFData>(service.id, (f) => seed(f, locale === "ar" ? tr : undefined));
  const reduce = useReducedMotion();
  const { busy, run } = useSimulatedAction();
  const draftTr = locale === "ar" ? tr : undefined;
  const [openKey, setOpenKey] = useState<ItemKey>("description");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [draftText, setDraftText] = useState<string | null>(null);
  const [ev, setEv] = useState({ reportId: "", test: "", lab: "" });

  const product = data.products.find((p) => p.id === data.selected) ?? data.products[0];
  if (!product) return <WorkspaceFrame service={service} onReset={reset}><Panel>{tr("No products available.")}</Panel></WorkspaceFrame>;

  const item = product.items.find((i) => i.key === openKey) ?? product.items[0];
  const counts = (s: ItemStatus) => product.items.filter((i) => i.status === s).length;
  const missing = counts("missing");
  const drafts = counts("ai-draft");
  const prepared = counts("prepared");
  const review = counts("under-review");
  const approved = counts("approved");
  const allApproved = approved === product.items.length;
  const score = Math.round((product.items.reduce((n, i) => n + STATUS[i.status].weight, 0) / product.items.length) * 100);
  const readiness = allApproved
    ? { label: tr("Ready for certification submission (demo)"), tone: "good" as const }
    : missing ? { label: tr("Not ready — documents missing"), tone: "bad" as const }
    : drafts ? { label: tr("AI drafts need your team’s check"), tone: "info" as const }
    : prepared ? { label: tr("Expert review required"), tone: "warn" as const }
    : { label: tr("Awaiting expert approval"), tone: "warn" as const };
  const canRequest = missing === 0 && drafts === 0 && prepared > 0;

  const patchProduct = (fn: (p: ProductFile) => ProductFile) => setData((d) => ({ ...d, products: d.products.map((p) => (p.id === product.id ? fn(p) : p)) }));
  const patchItem = (key: ItemKey, fn: (i: Item) => Item) => patchProduct((p) => ({ ...p, items: p.items.map((i) => (i.key === key ? fn(i) : i)) }));

  const selectProduct = (id: string) => { setData((d) => ({ ...d, selected: id })); setMode("preview"); setDraftText(null); setOpenKey("description"); };
  const openItem = (k: ItemKey) => { setOpenKey(k); setMode("preview"); setDraftText(null); };

  const generate = (key: ItemKey) => {
    run(`gen-${key}`, () => {
      patchItem(key, (i) => ({ ...i, status: "ai-draft", version: i.version + 1, body: draftFor(key, product, factory, i.version, draftTr), note: undefined }));
      setOpenKey(key); setMode("preview"); setDraftText(null);
      toast.success(tr("AI draft ready — {section}", { section: tr(titleOf(key)) }), { description: tr("Check the wording before marking it prepared.") });
    }, 1000);
  };
  const generateAllMissing = () => {
    run("gen-all", () => {
      patchProduct((p) => ({ ...p, items: p.items.map((i) => (i.status === "missing" ? { ...i, status: "ai-draft", version: i.version + 1, body: draftFor(i.key, p, factory, i.version, draftTr) } : i)) }));
      toast.success(tr("AI drafts prepared for all missing sections"));
    }, 1200);
  };
  const markPrepared = (key: ItemKey) => patchItem(key, (i) => ({ ...i, status: "prepared", note: undefined }));
  const acceptAllDrafts = () => patchProduct((p) => ({ ...p, items: p.items.map((i) => (i.status === "ai-draft" ? { ...i, status: "prepared" } : i)) }));
  const requestReview = () => {
    run("review", () => {
      patchProduct((p) => ({ ...p, items: p.items.map((i) => (i.status === "prepared" ? { ...i, status: "under-review", note: `Sent to ${REVIEWER}` } : i)) }));
      toast(tr("Expert review requested (simulated)"), { description: tr(prepared > 1 ? "{count} sections sent to {reviewer}." : "{count} section sent to {reviewer}.", { count: prepared, reviewer: tr(REVIEWER) }) });
    }, 900);
  };
  const approve = (key: ItemKey) => {
    patchItem(key, (i) => ({ ...i, status: "approved", note: tr("Approved by {reviewer} on {date}", { reviewer: tr(REVIEWER), date: fmtD(DEMO_TODAY) }) }));
    toast.success(tr("Expert-approved (demo) — {section}", { section: tr(titleOf(key)) }));
  };
  const returnForChanges = (key: ItemKey) => patchItem(key, (i) => ({ ...i, status: "prepared", note: "Returned by expert: clarify residual-risk rationale and cite evidence IDs." }));

  const saveEdit = () => {
    if (draftText === null) return;
    const changed = draftText !== item.body;
    patchItem(item.key, (i) => ({
      ...i, body: draftText, version: changed ? i.version + 1 : i.version,
      status: !changed ? i.status : i.status === "approved" || i.status === "under-review" ? "prepared" : i.status === "missing" ? "prepared" : i.status,
      note: changed && (i.status === "approved" || i.status === "under-review") ? "Edited after review — expert review must be repeated." : i.note,
    }));
    setDraftText(null); setMode("preview");
    if (changed) toast(tr("Draft saved"), { description: item.status === "approved" ? tr("Approval withdrawn: the section changed after review.") : undefined });
  };
  const regenerate = () => {
    run(`regen-${item.key}`, () => {
      patchItem(item.key, (i) => ({ ...i, status: "ai-draft", version: i.version + 1, body: draftFor(i.key, product, factory, i.version, draftTr), note: i.status === "approved" ? "Regenerated — previous approval withdrawn." : undefined }));
      setDraftText(null); setMode("preview");
    }, 1000);
  };

  const addEvidence = () => {
    if (!ev.reportId.trim() || !ev.test.trim()) return;
    patchProduct((p) => ({ ...p, evidence: [...p.evidence, { id: uid("e"), reportId: ev.reportId.trim(), test: ev.test.trim(), lab: ev.lab.trim() || "Lab to be confirmed (fictional)", date: iso(DEMO_TODAY), result: "Pending" }] }));
    setEv({ reportId: "", test: "", lab: "" });
  };

  const gateSteps = [
    { label: "Prepare file", detail: missing || drafts ? tr("{missing} missing · {drafts} AI drafts to check", { missing, drafts }) : tr("All sections prepared"), done: missing === 0 && drafts === 0, icon: ClipboardList },
    { label: "Expert review required", detail: allApproved ? tr("All sections approved by expert") : review ? tr("{review} under review · {approved} approved", { review, approved }) : tr("Mandatory gate — not yet requested"), done: allApproved, icon: UserCheck, gate: true },
    { label: "Ready for certification submission", detail: allApproved ? tr("Demo state — no certificate is issued") : tr("Locked until every section is expert-approved"), done: allApproved, icon: allApproved ? BadgeCheck : Lock },
  ];

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={tr("Expert review is mandatory; no certification is issued and approvals shown are simulated.")}>
      {/* Product selector + gauge */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <div role="tablist" aria-label={tr("Product")} className="flex flex-wrap gap-2">
            {data.products.map((p) => {
              const on = p.id === product.id;
              const ok = p.items.filter((i) => i.status === "approved").length;
              return (
                <button key={p.id} role="tab" aria-selected={on} onClick={() => selectProduct(p.id)} className={cn("min-w-0 max-w-full flex-1 basis-56 rounded-2xl border bg-white px-4 py-3 text-start shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", on ? "border-teal-400 ring-2 ring-teal-100" : "border-line hover:border-navy-500/30")}>
                  <p className="truncate text-sm font-semibold text-navy-900">{tr(p.name)}</p>
                  <p className="truncate text-xs text-muted">{tr(p.target)}</p>
                  <div className="mt-2 flex gap-0.5" aria-hidden>{p.items.map((i) => <span key={i.key} className={cn("h-1 flex-1 rounded-full", i.status === "approved" ? "bg-emerald-500" : i.status === "under-review" ? "bg-amber-400" : i.status === "prepared" ? "bg-navy-400" : i.status === "ai-draft" ? "bg-sky-400" : "bg-red-300")} />)}</div>
                  <p className="mt-1 text-[11px] text-muted">{tr("{ok}/{total} expert-approved", { ok, total: p.items.length })}</p>
                </button>
              );
            })}
          </div>

          {/* Gate stepper */}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <ol className="grid gap-3 md:grid-cols-3">
              {gateSteps.map((s, i) => (
                <li key={s.label} className={cn("relative flex items-start gap-3 rounded-xl p-3", s.gate && !s.done ? "bg-amber-50 ring-1 ring-inset ring-amber-200" : s.done ? "bg-emerald-50/70" : "bg-canvas")}>
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", s.done ? "bg-emerald-500 text-white" : s.gate ? "bg-amber-500 text-white" : "bg-white text-navy-500 ring-1 ring-line")}><s.icon className="size-4" /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{tr("Step {n}", { n: i + 1 })}{s.gate ? ` · ${tr("gate")}` : ""}</p>
                    <p className="text-sm font-semibold text-navy-900">{tr(s.label)}</p>
                    <p className="text-xs text-muted">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              {missing ? <Button size="sm" variant="subtle" onClick={generateAllMissing} disabled={busy === "gen-all"}>{busy === "gen-all" ? <Loader2 className="animate-spin" /> : <Wand2 />} {tr(missing > 1 ? "AI: draft {count} missing sections" : "AI: draft {count} missing section", { count: missing })}</Button> : null}
              {drafts ? <Button size="sm" variant="outline" onClick={acceptAllDrafts}><CheckCheck /> {tr(drafts > 1 ? "Mark {count} checked drafts prepared" : "Mark {count} checked draft prepared", { count: drafts })}</Button> : null}
              <Button size="sm" variant="gold" onClick={requestReview} disabled={!canRequest || busy === "review"} title={canRequest ? undefined : tr("Resolve missing sections and check AI drafts first")}>{busy === "review" ? <Loader2 className="animate-spin" /> : <Send className="rtl:-scale-x-100" />} {tr("Request expert review")}</Button>
              {!canRequest && !allApproved && !review ? <span className="text-xs text-muted">{tr("Available once no section is missing or unchecked.")}</span> : null}
            </div>
          </div>
        </div>

        <Panel title={tr("Certification readiness")} bodyClassName="flex flex-col items-center p-5">
          <Gauge value={score} allApproved={allApproved} reduce={Boolean(reduce)} />
          <StatusPill tone={readiness.tone} className="mt-2 whitespace-normal text-center">{readiness.label}</StatusPill>
          <dl className="mt-4 grid w-full grid-cols-5 gap-1 text-center">
            {(["missing", "ai-draft", "prepared", "under-review", "approved"] as ItemStatus[]).map((s) => (
              <div key={s} className="min-w-0">
                <dt className="truncate text-[10px] text-muted" title={tr(STATUS[s].label)}>{s === "under-review" ? tr("Review") : s === "approved" ? tr("Approved") : tr(STATUS[s].label)}</dt>
                <dd className="text-sm font-semibold tabular-nums text-navy-900">{counts(s)}</dd>
              </div>
            ))}
          </dl>
          {!allApproved ? <p className="mt-3 flex items-start gap-1.5 text-[11px] text-amber-700"><ShieldAlert className="mt-px size-3.5 shrink-0" /> {tr("Cannot reach “ready” until every section is approved by an expert.")}</p> : null}
        </Panel>
      </div>

      {/* Checklist + editor */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[380px_1fr]">
        <Panel title={tr("Technical-file checklist")} description={tr(product.target)} bodyClassName="p-2">
          <ul className="space-y-1">
            {product.items.map((i, n) => {
              const meta = ITEMS[n];
              const on = i.key === item.key;
              return (
                <li key={i.key}>
                  <div className={cn("rounded-xl border px-3 py-2.5 transition", on ? "border-teal-300 bg-teal-50/50" : "border-transparent hover:bg-canvas")}>
                    <button onClick={() => openItem(i.key)} className="flex w-full items-start gap-2.5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" aria-current={on}>
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-navy-900/5 text-[11px] font-bold tabular-nums text-navy-600">{n + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-navy-900">{tr(meta.title)}</span>
                        <span className="block truncate text-[11px] text-muted">{tr(meta.hint)}</span>
                      </span>
                      <StatusPill tone={STATUS[i.status].tone} className="mt-0.5">{tr(STATUS[i.status].label)}</StatusPill>
                    </button>
                    {i.status === "missing" || i.status === "under-review" ? (
                      <div className="mt-2 flex flex-wrap gap-1.5 ps-8">
                        {i.status === "missing" ? (
                          <Button size="sm" variant="subtle" className="h-7" onClick={() => generate(i.key)} disabled={busy === `gen-${i.key}` || busy === "gen-all"}>{busy === `gen-${i.key}` ? <Loader2 className="animate-spin" /> : <Sparkles />} {tr("Generate AI draft")}</Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="h-7 border-emerald-300 text-emerald-800 hover:bg-emerald-50" onClick={() => approve(i.key)}><BadgeCheck /> {tr("Mark expert-approved (demo)")}</Button>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => returnForChanges(i.key)}><Undo2 /> {tr("Return")}</Button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* Document editor */}
        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-line bg-canvas/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <FileText className="size-4 shrink-0 text-navy-500" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">{tr(titleOf(item.key))}</p>
                <p className="truncate text-[11px] text-muted">{tr(product.name)} · v{item.version || "—"} · {tr(STATUS[item.status].label)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.status !== "missing" ? (
                <div role="tablist" aria-label={tr("Editor mode")} className="inline-flex rounded-lg bg-navy-900/5 p-0.5 text-xs">
                  <button role="tab" aria-selected={mode === "preview"} onClick={() => { setMode("preview"); setDraftText(null); }} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium", mode === "preview" ? "bg-white text-navy-900 shadow-sm" : "text-navy-600")}><Eye className="size-3.5" /> {tr("Preview")}</button>
                  <button role="tab" aria-selected={mode === "edit"} onClick={() => { setMode("edit"); setDraftText(item.body); }} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium", mode === "edit" ? "bg-white text-navy-900 shadow-sm" : "text-navy-600")}><Pencil className="size-3.5" /> {tr("Edit")}</button>
                </div>
              ) : null}
              {item.status !== "missing" ? <Button size="sm" variant="ghost" onClick={regenerate} disabled={busy === `regen-${item.key}`}>{busy === `regen-${item.key}` ? <Loader2 className="animate-spin" /> : <RefreshCw />} {tr("Regenerate draft")}</Button> : null}
            </div>
          </div>
          {item.note ? <div className={cn("border-b px-5 py-2 text-xs", item.status === "approved" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800")}>{tr(item.note)}</div> : null}
          <div className="relative min-h-[360px] p-5 md:p-7">
            {busy === `regen-${item.key}` || busy === `gen-${item.key}` ? (
              <div className="space-y-3" aria-busy>
                <p className="flex items-center gap-2 text-sm font-medium text-teal-700"><Sparkles className="size-4" /> {tr("Drafting Agent is writing…")}</p>
                {[92, 80, 86, 60, 74].map((w, k) => <div key={k} className="h-3 animate-pulse rounded bg-navy-900/[0.06]" style={{ width: `${w}%` }} />)}
              </div>
            ) : item.status === "missing" ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                <span className="grid size-12 place-items-center rounded-xl bg-red-50 text-red-600"><FileSearch className="size-6" /></span>
                <p className="mt-3 text-sm font-semibold text-navy-900">{tr("This section is missing")}</p>
                <p className="mt-1 max-w-sm text-xs text-muted">{tr("Generate an AI draft from your specification and evidence, then have the responsible engineer check it.")}</p>
                <Button className="mt-4" size="sm" variant="accent" onClick={() => generate(item.key)} disabled={busy === "gen-all"}><Sparkles /> {tr("Generate AI draft")}</Button>
              </div>
            ) : mode === "edit" && draftText !== null ? (
              <div>
                <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} aria-label={tr("Edit {field}", { field: tr(titleOf(item.key)) })} rows={Math.min(22, Math.max(12, draftText.split("\n").length + 2))} className="w-full rounded-xl border border-line bg-canvas/40 p-4 font-mono text-[13px] leading-relaxed text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100" />
                <p className="mt-1 text-[11px] text-muted">{tr("Lines starting with “# ” are headings, “- ” bullets, “1. ” numbered steps.")}{item.status === "approved" || item.status === "under-review" ? ` ${tr("Saving changes withdraws the expert review.")}` : ""}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={saveEdit}>{tr("Save draft")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDraftText(null); setMode("preview"); }}>{tr("Cancel")}</Button>
                </div>
              </div>
            ) : (
              <motion.div key={`${item.key}-${item.version}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {item.status === "ai-draft" ? <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200"><Sparkles className="size-3" /> {tr("AI-drafted — check before use")}</p> : null}
                <DocBody body={item.body} checked={new Set<number>()} onToggle={() => undefined} />
                {item.status === "ai-draft" ? <Button className="mt-4" size="sm" variant="outline" onClick={() => markPrepared(item.key)}><CheckCheck /> {tr("I’ve checked this — mark prepared")}</Button> : null}
                {item.status === "under-review" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-50" onClick={() => approve(item.key)}><BadgeCheck /> {tr("Mark expert-approved (demo)")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => returnForChanges(item.key)}><Undo2 /> {tr("Return for changes")}</Button>
                  </div>
                ) : null}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Specs + evidence */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title={tr("Product specification")} description={tr("Click a value to edit · feeds every AI draft")} bodyClassName="p-0"
          actions={<Button size="sm" variant="ghost" onClick={() => patchProduct((p) => ({ ...p, spec: [...p.spec, { id: uid("s"), param: tr("New parameter"), value: "—", unit: "" }] }))}><Plus /> {tr("Row")}</Button>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-canvas text-start text-[11px] uppercase tracking-wider text-muted">
                <tr><th className="px-4 py-2 font-semibold">{tr("Parameter")}</th><th className="px-2 py-2 font-semibold">{tr("Value")}</th><th className="px-2 py-2 font-semibold">{tr("Unit")}</th><th className="w-10 px-2 py-2"><span className="sr-only">{tr("Remove")}</span></th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {product.spec.map((s) => (
                  <tr key={s.id}>
                    <td className="px-2 py-1"><InlineInput value={tr(s.param)} label={tr("parameter")} onChange={(v) => patchProduct((p) => ({ ...p, spec: p.spec.map((x) => (x.id === s.id ? { ...x, param: v } : x)) }))} className="font-medium" /></td>
                    <td className="px-1 py-1"><InlineInput value={tr(s.value)} label={tr("{param} value", { param: tr(s.param) })} onChange={(v) => patchProduct((p) => ({ ...p, spec: p.spec.map((x) => (x.id === s.id ? { ...x, value: v } : x)) }))} /></td>
                    <td className="w-24 px-1 py-1"><InlineInput value={tr(s.unit)} label={tr("{param} unit", { param: tr(s.param) })} onChange={(v) => patchProduct((p) => ({ ...p, spec: p.spec.map((x) => (x.id === s.id ? { ...x, unit: v } : x)) }))} className="text-muted" /></td>
                    <td className="px-2 py-1 text-end"><button onClick={() => patchProduct((p) => ({ ...p, spec: p.spec.filter((x) => x.id !== s.id) }))} aria-label={tr("Remove {item}", { item: tr(s.param) })} className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line px-4 py-2 text-[11px] text-muted">{tr("Changes apply to new drafts — use “Regenerate draft” to refresh a section.")}</p>
        </Panel>

        <Panel title={tr("Supporting evidence")} description={tr(product.evidence.length === 1 ? "{count} test record · all IDs and labs fictional" : "{count} test records · all IDs and labs fictional", { count: product.evidence.length })} bodyClassName="p-0" actions={<FlaskConical className="size-4 text-navy-500" />}>
          <ul className="divide-y divide-line">
            {product.evidence.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-navy-900/5 text-navy-600"><FileText className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-navy-900"><span className="font-mono text-xs">{e.reportId}</span><StatusPill tone={e.result === "Pass" ? "good" : e.result === "Pending" ? "info" : "warn"}>{tr(e.result)}</StatusPill></p>
                  <p className="text-sm text-navy-800">{tr(e.test)}</p>
                  <p className="text-[11px] text-muted">{tr(e.lab)} · {fmtD(e.date)}</p>
                </div>
                <button onClick={() => patchProduct((p) => ({ ...p, evidence: p.evidence.filter((x) => x.id !== e.id) }))} aria-label={tr("Remove {item}", { item: e.reportId })} className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button>
              </li>
            ))}
            {product.evidence.length === 0 ? <li className="px-4 py-6 text-center text-sm text-muted">{tr("No evidence linked yet.")}</li> : null}
          </ul>
          <form className="grid gap-2 border-t border-line bg-canvas/50 p-3 sm:grid-cols-[1fr_1.4fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); addEvidence(); }}>
            <Input className="h-9" placeholder={tr("Report ID")} aria-label={tr("Report ID")} value={ev.reportId} onChange={(e) => setEv({ ...ev, reportId: e.target.value })} />
            <Input className="h-9" placeholder={tr("Test performed")} aria-label={tr("Test performed")} value={ev.test} onChange={(e) => setEv({ ...ev, test: e.target.value })} />
            <Input className="h-9" placeholder={tr("Lab (optional)")} aria-label={tr("Lab")} value={ev.lab} onChange={(e) => setEv({ ...ev, lab: e.target.value })} />
            <Button size="sm" type="submit" className="h-9" disabled={!ev.reportId.trim() || !ev.test.trim()}><Plus /> {tr("Add")}</Button>
          </form>
        </Panel>
      </div>

      <AIInsight className="mt-5" title={tr("AI readiness review")}>
        {missing ? <>{tr(missing > 1 ? "{count} sections are missing for {product} — most often the {sections}." : "{count} section is missing for {product} — most often the {sections}.", { count: missing, product: tr(product.name), sections: product.items.filter((i) => i.status === "missing").map((i) => (locale === "ar" ? tr(titleOf(i.key)) : titleOf(i.key).toLowerCase())).slice(0, 2).join(locale === "ar" ? " و" : " and ") })} </> : null}
        {product.evidence.some((e) => e.result !== "Pass") ? <>{tr("Evidence {ids} is not yet a clean pass; experts usually ask for it before approving the test-report section.", { ids: product.evidence.filter((e) => e.result !== "Pass").map((e) => e.reportId).join(", ") })} </> : null}
        {allApproved ? <>{tr("Every section carries a (simulated) expert approval. In production, the file would now go to a conformity-assessment body — JAHEZ does not issue certificates.")}</> : <>{tr("Readiness stays below “ready” until each section is approved by a qualified expert.")}</>}
      </AIInsight>
      <DemoDisclaimer className="mt-3">{tr("Drafts are AI-generated illustrations. Standards, test IDs, labs and approvals are fictional; certification readiness requires review by qualified experts.")}</DemoDisclaimer>
    </WorkspaceFrame>
  );
}

// ---------------- Sub-components ----------------
function InlineInput({ value, onChange, label, className }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => { if (draft !== null && draft !== value) onChange(draft); setDraft(null); };
  return (
    <input value={draft ?? value} aria-label={label} onFocus={() => setDraft(value)} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDraft(null); e.currentTarget.blur(); } }}
      className={cn("w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-navy-900 hover:border-line focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100", className)} />
  );
}

function Gauge({ value, allApproved, reduce }: { value: number; allApproved: boolean; reduce: boolean }) {
  const tr = useT();
  const r = 70;
  const c = Math.PI * r;
  const shown = allApproved ? 100 : Math.min(value, 95);
  const color = allApproved ? "#10B981" : shown >= 70 ? "#F59E0B" : shown >= 40 ? "#0FA396" : "#EF4444";
  return (
    <div className="relative w-full max-w-[220px]" role="meter" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100} aria-label={tr("Certification readiness")}>
      <svg viewBox="0 0 180 104" className="w-full">
        <path d="M 20 94 A 70 70 0 0 1 160 94" fill="none" stroke="#E5E8EE" strokeWidth={14} strokeLinecap="round" />
        <motion.path d="M 20 94 A 70 70 0 0 1 160 94" fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeDasharray={c}
          initial={false} animate={{ strokeDashoffset: c * (1 - shown / 100) }} transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }} />
        {!allApproved ? <line x1={90 + 70 * Math.cos(Math.PI * 0.05)} y1={94 - 70 * Math.sin(Math.PI * 0.05)} x2={90 + 84 * Math.cos(Math.PI * 0.05)} y2={94 - 84 * Math.sin(Math.PI * 0.05)} stroke="#B45309" strokeWidth={2} /> : null}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-navy-900">{shown}<span className="text-base text-muted">%</span></p>
        <p className="text-[11px] text-muted">{allApproved ? tr("All sections expert-approved") : tr("Expert gate at 95%")}</p>
      </div>
    </div>
  );
}
