// ============================================================
// WorkbenchNav — 智能工作台侧边栏导航
// 5 个导航项对应 5 个工作台模块
// ============================================================

import { BarChart3, FileText, Search, Bell, TrendingUp, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const WORKBENCH_NAV_ITEMS = [
  { id: "price", label: "价格看板", icon: BarChart3 },
  { id: "quotation", label: "报价工作台", icon: FileText },
  { id: "tender", label: "招标追踪", icon: Search },
  { id: "alert", label: "预警中心", icon: Bell },
  { id: "trend", label: "趋势分析", icon: TrendingUp },
] as const;

export type WorkbenchNavId = (typeof WORKBENCH_NAV_ITEMS)[number]["id"];

interface WorkbenchNavProps {
  activeId: WorkbenchNavId;
  onNavigate: (id: WorkbenchNavId) => void;
  onCollapse?: () => void;
  /** Whether to show a back/collapse button (mobile) */
  showCollapseButton?: boolean;
}

export function WorkbenchNav({
  activeId,
  onNavigate,
  onCollapse,
  showCollapseButton = false,
}: WorkbenchNavProps) {
  return (
    <nav className="p-4 flex flex-col gap-1 flex-1" aria-label="工作台导航">
      {showCollapseButton && onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] leading-[18px] text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150 mb-2"
          aria-label="收起侧边栏"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
          <span>收起</span>
        </button>
      )}

      {WORKBENCH_NAV_ITEMS.map((item) => {
        const isActive = activeId === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-[13px] leading-[18px] transition-colors duration-150",
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
