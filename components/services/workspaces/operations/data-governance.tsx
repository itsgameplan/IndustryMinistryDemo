"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  BrainCircuit, CheckCircle2, Database, Eye, FileText, Lock, PenLine, Scale, Send, ShieldCheck, Sparkles, Undo2,
} from "lucide-react";
import { Panel, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { useT, type TFunction } from "@/lib/i18n";
import { flavourFor, useSimulatedAI } from "./shared";

// ---------------- Framework ----------------
type DomainId = "quality" | "privacy" | "security" | "ai";
type Answer = "yes" | "partial" | "no";
type Priority = "High" | "Medium" | "Low";
interface Question { id: string; domain: DomainId; text: string; hint: string; critical?: boolean; action: string; owner: string }

const DOMAINS: { id: DomainId; name: string; icon: typeof Database; color: string; blurb: string }[] = [
  { id: "quality", name: "Data quality", icon: Database, color: "#0FA396", blurb: "Ownership, definitions and accuracy of business data" },
  { id: "privacy", name: "Privacy", icon: Eye, color: "#6366F1", blurb: "Personal data themes of Egypt's PDPL (Law No. 151/2020) — illustrative" },
  { id: "security", name: "Security", icon: Lock, color: "#0B1F3A", blurb: "Access, backups, incidents and OT network protection" },
  { id: "ai", name: "Responsible AI", icon: BrainCircuit, color: "#C9A24B", blurb: "Oversight, transparency and acceptable use of AI" },
];

const Q: Question[] = [
  { id: "q1", domain: "quality", text: "Each master data set (customers, products, suppliers) has a named owner", hint: "Owner approves changes and resolves conflicts.", critical: true, action: "Appoint data owners for customer, product and supplier masters", owner: "General Manager" },
  { id: "q2", domain: "quality", text: "There is one agreed source of truth for orders and inventory", hint: "Not several spreadsheets or ledgers with different numbers.", critical: true, action: "Consolidate order and stock records into one system of record", owner: "Operations Manager" },
  { id: "q3", domain: "quality", text: "Validation rules prevent incomplete or duplicate records at entry", hint: "Mandatory fields, drop-downs, duplicate checks.", action: "Add mandatory fields and duplicate checks to order / item entry", owner: "IT / Systems lead" },
  { id: "q4", domain: "quality", text: "Key KPIs have written definitions (KPI dictionary)", hint: "E.g. how OEE or on-time delivery is calculated.", action: "Publish a KPI dictionary with formula, source and owner", owner: "Finance Manager" },
  { id: "q5", domain: "quality", text: "Data quality is measured and reviewed at least monthly", hint: "Completeness, accuracy, timeliness indicators.", action: "Introduce a monthly data-quality scorecard", owner: "Data owner(s)" },
  { id: "q6", domain: "quality", text: "Figures are reconciled between systems (e.g. sales vs finance)", hint: "", action: "Monthly reconciliation of sales, stock and finance figures", owner: "Finance Manager" },
  { id: "q7", domain: "privacy", text: "Personal data held about employees, customers and contacts is inventoried", hint: "A record of processing: what data, why, where, how long.", critical: true, action: "Build a record of processing activities (personal data inventory)", owner: "HR Manager" },
  { id: "q8", domain: "privacy", text: "A lawful basis or consent is documented for each personal-data use", hint: "Consent wording, contracts, legal obligations.", critical: true, action: "Document lawful basis / consent for each processing purpose", owner: "Legal counsel (external)" },
  { id: "q9", domain: "privacy", text: "A procedure exists to answer data-subject requests (access, correction, deletion)", hint: "", action: "Create a data-subject request procedure and log", owner: "HR Manager" },
  { id: "q10", domain: "privacy", text: "A data protection officer or responsible person is designated", hint: "Required for certain controllers under the PDPL — confirm with counsel.", action: "Designate a data protection lead and confirm DPO obligations with counsel", owner: "General Manager" },
  { id: "q11", domain: "privacy", text: "A personal-data breach notification procedure is defined", hint: "Who notifies whom, and how fast.", critical: true, action: "Define breach escalation and notification steps (timelines confirmed by counsel)", owner: "IT / Systems lead" },
  { id: "q12", domain: "privacy", text: "Transfers of personal data outside Egypt (cloud, messaging apps) are reviewed", hint: "Cross-border transfer conditions apply.", action: "Review cloud and messaging tools for cross-border transfer conditions", owner: "Legal counsel (external)" },
  { id: "q13", domain: "security", text: "Access to systems is role-based and reviewed when people change jobs or leave", hint: "Least privilege; leaver accounts disabled.", critical: true, action: "Introduce role-based access and quarterly access reviews", owner: "IT / Systems lead" },
  { id: "q14", domain: "security", text: "Multi-factor authentication protects email, cloud and admin accounts", hint: "", critical: true, action: "Enable MFA on email, cloud and administrator accounts", owner: "IT / Systems lead" },
  { id: "q15", domain: "security", text: "Backups are automatic, off-site and restore-tested", hint: "", action: "Automate off-site backups and test a restore each quarter", owner: "IT / Systems lead" },
  { id: "q16", domain: "security", text: "Devices are patched and protected with endpoint security", hint: "", action: "Patch management and endpoint protection on all PCs", owner: "IT / Systems lead" },
  { id: "q17", domain: "security", text: "Machine / OT networks are separated from office IT and the internet", hint: "Protects PLCs, CNCs and sensors.", action: "Segment OT network from office IT with controlled remote access", owner: "Maintenance Manager" },
  { id: "q18", domain: "security", text: "An incident response plan exists and has been rehearsed", hint: "", action: "Write and rehearse an incident response plan", owner: "General Manager" },
  { id: "q19", domain: "ai", text: "An inventory of AI tools and models in use is maintained", hint: "Including generative AI chat tools used by staff.", critical: true, action: "Create and maintain an AI use register", owner: "IT / Systems lead" },
  { id: "q20", domain: "ai", text: "A human reviews AI outputs before decisions affecting people, safety or quality", hint: "Human-in-the-loop for maintenance, HR and quality decisions.", critical: true, action: "Define human sign-off points for AI-assisted decisions", owner: "Operations Manager" },
  { id: "q21", domain: "ai", text: "Staff know which data may not be pasted into public AI tools", hint: "Customer drawings, prices, personal data.", action: "Adopt and communicate the Acceptable AI Use policy", owner: "HR Manager" },
  { id: "q22", domain: "ai", text: "Training data sources and permissions are documented for AI models", hint: "", action: "Document data sources, permissions and retention for each model", owner: "Data owner(s)" },
  { id: "q23", domain: "ai", text: "AI used for HR decisions is checked for bias", hint: "Hiring, appraisal or shift allocation.", action: "Bias review before any AI use in HR decisions", owner: "HR Manager" },
  { id: "q24", domain: "ai", text: "AI models are monitored for accuracy and drift after go-live", hint: "", action: "Monthly model performance review with rollback criteria", owner: "Operations Manager" },
];

const POINTS: Record<Answer, number> = { yes: 1, partial: 0.5, no: 0 };
const LEVELS = ["Initial", "Developing", "Defined", "Managed", "Optimised"] as const;
const TARGET = 75;

// ---------------- Persisted state ----------------
interface PlanItem { owner: string; priority: Priority; due: string; status: "open" | "in-progress" | "done" }
interface Policy { id: string; title: string; version: string; status: "draft" | "in-review" | "approved"; body: string; domain: DomainId }
interface GovData { answers: Record<string, Answer | null>; plan: Record<string, PlanItem>; policies: Policy[]; activePolicy: string }

function policies(factory: Factory, erp: boolean): Policy[] {
  const n = factory.name;
  const sys = erp ? "ERP, MES, WMS and connected machine data" : "order ledgers, Excel workbooks and mobile messaging";
  return [
    {
      id: "pol-gov", domain: "quality", title: "Data Governance Policy", version: "0.1", status: "draft",
      body: `# Purpose\n${n} treats business data as a shared asset. This policy sets who owns data, how it is maintained and how quality is measured.\n# Scope\nAll data held in ${sys}, including data processed by service providers.\n# Roles\n- Data owner: accountable for a data domain (customers, products, suppliers, people)\n- Data steward: maintains records day to day\n- Management: reviews the data-quality scorecard monthly\n# Principles\n- One system of record per data set\n- Data is entered once, at source\n- KPI definitions are documented in the KPI dictionary\n# Review\nReviewed annually by management.`,
    },
    {
      id: "pol-class", domain: "security", title: "Data Classification Standard", version: "0.1", status: "draft",
      body: `# Classes\n- Public: brochures, published catalogue\n- Internal: procedures, production plans\n- Confidential: prices, customer drawings, costings, contracts\n- Restricted: personal data, payroll, security credentials\n# Handling rules\n- Confidential and Restricted data is shared only with authorised roles\n- Restricted data is never sent through personal messaging accounts\n- Labels are applied to documents and exports\n# Ownership\nData owners assign the classification of their data sets.`,
    },
    {
      id: "pol-ai", domain: "ai", title: "Acceptable AI Use Policy", version: "0.1", status: "draft",
      body: `# Purpose\nEnable staff at ${n} to use AI tools productively while protecting customers, employees and know-how.\n# Allowed\n- Drafting, summarising and translating non-confidential text\n- Approved AI tools listed in the AI use register\n# Not allowed\n- Pasting customer drawings, prices or personal data into public AI tools\n- Using AI output for safety, quality or HR decisions without human review\n# Accountability\nA named person is accountable for each AI system and reviews its performance monthly.`,
    },
    {
      id: "pol-ret", domain: "privacy", title: "Data Retention Schedule", version: "0.1", status: "draft",
      body: `# Principle\nData is kept only as long as needed for its purpose or as required by law (periods to be confirmed by legal counsel).\n# Indicative schedule\n- Customer orders and invoices: per tax and commercial-law requirements\n- Employee records: duration of employment plus the period confirmed by counsel\n- CCTV footage: short rolling period\n- Machine / sensor data: aggregated after 24 months\n# Disposal\nSecure deletion or shredding, recorded in a disposal log.`,
    },
  ];
}

function seed(factory: Factory): GovData {
  const flavour = flavourFor(factory);
  // y = yes, p = partial, n = no — 24 answers in question order
  const pattern = factory.id === "delta" ? "ypppyp" + "pnpnnp" + "ypyppn" + "nppnnp" : flavour === "erp" ? "pppnpp" + "pnnnnn" + "ppypnn" + "nnpnnn" : "npnnnn" + "nnnnnn" + "nnpnnn" + "nnnnnn";
  const map: Record<string, Answer> = { y: "yes", p: "partial", n: "no" };
  const answers = Object.fromEntries(Q.map((q, i) => [q.id, map[pattern[i]] ?? null]));
  return { answers, plan: {}, policies: policies(factory, flavour === "erp"), activePolicy: "pol-gov" };
}

const dueFrom = (p: Priority) => (p === "High" ? "2026-12-31" : p === "Medium" ? "2027-02-28" : "2027-04-30");
const defaultPriority = (q: Question, a: Answer): Priority => (a === "no" ? (q.critical ? "High" : "Medium") : q.critical ? "Medium" : "Low");

// ---------------- Small pieces ----------------
function Ring({ value, color, size = 40 }: { value: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F5" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset .5s ease" }} />
    </svg>
  );
}

