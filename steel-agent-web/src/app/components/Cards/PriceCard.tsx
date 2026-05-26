import { ArrowUpRight, ArrowDownRight, Minus, Bell, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAlertStore } from "@/app/stores/alertStore";
import { toast } from "sonner";

export interface PriceItem {
  region: string;
  price: number;
  change: number;
  changePct: number;
}

export interface PriceCardProps {
  eyebrow?: string;
  title: string;
  prices: PriceItem[];
  source?: string;
  sourceTime?: string;
  onViewTrend?: (e: React.MouseEvent) => void;
  /** 规格型号，显示在标题下方 */
  spec?: string;
  /** 加载中骨架屏 */
  isLoading?: boolean;
  /** 错误状态 */
  isError?: boolean;
  /** 错误信息文本 */
  errorMessage?: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 价格日期，显示在 header 右侧 */
  priceDate?: string;
}

function formatPrice(value: number): string {
  return `¥${value.toLocaleString()}`;
}

function formatChange(delta: number, pct: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta} (${sign}${pct}%)`;
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return <ArrowUpRight className="size-3 shrink-0" strokeWidth={2} />;
  }
  if (change < 0) {
    return <ArrowDownRight className="size-3 shrink-0" strokeWidth={2} />;
  }
  return <Minus className="size-3 shrink-0" strokeWidth={2} />;
}

export function PriceCard({
  eyebrow = "PRICE",
  title,
  prices,
  source,
  sourceTime,
  onViewTrend,
  spec,
  isLoading = false,
  isError = false,
  errorMessage = "加载失败",
  onRetry,
  priceDate,
}: PriceCardProps) {
  const { createAlert } = useAlertStore();

  const handleSetAlert = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const firstPrice = prices[0];
    if (!firstPrice) return;
    try {
      await createAlert({
        category: title,
        spec: "",
        region: firstPrice.region,
        target_price: firstPrice.price,
        condition: "above",
      });
      toast.success("预警设置成功");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "创建预警失败";
      toast.error(message);
    }
  };

  // ---- Loading skeleton ----
  if (isLoading) {
    return (
      <div>
        <div className="rounded-2xl border border-steel-line overflow-hidden">
          <div className="px-5 py-4 border-b border-steel-line">
            <div className="animate-pulse rounded bg-steel-line h-3 w-12 mb-2" />
            <div className="animate-pulse rounded bg-steel-line h-5 w-2/3" />
          </div>
          <div className="divide-y divide-steel-line">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                <div className="animate-pulse rounded bg-steel-line h-4 w-16" />
                <div className="flex items-baseline gap-3">
                  <div className="animate-pulse rounded bg-steel-line h-5 w-20" />
                  <div className="animate-pulse rounded bg-steel-line h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (isError) {
    return (
      <div>
        <div className="rounded-2xl border border-steel-down/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-steel-down/20 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                {eyebrow}
              </div>
              <div className="text-[18px] leading-[1.4] font-medium text-steel-ink mt-0.5 truncate">
                {title}
              </div>
            </div>
          </div>
          <div className="px-5 py-6 flex flex-col items-center gap-3">
            <p className="text-[13px] text-steel-down text-center">{errorMessage}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line px-3 py-1.5 text-[13px] text-steel-ink hover:bg-steel-surface transition-colors duration-150"
              >
                <RefreshCw className="size-3" strokeWidth={1.75} />
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Display date ----
  const displayDate = priceDate || sourceTime;

  return (
    <div>
      <div className="rounded-2xl border border-steel-line overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-steel-line flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
              {eyebrow}
            </div>
            <div className="text-[18px] leading-[1.4] font-medium text-steel-ink mt-0.5 truncate">
              {title}
            </div>
            {spec && (
              <div className="text-[13px] leading-[1.5] text-steel-muted mt-0.5 truncate">
                {spec}
              </div>
            )}
          </div>
          {displayDate && (
            <div className="text-[12px] leading-[1.5] text-steel-muted shrink-0 ml-4">
              {displayDate}
            </div>
          )}
        </div>

        {/* Price rows */}
        <div className="divide-y divide-steel-line">
          {prices.map((item) => {
            const isUp = item.change > 0;
            const isDown = item.change < 0;
            const changeColor = isUp
              ? "text-steel-up"
              : isDown
                ? "text-steel-down"
                : "text-steel-muted";

            return (
              <div
                key={item.region}
                className="px-5 py-3.5 flex items-center justify-between"
              >
                <span className="text-[15px] leading-[1.6] text-steel-body">
                  {item.region}
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-[18px] tabular-nums text-steel-ink">
                    {formatPrice(item.price)}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[12px] leading-[1.5] tabular-nums",
                      changeColor,
                    )}
                  >
                    <ChangeIndicator change={item.change} />
                    {formatChange(item.change, item.changePct)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Source footer */}
        {source && (
          <div className="px-5 py-3 border-t border-steel-line">
            <span className="text-[12px] leading-[1.5] text-steel-muted">
              数据来源: {source}
            </span>
          </div>
        )}
      </div>

      {/* Action pills */}
      {(onViewTrend || prices.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {onViewTrend && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => onViewTrend(e)}
              className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
            >
              <BarChart3 className="size-3.5" strokeWidth={1.75} />
              查看走势
            </Button>
          )}
          {prices.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetAlert}
              className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
            >
              <Bell className="size-3.5" strokeWidth={1.75} />
              设置预警
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default PriceCard;
