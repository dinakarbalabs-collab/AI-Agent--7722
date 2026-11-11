import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarkets } from "../queries/market";
import { useMoney } from "../lib/currency";
import { Pct, Skeleton, timeAgo } from "./bits";
import { Sparkline } from "./sparkline";
import { WatchButton } from "./watch-button";

type SortKey = "rank" | "price" | "change24h" | "change7d" | "volume24h" | "marketCap";

export function MarketTable({ onlyIds, title }: { onlyIds?: string[]; title?: string }) {
  const { data, isLoading, isError, refetch } = useMarkets();
  const money = useMoney();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [dir, setDir] = useState<1 | -1>(1);

  const rows = useMemo(() => {
    let list = data?.coins ?? [];
    if (onlyIds) list = list.filter((c) => onlyIds.includes(c.id));
    if (cat !== "all") list = list.filter((c) => c.categories.includes(cat as never));
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((c) => c.name.toLowerCase().includes(s) || c.symbol.toLowerCase().includes(s));
    return [...list].sort((a, b) => {
      const av = (a[sort] ?? -Infinity) as number, bv = (b[sort] ?? -Infinity) as number;
      return (av - bv) * dir;
    });
  }, [data, q, cat, sort, dir, onlyIds]);

  const setSortKey = (k: SortKey) => {
    if (k === sort) setDir((d) => (d === 1 ? -1 : 1));
    else { setSort(k); setDir(k === "rank" ? 1 : -1); }
  };

  const Th = ({ k, children, className }: { k?: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cn("px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", className)}>
      {k ? (
        <button onClick={() => setSortKey(k)} className={cn("inline-flex items-center gap-1 hover:text-foreground", sort === k && "text-foreground")}>
          {children}{sort === k && (dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
        </button>
      ) : children}
    </th>
  );

  return (
    <section id="markets" className="scroll-mt-24">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title ?? "Top 50 by market cap"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? <>Live · updated {timeAgo(data.updatedAt)}{data.stale && <span className="ml-2 rounded bg-warn/15 px-1.5 py-0.5 text-xs text-warn">delayed — API throttled</span>}</> : "Loading live prices…"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 focus-within:border-brand lg:w-80">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or ticker…" aria-label="Search coins" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-dim" />
        </div>
      </div>

      {!onlyIds && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {[{ key: "all", label: "All" }, ...(data?.categories ?? [])].map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm transition",
                cat === c.key ? "border-brand/60 bg-brand/15 text-white shadow-[0_0_20px_rgba(109,91,255,.25)]" : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-foreground")}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="border-b border-white/[0.07] bg-white/[0.02]">
              <tr>
                <Th k="rank" className="w-12 pl-5 text-left">#</Th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Coin</th>
                <Th k="price">Price</Th>
                <Th k="change24h">24h</Th>
                <Th k="change7d">7d</Th>
                <Th k="volume24h" className="hidden md:table-cell">24h Volume</Th>
                <Th k="marketCap" className="hidden sm:table-cell">Market Cap</Th>
                <Th className="hidden lg:table-cell">Last 7 days</Th>
                <th className="w-12 pr-3"><span className="sr-only">Watch</span></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]"><td colSpan={9} className="px-5 py-3"><Skeleton className="h-8 w-full" /></td></tr>
              ))}
              {rows.map((c) => (
                <tr key={c.id} className="group border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.035]">
                  <td className="num pl-5 text-muted-foreground">{c.rank}</td>
                  <td className="px-3 py-3">
                    <Link to={`/coin/${c.id}`} aria-label={`${c.name} details`} className="flex items-center gap-3">
                      <img src={c.image} alt="" loading="lazy" className="size-8 rounded-full" />
                      <span className="flex flex-col leading-tight">
                        <span className="font-semibold group-hover:text-brand-soft">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.symbol}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="num px-3 py-3 text-right font-medium">{money(c.price)}</td>
                  <td className="px-3 py-3 text-right"><Pct v={c.change24h} /></td>
                  <td className="px-3 py-3 text-right"><Pct v={c.change7d} /></td>
                  <td className="num hidden px-3 py-3 text-right text-muted-foreground md:table-cell">{money(c.volume24h, { compact: true })}</td>
                  <td className="num hidden px-3 py-3 text-right sm:table-cell">{money(c.marketCap, { compact: true })}</td>
                  <td className="hidden px-3 py-3 lg:table-cell"><div className="ml-auto w-28"><Sparkline data={c.sparkline} up={(c.change7d ?? 0) >= 0} /></div></td>
                  <td className="pr-3 text-right"><WatchButton coinId={c.id} /></td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-16 text-center text-muted-foreground">
                  {isError ? <>Couldn't load market data. <button className="text-brand-soft underline" onClick={() => refetch()}>Retry</button></> : "No coins match your filters."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
