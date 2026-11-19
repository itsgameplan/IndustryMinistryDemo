"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { toast } from "sonner";
import {
  FileText, ShieldCheck, ListChecks, ScrollText, Search, Sparkles, Pencil, Eye, Send, CheckCircle2, MessageSquareWarning, Loader2, User, History, RotateCcw, FolderCheck, Circle, ClipboardCheck,
} from "lucide-react";
import { Badge, Button, Card, DemoDisclaimer, Dialog, DialogContent, Input, Label, Progress, Skeleton, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/shell/shared";
import { useActiveFactory, useJahez } from "@/lib/store";
import { AI_IMPROVEMENTS, COMPLIANCE_SEED, DEFAULT_IMPROVEMENT } from "@/lib/data/compliance-seed";
import { REQUIREMENTS } from "@/lib/data/tiers";
import { cn } from "@/lib/utils";
import { useLocale, useT, type TFunction } from "@/lib/i18n";
import type { ComplianceDoc, DocStatus, FactoryId } from "@/lib/types";
import { DocBody, checklistLines } from "./doc-body";

const TYPE_META: Record<ComplianceDoc["type"], { label: string; plural: string; icon: typeof FileText }> = {
  policy: { label: "Policy", plural: "Policies", icon: ScrollText },
  sop: { label: "SOP", plural: "SOPs", icon: FileText },
  checklist: { label: "Checklist", plural: "Checklists", icon: ListChecks },
};
const STATUS_META: Record<DocStatus, { label: string; tone: "amber" | "teal" | "green"; dot: string }> = {
  draft: { label: "Draft", tone: "amber", dot: "bg-amber-400" },
  "in-review": { label: "In review", tone: "teal", dot: "bg-teal-500" },
  approved: { label: "Approved", tone: "green", dot: "bg-emerald-500" },
};
const STEPS: DocStatus[] = ["draft", "in-review", "approved"];

const parseVersion = (v: string) => {
  const m = /^v(\d+)\.(\d+)$/.exec(v);
  return m ? { major: Number(m[1]), minor: Number(m[2]) } : { major: 0, minor: 1 };
};
const approveVersion = (v: string) => `v${parseVersion(v).major + 1}.0`;
const reviseVersion = (v: string) => {
  const { major, minor } = parseVersion(v);
  return `v${major}.${minor + 1}`;
};
const ago = (ts: number, t: TFunction) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return t("just now");
  if (s < 3600) return t("{n}m ago", { n: Math.floor(s / 60) });
  if (s < 86400) return t("{n}h ago", { n: Math.floor(s / 3600) });
  return t("{n}d ago", { n: Math.floor(s / 86400) });
};

export function ComplianceWorkspace() {
  const { id: factoryId, state } = useActiveFactory();
  const setDocs = useJahez((s) => s.setComplianceDocs);
  const docs = state.complianceDocs;

  useEffect(() => {
    if (!docs) setDocs(factoryId, COMPLIANCE_SEED);
  }, [docs, factoryId, setDocs]);

  if (!docs) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]"><Skeleton className="h-[560px]" /><Skeleton className="h-[560px]" /></div>
      </div>
    );
  }
  return <Workspace factoryId={factoryId} docs={docs} />;
}

