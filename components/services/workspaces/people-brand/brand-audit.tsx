"use client";

// Service 12 — Digital Brand Audit & Online Reputation Monitoring.
// Visibility score with breakdown, digital-presence checklist (fixes update the score), simulated
// reputation trend and review feed, competitor benchmark vs fictional competitors, prioritised actions.
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { CheckCircle2, Circle, CircleDashed, FlaskConical, Frown, Globe, ListChecks, Meh, MessageSquareReply, Radar as RadarIcon, ScanSearch, Smile, Sparkles, Star, Trophy, Wand2 } from "lucide-react";
import { AIInsight, CHART_COLORS, EditableText, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Badge, Button } from "@/components/ui";
import { useActiveFactory } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Factory } from "@/lib/types";
import { AXIS_TICK, ScoreRing, Segmented, TOOLTIP_STYLE, WritingShimmer, clamp, rngFrom, useSimulatedAI } from "./shared";

// ---------------- Types ----------------
type ItemStatus = "missing" | "partial" | "done";
type Category = "Website & search" | "Listings" | "Social" | "Reviews" | "Consistency";
type Sentiment = "positive" | "neutral" | "negative";
type Level = "High" | "Medium" | "Low";
type ActionStatus = "open" | "in-progress" | "done";

interface CheckItem { id: string; label: string; category: Category; weight: number; status: ItemStatus; finding: string; fix: string }
interface Action { id: string; title: string; checkId?: string; impact: Level; effort: Level; owner: string; due: string; status: ActionStatus }
interface AuditData { checklist: CheckItem[]; actions: Action[]; replies: Record<string, string>; filter: "all" | Sentiment; rival: number }

const CATEGORIES: Category[] = ["Website & search", "Listings", "Social", "Reviews", "Consistency"];
const OWNERS = ["Unassigned", "Managing Director", "Marketing lead", "Sales coordinator", "Admin / IT"];
const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

// ---------------- Checklist seeds ----------------
const BASE_ITEMS: Omit<CheckItem, "status" | "finding">[] = [
  { id: "website", label: "Professional website", category: "Website & search", weight: 20, fix: "Launch a bilingual product website with contact and quote forms" },
  { id: "seo", label: "Search visibility for product keywords", category: "Website & search", weight: 8, fix: "Add product pages targeting buyer search terms in EN and AR" },
  { id: "google", label: "Google Business profile", category: "Listings", weight: 14, fix: "Claim and verify the profile; add photos, hours and categories" },
  { id: "b2b", label: "B2B marketplace listings", category: "Listings", weight: 12, fix: "List core products on two B2B marketplaces with specs and MOQ" },
  { id: "linkedin", label: "LinkedIn company page", category: "Social", weight: 10, fix: "Create the page, add capabilities and post twice a month" },
  { id: "social", label: "Active Facebook / Instagram", category: "Social", weight: 8, fix: "Publish a monthly content calendar from the brand studio" },
  { id: "reviews", label: "Customer reviews & responses", category: "Reviews", weight: 12, fix: "Request reviews after delivery and reply to every review within 48 h" },
  { id: "nap", label: "Consistent name, address & phone (NAP)", category: "Consistency", weight: 10, fix: "Use one business phone, address and name format on every channel" },
  { id: "bilingual", label: "Bilingual Arabic / English content", category: "Consistency", weight: 10, fix: "Publish key pages and listings in both Arabic and English" },
];

const FINDINGS: Record<"al-noor" | "delta", Record<string, [ItemStatus, string]>> = {
  "al-noor": {
    website: ["missing", "No website found; buyers rely on referrals and WhatsApp"],
    seo: ["missing", "Not found in the first results for “cotton knit fabric Egypt”"],
    google: ["partial", "Unclaimed map listing created by a customer; wrong opening hours"],
    b2b: ["missing", "No listings on major B2B marketplaces"],
    linkedin: ["missing", "No company page; two employees list the factory as employer"],
    social: ["partial", "Facebook page inactive since 2023, 640 followers"],
    reviews: ["partial", "5 map reviews, none answered"],
    nap: ["missing", "Three different phone numbers across listings"],
    bilingual: ["partial", "Facebook page in Arabic only"],
  },
  delta: {
    website: ["done", "Corporate website live, English, updated 2025"],
    seo: ["partial", "Ranks for brand name; weak for “steering knuckle supplier”"],
    google: ["done", "Verified profile with photos and 4.4★ rating"],
    b2b: ["partial", "Listed on one marketplace; specs incomplete"],
    linkedin: ["done", "Active page, 3.1k followers, monthly posts"],
    social: ["partial", "Facebook used for hiring only; no Instagram"],
    reviews: ["partial", "Reviews mostly from job seekers; few customer reviews"],
    nap: ["partial", "Old Cairo office address still on two directories"],
    bilingual: ["partial", "Website English only; Arabic content missing"],
  },
};

