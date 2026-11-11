import { CATEGORY_DEFS, STATIC_CATEGORIES, fetchCategoryIds, type CategoryKey } from "./coingecko";
import { peek } from "./cache";

let warming = false;

/** Fire-and-forget: loads live category membership one at a time through the throttled queue. */
export function warmCategories() {
  if (warming) return;
  const need = CATEGORY_DEFS.filter((c) => {
    const e = peek(`cat:${c.key}`);
    return !e || Date.now() - e.at > 60 * 60_000;
  });
  if (!need.length) return;
  warming = true;
  (async () => {
    for (const c of need) {
      try { await fetchCategoryIds(c.key); } catch {}
    }
  })().finally(() => { warming = false; });
}

export function categoriesFor(coinId: string): CategoryKey[] {
  const out: CategoryKey[] = [];
  for (const def of CATEGORY_DEFS) {
    const live = peek<string[]>(`cat:${def.key}`)?.value;
    const ids = new Set([...(STATIC_CATEGORIES[def.key] ?? []), ...(live ?? [])]);
    if (ids.has(coinId)) out.push(def.key);
  }
  return out;
}