function Workspace({ factoryId, docs }: { factoryId: FactoryId; docs: ComplianceDoc[] }) {
  const updateDoc = useJahez((s) => s.updateComplianceDoc);
  const setDocs = useJahez((s) => s.setComplianceDocs);
  const sopRequested = typeof window !== "undefined" && window.location.hash === "#sops";
  const [typeFilter, setTypeFilter] = useState<ComplianceDoc["type"] | "all">(sopRequested ? "sop" : "all");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState((sopRequested ? docs.find((d) => d.type === "sop") : undefined)?.id ?? docs[0]?.id ?? "");
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [draft, setDraft] = useState("");
  const [improving, setImproving] = useState(false);
  const [checks, setChecks] = useState<Record<string, number[]>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesNote, setChangesNote] = useState("");
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const readerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const doc = docs.find((d) => d.id === selectedId) ?? docs[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => (typeFilter === "all" || d.type === typeFilter) && (statusFilter === "all" || d.status === statusFilter) && (!q || `${d.title} ${d.titleAr} ${d.category} ${d.owner} ${t(d.category)} ${t(d.owner)}`.toLowerCase().includes(q)));
  }, [docs, typeFilter, statusFilter, query, t]);

  const counts = useMemo(() => ({
    approved: docs.filter((d) => d.status === "approved").length,
    review: docs.filter((d) => d.status === "in-review").length,
    draft: docs.filter((d) => d.status === "draft").length,
  }), [docs]);
  const readiness = Math.round(((counts.approved + counts.review * 0.5) / Math.max(1, docs.length)) * 100);
  const approvedPct = Math.round((counts.approved / Math.max(1, docs.length)) * 100);

  const select = (id: string) => {
    if (mode === "edit" && id !== doc?.id) setMode("read");
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) setTimeout(() => readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  if (!doc) return null;
  const meta = TYPE_META[doc.type];
  const docChecks = new Set(checks[doc.id] ?? []);
  const allCheckLines = doc.type === "checklist" ? checklistLines(doc.body) : [];
  const improved = /\(AI suggestion\)/i.test(doc.body);
  const docTitle = ar ? doc.titleAr : doc.title;
  const owner = t(doc.owner);

  const submit = () => {
    updateDoc(factoryId, doc.id, { status: "in-review" });
    toast.success(t("Submitted for review"), { description: t("{title} sent to the Managing Director for approval.", { title: docTitle }) });
  };
  const approve = () => {
    const version = approveVersion(doc.version);
    updateDoc(factoryId, doc.id, { status: "approved", version });
    setReviewNotes((n) => { const next = { ...n }; delete next[doc.id]; return next; });
    toast.success(t("Approved · {version}", { version }), { description: t("{title} is now the controlled version on file.", { title: docTitle }) });
  };
  const requestChanges = () => {
    updateDoc(factoryId, doc.id, { status: "draft" });
    const note = changesNote.trim() || t("Please revise before resubmitting.");
    setReviewNotes((n) => ({ ...n, [doc.id]: note }));
    setChangesOpen(false);
    setChangesNote("");
    toast(t("Changes requested"), { description: t("{title} returned to {owner}.", { title: docTitle, owner }) });
  };
  const startEdit = () => { setDraft(doc.body); setMode("edit"); };
  const saveEdit = () => {
    if (draft.trim() === doc.body.trim()) { setMode("read"); return; }
    const patch: Partial<ComplianceDoc> = { body: draft.trim() };
    if (doc.status === "approved") Object.assign(patch, { status: "draft" as DocStatus, version: reviseVersion(doc.version) });
    updateDoc(factoryId, doc.id, patch);
    setMode("read");
    toast.success(t("Changes saved"), { description: doc.status === "approved" ? t("New revision {version} created as a draft.", { version: reviseVersion(doc.version) }) : t("Draft updated.") });
  };
  const improve = () => {
    if (improved) {
      toast(t("Already improved"), { description: t("This document already includes the AI's suggested section.") });
      return;
    }
    setImproving(true);
    const target = doc;
    timer.current = setTimeout(() => {
      const addition = AI_IMPROVEMENTS[target.id] ?? DEFAULT_IMPROVEMENT;
      const patch: Partial<ComplianceDoc> = { body: `${target.body.trim()}\n\n${addition}` };
      if (target.status === "approved") Object.assign(patch, { status: "draft" as DocStatus, version: reviseVersion(target.version) });
      updateDoc(factoryId, target.id, patch);
      setImproving(false);
      setMode("read");
      toast.success(t("AI added a suggested section"), { description: t("Review the highlighted section before submitting.") });
    }, 1300);
  };
  const toggleCheck = (line: number) => {
    const cur = new Set(docChecks);
    if (cur.has(line)) cur.delete(line);
    else cur.add(line);
    setChecks((c) => ({ ...c, [doc.id]: [...cur] }));
    if (!docChecks.has(line) && cur.size === allCheckLines.length && allCheckLines.length > 0) toast.success(t("Checklist complete"), { description: t("{title} logged for today (demo).", { title: docTitle }) });
  };

  return (
    <MotionConfig reducedMotion="user">
      <PageHeader
        eyebrow={t("AI Compliance & SOP Agent · Al Noor Textiles")}
        title={t("Policies, SOPs & checklists")}
        description={t("Your AI agent drafted the governance pack Tier 1 asks for. Review, refine and approve each document — approvals become your evidence register.")}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setDocs(factoryId, COMPLIANCE_SEED.map((d) => ({ ...d, updatedAt: Date.now() }))); setChecks({}); setReviewNotes({}); setMode("read"); toast(t("AI drafts restored"), { description: t("All documents reset to their first draft.") }); }}>
              <RotateCcw /> {t("Restore AI drafts")}
            </Button>
            <Button variant="outline" onClick={() => toast.success(t("Evidence pack prepared"), { description: counts.approved === 1 ? t("1 approved document bundled with version history (demo export).") : t("{count} approved documents bundled with version history (demo export).", { count: counts.approved }) })}>
              <FolderCheck /> {t("Export evidence pack")}
            </Button>
          </>
        }
      />

      {/* Metrics strip */}
      <Card className="mb-6 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex items-center gap-4 border-b border-line p-5 sm:col-span-2 lg:col-span-1 lg:border-b-0 lg:border-e">
          <Ring value={readiness} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-600">{t("Tier 1 governance readiness")}</div>
            <div className="mt-1 text-sm text-navy-700">{readiness === 100 ? t("All evidence approved — ready for verification review.") : docs.length - counts.approved === 1 ? t("1 document still needs approval.") : t("{count} documents still need approval.", { count: docs.length - counts.approved })}</div>
          </div>
        </div>
        <Metric label={t("Documents")} value={docs.length} hint={t("{policies} policies · {sops} SOPs · {checklists} checklists", { policies: docs.filter((d) => d.type === "policy").length, sops: docs.filter((d) => d.type === "sop").length, checklists: docs.filter((d) => d.type === "checklist").length })} />
        <Metric label={t("Approved")} value={`${approvedPct}%`} hint={<Progress value={approvedPct} className="mt-1.5 h-1.5" barClassName="bg-emerald-500" />} className="border-t sm:border-s sm:border-t-0" />
        <Metric label={t("Awaiting action")} value={counts.review + counts.draft} hint={t("{review} in review · {draft} draft", { review: counts.review, draft: counts.draft })} className="border-t sm:col-span-2 sm:border-t lg:col-span-1 lg:border-s lg:border-t-0" />
      </Card>

      <DemoDisclaimer className="mb-6">{t("These documents are AI-generated drafts. They require review by management and qualified legal / HSE advisers before adoption. Legal and standards references are illustrative only.")}</DemoDisclaimer>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ---------- Document list ---------- */}
        <Card className="flex flex-col overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)] lg:self-start">
          <div className="space-y-3 border-b border-line p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search documents")} aria-label={t("Search documents")} className="ps-9" />
            </div>
            <FilterRow label={t("Type")} value={typeFilter} onChange={setTypeFilter} options={[["all", t("All")], ["policy", t("Policies")], ["sop", t("SOPs")], ["checklist", t("Checklists")]]} />
            <FilterRow label={t("Status")} value={statusFilter} onChange={setStatusFilter} options={[["all", t("All")], ["draft", t("Draft")], ["in-review", t("In review")], ["approved", t("Approved")]]} />
          </div>
          <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2" aria-label={t("Documents")}>
            {filtered.map((d) => {
              const Icon = TYPE_META[d.type].icon;
              const active = d.id === doc.id;
              return (
                <li key={d.id}>
                  <button onClick={() => select(d.id)} aria-current={active} className={cn("group relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", active ? "bg-navy-900 text-white" : "hover:bg-canvas")}>
                    <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", active ? "bg-white/10 text-teal-300" : "bg-navy-900/[0.05] text-navy-600")}><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[13.5px] font-semibold", active ? "text-white" : "text-navy-900", ar && "font-arabic")}>{ar ? d.titleAr : d.title}</span>
                      <span dir={ar ? "ltr" : "rtl"} className={cn("block truncate text-end text-[12px]", !ar && "font-arabic", active ? "text-white/55" : "text-muted")}>{ar ? d.title : d.titleAr}</span>
                      <span className={cn("mt-1.5 flex items-center gap-2 text-[11px]", active ? "text-white/60" : "text-muted")}>
                        <span className={cn("size-1.5 rounded-full", STATUS_META[d.status].dot)} />
                        {t(STATUS_META[d.status].label)}
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{d.version}</span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{t(d.owner)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="bg-grid m-2 rounded-xl border border-dashed border-line px-4 py-10 text-center">
                <Search className="mx-auto mb-2 size-5 text-muted" />
                <div className="text-sm font-medium text-navy-900">{t("No documents match")}</div>
                <button className="mt-1 text-xs font-medium text-teal-600 hover:underline" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setQuery(""); }}>{t("Clear filters")}</button>
              </li>
            )}
          </ul>
        </Card>

        {/* ---------- Reader / editor ---------- */}
        <div ref={readerRef} className="min-w-0 scroll-mt-24 space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-gradient-to-b from-canvas/80 to-white px-5 pb-5 pt-5 md:px-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="outline"><meta.icon /> {t(meta.label)}</Badge>
                <Badge tone={STATUS_META[doc.status].tone}>{t(STATUS_META[doc.status].label)}</Badge>
                <Badge tone="neutral" className="tabular-nums">{doc.version}</Badge>
                <span className="text-xs text-muted">{t(doc.category)}</span>
              </div>
              <div className="mt-3 flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-6">
                <h2 className={cn("text-xl font-semibold tracking-tight text-navy-900 md:text-[22px]", ar && "font-arabic")}>{ar ? doc.titleAr : doc.title}</h2>
                {ar ? <p dir="ltr" lang="en" className="text-[15px] text-navy-600">{doc.title}</p> : <p dir="rtl" lang="ar" className="font-arabic text-[15px] text-navy-600">{doc.titleAr}</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5"><User className="size-3.5" /> {t("Owner: {owner}", { owner })}</span>
                <span className="inline-flex items-center gap-1.5"><History className="size-3.5" /> {t("Updated {time}", { time: ago(doc.updatedAt, t) })}</span>
                <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5 text-teal-600" /> {t("Drafted by JAHEZ AI")}</span>
              </div>

              <Stepper status={doc.status} />

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {mode === "read" ? (
                  <Button variant="outline" size="sm" onClick={startEdit} disabled={improving}><Pencil /> {t("Edit")}</Button>
                ) : (
                  <>
                    <Button variant="primary" size="sm" onClick={saveEdit}><CheckCircle2 /> {t("Save changes")}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setMode("read")}><Eye /> {t("Cancel")}</Button>
                  </>
                )}
                <Button variant="subtle" size="sm" onClick={improve} disabled={improving || mode === "edit"}>
                  {improving ? <Loader2 className="animate-spin" /> : <Sparkles />} {improving ? t("Improving…") : improved ? t("AI improvements applied") : t("Ask AI to improve")}
                </Button>
                <div className="ms-auto flex flex-wrap gap-2">
                  {doc.status === "draft" && <Button variant="accent" size="sm" onClick={submit} disabled={mode === "edit"}><Send /> {t("Submit for review")}</Button>}
                  {doc.status === "in-review" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setChangesOpen(true)}><MessageSquareWarning /> {t("Request changes")}</Button>
                      <Button variant="accent" size="sm" onClick={approve}><CheckCircle2 /> {t("Approve")}</Button>
                    </>
                  )}
                  {doc.status === "approved" && <Badge tone="green" className="h-8 px-3 text-xs"><ShieldCheck /> {t("Controlled copy · {version}", { version: doc.version })}</Badge>}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {reviewNotes[doc.id] && doc.status === "draft" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 md:px-7">
                    <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
                    <div><span className="font-semibold">{t("Changes requested:")}</span> {reviewNotes[doc.id]}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {doc.type === "checklist" && mode === "read" && (
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 md:px-7">
                <ClipboardCheck className="size-4 text-teal-600" />
                <span className="text-sm font-medium text-navy-900">{t("Today's run")}</span>
                <Progress value={(docChecks.size / Math.max(1, allCheckLines.length)) * 100} className="h-1.5 max-w-48 flex-1" />
                <span className="text-xs tabular-nums text-muted">{t("{done}/{total} checked", { done: docChecks.size, total: allCheckLines.length })}</span>
                {docChecks.size > 0 && <button className="ms-auto text-xs font-medium text-teal-600 hover:underline" onClick={() => setChecks((c) => ({ ...c, [doc.id]: [] }))}>{t("Reset")}</button>}
              </div>
            )}

            <div className="relative px-5 py-6 md:px-7">
              {mode === "edit" ? (
                <div>
                  <Label htmlFor="doc-body">{t("Document body")}</Label>
                  <p className="mb-2 text-xs text-muted">{t("Use “# ” for headings, “- ” for bullets, “1. ” for steps and “- [ ] ” for checklist items.")}</p>
                  <Textarea id="doc-body" dir="ltr" value={draft} onChange={(e) => setDraft(e.target.value)} rows={22} className="font-mono text-[13px] leading-relaxed" />
                  {doc.status === "approved" && <p className="mt-2 text-xs text-gold-600">{t("Saving will create revision {version} as a draft that needs re-approval.", { version: reviseVersion(doc.version) })}</p>}
                </div>
              ) : (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  <DocBody body={doc.body} checked={docChecks} onToggle={toggleCheck} />
                </motion.div>
              )}
              <AnimatePresence>
                {improving && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-5 bottom-6 md:inset-x-7">
                    <div className="rounded-xl border border-teal-200 bg-white p-4 shadow-card">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-teal-700"><Sparkles className="size-4" /> {t("Drafting an improvement for {owner}…", { owner })}</div>
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="mt-2 h-3 w-5/6" />
                      <Skeleton className="mt-2 h-3 w-1/2" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          <EvidenceRegister docs={docs} onOpen={select} />
        </div>
      </div>

      <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
        <DialogContent title={t("Request changes")} description={t("{title} will return to {owner} as a draft.", { title: docTitle, owner })}>
          <Label htmlFor="changes-note">{t("What should be revised?")}</Label>
          <Textarea id="changes-note" rows={4} value={changesNote} onChange={(e) => setChangesNote(e.target.value)} placeholder={t("e.g. Add the night-shift supervisor as a responsible role.")} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setChangesOpen(false)}>{t("Cancel")}</Button>
            <Button variant="primary" onClick={requestChanges}><MessageSquareWarning /> {t("Return to author")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </MotionConfig>
  );
}

