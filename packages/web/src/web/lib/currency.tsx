import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFx } from "../queries/market";

export type Currency = "USD" | "INR";
const KEY = "oracle.currency";
const RATE_KEY = "oracle.usdInr";

type Ctx = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number; // USD -> INR
  rateUpdatedAt: number | null;
  rateSource: string | null;
  /** convert a USD amount into the active currency */
  convert: (usd: number) => number;
  /** convert an amount typed in the active currency into USD */
  toUsd: (amount: number) => number;
};

const CurrencyContext = createContext<Ctx | null>(null);

function initial(): Currency {
  try {
    const s = localStorage.getItem(KEY);
    if (s === "USD" || s === "INR") return s;
  } catch {}
  return typeof navigator !== "undefined" && /-IN$/i.test(navigator.language) ? "INR" : "USD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCur] = useState<Currency>(initial);
  const fx = useFx();
  const [cachedRate] = useState<number>(() => {
    try { return Number(localStorage.getItem(RATE_KEY)) || 93.5; } catch { return 93.5; }
  });
  const rate = fx.data?.usdInr ?? cachedRate;

  useEffect(() => {
    if (fx.data?.usdInr) try { localStorage.setItem(RATE_KEY, String(fx.data.usdInr)); } catch {}
  }, [fx.data?.usdInr]);

  const setCurrency = useCallback((c: Currency) => {
    setCur(c);
    try { localStorage.setItem(KEY, c); } catch {}
  }, []);

  const value = useMemo<Ctx>(() => ({
    currency, setCurrency, rate,
    rateUpdatedAt: fx.data?.updatedAt ?? null,
    rateSource: fx.data?.source ?? null,
    convert: (usd) => (currency === "INR" ? usd * rate : usd),
    toUsd: (a) => (currency === "INR" ? a / rate : a),
  }), [currency, setCurrency, rate, fx.data?.updatedAt, fx.data?.source]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const c = useContext(CurrencyContext);
  if (!c) throw new Error("useCurrency outside provider");
  return c;
}

// ---------- formatting ----------
const fmtCache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, o: Intl.NumberFormatOptions) {
  const k = locale + JSON.stringify(o);
  let f = fmtCache.get(k);
  if (!f) { f = new Intl.NumberFormat(locale, o); fmtCache.set(k, f); }
  return f;
}

function priceDigits(v: number): number {
  const a = Math.abs(v);
  if (a >= 1000) return 0;
  if (a >= 1) return 2;
  if (a >= 0.01) return 4;
  if (a >= 0.0001) return 6;
  return 8;
}

/** Format an amount that is ALREADY in the target currency. */
export function formatAmount(v: number, currency: Currency, o: { compact?: boolean; digits?: number } = {}): string {
  if (!Number.isFinite(v)) return "—";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const sym = currency === "INR" ? "₹" : "$";
  if (o.compact) {
    const a = Math.abs(v);
    if (currency === "INR") {
      // Indian convention: Lakh (1e5), Crore (1e7), Lakh Crore (1e12)
      const sign = v < 0 ? "-" : "";
      const f = (n: number, d = 2) => nf(locale, { maximumFractionDigits: d }).format(n);
      if (a >= 1e12) return `${sign}${sym}${f(a / 1e12)} L Cr`;
      if (a >= 1e7) return `${sign}${sym}${f(a / 1e7, a / 1e7 >= 100 ? 0 : 2)} Cr`;
      if (a >= 1e5) return `${sign}${sym}${f(a / 1e5)} L`;
      return `${sign}${sym}${f(a, a >= 1000 ? 0 : 2)}`;
    }
    return (v < 0 ? "-" : "") + sym + nf(locale, { notation: "compact", maximumFractionDigits: 2 }).format(a);
  }
  const d = o.digits ?? priceDigits(v);
  return sym + nf(locale, { minimumFractionDigits: d >= 2 && Math.abs(v) < 1000 ? Math.min(d, 2) : d, maximumFractionDigits: d }).format(v);
}

export function useMoney() {
  const { currency, convert } = useCurrency();
  return useCallback((usd: number | null | undefined, o?: { compact?: boolean; digits?: number }) =>
    usd == null ? "—" : formatAmount(convert(usd), currency, o), [currency, convert]);
}

export function formatPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}
