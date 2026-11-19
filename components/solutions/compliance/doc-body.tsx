"use client";

import { Fragment } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Block =
  | { kind: "h"; text: string; ai: boolean }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "check"; items: { text: string; line: number }[] };

export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.split("\n");
  lines.forEach((raw, line) => {
    const l = raw.trim();
    if (!l) return;
    const last = blocks[blocks.length - 1];
    const check = /^- \[( |x)\] (.*)$/i.exec(l);
    if (check) {
      if (last?.kind === "check") last.items.push({ text: check[2], line });
      else blocks.push({ kind: "check", items: [{ text: check[2], line }] });
      return;
    }
    if (l.startsWith("# ")) {
      const text = l.slice(2);
      blocks.push({ kind: "h", text: text.replace(/\s*\(AI suggestion\)\s*$/i, ""), ai: /\(AI suggestion\)/i.test(text) });
      return;
    }
    if (l.startsWith("- ")) {
      if (last?.kind === "ul") last.items.push(l.slice(2));
      else blocks.push({ kind: "ul", items: [l.slice(2)] });
      return;
    }
    const num = /^\d+\.\s+(.*)$/.exec(l);
    if (num) {
      if (last?.kind === "ol") last.items.push(num[1]);
      else blocks.push({ kind: "ol", items: [num[1]] });
      return;
    }
    blocks.push({ kind: "p", text: l });
  });
  return blocks;
}

export function checklistLines(body: string) {
  return parseBody(body).flatMap((b) => (b.kind === "check" ? b.items.map((i) => i.line) : []));
}

/** Rich read view for the markdown-ish document body. */
export function DocBody({ body, checked, onToggle, rtlTitle }: { body: string; checked: Set<number>; onToggle: (line: number) => void; rtlTitle?: string }) {
  const t = useT();
  const blocks = parseBody(body);
  let hCount = 0;
  return (
    <article className="text-[14.5px] leading-relaxed text-navy-800">
      {rtlTitle ? <p dir="rtl" lang="ar" className="font-arabic mb-5 text-end text-sm text-muted">{rtlTitle}</p> : null}
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h": {
            hCount++;
            return (
              <h3 key={i} className={cn("mb-2.5 flex items-center gap-2 text-[15px] font-semibold tracking-tight text-navy-900", i > 0 && "mt-7", b.ai && "text-teal-700")}>
                {b.ai ? (
                  <span className="grid size-6 place-items-center rounded-md bg-teal-50 text-teal-600"><Sparkles className="size-3.5" /></span>
                ) : (
                  <span className="grid size-6 place-items-center rounded-md bg-navy-900/[0.05] text-[11px] font-bold tabular-nums text-navy-600">{hCount}</span>
                )}
                {t(b.text)}
                {b.ai ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-700 ring-1 ring-inset ring-teal-200">{t("AI suggestion")}</span> : null}
              </h3>
            );
          }
          case "p":
            return <p key={i} className="mb-3 text-navy-700">{t(b.text)}</p>;
          case "ul":
            return (
              <ul key={i} className="mb-3 space-y-1.5 ps-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-teal-500" />
                    <Inline text={t(it)} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="relative mb-3 space-y-0">
                {b.items.map((it, j) => (
                  <li key={j} className="relative flex gap-3 pb-3 last:pb-0">
                    {j < b.items.length - 1 ? <span className="absolute start-[13px] top-7 bottom-0 w-px bg-line" aria-hidden /> : null}
                    <span className="relative grid size-7 shrink-0 place-items-center rounded-full border border-line bg-white text-xs font-semibold tabular-nums text-navy-700 shadow-sm">{j + 1}</span>
                    <span className="pt-0.5"><Inline text={t(it)} /></span>
                  </li>
                ))}
              </ol>
            );
          case "check":
            return (
              <ul key={i} className="mb-3 space-y-1.5">
                {b.items.map((it) => {
                  const on = checked.has(it.line);
                  return (
                    <li key={it.line}>
                      <button
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => onToggle(it.line)}
                        className={cn("flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400", on ? "border-teal-200 bg-teal-50/60" : "border-line bg-white hover:border-navy-500/30")}
                      >
                        <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors", on ? "border-teal-500 bg-teal-500 text-white" : "border-navy-500/30 bg-white")}>
                          {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                        </span>
                        <span className={cn("text-[14px]", on && "text-navy-600 line-through decoration-navy-500/30")}>{t(it.text)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            );
        }
      })}
    </article>
  );
}

/** Light inline emphasis: text before the first colon in a bullet becomes bold. */
function Inline({ text }: { text: string }) {
  const idx = text.indexOf(": ");
  if (idx > 0 && idx < 48) {
    return (
      <span>
        <strong className="font-semibold text-navy-900">{text.slice(0, idx)}:</strong>
        <Fragment>{text.slice(idx + 1)}</Fragment>
      </span>
    );
  }
  return <span>{text}</span>;
}
