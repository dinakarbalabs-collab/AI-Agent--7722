import { createGateway, generateText } from "ai";
import { cached } from "./cache";
import type { Analysis } from "./analysis";

const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export type Narrative = { summary: string; bullets: string[]; source: "ai" | "template"; placeholders: Record<string, number> };

function placeholders(a: Analysis): Record<string, number> {
  const f = a.forecast;
  const p: Record<string, number> = { P: a.coin.price, L7: f.h7.low, H7: f.h7.high, L30: f.h30.low, H30: f.h30.high };
  f.supports.forEach((s, i) => (p[`S${i + 1}`] = s.price));
  f.resistances.forEach((r, i) => (p[`R${i + 1}`] = r.price));
  return p;
}

function template(a: Analysis, ph: Record<string, number>): { summary: string; bullets: string[] } {
  const { forecast: f, indicators: ind, coin } = a;
  const dirWord = (v: string) => (v === "Bullish" ? "upward" : v === "Bearish" ? "downward" : "sideways");
  const parts: string[] = [];
  if (f.pegged) {
    parts.push(`${coin.name} is a price-stable asset trading very close to its peg, so the model expects little movement over both horizons.`);
  } else {
    parts.push(`The model leans ${f.h7.verdict.toLowerCase()} for the next 7 days (${f.h7.confidence}% confidence) and ${f.h30.verdict.toLowerCase()} for the next 30 days (${f.h30.confidence}% confidence), meaning a ${dirWord(f.h7.verdict)} bias in the short term and a ${dirWord(f.h30.verdict)} bias over the month.`);
    parts.push(`${ind.trend.text}`);
    parts.push(`${ind.rsi.text}`);
  }
  if (ph.S1 != null && ph.R1 != null) parts.push(`The nearest support sits around {{S1}} and the nearest resistance around {{R1}}; a decisive break of either would change the picture.`);
  parts.push(`Over 30 days the volatility-based range runs from roughly {{L30}} to {{H30}}.`);
  const bullets = [
    `Trend: ${ind.trend.direction === "Unknown" ? "limited history" : ind.trend.direction.toLowerCase()}`,
    `Momentum: ${ind.returns.d7 != null ? `${ind.returns.d7 >= 0 ? "+" : ""}${ind.returns.d7.toFixed(1)}% in 7 days` : "n/a"}`,
    `RSI: ${ind.rsi.label.toLowerCase()}${ind.rsi.value != null ? ` (${ind.rsi.value.toFixed(0)})` : ""}`,
    `Volume: ${ind.volume.label.toLowerCase()} versus the 30-day average`,
  ];
  return { summary: parts.join(" "), bullets };
}

export async function getNarrative(a: Analysis): Promise<Narrative> {
  const ph = placeholders(a);
  const key = `narr:${a.coin.id}:${a.forecast.h7.verdict}:${a.forecast.h30.verdict}:${Math.round(a.forecast.h7.score * 10)}:${Math.round(a.forecast.h30.score * 10)}:${Math.round(a.forecast.sentiment.communityUpPct ?? -1)}:v2`;
  const r = await cached<Narrative>(key, 30 * 60_000, async () => {
    const f = a.forecast;
    const facts = {
      coin: `${a.coin.name} (${a.coin.symbol})`,
      change24hPct: a.coin.change24h?.toFixed(1),
      change7dPct: a.coin.change7d?.toFixed(1),
      return30dPct: a.indicators.returns.d30?.toFixed(1),
      rsi: a.indicators.rsi.value?.toFixed(0),
      rsiLabel: a.indicators.rsi.label,
      trend: a.indicators.trend.direction,
      crossover: a.indicators.trend.cross,
      sma50VsSma200Pct: a.indicators.trend.spreadPct?.toFixed(1),
      volatilityScore: a.indicators.volatility.score,
      volatilityLabel: a.indicators.volatility.label,
      volumeMomentumPct: a.indicators.volume.momentumPct?.toFixed(0),
      communityBullishPct: f.sentiment.communityUpPct?.toFixed(0),
      fearGreed: f.sentiment.fearGreed != null ? `${f.sentiment.fearGreed} (${f.sentiment.fearGreedLabel})` : null,
      pegged: f.pegged,
      forecast7d: { verdict: f.h7.verdict, confidence: f.h7.confidence, drivers: f.h7.signals.map((s) => `${s.name}: ${s.score.toFixed(2)} (${s.note})`) },
      forecast30d: { verdict: f.h30.verdict, confidence: f.h30.confidence, drivers: f.h30.signals.map((s) => `${s.name}: ${s.score.toFixed(2)} (${s.note})`) },
      priceTokensAvailable: Object.keys(ph).map((k) => `{{${k}}}`),
    };
    const { text } = await generateText({
      model: gateway("anthropic/claude-haiku-4.5"),
      temperature: 0.4,
      system:
        "You are a crypto market analyst writing for everyday readers. Explain in plain English WHY a quantitative model produced its 7-day and 30-day outlook, using only the facts provided. " +
        "Never invent numbers, news, or events. NEVER write a price, dollar amount or currency symbol directly: refer to price levels only with the provided tokens like {{S1}} (support), {{R1}} (resistance), {{L30}}/{{H30}} (30-day range), {{P}} (current price). Only use tokens listed in priceTokensAvailable. " +
        "The summary MUST state the exact verdicts given (forecast7d.verdict and forecast30d.verdict, using the words Bullish/Neutral/Bearish) and must never contradict them. Percentages and indicator values from the facts are fine. Do not give financial advice, do not say 'buy' or 'sell'. Mention uncertainty briefly. " +
        'Respond with ONLY valid JSON: {"summary": string (110-150 words, 2 short paragraphs separated by \\n\\n), "bullets": string[] (exactly 4 short "why" bullets, max 14 words each)}.',
      prompt: JSON.stringify(facts),
      abortSignal: AbortSignal.timeout(25000),
    });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("no json");
    const j = JSON.parse(m[0]) as { summary?: string; bullets?: string[] };
    if (!j.summary || !Array.isArray(j.bullets)) throw new Error("bad json");
    // drop any hard-coded currency the model slipped in
    if (/[$₹]\s?\d/.test(j.summary)) throw new Error("currency leak");
    const low = j.summary.toLowerCase();
    if (!low.includes(f.h7.verdict.toLowerCase()) || !low.includes(f.h30.verdict.toLowerCase())) throw new Error("verdict mismatch");
    const wrong = (["bullish", "neutral", "bearish"] as const).filter((w) => w !== f.h7.verdict.toLowerCase() && w !== f.h30.verdict.toLowerCase());
    if (wrong.some((w) => new RegExp(`(rates|rated|leans|lean|outlook is|verdict)[^.]{0,40}\\b${w}\\b`).test(low))) throw new Error("verdict contradiction");
    const unknown = (j.summary.match(/\{\{(\w+)\}\}/g) ?? []).some((t) => !(t.slice(2, -2) in ph));
    if (unknown) throw new Error("unknown token");
    return { summary: j.summary, bullets: j.bullets.slice(0, 4), source: "ai", placeholders: ph };
  }, { persist: false }).then((x) => x.data).catch((e) => {
    console.error("narrative fallback:", e?.message);
    const t = template(a, ph);
    return { ...t, source: "template" as const, placeholders: ph };
  });
  return { ...r, placeholders: ph };
}
