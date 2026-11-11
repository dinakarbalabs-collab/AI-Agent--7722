import { cn } from "@/lib/utils";
import { formatPct } from "../lib/currency";

export function Pct({ v, className, digits }: { v: number | null | undefined; className?: string; digits?: number }) {
  if (v == null) return <span className={cn("num text-muted-foreground", className)}>—</span>;
  const flat = Math.abs(v) < 0.005;
  return <span className={cn("num", flat ? "text-muted-foreground" : v >= 0 ? "text-gain" : "text-loss", className)}>{flat ? "0.00%" : formatPct(v, digits)}</span>;
}

export function Verdict({ v, size = "md" }: { v: "Bullish" | "Neutral" | "Bearish"; size?: "sm" | "md" | "lg" }) {
  const c = v === "Bullish" ? "text-gain bg-gain/10 border-gain/30" : v === "Bearish" ? "text-loss bg-loss/10 border-loss/30" : "text-warn bg-warn/10 border-warn/30";
  const arrow = v === "Bullish" ? "▲" : v === "Bearish" ? "▼" : "◆";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-semibold", c,
      size === "sm" ? "px-2 py-0.5 text-[11px]" : size === "lg" ? "px-4 py-1.5 text-base" : "px-3 py-1 text-xs")}>
      <span className="text-[0.7em]">{arrow}</span>{v}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} />;
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}

export function timeAgo(ts: number | null | undefined) {
  if (!ts) return "—";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}
