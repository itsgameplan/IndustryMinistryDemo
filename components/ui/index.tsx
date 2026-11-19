"use client";

// JAHEZ UI primitives (shadcn/ui-style, owned by the orchestrator). Import from "@/components/ui".
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { X, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// ---------------- Button ----------------
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-navy-900 text-white shadow-sm hover:bg-navy-800",
        accent: "bg-teal-500 text-white shadow-sm hover:bg-teal-600",
        gold: "bg-gold-500 text-navy-950 shadow-sm hover:bg-gold-400",
        outline: "border border-line bg-white text-navy-900 hover:bg-canvas hover:border-navy-500/30",
        ghost: "text-navy-700 hover:bg-navy-900/5",
        subtle: "bg-teal-50 text-teal-700 hover:bg-teal-100",
        danger: "bg-red-600 text-white hover:bg-red-700",
        dark: "bg-white/10 text-white border border-white/10 hover:bg-white/15",
      },
      size: { sm: "h-8 px-3 text-xs", md: "h-10 px-4", lg: "h-12 px-6 text-base", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

// ---------------- Card ----------------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[15px] font-semibold tracking-tight text-navy-900", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-muted", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

// ---------------- Badge ----------------
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide [&_svg]:size-3", {
  variants: {
    tone: {
      neutral: "bg-navy-900/5 text-navy-700",
      teal: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
      gold: "bg-gold-50 text-gold-600 ring-1 ring-inset ring-gold-300/60",
      red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
      green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      navy: "bg-navy-900 text-white",
      outline: "ring-1 ring-inset ring-line text-navy-700 bg-white",
    },
  },
  defaultVariants: { tone: "neutral" },
});
export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

// ---------------- Progress ----------------
export function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-navy-900/[0.06]", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-teal-500 transition-[width] duration-500 ease-out", barClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

// ---------------- Skeleton ----------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-lg bg-[linear-gradient(90deg,#EEF1F5_0%,#F7F9FB_50%,#EEF1F5_100%)] bg-[length:200%_100%]", className)} />;
}

// ---------------- Tabs ----------------
export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex items-center gap-1 rounded-xl bg-navy-900/[0.05] p-1", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-navy-600 transition-all hover:text-navy-900 data-[state=active]:bg-white data-[state=active]:text-navy-900 data-[state=active]:shadow-sm [&_svg]:size-4", className)}
      {...props}
    />
  );
}
export const TabsContent = TabsPrimitive.Content;

// ---------------- Dialog ----------------
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, children, title, description, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string; description?: string }) {
  const t = useT();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-[2px] data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-white p-6 shadow-lift focus:outline-none", className)}
        {...props}
      >
        <DialogPrimitive.Title className="text-lg font-semibold tracking-tight text-navy-900">{title}</DialogPrimitive.Title>
        {description ? <DialogPrimitive.Description className="mt-1 text-sm text-muted">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
        <div className="mt-4">{children}</div>
        <DialogPrimitive.Close className="absolute end-4 top-4 rounded-md p-1 text-muted hover:bg-canvas hover:text-navy-900" aria-label={t("Close")}>
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// ---------------- Form controls ----------------
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy-900 placeholder:text-muted/70 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-muted/70 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100", className)} {...props} />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-600", className)} {...props} />;
}

// ---------------- Demo disclaimer ----------------
/** Required on any government certificate, licence, inspection, national statistic or AI assessment. */
export function DemoDisclaimer({ children, className }: { children?: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border border-gold-300/60 bg-gold-50 px-3 py-2 text-xs text-gold-600", className)}>
      <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
      <span>{children ?? t("Demonstration simulation with fictional data. Not an official Ministry of Industry record or authorisation.")}</span>
    </div>
  );
}

// ---------------- Stat ----------------
export function Stat({ label, value, hint, icon, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-4 shadow-card", className)}>
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        <span>{label}</span>
        {icon ? <span className="text-navy-500 [&_svg]:size-4">{icon}</span> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-navy-900 tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

// ---------------- Empty state ----------------
export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-grid flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-xl bg-white text-teal-600 shadow-card [&_svg]:size-6">{icon}</div> : null}
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
