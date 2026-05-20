import React from "react";
import {
  LayoutDashboard,
  Bot,
  Bug,
  Globe,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const DEFAULT_ITEMS: TopNavItem[] = [
  { id: "dashboard", label: "首页", icon: LayoutDashboard },
  { id: "agent", label: "Agent管理", icon: Bot },
  { id: "quality", label: "质量管理", icon: Bug },
  { id: "data", label: "数据管理", icon: Globe },
  { id: "users", label: "用户管理", icon: Users },
  { id: "system", label: "系统管理", icon: Settings },
];

interface TopNavBarProps {
  selected: string;
  onSelect: (id: string) => void;
  items?: TopNavItem[];
  visible?: boolean;
}

export function TopNavBar({
  selected,
  onSelect,
  items = DEFAULT_ITEMS,
  visible = true,
}: TopNavBarProps) {
  if (!visible) return null;
  return (
    <nav
      className={cn(
        "fixed top-[56px] left-0 right-0 z-40",
        "h-[48px]",
        "bg-white border-b border-[#E5E5E5]",
        "flex items-center",
      )}
      aria-label="顶部导航"
    >
      <div className="flex items-center h-full px-6 gap-8">
        {items.map((item) => {
          const isSelected = selected === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "relative flex items-center gap-2 h-full",
                "text-[14px] leading-[1.5]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 rounded-sm",
                isSelected
                  ? "text-[#0A0A0A]"
                  : "text-[#737373] hover:text-[#0A0A0A]",
              )}
              aria-current={isSelected ? "page" : undefined}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {isSelected && (
                <span
                  className={cn(
                    "absolute bottom-0 left-0 right-0",
                    "h-[1px] bg-[#0A0A0A]",
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
