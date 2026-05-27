import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/app/stores/authStore";
import { useLoginDialogStore } from "@/app/stores/loginDialogStore";
import {
  addTenderFavorite,
  removeTenderFavorite,
  getTenderFavorites,
} from "@/app/api/tenders";

const FAVORITES_KEY = ["tender-favorites"] as const;

export function useTenderFavorite() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginDialog = useLoginDialogStore((s) => s.openLoginDialog);

  const { data: favoriteIds = [] } = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: getTenderFavorites,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const favoriteSet = useMemo(() => new Set(favoriteIds.map(String)), [favoriteIds]);

  const addMutation = useMutation({
    mutationFn: addTenderFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
      toast.success("已收藏");
    },
    onError: (error: Error) => {
      toast.error(error.message || "收藏失败，请重试");
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeTenderFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
      toast.success("已取消收藏");
    },
    onError: (error: Error) => {
      toast.error(error.message || "取消收藏失败，请重试");
    },
  });

  const isFavorited = useCallback(
    (id: number | string): boolean => {
      return favoriteSet.has(String(id));
    },
    [favoriteSet],
  );

  const toggleFavorite = useCallback(
    (id: number | string) => {
      if (!isAuthenticated) {
        openLoginDialog();
        return;
      }
      const idStr = String(id);
      if (favoriteSet.has(idStr)) {
        removeMutation.mutate(idStr);
      } else {
        addMutation.mutate(idStr);
      }
    },
    [isAuthenticated, favoriteSet, addMutation, removeMutation, openLoginDialog],
  );

  return {
    isFavorited,
    toggleFavorite,
    favoriteSet,
    isLoading: addMutation.isPending || removeMutation.isPending,
  };
}
