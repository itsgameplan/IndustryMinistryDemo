"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpRight, Gauge, GitBranch, Layers, Link2, Plus, Target, Trash2, Users } from "lucide-react";
import { AIInsight, EditableText, KpiTile, Panel, StatusPill, WorkspaceFrame, seedKeyFor, useServiceWorkspace, type WorkspaceProps } from "@/components/services/kit";
import { Button, Input, Label } from "@/components/ui";
import { useActiveFactory } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { LinkIndicator, NumberField, Segmented, useFmtVal, useSeedT, useStrategyLinks } from "./_shared";
import { PERSPECTIVES, departmentsFor, peopleFor, perspectiveMeta, seedBscDesign, type BscDesignData, type BscKpi, type BscObjective, type Frequency, type Perspective } from "./_seeds";

const ABOVE: Record<Perspective, Perspective | null> = { learning: "process", process: "customer", customer: "financial", financial: null };
const BELOW: Record<Perspective, Perspective | null> = { financial: "customer", customer: "process", process: "learning", learning: null };
const FREQS: Frequency[] = ["Weekly", "Monthly", "Quarterly"];

export default function BscDesignWorkspace({ service }: WorkspaceProps) {
  const { tier: currentTier } = useActiveFactory();
  const { factory, data, setData, reset } = useServiceWorkspace<BscDesignData>(service.id, (f) => seedBscDesign(f, currentTier));
  const links = useStrategyLinks();
  const departments = useMemo(() => departmentsFor(seedKeyFor(factory)), [factory]);
  const people = useMemo(() => peopleFor(factory), [factory]);
  const [selectedObj, setSelectedObj] = useState<string>(data.objectives[0]?.id ?? "");
  const [dept, setDept] = useState<string>("all");
  const [selectedKpi, setSelectedKpi] = useState<string>(data.kpis[0]?.id ?? "");
  const t = useT();
  const st = useSeedT();
  const fv = useFmtVal();

  const titleOf = (o: BscObjective) => st(o.strategyRef ? links.objectiveTitle(o.strategyRef) ?? o.title : o.title);
  const strategyIndex = (ref?: string) => (ref ? links.objectives.findIndex((x) => x.id === ref) + 1 : 0);
  const objective = data.objectives.find((o) => o.id === selectedObj) ?? data.objectives[0];
  const kpi = data.kpis.find((k) => k.id === selectedKpi);
  const deptKpis = data.kpis.filter((k) => dept === "all" || k.department === dept);

  const toggleLink = (from: string, to: string) =>
    setData((d) => ({ ...d, links: d.links.some(([a, b]) => a === from && b === to) ? d.links.filter(([a, b]) => !(a === from && b === to)) : [...d.links, [from, to]] }));
  const updateObjective = (id: string, patch: Partial<BscObjective>) => setData((d) => ({ ...d, objectives: d.objectives.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  const addObjective = (per: Perspective) => {
    const id = `b-new-${per}-${data.objectives.length + 1}`;
    setData((d) => ({ ...d, objectives: [...d.objectives, { id, perspective: per, title: "New objective" }] }));
    setSelectedObj(id);
  };
  const removeObjective = (id: string) => {
    setData((d) => ({ ...d, objectives: d.objectives.filter((o) => o.id !== id), links: d.links.filter(([a, b]) => a !== id && b !== id) }));
    setSelectedObj(data.objectives.find((o) => o.id !== id)?.id ?? "");
  };
  const updateKpi = (id: string, patch: Partial<BscKpi>) => setData((d) => ({ ...d, kpis: d.kpis.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
  const addKpi = () => {
    const department = dept === "all" ? departments[0] : dept;
    const id = `kpi-n${data.kpis.length + 1}-${data.kpis.reduce((s, k) => s + k.id.length, 0)}`;
    setData((d) => ({ ...d, kpis: [...d.kpis, { id, name: "New KPI", objectiveId: objective?.id ?? d.objectives[0].id, department, unit: "%", baseline: 0, target: 100, direction: "up", owner: people.find((p) => p.dept === department)?.name ?? people[0].name, frequency: "Monthly" }] }));
    setSelectedKpi(id);
  };

  return (
    <WorkspaceFrame service={service} onReset={reset} notice={t("KPI targets require leadership agreement; actual data sources are configured in the execution dashboard.")}>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <LinkIndicator linked={links.strategyLinked} href="/services/corporate-strategy" linkedLabel={t("Linked to Corporate Strategy")} unlinkedLabel={t("Strategy not yet developed — using AI-suggested objectives")} />
        <Link href="/services/bsc-execution" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-navy-700 ring-1 ring-inset ring-line hover:bg-canvas">{t("Track execution")} <ArrowUpRight className="size-3" /></Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label={t("Strategic objectives")} value={data.objectives.length} hint={t("{count} from corporate strategy", { count: data.objectives.filter((o) => o.strategyRef).length })} icon={<Target />} />
        <KpiTile label={t("Cause-effect links")} value={data.links.length} icon={<GitBranch />} />
        <KpiTile label={t("KPIs")} value={data.kpis.length} hint={t("{count} tracked weekly", { count: data.kpis.filter((k) => k.frequency === "Weekly").length })} icon={<Gauge />} />
        <KpiTile label={t("Departments covered")} value={`${new Set(data.kpis.map((k) => k.department)).size}/${departments.length}`} icon={<Users />} />
      </div>

      {/* Strategy map + objective inspector */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={t("Strategy map")} description={t("Objectives by perspective — arrows show how capabilities drive processes, customers and financial results. Select an objective to inspect it.")} bodyClassName="p-3 sm:p-5">
          <StrategyMap data={data} selected={objective?.id} onSelect={setSelectedObj} titleOf={titleOf} strategyIndex={strategyIndex} onAdd={addObjective} />
        </Panel>

        {objective ? (
          <Panel
            title={t("Objective")}
            description={t(perspectiveMeta(objective.perspective).label)}
            actions={objective.strategyRef ? <StatusPill tone="info"><Link2 /> SO{strategyIndex(objective.strategyRef)}</StatusPill> : <StatusPill>{t("BSC-specific")}</StatusPill>}
            className="xl:sticky xl:top-20 xl:self-start"
          >
            {objective.strategyRef ? (
              <div>
                <p className="text-sm font-semibold text-navy-900">{titleOf(objective)}</p>
                <p className="mt-1 text-xs text-muted">{t("Title is maintained in the")} <Link href="/services/corporate-strategy" className="font-medium text-teal-700 hover:underline">{t("corporate strategy")}</Link> {t(links.strategyLinked ? "(live link)" : "(AI-suggested until developed)")}.</p>
              </div>
            ) : (
              <EditableText ariaLabel={t("Objective title")} value={st(objective.title)} onChange={(v) => updateObjective(objective.id, { title: v })} className="text-sm font-semibold text-navy-900" />
            )}

            {ABOVE[objective.perspective] ? (
              <div className="mt-5">
                <Label>{t("Drives ({perspective})", { perspective: t(perspectiveMeta(ABOVE[objective.perspective] as Perspective).label) })}</Label>
                <ul className="space-y-1">
                  {data.objectives.filter((o) => o.perspective === ABOVE[objective.perspective]).map((o) => {
                    const on = data.links.some(([a, b]) => a === objective.id && b === o.id);
                    return (
                      <li key={o.id}>
                        <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-navy-800 hover:bg-canvas">
                          <input type="checkbox" checked={on} onChange={() => toggleLink(objective.id, o.id)} className="mt-0.5 accent-teal-500" />
                          <span>{titleOf(o)}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-canvas px-3 py-2 text-xs text-muted">{t("Financial objectives are the end of the cause-and-effect chain.")}</p>
            )}
            {BELOW[objective.perspective] ? (
              <div className="mt-4">
                <Label>{t("Driven by")}</Label>
                <div className="flex flex-wrap gap-1">
                  {data.links.filter(([, b]) => b === objective.id).map(([a]) => {
                    const o = data.objectives.find((x) => x.id === a);
                    return o ? <button key={a} type="button" onClick={() => setSelectedObj(a)} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-navy-700 hover:bg-navy-900/10">{titleOf(o)}</button> : null;
                  })}
                  {!data.links.some(([, b]) => b === objective.id) ? <span className="text-xs text-muted">{t("No drivers yet — link one from the perspective below.")}</span> : null}
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <Label>{t("Measured by")}</Label>
              <ul className="space-y-1">
                {data.kpis.filter((k) => k.objectiveId === objective.id).map((k) => (
                  <li key={k.id}>
                    <button type="button" onClick={() => { setSelectedKpi(k.id); setDept(k.department); document.getElementById("bsc-cascade")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-start text-xs hover:bg-canvas">
                      <span className="text-navy-800">{st(k.name)}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-navy-900">{fv(k.target, k.unit)}</span>
                    </button>
                  </li>
                ))}
                {!data.kpis.some((k) => k.objectiveId === objective.id) ? <li className="px-2 text-xs text-amber-700">{t("No KPI yet — every objective should have at least one.")}</li> : null}
              </ul>
            </div>
            {!objective.strategyRef ? (
              <Button variant="ghost" size="sm" className="mt-4 text-red-600 hover:bg-red-50" disabled={data.kpis.some((k) => k.objectiveId === objective.id)} onClick={() => removeObjective(objective.id)} title={data.kpis.some((k) => k.objectiveId === objective.id) ? t("Reassign its KPIs first") : undefined}><Trash2 /> {t("Remove objective")}</Button>
            ) : null}
          </Panel>
        ) : null}
      </div>

      {/* KPI cascade */}
      <section id="bsc-cascade" className="mt-8 scroll-mt-24" aria-labelledby="bsc-cascade-h">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="bsc-cascade-h" className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Layers className="size-4 text-teal-600" /> {t("KPI cascade by department")}</h3>
            <p className="text-xs text-muted">{t("Select a department in the cascade matrix, then a KPI to edit its target, unit, owner and frequency.")}</p>
          </div>
          <Button variant="subtle" size="sm" onClick={addKpi}><Plus /> {t("Add KPI")}</Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <CascadeMatrix kpis={data.kpis} objectives={data.objectives} factoryName={factory.name} departments={departments} dept={dept} onDept={setDept} />

          <Panel title={dept === "all" ? t("All KPIs") : t(dept)} description={t(deptKpis.length === 1 ? "{count} KPI" : "{count} KPIs", { count: deptKpis.length })} bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {deptKpis.map((k) => {
                const obj = data.objectives.find((o) => o.id === k.objectiveId);
                const meta = perspectiveMeta(obj?.perspective ?? "financial");
                return (
                  <li key={k.id}>
                    <button type="button" onClick={() => setSelectedKpi(k.id)} aria-pressed={selectedKpi === k.id} className={cn("flex w-full items-start gap-3 px-4 py-3 text-start transition hover:bg-canvas", selectedKpi === k.id && "bg-teal-50/60")}>
                      <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-navy-900">{st(k.name)}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-muted"><span className="inline-block rtl:-scale-x-100">↳</span> {obj ? titleOf(obj) : t("Unlinked")}</span>
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="flex items-center justify-end gap-1 text-sm font-semibold tabular-nums text-navy-900">{k.direction === "up" ? <ArrowUp className="size-3 text-emerald-600" aria-label={t("Higher is better")} /> : <ArrowDown className="size-3 text-sky-600" aria-label={t("Lower is better")} />}{fv(k.target, k.unit)}</span>
                        <span className="block text-[11px] text-muted">{t(k.frequency)}{dept === "all" ? ` · ${t(k.department)}` : ""}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {!deptKpis.length ? <li className="px-4 py-8 text-center text-sm text-muted">{t("No KPIs cascaded to this department yet.")}</li> : null}
            </ul>
          </Panel>

          {kpi ? (
            <KpiEditor key={kpi.id} kpi={kpi} data={data} departments={departments} people={people} titleOf={titleOf} onChange={(p) => updateKpi(kpi.id, p)} onDelete={() => { setData((d) => ({ ...d, kpis: d.kpis.filter((k) => k.id !== kpi.id) })); setSelectedKpi(""); }} />
          ) : (
            <Panel title={t("KPI details")}><p className="text-sm text-muted">{t("Select a KPI to edit it.")}</p></Panel>
          )}
        </div>
      </section>

      <AIInsight className="mt-6" title={t("Design check")}>
        {(() => {
          const unmeasured = data.objectives.filter((o) => !data.kpis.some((k) => k.objectiveId === o.id));
          const orphan = data.objectives.filter((o) => o.perspective !== "financial" && !data.links.some(([a]) => a === o.id));
          if (!unmeasured.length && !orphan.length) return <>{t("Every objective has at least one KPI and contributes to an objective above it — the scorecard is balanced and ready for")} <Link href="/services/bsc-workshops" className="font-semibold text-teal-700 hover:underline">{t("leadership alignment")}</Link>.</>;
          return (
            <>
              {unmeasured.length ? <>{t(unmeasured.length > 1 ? "{count} objectives have no KPI ({list})." : "{count} objective has no KPI ({list}).", { count: unmeasured.length, list: unmeasured.map((o) => titleOf(o)).join("; ") })} </> : null}
              {orphan.length ? <>{t(orphan.length > 1 ? "{count} objectives do not yet drive anything in the perspective above." : "{count} objective does not yet drive anything in the perspective above.", { count: orphan.length })}</> : null}
            </>
          );
        })()}
      </AIInsight>
    </WorkspaceFrame>
  );
}

// ---------------------------------------------------------------------------------------------

function StrategyMap({ data, selected, onSelect, titleOf, strategyIndex, onAdd }: { data: BscDesignData; selected?: string; onSelect: (id: string) => void; titleOf: (o: BscObjective) => string; strategyIndex: (ref?: string) => number; onAdd: (p: Perspective) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<{ key: string; d: string; active: boolean }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const reduce = useReducedMotion();
  const t = useT();

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const next = data.links.flatMap(([from, to]) => {
        const a = nodes.current.get(from)?.getBoundingClientRect();
        const b = nodes.current.get(to)?.getBoundingClientRect();
        if (!a || !b) return [];
        const x1 = a.left + a.width / 2 - box.left, y1 = a.top - box.top;
        const x2 = b.left + b.width / 2 - box.left, y2 = b.bottom - box.top + 4;
        const my = (y1 + y2) / 2;
        return [{ key: `${from}>${to}`, d: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`, active: from === selected || to === selected }];
      });
      setPaths(next);
      setSize({ w: box.width, h: box.height });
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.links, data.objectives, selected]);

  return (
    <div ref={wrap} className="relative">
      <svg className="pointer-events-none absolute inset-0 z-0" width={size.w} height={size.h} aria-hidden>
        <defs>
          <marker id="bsc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" /></marker>
          <marker id="bsc-arrow-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#0FA396" /></marker>
        </defs>
        {paths.filter((p) => !p.active).map((p) => <path key={p.key} d={p.d} fill="none" stroke="#CBD5E1" strokeWidth={1.4} markerEnd="url(#bsc-arrow)" />)}
        {paths.filter((p) => p.active).map((p) => (
          <motion.path key={p.key} d={p.d} fill="none" stroke="#0FA396" strokeWidth={2.2} markerEnd="url(#bsc-arrow-on)" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
        ))}
      </svg>
      <div className="relative z-10 space-y-6">
        {PERSPECTIVES.map((p) => (
          <div key={p.id} className="rounded-2xl p-2 sm:grid sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center sm:gap-3" style={{ backgroundColor: `${p.color}0A` }}>
            <div className="mb-2 px-1 sm:mb-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: p.color }}>{t(p.label)}</div>
              <div className="hidden text-[10px] leading-tight text-muted sm:block">{t(p.question)}</div>
            </div>
            <div className="flex flex-wrap items-stretch justify-center gap-3 sm:justify-start">
              {data.objectives.filter((o) => o.perspective === p.id).map((o) => {
                const idx = strategyIndex(o.strategyRef);
                const kpiCount = data.kpis.filter((k) => k.objectiveId === o.id).length;
                return (
                  <button
                    key={o.id}
                    ref={(el) => { if (el) nodes.current.set(o.id, el); else nodes.current.delete(o.id); }}
                    type="button"
                    onClick={() => onSelect(o.id)}
                    aria-pressed={selected === o.id}
                    className={cn(
                      "flex w-[calc(50%-6px)] flex-col overflow-hidden rounded-xl border bg-white text-start shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 sm:w-44",
                      selected === o.id ? "border-teal-400 ring-2 ring-teal-200" : "border-line hover:border-navy-500/30"
                    )}
                  >
                    <span className="h-1 w-full" style={{ backgroundColor: p.color }} aria-hidden />
                    <span className="flex-1 px-2.5 py-2 text-xs font-medium leading-snug text-navy-900">{titleOf(o)}</span>
                    <span className="flex items-center justify-between gap-1 border-t border-line px-2.5 py-1 text-[10px] text-muted">
                      <span>{t(kpiCount === 1 ? "{count} KPI" : "{count} KPIs", { count: kpiCount })}</span>
                      {idx ? <span className="font-semibold text-teal-700">SO{idx}</span> : null}
                    </span>
                  </button>
                );
              })}
              <button type="button" onClick={() => onAdd(p.id)} className="grid min-h-16 w-10 place-items-center rounded-xl border border-dashed border-line text-muted transition hover:border-teal-300 hover:text-teal-700" aria-label={t("Add {perspective} objective", { perspective: t(p.label) })}><Plus className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CascadeMatrix({ kpis, objectives, departments, dept, onDept, factoryName }: { kpis: BscKpi[]; objectives: BscObjective[]; departments: string[]; dept: string; onDept: (d: string) => void; factoryName: string }) {
  const perOf = (k: BscKpi) => objectives.find((o) => o.id === k.objectiveId)?.perspective ?? "financial";
  const max = Math.max(1, ...departments.flatMap((d) => PERSPECTIVES.map((p) => kpis.filter((k) => k.department === d && perOf(k) === p.id).length)));
  const t = useT();
  return (
    <Panel title={t("Cascade matrix")} description={t("{name} departments × perspectives", { name: factoryName })} bodyClassName="p-3">
      <div role="radiogroup" aria-label={t("Department")} className="space-y-1">
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,28px)] gap-1 px-2 text-[9px] font-bold uppercase tracking-wider text-muted">
          <span />
          {PERSPECTIVES.map((p) => <span key={p.id} className="text-center" style={{ color: p.color }} title={t(p.label)}>{t(p.short)}</span>)}
        </div>
        {["all", ...departments].map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={dept === d}
            onClick={() => onDept(d)}
            className={cn("grid w-full grid-cols-[minmax(0,1fr)_repeat(4,28px)] items-center gap-1 rounded-lg px-2 py-1.5 text-start text-xs transition", dept === d ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-canvas")}
          >
            <span className="truncate font-medium">{d === "all" ? t("All departments") : t(d)}</span>
            {PERSPECTIVES.map((p) => {
              const n = kpis.filter((k) => (d === "all" || k.department === d) && perOf(k) === p.id).length;
              return (
                <span key={p.id} className="grid h-6 place-items-center rounded-md text-[11px] font-semibold tabular-nums" style={{ backgroundColor: n ? `${p.color}${d === "all" ? "22" : Math.round(20 + (n / max) * 60).toString(16).padStart(2, "0")}` : "transparent", color: dept === d ? "#fff" : p.color }}>
                  {n || "·"}
                </span>
              );
            })}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function KpiEditor({ kpi, data, departments, people, titleOf, onChange, onDelete }: { kpi: BscKpi; data: BscDesignData; departments: string[]; people: { id: string; name: string; role: string }[]; titleOf: (o: BscObjective) => string; onChange: (p: Partial<BscKpi>) => void; onDelete: () => void }) {
  const owners = Array.from(new Set([kpi.owner, ...people.map((p) => p.name)]));
  const t = useT();
  const fv = useFmtVal();
  return (
    <Panel title={t("KPI details")} description={t("Changes save automatically")} actions={<Button variant="ghost" size="icon" className="size-8 text-red-600 hover:bg-red-50" onClick={onDelete} aria-label={t("Delete KPI")}><Trash2 /></Button>} className="lg:col-span-2 xl:col-span-1">
      <div className="space-y-4">
        <div>
          <Label htmlFor="kpi-name">{t("Name")}</Label>
          <Input id="kpi-name" defaultValue={kpi.name} onBlur={(e) => e.target.value.trim() && e.target.value !== kpi.name && onChange({ name: e.target.value.trim() })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("Target")}</Label>
            <NumberField key={`t-${kpi.target}`} label={t("Target")} value={kpi.target} onCommit={(v) => onChange({ target: v })} className="font-semibold" />
          </div>
          <div>
            <Label htmlFor="kpi-unit">{t("Unit")}</Label>
            <Input id="kpi-unit" className="h-9" defaultValue={kpi.unit} onBlur={(e) => e.target.value !== kpi.unit && onChange({ unit: e.target.value })} />
          </div>
          <div>
            <Label>{t("Baseline")}</Label>
            <NumberField key={`b-${kpi.baseline}`} label={t("Baseline")} value={kpi.baseline} onCommit={(v) => onChange({ baseline: v })} />
          </div>
          <div>
            <Label>{t("Direction")}</Label>
            <Segmented label={t("Direction")} size="xs" value={kpi.direction} onChange={(v) => onChange({ direction: v })} options={[{ value: "up", label: t("↑ Higher") }, { value: "down", label: t("↓ Lower") }]} />
          </div>
        </div>
        <div>
          <Label>{t("Frequency")}</Label>
          <Segmented label={t("Reporting frequency")} value={kpi.frequency} onChange={(v) => onChange({ frequency: v })} options={FREQS.map((f) => ({ value: f, label: t(f) }))} />
        </div>
        <div>
          <Label htmlFor="kpi-owner">{t("Owner")}</Label>
          <select id="kpi-owner" value={kpi.owner} onChange={(e) => onChange({ owner: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-white px-2 text-sm">
            {owners.map((o) => <option key={o} value={o}>{t(o)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <Label htmlFor="kpi-dept">{t("Department")}</Label>
            <select id="kpi-dept" value={kpi.department} onChange={(e) => onChange({ department: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-white px-2 text-sm">
              {departments.map((d) => <option key={d} value={d}>{t(d)}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="kpi-obj">{t("Cascades from objective")}</Label>
            <select id="kpi-obj" value={kpi.objectiveId} onChange={(e) => onChange({ objectiveId: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-white px-2 text-sm">
              {PERSPECTIVES.map((p) => (
                <optgroup key={p.id} label={t(p.label)}>
                  {data.objectives.filter((o) => o.perspective === p.id).map((o) => <option key={o.id} value={o.id}>{titleOf(o)}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <p className="rounded-lg bg-canvas px-3 py-2 text-[11px] text-muted">{t("Baseline {baseline} → target {target} · reported {frequency} by {owner}.", { baseline: fv(kpi.baseline, kpi.unit), target: fv(kpi.target, kpi.unit), frequency: t(kpi.frequency.toLowerCase()), owner: t(kpi.owner) })}</p>
      </div>
    </Panel>
  );
}