function seedChecklist(f: Factory): CheckItem[] {
  const key = seedKeyFor(f);
  if (key !== "generic") return BASE_ITEMS.map((b) => ({ ...b, status: FINDINGS[key][b.id][0], finding: FINDINGS[key][b.id][1] }));
  const r = rngFrom(`audit:${f.id}:${f.name}`);
  const site = f.systems.find((s) => /web/i.test(s.name))?.status;
  return BASE_ITEMS.map((b) => {
    const status: ItemStatus = b.id === "website" ? (site === "active" ? "done" : site === "partial" ? "partial" : "missing") : (["missing", "partial", "partial", "done"] as const)[Math.floor(r() * 4)];
    const finding = status === "done" ? "Present and up to date" : status === "partial" ? "Present but incomplete or inconsistent" : "Not found during the scan";
    return { ...b, status, finding };
  });
}

const ACTION_TEXT: Record<string, string> = {
  website: "Launch bilingual website with quote form",
  seo: "Publish keyword-targeted product pages",
  google: "Claim & verify Google Business profile",
  b2b: "Create B2B marketplace listings for top products",
  linkedin: "Set up LinkedIn page and posting rhythm",
  social: "Restart social posting with a monthly calendar",
  reviews: "Start review requests and 48-hour replies",
  nap: "Unify business name, address and phone everywhere",
  bilingual: "Translate key pages and listings into Arabic/English",
};

function actionsFor(items: CheckItem[], existing: Action[], round: number): Action[] {
  const due = ["Dec 2026", "Jan 2027", "Feb 2027", "Mar 2027"];
  return items
    .filter((i) => i.status !== "done" && !existing.some((a) => a.checkId === i.id))
    .sort((a, b) => b.weight * (b.status === "missing" ? 2 : 1) - a.weight * (a.status === "missing" ? 2 : 1))
    .map((i, n) => {
      const impact: Level = i.weight >= 12 ? "High" : i.weight >= 10 ? "Medium" : "Low";
      const effort: Level = ["website", "b2b", "bilingual"].includes(i.id) ? "High" : ["seo", "social", "reviews"].includes(i.id) ? "Medium" : "Low";
      return { id: `a-${i.id}-${round}`, title: ACTION_TEXT[i.id] ?? i.fix, checkId: i.id, impact, effort, owner: "Unassigned", due: due[Math.min(due.length - 1, Math.floor(n / 2))], status: "open" as ActionStatus };
    });
}

function seed(f: Factory): AuditData {
  const checklist = seedChecklist(f);
  return { checklist, actions: actionsFor(checklist, [], 0), replies: {}, filter: "all", rival: 0 };
}

// ---------------- Reviews & monitoring (simulated, deterministic) ----------------
interface Review { id: string; source: string; rating: number; sentiment: Sentiment; themes: string[]; text: string; when: string; author: string }

