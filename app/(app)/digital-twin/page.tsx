"use client";

import { Suspense } from "react";
import { ArrowRight, Boxes, Cable, Cpu, Radio } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { PageHeader, TierBadge } from "@/components/shell/shared";
import { DigitalTwinView, TwinLoading } from "@/components/twin/digital-twin-view";
import { useActiveFactory, useHydrated, useJahez } from "@/lib/store";

function TwinPageSkeleton() {
  return (
    <div>
      <div className="mb-6 h-16" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative h-[64vh] min-h-[440px] overflow-hidden rounded-2xl shadow-lift lg:h-[70vh]">
          <TwinLoading />
        </div>
        <div className="h-[40vh] animate-pulse rounded-2xl border border-line bg-white lg:h-[70vh]" />
      </div>
    </div>
  );
}

function TwinUnavailable({ factoryName }: { factoryName: string }) {
  const setActive = useJahez((s) => s.setActiveFactory);
  const needs = [
    { icon: <Cable />, title: "Connected equipment", text: "PLCs or retrofit IoT gateways on production machines." },
    { icon: <Radio />, title: "Sensor streams", text: "Temperature, vibration and current data flowing in real time." },
    { icon: <Cpu />, title: "Asset register", text: "Machines mapped to lines and floor positions." },
  ];
  return (
    <div>
      <PageHeader eyebrow="Tier 3 · Connected operations" title="3D factory digital twin" />
      <Card className="relative mx-auto max-w-3xl overflow-hidden">
        <div className="relative h-44 overflow-hidden bg-[radial-gradient(ellipse_at_50%_20%,#1E3A63_0%,#0B1F3A_60%,#050E1F_100%)]">
          <div className="bg-grid-dark absolute inset-0" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid size-16 place-items-center rounded-2xl border border-white/15 bg-white/10 text-teal-300 shadow-lift backdrop-blur">
              <Boxes className="size-7" />
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <TierBadge tier={3} />
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-navy-900">The digital twin needs connected equipment</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            A live 3D twin mirrors machines that stream telemetry — a Tier 3 capability. {factoryName} is building its digital foundations first; once machines are connected,
            Jahez can generate a twin of its shop floor automatically.
          </p>
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
            {needs.map((n) => (
              <div key={n.title} className="rounded-xl border border-line bg-canvas/60 p-3">
                <div className="text-teal-600 [&_svg]:size-4">{n.icon}</div>
                <div className="mt-2 text-sm font-semibold text-navy-900">{n.title}</div>
                <div className="mt-0.5 text-xs text-muted">{n.text}</div>
              </div>
            ))}
          </div>
          <Button className="mt-7" size="lg" onClick={() => setActive("delta")}>
            See it live at Delta Precision <ArrowRight />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function DigitalTwinPage() {
  const hydrated = useHydrated();
  const { id, factory } = useActiveFactory();

  if (!hydrated) return <TwinPageSkeleton />;
  if (id !== "delta") return <TwinUnavailable factoryName={factory.name} />;
  return (
    <Suspense fallback={<TwinPageSkeleton />}>
      <DigitalTwinView />
    </Suspense>
  );
}
