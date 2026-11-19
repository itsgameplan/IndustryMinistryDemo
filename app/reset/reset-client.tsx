"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useHydrated, useJahez } from "@/lib/store";
import { RESET_CHANNEL } from "@/components/shell/deployment-ticker";
import { useT } from "@/lib/i18n";

/** Removes every Jahez key from a Web Storage area. */
function clearJahezKeys(storage: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith("jahez")) keys.push(k);
  }
  keys.forEach((k) => storage.removeItem(k));
  return keys.length;
}

export function ResetClient() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const stay = params.get("stay") === "1";
  const [done, setDone] = useState(false);
  const [cleared, setCleared] = useState(0);
  const t = useT();

  useEffect(() => {
    if (!hydrated || done) return;
    // 1. Restore the in-memory store to its initial state (also rewrites the persisted copy).
    useJahez.getState().resetDemo();
    // 2. Remove every persisted Jahez key (store, sign-up draft, workspace preferences).
    let n = 0;
    try {
      n += clearJahezKeys(window.localStorage);
      n += clearJahezKeys(window.sessionStorage);
    } catch {
      /* storage unavailable */
    }
    // 3. Tell any other open Jahez tabs to reload so they don't write old state back.
    try {
      const ch = new BroadcastChannel(RESET_CHANNEL);
      ch.postMessage("reset");
      ch.close();
    } catch {
      /* BroadcastChannel unsupported */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot result of an external side effect
    setCleared(n);
    setDone(true);
  }, [hydrated, done]);

  useEffect(() => {
    if (!done || stay) return;
    const timer = setTimeout(() => router.replace("/"), 2200);
    return () => clearTimeout(timer);
  }, [done, stay, router]);

  return (
    <div className="bg-grid grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-lift">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-navy-900 text-white">
          {done ? <CheckCircle2 className="size-7 text-teal-300" /> : <Loader2 className="size-7 animate-spin" />}
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-navy-900">{done ? t("Demo reset to its starting state") : t("Resetting the demo…")}</h1>
        <p className="mt-2 text-sm text-muted">
          {done
            ? t(cleared === 1 ? "Deployments, installed services, workspace edits, registered factories, certificates progress and notifications were cleared ({count} stored item). Al Noor is back at Tier 0 and Delta at Tier 3." : "Deployments, installed services, workspace edits, registered factories, certificates progress and notifications were cleared ({count} stored items). Al Noor is back at Tier 0 and Delta at Tier 3.", { count: cleared })
            : t("Clearing everything stored by this browser.")}
        </p>
        {done ? (
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="primary"><Link href="/">{t("Go to start page")}</Link></Button>
            {!stay ? <span className="self-center text-xs text-muted">{t("Redirecting…")}</span> : null}
          </div>
        ) : null}
        <p className="mt-6 text-[11px] text-muted">{t("This only affects this browser. Open {path} in each browser you present from.", { path: "/reset" })}</p>
      </div>
    </div>
  );
}