function Metric({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border-line p-5", className)}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-navy-900 tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const t = useT();
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-[72px] shrink-0" role="img" aria-label={t("Readiness {value}%", { value })}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-navy-900/[0.06]" />
        <motion.circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" strokeLinecap="round" stroke={value === 100 ? "#10B981" : "#0FA396"} strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[17px] font-semibold tabular-nums text-navy-900">{value}%</span>
    </div>
  );
}

function FilterRow<V extends string>({ label, value, onChange, options }: { label: string; value: V; onChange: (v: V) => void; options: [V, string][] }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", value === v ? "bg-navy-900 text-white" : "bg-navy-900/[0.04] text-navy-600 hover:bg-navy-900/[0.08]")}>{l}</button>
      ))}
    </div>
  );
}

function Stepper({ status }: { status: DocStatus }) {
  const t = useT();
  const idx = STEPS.indexOf(status);
  return (
    <ol className="mt-5 flex items-center gap-2" aria-label={t("Approval workflow")}>
      {STEPS.map((s, i) => {
        const done = i < idx || status === "approved";
        const current = i === idx && status !== "approved";
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors", done ? "bg-emerald-500 text-white" : current ? "bg-navy-900 text-white ring-4 ring-navy-900/10" : "border border-line bg-white text-muted")}>
              {done ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </span>
            <span className={cn("whitespace-nowrap text-xs font-medium", current ? "text-navy-900" : done ? "text-emerald-700" : "text-muted")} aria-current={current ? "step" : undefined}>{t(STATUS_META[s].label)}</span>
            {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < idx ? "bg-emerald-400" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

function EvidenceRegister({ docs, onOpen }: { docs: ComplianceDoc[]; onOpen: (id: string) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const reqs = REQUIREMENTS.filter((r) => r.id === "t1-governance" || r.id === "t1-sop");
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 md:px-7">
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-navy-900">{t("Evidence register · Tier 1")}</div>
          <div className="mt-0.5 text-sm text-muted">{t("Which approved document evidences which requirement.")}</div>
        </div>
        <Badge tone="gold">{t("Provisional · demo")}</Badge>
      </div>
      <div className="divide-y divide-line">
        {reqs.map((r) => {
          const linked = docs.filter((d) => d.requirementId === r.id);
          const approved = linked.filter((d) => d.status === "approved").length;
          const pct = Math.round((approved / Math.max(1, linked.length)) * 100);
          return (
            <section key={r.id} className="px-5 py-5 md:px-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-navy-900">{t(r.title)}</div>
                  <div className="text-xs text-muted">{t(r.description)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={pct} className="h-1.5 w-28" barClassName={pct === 100 ? "bg-emerald-500" : undefined} />
                  <span className="w-20 text-end text-xs font-medium tabular-nums text-navy-700">{t("{approved}/{total} approved", { approved, total: linked.length })}</span>
                </div>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {linked.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => onOpen(d.id)} className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2 text-start text-[13px] transition-colors hover:border-navy-500/30 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                      {d.status === "approved" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" /> : <Circle className={cn("size-4 shrink-0", d.status === "in-review" ? "text-teal-500" : "text-amber-400")} />}
                      <span className={cn("min-w-0 flex-1 truncate text-navy-800", locale === "ar" && "font-arabic")}>{locale === "ar" ? d.titleAr : d.title}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted">{d.version}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
