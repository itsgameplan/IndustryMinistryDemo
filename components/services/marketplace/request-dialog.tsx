"use client";

import { useId, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, Input, Label, Textarea } from "@/components/ui";
import { SERVICES } from "@/lib/data/services";
import { useActiveFactory, useJahez } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import type { ServiceId } from "@/lib/types";
import { formatMonthLabel, useLocalName, useServiceTitle } from "./shared";

function upcomingMonths(count = 7) {
  const d = new Date();
  d.setDate(1);
  return Array.from({ length: count }, (_, i) => {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    return m.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  });
}

/**
 * Simulated "request this service" form. `serviceId: "custom"` asks for a title so factories
 * can describe needs outside the IMC catalogue.
 */
export function RequestServiceDialog({ open, onOpenChange, serviceId }: { open: boolean; onOpenChange: (open: boolean) => void; serviceId: ServiceId | "custom" }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? <RequestForm serviceId={serviceId} onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function RequestForm({ serviceId, onDone }: { serviceId: ServiceId | "custom"; onDone: () => void }) {
  const uid = useId();
  const { id: factoryId, factory } = useActiveFactory();
  const requestService = useJahez((s) => s.requestService);
  const service = serviceId === "custom" ? null : SERVICES[serviceId];
  const t = useT();
  const { locale } = useLocale();
  const localName = useLocalName();
  const serviceTitle = useServiceTitle();
  const [months] = useState(() => upcomingMonths());
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState(() => (service ? `${t("We would like to scope \"{service}\" for {factory}.", { service: serviceTitle(service), factory: locale === "ar" ? (factory.nameAr ?? factory.name) : factory.name })} ` : ""));
  const [preferredStart, setPreferredStart] = useState(months[1] ?? months[0]);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = service ? service.name : title.trim();
    if (!finalTitle) return setError(t("Please describe the service you need."));
    if (message.trim().length < 10) return setError(t("Please add a short scope description (at least 10 characters)."));
    requestService(factoryId, { serviceId, title: finalTitle, message: message.trim(), preferredStart });
    toast.success(t("Service request submitted"), { description: t("{title} · preferred start {start}. A Jahez advisor would follow up (simulated).", { title: service ? localName(service) : finalTitle, start: formatMonthLabel(preferredStart, locale) }) });
    onDone();
  };

  return (
    <DialogContent
      title={service ? t("Request this service") : t("Request another service")}
      description={service ? t("{name} · Service {number}", { name: serviceTitle(service), number: service.number }) : t("Describe a need that is not covered by the 21 IMC services.")}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!service ? (
          <div>
            <Label htmlFor={`${uid}-title`}>{t("What do you need?")}</Label>
            <Input id={`${uid}-title`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("e.g. Energy audit for our dyeing line")} required />
          </div>
        ) : null}
        <div>
          <Label htmlFor={`${uid}-msg`}>{t("Scope & context")}</Label>
          <Textarea id={`${uid}-msg`} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("Goals, products or lines involved, current systems, constraints…")} required />
        </div>
        <div>
          <Label htmlFor={`${uid}-start`}>{t("Preferred start")}</Label>
          <select id={`${uid}-start`} value={preferredStart} onChange={(e) => setPreferredStart(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100">
            {months.map((m) => <option key={m} value={m}>{formatMonthLabel(m, locale)}</option>)}
          </select>
        </div>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <p className="rounded-lg bg-canvas px-3 py-2 text-xs text-muted">{t("Simulated request — nothing is sent outside this demo. Pricing to be confirmed after scoping; no capacity or provider is committed.")}</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onDone}>{t("Cancel")}</Button>
          <Button type="submit" variant="accent"><Send className="rtl:-scale-x-100" /> {t("Submit request")}</Button>
        </div>
      </form>
    </DialogContent>
  );
}
