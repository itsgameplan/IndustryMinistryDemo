"use client";

// Service 9 — AI-Enabled Talent Management & Workforce Planning.
// Skills matrix (role categories × skills), digital-skills gap ranking, readiness by role,
// generated training & reskilling plan and a 12/24-month workforce plan. Aggregated, fictional data.
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { BadgeCheck, CalendarClock, Cpu, GraduationCap, Grid3x3, Minus, Plus, RefreshCw, Sparkles, Trash2, TrendingUp, Users, X } from "lucide-react";
import { AIInsight, CHART_COLORS, EditableText, KpiTile, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Badge, Button, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Factory } from "@/lib/types";
import { AXIS_TICK, ScoreRing, Segmented, TOOLTIP_STYLE, WritingShimmer, rngFrom, useSimulatedAI } from "./shared";

// ---------------- Types ----------------
type Level = 0 | 1 | 2 | 3 | 4;
type SkillId = "craft" | "safety" | "lean" | "erp" | "data" | "conn" | "dqc" | "ecom";
type Mode = "On-site" | "Blended" | "Online" | "On-the-job";
type Priority = "High" | "Medium" | "Low";

interface Skill { id: SkillId; name: string; short: string; digital: boolean }
interface RoleRow { id: string; name: string; headcount: number; current: Record<SkillId, Level>; required: Record<SkillId, Level>; need12: number; need24: number }
interface PlanItem { id: string; skillId: SkillId; course: string; roles: string[]; participants: number; cohorts: number; weeks: number; mode: Mode; priority: Priority; start: string }
interface TalentData { skills: Skill[]; roles: RoleRow[]; plan: PlanItem[]; planVersion: number; planStatus: "draft" | "approved"; approvedAt?: number }

const SKILL_ORDER: SkillId[] = ["craft", "safety", "lean", "erp", "data", "conn", "dqc", "ecom"];
const LEVEL_NAMES = ["None", "Awareness", "Basic", "Proficient", "Expert"] as const;

// ---------------- Seeds ----------------
const toRec = (arr: number[]) => Object.fromEntries(SKILL_ORDER.map((s, i) => [s, arr[i] as Level])) as Record<SkillId, Level>;

function skillsFor(craft: string, conn: string): Skill[] {
  return [
    { id: "craft", name: craft, short: "Core craft", digital: false },
    { id: "safety", name: "Health & safety", short: "Safety", digital: false },
    { id: "lean", name: "Lean & 5S", short: "Lean", digital: false },
    { id: "erp", name: "ERP use", short: "ERP", digital: true },
    { id: "data", name: "Data literacy", short: "Data", digital: true },
    { id: "conn", name: conn, short: "Connectivity", digital: true },
    { id: "dqc", name: "Digital QC", short: "Digital QC", digital: true },
    { id: "ecom", name: "E-commerce & export", short: "E-com/export", digital: true },
  ];
}

type RoleSeed = [name: string, hc: number, cur: number[], req: number[], n12: number, n24: number];
const role = ([name, hc, cur, req, n12, n24]: RoleSeed, i: number): RoleRow => ({ id: `r${i}`, name, headcount: hc, current: toRec(cur), required: toRec(req), need12: n12, need24: n24 });

const AL_NOOR_ROLES: RoleSeed[] = [
  ["Knitting operators", 22, [3, 2, 1, 0, 0, 0, 1, 0], [4, 3, 2, 1, 1, 2, 2, 0], 24, 26],
  ["Dyeing technicians", 9, [3, 2, 1, 0, 1, 0, 1, 0], [4, 3, 2, 1, 2, 2, 3, 0], 10, 11],
  ["Cutters", 8, [3, 2, 1, 0, 0, 0, 1, 0], [3, 3, 2, 1, 1, 1, 2, 0], 8, 8],
  ["Sewing operators", 28, [3, 2, 1, 0, 0, 0, 0, 0], [3, 3, 2, 1, 1, 0, 2, 0], 32, 36],
  ["QC inspectors", 7, [3, 2, 2, 0, 1, 0, 1, 0], [4, 3, 3, 2, 3, 1, 4, 0], 8, 9],
  ["Supervisors", 6, [4, 3, 2, 1, 1, 0, 1, 0], [4, 4, 3, 3, 3, 2, 3, 1], 7, 7],
  ["Admin & sales", 6, [1, 2, 1, 1, 1, 0, 0, 1], [1, 2, 2, 4, 3, 0, 1, 3], 7, 9],
];

