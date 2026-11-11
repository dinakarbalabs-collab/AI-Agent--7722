import { cached, type Cached } from "./cache";

const KEY = process.env.COINGECKO_API_KEY;
const BASE = "https://api.coingecko.com/api/v3";

// --- request queue: space out calls to stay inside the free-tier limit ---
let lastAt = 0;
const MIN_GAP = KEY ? 600 : 1800;

async function rawGet<T>(path: string, retries = 2, attempt = 0): Promise<T> {
  const wait = Math.max(0, lastAt + MIN_GAP - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastAt = Date.now();
  const res = await fetch(BASE + path, {
    headers: { accept: "application/json", ...(KEY ? { "x-cg-demo-api-key": KEY } : {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 429) console.warn("coingecko 429", path);
  if (res.status === 429 && attempt < retries) {
    const ra = Number(res.headers.get("retry-after")) || 8;
    await new Promise((r) => setTimeout(r, Math.min(ra, 20) * 1000));
    lastAt = Date.now();
    return rawGet<T>(path, retries, attempt + 1);
  }
  if (!res.ok) throw new Error(`CoinGecko ${res.status} for ${path}`);
  return (await res.json()) as T;
}

type Job = { run: () => Promise<unknown>; resolve: (v: any) => void; reject: (e: any) => void; prio: number };
const jobs: Job[] = [];
let working = false;

async function pump() {
  if (working) return;
  working = true;
  while (jobs.length) {
    jobs.sort((a, b) => b.prio - a.prio);
    const j = jobs.shift()!;
    try { j.resolve(await j.run()); } catch (e) { j.reject(e); }
  }
  working = false;
}

/** prio 2 = critical user-facing, 1 = optional (no retries), 0 = background (category warm-up) */
function get<T>(path: string, prio = 2, retries = 2): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    jobs.push({ run: () => rawGet<T>(path, retries), resolve, reject, prio });
    void pump();
  });
}

export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  circulating_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  sparkline_in_7d?: { price: number[] };
};

export const fetchMarkets = (): Promise<Cached<MarketCoin[]>> =>
  cached("markets", 45_000, () =>
    get<MarketCoin[]>(
      "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=7d,30d",
    ),
    { serveStaleMs: 6 * 60_000 },
  );

export type ChartData = { prices: [number, number][]; total_volumes: [number, number][] };

export const fetchChart = (id: string, days: 30 | 365): Promise<Cached<ChartData>> =>
  cached(`chart:${id}:${days}`, days === 365 ? 20 * 60_000 : 5 * 60_000, async () => {
    const d = await get<ChartData>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}${days === 365 ? "&interval=daily" : ""}`,
    );
    if (!d.prices?.length) throw new Error("empty chart");
    return d;
  });

export type CoinInfo = {
  id: string;
  symbol: string;
  name: string;
  description?: { en?: string };
  sentiment_votes_up_percentage?: number | null;
  sentiment_votes_down_percentage?: number | null;
  watchlist_portfolio_users?: number | null;
  categories?: string[];
  links?: { homepage?: string[] };
  image?: { large?: string };
  genesis_date?: string | null;
};

const infoFailed = new Map<string, number>();
export const fetchCoinInfo = (id: string): Promise<Cached<CoinInfo>> => {
  const failedAt = infoFailed.get(id);
  if (failedAt && Date.now() - failedAt < 3 * 60_000) return Promise.reject(new Error("info cooling down"));
  return cached(`info:${id}`, 30 * 60_000, () =>
    get<CoinInfo>(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
      1,
      0,
    ).catch((e) => { infoFailed.set(id, Date.now()); throw e; }),
  );
};

// --- FX (USD -> INR) ---
export type Fx = { usdInr: number; source: string };
export const fetchFx = (): Promise<Cached<Fx>> =>
  cached("fx", 10 * 60_000, async () => {
    try {
      const r = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(8000) });
      const j = (await r.json()) as { rates?: { INR?: number } };
      if (j.rates?.INR && j.rates.INR > 50 && j.rates.INR < 200) return { usdInr: j.rates.INR, source: "open.er-api.com" };
    } catch {}
    const j = await get<Record<string, { usd: number; inr: number }>>(
      "/simple/price?ids=tether,usd-coin&vs_currencies=usd,inr",
    );
    const rates = Object.values(j).map((v) => v.inr / v.usd).filter((x) => x > 50 && x < 200);
    if (!rates.length) throw new Error("no fx");
    return { usdInr: rates.reduce((a, b) => a + b, 0) / rates.length, source: "coingecko" };
  });

// --- Fear & Greed ---
export type FearGreed = { value: number; label: string };
export const fetchFearGreed = (): Promise<Cached<FearGreed>> =>
  cached("fng", 30 * 60_000, async () => {
    const r = await fetch("https://api.alternative.me/fng/?limit=1", { signal: AbortSignal.timeout(8000) });
    const j = (await r.json()) as { data: { value: string; value_classification: string }[] };
    return { value: Number(j.data[0].value), label: j.data[0].value_classification };
  });

// --- Categories ---
export const CATEGORY_DEFS = [
  { key: "layer-1", label: "Layer 1", cg: "layer-1" },
  { key: "layer-2", label: "Layer 2", cg: "layer-2" },
  { key: "defi", label: "DeFi", cg: "decentralized-finance-defi" },
  { key: "ai", label: "AI Coins", cg: "artificial-intelligence" },
  { key: "meme", label: "Meme Coins", cg: "meme-token" },
  { key: "stable", label: "Stablecoins", cg: "stablecoins" },
  { key: "exchange", label: "Exchange Tokens", cg: "exchange-based-tokens" },
] as const;
export type CategoryKey = (typeof CATEGORY_DEFS)[number]["key"];

// Built-in fallback so filters work even when the live category lookup is throttled.
export const STATIC_CATEGORIES: Record<CategoryKey, string[]> = {
  "layer-1": ["bitcoin","ethereum","binancecoin","solana","cardano","tron","avalanche-2","polkadot","near","sui","aptos","cosmos","the-open-network","litecoin","bitcoin-cash","stellar","ripple","hedera-hashgraph","internet-computer","ethereum-classic","monero","algorand","kaspa","hyperliquid","dogecoin","sei-network","toncoin"],
  "layer-2": ["matic-network","polygon-ecosystem-token","arbitrum","optimism","mantle","starknet","immutable-x","stacks"],
  defi: ["chainlink","uniswap","aave","hyperliquid","ethena","maker","lido-dao","curve-dao-token","pendle","jupiter-exchange-solana","ondo-finance","injective-protocol","the-graph"],
  ai: ["bittensor","near","internet-computer","render-token","fetch-ai","artificial-superintelligence-alliance","virtual-protocol","the-graph","worldcoin-wld","akash-network"],
  meme: ["dogecoin","shiba-inu","pepe","bonk","dogwifcoin","floki","official-trump","fartcoin","pump-fun","pengu"],
  stable: ["tether","usd-coin","usds","dai","ethena-usde","first-digital-usd","usdd","paypal-usd","usd1-wlfi","binance-bridged-usdt-bnb-smart-chain"],
  exchange: ["binancecoin","crypto-com-chain","okb","leo-token","bitget-token","kucoin-shares","gatechain-token","hyperliquid","mx-token","bitfinex-leo"],
};

export const fetchCategoryIds = (key: CategoryKey): Promise<Cached<string[]>> => {
  const def = CATEGORY_DEFS.find((c) => c.key === key)!;
  return cached(`cat:${key}`, 60 * 60_000, async () => {
    const list = await get<{ id: string }[]>(
      `/coins/markets?vs_currency=usd&category=${def.cg}&order=market_cap_desc&per_page=60&page=1`,
      0,
      0,
    );
    return list.map((c) => c.id);
  });
};
