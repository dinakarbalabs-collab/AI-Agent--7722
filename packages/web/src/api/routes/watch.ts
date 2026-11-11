import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../database";
import { watchlist } from "../database/schema";
import { authed } from "../middleware/auth";

const coinId = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);

export const watch = {
  list: authed.handler(async ({ context }) => {
    const rows = await db.select().from(watchlist).where(eq(watchlist.userId, context.user.id));
    return rows.map((r) => ({ id: r.id, coinId: r.coinId, createdAt: r.createdAt }));
  }),
  add: authed.input(z.object({ coinId })).handler(async ({ context, input }) => {
    await db.insert(watchlist).values({ userId: context.user.id, coinId: input.coinId }).onConflictDoNothing();
    return { ok: true };
  }),
  remove: authed.input(z.object({ coinId })).handler(async ({ context, input }) => {
    await db.delete(watchlist).where(and(eq(watchlist.userId, context.user.id), eq(watchlist.coinId, input.coinId)));
    return { ok: true };
  }),
};