const DELTA_ROLES: RoleSeed[] = [
  ["CNC machinists", 168, [3, 3, 3, 1, 1, 2, 2, 0], [4, 3, 3, 2, 2, 3, 3, 0], 176, 184],
  ["Maintenance technicians", 54, [3, 3, 2, 1, 1, 2, 1, 0], [4, 4, 3, 2, 3, 4, 2, 0], 58, 62],
  ["Quality engineers", 38, [3, 3, 3, 2, 2, 2, 3, 0], [3, 3, 3, 3, 4, 3, 4, 1], 40, 44],
  ["Production planners", 22, [2, 2, 3, 3, 2, 1, 1, 0], [2, 2, 3, 4, 4, 2, 2, 1], 22, 24],
  ["Data & IT", 14, [1, 2, 2, 3, 3, 3, 2, 1], [1, 2, 2, 4, 4, 4, 3, 2], 18, 24],
  ["Logistics", 46, [2, 3, 2, 2, 1, 0, 0, 1], [2, 3, 3, 3, 2, 1, 1, 3], 46, 48],
  ["Supervisors & leads", 34, [4, 3, 3, 2, 2, 2, 2, 0], [4, 4, 4, 3, 3, 3, 3, 1], 36, 38],
  ["Admin & commercial", 36, [1, 2, 2, 2, 2, 0, 0, 1], [1, 2, 2, 3, 3, 0, 1, 4], 38, 42],
];

function genericRoles(f: Factory): RoleSeed[] {
  const r = rngFrom(`talent:${f.id}:${f.name}`);
  const total = Math.max(12, f.employees || 40);
  const shares: [string, number, number[]][] = [
    ["Production operators", 0.52, [3, 3, 2, 1, 1, 1, 2, 0]],
    ["Technicians", 0.12, [4, 3, 3, 2, 2, 3, 2, 0]],
    ["Quality staff", 0.08, [3, 3, 3, 2, 3, 1, 4, 0]],
    ["Supervisors", 0.08, [4, 4, 3, 3, 3, 2, 3, 1]],
    ["Logistics & stores", 0.08, [2, 3, 2, 3, 2, 0, 1, 2]],
    ["Admin & sales", 0.12, [1, 2, 2, 4, 3, 0, 1, 3]],
  ];
  let used = 0;
  return shares.map(([name, share, req], i) => {
    const hc = i === shares.length - 1 ? Math.max(1, total - used) : Math.max(1, Math.round(total * share));
    used += hc;
    const cur = req.map((q) => Math.max(0, q - Math.floor(r() * 3)));
    const grow = 1 + 0.04 + r() * 0.08;
    return [name, hc, cur, req, Math.round(hc * grow), Math.round(hc * grow * grow)];
  });
}

function seed(factory: Factory): TalentData {
  const key = seedKeyFor(factory);
  const skills =
    key === "al-noor" ? skillsFor("Knitting, dyeing & sewing craft", "Machine connectivity / IoT")
      : key === "delta" ? skillsFor("Machining & process craft", "CNC programming & machine connectivity")
        : skillsFor(`${factory.industry.split(/[&,]/)[0].trim() || "Core"} production craft`, "Machine connectivity / IoT");
  const roles = (key === "al-noor" ? AL_NOOR_ROLES : key === "delta" ? DELTA_ROLES : genericRoles(factory)).map(role);
  return { skills, roles, plan: buildPlan(roles, skills, 0), planVersion: 0, planStatus: "draft" };
}

// ---------------- Analytics ----------------
const gapOf = (r: RoleRow, s: SkillId) => Math.max(0, r.required[s] - r.current[s]);

function roleReadiness(r: RoleRow, skills: Skill[], digitalOnly = false) {
  let have = 0;
  let need = 0;
  for (const s of skills) {
    if (digitalOnly && !s.digital) continue;
    need += r.required[s.id];
    have += Math.min(r.current[s.id], r.required[s.id]);
  }
  return need ? (have / need) * 100 : 100;
}

function weightedReadiness(roles: RoleRow[], skills: Skill[], digitalOnly = false) {
  const hc = roles.reduce((a, r) => a + r.headcount, 0) || 1;
  return roles.reduce((a, r) => a + roleReadiness(r, skills, digitalOnly) * r.headcount, 0) / hc;
}

