import type { client } from "../lib/api";

export type Analysis = Awaited<ReturnType<typeof client.coin.analysis>>;
export type Narrative = Awaited<ReturnType<typeof client.coin.narrative>>;
