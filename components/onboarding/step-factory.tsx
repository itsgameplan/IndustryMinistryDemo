"use client";

import { useState } from "react";
import { ArrowRight, Building2, Cpu, MapPin, MessageCircle, Package, Target } from "lucide-react";
import { Button } from "@/components/ui";
import { OBJECTIVE_LABELS } from "@/lib/recommendations";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { BusinessObjective, EmployeeRange } from "@/lib/types";
import { CURRENT_YEAR, EMPLOYEE_RANGES, EXPORT_OPTIONS, GOVERNORATES, INDUSTRIES, SYSTEMS, normalizeEgyptMobile, type FactoryDraft, type IndustryId, type SystemId } from "./data";
import { Chip, Field, FieldError, SelectInput, StepActions, StepHeading, TagInput, inputClass } from "./fields";

type Key = "whatsapp" | "name" | "registrationNo" | "address" | "governorate" | "founded" | "products" | "industry" | "employeeRange" | "systems";
type Errors = Partial<Record<Key, string>>;
const ORDER: Key[] = ["whatsapp", "name", "registrationNo", "address", "governorate", "founded", "industry", "products", "employeeRange", "systems"];

export function StepFactory({ value, onChange, onBack, onNext }: { value: FactoryDraft; onChange: (patch: Partial<FactoryDraft>) => void; onBack: () => void; onNext: () => void }) {
  const t = useT();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): Errors => {
    const e: Errors = {};
    if (!normalizeEgyptMobile(value.whatsapp)) e.whatsapp = t("Enter an Egyptian mobile number, e.g. +20 100 123 4567.");
    if (value.name.trim().length < 2) e.name = t("Please enter the factory's registered name.");
    if (!/^[A-Za-z0-9][A-Za-z0-9\-/ ]{3,}$/.test(value.registrationNo.trim())) e.registrationNo = t("Enter the commercial or tax registration number (at least 4 letters or digits).");
    if (value.address.trim().length < 5) e.address = t("Please add a street, industrial zone or area.");
    if (!value.governorate) e.governorate = t("Select the governorate where the factory operates.");
    if (value.founded) {
      const y = Number(value.founded);
      if (!Number.isInteger(y) || y < 1900 || y > CURRENT_YEAR) e.founded = t("Enter a year between 1900 and {year}, or leave it empty.", { year: CURRENT_YEAR });
    }
    if (!value.industry) e.industry = t("Select the closest industry.");
    if (!value.products.length) e.products = t("Add at least one main product (press Enter after each).");
    if (!value.employeeRange) e.employeeRange = t("Select the number of employees.");
    if (!value.systems.length) e.systems = t("Select the systems you use today — or “None yet”.");
    return e;
  };

  const clear = (k: Key) => errors[k] && setErrors((e) => ({ ...e, [k]: undefined }));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    const first = ORDER.find((k) => e[k]);
    if (first) {
      const el = document.getElementById(`fac-${first}`);
      el?.scrollIntoView({ block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    onChange({ whatsapp: normalizeEgyptMobile(value.whatsapp) ?? value.whatsapp });
    onNext();
  };

  const toggleSystem = (id: SystemId) => {
    clear("systems");
    if (id === "none") return onChange({ systems: value.systems.includes("none") ? [] : ["none"] });
    const without = value.systems.filter((s) => s !== "none");
    onChange({ systems: without.includes(id) ? without.filter((s) => s !== id) : [...without, id] });
  };

  const toggleObjective = (o: BusinessObjective) =>
    onChange({ objectives: value.objectives.includes(o) ? value.objectives.filter((x) => x !== o) : [...value.objectives, o] });

  return (
    <form onSubmit={submit} noValidate>
      <StepHeading eyebrow={t("Step 2 · Factory details")} title={t("Tell us about your factory")} description={t("Seven core details are enough for Jahez AI to build a provisional maturity profile. You can refine everything later.")} />

      <Section icon={Building2} title={t("Identity & contact")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="fac-whatsapp" label={t("WhatsApp contact")} error={errors.whatsapp} hint={t("Prefilled from your verified account number")}>
            {(a) => (
              <div className="relative">
                <MessageCircle className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-emerald-600" aria-hidden />
                <input {...a} id="fac-whatsapp" type="tel" inputMode="tel" value={value.whatsapp} onChange={(e) => { clear("whatsapp"); onChange({ whatsapp: e.target.value }); }} placeholder="+20 100 123 4567" dir="ltr" className={cn(inputClass(errors.whatsapp), "pl-10")} />
              </div>
            )}
          </Field>
          <Field id="fac-registrationNo" label={t("Commercial / tax registration no.")} error={errors.registrationNo} hint={t("As shown on your commercial register or tax card")}>
            {(a) => <input {...a} id="fac-registrationNo" value={value.registrationNo} onChange={(e) => { clear("registrationNo"); onChange({ registrationNo: e.target.value }); }} placeholder={t("e.g. 123-456-789")} className={inputClass(errors.registrationNo)} />}
          </Field>
          <Field id="fac-name" label={t("Factory name")} error={errors.name}>
            {(a) => <input {...a} id="fac-name" autoComplete="organization" value={value.name} onChange={(e) => { clear("name"); onChange({ name: e.target.value }); }} placeholder={t("e.g. Nile Valley Foods")} className={inputClass(errors.name)} />}
          </Field>
          <Field label={t("Arabic name")} optional>
            {(a) => <input {...a} lang="ar" dir="rtl" value={value.nameAr} onChange={(e) => onChange({ nameAr: e.target.value })} placeholder="مثال: وادي النيل للأغذية" className={cn(inputClass(), "font-arabic")} />}
          </Field>
        </div>
      </Section>

      <Section icon={MapPin} title={t("Location")}>
        <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr_0.7fr]">
          <Field id="fac-address" label={t("Factory address")} error={errors.address}>
            {(a) => <input {...a} id="fac-address" autoComplete="street-address" value={value.address} onChange={(e) => { clear("address"); onChange({ address: e.target.value }); }} placeholder={t("Plot, street, industrial zone")} className={inputClass(errors.address)} />}
          </Field>
          <Field id="fac-governorate" label={t("Governorate")} error={errors.governorate}>
            {(a) => (
              <SelectInput {...a} id="fac-governorate" error={errors.governorate} value={value.governorate} onChange={(e) => { clear("governorate"); onChange({ governorate: e.target.value }); }}>
                <option value="">{t("Select…")}</option>
                {GOVERNORATES.map((g) => <option key={g} value={g}>{t(g)}</option>)}
              </SelectInput>
            )}
          </Field>
          <Field id="fac-founded" label={t("Year founded")} optional error={errors.founded}>
            {(a) => <input {...a} id="fac-founded" inputMode="numeric" maxLength={4} value={value.founded} onChange={(e) => { clear("founded"); onChange({ founded: e.target.value.replace(/\D/g, "") }); }} placeholder={String(CURRENT_YEAR - 10)} className={inputClass(errors.founded)} />}
          </Field>
        </div>
      </Section>

      <Section icon={Package} title={t("Industry & products")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="fac-industry" label={t("Industry")} error={errors.industry}>
            {(a) => (
              <SelectInput {...a} id="fac-industry" error={errors.industry} value={value.industry} onChange={(e) => { clear("industry"); onChange({ industry: e.target.value as IndustryId | "" }); }}>
                <option value="">{t("Select…")}</option>
                {INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{ar ? i.ar : i.en}</option>)}
              </SelectInput>
            )}
          </Field>
          <Field id="fac-products" label={t("Main products")} error={errors.products} hint={t("Press Enter or comma after each product")}>
            {(a) => <TagInput a11y={{ ...a, id: "fac-products" }} value={value.products} error={errors.products} onChange={(products) => { clear("products"); onChange({ products }); }} placeholder={t("e.g. Frozen vegetables")} />}
          </Field>
        </div>
        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-600">{t("Employees")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-describedby={errors.employeeRange ? "err-employeeRange" : undefined}>
            {EMPLOYEE_RANGES.map((r, i) => {
              const selected = value.employeeRange === r.id;
              return (
                <label key={r.id} className={cn("flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition focus-within:ring-2 focus-within:ring-teal-400", selected ? "border-teal-400 bg-teal-50 text-teal-700" : errors.employeeRange ? "border-red-300 bg-white text-navy-800" : "border-line bg-white text-navy-800 hover:border-navy-500/30")}>
                  <input type="radio" id={i === 0 ? "fac-employeeRange" : undefined} name="employeeRange" value={r.id} checked={selected} onChange={() => { clear("employeeRange"); onChange({ employeeRange: r.id as EmployeeRange }); }} className="sr-only" />
                  {r.label}
                </label>
              );
            })}
          </div>
          <FieldError id="err-employeeRange" message={errors.employeeRange} />
        </fieldset>
      </Section>

      <Section icon={Cpu} title={t("Existing digital systems")} description={t("Select everything the factory actually uses today. Be honest — this drives your proposed tier.")}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Existing digital systems")} aria-describedby={errors.systems ? "err-systems" : undefined}>
          {SYSTEMS.map((s, i) => (
            <Chip key={s.id} id={i === 0 ? "fac-systems" : undefined} selected={value.systems.includes(s.id)} onClick={() => toggleSystem(s.id)} className={s.id === "none" ? "border-dashed" : undefined}>{t(s.label)}</Chip>
          ))}
        </div>
        <FieldError id="err-systems" message={errors.systems} />
      </Section>

      <Section icon={Target} title={t("Export & objectives")} description={t("Optional — helps Jahez recommend the right IMC competitiveness services.")} optional>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-600">{t("Export status")}</legend>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {EXPORT_OPTIONS.map((o) => {
              const selected = value.exportStatus === o.id;
              return (
                <label key={o.id} className={cn("cursor-pointer rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-teal-400", selected ? "border-teal-400 bg-teal-50" : "border-line bg-white hover:border-navy-500/30")}>
                  <input type="radio" name="exportStatus" value={o.id} checked={selected} onChange={() => onChange({ exportStatus: o.id })} onClick={() => selected && onChange({ exportStatus: "" })} className="sr-only" />
                  <span className={cn("block text-sm font-medium", selected ? "text-teal-700" : "text-navy-900")}>{t(o.label)}</span>
                  <span className="block text-xs text-muted">{t(o.hint)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-600">{t("Business objectives")}</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(OBJECTIVE_LABELS) as BusinessObjective[]).map((o) => (
              <Chip key={o} selected={value.objectives.includes(o)} onClick={() => toggleObjective(o)}>{t(OBJECTIVE_LABELS[o])}</Chip>
            ))}
          </div>
        </fieldset>
      </Section>

      <StepActions onBack={onBack} next={<Button type="submit" size="lg">{t("Run AI assessment")} <ArrowRight className="rtl:-scale-x-100" /></Button>} />
    </form>
  );
}

function Section({ icon: Icon, title, description, optional, children }: { icon: React.ComponentType<{ className?: string }>; title: string; description?: string; optional?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <section className="border-t border-line py-6 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy-900/[0.05] text-navy-700"><Icon className="size-4" aria-hidden /></span>
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-navy-900">
            {title}
            {optional ? <span className="rounded-full bg-navy-900/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-navy-500">{t("Optional")}</span> : null}
          </h2>
          {description ? <p className="text-xs text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
