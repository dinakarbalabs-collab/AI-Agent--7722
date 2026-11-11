import { Star } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession, useToggleWatch, useWatchlist } from "../queries/user";

export function WatchButton({ coinId, variant = "icon" }: { coinId: string; variant?: "icon" | "full" }) {
  const { user } = useSession();
  const list = useWatchlist();
  const { toggle } = useToggleWatch();
  const [, nav] = useLocation();
  const watching = !!list.data?.some((w) => w.coinId === coinId);

  const click = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast("Sign in to build your watchlist"); nav("/sign-in"); return; }
    try { await toggle(coinId, watching); } catch { toast.error("Couldn't update watchlist"); }
  };

  if (variant === "full") {
    return (
      <button onClick={click} className={cn("inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
        watching ? "border-warn/40 bg-warn/10 text-warn" : "border-white/12 bg-white/[0.03] hover:border-white/25")}>
        <Star className={cn("size-4", watching && "fill-warn")} /> {watching ? "In watchlist" : "Add to watchlist"}
      </button>
    );
  }
  return (
    <button onClick={click} aria-label={watching ? "Remove from watchlist" : "Add to watchlist"} className="grid size-8 place-items-center rounded-lg text-dim transition hover:bg-white/[0.06] hover:text-warn">
      <Star className={cn("size-4", watching && "fill-warn text-warn")} />
    </button>
  );
}
