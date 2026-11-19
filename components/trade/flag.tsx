import Image from "next/image";
import { flagUrl } from "@/lib/data/trade";
import { cn } from "@/lib/utils";

/** Small rounded flag image. */
export function Flag({ iso, className, size = "sm" }: { iso: string; className?: string; size?: "sm" | "lg" }) {
  const w = size === "lg" ? 36 : 16;
  return <Image src={flagUrl(iso, size === "lg" ? 80 : 40)} alt="" width={w} height={Math.round(w * 0.75)} unoptimized className={cn("inline-block shrink-0 rounded-[3px] object-cover shadow-sm ring-1 ring-black/10", className)} />;
}
