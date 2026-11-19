"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { CalendarDays, Check, CheckCircle2, Circle, ClipboardList, Gavel, Grid3x3, Loader2, MapPin, NotebookPen, Plus, PlayCircle, Target, Trash2, Users } from "lucide-react";
import { AIInsight, EditableText, Panel, StatusPill, WorkspaceFrame, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { useActiveFactory } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Factory, TierLevel } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
import { LinkIndicator, uidLocal, useSeedT, useStrategyLinks } from "./_shared";
import { peopleFor, seedBscDesign, type BscKpi } from "./_seeds";

type Raci = "R" | "A" | "C" | "I" | "";
const RACI_CYCLE: Raci[] = ["", "R", "A", "C", "I"];
const RACI_META: Record<Exclude<Raci, "">, { label: string; cls: string }> = {
  R: { label: "Responsible", cls: "bg-teal-500 text-white" },
  A: { label: "Accountable", cls: "bg-navy-900 text-white" },
  C: { label: "Consulted", cls: "bg-gold-100 text-gold-600" },
  I: { label: "Informed", cls: "bg-sky-100 text-sky-700" },
};

interface Session { id: string; start: string; end: string; title: string; output: string; kind: "session" | "break"; done: boolean }
interface Person { id: string; name: string; role: string; dept: string }
interface Decision { id: string; text: string; owner: string }
type ActionStatus = "open" | "in-progress" | "done";
interface ActionItem { id: string; text: string; owner: string; due: string; status: ActionStatus }
interface WorkshopData {
  version: 1;
  title: string;
  date: string;
  venue: string;
  sessions: Session[];
  objectives: string[];
  participants: Person[];
  notes: string;
  decisions: Decision[];
  actions: ActionItem[];
  raci: Record<string, Record<string, Raci>>;
  completed: boolean;
  summary: string | null;
}

