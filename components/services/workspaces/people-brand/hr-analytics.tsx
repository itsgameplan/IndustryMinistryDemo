"use client";

// Service 10 — HR Digitalization & People Analytics.
// People-analytics dashboard with period / department filters, Recharts trends, an absenteeism
// heat-map by weekday × shift, a searchable table of fictional HR records and AI insights.
import { useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AlertTriangle, CalendarDays, Check, Clock3, Crosshair, Filter, GraduationCap, Info, Search, UserMinus, UserRoundCheck, Users, X } from "lucide-react";
import { AIInsight, CHART_COLORS, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Factory } from "@/lib/types";
import { AXIS_TICK, Segmented, TOOLTIP_STYLE, clamp, rngFrom, round1 } from "./shared";

// ---------------- Types ----------------
type Period = "month" | "quarter" | "12m";
type InsightStatus = "open" | "actioned" | "dismissed";
interface HRData { period: Period; dept: string; insightStatus: Record<string, InsightStatus> }

interface Dept { id: string; name: string; headcount: number; roles: string[]; att: number; turnover: number; training: number; overtime: number; spike?: { shift: number; days: number[]; extra: number } }
interface Profile { prefix: string; shifts: string[]; depts: Dept[]; insights: Insight[] }
interface Insight { id: string; severity: "bad" | "warn" | "info"; title: string; body: string; dept?: string; metric: string }

const WEEKDAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"] as const;
const DAY_FACTOR = [1.15, 1.05, 0.95, 0.9, 0.95, 1.2];
const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const WEEKS = 104; // two years of weekly history, ending the current week (week 47 · Nov 2026)

