import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { fetchChart } from "../lib/coingecko";
import { getAnalysis } from "../lib/analysis";
import { getNarrative } from "../lib/narrative";

const id = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);

export const coin = {
  history: base
    .input(z.object({ id, range: z.enum(["7d", "30d", "1y"]) }))
    .handler(async ({ input }) => {
      try {
        if (input.range === "1y") {
          const r = await fetchChart(input.id, 365);
          return { prices: r.data.prices, volumes: r.data.total_volumes, stale: r.stale };
        }
        const r = await fetchChart(input.id, 30);
        const cutoff = Date.now() - (input.range === "7d" ? 7 : 30) * 86400_000;
        const prices = r.data.prices.filter((p) => p[0] >= cutoff);
        // thin the 30d hourly series for lighter rendering
        const thin = input.range === "30d" ? prices.filter((_, i) => i % 3 === 0 || i === prices.length - 1) : prices;
        return { prices: thin, volumes: r.data.total_volumes.filter((v) => v[0] >= cutoff), stale: r.stale };
      } catch {
        throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Price history is temporarily unavailable. Try again shortly." });
      }
    }),

  analysis: base.input(z.object({ id })).handler(async ({ input }) => {
    try {
      const a = await getAnalysis(input.id);
      if (!a) throw new ORPCError("NOT_FOUND", { message: "Coin not found in the top 50." });
      return a;
    } catch (e) {
      if (e instanceof ORPCError) throw e;
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: (e as Error).message });
    }
  }),

  narrative: base.input(z.object({ id })).handler(async ({ input }) => {
    const a = await getAnalysis(input.id);
    if (!a) throw new ORPCError("NOT_FOUND", { message: "Coin not found in the top 50." });
    return getNarrative(a);
  }),
};
