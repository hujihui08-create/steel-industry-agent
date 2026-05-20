import React from "react";
import { cn } from "@/lib/utils";
import { AdminBreadcrumb, type BreadcrumbItemData } from "./AdminBreadcrumb";

interface AdminPageShellProps {
  /** 页面标题 */
  title: string;
  /** 面包屑数据 */
  breadcrumbs: BreadcrumbItemData[];
  /** 右侧操作按钮区域 */
  actions?: React.ReactNode;
  /** 页面主体内容 */
  children: React.ReactNode;
  /** 额外的 className */
  className?: string;
}

export function AdminPageShell({
  title,
  breadcrumbs,
  actions,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 面包屑导航 */}
      <div className="mb-3">
        <AdminBreadcrumb items={breadcrumbs} />
      </div>

      {/* 标题栏：左侧标题 + 右侧操作按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className={cn(
            "text-[24px] leading-[1.3] font-medium text-[#0A0A0A]",
          )}
        >
          {title}
        </h1>
        {actions && (
          <div className="flex items-center gap-3">{actions}</div>
        )}
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