// ---------------- Profiles ----------------
function profileFor(f: Factory): Profile {
  const key = seedKeyFor(f);
  if (key === "al-noor") {
    return {
      prefix: "AN",
      shifts: ["Day", "Night"],
      depts: [
        { id: "knitting", name: "Knitting", headcount: 24, roles: ["Knitting operator", "Knitting technician"], att: 94.6, turnover: 14, training: 1.2, overtime: 9 },
        { id: "dyeing", name: "Dyeing", headcount: 10, roles: ["Dyeing technician", "Dye-house assistant"], att: 92.4, turnover: 22, training: 0.8, overtime: 14, spike: { shift: 1, days: [0, 5], extra: 7 } },
        { id: "cutting", name: "Cutting", headcount: 8, roles: ["Cutter", "Spreader"], att: 95.2, turnover: 10, training: 1.0, overtime: 6 },
        { id: "sewing", name: "Sewing", headcount: 30, roles: ["Sewing operator", "Line feeder"], att: 93.4, turnover: 27, training: 1.5, overtime: 8 },
        { id: "quality", name: "Quality", headcount: 7, roles: ["QC inspector"], att: 96.1, turnover: 8, training: 2.2, overtime: 5 },
        { id: "admin", name: "Admin & supervision", headcount: 7, roles: ["Supervisor", "Admin & sales officer", "Storekeeper"], att: 97.0, turnover: 6, training: 1.8, overtime: 4 },
      ],
      insights: [
        { id: "an-1", severity: "bad", dept: "dyeing", title: "Absenteeism spike in the dyeing night shift", body: "Night-shift absences in Dyeing rose sharply over the last six weeks, concentrated on Thursdays and Saturdays. Review shift rotation and transport for late finishes before peak season.", metric: "+7 pts on Thu/Sat nights" },
        { id: "an-2", severity: "warn", dept: "sewing", title: "Sewing operator turnover above textile norm", body: "Turnover in Sewing is the highest in the factory, driven by operators with under one year of tenure. A structured 30-day onboarding and buddy system typically halves early exits.", metric: "~27% annualised" },
        { id: "an-3", severity: "info", dept: "quality", title: "QC inspectors lead on training hours", body: "Quality staff log the most training hours per head. Use them as digital-QC champions when tablets replace paper inspection sheets.", metric: "2.2 h / head / month" },
      ],
    };
  }
  if (key === "delta") {
    return {
      prefix: "DP",
      shifts: ["A · 06–14", "B · 14–22", "C · 22–06"],
      depts: [
        { id: "machining", name: "Machining", headcount: 182, roles: ["CNC machinist", "Setter", "Machine operator"], att: 95.8, turnover: 11, training: 2.4, overtime: 12, spike: { shift: 2, days: [5], extra: 3.5 } },
        { id: "maintenance", name: "Maintenance", headcount: 54, roles: ["Maintenance technician", "Electrician"], att: 96.4, turnover: 7, training: 3.1, overtime: 21 },
        { id: "quality", name: "Quality", headcount: 38, roles: ["Quality engineer", "Metrology technician"], att: 97.1, turnover: 6, training: 3.4, overtime: 7 },
        { id: "planning", name: "Planning", headcount: 22, roles: ["Production planner"], att: 97.6, turnover: 5, training: 2.8, overtime: 5 },
        { id: "it", name: "Data & IT", headcount: 14, roles: ["Data analyst", "IT/OT engineer"], att: 97.9, turnover: 16, training: 4.0, overtime: 6 },
        { id: "logistics", name: "Logistics", headcount: 46, roles: ["Logistics coordinator", "Forklift driver"], att: 94.2, turnover: 13, training: 1.6, overtime: 10 },
        { id: "admin", name: "Admin & commercial", headcount: 56, roles: ["Supervisor", "Admin officer", "Commercial officer"], att: 97.3, turnover: 6, training: 2.2, overtime: 3 },
      ],
      insights: [
        { id: "dp-1", severity: "warn", dept: "maintenance", title: "Maintenance overtime is structurally high", body: "Maintenance averages over 20 overtime hours per technician per month, mostly unplanned breakdown call-outs. Predictive maintenance and a second weekend crew would cut this materially.", metric: "21 h / head / month" },
        { id: "dp-2", severity: "bad", dept: "machining", title: "C-shift absenteeism rising in Machining", body: "Absences on the night C-shift climb on Thursdays — the day before the weekend. Consider a rotation that avoids consecutive Thursday nights and review canteen and transport provision.", metric: "+3.5 pts Thu C-shift" },
        { id: "dp-3", severity: "info", dept: "it", title: "Data & IT attrition risk", body: "The small Data & IT team has the highest turnover rate. Losing one analyst removes ~7% of capacity; document critical integrations and create a retention plan.", metric: "~16% annualised" },
      ],
    };
  }
  const r = rngFrom(`hr:${f.id}:${f.name}`);
  const total = Math.max(12, f.employees || 40);
  const spec: [string, string, number, string[]][] = [
    ["production", "Production", 0.55, ["Production operator", "Line lead"]],
    ["maintenance", "Maintenance", 0.1, ["Maintenance technician"]],
    ["quality", "Quality", 0.08, ["Quality inspector"]],
    ["logistics", "Logistics", 0.1, ["Storekeeper", "Driver"]],
    ["admin", "Admin & sales", 0.17, ["Supervisor", "Admin officer", "Sales officer"]],
  ];
  let used = 0;
  const depts: Dept[] = spec.map(([id, name, share, roles], i) => {
    const hc = i === spec.length - 1 ? Math.max(1, total - used) : Math.max(1, Math.round(total * share));
    used += hc;
    return { id, name, headcount: hc, roles, att: round1(93 + r() * 4.5), turnover: Math.round(6 + r() * 18), training: round1(0.8 + r() * 2), overtime: Math.round(4 + r() * 12), spike: i === 0 ? { shift: 1, days: [5], extra: 4 } : undefined };
  });
  const initials = f.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "FX";
  return {
    prefix: initials,
    shifts: ["Day", "Night"],
    depts,
    insights: [
      { id: "g-1", severity: "warn", dept: "production", title: "Thursday night absences in Production", body: "Night-shift absences in Production at {name} peak on Thursdays. Digital attendance makes the pattern visible early enough to adjust rosters.", metric: "+4 pts Thu nights" },
      { id: "g-2", severity: "info", title: "Move attendance to a digital system", body: "Paper or spreadsheet attendance limits analysis to month-end. A badge or app-based record would enable weekly people analytics.", metric: "Data quality" },
    ],
  };
}

// ---------------- Series generation ----------------
interface WeekPoint { att: number; sep: number; training: number; overtime: number }

