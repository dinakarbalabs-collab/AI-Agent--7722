import { RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMoney } from "../lib/currency";
import { useNarrative } from "../queries/coin";
import type { Analysis } from "../queries/types";
import { Panel, Skeleton, Verdict } from "./bits";

type Horizon = Analysis["forecast"]["h7"];

function HorizonCard({ h, label }: { h: Horizon; label: string }) {
  const money = useMoney();
  const span = h.high - h.low || 1;
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - h.low) / span) * 100))}%`;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Verdict v={h.verdict} size="lg" />
      </div>
      <div className="mt-4 flex items-baseline justify-between text-xs text-muted-foreground">
        <span>Confidence</span><span className="num text-sm text-foreground">{h.confidence}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: `${h.confidence}%` }} /></div>
      <div className="mt-4 text-xs text-muted-foreground">Likely price range</div>
      <div className="relative mt-2 h-1.5 rounded-full bg-white/10">
        <span className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-white" style={{ left: pos(h.mid) }} />
      </div>
      <div className="num mt-2 flex justify-between text-xs"><span className="text-loss">{money(h.low)}</span><span className="text-gain">{money(h.high)}</span></div>
    </div>
  );
}

function Signals({ h }: { h: Horizon }) {
  return (
    <div className="space-y-2">
      {h.signals.map((s) => (
        <div key={s.name} className="flex items-center gap-3 text-sm">
          <span className={cn("w-1.5 self-stretch rounded-full", s.score > 0.05 ? "bg-gain" : s.score < -0.05 ? "bg-loss" : "bg-warn")} />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{s.name}</div>
            <div className="truncate text-xs text-muted-foreground" title={s.note}>{s.note}</div>
          </div>
          <span className={cn("num text-xs", s.score > 0.05 ? "text-gain" : s.score < -0.05 ? "text-loss" : "text-warn")}>
            {s.score > 0.05 ? "Bullish" : s.score < -0.05 ? "Bearish" : "Neutral"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ForecastPanel({ a }: { a: Analysis }) {
  const money = useMoney();
  const narr = useNarrative(a.coin.id, true);
  const f = a.forecast;
  const text = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = narr.data?.placeholders[k];
      return v != null ? money(v) : "—";
    });

  return (
    <Panel className="relative overflow-hidden p-5 sm:p-7">
      <div className="glow-orb pointer-events-none -right-24 -top-24 size-72 opacity-40" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-brand/20 text-brand-soft"><Sparkles className="size-4" /></span>
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">AI Forecast &amp; Outlook</h2>
            <p className="text-xs text-muted-foreground">Statistical model combining trend, momentum, volume and sentiment</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <HorizonCard h={f.h7} label="Next 7 days" />
          <HorizonCard h={f.h30} label="Next 30 days" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">Plain-English outlook
              {narr.data && <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{narr.data.source === "ai" ? "AI-written" : "Auto summary"}</span>}
            </h3>
            {narr.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-2/3" /></div>
            ) : narr.isError ? (
              <div className="rounded-lg bg-white/[0.04] p-3 text-sm text-muted-foreground">
                The written summary isn't available right now. The numbers above are unaffected.
                <button onClick={() => narr.refetch()} className="ml-2 inline-flex items-center gap-1 text-brand-soft hover:underline"><RefreshCw className="size-3" />Retry</button>
              </div>
            ) : narr.data ? (
              <>
                <p className="text-[15px] leading-relaxed text-foreground/90">{text(narr.data.summary)}</p>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {narr.data.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span className="mt-2 size-1 shrink-0 rounded-full bg-brand-soft" />{text(b)}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Key price levels</h3>
              <div className="space-y-1.5 text-sm">
                {f.resistances.slice().reverse().map((l, i) => (
                  <div key={`r${i}`} className="flex justify-between rounded-lg bg-loss/8 px-3 py-1.5"><span className="text-loss">Resistance</span><span className="num">{money(l.price)}</span></div>
                ))}
                <div className="flex justify-between rounded-lg border border-white/10 px-3 py-1.5"><span className="text-muted-foreground">Now</span><span className="num font-semibold">{money(a.coin.price)}</span></div>
                {f.supports.map((l, i) => (
                  <div key={`s${i}`} className="flex justify-between rounded-lg bg-gain/8 px-3 py-1.5"><span className="text-gain">Support</span><span className="num">{money(l.price)}</span></div>
                ))}
                {f.supports.length + f.resistances.length === 0 && <p className="text-xs text-muted-foreground">No clear levels detected.</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-white/[0.04] p-3">
                <div className="text-xs text-muted-foreground">Fear &amp; Greed</div>
                <div className="num mt-0.5 text-lg font-semibold">{f.sentiment.fearGreed ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{f.sentiment.fearGreedLabel ?? ""}</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-3">
                <div className="text-xs text-muted-foreground">Community bullish</div>
                <div className="num mt-0.5 text-lg font-semibold">{f.sentiment.communityUpPct != null ? `${f.sentiment.communityUpPct.toFixed(0)}%` : "—"}</div>
                <div className="text-xs text-muted-foreground">CoinGecko votes</div>
              </div>
            </div>
          </div>
        </div>

        <details className="group mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <summary className="cursor-pointer text-sm font-semibold marker:text-brand-soft">How the signals add up</summary>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div><div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">7-day</div><Signals h={f.h7} /></div>
            <div><div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">30-day</div><Signals h={f.h30} /></div>
          </div>
        </details>
        <p className="mt-4 text-[11px] text-dim">Forecasts are statistical estimates from past prices and sentiment, with an AI-written explanation. They can be wrong and are not financial advice.</p>
      </div>
    </Panel>
  );
}
