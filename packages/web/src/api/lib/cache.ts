import { eq } from "drizzle-orm";
import { db } from "../database";
import { kvCache } from "../database/schema";

type Entry<T> = { value: T; at: number; failedAt?: number };
const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export type Cached<T> = { data: T; fetchedAt: number; stale: boolean };

type Opts = {
  /** serve an existing entry without blocking if it is younger than this (and refresh in the background) */
  serveStaleMs?: number;
  /** persist to the database so restarts and API outages still have data */
  persist?: boolean;
};

async function loadPersisted<T>(key: string): Promise<Entry<T> | undefined> {
  try {
    const [row] = await db.select().from(kvCache).where(eq(kvCache.key, key)).limit(1);
    if (row) return { value: JSON.parse(row.json) as T, at: row.at };
  } catch {}
  return undefined;
}

function persist(key: string, value: unknown, at: number) {
  db.insert(kvCache)
    .values({ key, json: JSON.stringify(value), at })
    .onConflictDoUpdate({ target: kvCache.key, set: { json: JSON.stringify(value), at } })
    .catch(() => {});
}

function refresh<T>(key: string, fetcher: () => Promise<T>, doPersist: boolean): Promise<T> {
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fetcher()
      .then((value) => {
        const at = Date.now();
        store.set(key, { value, at });
        if (doPersist) persist(key, value, at);
        return value;
      })
      .catch((e) => {
        const cur = store.get(key);
        if (cur) cur.failedAt = Date.now();
        throw e;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/**
 * TTL cache with in-flight de-duplication, stale-while-revalidate and stale-on-error fallback.
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>, opts: Opts = {}): Promise<Cached<T>> {
  const doPersist = opts.persist ?? true;
  const serveStale = opts.serveStaleMs ?? 24 * 3600_000;
  let hit = store.get(key) as Entry<T> | undefined;
  if (!hit && doPersist) {
    hit = await loadPersisted<T>(key);
    if (hit) store.set(key, hit);
  }
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < ttlMs) return { data: hit.value, fetchedAt: hit.at, stale: false };

  if (hit && age < serveStale) {
    // refresh in the background (at most once per 15s after a failure) and answer immediately
    if (!hit.failedAt || Date.now() - hit.failedAt > 15_000) refresh(key, fetcher, doPersist).catch(() => {});
    return { data: hit.value, fetchedAt: hit.at, stale: !!hit.failedAt };
  }
  try {
    const value = await refresh(key, fetcher, doPersist);
    return { data: value, fetchedAt: store.get(key)?.at ?? Date.now(), stale: false };
  } catch (err) {
    if (hit) return { data: hit.value, fetchedAt: hit.at, stale: true };
    throw err;
  }
}

export function peek<T>(key: string): Entry<T> | undefined {
  return store.get(key) as Entry<T> | undefined;
}