function buildSeries(f: Factory, p: Profile) {
  const series: Record<string, WeekPoint[]> = {};
  for (const d of p.depts) {
    const r = rngFrom(`hr-series:${f.id}:${d.id}`);
    let sepCarry = 0;
    series[d.id] = Array.from({ length: WEEKS }, (_, w) => {
      const weekOfYear = (w + 47 - (WEEKS % 52) + 52) % 52;
      const summer = weekOfYear >= 26 && weekOfYear <= 34 ? -1.1 : 0;
      const spikeDrop = d.spike && w >= WEEKS - 6 ? -(d.spike.extra * 0.32) : 0;
      const att = clamp(d.att + summer + spikeDrop + (r() - 0.5) * 1.2, 80, 99.6);
      sepCarry += (d.headcount * d.turnover) / 100 / 52 + (r() - 0.5) * 0.12;
      const sep = Math.max(0, Math.floor(sepCarry));
      sepCarry -= sep;
      const training = (d.headcount * d.training * 12) / 52 * (0.6 + r() * 0.8);
      const overtime = (d.headcount * d.overtime * 12) / 52 * (0.8 + r() * 0.4) * (d.spike && w >= WEEKS - 6 ? 1.12 : 1);
      return { att, sep, training, overtime };
    });
  }
  return series;
}

const PERIOD_WEEKS: Record<Period, number> = { month: 4, quarter: 13, "12m": 52 };
const PERIOD_LABEL: Record<Period, string> = { month: "Last 4 weeks", quarter: "Last quarter (13 weeks)", "12m": "Last 12 months" };

function aggregate(depts: Dept[], series: Record<string, WeekPoint[]>, from: number, to: number) {
  const hc = depts.reduce((a, d) => a + d.headcount, 0) || 1;
  let att = 0;
  let sep = 0;
  let training = 0;
  let overtime = 0;
  for (const d of depts) {
    const s = series[d.id].slice(from, to);
    att += (s.reduce((a, x) => a + x.att, 0) / Math.max(1, s.length)) * d.headcount;
    sep += s.reduce((a, x) => a + x.sep, 0);
    training += s.reduce((a, x) => a + x.training, 0);
    overtime += s.reduce((a, x) => a + x.overtime, 0);
  }
  const weeks = to - from;
  return { headcount: hc, att: att / hc, abs: 100 - att / hc, turnover: (sep / hc) * (52 / weeks) * 100, sep, training, overtime, overtimePerHead: overtime / hc / (weeks / 4.33) };
}

// ---------------- Records ----------------
interface HRRecord { id: string; role: string; dept: string; shift: string; tenure: number; attendance: number; training: "Completed" | "In progress" | "Overdue" | "Not enrolled" }

function buildRecords(f: Factory, p: Profile): HRRecord[] {
  const r = rngFrom(`hr-records:${f.id}`);
  const total = p.depts.reduce((a, d) => a + d.headcount, 0);
  const sample = Math.min(total, 72);
  const out: HRRecord[] = [];
  let n = 0;
  for (const d of p.depts) {
    const count = Math.max(1, Math.round((d.headcount / total) * sample));
    for (let i = 0; i < count; i++) {
      const t = r();
      const shiftIdx = Math.floor(r() * p.shifts.length);
      const spikePenalty = d.spike && d.spike.shift === shiftIdx ? d.spike.extra * 0.4 : 0;
      out.push({
        id: `${p.prefix}-${String(1040 + n * 13 + Math.floor(r() * 9)).padStart(4, "0")}`,
        role: d.roles[Math.floor(r() * d.roles.length)],
        dept: d.name,
        shift: p.shifts[shiftIdx],
        tenure: round1(t < 0.25 ? 0.2 + r() * 0.8 : t < 0.6 ? 1 + r() * 3 : 4 + r() * Math.max(2, 2026 - f.founded - 4)),
        attendance: round1(clamp(d.att - spikePenalty + (r() - 0.5) * 6, 78, 100)),
        training: (["Completed", "Completed", "In progress", "Overdue", "Not enrolled"] as const)[Math.floor(r() * 5)],
      });
      n++;
    }
  }
  return out;
}

const TENURE_BANDS = ["< 1 yr", "1–3 yrs", "3–5 yrs", "5–10 yrs", "10+ yrs"] as const;
const bandOf = (t: number) => (t < 1 ? 0 : t < 3 ? 1 : t < 5 ? 2 : t < 10 ? 3 : 4);

const seed = (): HRData => ({ period: "quarter", dept: "all", insightStatus: {} });

