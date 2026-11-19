import { Suspense } from "react";
import { ResetClient } from "./reset-client";

export const metadata = { title: "Reset demo · Jahez" };

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetClient />
    </Suspense>
  );
}
