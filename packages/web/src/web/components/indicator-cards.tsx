import { cn } from "@/lib/utils";
import { useMoney } from "../lib/currency";
import type { Analysis } from "../queries/types";
import { Panel } from "./bits";

function Card({ title, badge, badgeClass, children, text }: { title: string; badge: string; badgeClass: string; children: React.ReactNode; text: string }) {
  return (
    <Panel className="flex flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", badgeClass)}>{badge}</span>
      </div>
      <div className="my-4">{children}</div>
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">{text}</p>
    </Panel>
  );
}

const GAIN = "border-gain/30 bg-gain/10 text-gain";
const LOSS = "border-loss/30 bg-loss/10 text-loss";
const WARN = "border-warn/30 bg-warn/10 text-warn";
const MUTE = "border-white/15 bg-white/5 text-muted-foreground";

export function IndicatorCards({ a }: { a: Analysis }) {
  const money = useMoney();
  const { rsi, trend, volatility, volume } = a.indicators;
  const rsiClass = rsi.label === "Overbought" ? LOSS : rsi.label === "Oversold" ? GAIN : rsi.label === "Neutral" ? WARN : MUTE;
  const trendClass = trend.direction === "Uptrend" ? GAIN : trend.direction === "Downtrend" ? LOSS : trend.direction === "Sideways" ? WARN : MUTE;
  const volClass = volatility.label === "Low" ? GAIN : volatility.label === "Moderate" ? WARN : LOSS;
  const volumeClass = volume.label === "Rising" ? GAIN : volume.label === "Falling" ? LOSS : MUTE;
  const rv = rsi.value;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card title="RSI (14)" badge={rsi.label} badgeClass={rsiClass} text={rsi.text}>
        <div className="num text-3xl font-semibold">{rv != null ? rv.toFixed(0) : "—"}<span className="text-base text-dim"> / 100</span></div>
        <div className="relative mt-3 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#22D39A 0 30%,#F5B544 30% 70%,#FF5C7A 70% 100%)", opacity: 0.85 }}>
          {rv != null && <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-background shadow" style={{ left: `${Math.min(100, Math.max(0, rv))}%` }} />}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-dim"><span>Oversold &lt;30</span><span>Overbought &gt;70</span></div>
      </Card>

      <Card title="Trend · 50 vs 200-day" badge={trend.direction} badgeClass={trendClass} text={trend.text}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">50-day average</span><span className="num">{money(trend.sma50)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">200-day average</span><span className="num">{money(trend.sma200)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Gap</span>
            <span className={cn("num", (trend.spreadPct ?? 0) >= 0 ? "text-gain" : "text-loss")}>{trend.spreadPct != null ? `${trend.spreadPct >= 0 ? "+" : ""}${trend.spreadPct.toFixed(1)}%` : "—"}</span></div>
          {trend.cross && <div className={cn("rounded-lg px-2.5 py-1.5 text-xs", trend.cross === "golden" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss")}>
            {trend.cross === "golden" ? "Golden cross: the 50-day recently moved above the 200-day." : "Death cross: the 50-day recently fell below the 200-day."}</div>}
        </div>
      </Card>

      <Card title="Volatility score" badge={volatility.label} badgeClass={volClass} text={volatility.text}>
        <div className="num text-3xl font-semibold">{volatility.score}<span className="text-base text-dim"> / 100</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${volatility.score}%`, background: "linear-gradient(90deg,#22D39A,#F5B544,#FF5C7A)" }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-dim"><span>Calm</span><span>Wild</span></div>
      </Card>

      <Card title="Trading volume" badge={volume.label} badgeClass={volumeClass} text={volume.text}>
        <div className={cn("num text-3xl font-semibold", (volume.momentumPct ?? 0) >= 0 ? "text-gain" : "text-loss")}>
          {volume.momentumPct != null ? `${volume.momentumPct >= 0 ? "+" : ""}${volume.momentumPct.toFixed(0)}%` : "—"}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">vs. 30-day average</div>
        <div className="mt-3 text-sm text-muted-foreground">24h volume <span className="num text-foreground">{money(a.coin.volume24h, { compact: true })}</span></div>
      </Card>
    </div>
  );
}