// ---------------- Component ----------------
export default function HRAnalytics({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<HRData>(service.id, seed);
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const fname = locale === "ar" ? (factory.nameAr || factory.name) : factory.name;
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(10);

  const profile = useMemo(() => profileFor(factory), [factory]);
  const series = useMemo(() => buildSeries(factory, profile), [factory, profile]);
  const records = useMemo(() => buildRecords(factory, profile), [factory, profile]);

  const period = data.period;
  const deptId = profile.depts.some((d) => d.id === data.dept) ? data.dept : "all";
  const selDepts = deptId === "all" ? profile.depts : profile.depts.filter((d) => d.id === deptId);
  const deptName = deptId === "all" ? "All departments" : selDepts[0]?.name ?? "";
  const weeks = PERIOD_WEEKS[period];

  const cur = aggregate(selDepts, series, WEEKS - weeks, WEEKS);
  const prev = aggregate(selDepts, series, WEEKS - weeks * 2, WEEKS - weeks);

  // Attendance trend points
  const trend = useMemo(() => {
    const hc = selDepts.reduce((a, d) => a + d.headcount, 0) || 1;
    const avgAt = (w: number) => selDepts.reduce((a, d) => a + series[d.id][w].att * d.headcount, 0) / hc;
    if (period === "12m") {
      return MONTHS.map((m, i) => {
        const from = WEEKS - 52 + Math.floor((i * 52) / 12);
        const to = WEEKS - 52 + Math.floor(((i + 1) * 52) / 12);
        let s = 0;
        for (let w = from; w < to; w++) s += avgAt(w);
        return { label: t(m), attendance: round1(s / Math.max(1, to - from)) };
      });
    }
    return Array.from({ length: weeks }, (_, i) => {
      const w = WEEKS - weeks + i;
      return { label: t("Wk {n}", { n: ((47 - weeks + i + 52) % 52) + 1 }), attendance: round1(avgAt(w)) };
    });
  }, [period, weeks, selDepts, series, t]);

  const turnoverByDept = profile.depts.map((d) => ({ id: d.id, name: t(d.name), turnover: round1(aggregate([d], series, WEEKS - weeks, WEEKS).turnover) }));

  // Absenteeism heat-map weekday × shift
  const heat = useMemo(() => {
    const hc = selDepts.reduce((a, d) => a + d.headcount, 0) || 1;
    return profile.shifts.map((_, si) => {
      const shiftFactor = profile.shifts.length === 2 ? [0.9, 1.2][si] : [0.85, 1.0, 1.25][si];
      return WEEKDAYS.map((_, di) => {
        let v = 0;
        for (const d of selDepts) {
          const base = 100 - aggregate([d], series, WEEKS - weeks, WEEKS).att;
          const spike = d.spike && d.spike.shift === si && d.spike.days.includes(di) ? d.spike.extra * (period === "month" ? 1 : period === "quarter" ? 0.75 : 0.45) : 0;
          v += (base * DAY_FACTOR[di] * shiftFactor + spike) * d.headcount;
        }
        return round1(v / hc);
      });
    });
  }, [selDepts, profile.shifts, series, weeks, period]);
  const heatMax = Math.max(...heat.flat(), 1);
  const heatMin = Math.min(...heat.flat());

  // Composition
  const composition = useMemo(() => {
    if (deptId === "all") return profile.depts.map((d) => ({ name: t(d.name), value: d.headcount }));
    const recs = records.filter((r) => r.dept === deptName);
    const counts = TENURE_BANDS.map((b) => ({ name: t(b), value: 0 }));
    for (const r of recs) counts[bandOf(r.tenure)].value++;
    const scale = (selDepts[0]?.headcount ?? recs.length) / Math.max(1, recs.length);
    return counts.map((c) => ({ ...c, value: Math.round(c.value * scale) })).filter((c) => c.value > 0);
  }, [deptId, deptName, profile.depts, records, selDepts, t]);

  const filteredRecords = records.filter((r) => (deptId === "all" || r.dept === deptName) && (!query.trim() || `${r.id} ${r.role} ${r.dept} ${r.shift} ${t(r.role)} ${t(r.dept)} ${t(r.shift)}`.toLowerCase().includes(query.trim().toLowerCase())));

  const setPeriod = (p: Period) => setData((d) => ({ ...d, period: p }));
  const setDept = (id: string) => { setData((d) => ({ ...d, dept: id })); setShown(10); };
  const setInsight = (id: string, s: InsightStatus) => setData((d) => ({ ...d, insightStatus: { ...d.insightStatus, [id]: s } }));

  const delta = (a: number, b: number, digits = 1, suffix = "") => {
    const v = a - b;
    return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}${suffix}`;
  };
  const deptLabel = t(deptName);
  const periodLabel = t(PERIOD_LABEL[period]);
  const pts = ` ${t("pts")}`;
  const kpis = [
    { label: "Headcount", value: cur.headcount.toString(), sub: deptLabel, icon: <Users />, delta: undefined as string | undefined, good: true },
    { label: "Attendance rate", value: `${cur.att.toFixed(1)}%`, sub: t("vs previous period"), icon: <UserRoundCheck />, delta: delta(cur.att, prev.att, 1, pts), good: cur.att >= prev.att },
    { label: "Absenteeism", value: `${cur.abs.toFixed(1)}%`, sub: t("unplanned absence"), icon: <CalendarDays />, delta: delta(cur.abs, prev.abs, 1, pts), good: cur.abs <= prev.abs },
    { label: "Turnover (annualised)", value: `${cur.turnover.toFixed(1)}%`, sub: t("{count} leavers in period", { count: cur.sep }), icon: <UserMinus />, delta: delta(cur.turnover, prev.turnover, 1, pts), good: cur.turnover <= prev.turnover },
    { label: "Training hours", value: Math.round(cur.training).toLocaleString("en-US"), sub: t("{hours} h per person", { hours: (cur.training / cur.headcount).toFixed(1) }), icon: <GraduationCap />, delta: `${cur.training >= prev.training ? "+" : ""}${Math.round(((cur.training - prev.training) / Math.max(1, prev.training)) * 100)}%`, good: cur.training >= prev.training },
    { label: "Overtime hours", value: Math.round(cur.overtime).toLocaleString("en-US"), sub: t("{hours} h / person / month", { hours: cur.overtimePerHead.toFixed(1) }), icon: <Clock3 />, delta: `${cur.overtime >= prev.overtime ? "+" : ""}${Math.round(((cur.overtime - prev.overtime) / Math.max(1, prev.overtime)) * 100)}%`, good: cur.overtime <= prev.overtime },
  ];

  const openInsights = profile.insights.filter((i) => (data.insightStatus[i.id] ?? "open") !== "dismissed");
  const attTarget = 95;

  return (
    <WorkspaceFrame service={service} onReset={() => { reset(); setQuery(""); setShown(10); }} notice={t("HR records shown are fictional samples; production use requires a privacy policy and employee consent.")}>
      {/* Filter toolbar */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Filter className="size-4 text-navy-500" />
          <span>{t("People analytics")} · <span className="font-medium text-navy-800">{periodLabel}</span> · {deptLabel}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Segmented ariaLabel={t("Period")} size="sm" value={period} onChange={setPeriod} options={[{ value: "month", label: t("Month") }, { value: "quarter", label: t("Quarter") }, { value: "12m", label: t("12M") }]} />
          <label className="sr-only" htmlFor="hr-dept">{t("Department")}</label>
          <select id="hr-dept" value={deptId} onChange={(e) => setDept(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100">
            <option value="all">{t("All departments")}</option>
            {profile.depts.map((d) => <option key={d.id} value={d.id}>{t(d.name)} ({d.headcount})</option>)}
          </select>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="min-w-0 bg-white p-4">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted">
              <span className="truncate">{t(k.label)}</span>
              <span className="text-navy-500 [&_svg]:size-4">{k.icon}</span>
            </div>
            <div className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-navy-900 sm:text-2xl">{k.value}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
              {k.delta ? <span className={cn("font-semibold tabular-nums", k.good ? "text-emerald-600" : "text-red-600")}>{k.delta}</span> : null}
              <span className="truncate">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <Panel title={t("Attendance rate")} description={t("{period} · target {target}%", { period: periodLabel, target: attTarget })} className="lg:col-span-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF1F5" />
                  <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis domain={[(min: number) => Math.floor(Math.min(min, attTarget) - 1), 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, t("Attendance")]} />
                  <ReferenceLine y={attTarget} stroke={CHART_COLORS[2]} strokeDasharray="4 4" label={{ value: t("Target"), position: "insideTopRight", fill: "#A9853A", fontSize: 10 }} />
                  <Line type="monotone" dataKey="attendance" stroke={CHART_COLORS[0]} strokeWidth={2.4} dot={period === "12m" || period === "month" ? { r: 3, fill: CHART_COLORS[0] } : false} activeDot={{ r: 5 }} isAnimationActive={!reduce} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={t("Turnover by department")} description={t("Annualised % · selected department highlighted")}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={turnoverByDept} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF1F5" />
                  <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => (v.length > 9 ? `${v.slice(0, 8)}…` : v)} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(11,31,58,0.04)" }} formatter={(v) => [`${v}%`, t("Turnover")]} />
                  <Bar dataKey="turnover" radius={[4, 4, 0, 0]} isAnimationActive={!reduce} onClick={(e: { payload?: { id?: string } }) => { if (e?.payload?.id) setDept(e.payload.id === deptId ? "all" : e.payload.id); }} className="cursor-pointer">
                    {turnoverByDept.map((d) => <Cell key={d.id} fill={deptId === "all" || d.id === deptId ? CHART_COLORS[1] : "#CBD5E1"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title={deptId === "all" ? t("Headcount by department") : t("Headcount by tenure")} description={deptId === "all" ? t("{count} people", { count: cur.headcount }) : `${deptLabel} · ${t("{count} people", { count: cur.headcount })}`}>
            <div className="flex h-56 items-center gap-3">
              <div className="h-full min-w-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={composition} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive={!reduce}>
                      {composition.map((c, i) => <Cell key={c.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-36 shrink-0 space-y-1.5 text-xs">
                {composition.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate text-navy-800">{c.name}</span>
                    <span className="tabular-nums text-muted">{c.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel title={t("Absenteeism heat by weekday & shift")} description={t("Unplanned absence %, Saturday–Thursday working week")} className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-separate border-spacing-1 text-xs">
                <thead>
                  <tr>
                    <th scope="col" className="w-24 text-start font-semibold text-muted">{t("Shift")}</th>
                    {WEEKDAYS.map((d) => <th key={d} scope="col" className="font-semibold text-muted">{t(d)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {heat.map((row, si) => (
                    <tr key={profile.shifts[si]}>
                      <th scope="row" className="whitespace-nowrap pe-2 text-start font-medium text-navy-800">{t(profile.shifts[si])}</th>
                      {row.map((v, di) => {
                        const k = (v - heatMin) / Math.max(0.01, heatMax - heatMin);
                        const hot = k > 0.75;
                        return (
                          <td key={di} className="h-11 rounded-lg text-center font-semibold tabular-nums" style={{ backgroundColor: `rgba(${Math.round(15 + k * 224)}, ${Math.round(163 - k * 95)}, ${Math.round(150 - k * 82)}, ${0.12 + k * 0.6})`, color: k > 0.55 ? "#fff" : "#0B1F3A" }} title={`${t(profile.shifts[si])} · ${t(WEEKDAYS[di])}: ${v}%`}>
                            {v.toFixed(1)}
                            {hot ? <span className="sr-only"> {t("(hotspot)")}</span> : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
              <span>{t("Low")}</span>
              <span className="h-2 w-24 rounded-full bg-gradient-to-r from-teal-200 to-red-500 rtl:bg-gradient-to-l" />
              <span>{t("High")}</span>
            </div>
          </Panel>
        </div>

        {/* AI insights rail */}
        <div className="space-y-3">
          <AIInsight title={t("People analytics agent")}>
            {cur.abs > prev.abs ? t("Absenteeism is up") : t("Absenteeism is down")} <b>{Math.abs(cur.abs - prev.abs).toFixed(1)} {t("pts")}</b> {t("versus the previous period for {dept}.", { dept: locale === "ar" ? deptLabel : deptName.toLowerCase() })} {openInsights.length === 1 ? t("1 finding needs review.") : t("{count} findings need review.", { count: openInsights.length })}
          </AIInsight>
          {profile.insights.map((ins) => {
            const status = data.insightStatus[ins.id] ?? "open";
            if (status === "dismissed") return null;
            return (
              <div key={ins.id} className={cn("rounded-2xl border bg-white p-4 shadow-card transition", status === "actioned" ? "border-emerald-200 opacity-80" : "border-line")}>
                <div className="flex items-start gap-2.5">
                  <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", ins.severity === "bad" ? "bg-red-50 text-red-600" : ins.severity === "warn" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600")}>
                    {ins.severity === "info" ? <Info className="size-4" /> : <AlertTriangle className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug text-navy-900">{t(ins.title)}</div>
                    <StatusPill tone={ins.severity} className="mt-1">{t(ins.metric)}</StatusPill>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-navy-700">{t(ins.body, { name: fname })}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ins.dept ? <Button size="sm" variant="subtle" className="h-7 px-2" onClick={() => setDept(ins.dept === deptId ? "all" : ins.dept!)}><Crosshair /> {ins.dept === deptId ? t("Clear focus") : t("Focus")}</Button> : null}
                  {status === "actioned" ? (
                    <StatusPill tone="good" className="h-7 px-2.5"><Check /> {t("Action assigned")}</StatusPill>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setInsight(ins.id, "actioned"); toast.success(t("Action assigned to HR (simulated)")); }}><Check /> {t("Assign action")}</Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setInsight(ins.id, "dismissed")} aria-label={t("Dismiss insight: {title}", { title: t(ins.title) })}><X /></Button>
                </div>
              </div>
            );
          })}
          {Object.values(data.insightStatus).includes("dismissed") ? (
            <button type="button" className="text-xs font-medium text-teal-700 hover:underline" onClick={() => setData((d) => ({ ...d, insightStatus: Object.fromEntries(Object.entries(d.insightStatus).filter(([, s]) => s !== "dismissed")) }))}>{t("Restore dismissed insights")}</button>
          ) : null}
        </div>
      </div>

      {/* Records */}
      <Panel
        className="mt-4"
        title={t("HR records (fictional sample)")}
        description={t("{shown} of {total} sample records · IDs are generated, not real employees", { shown: filteredRecords.length, total: records.length })}
        actions={
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input aria-label={t("Search records")} placeholder={t("Search ID, role, shift…")} value={query} onChange={(e) => { setQuery(e.target.value); setShown(10); }} className="h-9 w-56 ps-8" />
          </div>
        }
        bodyClassName="p-0"
      >
        <div className="border-b border-line p-3 sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input aria-label={t("Search records")} placeholder={t("Search ID, role, shift…")} value={query} onChange={(e) => { setQuery(e.target.value); setShown(10); }} className="h-9 ps-8" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="bg-canvas/70 text-start text-xs text-muted">
                <th scope="col" className="px-5 py-2.5 font-semibold">{t("Employee ID")}</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">{t("Role")}</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">{t("Department")}</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">{t("Shift")}</th>
                <th scope="col" className="px-3 py-2.5 text-end font-semibold">{t("Tenure")}</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">{t("Attendance")}</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">{t("Training")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.slice(0, shown).map((r) => (
                <tr key={r.id} className="border-t border-line hover:bg-canvas/50">
                  <td className="px-5 py-2.5 font-mono text-xs font-semibold text-navy-800">{r.id}</td>
                  <td className="px-3 py-2.5 text-navy-900">{t(r.role)}</td>
                  <td className="px-3 py-2.5 text-muted">{t(r.dept)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted">{t(r.shift)}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-navy-800">{t("{years} yrs", { years: r.tenure.toFixed(1) })}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-900/[0.06]"><div className={cn("h-full rounded-full", r.attendance >= 95 ? "bg-emerald-500" : r.attendance >= 90 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${clamp((r.attendance - 75) * 4, 4, 100)}%` }} /></div>
                      <span className="text-xs tabular-nums text-navy-800">{r.attendance.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5"><StatusPill tone={r.training === "Completed" ? "good" : r.training === "In progress" ? "info" : r.training === "Overdue" ? "bad" : "neutral"}>{t(r.training)}</StatusPill></td>
                </tr>
              ))}
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">{t("No records match “{query}”.", { query })}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {filteredRecords.length > shown ? (
          <div className="border-t border-line p-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShown((s) => s + 15)}>{t("Show more ({count} remaining)", { count: filteredRecords.length - shown })}</Button>
          </div>
        ) : null}
      </Panel>
    </WorkspaceFrame>
  );
}
