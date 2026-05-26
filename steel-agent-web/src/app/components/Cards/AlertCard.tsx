import { Button } from "@/components/ui/button";
import { Bell, List, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertCardProps {
  id?: number;
  category: string;
  spec: string;
  region: string;
  targetPrice: number;
  condition: "above" | "below";
  notifyMethod?: string;
  isActive?: boolean;
  isTriggered?: boolean;
  currentPrice?: number;
  triggeredAt?: string;
  onModify?: () => void;
  onViewAll?: () => void;
}

function formatPrice(value: number): string {
  return `¥${value.toLocaleString()}`;
}

export function AlertCard({
  id,
  category,
  spec,
  region,
  targetPrice,
  condition,
  notifyMethod,
  isActive,
  isTriggered = false,
  currentPrice,
  triggeredAt,
  onModify,
  onViewAll,
}: AlertCardProps) {
  const conditionIcon =
    condition === "above" ? (
      <ArrowUp className="size-3.5 text-steel-up inline" strokeWidth={1.75} />
    ) : (
      <ArrowDown className="size-3.5 text-steel-down inline" strokeWidth={1.75} />
    );

  const conditionSymbol = condition === "above" ? "≥" : "≤";
  const conditionText = `价格 ${conditionSymbol} ${formatPrice(targetPrice)}`;

  const rows: { label: string; value: string; isCondition?: boolean }[] = [
    { label: "品种", value: category },
    { label: "规格", value: spec },
    { label: "地区", value: region },
    { label: "目标价格", value: formatPrice(targetPrice) },
  ];

  return (
    <div>
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          isTriggered ? "border-steel-warn" : "border-steel-line",
        )}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-steel-line">
          <div className="flex items-center justify-between">
            <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
              ALERT
            </div>
            {isTriggered && (
              <span className="text-[11px] text-steel-warn">已触发</span>
            )}
          </div>
          <div className="text-[18px] leading-[1.4] font-medium text-steel-ink mt-0.5">
            {category} {spec}
          </div>
        </div>

        {/* Detail rows */}
        <div className="divide-y divide-steel-line px-5 py-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between py-3"
            >
              <span className="text-[15px] leading-[1.6] text-steel-body">
                {row.label}
              </span>
              <span className="text-[15px] leading-[1.6] text-steel-ink tabular-nums">
                {row.value}
              </span>
            </div>
          ))}

          {/* Condition row */}
          <div className="flex items-center justify-between py-3">
            <span className="text-[15px] leading-[1.6] text-steel-body">
              条件
            </span>
            <span className="text-[15px] leading-[1.6] text-steel-ink tabular-nums inline-flex items-center gap-1">
              {conditionIcon}
              {conditionText}
            </span>
          </div>

          {/* Notify method row */}
          {notifyMethod && (
            <div className="flex items-center justify-between py-3">
              <span className="text-[15px] leading-[1.6] text-steel-body">
                通知方式
              </span>
              <span className="text-[15px] leading-[1.6] text-steel-ink">
                {notifyMethod}
              </span>
            </div>
          )}
        </div>

        {/* Triggered section */}
        {isTriggered && currentPrice != null && (
          <div className="mx-5 my-2 rounded-lg bg-steel-warn/5 px-5 py-4 text-[13px] text-steel-warn">
            当前价格 {formatPrice(currentPrice)}
            {triggeredAt && ` · ${triggeredAt}`}
          </div>
        )}
      </div>

      {/* Action pills */}
      {(onModify || onViewAll) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {onModify && (
            <Button
              variant="outline"
              size="sm"
              onClick={onModify}
              className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
            >
              <Bell className="size-3.5" strokeWidth={1.75} />
              修改条件
            </Button>
          )}
          {onViewAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAll}
              className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
            >
              <List className="size-3.5" strokeWidth={1.75} />
              查看我的预警
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default AlertCard;
