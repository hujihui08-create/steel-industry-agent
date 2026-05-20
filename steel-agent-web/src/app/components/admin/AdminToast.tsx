import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

/**
 * AdminToast -- Toast 通知封装
 *
 * 基于 sonner 的 toast 函数，提供统一的管理后台通知样式。
 *
 * Design tokens:
 * - 成功: 左侧绿色 accent, CheckCircle2 图标, 3s 自动消失
 * - 错误: 左侧红色 accent, XCircle 图标, 5s 自动消失
 * - 警告: 左侧琥珀色 accent, AlertTriangle 图标, 4s 自动消失
 *
 * Usage:
 *   import { showSuccessToast, showErrorToast, showWarningToast } from "@/app/components/admin/AdminToast";
 *   showSuccessToast("保存成功");
 *   showErrorToast("保存失败，请重试");
 */

// ============================================================
// 样式常量
// ============================================================

const BASE_STYLE: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E5E5E5",
  borderRadius: "10px",
  color: "#404040",
  fontSize: "13px",
  lineHeight: "1.5",
  padding: "12px 16px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

// ============================================================
// 公开 API
// ============================================================

/**
 * 显示成功 Toast
 * @param message - 提示消息
 * @param duration - 持续时间（ms），默认 3000
 * @returns sonner toast id
 */
export function showSuccessToast(message: string, duration = 3000): string | number {
  return toast(message, {
    duration,
    style: BASE_STYLE,
    icon: (
      <CheckCircle2
        size={18}
        strokeWidth={1.75}
        className="text-[#1F7A4D] shrink-0"
      />
    ),
    classNames: {
      title: "!text-[#404040] !text-[13px] !font-normal",
    },
  });
}

/**
 * 显示错误 Toast
 * @param message - 提示消息
 * @param duration - 持续时间（ms），默认 5000
 * @returns sonner toast id
 */
export function showErrorToast(message: string, duration = 5000): string | number {
  return toast(message, {
    duration,
    style: BASE_STYLE,
    icon: (
      <XCircle
        size={18}
        strokeWidth={1.75}
        className="text-[#B42318] shrink-0"
      />
    ),
    classNames: {
      title: "!text-[#404040] !text-[13px] !font-normal",
    },
  });
}

/**
 * 显示警告 Toast
 * @param message - 提示消息
 * @param duration - 持续时间（ms），默认 4000
 * @returns sonner toast id
 */
export function showWarningToast(message: string, duration = 4000): string | number {
  return toast(message, {
    duration,
    style: BASE_STYLE,
    icon: (
      <AlertTriangle
        size={18}
        strokeWidth={1.75}
        className="text-[#B45309] shrink-0"
      />
    ),
    classNames: {
      title: "!text-[#404040] !text-[13px] !font-normal",
    },
  });
}
