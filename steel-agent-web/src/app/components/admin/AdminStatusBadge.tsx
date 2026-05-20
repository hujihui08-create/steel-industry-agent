import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AdminStatusBadge -- 状态指示徽章
 *
 * 用于管理后台表格、详情中显示实体的当前状态。
 *
 * Design tokens:
 * - 正常/启用/成功: text-[#1F7A4D], bg-[#ECFDF5], 绿色圆点
 * - 警告/待处理: text-[#B45309], bg-[#FFFBEB], 琥珀色圆点
 * - 错误/禁用: text-[#B42318], bg-[#FEF2F2], 红色圆点
 * - 进行中: text-[#0A0A0A], bg-[#FAFAFA], Loader2 旋转图标
 * - inline-flex items-center gap-1.5, text-[12px], px-2 py-0.5 rounded-sm
 */

export type AdminStatusBadgeStatus =
  | "normal"
  | "active"
  | "enabled"
  | "warning"
  | "degraded"
  | "error"
  | "down"
  | "disabled"
  | "pending"
  | "completed"
  | "verified"
  | "success"
  | "fixing"
  | "in-progress";

/** 状态分组，用于决定颜色方案 */
type StatusGroup = "positive" | "warning" | "negative" | "loading" | "neutral";

const STATUS_GROUP_MAP: Record<AdminStatusBadgeStatus, StatusGroup> = {
  normal: "positive",
  active: "positive",
  enabled: "positive",
  completed: "positive",
  verified: "positive",
  success: "positive",
  warning: "warning",
  degraded: "warning",
  pending: "warning",
  error: "negative",
  down: "negative",
  disabled: "negative",
  fixing: "loading",
  "in-progress": "loading",
};

/** 默认中文标签 */
const STATUS_LABEL_MAP: Record<AdminStatusBadgeStatus, string> = {
  normal: "正常",
  active: "启用",
  enabled: "已启用",
  warning: "警告",
  degraded: "降级",
  error: "异常",
  down: "离线",
  disabled: "已禁用",
  pending: "待处理",
  completed: "已完成",
  verified: "已验证",
  success: "成功",
  fixing: "修复中",
  "in-progress": "进行中",
};

interface AdminStatusBadgeProps {
  /** 状态值 */
  status: AdminStatusBadgeStatus;
  /** 自定义显示文本，不传则使用默认中文标签 */
  label?: string;
  /** 额外的 className */
  className?: string;
}

/** 1.5px 小圆点，纯装饰 */
function StatusDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block w-[6px] h-[6px] rounded-full shrink-0",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function AdminStatusBadge({
  status,
  label,
  className,
}: AdminStatusBadgeProps) {
  const group = STATUS_GROUP_MAP[status];
  const displayLabel = label ?? STATUS_LABEL_MAP[status];

  const groupStyles: Record<StatusGroup, string> = {
    positive: "text-[#1F7A4D] bg-[#ECFDF5]",
    warning: "text-[#B45309] bg-[#FFFBEB]",
    negative: "text-[#B42318] bg-[#FEF2F2]",
    loading: "text-[#0A0A0A] bg-[#FAFAFA]",
    neutral: "text-[#404040] bg-[#FAFAFA]",
  };

  const dotStyles: Record<StatusGroup, string> = {
    positive: "bg-[#1F7A4D]",
    warning: "bg-[#B45309]",
    negative: "bg-[#B42318]",
    loading: "bg-[#0A0A0A]",
    neutral: "bg-[#737373]",
  };

  // completed/verified/success 额外显示 CheckCircle2 图标
  const showCheckIcon =
    status === "completed" || status === "verified" || status === "success";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "text-[12px] leading-[1.5]",
        "px-2 py-0.5 rounded-sm",
        "select-none",
        groupStyles[group],
        className,
      )}
      role="status"
    >
      {/* loading 状态使用旋转图标 */}
      {group === "loading" ? (
        <Loader2
          size={12}
          strokeWidth={1.75}
          className="animate-spin shrink-0"
          aria-label="加载中"
        />
      ) : showCheckIcon ? (
        <CheckCircle2
          size={12}
          strokeWidth={1.75}
          className="shrink-0"
          aria-label="已完成"
        />
      ) : (
        <StatusDot className={dotStyles[group]} />
      )}

      <span>{displayLabel}</span>
    </span>
  );
}

export default AdminStatusBadge;
