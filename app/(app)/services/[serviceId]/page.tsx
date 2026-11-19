"use client";

import { useParams } from "next/navigation";
import { ServiceNotFound, ServiceRoute } from "@/components/services/marketplace/service-page";
import { isServiceId, SERVICES } from "@/lib/data/services";

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default function ServicePage() {
  const params = useParams<{ serviceId: string }>();
  const raw = params?.serviceId;
  const param = Array.isArray(raw) ? raw.join("/") : (raw ?? "");
  // Own-property check: `isServiceId` uses `in`, which also matches inherited keys like "constructor".
  if (!isServiceId(param) || !Object.prototype.hasOwnProperty.call(SERVICES, param)) return <ServiceNotFound param={safeDecode(param)} />;
  return <ServiceRoute key={param} serviceId={param} />;
}
