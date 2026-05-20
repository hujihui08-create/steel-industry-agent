import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * AdminDrawer -- 右侧滑动抽屉
 *
 * 基于 shadcn/ui 的 Sheet，用于详情查看、表单编辑等侧边操作。
 *
 * Design tokens:
 * - 宽度: 600px
 * - 侧边: right
 * - 标题栏: 固定顶部，带关闭按钮
 * - 内容区: 可滚动
 * - 底部可选操作栏: footer
 */

export interface AdminDrawerProps {
  /** 抽屉是否打开 */
  open: boolean;
  /** 打开/关闭控制器 */
  onOpenChange: (open: boolean) => void;
  /** 抽屉标题 */
  title: string;
  /** 抽屉内容 */
  children: React.ReactNode;
  /** 底部操作按钮区 */
  footer?: React.ReactNode;
  /** 额外的 className */
  className?: string;
}

export function AdminDrawer({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
}: AdminDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        className={cn(
          // 覆写默认宽度为 600px
          "!w-[600px] sm:!max-w-[600px]",
          // 描边
          "border-l border-[#E5E5E5]",
          // 背景
          "bg-white",
          // 无阴影（design system 规范）
          "shadow-none",
          // 弹性布局
          "flex flex-col",
          // padding 归零，由内部控制
          "p-0",
          className,
        )}
      >
        {/* 无默认关闭按钮 — 自定义标题栏 */}
        <SheetHeader
          className={cn(
            "flex flex-row items-center justify-between",
            "shrink-0",
            "px-5 py-4",
            "border-b border-[#E5E5E5]",
            "space-y-0", // 覆盖 SheetHeader 默认 gap
          )}
        >
          <SheetTitle
            className={cn(
              "text-[16px] leading-[1.4] font-medium text-[#0A0A0A]",
            )}
          >
            {title}
          </SheetTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center justify-center",
              "w-8 h-8 rounded-md",
              "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
              "transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
            aria-label="关闭抽屉"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </SheetHeader>

        {/* 可滚动内容区 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* 底部操作栏 */}
        {footer && (
          <div
            className={cn(
              "shrink-0 flex items-center justify-end gap-3",
              "px-5 py-4",
              "border-t border-[#E5E5E5]",
            )}
          >
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default AdminDrawer;
