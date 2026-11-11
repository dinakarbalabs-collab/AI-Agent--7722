import { base } from "../__core/app";
import { CATEGORY_DEFS, fetchFearGreed, fetchFx, fetchMarkets } from "../lib/coingecko";
import { categoriesFor, warmCategories } from "../lib/categories";
import { evaluateAlerts } from "../lib/alerts-eval";

export const markets = {
  list: base.handler(async () => {
    const r = await fetchMarkets();
    warmCategories();
    evaluateAlerts(r.data).catch(() => {});
    return {
      updatedAt: r.fetchedAt,
      stale: r.stale,
      categories: CATEGORY_DEFS.map((c) => ({ key: c.key, label: c.label })),
      coins: r.data.map((c) => ({
        id: c.id,
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        image: c.image,
        rank: c.market_cap_rank,
        price: c.current_price,
        change24h: c.price_change_percentage_24h,
        change7d: c.price_change_percentage_7d_in_currency ?? null,
        volume24h: c.total_volume,
        marketCap: c.market_cap,
        high24h: c.high_24h,
        low24h: c.low_24h,
        ath: c.ath,
        athChangePct: c.ath_change_percentage,
        circulatingSupply: c.circulating_supply,
        maxSupply: c.max_supply,
        sparkline: (c.sparkline_in_7d?.price ?? []).filter((_, i) => i % 4 === 0),
        categories: categoriesFor(c.id),
      })),
    };
  }),

  overview: base.handler(async () => {
    const [m, fg] = await Promise.allSettled([fetchMarkets(), fetchFearGreed()]);
    const coins = m.status === "fulfilled" ? m.value.data : [];
    const totalCap = coins.reduce((a, c) => a + c.market_cap, 0);
    const totalVol = coins.reduce((a, c) => a + c.total_volume, 0);
    const btc = coins.find((c) => c.id === "bitcoin");
    const capChange = coins.length
      ? coins.reduce((a, c) => a + c.market_cap * ((c.price_change_percentage_24h ?? 0) / 100) / (1 + (c.price_change_percentage_24h ?? 0) / 100), 0) / (totalCap || 1) * 100
      : null;
    return {
      totalCap,
      totalVol,
      capChange24h: capChange,
      btcDominance: btc && totalCap ? (btc.market_cap / totalCap) * 100 : null,
      fearGreed: fg.status === "fulfilled" ? fg.value.data : null,
    };
  }),

  fx: base.handler(async () => {
    try {
      const r = await fetchFx();
      return { usdInr: r.data.usdInr, source: r.data.source, updatedAt: r.fetchedAt, stale: r.stale };
    } catch {
      return { usdInr: 93.5, source: "fallback", updatedAt: 0, stale: true };
    }
  }),
};
