import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, LogOut, Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency, useMoney, type Currency } from "../lib/currency";
import { authClient } from "../lib/auth";
import { useAlerts, useMarkSeen, useSession } from "../queries/user";
import { useMarkets } from "../queries/market";
import { timeAgo } from "./bits";

function CurrencyToggle() {
  const { currency, setCurrency, rate, rateUpdatedAt, rateSource } = useCurrency();
  const opts: { v: Currency; label: string }[] = [{ v: "USD", label: "$ USD" }, { v: "INR", label: "₹ INR" }];
  return (
    <fieldset
      aria-label="Currency"
      title={`$1 = ₹${rate.toFixed(2)}${rateUpdatedAt ? ` · rate updated ${timeAgo(rateUpdatedAt)}` : ""}${rateSource ? ` · ${rateSource}` : ""}`}
      className="relative m-0 flex min-w-0 rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs font-semibold"
    >
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => setCurrency(o.v)}
          aria-pressed={currency === o.v}
          className={cn("relative whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors sm:px-3", currency === o.v ? "text-white" : "text-muted-foreground hover:text-foreground")}
        >
          {currency === o.v && <span className="btn-glow absolute inset-0 rounded-full" />}
          <span className="relative num">{o.label}</span>
        </button>
      ))}
    </fieldset>
  );
}

function Bell_() {
  const { user } = useSession();
  const alerts = useAlerts();
  const markSeen = useMarkSeen();
  const money = useMoney();
  const markets = useMarkets();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toasted = useRef<Set<number>>(new Set());
  const first = useRef(true);
  const [, nav] = useLocation();

  const unseen = (alerts.data ?? []).filter((a) => a.status === "triggered" && !a.seen);
  const nameOf = (id: string) => markets.data?.coins.find((c) => c.id === id)?.name ?? id;

  useEffect(() => {
    if (!alerts.data) return;
    // On first load only toast alerts triggered recently; later toast everything new.
    for (const a of unseen) {
      if (toasted.current.has(a.id)) continue;
      toasted.current.add(a.id);
      import("sonner").then(({ toast }) =>
        toast(`${nameOf(a.coinId)} hit your alert`, {
          description: `Price went ${a.direction === "above" ? "above" : "below"} ${money(a.targetUsd)} (now ${money(a.triggeredPriceUsd)})`,
          action: { label: "View", onClick: () => nav("/alerts") },
          duration: 9000,
        }));
    }
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.data]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!user) return null;
  return (
    <div className="relative" ref={ref}>
      <button aria-label="Notifications" onClick={() => setOpen((o) => !o)} className="relative grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:text-foreground">
        <Bell className="size-4" />
        {unseen.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-loss text-[10px] font-bold text-white">{unseen.length}</span>
        )}
      </button>
      {open && (
        <div className="glass absolute right-0 top-11 z-50 w-80 rounded-2xl bg-[#0e0e19]/95 p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-display text-sm font-semibold">Alerts</span>
            {unseen.length > 0 && <button className="text-xs text-brand-soft hover:underline" onClick={() => markSeen.mutate({})}>Mark all read</button>}
          </div>
          {unseen.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">No new triggered alerts.</p>
          ) : (
            <ul className="space-y-1.5">
              {unseen.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm">
                  <div className="font-medium">{nameOf(a.coinId)} went {a.direction} {money(a.targetUsd)}</div>
                  <div className="num text-xs text-muted-foreground">at {money(a.triggeredPriceUsd)}</div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" onClick={() => setOpen(false)} className="mt-2 block rounded-lg px-1 py-1.5 text-center text-xs text-muted-foreground hover:text-foreground">Manage alerts →</Link>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [loc] = useLocation();
  const { user, loading } = useSession();
  const [menu, setMenu] = useState(false);
  const links = [
    { to: "/", label: "Markets", active: loc === "/" || loc.startsWith("/coin") },
    { to: "/watchlist", label: "Watchlist", active: loc.startsWith("/watchlist") },
    { to: "/alerts", label: "Alerts", active: loc.startsWith("/alerts") },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#05050a]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="btn-glow grid size-8 place-items-center rounded-xl"><Sparkles className="size-4" /></span>
          <span className="hidden font-display text-[17px] font-semibold tracking-tight min-[420px]:inline">Oracle</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={cn("rounded-full px-3.5 py-1.5 text-sm transition-colors", l.active ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:text-foreground")}>{l.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
          <CurrencyToggle />
          <Bell_ />
          {!loading && (user ? (
            <button onClick={() => authClient.signOut()} title={user.email} className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1.5 pl-3 pr-3.5 text-sm text-muted-foreground transition hover:text-foreground sm:flex">
              <LogOut className="size-3.5" /> Sign out
            </button>
          ) : (
            <Link to="/sign-in" className="whitespace-nowrap rounded-xl border border-white/12 bg-black/40 px-3 py-2 text-sm font-medium sm:px-4 transition hover:border-brand/60 hover:shadow-[0_0_24px_rgba(109,91,255,.3)]">Sign in</Link>
          ))}
          <button className="grid size-9 place-items-center rounded-full border border-white/10 md:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu">
            {menu ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {menu && (
        <div className="border-t border-white/[0.06] px-4 py-3 md:hidden">
          {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setMenu(false)} className={cn("block rounded-lg px-3 py-2.5 text-sm", l.active ? "bg-white/[0.06]" : "text-muted-foreground")}>{l.label}</Link>)}
          {user && <button onClick={() => authClient.signOut()} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground">Sign out</button>}
        </div>
      )}
    </header>
  );
}
