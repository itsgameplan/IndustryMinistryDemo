import type { Metadata } from "next";
import { RegisterWizard } from "@/components/onboarding/register-wizard";

export const metadata: Metadata = {
  title: "Register your factory · Jahez (demo)",
  description: "Simulated factory sign-up and AI maturity assessment — demonstration only.",
};

export default function RegisterPage() {
  return <RegisterWizard />;
}