const REVIEWS: Record<"al-noor" | "delta" | "generic", Review[]> = {
  "al-noor": [
    { id: "r1", source: "Google Maps", rating: 5, sentiment: "positive", themes: ["Fabric quality"], text: "Excellent piqué quality, colours matched our sample exactly. Will order again for the summer collection.", when: "3 weeks ago", author: "Apparel brand buyer, Cairo" },
    { id: "r2", source: "Facebook", rating: 2, sentiment: "negative", themes: ["Delivery time", "Communication"], text: "Order was ten days late and it was hard to reach anyone. Quality was fine once it arrived.", when: "1 month ago", author: "Uniform distributor, Alexandria" },
    { id: "r3", source: "Google Maps", rating: 4, sentiment: "positive", themes: ["Price", "Fabric quality"], text: "Good prices for hospital linen and it survives our laundry well.", when: "2 months ago", author: "Procurement officer, private hospital" },
    { id: "r4", source: "B2B forum", rating: 3, sentiment: "neutral", themes: ["Communication"], text: "Seems a capable mill but there is no website or catalogue to share with our team.", when: "2 months ago", author: "Sourcing agent, Dubai" },
    { id: "r5", source: "Google Maps", rating: 5, sentiment: "positive", themes: ["Service"], text: "The owner personally handled our sampling. Very helpful family business.", when: "4 months ago", author: "Start-up fashion label, Giza" },
    { id: "r6", source: "Facebook", rating: 2, sentiment: "negative", themes: ["Sizing"], text: "Second batch of T-shirts had inconsistent sizing on XL.", when: "5 months ago", author: "Retail shop owner, Mansoura" },
  ],
  delta: [
    { id: "r1", source: "Google Maps", rating: 5, sentiment: "positive", themes: ["Quality", "Traceability"], text: "Audit-ready documentation and consistent run-out results on brake discs. A reliable partner.", when: "2 weeks ago", author: "Supplier quality engineer, assembler" },
    { id: "r2", source: "LinkedIn", rating: 4, sentiment: "positive", themes: ["Engineering support"], text: "Their engineering team turned around our knuckle drawing review in two days.", when: "1 month ago", author: "Purchasing manager, tier-one supplier" },
    { id: "r3", source: "Job board", rating: 3, sentiment: "neutral", themes: ["Workplace"], text: "Modern machines and good training, but long overtime in maintenance.", when: "1 month ago", author: "Former technician" },
    { id: "r4", source: "B2B marketplace", rating: 2, sentiment: "negative", themes: ["Response time"], text: "Sent an RFQ through the marketplace and waited a week for a reply.", when: "2 months ago", author: "Aftermarket distributor, Riyadh" },
    { id: "r5", source: "Google Maps", rating: 5, sentiment: "positive", themes: ["Delivery"], text: "On-time deliveries for 18 months straight on our shaft programme.", when: "3 months ago", author: "Logistics lead, gearbox maker" },
    { id: "r6", source: "Job board", rating: 2, sentiment: "negative", themes: ["Workplace"], text: "Night shift transport is unreliable.", when: "4 months ago", author: "Machine operator" },
  ],
  generic: [
    { id: "r1", source: "Google Maps", rating: 5, sentiment: "positive", themes: ["Quality"], text: "Consistent quality across three orders.", when: "1 month ago", author: "Distributor (fictional)" },
    { id: "r2", source: "Facebook", rating: 3, sentiment: "neutral", themes: ["Communication"], text: "Good product, but hard to find specifications online.", when: "2 months ago", author: "Industrial buyer (fictional)" },
    { id: "r3", source: "Google Maps", rating: 2, sentiment: "negative", themes: ["Delivery time"], text: "Delivery took longer than promised.", when: "3 months ago", author: "Retailer (fictional)" },
    { id: "r4", source: "B2B forum", rating: 4, sentiment: "positive", themes: ["Price"], text: "Competitive pricing for local manufacture.", when: "4 months ago", author: "Sourcing agent (fictional)" },
  ],
};

const COMPETITORS: Record<"al-noor" | "delta" | "generic", { name: string; scores: number[] }[]> = {
  "al-noor": [
    { name: "Giza Jersey Works", scores: [72, 55, 60, 48, 40, 65] },
    { name: "Cairo Weave Group", scores: [85, 70, 78, 66, 72, 80] },
    { name: "Alex Cotton Knits", scores: [50, 35, 70, 58, 30, 40] },
  ],
  delta: [
    { name: "Ramadan Auto Parts", scores: [70, 52, 45, 60, 35, 55] },
    { name: "Suez Precision Components", scores: [88, 74, 66, 58, 70, 82] },
    { name: "Canal Brake Systems", scores: [64, 48, 38, 52, 60, 46] },
  ],
  generic: [
    { name: "Competitor A", scores: [70, 55, 60, 50, 45, 60] },
    { name: "Competitor B", scores: [82, 68, 72, 64, 70, 76] },
    { name: "Competitor C", scores: [52, 40, 62, 55, 35, 42] },
  ],
};
const DIMENSIONS = ["Website", "Search", "Social", "Reviews", "Bilingual", "B2B listings"] as const;

