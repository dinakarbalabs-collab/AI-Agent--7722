import type { Indicators, Level } from "./indicators";
import { supportResistance } from "./indicators";

export type Verdict = "Bullish" | "Neutral" | "Bearish";
export type Signal = { name: string; score: number; weight: number; note: string };
export type HorizonForecast = {
  days: 7 | 30;
  verdict: Verdict;
  score: number; // -1..1
  confidence: number; // 0..100
  low: number;
  mid: number;
  high: number;
  signals: Signal[];
};
export type Forecast = {
  h7: HorizonForecast;
  h30: HorizonForecast;
  supports: Level[];
  resistances: Level[];
  sentiment: { communityUpPct: number | null; fearGreed: number | null; fearGreedLabel: string | null };
  pegged: boolean;
};

const clamp = (x: number, a = -1, b = 1) => Math.max(a, Math.min(b, x));

export function buildForecast(
  closes: number[],
  ind: Indicators,
  opts: { communityUpPct: number | null; fearGreed: number | null; fearGreedLabel: string | null },
): Forecast {
  const price = ind.price;
  const daily = ind.volatility.dailyPct / 100;
  const { supports, resistances } = supportResistance(closes, price);
  const pegged = ind.volatility.annualPct < 6 && price > 0.9 && price < 1.1;

  // --- signals (each -1..1) ---
  const trendSig = (() => {
    let s = 0;
    if (ind.trend.priceVs50Pct != null) s += clamp(ind.trend.priceVs50Pct / 12) * 0.5;
    if (ind.trend.spreadPct != null) s += clamp(ind.trend.spreadPct / 12) * 0.5;
    if (ind.trend.cross === "golden") s += 0.2;
    if (ind.trend.cross === "death") s -= 0.2;
    return clamp(s);
  })();
  const sigmaWeek = Math.max(daily, 0.004) * Math.sqrt(7);
  const sigmaMonth = Math.max(daily, 0.004) * Math.sqrt(30);
  const mom7 = ind.returns.d7 != null ? clamp(ind.returns.d7 / 100 / sigmaWeek / 1.5) : 0;
  const mom30 = ind.returns.d30 != null ? clamp(ind.returns.d30 / 100 / sigmaMonth / 1.5) : 0;
  const rsiV = ind.rsi.value;
  // RSI: mean-reversion at extremes, mild momentum in the middle band
  const rsiSig = rsiV == null ? 0 : rsiV >= 70 ? -clamp((rsiV - 65) / 20) : rsiV <= 30 ? clamp((35 - rsiV) / 20) : clamp((rsiV - 50) / 50) * 0.3;
  const volSig = (() => {
    if (ind.volume.momentumPct == null) return 0;
    const dir = Math.sign(ind.returns.d7 ?? 0);
    return clamp((ind.volume.momentumPct / 60)) * dir; // rising volume confirms the direction of the move
  })();
  const comm = opts.communityUpPct == null ? 0 : clamp((opts.communityUpPct - 50) / 35);
  const fg = opts.fearGreed;
  const fgSig = fg == null ? 0 : fg >= 75 ? -0.4 : fg <= 25 ? 0.4 : clamp((fg - 50) / 100);

  const note = {
    trend: ind.trend.direction === "Unknown" ? "Not enough history" : `${ind.trend.direction}; price ${(ind.trend.priceVs50Pct ?? 0) >= 0 ? "above" : "below"} 50-day average`,
    mom7: ind.returns.d7 == null ? "n/a" : `${ind.returns.d7 >= 0 ? "+" : ""}${ind.returns.d7.toFixed(1)}% over 7 days`,
    mom30: ind.returns.d30 == null ? "n/a" : `${ind.returns.d30 >= 0 ? "+" : ""}${ind.returns.d30.toFixed(1)}% over 30 days`,
    rsi: rsiV == null ? "n/a" : `RSI ${rsiV.toFixed(0)} (${ind.rsi.label})`,
    vol: ind.volume.momentumPct == null ? "n/a" : `7-day volume ${ind.volume.momentumPct >= 0 ? "+" : ""}${ind.volume.momentumPct.toFixed(0)}% vs 30-day average`,
    comm: opts.communityUpPct == null ? "No community data" : `${opts.communityUpPct.toFixed(0)}% of voters bullish`,
    fg: fg == null ? "No data" : `Fear & Greed ${fg} (${opts.fearGreedLabel})`,
  };

  const horizon = (days: 7 | 30): HorizonForecast => {
    const short = days === 7;
    const signals: Signal[] = [
      { name: "Price trend", score: trendSig, weight: short ? 0.15 : 0.32, note: note.trend },
      { name: "Momentum", score: short ? mom7 * 0.6 + mom30 * 0.4 : mom30 * 0.6 + mom7 * 0.4, weight: short ? 0.25 : 0.2, note: short ? note.mom7 : note.mom30 },
      { name: "RSI", score: rsiSig, weight: short ? 0.22 : 0.1, note: note.rsi },
      { name: "Volume momentum", score: volSig, weight: short ? 0.12 : 0.1, note: note.vol },
      { name: "Community sentiment", score: comm, weight: 0.1, note: note.comm },
      { name: "Market mood", score: fgSig, weight: short ? 0.08 : 0.12, note: note.fg },
    ];
    const wsum = signals.reduce((a, s) => a + s.weight, 0);
    let score = signals.reduce((a, s) => a + s.score * s.weight, 0) / wsum;
    if (pegged) score = 0;
    const verdict: Verdict = score > 0.17 ? "Bullish" : score < -0.17 ? "Bearish" : "Neutral";
    // agreement: share of weight that sides with the verdict (neutral: share that is weak)
    const agree = signals.reduce((a, s) => {
      const side = verdict === "Bullish" ? s.score > 0.05 : verdict === "Bearish" ? s.score < -0.05 : Math.abs(s.score) < 0.3;
      return a + (side ? s.weight : 0);
    }, 0) / wsum;
    const strength = Math.min(1, Math.abs(score) / 0.6);
    const confidence = pegged ? 90 : Math.round(Math.max(30, Math.min(88, 32 + agree * 36 + strength * 20)));

    const sigma = Math.max(daily, 0.0005) * Math.sqrt(days);
    const drift = score * sigma * 0.35;
    return {
      days,
      verdict,
      score,
      confidence,
      low: price * Math.exp(drift - sigma),
      mid: price * Math.exp(drift),
      high: price * Math.exp(drift + sigma),
      signals,
    };
  };

  return {
    h7: horizon(7),
    h30: horizon(30),
    supports,
    resistances,
    sentiment: { communityUpPct: opts.communityUpPct, fearGreed: opts.fearGreed, fearGreedLabel: opts.fearGreedLabel },
    pegged,
  };
}
