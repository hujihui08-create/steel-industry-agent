import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AdminStatCard -- 统计指标卡片
 *
 * 用于管理后台仪表盘的指标概览，显示关键数值及其变化趋势。
 *
 * Design tokens:
 * - 卡片: bg-white, 1px border-[#E5E5E5], rounded-lg, p-5
 * - 图标区: 40x40, rounded-lg, bg-[#FAFAFA]
 * - 主数值: text-[28px] font-medium text-[#0A0A0A] tabular-nums
 * - 标签: text-[12px] text-[#737373]
 * - 趋势: text-[12px], 涨=#1F7A4D, 跌=#B42318
 */

export interface AdminStatCardProps {
  /** 左上角图标，传入 lucide-react 图标组件 */
  icon: React.ReactNode;
  /** 指标名称，如 "活跃用户" */
  label: string;
  /** 主数值，支持字符串或数字 */
  value: string | number;
  /** 变化量（正数为涨，负数为跌，0 为持平） */
  change?: number;
  /** 变化百分比 */
  changePct?: number;
  /** 点击卡片回调 */
  onClick?: () => void;
  /** 额外的 className */
  className?: string;
}

export function AdminStatCard({
  icon,
  label,
  value,
  change,
  changePct,
  onClick,
  className,
}: AdminStatCardProps) {
  const isUp = change !== undefined && change > 0;
  const isDown = change !== undefined && change < 0;
  const isNeutral = change === undefined || change === 0;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        // 卡片基础样式
        "bg-white border border-[#E5E5E5] rounded-lg p-5",
        "flex flex-col gap-4",
        // 可点击样式
        onClick && [
          "cursor-pointer",
          "hover:bg-[#FAFAFA]",
          "transition-colors duration-150",
          "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:ring-offset-1",
        ],
        className,
      )}
    >
      {/* 图标区 */}
      <div
        className={cn(
          "flex items-center justify-center",
          "w-10 h-10 rounded-lg",
          "bg-[#FAFAFA]",
        )}
        aria-hidden="true"
      >
        <span className="text-[#0A0A0A]">{icon}</span>
      </div>

      {/* 主数值 */}
      <div>
        <p
          className={cn(
            "text-[28px] leading-[1.2] font-medium text-[#0A0A0A]",
            "tabular-nums",
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "text-[12px] leading-[1.5] text-[#737373]",
            "mt-1",
          )}
        >
          {label}
        </p>
      </div>

      {/* 趋势指示器 */}
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {isUp && (
            <TrendingUp
              size={14}
              strokeWidth={1.75}
              className="text-[#1F7A4D] shrink-0"
              aria-label="上涨"
            />
          )}
          {isDown && (
            <TrendingDown
              size={14}
              strokeWidth={1.75}
              className="text-[#B42318] shrink-0"
              aria-label="下跌"
            />
          )}
          {isNeutral && (
            <span className="w-[14px] h-[14px] shrink-0" aria-hidden="true" />
          )}

          <span
            className={cn(
              "text-[12px] leading-[1.5] tabular-nums",
              isUp && "text-[#1F7A4D]",
              isDown && "text-[#B42318]",
              isNeutral && "text-[#737373]",
            )}
          >
            {isUp && "+"}
            {change}
            {changePct !== undefined && ` (${isUp ? "+" : ""}${changePct.toFixed(2)}%)`}
          </span>

          <span className="text-[12px] leading-[1.5] text-[#A3A3A3]">
            较昨日
          </span>
        </div>
      )}
    </div>
  );
}

export default AdminStatCard;
