"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { AlarmClock, BellRing, CalendarClock, Check, CheckCircle2, CircleDashed, FileText, Filter, Globe2, ListChecks, Loader2, Plus, ShieldCheck, TimerOff, X } from "lucide-react";
import { AIInsight, KpiTile, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, DemoDisclaimer } from "@/components/ui";
import { useLocale, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Factory } from "@/lib/types";
import { DAY, DEMO_TODAY, addDays, daysUntil, iso, isFoodLike, parseIso, productsOf, uid, useDateFormat, useSimulatedAction } from "./shared";

// ---------------- Types ----------------
const MARKETS = ["Global", "EU", "GCC", "US", "Africa"] as const;
type Market = (typeof MARKETS)[number];
type Stage = "issued" | "in-progress" | "not-started";
type Status = "valid" | "expiring" | "expired" | "in-progress" | "not-started";
interface Cert { id: string; scheme: string; family: string; market: Market; stage: Stage; expiry: string | null; owner: string; docs: number }
interface Task { id: string; certId: string; title: string; due: string; owner: string; done: boolean }
interface PCData { certs: Cert[]; tasks: Task[]; snoozed: string[] }

const SITE = "Site-wide";
const STATUS_META: Record<Status, { label: string; tone: "good" | "warn" | "bad" | "info" | "neutral"; dot: string }> = {
  valid: { label: "Valid", tone: "good", dot: "bg-emerald-500" },
  expiring: { label: "Expiring", tone: "warn", dot: "bg-amber-500" },
  expired: { label: "Expired", tone: "bad", dot: "bg-red-500" },
  "in-progress": { label: "In progress", tone: "info", dot: "bg-sky-500" },
  "not-started": { label: "Not started", tone: "neutral", dot: "bg-navy-300" },
};
const STATUS_ORDER: Status[] = ["expired", "expiring", "in-progress", "not-started", "valid"];

const statusOf = (c: Cert): Status => {
  if (c.stage !== "issued" || !c.expiry) return c.stage === "issued" ? "valid" : c.stage;
  const d = daysUntil(c.expiry);
  return d < 0 ? "expired" : d <= 90 ? "expiring" : "valid";
};
const dueIn = (days: number) => iso(addDays(DEMO_TODAY, days));

// ---------------- Seeds ----------------
type Row = [scheme: string, family: string, market: Market, stage: Stage, expiryInDays: number | null, owner: string, docs: number];

