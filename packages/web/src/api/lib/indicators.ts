export type Pt = [number, number]; // [timestampMs, value]

export function sma(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = Array.from({ length: values.length }, () => null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/** Wilder's RSI */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgG = gain / period, avgL = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
    avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgL === 0) return 100;
  return 100 - 100 / (1 + avgG / avgL);
}

export function logReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) if (closes[i - 1] > 0 && closes[i] > 0) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type Level = { price: number; touches: number; kind: "support" | "resistance" };

/** Cluster swing highs/lows into support/resistance levels. */
export function supportResistance(closes: number[], current: number): { supports: Level[]; resistances: Level[] } {
  const look = closes.slice(-180);
  const w = 4;
  const pivots: { p: number; i: number }[] = [];
  for (let i = w; i < look.length - w; i++) {
    const win = look.slice(i - w, i + w + 1);
    if (look[i] === Math.max(...win) || look[i] === Math.min(...win)) pivots.push({ p: look[i], i });
  }
  // include recent extremes as anchor points
  const last90 = closes.slice(-90);
  if (last90.length) {
    pivots.push({ p: Math.max(...last90), i: look.length - 1 }, { p: Math.min(...last90), i: look.length - 1 });
  }
  const tol = 0.03;
  const clusters: { sum: number; n: number; recent: number }[] = [];
  for (const pv of pivots.sort((a, b) => a.p - b.p)) {
    const c = clusters.find((c) => Math.abs(pv.p - c.sum / c.n) / (c.sum / c.n) < tol);
    if (c) { c.sum += pv.p; c.n++; c.recent = Math.max(c.recent, pv.i); }
    else clusters.push({ sum: pv.p, n: 1, recent: pv.i });
  }
  const levels = clusters.map((c) => ({ price: c.sum / c.n, touches: c.n, recent: c.recent }));
  const minGap = 0.012;
  const sups = levels
    .filter((l) => l.price < current * (1 - minGap))
    .sort((a, b) => b.price - a.price) // nearest first
    .slice(0, 2)
    .map((l) => ({ price: l.price, touches: l.touches, kind: "support" as const }));
  const ress = levels
    .filter((l) => l.price > current * (1 + minGap))
    .sort((a, b) => a.price - b.price)
    .slice(0, 2)
    .map((l) => ({ price: l.price, touches: l.touches, kind: "resistance" as const }));
  return { supports: sups, resistances: ress };
}

export type Indicators = {
  price: number;
  rsi: { value: number | null; label: "Overbought" | "Neutral" | "Oversold" | "Unknown"; text: string };
  trend: {
    sma50: number | null;
    sma200: number | null;
    direction: "Uptrend" | "Downtrend" | "Sideways" | "Unknown";
    cross: "golden" | "death" | null;
    spreadPct: number | null;
    priceVs50Pct: number | null;
    text: string;
  };
  volatility: { score: number; label: "Low" | "Moderate" | "High" | "Extreme"; dailyPct: number; annualPct: number; text: string };
  volume: { momentumPct: number | null; label: "Rising" | "Falling" | "Steady" | "Unknown"; text: string };
  returns: { d7: number | null; d30: number | null; d90: number | null };
  sma50Series: (number | null)[];
  sma200Series: (number | null)[];
};

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
const f1 = (x: number) => x.toFixed(1);

