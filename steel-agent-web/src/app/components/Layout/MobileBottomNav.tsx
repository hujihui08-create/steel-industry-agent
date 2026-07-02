// ============================================================
// MobileBottomNav — 移动端底部导航栏
// 4 个导航项：Chat / 价格看板 / 工作台 / 个人中心
// 仅在移动端（<768px）显示，桌面端自动隐藏
// ============================================================

import { MessageCircle, LayoutGrid, Briefcase, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/ui/use-mobile";

const NAV_ITEMS = [
  { route: "/chat", label: "对话", icon: MessageCircle },
  { route: "/price-board", label: "价格看板", icon: LayoutGrid },
  { route: "/workbench", label: "工作台", icon: Briefcase },
  { route: "/profile", label: "个人中心", icon: User },
] as const;

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around bg-background border-t border-border pb-[env(safe-area-inset-bottom,0px)]"
      style={{ height: "56px" }}
      aria-label="底部导航"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.route || pathname.startsWith(item.route + "/");
        const Icon = item.icon;

        return (
          <Link
            key={item.route}
            to={item.route}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full transition-colors duration-150",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-md transition-colors duration-150",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : ""
              )}
              style={{ width: "32px", height: "24px" }}
            >
              <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-[10px] leading-[12px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