function seed(factory: Factory): PCData {
  const key = seedKeyFor(factory);
  let rows: Row[];
  let tasks: [certIdx: number, title: string, dueInDays: number, owner: string, done: boolean][];
  if (key === "delta") {
    const [disc, knuckle, housing, shaft] = factory.products;
    rows = [
      ["IATF 16949 certificate", SITE, "Global", "issued", 300, "Quality manager", 14],
      ["ISO 14001 certificate", SITE, "Global", "issued", 48, "HSE lead", 11],
      ["ECE R90 replacement-part approval", disc, "EU", "issued", 224, "Product engineer", 9],
      ["REACH SVHC declaration (coatings)", disc, "EU", "issued", -18, "Compliance officer", 3],
      ["RoHS declaration", housing, "EU", "issued", 84, "Compliance officer", 4],
      ["PPAP Level 3 submission", knuckle, "EU", "in-progress", null, "Product engineer", 6],
      ["CE applicability assessment", housing, "EU", "not-started", null, "Compliance officer", 0],
      ["Gulf conformity scheme (illustrative)", disc, "GCC", "in-progress", null, "Export manager", 2],
      ["Customer part approval", knuckle, "GCC", "issued", 367, "Quality manager", 5],
      ["IMDS material data submission", shaft, "US", "issued", 148, "Product engineer", 3],
      ["Customer brake test evidence (illustrative)", disc, "US", "not-started", null, "Product engineer", 0],
      ["SONCAP product certificate (illustrative)", disc, "Africa", "issued", 32, "Export manager", 4],
      ["National compulsory specification (illustrative)", disc, "Africa", "not-started", null, "Export manager", 0],
    ];
    tasks = [
      [3, "Collect updated SVHC statements from coating supplier", -6, "Compliance officer", false],
      [1, "Book ISO 14001 recertification audit", -2, "HSE lead", false],
      [1, "Close two minor findings from last surveillance", 21, "HSE lead", false],
      [5, "Run dimensional study on 300-piece production trial", 9, "Product engineer", false],
      [5, "Compile PSW and control plan for customer portal", 18, "Product engineer", false],
      [4, "Refresh RoHS declarations from electronics-adjacent suppliers", 30, "Compliance officer", false],
      [11, "Send renewal pack to inspection agent", 10, "Export manager", false],
      [7, "Translate product labels for Gulf markets", -1, "Export manager", true],
      [2, "Archive latest ECE R90 conformity-of-production test", 40, "Product engineer", true],
    ];
  } else if (key === "al-noor") {
    const [fabric, polo, workwear, linen] = factory.products;
    rows = [
      ["ISO 9001 certificate", SITE, "Global", "issued", 410, "QA lead", 12],
      ["BSCI / amfori social audit", SITE, "EU", "issued", 82, "HR & compliance", 7],
      ["OEKO-TEX Standard 100", fabric, "EU", "issued", 63, "QA lead", 6],
      ["OEKO-TEX Standard 100", polo, "EU", "issued", 285, "QA lead", 5],
      ["GOTS organic scope certificate", polo, "EU", "in-progress", null, "QA lead", 3],
      ["REACH restricted-substance test (dyes)", fabric, "EU", "issued", -13, "Dye-house manager", 2],
      ["EN ISO 20471 hi-vis test evidence", workwear, "EU", "issued", 133, "QA lead", 4],
      ["Laundry durability test (illustrative)", linen, "EU", "not-started", null, "QA lead", 0],
      ["Textile labelling requirements (illustrative)", linen, "GCC", "in-progress", null, "Export manager", 2],
      ["Buyer flammability test (illustrative)", workwear, "GCC", "issued", 164, "Export manager", 2],
      ["Apparel flammability test (illustrative)", polo, "US", "not-started", null, "Export manager", 0],
      ["Pre-export verification (illustrative)", workwear, "Africa", "in-progress", null, "Export manager", 1],
    ];
    tasks = [
      [5, "Re-test reactive dye recipe RX-NAVY-12 at accredited lab", -4, "Dye-house manager", false],
      [2, "Send OEKO-TEX renewal questionnaire for knit fabric", -1, "QA lead", false],
      [1, "Prepare worker-interview schedule for amfori re-audit", 25, "HR & compliance", false],
      [4, "Collect transaction certificates from organic yarn supplier", 14, "QA lead", false],
      [8, "Confirm Arabic care-label wording with buyer", 7, "Export manager", false],
      [7, "Request quotation for 50-cycle laundry test", 35, "QA lead", false],
      [6, "Archive hi-vis tape supplier test report", 3, "QA lead", true],
      [0, "Internal audit — cutting & sewing", 45, "QA lead", true],
    ];
  } else {
    const p = productsOf(factory);
    const food = isFoodLike(factory);
    rows = [
      ["ISO 9001 certificate", SITE, "Global", "issued", 210, "Quality manager", 8],
      ["REACH declaration (illustrative)", p[0], "EU", "in-progress", null, "Compliance officer", 2],
      ["CE applicability assessment", p[0], "EU", "not-started", null, "Compliance officer", 0],
      ...(food
        ? ([["Halal certificate", p[0], "GCC", "issued", 58, "Quality manager", 4], ["Organic certification (illustrative)", p[1] ?? p[0], "EU", "not-started", null, "Quality manager", 0], ["Food-facility registration (illustrative)", SITE, "US", "issued", 120, "Export manager", 2]] as Row[])
        : ([["Gulf conformity scheme (illustrative)", p[1] ?? p[0], "GCC", "in-progress", null, "Export manager", 1], ["Pre-export verification (illustrative)", p[0], "Africa", "issued", 40, "Export manager", 2], ["Customer test evidence (illustrative)", p[0], "US", "not-started", null, "Quality manager", 0]] as Row[])),
    ];
    tasks = [
      [1, "Collect supplier substance declarations", -3, "Compliance officer", false],
      [3, "Prepare renewal documents", 12, "Quality manager", false],
      [2, "Check whether CE marking applies to this product", 20, "Compliance officer", false],
      [0, "Schedule internal audit", 30, "Quality manager", true],
    ];
  }
  const certs: Cert[] = rows.map(([scheme, family, market, stage, exp, owner, docs], i) => ({ id: `c${i + 1}`, scheme, family, market, stage, expiry: exp === null ? null : dueIn(exp), owner, docs }));
  return {
    certs,
    tasks: tasks.map(([ci, title, due, owner, done], i) => ({ id: `t${i + 1}`, certId: certs[Math.min(ci, certs.length - 1)].id, title, due: dueIn(due), owner, done })),
    snoozed: [],
  };
}

