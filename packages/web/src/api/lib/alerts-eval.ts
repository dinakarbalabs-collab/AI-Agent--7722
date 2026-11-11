import { and, eq } from "drizzle-orm";
import { db } from "../database";
import { alert } from "../database/schema";
import type { MarketCoin } from "./coingecko";

let lastRun = 0;

/** Compare every active alert (all users) against fresh prices and mark the ones that crossed. */
export async function evaluateAlerts(coins: MarketCoin[], force = false) {
  if (!force && Date.now() - lastRun < 20_000) return;
  lastRun = Date.now();
  const price = new Map(coins.map((c) => [c.id, c.current_price]));
  const active = await db.select().from(alert).where(eq(alert.status, "active"));
  const hit: { id: number; p: number }[] = [];
  for (const a of active) {
    const p = price.get(a.coinId);
    if (p == null) continue;
    if ((a.direction === "above" && p >= a.targetUsd) || (a.direction === "below" && p <= a.targetUsd)) hit.push({ id: a.id, p });
  }
  for (const h of hit) {
    await db.update(alert)
      .set({ status: "triggered", triggeredAt: new Date(), triggeredPriceUsd: h.p, seen: false })
      .where(and(eq(alert.id, h.id), eq(alert.status, "active")));
  }
  return hit.length;
}
