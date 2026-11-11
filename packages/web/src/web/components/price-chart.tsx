import { useMemo, useState } from "react";
import { Area, Bar, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { formatAmount, useCurrency } from "../lib/currency";
import type { Analysis } from "../queries/types";

export type Range = "7d" | "30d" | "1y";
const DAY = 86400_000;

type Props = {
  range: Range;
  prices: [number, number][];
  volumes: [number, number][];
  analysis?: Analysis;
  loading?: boolean;
};

export function PriceChart({ range, prices, volumes, analysis, loading }: Props) {
  const { currency, convert } = useCurrency();
  const [showForecast, setShowForecast] = useState(true);
  const [showSma, setShowSma] = useState(false);
  const [showVol, setShowVol] = useState(true);

  const horizon = range === "7d" ? 7 : 30;
  const hz = analysis ? (horizon === 7 ? analysis.forecast.h7 : analysis.forecast.h30) : null;

  const { rows, domain, xDomain, levels, lastT, maxVol } = useMemo(() => {
    const smaMap = new Map<number, { s50: number | null; s200: number | null }>();
    if (analysis && range === "1y") analysis.sma.t.forEach((t, i) => smaMap.set(t, { s50: analysis.sma.sma50[i], s200: analysis.sma.sma200[i] }));

    let vi = 0;
    const base: any[] = prices.map(([t, p]) => {
      while (vi < volumes.length - 1 && Math.abs(volumes[vi + 1][0] - t) < Math.abs(volumes[vi][0] - t)) vi++;
      const sm = smaMap.get(t);
      return {
        t, price: convert(p),
        vol: volumes[vi]?.[1] != null ? convert(volumes[vi][1]) : undefined,
        s50: sm?.s50 != null ? convert(sm.s50) : undefined,
        s200: sm?.s200 != null ? convert(sm.s200) : undefined,
      };
    });
    const lastT = base.length ? base[base.length - 1].t : Date.now();
    const last = base[base.length - 1];
    const all: number[] = base.map((r) => r.price);
    if (showSma) base.forEach((r) => { if (r.s50) all.push(r.s50); if (r.s200) all.push(r.s200); });

    let endT = lastT;
    if (hz && showForecast && last) {
      const p0 = last.price, drift = Math.log(convert(hz.mid) / p0), sigma = Math.log(hz.high / hz.mid);
      endT = lastT + hz.days * DAY;
      const steps = 8;
      base[base.length - 1] = { ...last, proj: p0, band: [p0, p0] };
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        const mid = p0 * Math.exp(drift * f);
        const lo = p0 * Math.exp(drift * f - sigma * Math.sqrt(f));
        const hi = p0 * Math.exp(drift * f + sigma * Math.sqrt(f));
        base.push({ t: lastT + f * hz.days * DAY, proj: mid, band: [lo, hi] });
        all.push(lo, hi);
      }
    }

    const lv: { price: number; kind: "support" | "resistance"; touches: number }[] = [];
    if (analysis && showForecast) {
      for (const s of analysis.forecast.supports) lv.push({ price: convert(s.price), kind: "support", touches: s.touches });
      for (const r of analysis.forecast.resistances) lv.push({ price: convert(r.price), kind: "resistance", touches: r.touches });
    }
    let lo = Math.min(...all), hi = Math.max(...all);
    const span = hi - lo || hi * 0.02;
    // include S/R only if they are near the plotted range, so the chart isn't flattened
    for (const l of lv) if (l.price > lo - span * 0.6 && l.price < hi + span * 0.6) { lo = Math.min(lo, l.price); hi = Math.max(hi, l.price); }
    const pad = (hi - lo) * 0.08;
    const maxVol = Math.max(0, ...base.map((r) => r.vol ?? 0));
    return { rows: base, domain: [lo - pad, hi + pad] as [number, number], xDomain: [base[0]?.t ?? 0, endT] as [number, number], levels: lv, lastT, maxVol };
  }, [prices, volumes, analysis, convert, range, showForecast, showSma, hz]);

  const up = rows.length > 1 && rows[Math.max(0, rows.findIndex((r) => r.t >= lastT))]?.price >= rows[0].price;
  const color = up ? "#22d39a" : "#ff5c7a";
  const fmtTick = (t: number) => {
    const d = new Date(t);
    if (range === "7d") return d.toLocaleDateString(undefined, { weekday: "short" });
    if (range === "30d") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  };
  const fmtY = (v: number) => formatAmount(v, currency, { compact: Math.abs(v) >= 1e5, digits: Math.abs(v) >= 1000 ? 0 : undefined });

  const toggles = [
    { k: "forecast", label: "Forecast & levels", on: showForecast, set: setShowForecast, show: !!analysis },
    { k: "sma", label: "SMA 50/200", on: showSma, set: setShowSma, show: range === "1y" },
    { k: "vol", label: "Volume", on: showVol, set: setShowVol, show: true },
  ].filter((t) => t.show);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {toggles.map((t) => (
          <button key={t.k} onClick={() => t.set(!t.on)} aria-pressed={t.on}
            className={cn("rounded-full border px-3 py-1 text-xs transition", t.on ? "border-brand/50 bg-brand/15 text-white" : "border-white/10 text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
          {showForecast && analysis && <>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-gain" />Support</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-loss" />Resistance</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-brand/30" />{horizon}d projected range</span>
          </>}
        </div>
      </div>
      <div className={cn("h-[340px] w-full transition-opacity sm:h-[420px]", loading && "opacity-50")}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pf" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bf" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#8b7cff" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6d5bff" stopOpacity={0.12} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" type="number" scale="time" domain={xDomain} tickFormatter={fmtTick} tick={{ fill: "#6b6b84", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={50} />
            <YAxis yAxisId="p" orientation="right" domain={domain} tickFormatter={fmtY} tick={{ fill: "#6b6b84", fontSize: 11, fontFamily: "Geist Mono" }} axisLine={false} tickLine={false} width={72} allowDataOverflow />
            <YAxis yAxisId="v" hide domain={[0, maxVol * 4 || 1]} />
            <Tooltip content={<ChartTip range={range} />} cursor={{ stroke: "rgba(255,255,255,.25)", strokeDasharray: "3 3" }} isAnimationActive={false} />
            {showVol && <Bar yAxisId="v" dataKey="vol" fill="#6d5bff" fillOpacity={0.28} isAnimationActive={false} maxBarSize={6} />}
            {hz && showForecast && <Area yAxisId="p" dataKey="band" stroke="none" fill="url(#bf)" isAnimationActive={false} connectNulls />}
            <Area yAxisId="p" dataKey="price" stroke={color} strokeWidth={2} fill="url(#pf)" isAnimationActive={false} connectNulls />
            {showSma && <Line yAxisId="p" dataKey="s50" stroke="#4cc9f0" strokeWidth={1.4} dot={false} isAnimationActive={false} />}
            {showSma && <Line yAxisId="p" dataKey="s200" stroke="#f5b54a" strokeWidth={1.4} dot={false} isAnimationActive={false} />}
            {hz && showForecast && <Line yAxisId="p" dataKey="proj" stroke="#a79cff" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
            {hz && showForecast && <ReferenceLine yAxisId="p" x={lastT} stroke="rgba(255,255,255,.25)" strokeDasharray="2 4" label={{ value: "now", fill: "#6b6b84", fontSize: 10, position: "insideTopLeft" }} />}
            {levels.map((l, i) => (
              <ReferenceLine key={i} yAxisId="p" y={l.price} ifOverflow="hidden" stroke={l.kind === "support" ? "#22d39a" : "#ff5c7a"} strokeDasharray="6 4" strokeOpacity={0.75}
                label={{ value: `${l.kind === "support" ? "S" : "R"} ${formatAmount(l.price, currency, { compact: l.price >= 1e5 })}`, fill: l.kind === "support" ? "#22d39a" : "#ff5c7a", fontSize: 10, position: "insideTopLeft" }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartTip({ active, payload, range }: any) {
  const { currency } = useCurrency();
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  const future = r.price == null;
  const d = new Date(r.t);
  return (
    <div className="glass rounded-xl bg-[#0b0b14]/95 px-3 py-2 text-xs shadow-xl">
      <div className="text-muted-foreground">{d.toLocaleString(undefined, range === "1y" ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" })}</div>
      {future ? (
        <>
          <div className="num mt-1 text-sm font-semibold text-brand-soft">Projected {formatAmount(r.proj, currency)}</div>
          {r.band && <div className="num text-muted-foreground">{formatAmount(r.band[0], currency)} – {formatAmount(r.band[1], currency)}</div>}
        </>
      ) : (
        <>
          <div className="num mt-1 text-sm font-semibold">{formatAmount(r.price, currency)}</div>
          {r.s50 != null && <div className="num text-info">SMA50 {formatAmount(r.s50, currency)}</div>}
          {r.s200 != null && <div className="num text-warn">SMA200 {formatAmount(r.s200, currency)}</div>}
          {r.vol != null && <div className="num text-muted-foreground">Vol {formatAmount(r.vol, currency, { compact: true })}</div>}
        </>
      )}
    </div>
  );
}
