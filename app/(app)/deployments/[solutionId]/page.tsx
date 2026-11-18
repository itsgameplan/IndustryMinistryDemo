"use client";

import { useParams } from "next/navigation";
import { DeploymentConsole, DeploymentNotFound } from "@/components/product/deployment-console";
import { isSolutionId } from "@/components/product/primitives";

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default function DeploymentPage() {
  const params = useParams<{ solutionId: string }>();
  const raw = params?.solutionId;
  const param = Array.isArray(raw) ? raw.join("/") : (raw ?? "");
  if (!isSolutionId(param)) return <DeploymentNotFound param={safeDecode(param)} />;
  return <DeploymentConsole solutionId={param} />;
}