const statusValue = (s: ItemStatus) => (s === "done" ? 1 : s === "partial" ? 0.5 : 0);
// Reply templates (English keys; translated with {name} when drafted).
const REPLY: Record<Sentiment, string> = {
  positive: "Thank you for the kind words! The whole {name} team is glad the order met your expectations — we look forward to working with you again.",
  neutral: "Thank you for the feedback. We are improving how buyers can find our specifications online — please contact our sales team and {name} will share the full catalogue today.",
  negative: "We are sorry about this experience. It does not meet {name}'s standards. Our team will contact you within 24 hours to understand what happened and put it right.",
};

// ---------------- Component ----------------
export default function BrandAudit({ service }: WorkspaceProps) {
  const { factory, data, setData, reset } = useServiceWorkspace<AuditData>(service.id, seed);
  const { state } = useActiveFactory();
  const { busy, run } = useSimulatedAI();
  const reduce = useReducedMotion();
  const t = useT();
  const { locale } = useLocale();
  const fname = locale === "ar" ? (factory.nameAr || factory.name) : factory.name;
  const [openItem, setOpenItem] = useState<string | null>(null);
  const key = seedKeyFor(factory);

  // Website deployed through Jahez is auto-detected.
  const websiteLive = state.unlockedSolutions.includes("website");
  const items = data.checklist.map((i) => (i.id === "website" && websiteLive && i.status !== "done" ? { ...i, status: "done" as ItemStatus, finding: "Detected: Jahez AI website deployed", auto: true } : { ...i, auto: false }));

  const totalW = items.reduce((a, i) => a + i.weight, 0);
  const score = (items.reduce((a, i) => a + i.weight * statusValue(i.status), 0) / totalW) * 100;
  const byCategory = CATEGORIES.map((c) => {
    const ci = items.filter((i) => i.category === c);
    const w = ci.reduce((a, i) => a + i.weight, 0) || 1;
    return { category: c, score: (ci.reduce((a, i) => a + i.weight * statusValue(i.status), 0) / w) * 100 };
  });
  const st = (id: string) => statusValue(items.find((i) => i.id === id)?.status ?? "missing");
  const own = [st("website"), (st("seo") + st("google")) / 2, (st("linkedin") + st("social")) / 2, st("reviews"), st("bilingual"), st("b2b")].map((v) => Math.round(12 + v * 76));
  const competitors = COMPETITORS[key];
  const rival = competitors[clamp(data.rival, 0, competitors.length - 1)];
  const radarData = DIMENSIONS.map((d, i) => ({ dim: t(d), you: own[i], rival: rival.scores[i], avg: Math.round(competitors.reduce((a, c) => a + c.scores[i], 0) / competitors.length) }));
  const league = [{ name: factory.name, score: Math.round(own.reduce((a, b) => a + b, 0) / own.length), you: true }, ...competitors.map((c) => ({ name: c.name, score: Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length), you: false }))].sort((a, b) => b.score - a.score);
  const rank = league.findIndex((l) => l.you) + 1;

  // Simulated monitoring series
  const trend = useMemo(() => {
    const r = rngFrom(`audit-trend:${factory.id}`);
    const base = key === "delta" ? 34 : key === "al-noor" ? 6 : 10;
    const pos = key === "delta" ? 64 : key === "al-noor" ? 58 : 60;
    return MONTHS.map((m, i) => ({ month: t(m), mentions: Math.max(1, Math.round(base * (0.7 + r() * 0.6) + i * (base / 20))), positive: Math.round(clamp(pos + (r() - 0.5) * 18 + (i === 8 ? -14 : 0), 20, 95)) }));
  }, [factory.id, key, t]);
  const reviews = REVIEWS[key];
  const visibleReviews = data.filter === "all" ? reviews : reviews.filter((r) => r.sentiment === data.filter);
  const counts = { positive: reviews.filter((r) => r.sentiment === "positive").length, neutral: reviews.filter((r) => r.sentiment === "neutral").length, negative: reviews.filter((r) => r.sentiment === "negative").length };
  const themes = Object.entries(reviews.reduce<Record<string, { n: number; neg: number }>>((acc, r) => { for (const t of r.themes) { acc[t] = acc[t] ?? { n: 0, neg: 0 }; acc[t].n++; if (r.sentiment === "negative") acc[t].neg++; } return acc; }, {})).sort((a, b) => b[1].n - a[1].n);

  // Mutations
  const setItemStatus = (id: string, status: ItemStatus) =>
    setData((d) => ({
      ...d,
      checklist: d.checklist.map((i) => (i.id === id ? { ...i, status, finding: status === "done" ? "Fixed — verified in latest scan (simulated)" : i.finding } : i)),
      actions: status === "done" ? d.actions.map((a) => (a.checkId === id ? { ...a, status: "done" } : a)) : d.actions,
    }));
  const setAction = (id: string, patch: Partial<Action>) =>
    setData((d) => {
      const target = d.actions.find((a) => a.id === id);
      const actions = d.actions.map((a) => (a.id === id ? { ...a, ...patch } : a));
      const checklist = patch.status === "done" && target?.checkId ? d.checklist.map((i) => (i.id === target.checkId ? { ...i, status: "done" as ItemStatus, finding: "Fixed — verified in latest scan (simulated)" } : i)) : d.checklist;
      return { ...d, actions, checklist };
    });
  const generateActions = () =>
    run("actions", () =>
      setData((d) => {
        const fresh = actionsFor(d.checklist, d.actions.filter((a) => a.status !== "done"), Date.now() % 100000);
        if (!fresh.length) toast(t("No new gaps found — every open issue already has an action."));
        else toast.success(fresh.length === 1 ? t("1 corrective action added") : t("{count} corrective actions added", { count: fresh.length }));
        return { ...d, actions: [...d.actions, ...fresh] };
      })
    );
  const draftReply = (r: Review) => run(`reply-${r.id}`, () => setData((d) => ({ ...d, replies: { ...d.replies, [r.id]: t(REPLY[r.sentiment], { name: fname }) } })));

  const openActions = data.actions.filter((a) => a.status !== "done");
  const sortedActions = [...data.actions].sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || ["High", "Medium", "Low"].indexOf(a.impact) - ["High", "Medium", "Low"].indexOf(b.impact));
  const scoreColor = score >= 70 ? "#10B981" : score >= 45 ? "#F59E0B" : "#EF4444";

  return (
    <WorkspaceFrame service={service} onReset={() => { reset(); setOpenItem(null); }} notice={t("Reputation, review and competitor data are simulated monitoring data.")}>
      {/* Report cover */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas/70 px-5 py-2.5 text-xs text-muted">
          <span className="flex items-center gap-1.5"><ScanSearch className="size-3.5" /> {t("Digital brand audit · {name} · scan of 9 presence signals, 4 sources, 12 months", { name: fname })}</span>
          <Badge tone="gold"><FlaskConical /> {t("Simulated monitoring data")}</Badge>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_260px]">
          <div className="flex items-center gap-4">
            <ScoreRing value={score} color={scoreColor} label={t("Online visibility score")} sublabel={t("of 100")} />
            <div className="md:hidden lg:block lg:w-36">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">{t("Online visibility")}</div>
              <div className="mt-1 text-sm text-navy-800">{t(score >= 70 ? "Strong presence" : score >= 45 ? "Visible but inconsistent" : "Largely invisible online")}</div>
              <div className="mt-1 text-xs text-muted">{t("Rank {rank} of {total} vs benchmark", { rank, total: league.length })}</div>
            </div>
          </div>
          <div className="space-y-2.5 self-center">
            {byCategory.map((c) => (
              <div key={c.category} className="grid grid-cols-[120px_1fr_36px] items-center gap-3 text-sm">
                <span className="truncate text-navy-800">{t(c.category)}</span>
                <div className="h-2 overflow-hidden rounded-full bg-navy-900/[0.06]">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: c.score >= 70 ? "#10B981" : c.score >= 40 ? "#F59E0B" : "#EF4444" }} initial={reduce ? false : { width: 0 }} animate={{ width: `${c.score}%` }} transition={{ duration: reduce ? 0 : 0.6 }} />
                </div>
                <span className="text-end text-xs font-semibold tabular-nums text-navy-900">{Math.round(c.score)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 md:col-span-2 lg:col-span-1 lg:grid-cols-1">
            {[
              { label: "Mentions (12 m)", value: trend.reduce((a, t) => a + t.mentions, 0) },
              { label: "Positive sentiment", value: `${Math.round(trend.slice(-3).reduce((a, t) => a + t.positive, 0) / 3)}%` },
              { label: "Open actions", value: openActions.length },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-canvas px-3 py-2">
                <div className="text-[11px] text-muted">{t(s.label)}</div>
                <div className="text-lg font-semibold tabular-nums text-navy-900">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checklist + actions */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Panel title={t("Digital presence checklist")} description={t("Mark fixes as done — the visibility score updates instantly.")} bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {items.map((i) => {
              const open = openItem === i.id;
              const Icon = i.status === "done" ? CheckCircle2 : i.status === "partial" ? CircleDashed : Circle;
              return (
                <li key={i.id}>
                  <button type="button" aria-expanded={open} onClick={() => setOpenItem(open ? null : i.id)} className="flex w-full items-center gap-3 px-5 py-3 text-start transition hover:bg-canvas/60 focus-visible:bg-canvas focus-visible:outline-none">
                    <Icon className={cn("size-5 shrink-0", i.status === "done" ? "text-emerald-500" : i.status === "partial" ? "text-amber-500" : "text-red-400")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-navy-900">{t(i.label)}{i.auto ? <Badge tone="teal"><Globe /> {t("Jahez website")}</Badge> : null}</div>
                      <div className="truncate text-xs text-muted">{t(i.finding)}</div>
                    </div>
                    <span className="hidden text-[11px] text-muted sm:inline">{t(i.category)}</span>
                    <StatusPill tone={i.status === "done" ? "good" : i.status === "partial" ? "warn" : "bad"}>{t(i.status === "done" ? "Done" : i.status === "partial" ? "Partial" : "Missing")}</StatusPill>
                  </button>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mx-5 mb-3 flex flex-col gap-3 rounded-xl bg-canvas p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-xs text-navy-800"><span className="font-semibold">{t("Fix:")} </span>{t(i.fix)}. <span className="text-muted">{t("Weight {weight} pts.", { weight: i.weight })}</span></div>
                          <div className="flex shrink-0 gap-1.5">
                            {i.auto ? <span className="text-xs text-muted">{t("Detected automatically")}</span> : i.status === "done" ? (
                              <Button size="sm" variant="ghost" className="h-7" onClick={() => setItemStatus(i.id, "partial")}>{t("Reopen")}</Button>
                            ) : (
                              <>
                                {i.status === "missing" ? <Button size="sm" variant="outline" className="h-7" onClick={() => setItemStatus(i.id, "partial")}>{t("Mark partial")}</Button> : null}
                                <Button size="sm" variant="accent" className="h-7" onClick={() => { setItemStatus(i.id, "done"); toast.success(t("“{item}” marked done", { item: t(i.label) }), { description: t("Visibility score updated.") }); }}><CheckCircle2 /> {t("Mark done")}</Button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title={t("Corrective actions")} description={t("Prioritised by impact on visibility. Assign an owner and track status.")} actions={<Button size="sm" variant="outline" onClick={generateActions} disabled={busy !== null}><Sparkles /> {busy === "actions" ? t("Analysing…") : t("Generate")}</Button>} bodyClassName="p-0">
          {busy === "actions" ? <div className="p-5"><WritingShimmer lines={4} /></div> : sortedActions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">{t("No actions yet. Generate actions from open checklist gaps.")}</div>
          ) : (
            <ol className="divide-y divide-line">
              {sortedActions.map((a) => (
                <li key={a.id} className={cn("px-5 py-3", a.status === "done" && "opacity-60")}>
                  <div className="flex items-start gap-2">
                    <button type="button" aria-label={a.status === "done" ? t("Reopen action {title}", { title: t(a.title) }) : t("Complete action {title}", { title: t(a.title) })} onClick={() => setAction(a.id, { status: a.status === "done" ? "open" : "done" })} className="mt-0.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                      {a.status === "done" ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Circle className="size-5 text-navy-500/40 hover:text-teal-500" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <EditableText value={t(a.title)} onChange={(v) => setAction(a.id, { title: v })} ariaLabel={t("action title")} className={cn("-ms-2 text-sm font-medium text-navy-900", a.status === "done" && "line-through")} />
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <StatusPill tone={a.impact === "High" ? "bad" : a.impact === "Medium" ? "warn" : "info"}>{t(a.impact + " impact")}</StatusPill>
                        <StatusPill>{t(a.effort + " effort")}</StatusPill>
                        <span className="text-muted">{t("Due {date}", { date: t(a.due) })}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <select aria-label={t("Owner")} value={a.owner} onChange={(e) => setAction(a.id, { owner: e.target.value })} className={cn("h-7 rounded-md border border-line bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-200", a.owner === "Unassigned" ? "text-muted" : "text-navy-900")}>
                          {OWNERS.map((o) => <option key={o} value={o}>{t(o)}</option>)}
                        </select>
                        <select aria-label={t("Status")} value={a.status} onChange={(e) => setAction(a.id, { status: e.target.value as ActionStatus })} className="h-7 rounded-md border border-line bg-white px-2 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-200">
                          <option value="open">{t("Open")}</option>
                          <option value="in-progress">{t("In progress")}</option>
                          <option value="done">{t("Done")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {/* Reputation */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Panel title={t("Reputation trend")} description={t("Monthly mentions and share of positive sentiment · simulated monitoring data")}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF1F5" />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis yAxisId="m" tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" width={40} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(11,31,58,0.04)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="m" dataKey="mentions" name={t("Mentions")} fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} barSize={14} isAnimationActive={!reduce} />
                <Line yAxisId="p" type="monotone" dataKey="positive" name={t("Positive %")} stroke={CHART_COLORS[0]} strokeWidth={2.4} dot={{ r: 2.5 }} isAnimationActive={!reduce} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {themes.map(([th, v]) => (
              <span key={th} className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium", v.neg > v.n / 2 ? "bg-red-50 text-red-700" : v.neg > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{t(th)} · {v.n}</span>
            ))}
          </div>
        </Panel>

        <Panel
          title={t("Review sentiment feed")}
          description={t("Fictional reviews · simulated monitoring data")}
          bodyClassName="max-h-[480px] overflow-y-auto p-0"
        >
          <div className="sticky top-0 z-[1] border-b border-line bg-white/95 px-5 py-2.5 backdrop-blur">
            <Segmented size="sm" ariaLabel={t("Filter reviews by sentiment")} value={data.filter} onChange={(v) => setData((d) => ({ ...d, filter: v }))} options={[{ value: "all", label: t("All {count}", { count: reviews.length }) }, { value: "positive", label: <><Smile className="inline size-3.5" aria-label={t("Positive")} /> {counts.positive}</> }, { value: "neutral", label: <><Meh className="inline size-3.5" aria-label={t("Neutral")} /> {counts.neutral}</> }, { value: "negative", label: <><Frown className="inline size-3.5" aria-label={t("Negative")} /> {counts.negative}</> }]} />
          </div>
          <ul className="divide-y divide-line">
            {visibleReviews.map((r) => {
              const reply = data.replies[r.id];
              const writing = busy === `reply-${r.id}`;
              return (
                <li key={r.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-0.5" aria-label={t("{rating} out of 5 stars", { rating: r.rating })}>
                        {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn("size-3.5", n <= r.rating ? "fill-gold-400 text-gold-400" : "text-line")} />)}
                        <span className="ms-1.5 text-[11px] text-muted">{t(r.source)} · {t(r.when)}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">{t("{author} (fictional)", { author: t(r.author) })}</div>
                    </div>
                    <StatusPill tone={r.sentiment === "positive" ? "good" : r.sentiment === "neutral" ? "neutral" : "bad"}>{t(r.sentiment)}</StatusPill>
                  </div>
                  <p className="mt-1.5 text-sm text-navy-800">“{t(r.text)}”</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {r.themes.map((th) => <span key={th} className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[10px] font-medium text-navy-700">{t(th)}</span>)}
                    {!reply && !writing ? <Button size="sm" variant="ghost" className="ms-auto h-7 px-2" onClick={() => draftReply(r)} disabled={busy !== null}><Wand2 /> {t("Draft reply")}</Button> : null}
                  </div>
                  {writing ? <WritingShimmer lines={2} className="mt-2" /> : reply ? (
                    <div className="mt-2 rounded-xl border border-teal-200 bg-teal-50/60 p-2.5">
                      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-teal-700"><MessageSquareReply className="size-3" /> {t("AI-drafted reply · review before posting")}</div>
                      <EditableText multiline value={reply} onChange={(v) => setData((d) => ({ ...d, replies: { ...d.replies, [r.id]: v } }))} ariaLabel={t("reply draft")} className="-ms-2 text-xs text-navy-800" />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {/* Benchmark */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel
          title={t("Competitor benchmark")}
          description={t("Your digital footprint vs fictional competitors (0–100)")}
          actions={<RadarIcon className="size-4 text-muted" />}
        >
          <Segmented size="sm" ariaLabel={t("Compare with competitor")} value={String(data.rival)} onChange={(v) => setData((d) => ({ ...d, rival: Number(v) }))} options={competitors.map((c, i) => ({ value: String(i), label: t(c.name) }))} className="mb-2" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#E5E8EE" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fill: "#4A6591" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={t("Market average")} dataKey="avg" stroke={CHART_COLORS[7]} fill={CHART_COLORS[7]} fillOpacity={0.08} strokeDasharray="4 3" isAnimationActive={!reduce} />
                <Radar name={t(rival.name)} dataKey="rival" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.15} isAnimationActive={!reduce} />
                <Radar name={fname} dataKey="you" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} strokeWidth={2} isAnimationActive={!reduce} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("Benchmark table")} description={t("Competitor names are fictional")} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-canvas/70 text-start text-[11px] text-muted">
                  <th scope="col" className="px-4 py-2.5 font-semibold">#</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">{t("Company")}</th>
                  {DIMENSIONS.map((d) => <th key={d} scope="col" className="px-1.5 py-2.5 text-center font-semibold">{t(d.split(" ")[0])}</th>)}
                  <th scope="col" className="px-4 py-2.5 text-end font-semibold">{t("Overall")}</th>
                </tr>
              </thead>
              <tbody>
                {league.map((l, idx) => {
                  const sc = l.you ? own : competitors.find((c) => c.name === l.name)?.scores ?? [];
                  return (
                    <tr key={l.name} className={cn("border-t border-line", l.you && "bg-teal-50/60")}>
                      <td className="px-4 py-2.5 text-xs font-semibold text-muted">{idx === 0 ? <Trophy className="size-4 text-gold-500" /> : idx + 1}</td>
                      <td className="px-2 py-2.5 font-medium text-navy-900">{l.you ? fname : t(l.name)}{l.you ? <span className="ms-1.5 text-[10px] font-semibold uppercase text-teal-700">{t("You")}</span> : null}</td>
                      {sc.map((v, i) => (
                        <td key={i} className="px-1.5 py-2.5 text-center">
                          <span className={cn("inline-block min-w-8 rounded-md px-1 py-0.5 text-xs font-semibold tabular-nums", v >= 70 ? "bg-emerald-50 text-emerald-700" : v >= 45 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700")}>{v}</span>
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-end font-semibold tabular-nums text-navy-900">{l.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <AIInsight title={t("Benchmark agent")}>
              {(() => {
                const gaps = DIMENSIONS.map((d, i) => ({ d, gap: radarData[i].avg - own[i] })).sort((a, b) => b.gap - a.gap);
                return gaps[0].gap > 0 ? (
                  <>{gaps[1].gap > 0 ? t("Your biggest gap versus the market is {first} ({gap} pts behind average), followed by {second}. Closing the top two would move {name} to rank {rank}.", { first: t(gaps[0].d), gap: gaps[0].gap, second: t(gaps[1].d), name: fname, rank: Math.max(1, rank - 1) }) : t("Your biggest gap versus the market is {first} ({gap} pts behind average). Closing the top two would move {name} to rank {rank}.", { first: t(gaps[0].d), gap: gaps[0].gap, name: fname, rank: Math.max(1, rank - 1) })}</>
                ) : (
                  <>{t("{name} now matches or leads the market average on every dimension. Shift focus to review volume and response speed to protect the lead.", { name: fname })}</>
                );
              })()}
            </AIInsight>
          </div>
        </Panel>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><ListChecks className="size-3.5" /> {t("Live monitoring would require licensed data providers; all figures here are simulated for demonstration.")}</p>
    </WorkspaceFrame>
  );
}
