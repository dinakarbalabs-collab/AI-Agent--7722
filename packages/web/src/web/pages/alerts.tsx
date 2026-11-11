import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "../components/layout";
import { SignInGate } from "../components/signin-gate";
import { Skeleton } from "../components/bits";
import { SetAlertButton } from "../components/alert-dialog";
import { useAlerts, useMarkSeen, useRemoveAlert } from "../queries/user";
import { useMarkets } from "../queries/market";
import { formatAmount, useMoney } from "../lib/currency";

function Body() {
  const alerts = useAlerts();
  const markets = useMarkets();
  const remove = useRemoveAlert();
  const markSeen = useMarkSeen();
  const money = useMoney();
  const [pick, setPick] = useState("bitcoin");
  const coins = markets.data?.coins ?? [];
  const sel = coins.find((c) => c.id === pick);

  useEffect(() => {
    if ((alerts.data ?? []).some((a) => a.status === "triggered" && !a.seen)) markSeen.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.data?.length]);

  const rows = alerts.data ?? [];
  const active = rows.filter((a) => a.status === "active");
  const triggered = rows.filter((a) => a.status === "triggered");

  const Row = ({ a }: { a: (typeof rows)[number] }) => {
    const c = coins.find((x) => x.id === a.coinId);
    return (
      <li className="flex items-center gap-4 border-b border-white/[0.05] px-5 py-4 last:border-0">
        {c && <img src={c.image} className="size-8 rounded-full" alt="" />}
        <div className="min-w-0 flex-1">
          <Link to={`/coin/${a.coinId}`} className="font-semibold hover:text-brand-soft">{c?.name ?? a.coinId}</Link>
          <div className="num text-sm text-muted-foreground">
            {a.direction === "above" ? "Rises above" : "Falls below"}{" "}
            <span className={a.direction === "above" ? "text-gain" : "text-loss"}>{money(a.targetUsd)}</span>
            {a.inputCurrency === "INR" && a.inputAmount != null && <span className="ml-2 text-xs text-dim">(set as {formatAmount(a.inputAmount, "INR")})</span>}
          </div>
          {a.status === "triggered" && <div className="num mt-0.5 text-xs text-warn">Triggered at {money(a.triggeredPriceUsd)} · {a.triggeredAt ? new Date(a.triggeredAt).toLocaleString() : ""}</div>}
        </div>
        {a.status === "active" && c && <div className="num hidden text-right text-sm sm:block"><div className="text-xs text-muted-foreground">Now</div>{money(c.price)}</div>}
        <button onClick={() => remove.mutate({ id: a.id }, { onError: () => toast.error("Couldn't delete alert") })} aria-label="Delete alert" className="grid size-9 place-items-center rounded-lg text-dim transition hover:bg-loss/10 hover:text-loss"><Trash2 className="size-4" /></button>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Price alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Triggered in-app while Oracle is open. Targets are stored in USD.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Coin" className="rounded-xl border border-white/12 bg-[#0b0b14] px-3 py-2.5 text-sm outline-none focus:border-brand">
            {coins.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
          </select>
          {sel && <SetAlertButton coinId={sel.id} name={sel.name} price={sel.price} />}
        </div>
      </div>

      {alerts.isLoading ? <Skeleton className="h-40 w-full" /> : rows.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand/15 text-brand-soft"><BellRing className="size-5" /></span>
          <p className="mt-4 font-medium">No alerts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick a coin above and choose the price you want to be told about.</p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">Active <span className="num text-muted-foreground">({active.length})</span></h2>
            <ul className="glass rounded-2xl">{active.length ? active.map((a) => <Row key={a.id} a={a} />) : <li className="px-5 py-6 text-sm text-muted-foreground">No active alerts.</li>}</ul>
          </section>
          {triggered.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-semibold">Triggered <span className="num text-muted-foreground">({triggered.length})</span></h2>
              <ul className="glass rounded-2xl">{triggered.map((a) => <Row key={a.id} a={a} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function AlertsPage() {
  return <Layout><SignInGate title="Price alerts"><Body /></SignInGate></Layout>;
}