function skillGaps(roles: RoleRow[], skills: Skill[]) {
  const total = roles.reduce((a, r) => a + r.headcount, 0) || 1;
  return skills
    .map((s) => {
      const affected = roles.filter((r) => gapOf(r, s.id) > 0);
      const people = affected.reduce((a, r) => a + r.headcount, 0);
      const levelGap = roles.reduce((a, r) => a + gapOf(r, s.id) * r.headcount, 0);
      const maxGap = roles.reduce((a, r) => Math.max(a, gapOf(r, s.id)), 0);
      return { skill: s, affected, people, share: people / total, levelGap, maxGap };
    })
    .sort((a, b) => b.levelGap - a.levelGap);
}

// ---------------- Plan generator ----------------
const COURSES: Record<SkillId, { names: [string, string, string]; modes: [Mode, Mode]; base: number }> = {
  craft: { names: ["Advanced craft masterclass & cross-training", "Multi-skilling programme for core processes", "Expert craft certification track"], modes: ["On-the-job", "On-site"], base: 3 },
  safety: { names: ["Industrial safety & risk awareness", "Machine guarding & lock-out/tag-out", "Safety leadership on the shop floor"], modes: ["On-site", "On-site"], base: 1 },
  lean: { names: ["Lean, 5S & standard work", "Daily management & visual boards", "Kaizen problem-solving bootcamp"], modes: ["Blended", "On-site"], base: 2 },
  erp: { names: ["ERP fundamentals for operations", "ERP transactions by role (hands-on sandbox)", "ERP super-user programme"], modes: ["Blended", "Online"], base: 2 },
  data: { names: ["Data literacy for factory teams", "Reading dashboards & KPIs", "Excel-to-insight: practical analytics"], modes: ["Online", "Blended"], base: 3 },
  conn: { names: ["Machine connectivity & IoT basics", "Connected machines: setup and troubleshooting", "CNC programming & digital machine data"], modes: ["On-site", "Blended"], base: 4 },
  dqc: { names: ["Digital QC: tablets, checklists & SPC", "Statistical process control in practice", "Digital inspection & defect analytics"], modes: ["Blended", "On-site"], base: 3 },
  ecom: { names: ["E-commerce & export essentials", "B2B marketplaces and digital export sales", "Export documentation & online buyer handling"], modes: ["Online", "Blended"], base: 3 },
};
const START = { High: ["Dec 2026", "Jan 2027"], Medium: ["Feb 2027", "Mar 2027"], Low: ["Apr 2027", "May 2027"] } as const;

function buildPlan(roles: RoleRow[], skills: Skill[], version: number): PlanItem[] {
  return skillGaps(roles, skills)
    .filter((g) => g.levelGap > 0)
    .map((g, i) => {
      const c = COURSES[g.skill.id];
      const mode = c.modes[version % 2];
      const priority: Priority = i < 2 ? "High" : i < 5 ? "Medium" : "Low";
      const size = mode === "Online" ? 25 : mode === "On-the-job" ? 8 : 15;
      return {
        id: `p-${g.skill.id}-${version}`,
        skillId: g.skill.id,
        course: c.names[version % 3],
        roles: g.affected.map((r) => r.name),
        participants: g.people,
        cohorts: Math.max(1, Math.ceil(g.people / size)),
        weeks: c.base + g.maxGap + (version % 2),
        mode,
        priority,
        start: START[priority][version % 2],
      };
    });
}

// ---------------- Cell styling ----------------
function cellTone(cur: number, req: number) {
  if (req === 0 && cur === 0) return "bg-navy-900/[0.03] text-navy-500/60";
  const g = cur - req;
  if (g >= 0) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (g === -1) return "bg-amber-50 text-amber-800 ring-amber-200";
  if (g === -2) return "bg-orange-100 text-orange-800 ring-orange-300";
  return "bg-red-100 text-red-800 ring-red-300";
}

const PRIORITY_TONE = { High: "bad", Medium: "warn", Low: "info" } as const;

