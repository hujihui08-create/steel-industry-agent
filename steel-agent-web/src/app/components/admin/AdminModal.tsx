import React from "react";
import { cn } from "@/lib/utils";
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

/**
 * AdminModal -- 通用确认弹窗
 *
 * 基于 shadcn/ui 的 AlertDialog，用于删除确认、操作确认等场景。
 *
 * Design tokens:
 * - 默认: 主按钮 bg-[#0A0A0A] text-white, 次按钮 border-[#E5E5E5]
 * - 危险: 主按钮 bg-[#B42318]/10 text-[#B42318] border-[#B42318]
 * - 弹窗: bg-white, border border-[#E5E5E5], rounded-lg, shadow-[0_1px_2px_rgba(0,0,0,0.04)]
 */

export interface AdminModalProps {
  /** 弹窗是否打开 */
  open: boolean;
  /** 打开/关闭控制器 */
  onOpenChange: (open: boolean) => void;
  /** 弹窗标题 */
  title: string;
  /** 弹窗描述文字 */
  description?: string;
  /** 确认按钮文字，默认 "确定" */
  confirmLabel?: string;
  /** 取消按钮文字，默认 "取消" */
  cancelLabel?: string;
  /** 确认回调（children 模式下可选） */
  onConfirm?: () => void;
  /** 弹窗变体 */
  variant?: "default" | "destructive";
  /** 是否处于加载中（确认按钮显示 loading） */
  loading?: boolean;
  /** 弹窗尺寸 */
  size?: "sm" | "md";
  /** 自定义内容（提供时替换 description 区域） */
  children?: React.ReactNode;
}

export function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "确定",
  cancelLabel = "取消",
  onConfirm,
  variant = "default",
  loading = false,
  size,
  children,
}: AdminModalProps) {
  const isDestructive = variant === "destructive";
  const hasCustomContent = !!children;

  const sizeClass =
    size === "sm" ? "max-w-[360px]" : size === "md" ? "max-w-[520px]" : "max-w-[400px]";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "bg-white border border-[#E5E5E5] rounded-lg",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "p-6",
          sizeClass,
        )}
      >
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle
            className={cn(
              "text-[16px] leading-[1.4] font-medium text-[#0A0A0A]",
            )}
          >
            {title}
          </AlertDialogTitle>
          {!hasCustomContent && description && (
            <AlertDialogDescription
              className={cn(
                "text-[13px] leading-[1.6] text-[#737373]",
              )}
            >
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {/* 自定义内容区域 */}
        {hasCustomContent && (
          <div className="mt-4">{children}</div>
        )}

        {/* 底部按钮 */}
        {(!hasCustomContent || onConfirm) ? (
          /* 标准模式 或 带确认的 children 模式：显示取消+确认 */
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={loading}
              className={cn(
                "h-9 px-4 rounded-full",
                "border border-[#E5E5E5]",
                "bg-white text-[#0A0A0A] text-[13px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "mt-0",
              )}
            >
              {cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                onConfirm?.();
              }}
              className={cn(
                "h-9 px-4 rounded-full",
                "text-[13px] leading-[1.5] font-medium",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-offset-1",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "mt-0",
                !isDestructive && [
                  "bg-[#0A0A0A] text-white",
                  "hover:bg-[#404040]",
                  "border-none",
                  "focus-visible:ring-[#0A0A0A]/10",
                ],
                isDestructive && [
                  "bg-[#B42318]/10 text-[#B42318]",
                  "hover:bg-[#B42318]/15",
                  "border border-[#B42318]/30",
                  "focus-visible:ring-[#B42318]/10",
                ],
              )}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  处理中...
                </span>
              ) : (
                confirmLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        ) : (
          /* children 无确认模式：仅显示关闭按钮 */
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              className={cn(
                "h-9 px-4 rounded-full",
                "border border-[#E5E5E5]",
                "bg-white text-[#0A0A0A] text-[13px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                "mt-0",
              )}
            >
              关闭
            </AlertDialogCancel>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AdminModal;
