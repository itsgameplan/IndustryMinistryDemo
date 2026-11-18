import { AppShell } from "@/components/shell/app-shell";

export default function FactoryAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
