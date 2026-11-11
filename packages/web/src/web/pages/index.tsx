import { Link } from "wouter";
import { motion } from "motion/react";
import { ArrowRight, Brain, BellRing, LineChart } from "lucide-react";
import { Layout } from "../components/layout";
import { MarketTable } from "../components/market-table";
import { Pct, Skeleton } from "../components/bits";
import { Sparkline } from "../components/sparkline";
import { useMarkets, useOverview } from "../queries/market";
import { useMoney } from "../lib/currency";

const fgColor = (v: number) => (v < 25 ? "text-loss" : v < 45 ? "text-warn" : v < 55 ? "text-foreground" : "text-gain");

function StatsStrip() {
  const { data } = useOverview();
  const money = useMoney();
  const items = [
    { label: "Top-50 market cap", value: data ? money(data.totalCap, { compact: true }) : null, sub: data?.capChange24h != null ? <Pct v={data.capChange24h} /> : null },
    { label: "24h volume", value: data ? money(data.totalVol, { compact: true }) : null },
    { label: "BTC dominance", value: data?.btcDominance != null ? `${data.btcDominance.toFixed(1)}%` : null, sub: <span className="text-xs text-muted-foreground">of top 50</span> },
    { label: "Fear & Greed", value: data?.fearGreed ? String(data.fearGreed.value) : null, sub: data?.fearGreed ? <span className={`text-xs font-medium ${fgColor(data.fearGreed.value)}`}>{data.fearGreed.label}</span> : null, cls: data?.fearGreed ? fgColor(data.fearGreed.value) : "" },
  ];
  return (
    <div className="glass grid grid-cols-2 divide-white/[0.07] rounded-2xl md:grid-cols-4 md:divide-x">
      {items.map((it) => (
        <div key={it.label} className="px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{it.label}</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            {it.value ? <span className={`num text-xl font-semibold sm:text-2xl ${it.cls ?? ""}`}>{it.value}</span> : <Skeleton className="h-7 w-24" />}
            {it.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroMock() {
  const { data } = useMarkets();
  const money = useMoney();
  const coins = data?.coins ?? [];
  const movers = [...coins].filter((c) => c.change24h != null).sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0)).slice(0, 4);
  const btc = coins.find((c) => c.id === "bitcoin");
  return (
    <div className="relative mx-auto mt-14 h-[330px] w-full max-w-4xl sm:h-[360px]" style={{ perspective: 1400 }}>
      <div className="absolute inset-x-0 bottom-0 top-6 mx-auto w-[92%] rounded-2xl border border-brand/40 bg-gradient-to-b from-brand/20 via-[#0d0d1c]/90 to-[#08080f] shadow-[0_0_80px_rgba(109,91,255,.35)]" style={{ transform: "rotateX(14deg)", transformOrigin: "bottom" }}>
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
          <span className="size-2 rounded-full bg-white/20" /><span className="size-2 rounded-full bg-white/20" /><span className="size-2 rounded-full bg-white/20" />
          <span className="ml-3 text-xs text-muted-foreground">oracle · live</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-white/8 bg-black/30 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">{btc && <img src={btc.image} className="size-5 rounded-full" alt="" />} Bitcoin</div>
            <div className="num mt-1 text-2xl font-semibold sm:text-3xl">{btc ? money(btc.price) : <Skeleton className="h-8 w-40" />}</div>
            <div className="mt-3"><Sparkline data={btc?.sparkline ?? []} up={(btc?.change7d ?? 0) >= 0} w={360} h={90} /></div>
          </div>
          <div className="hidden space-y-2 rounded-xl border border-white/8 bg-black/30 p-4 sm:block">
            <div className="text-xs font-semibold text-muted-foreground">Biggest 24h gainers</div>
            {movers.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><img src={c.image} className="size-4 rounded-full" alt="" />{c.symbol}</span>
                <Pct v={c.change24h} className="text-xs" />
              </div>
            ))}
            {!movers.length && <Skeleton className="h-20 w-full" />}
          </div>
        </div>
      </div>
    </div>
  );
}

const fade = (i: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 * i, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const } });

export default function Index() {
  return (
    <Layout>
      <section className="relative overflow-hidden border-b border-white/[0.06] px-4 pb-0 pt-16 sm:px-6 sm:pt-24">
        <div className="glow-orb left-1/2 top-10 h-72 w-[34rem] -translate-x-1/2 opacity-60" />
        <div className="grid-floor" />
        <div className="relative mx-auto max-w-[1280px] text-center">
          <motion.p {...fade(0)} className="text-sm font-medium text-brand-soft">AI-powered crypto market intelligence</motion.p>
          <motion.h1 {...fade(1)} className="text-grad mx-auto mt-4 max-w-4xl text-[clamp(2.4rem,6.4vw,4.9rem)] font-semibold leading-[1.02]">
            See where the market is heading, in plain English
          </motion.h1>
          <motion.p {...fade(2)} className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Live prices for the top 50 coins, technical indicators decoded, and 7-day and 30-day outlooks with support and resistance drawn right on the chart.
          </motion.p>
          <motion.div {...fade(3)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#markets" className="btn-glow inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold">Explore markets <ArrowRight className="size-4" /></a>
            <Link to="/coin/bitcoin" className="rounded-xl border border-white/12 bg-black/40 px-6 py-3 text-sm font-medium transition hover:border-brand/60">See a sample forecast</Link>
          </motion.div>
          <motion.div {...fade(4)}><HeroMock /></motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] space-y-10 px-4 py-10 sm:px-6">
        <StatsStrip />
        <MarketTable />

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { icon: LineChart, t: "Indicators, decoded", d: "RSI, 50/200-day trend and volatility translated into one clear sentence each." },
            { icon: Brain, t: "AI forecast & outlook", d: "Trend, volume momentum and sentiment combined into a Bullish, Neutral or Bearish call, with the reasoning shown." },
            { icon: BellRing, t: "Watchlist & alerts", d: "Save your coins and get notified in-app when a price crosses your line." },
          ].map((f) => (
            <div key={f.t} className="glass rounded-2xl p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-brand/15 text-brand-soft shadow-[0_0_24px_rgba(109,91,255,.25)]"><f.icon className="size-5" /></span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}
