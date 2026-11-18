"use client";

import { ApproachableDashboard } from "@/components/product/dashboard-approachable";
import { CommandCenterDashboard } from "@/components/product/dashboard-command";
import { useActiveFactory } from "@/lib/store";

export default function DashboardPage() {
  const { factory } = useActiveFactory();
  return factory.experience === "command-center" ? <CommandCenterDashboard /> : <ApproachableDashboard />;
}
