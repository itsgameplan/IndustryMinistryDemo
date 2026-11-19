"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { Marketplace } from "@/components/services/marketplace/marketplace";

export default function ServicesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh]" />}>
      <Marketplace />
    </Suspense>
  );
}
