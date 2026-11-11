import { Link } from "wouter";
import { Star } from "lucide-react";
import { Layout } from "../components/layout";
import { SignInGate } from "../components/signin-gate";
import { MarketTable } from "../components/market-table";
import { useAlerts, useWatchlist } from "../queries/user";
import { useMoney } from "../lib/currency";
import { useMarkets } from "../queries/market";

function Body() {
  const list = useWatchlist();
  const alerts = useAlerts();
  const markets = useMarkets();
  const money = useMoney();
  const ids = list.data?.map((w) => w.coinId) ?? [];
  const active = (alerts.data ?? []).filter((a) => a.status === "active" && ids.includes(a.coinId));

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-4 py-10 sm:px-6">
      {list.isLoading ? null : ids.length === 0 ? (
        <div className="glass mx-auto max-w-lg rounded-2xl p-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-warn/10 text-warn"><Star className="size-5" /></span>
          <h1 className="mt-4 text-2xl font-semibold">Your watchlist is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tap the star next to any coin to track it here.</p>
          <Link to="/" className="btn-glow mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold">Browse markets</Link>
        </div>
      ) : (
        <>
          <MarketTable onlyIds={ids} title="Your watchlist" />
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-semibold">Active alerts on watched coins</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((a) => {
                  const c = markets.data?.coins.find((x) => x.id === a.coinId);
                  return (
                    <Link key={a.id} to={`/coin/${a.coinId}`} className="glass rounded-xl px-4 py-3 transition hover:border-brand/50">
                      <div className="text-sm font-medium">{c?.name ?? a.coinId}</div>
                      <div className="num mt-0.5 text-sm text-muted-foreground">goes {a.direction} <span className={a.direction === "above" ? "text-gain" : "text-loss"}>{money(a.targetUsd)}</span></div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  return <Layout><SignInGate title="Your watchlist"><Body /></SignInGate></Layout>;
}
