import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, MapPin, Calendar } from "lucide-react";
import {
  getTenderFavorites,
  getTenderDetail,
  removeTenderFavorite,
} from "@/app/api/tenders";
import type { TenderDetail } from "@/app/types/tender";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { ROUTE } from "@/app/constants/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StatusConfig {
  dot: string;
  dotClass: string;
  label: string;
  labelClass: string;
}

const statusMap: Record<TenderDetail["status"], StatusConfig> = {
  open: {
    dot: "\u25CF",
    dotClass: "text-steel-ink",
    label: "进行中",
    labelClass: "text-steel-ink",
  },
  closed: {
    dot: "\u25CB",
    dotClass: "text-steel-placeholder",
    label: "已截止",
    labelClass: "text-steel-muted",
  },
  won: {
    dot: "\u25CF",
    dotClass: "text-steel-up",
    label: "已中标",
    labelClass: "text-steel-up",
  },
  lost: {
    dot: "\u25CF",
    dotClass: "text-steel-down",
    label: "未中标",
    labelClass: "text-steel-down",
  },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

export default function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [unfavoriteId, setUnfavoriteId] = useState<string | null>(null);

  const {
    data: favorites,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tender-favorites"],
    queryFn: async () => {
      const ids = await getTenderFavorites();
      if (!ids || ids.length === 0) return [];
      const details = await Promise.all(
        ids.map((id: number) => getTenderDetail(String(id)))
      );
      return details;
    },
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: (tenderId: string) => removeTenderFavorite(tenderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tender-favorites"] });
      toast("已取消收藏");
      setUnfavoriteId(null);
    },
    onError: (err: Error) => {
      toast("操作失败", { description: err.message });
      setUnfavoriteId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-steel-canvas flex flex-col">
        <PageHeader title="我的收藏" onBack={() => navigate(-1)} />
        <div className="px-4 py-6">
          <LoadingSkeleton variant="list" count={3} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-steel-canvas flex flex-col">
        <PageHeader title="我的收藏" onBack={() => navigate(-1)} />
        <ErrorState
          message={error instanceof Error ? error.message : "加载失败"}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="min-h-screen bg-steel-canvas flex flex-col">
        <PageHeader title="我的收藏" onBack={() => navigate(-1)} />
        <EmptyState
          title="暂无收藏"
          description="去招标列表看看吧"
          action={{
            label: "查看招标",
            onClick: () => navigate(ROUTE.TENDERS),
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader title="我的收藏" onBack={() => navigate(-1)} />

      <main className="flex-1 px-4 py-4 overflow-auto">
        {favorites.map((item: TenderDetail) => {
          const status = statusMap[item.status];

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/tenders/${item.id}`)}
              className="w-full text-left rounded-2xl border border-steel-line bg-steel-canvas p-4 mb-2 hover:bg-steel-surface/50 transition-colors duration-150"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[14px] leading-none ${status.dotClass}`}>
                  {status.dot}
                </span>
                <span className={`text-[12px] leading-[1.5] font-medium ${status.labelClass}`}>
                  {status.label}
                </span>
              </div>

              <p className="text-[15px] leading-[1.6] font-medium text-steel-ink truncate mb-2">
                {item.title}
              </p>

              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center gap-1 text-[12px] leading-[1.5] text-steel-muted">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {item.region}
                </span>

                <span className="inline-flex items-center text-[11px] leading-[1.5] text-steel-muted px-1.5 border border-steel-line rounded">
                  {item.category}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[12px] leading-[1.5] text-steel-muted">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  投标截止 {formatDate(item.bid_deadline)}
                </span>

                <button
                  type="button"
                  aria-label="取消收藏"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUnfavoriteId(item.id);
                  }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-steel-muted hover:text-steel-down hover:bg-steel-surface transition-colors duration-150"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </button>
          );
        })}
      </main>

      <AlertDialog
        open={unfavoriteId !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setUnfavoriteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认取消收藏</AlertDialogTitle>
            <AlertDialogDescription>
              取消收藏后，该招标项目将从收藏列表中移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (unfavoriteId) {
                  removeMutation.mutate(unfavoriteId);
                }
              }}
              className="bg-steel-down hover:bg-steel-down/90"
            >
              确认取消
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
