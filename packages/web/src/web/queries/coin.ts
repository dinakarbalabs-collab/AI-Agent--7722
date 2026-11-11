import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const useAnalysis = (id: string) =>
  useQuery(orpc.coin.analysis.queryOptions({ input: { id }, staleTime: 60_000, retry: 1 }));
export const useHistory = (id: string, range: "7d" | "30d" | "1y") =>
  useQuery(orpc.coin.history.queryOptions({ input: { id, range }, staleTime: 120_000, placeholderData: keepPreviousData, retry: 1 }));
export const useNarrative = (id: string, enabled: boolean) =>
  useQuery(orpc.coin.narrative.queryOptions({ input: { id }, staleTime: 10 * 60_000, enabled, retry: 0 }));
