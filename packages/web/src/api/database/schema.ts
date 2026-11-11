import {} from "drizzle-orm/sqlite-core";

/**
 * Define your database schema here, then apply it with `bun run db:push`
 * (from packages/web). Re-export any generated schema from this file
 * (e.g. Better Auth's auth-schema.ts) so drizzle generates complete migrations.
 * Table patterns and conventions: skills/app/references/api.md
 */

import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export * from "./auth-schema";

export const watchlist = sqliteTable(
  "watchlist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    coinId: text("coin_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("watchlist_user_coin").on(t.userId, t.coinId)],
);

export const alert = sqliteTable(
  "alert",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    coinId: text("coin_id").notNull(),
    direction: text("direction", { enum: ["above", "below"] }).notNull(),
    targetUsd: real("target_usd").notNull(),
    inputCurrency: text("input_currency", { enum: ["USD", "INR"] }).notNull().default("USD"),
    inputAmount: real("input_amount"),
    status: text("status", { enum: ["active", "triggered"] }).notNull().default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    triggeredAt: integer("triggered_at", { mode: "timestamp" }),
    triggeredPriceUsd: real("triggered_price_usd"),
    seen: integer("seen", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("alert_user").on(t.userId), index("alert_status").on(t.status)],
);

export const kvCache = sqliteTable("kv_cache", {
  key: text("key").primaryKey(),
  json: text("json").notNull(),
  at: integer("at").notNull(),
});
