"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Circle, Clock, Compass, Loader2, LogOut, Repeat, Sparkles, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DemoDisclaimer, EmptyState } from "@/components/ui";
import { BuildWithAIButton } from "@/components/shell/shared";
import { ScoreRing, SolutionIcon } from "@/components/product/primitives";
import { FACTORIES } from "@/lib/data/factories";
import { SOLUTIONS } from "@/lib/data/solutions";
import { REQUIREMENTS, tierDef } from "@/lib/data/tiers";
import { deploymentKey, deploymentProgress, useActiveFactory, useJahez, useNow } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { DeploymentLog, Solution, SolutionId } from "@/lib/types";

const AGENT_TONES = [
  "bg-teal-400/15 text-teal-300 ring-teal-400/30",
  "bg-sky-400/15 text-sky-300 ring-sky-400/30",
  "bg-indigo-400/15 text-indigo-300 ring-indigo-400/30",
  "bg-gold-400/15 text-gold-300 ring-gold-400/30",
  "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  "bg-rose-400/15 text-rose-300 ring-rose-400/30",
];
const agentsOf = (sol: Solution) => Array.from(new Set(sol.stages.map((s) => s.agent)));
const toneFor = (sol: Solution, agent: string) => AGENT_TONES[Math.max(0, agentsOf(sol).indexOf(agent)) % AGENT_TONES.length];
const clock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function DeploymentConsole({ solutionId }: { solutionId: SolutionId }) {
  const { id: factoryId, state } = useActiveFactory();
  const sol = SOLUTIONS[solutionId];
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, solutionId)]);
  const unlocked = state.unlockedSolutions.includes(solutionId);

  if (sol.factory !== factoryId) return <WrongFactory sol={sol} />;
  if (!dep && !unlocked) return <SolutionIntro sol={sol} />;
  return <LiveConsole sol={sol} />;
}

