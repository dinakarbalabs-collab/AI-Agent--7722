import { useState } from "react";
import { Link, useParams } from "wouter";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "../components/layout";
import { Pct, Skeleton, Panel } from "../components/bits";
import { PriceChart, type Range } from "../components/price-chart";
import { IndicatorCards } from "../components/indicator-cards";
import { ForecastPanel } from "../components/forecast-panel";
import { WatchButton } from "../components/watch-button";
import { SetAlertButton } from "../components/alert-dialog";
import { useMoney } from "../lib/currency";
import { useAnalysis, useHistory } from "../queries/coin";

const RANGES: { id: Range; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "1y", label: "1Y" },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="num mt-0.5 text-sm font-semibold sm:text-base">{value}</div>
    </div>
  );
}

export default function CoinPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [range, setRange] = useState<Range>("30d");
  const money = useMoney();
  const an = useAnalysis(id);
  const hist = useHistory(id, range);
  const a = an.data;
  const notFound = (an.error as { code?: string } | null)?.code === "NOT_FOUND";

  return (
    <Layout>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All markets</Link>

        {notFound ? (
          <Panel className="mx-auto max-w-lg p-10 text-center">
            <h1 className="font-display text-2xl font-semibold">Coin not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">Oracle covers the top 50 coins by market cap, and “{id}” isn't one of them.</p>
            <Link to="/" className="btn-glow mt-6 inline-block rounded-xl px-6 py-2.5 text-sm font-semibold">Back to markets</Link>
          </Panel>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-4">
              {a ? (
                <div className="flex items-center gap-4">
                  <img src={a.coin.image} alt="" className="size-14 rounded-full" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-2xl font-semibold sm:text-3xl">{a.coin.name}</h1>
                      <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs font-semibold text-muted-foreground">{a.coin.symbol}</span>
                      <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs text-muted-foreground">Rank #{a.coin.rank}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="num text-3xl font-semibold sm:text-4xl">{money(a.coin.price)}</span>
                      <span className="text-sm"><Pct v={a.coin.change24h} /> <span className="text-dim">24h</span></span>
                      <span className="text-sm"><Pct v={a.coin.change7d} /> <span className="text-dim">7d</span></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4"><Skeleton className="size-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-9 w-64" /></div></div>
              )}
              {a && (
                <div className="flex flex-wrap gap-2">
                  <WatchButton coinId={a.coin.id} variant="full" />
                  <SetAlertButton coinId={a.coin.id} name={a.coin.name} price={a.coin.price} />
                </div>
              )}
            </header>

            {an.isError && !a && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-sm text-loss">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">{(an.error as Error).message || "Couldn't load analysis."}</span>
                <button onClick={() => an.refetch()} className="inline-flex items-center gap-1.5 rounded-lg border border-loss/40 px-3 py-1.5 font-medium hover:bg-loss/10"><RefreshCw className="size-3.5" />Retry</button>
              </div>
            )}

            <Panel className="p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Price chart</h2>
                <div className="flex gap-1 rounded-xl bg-white/[0.05] p-1">
                  {RANGES.map((r) => (
                    <button key={r.id} onClick={() => setRange(r.id)} className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold transition", range === r.id ? "bg-brand text-white shadow-[0_0_18px_-4px_#6D5BFF]" : "text-muted-foreground hover:text-foreground")}>{r.label}</button>
                  ))}
                </div>
              </div>
              {hist.isError && !hist.data ? (
                <div className="grid h-[380px] place-items-center text-center text-sm text-muted-foreground">
                  <div>{(hist.error as Error).message}<br /><button onClick={() => hist.refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-foreground hover:bg-white/5"><RefreshCw className="size-3.5" />Retry</button></div>
                </div>
              ) : (
                <PriceChart range={range} prices={hist.data?.prices ?? []} volumes={hist.data?.volumes ?? []} analysis={a} loading={hist.isLoading} />
              )}
            </Panel>

            {a ? (
              <>
                <IndicatorCards a={a} />
                <ForecastPanel a={a} />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Market cap" value={money(a.coin.marketCap, { compact: true })} />
                  <Stat label="24h volume" value={money(a.coin.volume24h, { compact: true })} />
                  <Stat label="24h high / low" value={`${money(a.coin.high24h)} / ${money(a.coin.low24h)}`} />
                  <Stat label="All-time high" value={`${money(a.coin.ath)} (${a.coin.athChangePct.toFixed(0)}%)`} />
                </div>
                {a.description && <Panel className="p-5 text-sm leading-relaxed text-muted-foreground"><h3 className="mb-1 font-semibold text-foreground">About {a.coin.name}</h3>{a.description}{a.description.length >= 419 ? "…" : ""}</Panel>}
              </>
            ) : !an.isError ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
                <Skeleton className="h-96 rounded-2xl" />
                <p className="text-center text-xs text-dim">Crunching 1 year of price history… the first load of a coin can take a few seconds.</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Layout>
  );
}