// ---------------- Component ----------------
const WINDOW_START = Date.UTC(2026, 10, 1);
const WINDOW_END = Date.UTC(2027, 10, 1);
const pct = (ms: number) => Math.max(0, Math.min(100, ((ms - WINDOW_START) / (WINDOW_END - WINDOW_START)) * 100));

export default function ProductCompliance({ service }: WorkspaceProps) {
  const { data, setData, reset } = useServiceWorkspace<PCData>(service.id, seed);
  const reduce = useReducedMotion();
  const { busy, run } = useSimulatedAction();
  const tr = useT();
  const { isRtl } = useLocale();
  const { fmtDate, fmtDayMonth, monthLabel } = useDateFormat();
  const [market, setMarket] = useState<Market | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [family, setFamily] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<"open" | "done">("open");
  const [newTask, setNewTask] = useState("");

  const certs = data.certs.map((c) => ({ ...c, status: statusOf(c) }));
  const certById = (id: string) => certs.find((c) => c.id === id);
  const families = useMemo(() => {
    const list = Array.from(new Set(data.certs.map((c) => c.family)));
    return [SITE, ...list.filter((f) => f !== SITE)].filter((f) => list.includes(f));
  }, [data.certs]);

  const valid = certs.filter((c) => c.status === "valid").length;
  const expiring = certs.filter((c) => c.status === "expiring").length;
  const expired = certs.filter((c) => c.status === "expired").length;
  const overdue = data.tasks.filter((t) => !t.done && daysUntil(t.due) < 0);
  const doneCount = data.tasks.filter((t) => t.done).length;
  const completion = data.tasks.length ? Math.round((doneCount / data.tasks.length) * 100) : 0;

  const filtered = certs
    .filter((c) => (market === "all" || c.market === market) && (status === "all" || c.status === status) && (!family || c.family === family))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (a.expiry ?? "9").localeCompare(b.expiry ?? "9"));

  const reminders = certs
    .filter((c) => (c.status === "expired" || c.status === "expiring") && !data.snoozed.includes(c.id))
    .sort((a, b) => (a.expiry ?? "").localeCompare(b.expiry ?? ""));
  const hasRenewalTask = (certId: string) => data.tasks.some((t) => t.certId === certId && !t.done && /renew|تجديد/i.test(t.title));

  const toggleTask = (id: string) => {
    const t = data.tasks.find((x) => x.id === id);
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
    if (t && !t.done) toast.success(tr("Task completed"), { description: tr(t.title) });
  };
  const createRenewalTask = (c: Cert) => {
    run(`renew-${c.id}`, () => {
      const exp = c.expiry ? parseIso(c.expiry) : DEMO_TODAY;
      const due = iso(Math.max(DEMO_TODAY + 7 * DAY, exp - 30 * DAY));
      setData((d) => ({ ...d, tasks: [{ id: uid("t"), certId: c.id, title: tr("Renew {scheme} — {family}", { scheme: tr(c.scheme), family: tr(c.family) }), due, owner: c.owner, done: false }, ...d.tasks] }));
      toast.success(tr("Renewal task created"), { description: tr("Assigned to {owner}, due {date}.", { owner: tr(c.owner), date: fmtDate(due) }) });
    }, 700);
  };
  const snooze = (id: string) => setData((d) => ({ ...d, snoozed: [...d.snoozed, id] }));
  const advance = (c: Cert) => {
    if (c.stage === "not-started") {
      setData((d) => ({ ...d, certs: d.certs.map((x) => (x.id === c.id ? { ...x, stage: "in-progress" } : x)), tasks: [{ id: uid("t"), certId: c.id, title: tr("Scope requirements for {scheme}", { scheme: tr(c.scheme) }), due: dueIn(14), owner: c.owner, done: false }, ...d.tasks] }));
      toast(tr("Work started"), { description: tr("{scheme} moved to In progress with a scoping task.", { scheme: tr(c.scheme) }) });
    } else if (c.stage === "in-progress") {
      setData((d) => ({ ...d, certs: d.certs.map((x) => (x.id === c.id ? { ...x, stage: "issued", expiry: dueIn(3 * 365), docs: x.docs + 1 } : x)) }));
      toast(tr("Certificate record logged (demo)"), { description: tr("Recorded as received from the certification body — JAHEZ does not issue or verify certificates.") });
    }
  };
  const addTask = () => {
    const title = newTask.trim();
    if (!title) return;
    const cert = filtered[0] ?? certs[0];
    setData((d) => ({ ...d, tasks: [{ id: uid("t"), certId: cert.id, title, due: dueIn(14), owner: "Compliance officer", done: false }, ...d.tasks] }));
    setNewTask("");
  };

  const visibleTasks = data.tasks
    .filter((t) => (taskView === "open" ? !t.done : t.done))
    .sort((a, b) => a.due.localeCompare(b.due));

  const timelineCerts = certs.filter((c) => c.stage === "issued" && c.expiry && parseIso(c.expiry) < WINDOW_END).sort((a, b) => a.expiry!.localeCompare(b.expiry!));
  const months = Array.from({ length: 12 }, (_, i) => Date.UTC(2026, 10 + i, 1));
  const firstExpired = certs.find((c) => c.status === "expired");
  const soonest = certs.filter((c) => c.status === "expiring").sort((a, b) => a.expiry!.localeCompare(b.expiry!))[0];

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={tr("No regulatory verification or certification issuance.")}>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiTile label={tr("Valid certificates")} value={valid} icon={<ShieldCheck />} hint={tr("of {count} tracked requirements", { count: certs.length })} />
        <KpiTile label={tr("Expiring ≤ 90 days")} value={expiring} icon={<AlarmClock />} tone="warn" delta={expiring ? tr("renew") : undefined} />
        <KpiTile label={tr("Expired")} value={expired} icon={<TimerOff />} tone="bad" delta={expired ? tr("action") : undefined} />
        <KpiTile label={tr("Overdue tasks")} value={overdue.length} icon={<CalendarClock />} tone={overdue.length ? "bad" : "good"} delta={overdue.length ? tr("late") : tr("clear||status")} />
        <KpiTile label={tr("Tasks complete")} value={`${completion}%`} icon={<ListChecks />} hint={tr("{done}/{total} tasks", { done: doneCount, total: data.tasks.length })} className="col-span-2 md:col-span-1" />
      </div>
      <DemoDisclaimer className="mt-3">{tr("No regulatory verification or certification issuance. Requirements, schemes and dates are illustrative and must be confirmed with competent bodies. Status as of {date} (demo date).", { date: fmtDate(DEMO_TODAY) })}</DemoDisclaimer>

      {/* Timeline + reminders */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Panel title={tr("Renewal timeline")} description={tr("Next 12 months · bar = 90-day renewal window ending at expiry")}>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[180px_1fr] items-end gap-3 pb-2">
                <span />
                <div className="grid grid-cols-12 text-center text-[10px] font-medium uppercase tracking-wider text-muted" dir="ltr">
                  {months.map((m, i) => <span key={m} className={cn(i === 0 && "text-teal-700")}>{monthLabel(m)}{i === 0 || new Date(m).getUTCMonth() === 0 ? ` ’${String(new Date(m).getUTCFullYear()).slice(2)}` : ""}</span>)}
                </div>
              </div>
              <div className="relative space-y-1.5">
                {timelineCerts.map((c, i) => {
                  const exp = parseIso(c.expiry!);
                  const left = pct(exp - 90 * DAY);
                  const right = pct(exp);
                  return (
                    <div key={c.id} className="grid grid-cols-[180px_1fr] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-navy-900">{tr(c.scheme)}</p>
                        <p className="truncate text-[11px] text-muted">{tr(c.family)} · {tr(c.market)}</p>
                      </div>
                      <div className="relative h-7 rounded-md bg-canvas/70" dir="ltr">
                        {months.slice(1).map((m, k) => <span key={m} className="absolute inset-y-0 w-px bg-line" style={{ left: `${((k + 1) / 12) * 100}%` }} aria-hidden />)}
                        <span className="absolute inset-y-0 w-px bg-teal-500" style={{ left: `${pct(DEMO_TODAY)}%` }} aria-hidden />
                        {c.status === "expired" ? (
                          <span className="absolute inset-y-1 left-0 flex items-center gap-1 rounded bg-red-100 px-2 text-[10px] font-semibold text-red-700"><TimerOff className="size-3" /> {tr("Expired {date}", { date: fmtDate(c.expiry!) })}</span>
                        ) : (
                          <motion.span initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: reduce ? 0 : i * 0.05, duration: reduce ? 0 : 0.4 }} style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%`, transformOrigin: "right" }}
                            className={cn("absolute inset-y-1 rounded", c.status === "expiring" ? "bg-amber-400/80" : "bg-teal-400/50")} title={tr("Expires {date}", { date: fmtDate(c.expiry!) })} />
                        )}
                        {c.status !== "expired" ? <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-navy-900" style={{ left: `${right}%` }} aria-label={tr("Expires {date}", { date: fmtDate(c.expiry!) })} /> : null}
                      </div>
                    </div>
                  );
                })}
                {timelineCerts.length === 0 ? <p className="text-sm text-muted">{tr("No expiries in the next 12 months.")}</p> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted">
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-amber-400/80" /> {tr("Renewal window open")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-teal-400/50" /> {tr("Upcoming window")}</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rotate-45 bg-navy-900" /> {tr("Expiry")}</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-teal-500" /> {tr("Today")}</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title={tr("Renewal reminders")} description={tr("{count} need attention", { count: reminders.length })} actions={<BellRing className="size-4 text-amber-600" />} bodyClassName="p-3">
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {reminders.map((c) => {
                const d = daysUntil(c.expiry!);
                const has = hasRenewalTask(c.id);
                return (
                  <motion.li key={c.id} layout={!reduce} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: isRtl ? -16 : 16 }} className={cn("rounded-xl border p-3", c.status === "expired" ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-900">{tr(c.scheme)}</p>
                        <p className="truncate text-xs text-muted">{tr(c.family)} · {tr(c.market)} · {tr(c.owner)}</p>
                      </div>
                      <StatusPill tone={c.status === "expired" ? "bad" : "warn"}>{d < 0 ? tr("{days} d overdue", { days: -d }) : tr("{days} d left", { days: d })}</StatusPill>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {has ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check className="size-3.5" /> {tr("Renewal task assigned")}</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => createRenewalTask(c)} disabled={busy === `renew-${c.id}`}>{busy === `renew-${c.id}` ? <Loader2 className="animate-spin" /> : <Plus />} {tr("Create renewal task")}</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => snooze(c.id)}>{tr("Dismiss")}</Button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {reminders.length === 0 ? <li className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-4" /> {tr("No open reminders.")}</li> : null}
          </ul>
        </Panel>
      </div>

      {/* Matrix */}
      <div className="mt-5">
        <Panel title={tr("Requirements by market")} description={tr("Click a cell to filter the register below")} actions={<Globe2 className="size-4 text-navy-500" />} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2 text-start font-semibold">{tr("Product family")}</th>
                  {MARKETS.map((m) => <th key={m} className="px-2 py-2 text-center font-semibold">{tr(m)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {families.map((f) => (
                  <tr key={f}>
                    <th scope="row" className={cn("px-4 py-2 text-start text-sm font-medium", family === f ? "text-teal-700" : "text-navy-900")}>{tr(f)}</th>
                    {MARKETS.map((m) => {
                      const cell = certs.filter((c) => c.family === f && c.market === m);
                      const worst = cell.map((c) => c.status).sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))[0];
                      const active = family === f && market === m;
                      return (
                        <td key={m} className="px-2 py-1.5 text-center">
                          {cell.length ? (
                            <button onClick={() => { setFamily(active ? null : f); setMarket(active ? "all" : m); setStatus("all"); }} aria-pressed={active} aria-label={tr("{family}, {market}: {count} requirements", { family: tr(f), market: tr(m), count: cell.length })}
                              className={cn("inline-flex w-full max-w-[120px] items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", active ? "border-teal-400 bg-teal-50 text-teal-800" : "border-line bg-white text-navy-800 hover:border-navy-500/30")}>
                              <span className="flex gap-0.5">{cell.map((c) => <span key={c.id} className={cn("size-2 rounded-full", STATUS_META[c.status].dot)} />)}</span>
                              <span className="hidden sm:inline">{tr(STATUS_META[worst].label)}</span>
                              <span className="sm:hidden">{cell.length}</span>
                            </button>
                          ) : <span className="text-xs text-navy-900/20">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2.5 text-[11px] text-muted">
            {(Object.keys(STATUS_META) as Status[]).map((s) => <span key={s} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />{tr(STATUS_META[s].label)}</span>)}
          </div>
        </Panel>
      </div>

      {/* Register + tasks */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Panel title={tr("Certificate & requirement register")} description={tr("{shown} of {total} shown", { shown: filtered.length, total: certs.length })} bodyClassName="p-0">
          <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="flex items-center gap-1 text-xs font-semibold text-muted"><Filter className="size-3.5" /> {tr("Market")}</span>
            <div className="flex flex-wrap gap-1">
              {(["all", ...MARKETS] as const).map((m) => (
                <button key={m} onClick={() => setMarket(m)} aria-pressed={market === m} className={cn("rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", market === m ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-navy-700 ring-line hover:ring-navy-500/30")}>{m === "all" ? tr("All") : tr(m)}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted sm:ms-auto">
              {tr("Status")}
              <select value={status} onChange={(e) => setStatus(e.target.value as Status | "all")} className="h-8 rounded-lg border border-line bg-white px-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-100">
                <option value="all">{tr("All statuses")}</option>
                {(Object.keys(STATUS_META) as Status[]).map((s) => <option key={s} value={s}>{tr(STATUS_META[s].label)}</option>)}
              </select>
            </label>
            {family ? <button onClick={() => setFamily(null)} className="inline-flex items-center gap-1 self-start rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-200">{tr(family)} <X className="size-3" /></button> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead className="bg-canvas text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">{tr("Scheme / requirement")}</th>
                  <th className="px-3 py-2 font-semibold">{tr("Market")}</th>
                  <th className="px-3 py-2 font-semibold">{tr("Status")}</th>
                  <th className="px-3 py-2 font-semibold">{tr("Expiry")}</th>
                  <th className="px-3 py-2 font-semibold">{tr("Owner")}</th>
                  <th className="px-3 py-2 text-center font-semibold">{tr("Docs")}</th>
                  <th className="px-3 py-2 font-semibold"><span className="sr-only">{tr("Action")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((c) => {
                  const d = c.expiry ? daysUntil(c.expiry) : null;
                  return (
                    <tr key={c.id} className="hover:bg-canvas/60">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-navy-900">{tr(c.scheme)}</p>
                        <p className="text-xs text-muted">{tr(c.family)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-navy-700">{tr(c.market)}</td>
                      <td className="px-3 py-2.5"><StatusPill tone={STATUS_META[c.status].tone}>{tr(STATUS_META[c.status].label)}</StatusPill></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums">
                        {c.expiry ? <><span className="text-navy-900">{fmtDate(c.expiry)}</span><br /><span className={cn(d! < 0 ? "text-red-600" : d! <= 90 ? "text-amber-600" : "text-muted")}>{d! < 0 ? tr("{days} d ago", { days: -d! }) : tr("in {days} d", { days: d! })}</span></> : <span className="text-muted">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-navy-700">{tr(c.owner)}</td>
                      <td className="px-3 py-2.5 text-center"><span className="inline-flex items-center gap-1 text-xs tabular-nums text-navy-700"><FileText className="size-3.5 text-muted" />{c.docs}</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-end">
                        {c.stage === "not-started" ? <Button size="sm" variant="subtle" onClick={() => advance(c)}>{tr("Start")}</Button>
                          : c.stage === "in-progress" ? <Button size="sm" variant="outline" onClick={() => advance(c)} title={tr("Record a certificate received from the certification body (demo)")}>{tr("Log received")}</Button>
                          : null}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">{tr("No requirements match these filters.")}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={tr("Compliance tasks")} description={tr("{overdue} overdue · {open} open", { overdue: overdue.length, open: data.tasks.filter((t) => !t.done).length })} bodyClassName="p-0"
          actions={
            <div role="tablist" aria-label={tr("Task view")} className="inline-flex rounded-lg bg-navy-900/5 p-0.5 text-xs">
              {(["open", "done"] as const).map((k) => <button key={k} role="tab" aria-selected={taskView === k} onClick={() => setTaskView(k)} className={cn("rounded-md px-2.5 py-1 font-medium capitalize", taskView === k ? "bg-white text-navy-900 shadow-sm" : "text-navy-600")}>{tr(k)}</button>)}
            </div>
          }>
          <form className="flex gap-2 border-b border-line p-3" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder={tr("Add a task…")} aria-label={tr("New task title")} className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100" />
            <Button size="sm" type="submit" disabled={!newTask.trim()}><Plus /> {tr("Add")}</Button>
          </form>
          <ul className="max-h-[460px] divide-y divide-line overflow-y-auto">
            <AnimatePresence initial={false}>
              {visibleTasks.map((t) => {
                const d = daysUntil(t.due);
                const late = !t.done && d < 0;
                const cert = certById(t.certId);
                return (
                  <motion.li key={t.id} layout={!reduce} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }} className="overflow-hidden">
                    <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-canvas/60">
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} className="peer sr-only" />
                      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400", t.done ? "border-teal-500 bg-teal-500 text-white" : "border-navy-500/30 bg-white")}>{t.done ? <Check className="size-3.5" strokeWidth={3} /> : null}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm", t.done ? "text-muted line-through decoration-navy-500/30" : "text-navy-900")}>{tr(t.title)}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted">{cert ? `${tr(cert.scheme)} · ` : ""}{tr(t.owner)}</span>
                      </span>
                      <span className={cn("shrink-0 text-[11px] font-medium tabular-nums", late ? "text-red-600" : "text-muted")}>{late ? tr("{days} d late", { days: -d }) : fmtDayMonth(t.due)}</span>
                    </label>
                  </motion.li>
                );
              })}
            </AnimatePresence>
            {visibleTasks.length === 0 ? <li className="flex items-center gap-2 px-4 py-6 text-sm text-muted"><CircleDashed className="size-4" /> {taskView === "open" ? tr("All tasks complete.") : tr("No completed tasks yet.")}</li> : null}
          </ul>
        </Panel>
      </div>

      <AIInsight className="mt-5" title={tr("AI compliance briefing")}>
        {firstExpired ? <>{tr("The {scheme} record for {family} has lapsed — buyers in {markets} may ask for current evidence before the next shipment.", { scheme: tr(firstExpired.scheme), family: tr(firstExpired.family), markets: firstExpired.market === "Global" ? tr("all markets") : tr("the {market}", { market: tr(firstExpired.market) }) })} </> : null}
        {soonest ? <>{tr("Next renewal:")} <strong>{tr(soonest.scheme)}</strong> ({tr(soonest.family)}) {tr("on {date}.", { date: fmtDate(soonest.expiry!) })} </> : null}
        {overdue.length ? <>{tr(overdue.length > 1 ? "{count} tasks are overdue; clearing them lifts completion to {pct}%." : "{count} task is overdue; clearing them lifts completion to {pct}%.", { count: overdue.length, pct: Math.round(((doneCount + overdue.length) / Math.max(1, data.tasks.length)) * 100) })}</> : <>{tr("No overdue tasks — good standing for upcoming buyer audits.")}</>}
      </AIInsight>
    </WorkspaceFrame>
  );
}
