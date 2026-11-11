import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { db } from "../database";
import { alert } from "../database/schema";
import { authed } from "../middleware/auth";
import { fetchFx, fetchMarkets } from "../lib/coingecko";
import { evaluateAlerts } from "../lib/alerts-eval";

const coinId = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);

export const alerts = {
  list: authed.handler(async ({ context }) => {
    try {
      const m = await fetchMarkets();
      await evaluateAlerts(m.data);
    } catch {}
    const rows = await db.select().from(alert).where(eq(alert.userId, context.user.id)).orderBy(desc(alert.createdAt));
    return rows;
  }),

  create: authed
    .input(z.object({
      coinId,
      direction: z.enum(["above", "below"]),
      amount: z.number().positive().finite(),
      currency: z.enum(["USD", "INR"]),
    }))
    .handler(async ({ context, input }) => {
      let usd = input.amount;
      if (input.currency === "INR") {
        const fx = await fetchFx().catch(() => null);
        if (!fx) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Exchange rate unavailable. Try USD or retry shortly." });
        usd = input.amount / fx.data.usdInr;
      }
      const m = await fetchMarkets().catch(() => null);
      const coin = m?.data.find((c) => c.id === input.coinId);
      if (m && !coin) throw new ORPCError("NOT_FOUND", { message: "Coin not found in the top 50." });
      // refuse alerts that would fire instantly
      if (coin) {
        if (input.direction === "above" && coin.current_price >= usd) throw new ORPCError("BAD_REQUEST", { message: "Price is already above that target. Pick a higher value." });
        if (input.direction === "below" && coin.current_price <= usd) throw new ORPCError("BAD_REQUEST", { message: "Price is already below that target. Pick a lower value." });
      }
      const [row] = await db.insert(alert).values({
        userId: context.user.id, coinId: input.coinId, direction: input.direction,
        targetUsd: usd, inputCurrency: input.currency, inputAmount: input.amount,
      }).returning();
      return row;
    }),

  remove: authed.input(z.object({ id: z.number() })).handler(async ({ context, input }) => {
    await db.delete(alert).where(and(eq(alert.id, input.id), eq(alert.userId, context.user.id)));
    return { ok: true };
  }),

  markSeen: authed.handler(async ({ context }) => {
    await db.update(alert).set({ seen: true }).where(and(eq(alert.userId, context.user.id), eq(alert.status, "triggered")));
    return { ok: true };
  }),
};