const FACILITATOR: Person = { id: "fac", name: "Certified facilitator (to be assigned)", role: "BSC facilitator · external", dept: "Facilitation" };
const initials = (n: string) => n.replace(/^(Dr\.|Eng\.)\s*/, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

function seed(factory: Factory, tier: TierLevel): WorkshopData {
  const people = peopleFor(factory);
  const design = seedBscDesign(factory, tier);
  const md = people[0];
  const fin = people.find((p) => /financ|cfo/i.test(p.role)) ?? md;
  const raci: WorkshopData["raci"] = {};
  design.kpis.forEach((k) => {
    const a = people.find((p) => p.name === k.owner) ?? md;
    const row: Record<string, Raci> = { [a.id]: "A" };
    const r = people.find((p) => p.dept === k.department && p.id !== a.id);
    if (r) row[r.id] = "R";
    if (a.id !== md.id) row[md.id] = "I";
    if (fin.id !== a.id && fin.id !== md.id && /revenue|margin|cost|ebitda/i.test(k.name)) row[fin.id] = "C";
    raci[k.id] = row;
  });
  return {
    version: 1,
    title: `${factory.name} — Balanced Scorecard leadership alignment`,
    date: "2026-12-08",
    venue: `${factory.governorate ?? "On-site"} · management meeting room`,
    sessions: [
      { id: "s1", start: "09:00", end: "09:30", title: "Opening & strategy recap", output: "Shared understanding of vision and strategic objectives", kind: "session", done: false },
      { id: "s2", start: "09:30", end: "10:30", title: "Validate the strategy map", output: "Agreed objectives and cause-and-effect links", kind: "session", done: false },
      { id: "s3", start: "10:30", end: "10:45", title: "Coffee break", output: "", kind: "break", done: false },
      { id: "s4", start: "10:45", end: "11:45", title: "KPI selection & targets", output: "1–2 KPIs per objective with agreed targets", kind: "session", done: false },
      { id: "s5", start: "11:45", end: "12:30", title: "KPI ownership (RACI)", output: "One accountable owner per KPI", kind: "session", done: false },
      { id: "s6", start: "12:30", end: "13:10", title: "Initiative prioritisation", output: "Top initiatives for the next two quarters", kind: "session", done: false },
      { id: "s7", start: "13:10", end: "13:30", title: "Commitments & next steps", output: "Decisions log and action plan", kind: "session", done: false },
    ],
    objectives: [
      `Validate the ${design.objectives.length} scorecard objectives and their cause-and-effect logic`,
      "Agree KPIs and realistic targets for each objective",
      "Assign a single accountable owner for every KPI",
      "Prioritise initiatives and set a monthly review rhythm",
    ],
    participants: [...people, FACILITATOR],
    notes: `Pre-read circulated: draft corporate strategy and AI-suggested scorecard.\n\nQuestions to resolve:\n- Are the targets ambitious but achievable for ${factory.name}?\n- Who owns cross-department KPIs such as on-time delivery?\n- Which data sources will feed the monthly scorecard?`,
    decisions: [{ id: "d-0", text: "Workshop scope and participants confirmed", owner: md.name }],
    actions: [
      { id: "a-0", text: "Circulate draft strategy and scorecard pre-read", owner: md.name, due: "2026-12-01", status: "done" },
      { id: "a-1", text: "Collect 12-month KPI baselines", owner: fin.name, due: "2026-12-05", status: "in-progress" },
    ],
    raci,
    completed: false,
    summary: null,
  };
}

function followUp(data: WorkshopData, kpis: BscKpi[], objectiveCount: number, factory: Factory) {
  const people = data.participants.filter((p) => p.id !== FACILITATOR.id);
  const md = people[0]?.name ?? "Managing Director";
  const noA = kpis.filter((k) => !Object.values(data.raci[k.id] ?? {}).includes("A"));
  const owners = new Set(kpis.map((k) => k.owner)).size;
  const decisions: Decision[] = [
    { id: "d-w1", text: `Strategy map approved with ${objectiveCount} objectives across four perspectives`, owner: md },
    { id: "d-w2", text: `${kpis.length} KPIs adopted; targets accepted for 2027 subject to baseline check`, owner: md },
    { id: "d-w3", text: "Monthly scorecard review on the first Tuesday of each month (90 minutes)", owner: md },
    { id: "d-w4", text: `${kpis[0]?.name ?? "First KPI"} prioritised as the lead indicator for the first quarter`, owner: kpis[0]?.owner ?? md },
  ];
  const actions: ActionItem[] = [
    { id: "a-w1", text: "Publish the approved scorecard in the execution dashboard", owner: people[people.length - 1]?.name ?? md, due: "2026-12-15", status: "open" },
    { id: "a-w2", text: "Confirm data source and reporting template for every KPI", owner: people.find((p) => /financ|cfo/i.test(p.role))?.name ?? md, due: "2026-12-22", status: "open" },
    { id: "a-w3", text: "Cascade departmental KPIs to supervisors and team boards", owner: people[2]?.name ?? md, due: "2027-01-10", status: "open" },
    { id: "a-w4", text: "Prepare first monthly scorecard review", owner: md, due: "2027-01-05", status: "open" },
    ...(noA.length ? [{ id: "a-w5", text: `Assign accountable owners for ${noA.length} KPI${noA.length > 1 ? "s" : ""} without an “A”`, owner: md, due: "2026-12-12", status: "open" as ActionStatus }] : []),
  ];
  const summary = `Follow-up summary — ${factory.name}, ${data.date}. The leadership team validated the strategy map (${objectiveCount} objectives), adopted ${kpis.length} KPIs with ${owners} named owners and agreed a monthly review rhythm. ${noA.length ? `${noA.length} KPI${noA.length > 1 ? "s still need" : " still needs"} an accountable owner. ` : "Every KPI has an accountable owner. "}${actions.length} follow-up actions were assigned; the first scorecard review is planned for early January. (Simulated summary — a human facilitator would validate it.)`;
  return { decisions, actions, summary };
}

export default function BscWorkshopsWorkspace({ service }: WorkspaceProps) {
  const { tier: currentTier } = useActiveFactory();
  const { factory, data, setData, reset } = useServiceWorkspace<WorkshopData>(service.id, (f) => seed(f, currentTier));
  const links = useStrategyLinks();
  const reduce = useReducedMotion();
  const t = useT();
  const st = useSeedT();
  const { locale } = useLocale();
  const [running, setRunning] = useState<number | null>(null); // index of session being "delivered"
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((x) => window.clearTimeout(x));
  }, []);

  const kpis = useMemo(() => links.design.kpis.slice(0, 12), [links.design.kpis]);
  const people = data.participants;
  const internal = people.filter((p) => p.id !== FACILITATOR.id);
  const done = data.sessions.filter((s) => s.done).length;

  const simulate = () => {
    if (running !== null) return;
    const step = reduce ? 150 : 650;
    setData((d) => ({ ...d, sessions: d.sessions.map((s) => ({ ...s, done: false })) }));
    data.sessions.forEach((s, i) => {
      timers.current.push(window.setTimeout(() => {
        setRunning(i);
        setData((d) => ({ ...d, sessions: d.sessions.map((x, k) => (k < i ? { ...x, done: true } : x)) }));
      }, i * step));
    });
    timers.current.push(window.setTimeout(() => {
      setData((d) => {
        const fu = followUp(d, kpis, links.design.objectives.length, factory);
        const keepD = d.decisions.filter((x) => !x.id.startsWith("d-w"));
        const keepA = d.actions.filter((x) => !x.id.startsWith("a-w"));
        return { ...d, sessions: d.sessions.map((x) => ({ ...x, done: true })), completed: true, summary: fu.summary, decisions: [...keepD, ...fu.decisions], actions: [...keepA, ...fu.actions] };
      });
      setRunning(null);
      toast.success(t("Workshop completed (simulated)"), { description: t("Follow-up summary, decisions and action items generated.") });
    }, data.sessions.length * step + (reduce ? 200 : 700)));
  };

  const cycleRaci = (kpiId: string, personId: string) =>
    setData((d) => {
      const row = { ...(d.raci[kpiId] ?? {}) };
      const cur = row[personId] ?? "";
      row[personId] = RACI_CYCLE[(RACI_CYCLE.indexOf(cur) + 1) % RACI_CYCLE.length];
      return { ...d, raci: { ...d.raci, [kpiId]: row } };
    });

  return (
    <WorkspaceFrame service={service} onReset={reset}>
      <div role="note" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span><b>{t("Real workshops are delivered by human facilitators — this workspace simulates preparation and follow-up.")}</b> {t("Names and roles are fictional.")}</span>
      </div>

      {/* Workshop header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-5 text-white shadow-card md:p-7">
        <div className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full bg-teal-500/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">{t("Leadership workshop · half day")}</div>
            <EditableText ariaLabel={t("Workshop title")} value={st(data.title)} onChange={(v) => setData((d) => ({ ...d, title: v }))} className="-mx-2 mt-1 text-xl font-semibold tracking-tight text-white hover:bg-white/10 hover:ring-white/20 md:text-2xl" />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/75">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {new Date(`${data.date}T09:00:00`).toLocaleDateString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {st(data.venue)}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" /> {t("{count} participants", { count: people.length })}</span>
            </div>
            <div className="mt-4 flex -space-x-2">
              {people.map((p) => <span key={p.id} title={`${t(p.name)} — ${t(p.role)}`} className={cn("grid size-8 place-items-center rounded-full text-[11px] font-semibold ring-2 ring-navy-900", p.id === FACILITATOR.id ? "bg-gold-500 text-navy-950" : "bg-white text-navy-900")}>{p.id === FACILITATOR.id ? "F" : initials(p.name)}</span>)}
            </div>
          </div>
          <div className="w-full md:w-72">
            <div className="flex items-center justify-between text-xs text-white/75"><span>{t(data.completed ? "Completed" : running !== null ? "In session…" : "Preparation")}</span><span className="tabular-nums">{t("{done}/{total} sessions", { done, total: data.sessions.length })}</span></div>
            <Progress value={(done / data.sessions.length) * 100} className="mt-1.5 bg-white/10" barClassName="bg-teal-400" />
            <Button variant="gold" className="mt-3 w-full" onClick={simulate} disabled={running !== null}>{running !== null ? <><Loader2 className="animate-spin" /> {t("Running session {n}…", { n: running + 1 })}</> : <><PlayCircle /> {t(data.completed ? "Re-run simulation" : "Simulate workshop completion")}</>}</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Panel title={t("Agenda")} description={t("Times are editable")}>
            <ol className="relative">
              <span className="absolute bottom-3 start-[52px] top-3 w-px bg-line" aria-hidden />
              {data.sessions.map((s, i) => {
                const active = running === i;
                return (
                  <li key={s.id} className="relative grid grid-cols-[44px_16px_minmax(0,1fr)] gap-x-2 pb-4 last:pb-0">
                    <span className="pt-0.5 text-[11px] font-semibold tabular-nums text-navy-700">{s.start}</span>
                    <span className="relative z-10 mt-0.5 grid size-4 place-items-center rounded-full bg-white">
                      {s.done ? (
                        <motion.span initial={reduce ? false : { scale: 0.4 }} animate={{ scale: 1 }}><CheckCircle2 className="size-4 text-emerald-600" aria-label={t("Done")} /></motion.span>
                      ) : active ? (
                        <span className="relative flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-400 opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-3 rounded-full bg-teal-500" /></span>
                      ) : (
                        <Circle className={cn("size-3.5", s.kind === "break" ? "text-line" : "text-navy-500/40")} aria-label={t("Planned")} />
                      )}
                    </span>
                    <div className={cn("min-w-0 rounded-lg px-1 transition", active && "bg-teal-50")}>
                      <EditableText ariaLabel={t("Session {n} title", { n: i + 1 })} value={st(s.title)} onChange={(v) => setData((d) => ({ ...d, sessions: d.sessions.map((x) => (x.id === s.id ? { ...x, title: v } : x)) }))} className={cn("-mx-1 px-1 py-0 text-sm", s.kind === "break" ? "text-muted" : "font-medium text-navy-900")} />
                      <div className="text-[11px] text-muted">{s.start}–{s.end}{s.output ? ` · ${st(s.output)}` : ""}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel title={t("Workshop objectives")} actions={<Target className="size-4 text-muted" />}>
            <ul className="space-y-1">
              {data.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 grid size-4 shrink-0 place-items-center rounded bg-teal-50 text-[10px] font-bold text-teal-700">{i + 1}</span>
                  <EditableText ariaLabel={t("Workshop objective {n}", { n: i + 1 })} value={st(o)} onChange={(v) => setData((d) => ({ ...d, objectives: v.trim() ? d.objectives.map((x, k) => (k === i ? v : x)) : d.objectives.filter((_, k) => k !== i) }))} className="text-sm text-navy-800" />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <LinkIndicator linked={links.strategyLinked} href="/services/corporate-strategy" linkedLabel={t("Strategy pre-read ready")} unlinkedLabel={t("Strategy not yet developed")} />
              <LinkIndicator linked={links.designLinked} href="/services/bsc-design" linkedLabel={t("Scorecard draft ready")} unlinkedLabel={t("Scorecard not yet designed")} />
            </div>
          </Panel>

          <Panel title={t("Participants")} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {people.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold", p.id === FACILITATOR.id ? "bg-gold-100 text-gold-600" : "bg-navy-900/5 text-navy-800")}>{p.id === FACILITATOR.id ? "F" : initials(p.name)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-navy-900">{t(p.name)}</div>
                    <div className="truncate text-[11px] text-muted">{t(p.role)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <AnimatePresence>
            {data.summary ? (
              <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AIInsight title={t("Follow-up summary")}>
                  <p>{st(data.summary)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="accent" onClick={() => toast.success(t("Follow-up email drafted for participants (simulated — not sent)"))}><Check /> {t("Draft follow-up email")}</Button>
                    <Button size="sm" variant="outline" asChild><Link href="/services/bsc-execution">{t("Open execution dashboard")}</Link></Button>
                  </div>
                </AIInsight>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <Tabs defaultValue="notes">
            <div className="overflow-x-auto pb-1">
              <TabsList>
                <TabsTrigger value="notes"><NotebookPen /> {t("Notes")}</TabsTrigger>
                <TabsTrigger value="decisions"><Gavel /> {t("Decisions")} <span className="tabular-nums text-muted">{data.decisions.length}</span></TabsTrigger>
                <TabsTrigger value="actions"><ClipboardList /> {t("Actions")} <span className="tabular-nums text-muted">{data.actions.filter((a) => a.status !== "done").length}</span></TabsTrigger>
                <TabsTrigger value="raci"><Grid3x3 /> {t("KPI ownership")}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="notes" className="mt-4">
              <Panel title={t("Meeting notes")} description={t("Click to edit · saved automatically")}>
                <EditableText multiline ariaLabel={t("Meeting notes")} value={st(data.notes)} onChange={(v) => setData((d) => ({ ...d, notes: v }))} className="min-h-40 text-sm leading-relaxed text-navy-800" />
              </Panel>
            </TabsContent>

            <TabsContent value="decisions" className="mt-4">
              <Panel title={t("Decisions log")} bodyClassName="p-0">
                <ul className="divide-y divide-line">
                  {data.decisions.map((d, i) => (
                    <li key={d.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-md bg-navy-900 text-[10px] font-bold text-white">D{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <EditableText ariaLabel={t("Decision {n}", { n: i + 1 })} value={st(d.text)} onChange={(v) => setData((x) => ({ ...x, decisions: x.decisions.map((y) => (y.id === d.id ? { ...y, text: v } : y)) }))} className="text-sm text-navy-900" />
                        <select aria-label={t("Owner of decision {n}", { n: i + 1 })} value={d.owner} onChange={(e) => setData((x) => ({ ...x, decisions: x.decisions.map((y) => (y.id === d.id ? { ...y, owner: e.target.value } : y)) }))} className="ms-2 mt-0.5 rounded border-none bg-transparent text-[11px] text-muted hover:text-navy-900">
                          {Array.from(new Set([d.owner, ...internal.map((p) => p.name)])).map((n) => <option key={n} value={n}>{t(n)}</option>)}
                        </select>
                      </div>
                      <button type="button" aria-label={t("Delete decision {n}", { n: i + 1 })} onClick={() => setData((x) => ({ ...x, decisions: x.decisions.filter((y) => y.id !== d.id) }))} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button>
                    </li>
                  ))}
                </ul>
                <AddRow placeholder={t("Record a decision…")} onAdd={(text) => setData((x) => ({ ...x, decisions: [...x.decisions, { id: uidLocal("d"), text, owner: internal[0]?.name ?? "" }] }))} />
              </Panel>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <Panel title={t("Action items")} bodyClassName="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead><tr className="border-b border-line text-start text-[11px] uppercase tracking-wider text-muted"><th className="px-4 py-2 text-start font-semibold">{t("Action")}</th><th className="px-2 py-2 text-start font-semibold">{t("Owner")}</th><th className="px-2 py-2 text-start font-semibold">{t("Due")}</th><th className="px-2 py-2 text-start font-semibold">{t("Status")}</th><th className="w-8"><span className="sr-only">{t("Delete")}</span></th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {data.actions.map((a) => {
                        const upd = (patch: Partial<ActionItem>) => setData((x) => ({ ...x, actions: x.actions.map((y) => (y.id === a.id ? { ...y, ...patch } : y)) }));
                        return (
                          <tr key={a.id} className={cn(a.status === "done" && "opacity-60")}>
                            <td className="px-2 py-1.5"><EditableText ariaLabel={t("Action")} value={st(a.text)} onChange={(v) => upd({ text: v })} className={cn("text-sm text-navy-900", a.status === "done" && "line-through")} /></td>
                            <td className="px-2 py-1.5">
                              <select aria-label={t("Action owner")} value={a.owner} onChange={(e) => upd({ owner: e.target.value })} className="h-8 max-w-[160px] rounded-md border border-line bg-white px-1.5 text-xs">
                                {Array.from(new Set([a.owner, ...internal.map((p) => p.name)])).map((n) => <option key={n} value={n}>{t(n)}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-1.5"><input type="date" aria-label={t("Due date")} value={a.due} onChange={(e) => upd({ due: e.target.value })} className="h-8 rounded-md border border-line bg-white px-1.5 text-xs tabular-nums" /></td>
                            <td className="px-2 py-1.5">
                              <select aria-label={t("Action status")} value={a.status} onChange={(e) => upd({ status: e.target.value as ActionStatus })} className={cn("h-8 rounded-md border px-1.5 text-xs font-semibold", a.status === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : a.status === "in-progress" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-line bg-white text-navy-800")}>
                                <option value="open">{t("Open")}</option><option value="in-progress">{t("In progress")}</option><option value="done">{t("Done")}</option>
                              </select>
                            </td>
                            <td className="pe-2"><button type="button" aria-label={t("Delete action")} onClick={() => setData((x) => ({ ...x, actions: x.actions.filter((y) => y.id !== a.id) }))} className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <AddRow placeholder={t("Add an action item…")} onAdd={(text) => setData((x) => ({ ...x, actions: [...x.actions, { id: uidLocal("a"), text, owner: internal[0]?.name ?? "", due: "2027-01-15", status: "open" }] }))} />
              </Panel>
            </TabsContent>

            <TabsContent value="raci" className="mt-4">
              <Panel title={t("KPI ownership matrix (RACI)")} description={t("Click a cell to cycle R → A → C → I. Each KPI needs exactly one Accountable owner.")} bodyClassName="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ minWidth: 240 + internal.length * 48 }}>
                    <thead>
                      <tr className="border-b border-line">
                        <th className="sticky start-0 z-10 bg-white px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted">{t("KPI")}</th>
                        {internal.map((p) => <th key={p.id} className="px-1 py-2 text-center" title={`${t(p.name)} — ${t(p.role)}`}><span className="mx-auto grid size-8 place-items-center rounded-full bg-navy-900/5 text-[11px] font-semibold text-navy-800">{initials(p.name)}</span><span className="sr-only">{t(p.name)}</span></th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {kpis.map((k) => {
                        const row = data.raci[k.id] ?? {};
                        const aCount = Object.values(row).filter((v) => v === "A").length;
                        return (
                          <tr key={k.id}>
                            <th scope="row" className="sticky start-0 z-10 bg-white px-4 py-1.5 text-start font-normal">
                              <div className="flex items-center gap-2">
                                <span className="max-w-[180px] truncate text-xs font-medium text-navy-900 sm:max-w-[240px]">{st(k.name)}</span>
                                {aCount !== 1 ? <StatusPill tone="bad">{aCount === 0 ? t("No A") : `${aCount}×A`}</StatusPill> : null}
                              </div>
                            </th>
                            {internal.map((p) => {
                              const v = row[p.id] ?? "";
                              return (
                                <td key={p.id} className="px-1 py-1.5 text-center">
                                  <button type="button" onClick={() => cycleRaci(k.id, p.id)} aria-label={t("{kpi} — {person}: {role}. Click to change.", { kpi: st(k.name), person: t(p.name), role: t(v ? RACI_META[v].label : "none") })} className={cn("mx-auto grid size-8 place-items-center rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", v ? RACI_META[v].cls : "bg-canvas text-transparent hover:bg-navy-900/10 hover:text-muted")}>
                                    {v || "·"}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap gap-3 border-t border-line px-4 py-3 text-[11px] text-muted">
                  {(Object.keys(RACI_META) as Exclude<Raci, "">[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cn("grid size-5 place-items-center rounded text-[10px] font-bold", RACI_META[k].cls)}>{k}</span>{t(RACI_META[k].label)}</span>)}
                  <span className="ms-auto">{t("KPIs from")} <Link href="/services/bsc-design" className="font-medium text-teal-700 hover:underline">{t("Scorecard Design")}</Link>{links.designLinked ? "" : ` ${t("(AI-suggested)")}`}</span>
                </div>
              </Panel>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  const t = useT();
  const add = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <div className="flex gap-2 border-t border-line p-3">
      <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder={placeholder} aria-label={placeholder} className="h-9" />
      <Button size="sm" className="h-9" onClick={add} disabled={!text.trim()}><Plus /> {t("Add")}</Button>
    </div>
  );
}
