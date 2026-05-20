import { ArrowUpRight, ArrowDownRight, Minus, Bell, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  onSetAlert?: (e: React.MouseEvent) => void;
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
  onSetAlert,
}: PriceCardProps) {
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
          </div>
          {sourceTime && (
            <div className="text-[12px] leading-[1.5] text-steel-muted shrink-0 ml-4">
              {sourceTime}
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
      {(onViewTrend || onSetAlert) && (
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
          {onSetAlert && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => onSetAlert(e)}
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
