import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export const useMarkets = () =>
  useQuery(orpc.markets.list.queryOptions({ refetchInterval: 60_000, staleTime: 30_000 }));
export const useOverview = () =>
  useQuery(orpc.markets.overview.queryOptions({ refetchInterval: 120_000, staleTime: 60_000 }));
export const useFx = () =>
  useQuery(orpc.markets.fx.queryOptions({ refetchInterval: 10 * 60_000, staleTime: 5 * 60_000 }));
