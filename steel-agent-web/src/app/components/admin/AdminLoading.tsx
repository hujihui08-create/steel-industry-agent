import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * AdminLoading -- 加载骨架屏组件
 *
 * 用于管理后台数据加载中的占位，支持三种形态：
 * - card: 卡片骨架（矩形块）
 * - table: 表格骨架（多行矩形）
 * - inline: 行内骨架（单行）
 *
 * 基于 shadcn/ui 的 Skeleton 组件。
 */

export interface AdminLoadingProps {
  /** 骨架屏类型 */
  type?: "card" | "table" | "inline";
  /** 表格行数（仅 type="table" 时生效），默认 5 */
  rows?: number;
  /** 额外的 className */
  className?: string;
}

/** 单个骨架条 */
function Bone({
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) {
  return (
    <Skeleton
      className={cn("bg-[#E5E5E5]", className)}
      {...props}
    />
  );
}

/** 卡片骨架 */
function CardSkeleton() {
  return (
    <div
      className="bg-white border border-[#E5E5E5] rounded-lg p-5 space-y-4"
      aria-hidden="true"
    >
      {/* 图标占位 */}
      <Bone className="w-10 h-10 rounded-lg" />
      {/* 主数值占位 */}
      <Bone className="h-8 w-1/2" />
      {/* 标签占位 */}
      <Bone className="h-3 w-1/3" />
      {/* 趋势占位 */}
      <Bone className="h-3 w-2/5" />
    </div>
  );
}

/** 表格骨架 */
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0" aria-hidden="true">
      {/* 表头 */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[#E5E5E5]">
        <Bone className="h-3 w-1/6" />
        <Bone className="h-3 w-1/5" />
        <Bone className="h-3 w-1/4" />
        <Bone className="h-3 w-1/6" />
        <Bone className="h-3 w-[60px] ml-auto" />
      </div>

      {/* 数据行 */}
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-4 px-4 py-3 border-b border-[#E5E5E5]",
            i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
          )}
        >
          <Bone className="h-3 w-1/6" />
          <Bone className="h-3 w-2/5" />
          <Bone className="h-3 w-1/4" />
          <Bone
            className="h-5 w-[50px] rounded-sm"
          />
          <Bone className="h-3 w-[40px] ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** 行内骨架 */
function InlineSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <Bone className="h-4 flex-1" />
      <Bone className="h-4 w-1/3" />
    </div>
  );
}

export function AdminLoading({
  type = "card",
  rows = 5,
  className,
}: AdminLoadingProps) {
  return (
    <div className={cn(className)}>
      {type === "card" && <CardSkeleton />}
      {type === "table" && <TableSkeleton rows={rows} />}
      {type === "inline" && <InlineSkeleton />}
    </div>
  );
}

export default AdminLoading;
