// ============================================================
// PriceDashboard — 价格看板仪表盘
// 卡片网格展示各钢材品种最新价格
// 使用 shadcn Card + Badge，数据从 /api/v1/prices/latest 获取
// ============================================================

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Minus, X, ExternalLink, BarChart3 } from "lucide-react";
import { getLatestPrice, getPriceList, type PriceData } from "@/app/api/price";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// 默认品种列表（API 不可用时兜底）
const DEFAULT_CATEGORIES = [
  "螺纹钢",
  "热卷",
  "冷轧",
  "中厚板",
  "镀锌板",
  "彩涂板",
  "不锈钢",
  "型钢",
];

interface PriceDashboardProps {
  /** 是否在紧凑模式下显示（右侧面板中使用） */
  compact?: boolean;
}

export function PriceDashboard({ compact = false }: PriceDashboardProps) {
  const [detailData, setDetailData] = useState<PriceData[] | null>(null);
  const [detailTitle, setDetailTitle] = useState("");

  // 获取多个品种的价格
  const { data: prices, isLoading } = useQuery({
    queryKey: ["price-dashboard"],
    queryFn: async () => {
      const results = await Promise.allSettled(
        DEFAULT_CATEGORIES.map((cat) => getLatestPrice(cat))
      );
      return results
        .filter(
          (r): r is PromiseFulfilledResult<PriceData> => r.status === "fulfilled"
        )
        .map((r) => r.value);
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });

  const handleCardClick = async (category: string, spec: string) => {
    try {
      const result = await getPriceList({ category, spec, limit: 20 });
      setDetailData(result.items);
      setDetailTitle(`${category} ${spec}`);
    } catch {
      toast.error("获取价格详情失败");
    }
  };

  const formatPrice = (price: number) =>
    `\u00A5${price.toLocaleString("zh-CN")}`;

  const getChangeBadge = (change: number, changePct: number) => {
    const isUp = change > 0;
    const isDown = change < 0;
    const colorClass = isUp
      ? "bg-success/10 text-success border-success/20"
      : isDown
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-muted text-muted-foreground border-border";

    const ArrowIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
    const sign = isUp ? "+" : "";

    return (
      <Badge variant="outline" className={cn("text-[12px] leading-[16px] gap-1", colorClass)}>
        <ArrowIcon className="size-3" strokeWidth={2} />
        {sign}{changePct.toFixed(1)}%
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {Array.from({ length: compact ? 3 : 8 }).map((_, i) => (
          <Card key={i} className="rounded-xl border-border">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-5 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!prices || prices.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          暂无价格数据，请稍后刷新
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-1"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}
      >
        {prices.map((item) => (
          <Card
            key={`${item.category}-${item.spec}`}
            className="rounded-xl border-border cursor-pointer hover:border-primary/30 transition-colors duration-150"
            onClick={() => handleCardClick(item.category, item.spec)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] leading-[20px]">
                {item.category}{" "}
                <span className="text-[13px] leading-[18px] text-muted-foreground font-normal">
                  {item.spec}
                </span>
              </CardTitle>
              <p className="text-[12px] leading-[16px] text-muted-foreground">
                {item.region}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-[24px] leading-[32px] font-semibold tabular-nums">
                {formatPrice(item.price)}
              </p>
              <div className="mt-1.5">
                {getChangeBadge(item.change, item.change_pct)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailData}
        onOpenChange={(open) => {
          if (!open) {
            setDetailData(null);
            setDetailTitle("");
          }
        }}
      >
        <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[16px] leading-[24px]">
              {detailTitle} - 价格详情
            </DialogTitle>
          </DialogHeader>

          {detailData && detailData.length > 0 ? (
            <div className="space-y-3">
              <div className="text-[12px] leading-[16px] text-muted-foreground">
                数据来源: {detailData[0].source} · {detailData[0].price_date}
              </div>
              <Separator />
              {detailData.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-[14px] leading-[20px]">
                    {item.region}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] leading-[24px] font-semibold tabular-nums">
                      {formatPrice(item.price)}
                    </span>
                    <span
                      className={cn(
                        "text-[12px] leading-[16px] tabular-nums flex items-center gap-0.5",
                        item.change > 0
                          ? "text-success"
                          : item.change < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.change > 0 ? (
                        <ArrowUpRight className="size-3" strokeWidth={2} />
                      ) : item.change < 0 ? (
                        <ArrowDownRight className="size-3" strokeWidth={2} />
                      ) : (
                        <Minus className="size-3" strokeWidth={2} />
                      )}
                      {item.change >= 0 ? "+" : ""}
                      {item.change} ({item.change >= 0 ? "+" : ""}
                      {item.change_pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-[18px] text-muted-foreground text-center py-8">
              暂无详细数据
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
