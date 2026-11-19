"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, Clock, Download, FileImage, FileText, Lock, Printer, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card } from "@/components/ui";
import { PageHeader, TierBadge } from "@/components/shell/shared";
import { TIERS, REQUIREMENTS } from "@/lib/data/tiers";
import { useActiveFactory, useJahez } from "@/lib/store";
import { cn, localName } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";
import type { Factory, TierLevel } from "@/lib/types";
import { CERT_H, CERT_W, TierCertificate, hashCode, type CertificateData, type CertificateStatus } from "./tier-certificate";

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const addMonths = (d: Date, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; };

function buildCertificate(factory: Factory, tier: TierLevel, current: TierLevel, lastActivity: number | undefined): CertificateData {
  const status: CertificateStatus = tier > current ? "locked" : !factory.registration && tier <= factory.baselineTier ? "verified" : "provisional";
  // Verified (baseline) tiers get deterministic historic dates; provisional ones date from the latest platform activity.
  const issued = status === "verified"
    ? new Date(Date.UTC(2023 + Math.floor(tier / 2), (tier * 4 + 2) % 12, 10 + tier * 3))
    : new Date(lastActivity ?? factory.registration?.registeredAt ?? Date.now());
  const valid = addMonths(issued, status === "verified" ? 36 : 6);
  const gov = factory.governorate.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "EGY";
  return {
    tier,
    factory,
    status,
    factoryCode: `JZ-F-${hashCode(`${factory.id}:${factory.registrationNo}`)}`,
    certificateNo: `JZ-T${tier}-${gov}-${hashCode(`${factory.id}:tier:${tier}`)}`,
    issuedOn: status === "locked" ? "—" : fmt(issued),
    validUntil: status === "locked" ? "—" : fmt(valid),
  };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function serialize(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(CERT_W));
  clone.setAttribute("height", String(CERT_H));
  clone.removeAttribute("class");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export function CertificatesView() {
  const { id, factory, tier: current, state } = useActiveFactory();
  const deployments = useJahez((s) => s.deployments);
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<TierLevel>(current);
  const [busy, setBusy] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const t = useT();
  const { locale } = useLocale();

  const lastActivity = useMemo(() => {
    const times = Object.values(deployments).filter((d) => d.factoryId === id && d.completedAt).map((d) => d.completedAt as number);
    return times.length ? Math.max(...times) : undefined;
  }, [deployments, id]);

  const certs = useMemo(() => TIERS.map((t) => buildCertificate(factory, t.level, current, lastActivity)), [factory, current, lastActivity]);
  const cert = certs[selected];
  const fileBase = `${cert.certificateNo}_${factory.name.replace(/[^A-Za-z0-9]+/g, "-")}`;
  const locked = cert.status === "locked";
  const missing = REQUIREMENTS.filter((r) => r.tier <= selected && !state.completedRequirements.includes(r.id));

  const exportSvg = () => {
    if (!svgRef.current) return;
    download(new Blob([serialize(svgRef.current)], { type: "image/svg+xml;charset=utf-8" }), `${fileBase}.svg`);
    toast.success(t("Certificate exported as SVG"));
  };

  const exportPng = async () => {
    if (!svgRef.current) return;
    setBusy("png");
    try {
      const url = URL.createObjectURL(new Blob([serialize(svgRef.current)], { type: "image/svg+xml;charset=utf-8" }));
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("render")); img.src = url; });
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = CERT_W * scale;
      canvas.height = CERT_H * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("png");
      download(blob, `${fileBase}.png`);
      toast.success(t("Certificate exported as high-resolution PNG"));
    } catch {
      toast.error(t("PNG export failed in this browser — try SVG or PDF instead."));
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = () => {
    if (!svgRef.current) return;
    const w = window.open("", "_blank", "width=1200,height=860");
    if (!w) {
      toast.error(t("Allow pop-ups to export the PDF."));
      return;
    }
    const svg = serialize(svgRef.current).replace(/^<\?xml[^>]*>\s*/, "").replace(`width="${CERT_W}" height="${CERT_H}"`, 'width="297mm" height="210mm"');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${fileBase}</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0;background:#fff}svg{display:block;width:297mm;height:210mm}</style></head><body>${svg}<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`);
    w.document.close();
    toast(t("Choose “Save as PDF” in the print dialog"), { description: t("A4 landscape, no margins.") });
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("Recognition")}
        title={t("Tier certificates")}
        description={t("A certificate for every maturity tier. {factory} currently holds Tier {tier} — higher tiers unlock as their requirements are met.", { factory: localName(factory, locale), tier: current })}
        actions={<TierBadge tier={current} size="lg" />}
      />

      <div role="tablist" aria-label={t("Certificate tiers")} className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {certs.map((c) => {
          const tierInfo = TIERS[c.tier];
          const active = c.tier === selected;
          return (
            <button
              key={c.tier}
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(c.tier)}
              className={cn("relative overflow-hidden rounded-2xl border bg-white p-3.5 text-start transition hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300", active ? "border-transparent shadow-lift ring-2" : "border-line")}
              style={active ? { boxShadow: `0 0 0 2px ${tierInfo.color}` } : undefined}
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tierInfo.color, opacity: c.status === "locked" ? 0.3 : 1 }} />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t("Tier {tier}", { tier: c.tier })}</span>
                {c.status === "verified" ? <CheckCircle2 className="size-4 text-emerald-600" /> : c.status === "provisional" ? <Clock className="size-4 text-amber-600" /> : <Lock className="size-4 text-slate-400" />}
              </div>
              <div className={cn("mt-1 text-sm font-semibold", c.status === "locked" ? "text-navy-900/50" : "text-navy-900")}>{localName(tierInfo, locale)}</div>
              <div className="mt-0.5 text-[11px] text-muted">{c.status === "verified" ? t("Verified") : c.status === "provisional" ? t("Provisional") : t("Not yet achieved")}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden bg-[#EDE7DA] p-3 md:p-6">
          <motion.div key={`${id}-${selected}`} initial={reduce ? false : { opacity: 0, y: 10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }} className="shadow-[0_18px_50px_-18px_rgba(11,31,58,0.45)]">
            <TierCertificate ref={svgRef} data={cert} className="block h-auto w-full" />
          </motion.div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Download className="size-4 text-teal-600" /> {t("Export certificate")}</div>
            <p className="mt-1 text-xs text-muted">{locked ? t("Available once this tier's requirements are met.") : t("A4 landscape. Exports include the demonstration notice.")}</p>
            <div className="mt-4 grid gap-2">
              <Button variant="primary" disabled={locked} onClick={exportPdf}><Printer /> {t("Export PDF")}</Button>
              <Button variant="outline" disabled={locked || busy === "png"} onClick={exportPng}><FileImage /> {busy === "png" ? t("Rendering…") : t("Download PNG (high-res)")}</Button>
              <Button variant="outline" disabled={locked} onClick={exportSvg}><FileText /> {t("Download SVG (vector)")}</Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900"><ShieldCheck className="size-4 text-teal-600" /> {t("Certificate details")}</div>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Jahez factory ID", cert.factoryCode],
                ["Certificate no.", cert.certificateNo],
                ["Commercial reg.", factory.registrationNo],
                ["Licence", factory.licenseNo],
                ["Issued", cert.issuedOn],
                ["Valid until", cert.validUntil],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted">{t(k)}</dt>
                  <dd className="truncate text-end font-medium tabular-nums text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              {cert.status === "verified" ? <Badge tone="green"><CheckCircle2 /> {t("Verified by inspection")}</Badge> : cert.status === "provisional" ? <Badge tone="amber"><Clock /> {t("Provisional — pending evidence review")}</Badge> : <Badge tone="neutral"><Lock /> {missing.length === 1 ? t("1 requirement outstanding") : t("{count} requirements outstanding", { count: missing.length })}</Badge>}
            </div>
            {locked && missing.length ? (
              <ul className="mt-3 space-y-1 text-xs text-navy-700">
                {missing.slice(0, 5).map((r) => <li key={r.id}>• {t("Tier {tier}", { tier: r.tier })}: {t(r.title)}</li>)}
                {missing.length > 5 ? <li className="text-muted">{t("+ {count} more", { count: missing.length - 5 })}</li> : null}
              </ul>
            ) : null}
            {locked ? <Button asChild variant="subtle" size="sm" className="mt-4 w-full"><Link href="/roadmap">{t("View roadmap")}</Link></Button> : null}
          </Card>

          <p className="rounded-xl border border-gold-300/60 bg-gold-50 px-3 py-2.5 text-[11px] leading-relaxed text-gold-600">
            {t("Demonstration certificates with fictional data. Every certificate and export carries a specimen notice and is not an official Ministry of Industry document or authorisation.")}
          </p>
        </div>
      </div>
    </div>
  );
}
