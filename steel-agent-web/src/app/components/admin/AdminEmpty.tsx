import React from "react";
import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AdminEmpty -- 空状态组件
 *
 * 当管理后台列表/表格无数据时显示的空状态占位。
 *
 * Design tokens:
 * - 图标圈: 48x48 rounded-full, bg-[#FAFAFA], border border-[#E5E5E5]
 * - 标题: text-[15px] text-[#404040]
 * - 描述: text-[12px] text-[#737373]
 */

export interface AdminEmptyProps {
  /** 自定义图标，默认 PackageOpen */
  icon?: React.ReactNode;
  /** 主标题，默认 "暂无数据" */
  title?: string;
  /** 辅助说明文字 */
  description?: string;
  /** 操作按钮配置 */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 额外的 className */
  className?: string;
}

export function AdminEmpty({
  icon,
  title = "暂无数据",
  description,
  action,
  className,
}: AdminEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        "py-20 px-4",
        className,
      )}
    >
      {/* 图标圆圈 */}
      <div
        className={cn(
          "flex items-center justify-center",
          "w-12 h-12 rounded-full",
          "bg-[#FAFAFA] border border-[#E5E5E5]",
        )}
        aria-hidden="true"
      >
        {icon ?? (
          <PackageOpen
            size={22}
            strokeWidth={1.75}
            className="text-[#A3A3A3]"
          />
        )}
      </div>

      {/* 文字区域 */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-[15px] leading-[1.6] text-[#404040] text-center">
          {title}
        </p>
        {description && (
          <p className="text-[12px] leading-[1.5] text-[#737373] text-center max-w-[320px]">
            {description}
          </p>
        )}
      </div>

      {/* 可选操作按钮 */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-2 inline-flex items-center justify-center",
            "h-9 px-4 rounded-full",
            "border border-[#E5E5E5]",
            "text-[13px] leading-[1.5] text-[#0A0A0A]",
            "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
            "transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
          )}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default AdminEmpty;