export function computeIndicators(closes: number[], volumes: number[]): Indicators {
  const price = closes[closes.length - 1];
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const last50 = s50[s50.length - 1];
  const last200 = s200[s200.length - 1];

  // RSI
  const r = rsi(closes, 14);
  let rsiLabel: Indicators["rsi"]["label"] = "Unknown";
  let rsiText = "Not enough price history to calculate RSI.";
  if (r != null) {
    if (r >= 70) { rsiLabel = "Overbought"; rsiText = `RSI is ${f1(r)}, above 70. Buyers have pushed the price up fast, so a pause or pullback becomes more likely.`; }
    else if (r <= 30) { rsiLabel = "Oversold"; rsiText = `RSI is ${f1(r)}, below 30. Sellers have dominated recently, and sharp drops like this are often followed by a bounce.`; }
    else { rsiLabel = "Neutral"; rsiText = `RSI is ${f1(r)}, between 30 and 70. Buying and selling pressure are fairly balanced, with no extreme either way.`; }
  }

  // Trend
  let direction: Indicators["trend"]["direction"] = "Unknown";
  let cross: "golden" | "death" | null = null;
  let spreadPct: number | null = null;
  let priceVs50Pct: number | null = null;
  let trendText = "Not enough history for the 200-day average yet.";
  if (last50 != null) priceVs50Pct = pct(price, last50);
  if (last50 != null && last200 != null) {
    spreadPct = pct(last50, last200);
    // recent crossover within the last 30 bars
    for (let i = Math.max(1, s50.length - 30); i < s50.length; i++) {
      const a = s50[i], b = s200[i], pa = s50[i - 1], pb = s200[i - 1];
      if (a != null && b != null && pa != null && pb != null) {
        if (pa <= pb && a > b) cross = "golden";
        if (pa >= pb && a < b) cross = "death";
      }
    }
    if (Math.abs(spreadPct) < 2 && Math.abs(priceVs50Pct ?? 0) < 4) direction = "Sideways";
    else direction = spreadPct > 0 ? "Uptrend" : "Downtrend";
    const rel = spreadPct > 0 ? "above" : "below";
    trendText = `The 50-day average (${f1(Math.abs(spreadPct))}% ${rel} the 200-day) points to a${direction === "Uptrend" ? "n uptrend" : direction === "Downtrend" ? " downtrend" : " sideways market"}. Price is ${f1(Math.abs(priceVs50Pct ?? 0))}% ${((priceVs50Pct ?? 0) >= 0) ? "above" : "below"} its 50-day average.`;
    if (cross === "golden") trendText += " A golden cross (50-day crossing above 200-day) happened in the last month, which is a classic bullish signal.";
    if (cross === "death") trendText += " A death cross (50-day crossing below 200-day) happened in the last month, which is a classic bearish signal.";
  } else if (last50 != null) {
    direction = Math.abs(priceVs50Pct ?? 0) < 4 ? "Sideways" : (priceVs50Pct ?? 0) > 0 ? "Uptrend" : "Downtrend";
    trendText = `Only the 50-day average is available (young coin). Price is ${f1(Math.abs(priceVs50Pct ?? 0))}% ${((priceVs50Pct ?? 0) >= 0) ? "above" : "below"} it.`;
  }

  // Volatility (last 30 daily returns)
  const rets = logReturns(closes.slice(-31));
  const daily = stdev(rets);
  const annual = daily * Math.sqrt(365);
  const vscore = Math.round(Math.min(100, (annual / 1.5) * 100));
  const vlabel: Indicators["volatility"]["label"] = vscore < 20 ? "Low" : vscore < 45 ? "Moderate" : vscore < 70 ? "High" : "Extreme";
  const vtext = {
    Low: "Price moves have been small and steady lately. Swings are rare, which usually means calmer trading.",
    Moderate: "Price swings are typical for a major crypto asset. Expect normal ups and downs.",
    High: "Price has been swinging a lot. Big moves in either direction in a single day are common.",
    Extreme: "Price is extremely volatile right now. Large, fast moves in either direction should be expected.",
  }[vlabel] + ` Typical daily move is about ±${(daily * 100).toFixed(1)}%.`;

  // Volume momentum
  let momentumPct: number | null = null;
  let vol: Indicators["volume"]["label"] = "Unknown";
  let volText = "Not enough volume history.";
  if (volumes.length >= 30) {
    const v7 = avg(volumes.slice(-7));
    const v30 = avg(volumes.slice(-30));
    if (v30 > 0) {
      momentumPct = pct(v7, v30);
      vol = momentumPct > 15 ? "Rising" : momentumPct < -15 ? "Falling" : "Steady";
      volText = `Trading volume over the last 7 days is ${f1(Math.abs(momentumPct))}% ${momentumPct >= 0 ? "higher" : "lower"} than the 30-day average, so interest is ${vol === "Rising" ? "picking up" : vol === "Falling" ? "fading" : "holding steady"}.`;
    }
  }

  const ret = (n: number) => (closes.length > n ? pct(price, closes[closes.length - 1 - n]) : null);
  return {
    price,
    rsi: { value: r, label: rsiLabel, text: rsiText },
    trend: { sma50: last50, sma200: last200, direction, cross, spreadPct, priceVs50Pct, text: trendText },
    volatility: { score: vscore, label: vlabel, dailyPct: daily * 100, annualPct: annual * 100, text: vtext },
    volume: { momentumPct, label: vol, text: volText },
    returns: { d7: ret(7), d30: ret(30), d90: ret(90) },
    sma50Series: s50,
    sma200Series: s200,
  };
}