/** Translate one policy line: exact match, then "(owner: …, due …)" tailored bullets, then lines that embed the factory name. */
function docLine(t: TFunction, line: string, factoryName: string) {
  const exact = t(line);
  if (exact !== line) return exact;
  const m = /^(.*) \(owner: (.*), due (.*)\)$/.exec(line);
  if (m) return t("{action} (owner: {owner}, due {due})", { action: t(m[1]), owner: t(m[2]), due: m[3] });
  if (factoryName && line.includes(factoryName)) return t(line.split(factoryName).join("{factory}"), { factory: factoryName });
  return line;
}

function renderDoc(body: string, t: TFunction, factoryName: string) {
  return body.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h4 key={i} className="mt-4 text-sm font-semibold text-navy-900 first:mt-0">{docLine(t, line.slice(2), factoryName)}</h4>;
    if (line.startsWith("- ")) return <p key={i} className="relative ps-5 text-[13px] leading-relaxed text-navy-800 before:absolute before:start-1.5 before:top-[0.6em] before:size-1.5 before:rounded-full before:bg-teal-500">{docLine(t, line.slice(2), factoryName)}</p>;
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="text-[13px] leading-relaxed text-navy-800">{docLine(t, line, factoryName)}</p>;
  });
}

// ---------------- Workspace ----------------
export default function DataGovernance({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<GovData>(service.id, seed);
  const reduce = useReducedMotion();
  const ai = useSimulatedAI();
  const [domain, setDomain] = useState<DomainId>("quality");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [ack, setAck] = useState(false);
  const [gapFilter, setGapFilter] = useState<"all" | Priority>("all");
  const t = useT();

  const scores = useMemo(() => {
    const out = {} as Record<DomainId, { score: number; answered: number; total: number }>;
    for (const d of DOMAINS) {
      const qs = Q.filter((q) => q.domain === d.id);
      const answered = qs.filter((q) => data.answers[q.id]);
      const pts = qs.reduce((a, q) => a + (data.answers[q.id] ? POINTS[data.answers[q.id] as Answer] : 0), 0);
      out[d.id] = { score: Math.round((pts / qs.length) * 100), answered: answered.length, total: qs.length };
    }
    return out;
  }, [data.answers]);
  const overall = Math.round(DOMAINS.reduce((a, d) => a + scores[d.id].score, 0) / DOMAINS.length);
  const level = Math.min(4, Math.floor(overall / 20));
  const answeredAll = Q.filter((q) => data.answers[q.id]).length;

  const gaps = Q.flatMap((q) => {
    const a = data.answers[q.id];
    if (a !== "no" && a !== "partial") return [];
    const saved = data.plan[q.id] as PlanItem | undefined;
    const prio = defaultPriority(q, a);
    const item: PlanItem = saved ?? { owner: q.owner, priority: prio, due: dueFrom(prio), status: "open" };
    return [{ q, a, item }];
  }).sort((x, y) => ["High", "Medium", "Low"].indexOf(x.item.priority) - ["High", "Medium", "Low"].indexOf(y.item.priority));
  const visibleGaps = gaps.filter((g) => gapFilter === "all" || g.item.priority === gapFilter);

  const setAnswer = (id: string, a: Answer) => setData((p) => ({ ...p, answers: { ...p.answers, [id]: p.answers[id] === a ? null : a } }));
  const patchPlan = (id: string, base: PlanItem, patch: Partial<PlanItem>) => setData((p) => ({ ...p, plan: { ...p.plan, [id]: { ...base, ...p.plan[id], ...patch } } }));

  const policy = data.policies.find((p) => p.id === data.activePolicy) ?? data.policies[0];
  const patchPolicy = (patch: Partial<Policy>) => setData((p) => ({ ...p, policies: p.policies.map((x) => (x.id === policy.id ? { ...x, ...patch } : x)) }));
  const bumpVersion = (v: string) => { const [a, b] = v.split(".").map(Number); return `${a || 0}.${(b || 0) + 1}`; };
  const tailor = () =>
    ai.run("tailor", () => {
      const dGaps = gaps.filter((g) => g.q.domain === policy.domain).slice(0, 4);
      const section = `\n# ${factory.name}: priority controls\n${dGaps.length ? dGaps.map((g) => `- ${g.q.action} (owner: ${g.item.owner}, due ${g.item.due})`).join("\n") : "- No open gaps in this domain — maintain current controls and review annually"}`;
      const body = policy.body.replace(/\n# .+: priority controls\n(?:- .*\n?)*/g, "").trimEnd() + "\n" + section;
      patchPolicy({ body, version: bumpVersion(policy.version), status: "draft" });
      toast.success(t("Policy tailored"), { description: t("Added factory-specific controls from your assessment gaps (simulated).") });
    }, 1000);

  const dq = Q.filter((q) => q.domain === domain);
  const D = DOMAINS.find((d) => d.id === domain)!;

  return (
    <WorkspaceFrame service={service} onReset={() => { reset(); setAck(false); }} notice={t("References to Egypt's Personal Data Protection Law No. 151/2020 are high-level themes for illustration only and are not legal advice.")}>
      {/* Prominent distinction */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Scale className="size-5" /></span>
        <div className="min-w-0">
          <div className="text-base font-semibold text-amber-900">{t("Policy preparation ≠ verified compliance — legal review required")}</div>
          <p className="text-xs leading-relaxed text-amber-800">{t("This workspace helps prepare a self-assessment, remediation plan and draft policies. It does not certify compliance with Law No. 151/2020 or any regulation. Obligations, deadlines and licensing must be confirmed by qualified legal counsel.")}</p>
        </div>
      </div>

      {/* Assessment */}
      <div className="mb-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <nav aria-label={t("Governance domains")} className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {DOMAINS.map((d) => {
            const s = scores[d.id];
            const Icon = d.icon;
            return (
              <button key={d.id} type="button" aria-current={domain === d.id ? "true" : undefined} onClick={() => setDomain(d.id)}
                className={cn("flex min-w-[190px] items-center gap-3 rounded-2xl border p-3 text-start transition lg:min-w-0", domain === d.id ? "border-navy-900 bg-white shadow-lift" : "border-line bg-white/60 hover:bg-white")}>
                <div className="relative grid place-items-center">
                  <Ring value={s.score} color={d.color} />
                  <Icon className="absolute size-4" style={{ color: d.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-navy-900">{t(d.name)}</div>
                  <div className="text-[11px] tabular-nums text-muted">{t("{score}% · {answered}/{total} answered", { score: s.score, answered: s.answered, total: s.total })}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <Panel title={t(D.name)} description={t(D.blurb)} bodyClassName="p-0">
          <ol className="divide-y divide-line">
            {dq.map((q, i) => {
              const a = data.answers[q.id] ?? null;
              return (
                <li key={q.id} className="flex flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy-900/[0.06] text-[11px] font-semibold tabular-nums text-navy-700">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-navy-900">{t(q.text)}{q.critical ? <StatusPill tone="bad" className="ms-2 align-middle">{t("critical")}</StatusPill> : null}</div>
                      {q.hint ? <div className="mt-0.5 text-xs text-muted">{t(q.hint)}</div> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 self-end rounded-xl bg-navy-900/[0.05] p-1 md:self-auto" role="radiogroup" aria-label={t(q.text)}>
                    {(["yes", "partial", "no"] as Answer[]).map((opt) => (
                      <button key={opt} type="button" role="radio" aria-checked={a === opt} onClick={() => setAnswer(q.id, opt)}
                        className={cn("rounded-lg px-3 py-1 text-xs font-semibold capitalize text-navy-600 transition",
                          a === opt && opt === "yes" && "bg-emerald-600 text-white", a === opt && opt === "partial" && "bg-amber-500 text-white", a === opt && opt === "no" && "bg-red-600 text-white")}>
                        {t(opt)}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>

        <div className="space-y-5 lg:col-span-2 xl:col-span-1">
          <Panel title={t("Governance maturity")} description={t("{answered}/{total} questions answered", { answered: answeredAll, total: Q.length })}>
            <div className="flex items-center gap-4">
              <div className="relative grid place-items-center">
                <Ring value={overall} color="#0FA396" size={84} />
                <div className="absolute text-center"><div className="text-xl font-semibold tabular-nums text-navy-900">{overall}</div><div className="-mt-1 text-[10px] text-muted">/ 100</div></div>
              </div>
              <div>
                <div className="text-xs text-muted">{t("Level {level} of 5", { level: level + 1 })}</div>
                <div className="text-lg font-semibold text-navy-900">{t(LEVELS[level])}</div>
                <div className="mt-1 flex gap-1" aria-hidden>
                  {LEVELS.map((l, i) => <motion.span key={l} className="h-1.5 w-6 rounded-full" initial={false} animate={{ backgroundColor: i <= level ? "#0FA396" : "#E5E8EE" }} transition={{ duration: reduce ? 0 : 0.3 }} />)}
                </div>
              </div>
            </div>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={DOMAINS.map((d) => ({ domain: t(d.name), score: scores[d.id].score, target: TARGET }))} outerRadius="72%">
                  <PolarGrid stroke="#E5E8EE" />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: "#334155" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={t("Target")} dataKey="target" stroke="#C9A24B" fill="#C9A24B" fillOpacity={0.06} strokeDasharray="4 3" isAnimationActive={false} />
                  <Radar name={t("Current")} dataKey="score" stroke="#0FA396" fill="#0FA396" fillOpacity={0.3} isAnimationActive={!reduce} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E5E8EE", fontSize: 12 }} formatter={(v) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>

      {/* Remediation plan */}
      <Panel title={t("Compliance gaps & remediation plan")} description={t("Generated from “no” and “partial” answers. Edit owner, priority, due date and status.")} className="mb-5" bodyClassName="p-0"
        actions={<StatusPill tone={gaps.length ? "warn" : "good"}>{t("{count} open gaps", { count: gaps.length })}</StatusPill>}>
        <div className="flex flex-wrap gap-1 border-b border-line px-5 py-2.5">
          {(["all", "High", "Medium", "Low"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={gapFilter === f} onClick={() => setGapFilter(f)}
              className={cn("rounded-full px-2.5 py-1 text-xs font-medium text-muted transition hover:text-navy-900", gapFilter === f && "bg-navy-900 text-white hover:text-white")}>
              {f === "all" ? t("All") : t(f)} <span className="tabular-nums opacity-70">{f === "all" ? gaps.length : gaps.filter((g) => g.item.priority === f).length}</span>
            </button>
          ))}
        </div>
        {visibleGaps.length === 0 ? <p className="px-5 py-8 text-center text-sm text-muted">{t("No gaps in this view.")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-xs">
              <thead className="bg-canvas text-[10.5px] uppercase tracking-wider text-muted">
                <tr><th className="px-5 py-2 text-start font-semibold">{t("Remediation action")}</th><th className="px-3 py-2 text-start font-semibold">{t("Domain")}</th><th className="px-3 py-2 text-start font-semibold">{t("Owner")}</th><th className="px-3 py-2 text-start font-semibold">{t("Priority")}</th><th className="px-3 py-2 text-start font-semibold">{t("Due")}</th><th className="px-5 py-2 text-start font-semibold">{t("Status")}</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleGaps.map(({ q, a, item }) => {
                  const d = DOMAINS.find((x) => x.id === q.domain)!;
                  return (
                    <tr key={q.id} className={cn(item.status === "done" && "opacity-60")}>
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-navy-900">{t(q.action)}</div>
                        <div className="text-[11px] text-muted">{t("Answer: {answer}", { answer: t(a) })}{q.critical ? t(" · critical control") : ""}</div>
                      </td>
                      <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span className="size-2 rounded-full" style={{ backgroundColor: d.color }} />{t(d.name)}</span></td>
                      <td className="px-3 py-2.5"><Input aria-label={t("Owner for {action}", { action: t(q.action) })} value={item.owner} onChange={(e) => patchPlan(q.id, item, { owner: e.target.value })} className="h-8 min-w-[150px] text-xs" /></td>
                      <td className="px-3 py-2.5">
                        <select aria-label={t("Priority for {action}", { action: t(q.action) })} value={item.priority} onChange={(e) => { const p = e.target.value as Priority; patchPlan(q.id, item, { priority: p, due: data.plan[q.id]?.due ?? dueFrom(p) }); }}
                          className={cn("h-8 rounded-lg border px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-100", item.priority === "High" ? "border-red-200 bg-red-50 text-red-700" : item.priority === "Medium" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-line bg-white text-navy-700")}>
                          <option value="High">{t("High")}</option><option value="Medium">{t("Medium")}</option><option value="Low">{t("Low")}</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5"><Input type="date" aria-label={t("Due date for {action}", { action: t(q.action) })} value={item.due} onChange={(e) => patchPlan(q.id, item, { due: e.target.value })} className="h-8 w-[140px] text-xs" /></td>
                      <td className="px-5 py-2.5">
                        <select aria-label={t("Status for {action}", { action: t(q.action) })} value={item.status} onChange={(e) => patchPlan(q.id, item, { status: e.target.value as PlanItem["status"] })} className="h-8 rounded-lg border border-line bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-100">
                          <option value="open">{t("Open")}</option><option value="in-progress">{t("In progress")}</option><option value="done">{t("Done (pending re-assessment)")}</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Policy editor */}
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">{t("Policy templates")}</div>
          {data.policies.map((p) => (
            <button key={p.id} type="button" aria-current={p.id === policy.id ? "true" : undefined} onClick={() => { setData((d) => ({ ...d, activePolicy: p.id })); setAck(false); }}
              className={cn("flex w-full items-start gap-3 rounded-2xl border p-3 text-start transition", p.id === policy.id ? "border-navy-900 bg-white shadow-lift" : "border-line bg-white/60 hover:bg-white")}>
              <FileText className="mt-0.5 size-4 shrink-0 text-navy-500" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-navy-900">{t(p.title)}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                  v{p.version}
                  <StatusPill tone={p.status === "approved" ? "good" : p.status === "in-review" ? "info" : "neutral"}>{p.status === "in-review" ? t("in review") : t(p.status)}</StatusPill>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas/70 px-4 py-2.5">
            <div className="inline-flex rounded-lg bg-navy-900/[0.05] p-0.5" role="group" aria-label={t("Editor mode")}>
              {(["preview", "edit"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium capitalize text-navy-600", mode === m && "bg-white text-navy-900 shadow-sm")}>
                  {m === "edit" ? <PenLine className="size-3.5" /> : <Eye className="size-3.5" />}{t(m)}
                </button>
              ))}
            </div>
            <Button size="sm" variant="subtle" onClick={tailor} disabled={ai.running === "tailor"}><Sparkles /> {ai.running === "tailor" ? t("Tailoring…") : t("Tailor to gaps")}</Button>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              {policy.status === "draft" ? <Button size="sm" variant="outline" onClick={() => { patchPolicy({ status: "in-review" }); toast(t("Sent for internal review (simulated)")); }}><Send className="rtl:-scale-x-100" /> {t("Submit for review")}</Button> : null}
              {policy.status === "in-review" ? (
                <>
                  <label className="inline-flex max-w-[260px] items-start gap-1.5 text-[11px] leading-tight text-navy-700">
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-3.5 accent-teal-600" />
                    {t("I understand this is internal approval only; legal review is still required.")}
                  </label>
                  <Button size="sm" variant="accent" disabled={!ack} onClick={() => { patchPolicy({ status: "approved" }); setAck(false); toast.success(t("Policy approved internally"), { description: t("Not legally reviewed — obtain counsel sign-off before adoption.") }); }}><CheckCircle2 /> {t("Approve")}</Button>
                </>
              ) : null}
              {policy.status !== "draft" ? <Button size="sm" variant="ghost" onClick={() => patchPolicy({ status: "draft", version: bumpVersion(policy.version) })}><Undo2 /> {t("Reopen draft")}</Button> : null}
            </div>
          </div>
          <div className="mx-auto max-w-3xl px-5 py-6 md:px-10">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <ShieldCheck className="size-3.5 text-teal-600" /> {factory.name} · v{policy.version}
              {policy.status === "approved" ? <StatusPill tone="good">{t("Internally approved · not legally reviewed")}</StatusPill> : policy.status === "in-review" ? <StatusPill tone="info">{t("In internal review")}</StatusPill> : <StatusPill>{t("Draft")}</StatusPill>}
            </div>
            {mode === "edit" ? (
              <div className="mt-3 space-y-3">
                <Input aria-label={t("Policy title")} value={policy.title} onChange={(e) => patchPolicy({ title: e.target.value })} className="text-base font-semibold" disabled={policy.status === "approved"} />
                <Textarea aria-label={t("Policy body")} value={policy.body} onChange={(e) => patchPolicy({ body: e.target.value })} rows={18} className="font-mono text-xs leading-relaxed" disabled={policy.status === "approved"} />
                <p className="text-[11px] text-muted">{t("Lines starting with “# ” become headings and “- ” become bullets.")}{policy.status === "approved" ? ` ${t("Reopen the draft to edit an approved policy.")}` : ""}</p>
              </div>
            ) : (
              <article className="mt-3">
                <h3 className="mb-3 text-xl font-semibold tracking-tight text-navy-900">{t(policy.title)}</h3>
                <div className="space-y-1">{renderDoc(policy.body, t, factory.name)}</div>
                <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-800">{t("Template prepared with simulated AI. Policy preparation does not demonstrate compliance; legal review required before adoption.")}</div>
              </article>
            )}
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
