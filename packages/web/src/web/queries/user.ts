import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";
import { authClient } from "../lib/auth";

export function useSession() {
  const s = authClient.useSession();
  return { user: s.data?.user ?? null, loading: s.isPending };
}

export function useWatchlist() {
  const { user } = useSession();
  return useQuery(orpc.watch.list.queryOptions({ enabled: !!user, staleTime: 30_000 }));
}

export function useToggleWatch() {
  const qc = useQueryClient();
  const key = orpc.watch.list.queryOptions().queryKey;
  const add = useMutation(orpc.watch.add.mutationOptions());
  const remove = useMutation(orpc.watch.remove.mutationOptions());
  const toggle = async (coinId: string, watching: boolean) => {
    await qc.cancelQueries({ queryKey: key });
    const prev = qc.getQueryData(key);
    qc.setQueryData(key, (old: any) =>
      watching ? (old ?? []).filter((w: any) => w.coinId !== coinId) : [...(old ?? []), { id: -Date.now(), coinId, createdAt: new Date() }]);
    try {
      await (watching ? remove.mutateAsync({ coinId }) : add.mutateAsync({ coinId }));
    } catch (e) {
      qc.setQueryData(key, prev);
      throw e;
    } finally {
      qc.invalidateQueries({ queryKey: key });
    }
  };
  return { toggle, pending: add.isPending || remove.isPending };
}

export function useAlerts() {
  const { user } = useSession();
  return useQuery(orpc.alerts.list.queryOptions({ enabled: !!user, refetchInterval: 60_000, staleTime: 20_000 }));
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation(orpc.alerts.create.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.alerts.key() }) }));
}
export function useRemoveAlert() {
  const qc = useQueryClient();
  return useMutation(orpc.alerts.remove.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.alerts.key() }) }));
}
export function useMarkSeen() {
  const qc = useQueryClient();
  return useMutation(orpc.alerts.markSeen.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.alerts.key() }) }));
}
