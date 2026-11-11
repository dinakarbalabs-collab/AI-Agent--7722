import { cached } from "./cache";
import { fetchChart, fetchCoinInfo, fetchFearGreed, fetchMarkets } from "./coingecko";
import { computeIndicators } from "./indicators";
import { buildForecast } from "./forecast-engine";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

async function computeAnalysis(id: string) {
  const markets = await fetchMarkets();
  const coin = markets.data.find((c) => c.id === id);
  if (!coin) return null;

  const [chart, info, fng] = await Promise.allSettled([fetchChart(id, 365), withTimeout(fetchCoinInfo(id), 5000), fetchFearGreed()]);
  if (chart.status === "rejected") throw new Error("Price history is temporarily unavailable (rate limit). Try again in a minute.");

  const pts = chart.value.data.prices;
  const closes = pts.map((p) => p[1]);
  // use live price as latest close so indicators reflect now
  if (coin.current_price > 0) closes[closes.length - 1] = coin.current_price;
  const vols = chart.value.data.total_volumes.map((v) => v[1]);

  const ind = computeIndicators(closes, vols);
  const community = info.status === "fulfilled" ? info.value.data.sentiment_votes_up_percentage ?? null : null;
  const fg = fng.status === "fulfilled" ? fng.value.data : null;
  const forecast = buildForecast(closes, ind, {
    communityUpPct: community,
    fearGreed: fg?.value ?? null,
    fearGreedLabel: fg?.label ?? null,
  });

  const { sma50Series, sma200Series, ...indicators } = ind;
  return {
    coin: {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      image: coin.image,
      rank: coin.market_cap_rank,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      change7d: coin.price_change_percentage_7d_in_currency ?? null,
      volume24h: coin.total_volume,
      marketCap: coin.market_cap,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      ath: coin.ath,
      athChangePct: coin.ath_change_percentage,
      circulatingSupply: coin.circulating_supply,
      maxSupply: coin.max_supply,
    },
    description: info.status === "fulfilled" ? (info.value.data.description?.en ?? "").replace(/<[^>]+>/g, "").slice(0, 420) : "",
    indicators,
    forecast,
    sma: { t: pts.map((p) => p[0]), sma50: sma50Series, sma200: sma200Series },
    dataStale: chart.value.stale,
  };
}

export type Analysis = NonNullable<Awaited<ReturnType<typeof computeAnalysis>>>;

/** Cached so the forecast, the narrative and repeat visits all see the exact same numbers. */
export async function getAnalysis(id: string): Promise<Analysis | null> {
  const r = await cached(`analysis:${id}`, 3 * 60_000, () => computeAnalysis(id), { persist: false, serveStaleMs: 10 * 60_000 });
  return r.data;
}