// ---------------- Component ----------------
export default function TalentWorkforce({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<TalentData>(service.id, seed);
  const { busy, run } = useSimulatedAI();
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const fname = locale === "ar" ? (factory.nameAr || factory.name) : factory.name;
  // Skill names are stored in English; the generic "<industry> production craft" name is a template.
  const skillName = (s: Skill) => { const m = /^(.+) production craft$/.exec(s.name); return m && m[1] !== "Core" ? t("{industry} production craft", { industry: t(m[1]) }) : t(s.name); };
  const [selected, setSelected] = useState<{ roleId: string; skillId: SkillId } | null>(null);
  const [digitalOnly, setDigitalOnly] = useState<"all" | "digital">("all");
  const [tab, setTab] = useState("matrix");

  const { skills, roles } = data;
  const headcount = roles.reduce((a, r) => a + r.headcount, 0);
  const overall = weightedReadiness(roles, skills);
  const digital = weightedReadiness(roles, skills, true);
  const gaps = useMemo(() => skillGaps(roles, skills), [roles, skills]);
  const digitalGaps = gaps.filter((g) => g.skill.digital);
  const criticalCells = roles.reduce((a, r) => a + skills.filter((s) => gapOf(r, s.id) >= 2).length, 0);
  const reskillPeople = roles.filter((r) => skills.some((s) => s.digital && gapOf(r, s.id) > 0)).reduce((a, r) => a + r.headcount, 0);
  const visibleSkills = digitalOnly === "digital" ? skills.filter((s) => s.digital) : skills;
  const maxLevelGap = Math.max(1, ...digitalGaps.map((g) => g.levelGap));

  const selRole = selected ? roles.find((r) => r.id === selected.roleId) : undefined;
  const selSkill = selected ? skills.find((s) => s.id === selected.skillId) : undefined;

  const setLevel = (kind: "current" | "required", level: Level) => {
    if (!selected) return;
    setData((d) => ({ ...d, planStatus: "draft", roles: d.roles.map((r) => (r.id === selected.roleId ? { ...r, [kind]: { ...r[kind], [selected.skillId]: level } } : r)) }));
  };

  const regenerate = () =>
    run("talent-plan", () => {
      setData((d) => ({ ...d, planVersion: d.planVersion + 1, plan: buildPlan(d.roles, d.skills, d.planVersion + 1), planStatus: "draft", approvedAt: undefined }));
      toast.success(t("Training plan regenerated from the current skills matrix"));
    });
  const approve = () => {
    setData((d) => ({ ...d, planStatus: "approved", approvedAt: Date.now() }));
    toast.success(t("Training & reskilling plan approved"), { description: t("Shared with HR and line supervisors (simulated).") });
  };
  const updatePlan = (id: string, patch: Partial<PlanItem>) => setData((d) => ({ ...d, planStatus: "draft", plan: d.plan.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const adjustNeed = (id: string, k: "need12" | "need24", delta: number) => setData((d) => ({ ...d, roles: d.roles.map((x) => (x.id === id ? { ...x, [k]: Math.max(0, x[k] + delta) } : x)) }));

  const plan = data.plan;
  const trainingSeats = plan.reduce((a, p) => a + p.participants, 0);
  const totalCohorts = plan.reduce((a, p) => a + p.cohorts, 0);

  const need12 = roles.reduce((a, r) => a + r.need12, 0);
  const need24 = roles.reduce((a, r) => a + r.need24, 0);
  const chartData = roles.map((r) => ({ name: t(r.name), Now: r.headcount, "12 months": r.need12, "24 months": r.need24 }));
  const fastest = [...roles].sort((a, b) => b.need24 / Math.max(1, b.headcount) - a.need24 / Math.max(1, a.headcount))[0];
  const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <WorkspaceFrame service={service} onReset={() => { reset(); setSelected(null); }}>
      {/* Summary band */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-5 text-white shadow-card">
          <div className="pointer-events-none absolute -bottom-16 -end-10 size-48 rounded-full bg-teal-500/20 blur-3xl" aria-hidden />
          <div className="relative flex items-center gap-5">
            <ScoreRing value={digital} size={112} stroke={10} color="#2DBFB0" track="rgba(255,255,255,0.1)" label={t("Digital readiness")} sublabel={t("digital")} dark />
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-300">{t("Digital readiness")}</div>
              <p className="mt-1 text-sm text-white/75">{t("Headcount-weighted share of required digital skill levels in place across {count} role categories.", { count: roles.length })}</p>
              <div className="mt-2 text-xs text-white/60">{t("Overall skills readiness")} <span className="font-semibold tabular-nums text-white">{Math.round(overall)}%</span></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiTile label={t("Workforce")} value={headcount} icon={<Users />} hint={t("{count} role categories", { count: roles.length })} />
          <KpiTile label={t("Critical gaps")} value={criticalCells} tone={criticalCells > 6 ? "bad" : "warn"} delta={t("≥2 lvls")} icon={<Grid3x3 />} hint={t("Role × skill cells")} />
          <KpiTile label={t("People to reskill")} value={reskillPeople} icon={<Cpu />} hint={t("{pct}% need digital upskilling", { pct: Math.round((reskillPeople / Math.max(1, headcount)) * 100) })} />
          <KpiTile label={t("Training plan")} value={<span className="text-lg">{data.planStatus === "approved" ? t("Approved") : t("Draft")}</span>} icon={<GraduationCap />} hint={t("{programmes} programmes · {cohorts} cohorts", { programmes: plan.length, cohorts: totalCohorts })} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="matrix"><Grid3x3 /> {t("Skills matrix")}</TabsTrigger>
            <TabsTrigger value="plan"><GraduationCap /> {t("Training plan")}</TabsTrigger>
            <TabsTrigger value="workforce"><TrendingUp /> {t("Workforce plan")}</TabsTrigger>
          </TabsList>
        </div>

        {/* ---------- Skills matrix ---------- */}
        <TabsContent value="matrix" className="mt-4 space-y-4 focus-visible:outline-none">
          <Panel
            title={t("Skills matrix — current vs required level")}
            description={t("Each cell shows current / required level (0 None → 4 Expert). Click a cell to adjust; changes are saved and feed the plan.")}
            actions={<Segmented size="sm" ariaLabel={t("Skill filter")} value={digitalOnly} onChange={setDigitalOnly} options={[{ value: "all", label: t("All") }, { value: "digital", label: t("Digital") }]} />}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="sticky start-0 z-10 bg-white px-4 py-3 text-start text-xs font-semibold text-muted">{t("Role category")}</th>
                    {visibleSkills.map((s) => (
                      <th key={s.id} scope="col" className="px-1.5 py-3 text-center align-bottom text-[11px] font-semibold leading-tight text-navy-700" title={skillName(s)}>
                        <div className="flex flex-col items-center gap-1">
                          {s.digital ? <span className="rounded-full bg-teal-50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-teal-700">{t("Digital")}</span> : <span className="h-[14px]" />}
                          <span className="max-w-[92px]">{t(s.short === "Lean" ? "Lean||manufacturing" : s.short)}</span>
                        </div>
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3 text-end text-xs font-semibold text-muted">{t("Readiness")}</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => {
                    const ready = roleReadiness(r, skills);
                    return (
                      <tr key={r.id}>
                        <th scope="row" className="sticky start-0 z-10 border-t border-line bg-white px-4 py-2 text-start font-medium text-navy-900">
                          <div className="whitespace-nowrap">{t(r.name)}</div>
                          <div className="text-[11px] font-normal text-muted">{t("{count} people", { count: r.headcount })}</div>
                        </th>
                        {visibleSkills.map((s) => {
                          const cur = r.current[s.id];
                          const req = r.required[s.id];
                          const isSel = selected?.roleId === r.id && selected.skillId === s.id;
                          return (
                            <td key={s.id} className="border-t border-line px-1 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => setSelected(isSel ? null : { roleId: r.id, skillId: s.id })}
                                aria-pressed={isSel}
                                aria-label={t("{role}, {skill}: current {current}, required {required}", { role: t(r.name), skill: skillName(s), current: t(LEVEL_NAMES[cur]), required: t(LEVEL_NAMES[req]) })}
                                className={cn("mx-auto flex h-10 w-full min-w-[60px] max-w-[84px] items-center justify-center rounded-lg text-xs font-semibold tabular-nums ring-1 ring-inset ring-transparent transition hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 motion-reduce:transition-none motion-reduce:hover:scale-100", cellTone(cur, req), isSel && "ring-2 ring-navy-900")}
                              >
                                {req === 0 && cur === 0 ? "—" : <>{cur}<span className="mx-0.5 opacity-50">/</span>{req}</>}
                              </button>
                            </td>
                          );
                        })}
                        <td className="border-t border-line px-4 py-2">
                          <div className="ms-auto flex w-28 items-center gap-2">
                            <Progress value={ready} className="h-1.5" barClassName={ready >= 80 ? "bg-emerald-500" : ready >= 60 ? "bg-amber-500" : "bg-red-500"} />
                            <span className="w-9 text-end text-xs font-semibold tabular-nums text-navy-800">{Math.round(ready)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3 text-[11px] text-muted">
              <span className="font-semibold text-navy-700">{t("Gap legend")}</span>
              {[["bg-emerald-50 ring-emerald-200", "Meets requirement"], ["bg-amber-50 ring-amber-200", "1 level short"], ["bg-orange-100 ring-orange-300", "2 levels short"], ["bg-red-100 ring-red-300", "3+ levels short"]].map(([c, l]) => (
                <span key={l} className="inline-flex items-center gap-1.5"><span className={cn("size-3 rounded ring-1 ring-inset", c)} />{t(l)}</span>
              ))}
            </div>
            <AnimatePresence initial={false}>
              {selRole && selSkill ? (
                <motion.div key="editor" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} className="overflow-hidden border-t border-line bg-canvas/60">
                  <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start">
                    <div className="min-w-0 md:w-56">
                      <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">{t("Adjust cell")}</div>
                      <div className="mt-1 font-semibold text-navy-900">{t(selRole.name)}</div>
                      <div className="text-sm text-muted">{skillName(selSkill)} · {t("{count} people", { count: selRole.headcount })}</div>
                    </div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      {(["current", "required"] as const).map((kind) => (
                        <div key={kind}>
                          <div className="mb-1.5 text-xs font-semibold text-navy-700">{kind === "current" ? t("Current level (assessed)") : t("Required level (roadmap)")}</div>
                          <div role="radiogroup" aria-label={kind === "current" ? t("current level") : t("required level")} className="flex gap-1">
                            {LEVEL_NAMES.map((n, lvl) => {
                              const active = selRole[kind][selSkill.id] === lvl;
                              return (
                                <button key={n} type="button" role="radio" aria-checked={active} title={t(n)} onClick={() => setLevel(kind, lvl as Level)} className={cn("flex h-11 flex-1 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", active ? (kind === "current" ? "border-teal-500 bg-teal-500 text-white" : "border-navy-900 bg-navy-900 text-white") : "border-line bg-white text-navy-700 hover:border-navy-500/40")}>
                                  {lvl}
                                  <span className={cn("hidden text-[9px] font-medium sm:block", active ? "text-white/80" : "text-muted")}>{t(n)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label={t("Close cell editor")} className="self-end md:self-start"><X /></Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <Panel title={t("Digital-skills gap ranking")} description={t("Gap = levels missing × people affected. Drives programme priority.")}>
              <ol className="space-y-3">
                {digitalGaps.map((g, i) => (
                  <li key={g.skill.id} className="flex items-center gap-3">
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", g.levelGap === 0 ? "bg-emerald-50 text-emerald-700" : i === 0 ? "bg-red-50 text-red-700" : i < 3 ? "bg-amber-50 text-amber-700" : "bg-navy-900/5 text-navy-700")}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-navy-900">{skillName(g.skill)}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted">{t("{count} people", { count: g.people })} · {Math.round(g.share * 100)}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-900/[0.05]">
                        <motion.div className="h-full rounded-full" style={{ backgroundColor: i === 0 ? "#EF4444" : i < 3 ? "#F59E0B" : CHART_COLORS[0] }} initial={reduce ? false : { width: 0 }} animate={{ width: `${(g.levelGap / maxLevelGap) * 100}%` }} transition={{ duration: reduce ? 0 : 0.6 }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title={t("Readiness by role category")} description={t("Share of required skill levels in place — all skills vs digital.")}>
              <div className="space-y-3">
                {[...roles].sort((a, b) => roleReadiness(a, skills) - roleReadiness(b, skills)).map((r) => {
                  const all = roleReadiness(r, skills);
                  const dig = roleReadiness(r, skills, true);
                  return (
                    <div key={r.id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-navy-900">{t(r.name)}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted"><span className="font-semibold text-navy-800">{Math.round(all)}%</span> · {t("{pct}% digital", { pct: Math.round(dig) })}</span>
                      </div>
                      <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-navy-900/[0.05]">
                        <div className="absolute inset-y-0 start-0 rounded-full bg-navy-900/20 transition-[width] duration-500" style={{ width: `${all}%` }} />
                        <div className="absolute inset-y-0 start-0 rounded-full bg-teal-500 transition-[width] duration-500" style={{ width: `${dig}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 pt-1 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-navy-900/20" />{t("Overall")}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-teal-500" />{t("Digital")}</span>
                </div>
              </div>
            </Panel>
          </div>
          {digitalGaps[0] && digitalGaps[0].levelGap > 0 ? (
            <AIInsight title={t("Skills agent")}>
              {t("The largest digital gap at {name} is {skill}, affecting {people} people across {roles} role categories.", { name: fname, skill: skillName(digitalGaps[0].skill), people: digitalGaps[0].people, roles: digitalGaps[0].affected.length })}
              {digitalGaps[1] && digitalGaps[1].levelGap > 0 ? <> {t("Pair it with {skill} in the first training wave so new systems are adopted on the shop floor, not only in the office.", { skill: skillName(digitalGaps[1].skill) })}</> : null}
            </AIInsight>
          ) : null}
        </TabsContent>

        {/* ---------- Training plan ---------- */}
        <TabsContent value="plan" className="mt-4 space-y-4 focus-visible:outline-none">
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700"><GraduationCap className="size-5" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2 font-semibold text-navy-900">
                  {t("Training & reskilling plan")} <span className="text-xs font-normal text-muted">v{data.planVersion + 1}</span>
                  {data.planStatus === "approved" ? <StatusPill tone="good"><BadgeCheck /> {t("Approved")}</StatusPill> : <StatusPill tone="warn">{t("Draft")}</StatusPill>}
                </div>
                <div className="text-xs text-muted">{t("{programmes} programmes · {cohorts} cohorts · {seats} training seats · generated from the skills matrix", { programmes: plan.length, cohorts: totalCohorts, seats: trainingSeats })}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={regenerate} disabled={busy !== null}><RefreshCw className={cn(busy && "animate-spin motion-reduce:animate-none")} /> {busy ? t("Generating…") : t("Regenerate")}</Button>
              <Button variant="accent" size="sm" onClick={approve} disabled={busy !== null || data.planStatus === "approved" || plan.length === 0}><BadgeCheck /> {t("Approve plan")}</Button>
            </div>
          </div>

          {busy ? (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-teal-700"><Sparkles className="size-4" /> {t("Learning agent is re-sequencing programmes from current gaps…")}</div>
              <WritingShimmer lines={5} />
            </div>
          ) : plan.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">{t("No programmes in the plan. Regenerate to build one from the current skills matrix.")}</div>
          ) : (
            <ol className="relative space-y-3 before:absolute before:bottom-6 before:start-[19px] before:top-6 before:w-px before:bg-line">
              {plan.map((p, i) => {
                const skill = skills.find((s) => s.id === p.skillId);
                return (
                  <motion.li key={p.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : i * 0.04 }} className="relative flex gap-3">
                    <span className={cn("relative z-[1] mt-4 grid size-10 shrink-0 place-items-center rounded-full border-4 border-canvas text-xs font-bold", p.priority === "High" ? "bg-red-500 text-white" : p.priority === "Medium" ? "bg-amber-400 text-navy-950" : "bg-sky-100 text-sky-800")}>{i + 1}</span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-line bg-white p-4 shadow-card">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <EditableText value={t(p.course)} onChange={(v) => updatePlan(p.id, { course: v })} ariaLabel={t("programme name")} className="-ms-2 font-semibold text-navy-900" />
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            {skill?.digital ? <Badge tone="teal">{t("Digital")}</Badge> : <Badge>{t("Core")}</Badge>}
                            <span>{t("Closes gap in {skill}", { skill: skill ? skillName(skill) : "" })}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => updatePlan(p.id, { priority: p.priority === "High" ? "Medium" : p.priority === "Medium" ? "Low" : "High" })} aria-label={t("Priority {priority}, click to change", { priority: t(p.priority) })} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                            <StatusPill tone={PRIORITY_TONE[p.priority]}>{t(p.priority + " priority")}</StatusPill>
                          </button>
                          <Button variant="ghost" size="icon" className="size-7" aria-label={t("Remove programme")} onClick={() => setData((d) => ({ ...d, planStatus: "draft", plan: d.plan.filter((x) => x.id !== p.id) }))}><Trash2 className="!size-3.5" /></Button>
                        </div>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                        <div><dt className="text-muted">{t("Participants")}</dt><dd className="font-semibold tabular-nums text-navy-900">{p.participants}</dd></div>
                        <div><dt className="text-muted">{t("Cohorts")}</dt><dd className="font-semibold tabular-nums text-navy-900">{p.cohorts}</dd></div>
                        <div><dt className="text-muted">{t("Duration")}</dt><dd className="font-semibold tabular-nums text-navy-900">{t("{count} weeks", { count: p.weeks })}</dd></div>
                        <div>
                          <dt className="text-muted">{t("Delivery")}</dt>
                          <dd>
                            <select aria-label={t("Delivery mode")} value={p.mode} onChange={(e) => updatePlan(p.id, { mode: e.target.value as Mode })} className="-ms-1 rounded-md bg-transparent px-1 font-semibold text-navy-900 hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-teal-200">
                              {(["On-site", "Blended", "Online", "On-the-job"] as Mode[]).map((m) => <option key={m} value={m}>{t(m)}</option>)}
                            </select>
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[11px]">
                        <CalendarClock className="size-3.5 text-muted" /><span className="me-1 text-muted">{t("Starts {date}", { date: t(p.start) })} ·</span>
                        {p.roles.map((r) => <span key={r} className="rounded-full bg-navy-900/5 px-2 py-0.5 text-navy-700">{t(r)}</span>)}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
          <p className="text-xs text-muted">{t("Training providers, costs and accreditation are not assessed in this demo. Individual assessments require employee consent and an HR policy.")}</p>
        </TabsContent>

        {/* ---------- Workforce plan ---------- */}
        <TabsContent value="workforce" className="mt-4 space-y-4 focus-visible:outline-none">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiTile label={t("Headcount now")} value={headcount} />
            <KpiTile label={t("Needed in 12 months")} value={need12} delta={signed(need12 - headcount)} />
            <KpiTile label={t("Needed in 24 months")} value={need24} delta={signed(need24 - headcount)} tone={need24 - headcount > headcount * 0.12 ? "warn" : "neutral"} />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <Panel title={t("Headcount now vs needed")} description={t("By role category, from the production and digital roadmap.")}>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barGap={1} barCategoryGap="22%">
                    <CartesianGrid horizontal={false} stroke="#EEF1F5" />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={118} tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(11,31,58,0.04)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Now" name={t("Now")} fill={CHART_COLORS[1]} radius={[0, 3, 3, 0]} isAnimationActive={!reduce} />
                    <Bar dataKey="12 months" name={t("12 months")} fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]} isAnimationActive={!reduce} />
                    <Bar dataKey="24 months" name={t("24 months")} fill={CHART_COLORS[2]} radius={[0, 3, 3, 0]} isAnimationActive={!reduce} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title={t("Planning table")} description={t("Adjust the 12- and 24-month needs; changes are saved.")} bodyClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead>
                    <tr className="text-start text-xs text-muted">
                      <th scope="col" className="px-4 py-2.5 font-semibold">{t("Role")}</th>
                      <th scope="col" className="px-2 py-2.5 text-end font-semibold">{t("Now")}</th>
                      <th scope="col" className="px-2 py-2.5 text-center font-semibold">{t("12 m")}</th>
                      <th scope="col" className="px-2 py-2.5 text-center font-semibold">{t("24 m")}</th>
                      <th scope="col" className="px-4 py-2.5 text-end font-semibold">{t("Δ 24 m")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => {
                      const d = r.need24 - r.headcount;
                      return (
                        <tr key={r.id} className="border-t border-line">
                          <td className="px-4 py-2 font-medium text-navy-900">{t(r.name)}</td>
                          <td className="px-2 py-2 text-end tabular-nums text-muted">{r.headcount}</td>
                          {(["need12", "need24"] as const).map((k) => {
                            const lbl = t(k === "need12" ? "{role} 12-month need" : "{role} 24-month need", { role: t(r.name) });
                            return (
                              <td key={k} className="px-2 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button type="button" aria-label={t("Decrease {label}", { label: lbl })} onClick={() => adjustNeed(r.id, k, -1)} className="grid size-6 place-items-center rounded-md text-muted hover:bg-canvas hover:text-navy-900"><Minus className="size-3" /></button>
                                  <span className="w-8 text-center font-semibold tabular-nums text-navy-900">{r[k]}</span>
                                  <button type="button" aria-label={t("Increase {label}", { label: lbl })} onClick={() => adjustNeed(r.id, k, 1)} className="grid size-6 place-items-center rounded-md text-muted hover:bg-canvas hover:text-navy-900"><Plus className="size-3" /></button>
                                </div>
                              </td>
                            );
                          })}
                          <td className={cn("px-4 py-2 text-end font-semibold tabular-nums", d > 0 ? "text-teal-700" : d < 0 ? "text-amber-700" : "text-muted")}>{signed(d)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
          {fastest ? (
            <AIInsight title={t("Workforce planning agent")}>
              {t("{name} needs {delta} people over 24 months. The fastest-growing category is {role} ({from} → {to}).", { name: fname, delta: signed(need24 - headcount), role: t(fastest.name), from: fastest.headcount, to: fastest.need24 })}
              {" "}{t("Fill roughly a third of new positions through internal reskilling from the highest-readiness roles, and start recruiting {role} at least two quarters ahead of new capacity.", { role: locale === "ar" ? t(fastest.name) : fastest.name.toLowerCase() })}
            </AIInsight>
          ) : null}
        </TabsContent>
      </Tabs>
    </WorkspaceFrame>
  );
}
