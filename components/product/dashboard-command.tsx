"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowRight, Box, Cpu, Gauge, HeartPulse, Radio, Zap } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { BuildWithAIButton, TierBadge } from "@/components/shell/shared";
import { ActiveDeployments, AssessmentNudge, MaturityPanel } from "@/components/product/factory-status";
import { SystemsChecklist } from "@/components/product/dashboard-approachable";
import { RequirementPill, TierLadder, requirementState } from "@/components/product/primitives";
import { DELTA_MACHINES } from "@/lib/data/machines";
import { SOLUTIONS } from "@/lib/data/solutions";
import { requirementsForTier, tierDef } from "@/lib/data/tiers";
import { useLiveTelemetry } from "@/lib/telemetry";
import { nextTierProgress, useActiveFactory, useJahez } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Delta style: dense, live, operational. */
export function CommandCenterDashboard() {
  const { id, factory, state, tier } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const { readings, alerts, now } = useLiveTelemetry(2000);
  const reduce = useReducedMotion();
  const p = nextTierProgress(state.completedRequirements);
  const maintenanceLive = state.unlockedSolutions.includes("maintenance");

  const avg = (f: (r: (typeof readings)[number]) => number) => readings.reduce((s, r) => s + f(r), 0) / Math.max(1, readings.length);
  const oee = avg((r) => r.efficiency) * 0.93; // availability × quality factor (illustrative)
  const loadKw = readings.reduce((s, r) => s + r.current * 0.4 * 1.732 * 0.85, 0);
  const fleetHealth = avg((r) => r.health);
  const connectedNote = factory.systems.find((s) => s.name.includes("OPC-UA"))?.note ?? "";
  const connected = Number(connectedNote.match(/(\d+)\s+machines/)?.[1] ?? DELTA_MACHINES.length);
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const time = new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const kpis = [
    { label: "Plant OEE", value: `${oee.toFixed(1)}%`, hint: "Rolling, monitored lines", icon: Gauge },
    { label: "Monitored load", value: `${loadKw.toFixed(0)} kW`, hint: "Twin-monitored assets", icon: Zap },
    { label: "Connected machines", value: `${connected}`, hint: `${DELTA_MACHINES.length} in digital twin`, icon: Cpu },
    { label: "Fleet health", value: `${fleetHealth.toFixed(0)}/100`, hint: `${alerts.length} open alerts`, icon: HeartPulse },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-navy-950 text-white shadow-lift">
        <div className="bg-grid-dark absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -left-20 bottom-0 size-72 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-300">
                  <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" /></span>
                  Live telemetry
                </span>
                <span className="tabular-nums">{time}</span>
                <span>· {factory.location}</span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[32px]">{factory.name} · Command center</h1>
              <p className="mt-1.5 max-w-2xl text-sm text-white/65">{factory.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="dark"><Link href="/digital-twin"><Box /> Digital twin</Link></Button>
              {maintenanceLive ? (
                <Button asChild variant="gold"><Link href={SOLUTIONS.maintenance.route}>Predictive maintenance <ArrowRight /></Link></Button>
              ) : (
                <BuildWithAIButton solutionId="maintenance" label="Deploy predictive maintenance" />
              )}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <motion.div
                key={k.label}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-center justify-between text-xs text-white/55">
                  <span>{k.label}</span>
                  <k.icon className="size-4 text-teal-300" aria-hidden />
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight md:text-[28px]">{k.value}</div>
                <div className="mt-0.5 text-xs text-white/45">{k.hint}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <TierBadge tier={tier} size="sm" className="bg-white/5" />
                {p.next != null ? (
                  <span className="text-white/65">
                    {p.done}/{p.total} requirements toward Tier {p.next} · {tierDef(p.next).name}
                  </span>
                ) : (
                  <span className="text-white/65">All tiers met (provisional)</span>
                )}
              </div>
              <TierLadder tier={tier} target={p.next} dark />
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-white/45">Tier {p.next ?? 4} readiness</div>
              <div className="text-4xl font-semibold tabular-nums text-gold-300">{Math.round(p.ratio * 100)}%</div>
            </div>
          </div>
        </div>
      </section>

      <AssessmentNudge />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Asset health · live</CardTitle>
              <CardDescription>Twin-monitored machines, refreshed every 2 s from simulated OPC-UA tags.</CardDescription>
            </div>
            {critical ? <Badge tone="red"><AlertTriangle /> {critical} critical</Badge> : <Badge tone="green">Stable</Badge>}
          </CardHeader>
          <CardContent>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {readings.map((r) => {
                const m = DELTA_MACHINES.find((x) => x.id === r.machineId);
                const bar = r.status === "critical" ? "bg-red-500" : r.status === "watch" ? "bg-amber-400" : "bg-teal-500";
                return (
                  <li key={r.machineId} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-navy-900">{m?.name.split(" ")[0]}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{r.vibration} mm/s · {r.temperature}°C</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-900/[0.06]">
                        <div className={cn("h-full rounded-full transition-[width] duration-700", bar)} style={{ width: `${r.health}%` }} />
                      </div>
                      <span className={cn("w-8 text-right text-xs font-semibold tabular-nums", r.status === "critical" ? "text-red-600" : r.status === "watch" ? "text-amber-600" : "text-navy-700")}>{r.health}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {!maintenanceLive ? (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-gold-300/60 bg-gold-50 p-4 sm:flex-row sm:items-center">
                <Radio className="size-5 shrink-0 text-gold-600" aria-hidden />
                <p className="flex-1 text-sm text-navy-800">Telemetry is streaming but maintenance is still calendar-based. Predictive models would turn these signals into failure forecasts and work orders.</p>
                <Button asChild size="sm" variant="outline"><Link href="/deployments/maintenance">Learn more</Link></Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <MaturityPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div>
              <CardTitle>Tier 4 · {tierDef(4).name}</CardTitle>
              <CardDescription>Requirements on the path to AI-driven, export-ready operations.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {requirementsForTier(4).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-navy-800">{r.title}</span>
                  <RequirementPill state={requirementState(r, id, state.completedRequirements, deployments)} />
                </li>
              ))}
            </ul>
            <Button asChild variant="ghost" size="sm" className="mt-4 -ml-2"><Link href="/roadmap">Open roadmap <ArrowRight /></Link></Button>
          </CardContent>
        </Card>
        <SystemsChecklist />
        <ActiveDeployments />
      </div>
    </div>
  );
}