// ---------------------------------------------------------------- Live console
function LiveConsole({ sol }: { sol: Solution }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { id: factoryId, factory } = useActiveFactory();
  const dep = useJahez((s) => s.deployments[deploymentKey(factoryId, sol.id)]);
  const now = useNow(250);
  const raw = deploymentProgress(dep, now);
  // Unlocked without a deployment record (edge case) is treated as complete.
  const p = dep ? raw : { elapsed: sol.durationSeconds, ratio: 1, running: false, done: true };
  const done = p.done;
  const pct = Math.round(p.ratio * 100);
  const eta = sol.durationSeconds - p.elapsed;

  const stageIdx = sol.stages.reduce((acc, s, i) => (s.startsAt <= p.elapsed ? i : acc), 0);
  const activeStage = sol.stages[stageIdx];
  const agents = agentsOf(sol);
  const visibleLogs = done ? sol.logs : sol.logs.filter((l) => l.at <= p.elapsed);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href="/dashboard"><ArrowLeft /> Overview</Link></Button>
        <span className="text-xs text-muted">{factory.name} · deployment {sol.id}</span>
      </div>

      {/* Hero band */}
      <section className="relative overflow-hidden rounded-3xl bg-navy-950 text-white shadow-lift" aria-live="polite">
        <div className="bg-grid-dark absolute inset-0" aria-hidden />
        <div className={cn("pointer-events-none absolute -right-24 -top-24 size-80 rounded-full blur-3xl transition-colors duration-700", done ? "bg-emerald-500/20" : "bg-teal-500/20")} aria-hidden />
        <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex justify-center">
            <div className="relative">
              {!done && !reduce ? <span className="absolute inset-3 animate-pulse-ring rounded-full bg-teal-400/20" aria-hidden /> : null}
              <ScoreRing value={pct} size={148} stroke={10} dark color={done ? "#34D399" : "var(--color-teal-400)"} label={`${pct}%`} sublabel={done ? "Deployed" : "Progress"} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-white/10"><SolutionIcon icon={sol.icon} className="size-4 text-teal-300" /></span>
              {done ? <Badge tone="green"><CheckCircle2 /> Live</Badge> : <Badge className="bg-teal-400/15 text-teal-200"><Loader2 className="animate-spin" /> Deploying</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{done ? `${sol.name} is live` : `Deploying ${sol.name}`}</h1>
            <AnimatePresence mode="wait">
              <motion.p
                key={done ? "done" : activeStage.id}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -4 }}
                className="mt-1.5 text-sm text-white/65"
              >
                {done ? `All ${sol.stages.length} stages completed by ${agents.length} agents for ${factory.name}.` : <>Stage {stageIdx + 1}/{sol.stages.length} · <span className="text-white">{activeStage.label}</span> — {activeStage.agent}</>}
              </motion.p>
            </AnimatePresence>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className={cn("h-full rounded-full transition-[width] duration-300 ease-linear", done ? "bg-emerald-400" : "bg-teal-400")} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="flex flex-row flex-wrap gap-6 lg:flex-col lg:items-end lg:gap-4">
            <div className="lg:text-right">
              <div className="flex items-center gap-1 text-xs uppercase tracking-wider text-white/45 lg:justify-end"><Clock className="size-3" /> {done ? "Duration" : "ETA"}</div>
              <div className="mt-0.5 font-mono text-3xl tabular-nums">{done ? clock(sol.durationSeconds) : clock(eta)}</div>
            </div>
            <div className="lg:text-right">
              <div className="text-xs uppercase tracking-wider text-white/45">Agents online</div>
              <ul className="mt-1.5 flex -space-x-1.5 lg:justify-end" aria-label="Agents">
                {agents.map((a) => {
                  const st = sol.stages.find((s) => s.agent === a);
                  const online = done || (st != null && st.startsAt <= p.elapsed);
                  const active = !done && a === activeStage.agent;
                  return (
                    <li key={a} title={`${a}${active ? " · working" : online ? " · finished" : " · queued"}`} className="relative">
                      <span className={cn("grid size-8 place-items-center rounded-full text-[11px] font-bold ring-2 ring-navy-950 transition-opacity", toneFor(sol, a).split(" ").slice(0, 2).join(" "), online ? "opacity-100" : "opacity-30")}>
                        {a.split(" ")[0].slice(0, 2)}
                      </span>
                      {active ? <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-navy-950" /> : null}
                      <span className="sr-only">{a}{active ? " (working)" : online ? " (finished)" : " (queued)"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {done ? <SuccessPanel sol={sol} onOpen={() => router.push(sol.route)} /> : (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center">
          <LogOut className="size-5 shrink-0 text-teal-600" aria-hidden />
          <p className="flex-1 text-sm text-navy-700"><span className="font-semibold text-navy-900">You can leave this page — deployment continues.</span> Agents run in the background and you&apos;ll get a notification when {sol.name} is live.</p>
          <Button variant="outline" size="sm" onClick={() => { router.push("/dashboard"); toast("Deployment continues in the background", { description: `${sol.name} · ${clock(eta)} remaining` }); }}>
            Back to dashboard
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Stage timeline */}
        <Card>
          <CardHeader><CardTitle>Pipeline</CardTitle><span className="text-xs tabular-nums text-muted">{done ? sol.stages.length : stageIdx}/{sol.stages.length} done</span></CardHeader>
          <CardContent>
            <ol className="relative">
              {sol.stages.map((s, i) => {
                const next = sol.stages[i + 1]?.startsAt ?? sol.durationSeconds;
                const status = done || p.elapsed >= next ? "done" : s.startsAt <= p.elapsed ? "active" : "pending";
                const local = status === "active" ? Math.min(1, (p.elapsed - s.startsAt) / (next - s.startsAt)) : status === "done" ? 1 : 0;
                return (
                  <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < sol.stages.length - 1 ? (
                      <span className="absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-px bg-line" aria-hidden>
                        <span className="block w-px bg-teal-500 transition-[height] duration-300" style={{ height: `${local * 100}%` }} />
                      </span>
                    ) : null}
                    <span className={cn("relative z-10 grid size-6 shrink-0 place-items-center rounded-full", status === "done" ? "bg-teal-500 text-white" : status === "active" ? "bg-teal-50 text-teal-600 ring-2 ring-teal-400" : "bg-canvas text-navy-500/50 ring-1 ring-line")}>
                      {status === "done" ? <CheckCircle2 className="size-3.5" /> : status === "active" ? <Loader2 className="size-3.5 animate-spin" /> : <Circle className="size-2.5" />}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className={cn("text-sm font-medium", status === "pending" ? "text-muted" : "text-navy-900")}>{s.label}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                        <span>{s.agent}</span>
                        <span className="font-mono tabular-nums">T+{clock(s.startsAt)}</span>
                      </div>
                      {status === "active" ? (
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-teal-50">
                          <div className="h-full rounded-full bg-teal-400 transition-[width] duration-300 ease-linear" style={{ width: `${local * 100}%` }} />
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Terminal */}
        <AgentTerminal sol={sol} logs={visibleLogs} elapsed={p.elapsed} done={done} />
      </div>

      {!done ? <DeliverablesProgress sol={sol} ratio={p.ratio} /> : null}
      <DemoDisclaimer>Simulated AI deployment for demonstration. Agent actions, provisioning and integrations shown here are illustrative; no external systems are modified.</DemoDisclaimer>
    </div>
  );
}

function AgentTerminal({ sol, logs, elapsed, done }: { sol: Solution; logs: DeploymentLog[]; elapsed: number; done: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = logs[logs.length - 1];
  const typed = last && !done ? Math.min(last.message.length, Math.floor((elapsed - last.at) * 90) + 6) : undefined;

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length, typed]);

  return (
    <div className="flex min-h-[360px] flex-col overflow-hidden rounded-2xl border border-navy-800 bg-navy-950 shadow-card">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /></span>
        <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-xs text-white/55"><Terminal className="size-3.5 shrink-0" /> jahez-agents · deploy/{sol.id}</span>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-white/40">{logs.length}/{sol.logs.length}</span>
      </div>
      <div ref={ref} className="scrollbar-thin max-h-[420px] flex-1 space-y-1.5 overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed" role="log" aria-live="polite" aria-label="Agent activity log">
        <div className="text-white/35">$ jahez deploy {sol.id} --factory {sol.factory} --agents {agentsOf(sol).length}</div>
        {logs.map((l, i) => {
          const isLast = i === logs.length - 1;
          const text = isLast && typed != null ? l.message.slice(0, typed) : l.message;
          return (
            <div key={`${l.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="tabular-nums text-white/30">[{clock(l.at)}]</span>
              <span className={cn("rounded px-1.5 py-px text-[11px] ring-1 ring-inset", toneFor(sol, l.agent))}>{l.agent}</span>
              <span className={cn("min-w-0 basis-full sm:basis-auto sm:flex-1", l.level === "success" ? "text-emerald-300" : l.level === "warn" ? "text-amber-300" : "text-white/80")}>
                {l.level === "success" ? "✓ " : l.level === "warn" ? "! " : ""}
                {text}
                {isLast && !done ? <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-teal-300" aria-hidden /> : null}
              </span>
            </div>
          );
        })}
        {done ? <div className="pt-2 text-emerald-300">✓ deployment complete · exit 0</div> : null}
      </div>
    </div>
  );
}

function DeliverablesProgress({ sol, ratio }: { sol: Solution; ratio: number }) {
  const n = sol.deliverables.length;
  return (
    <section aria-labelledby="deliverables">
      <h2 id="deliverables" className="mb-3 text-sm font-semibold text-navy-900">Deliverables</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {sol.deliverables.map((d, i) => {
          const ready = ratio >= (i + 1) / n - 0.001;
          return (
            <li key={d} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors", ready ? "border-teal-200 bg-teal-50/60 text-navy-900" : "border-line bg-white text-muted")}>
              {ready ? <CheckCircle2 className="size-4 shrink-0 text-teal-600" /> : <Circle className="size-4 shrink-0 text-navy-500/30" />}
              <span className="min-w-0">{d}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SuccessPanel({ sol, onOpen }: { sol: Solution; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const reqs = REQUIREMENTS.filter((r) => sol.satisfies.includes(r.id));
  return (
    <motion.section initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 rounded-3xl border border-emerald-200 bg-white p-6 shadow-card md:p-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-5" /> Deployment successful</div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-navy-900">Your {sol.name} is ready to explore and edit</h2>
        <p className="mt-1.5 text-sm text-muted">{sol.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="accent" size="lg" onClick={onOpen}><Sparkles /> Open solution</Button>
          <Button asChild variant="outline" size="lg"><Link href="/dashboard">Back to dashboard</Link></Button>
          <Button asChild variant="ghost" size="lg"><Link href="/roadmap"><Compass /> Roadmap</Link></Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Delivered</div>
          <ul className="mt-2 space-y-1.5">
            {sol.deliverables.map((d) => <li key={d} className="flex items-start gap-2 text-sm text-navy-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {d}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Requirements now met</div>
          <ul className="mt-2 space-y-2">
            {reqs.map((r) => (
              <li key={r.id} className="rounded-lg bg-canvas px-3 py-2 text-sm">
                <div className="font-medium text-navy-900">{r.title}</div>
                <div className="text-xs text-muted">Tier {r.tier} · {tierDef(r.tier).name} · provisional</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}

// ---------------------------------------------------------------- Intro (not started)
function SolutionIntro({ sol }: { sol: Solution }) {
  const reqs = REQUIREMENTS.filter((r) => sol.satisfies.includes(r.id));
  const agents = agentsOf(sol);
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href="/solutions"><ArrowLeft /> AI solutions</Link></Button>
      <section className="grid overflow-hidden rounded-3xl border border-line bg-white shadow-card lg:grid-cols-[1.2fr_1fr]">
        <div className="bg-grid p-6 md:p-10">
          <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-white shadow-lift"><SolutionIcon icon={sol.icon} className="size-6" /></span>
          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-teal-600">Ready to deploy</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy-900 md:text-3xl">{sol.name}</h1>
          <p className="mt-2 max-w-xl text-[15px] text-navy-700">{sol.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <BuildWithAIButton solutionId={sol.id} size="lg" />
            <span className="inline-flex items-center gap-1.5 text-sm text-muted"><Clock className="size-4" /> About {sol.durationSeconds} seconds · {sol.priceNote}</span>
          </div>
        </div>
        <div className="border-t border-line bg-canvas/60 p-6 md:p-8 lg:border-l lg:border-t-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Agent pipeline</div>
          <ol className="mt-3 space-y-2.5">
            {sol.stages.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-navy-700 ring-1 ring-line">{i + 1}</span>
                <span className="flex-1 text-navy-800">{s.label}</span>
                <span className="hidden text-xs text-muted sm:inline">{s.agent}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">You get</div>
              <ul className="mt-2 space-y-1 text-sm text-navy-800">{sol.deliverables.map((d) => <li key={d}>· {d}</li>)}</ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">Satisfies</div>
              <ul className="mt-2 space-y-1 text-sm text-navy-800">{reqs.map((r) => <li key={r.id}>Tier {r.tier} · {r.title}</li>)}</ul>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted"><Bot className="size-4 text-teal-600" /> {agents.length} specialised agents</div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Wrong factory
function WrongFactory({ sol }: { sol: Solution }) {
  const { factory } = useActiveFactory();
  const setActive = useJahez((s) => s.setActiveFactory);
  const owner = FACTORIES[sol.factory];
  return (
    <Card className="bg-grid mx-auto mt-4 max-w-2xl p-8 text-center md:p-10">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-navy-900 text-white shadow-lift"><SolutionIcon icon={sol.icon} className="size-6" /></span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-navy-900">{sol.name} belongs to another journey</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        In this demo, {sol.name} is part of {owner.name}&apos;s roadmap. {factory.name} has a different recommended path based on its current tier and systems.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => { setActive(sol.factory); toast(`Switched to ${owner.name}`); }}><Repeat /> Switch to {owner.name}</Button>
        <Button asChild variant="outline"><Link href="/solutions">See {factory.name}&apos;s solutions <ArrowRight /></Link></Button>
      </div>
    </Card>
  );
}

export function DeploymentNotFound({ param }: { param: string }) {
  return (
    <EmptyState
      className="mt-4"
      icon={<Compass />}
      title="We couldn't find that deployment"
      description={`"${param}" isn't one of the Jahez AI solutions. Pick a solution from the catalogue to start or follow a deployment.`}
      action={<Button asChild><Link href="/solutions">Browse AI solutions <ArrowRight /></Link></Button>}
    />
  );
}
