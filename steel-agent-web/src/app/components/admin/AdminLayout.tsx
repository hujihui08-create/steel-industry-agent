import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "./AdminHeader";
import { TopNavBar } from "./TopNavBar";
import { AdminSidebar, SIDEBAR_MENU_MAP, TOP_MENU_TITLES } from "./AdminSidebar";
import type { SidebarMenuItem } from "./AdminSidebar";

// 侧边栏项 ID 到路径的映射，用于反向匹配当前路由
const SIDEBAR_PATH_TO_TOP_MENU: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/agent-config": "agent",
  "/admin/intent-management": "agent",
  "/admin/agent-debug": "agent",
  "/admin/bad-case": "quality",
  "/admin/knowledge-manage": "data",
  "/admin/vector-search-test": "data",
  "/admin/retrieval-config": "data",
  "/admin/crawler-manage": "data",
  "/admin/category-manage": "data",
  "/admin/mobile-users": "users",
  "/admin/admin-users": "users",
  "/admin/operation-logs": "system",
  "/admin/system-settings": "system",
  "/admin/data-backup": "system",
  "/admin/login-logs": "system",
  "/admin/api-stats": "system",
  "/admin/scheduled-tasks": "system",
  "/admin/menu-management": "system",
  "/admin/certifications": "system",
  "/admin/feedbacks": "system",
};

// 路径到侧边栏项 ID 的映射
const PATH_TO_SIDEBAR_ID: Record<string, string> = {
  "/admin": "overview",
  "/admin/agent-config": "agent-config",
  "/admin/intent-management": "intent-management",
  "/admin/agent-debug": "agent-debug",
  "/admin/bad-case": "bad-case",
  "/admin/knowledge-manage": "knowledge-manage",
  "/admin/vector-search-test": "vector-search-test",
  "/admin/retrieval-config": "retrieval-config",
  "/admin/crawler-manage": "crawler-manage",
  "/admin/category-manage": "category-manage",
  "/admin/mobile-users": "mobile-users",
  "/admin/admin-users": "admin-users",
  "/admin/operation-logs": "operation-logs",
  "/admin/system-settings": "system-settings",
  "/admin/data-backup": "data-backup",
  "/admin/login-logs": "login-logs",
  "/admin/api-stats": "api-stats",
  "/admin/scheduled-tasks": "scheduled-tasks",
  "/admin/menu-management": "menu-management",
  "/admin/certifications": "certification-manage",
  "/admin/feedbacks": "feedback-manage",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * 移动端抽屉中的菜单项组件
 */
function MobileMenuItem({
  item,
  isSelected,
  onClick,
}: {
  item: SidebarMenuItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full h-[44px] px-3",
        "rounded-md text-[14px] leading-[1.5]",
        "transition-colors duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
        isSelected
          ? "bg-[#FAFAFA] text-[#0A0A0A]"
          : "text-[#404040] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]",
      )}
      aria-current={isSelected ? "page" : undefined}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 根据当前路径确定选中的顶部菜单和侧边栏项
  const currentPath = location.pathname;
  const matchedTopMenu = SIDEBAR_PATH_TO_TOP_MENU[currentPath] ?? "dashboard";
  const matchedSidebarId = PATH_TO_SIDEBAR_ID[currentPath] ?? "overview";

  const [topNavSelected, setTopNavSelected] = useState(matchedTopMenu);
  const [sidebarSelectedId, setSidebarSelectedId] = useState(matchedSidebarId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 移动端状态: < 1024px 时进入移动模式
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const INACTIVITY_LIMIT = 30 * 60 * 1000;
  const COUNTDOWN_DURATION = 30;

  // === 响应式媒体查询 ===
  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1023px)");
    const collapsedQuery = window.matchMedia("(max-width: 1439px)");

    const handleChange = () => {
      const mobile = mobileQuery.matches;
      setIsMobile(mobile);
      if (mobile) {
        // 进入移动模式，关闭抽屉
        setMobileDrawerOpen(false);
      } else {
        // 退出移动模式，按 1439px 断点控制侧边栏折叠
        setSidebarCollapsed(collapsedQuery.matches);
      }
    };

    // 初始化
    handleChange();

    mobileQuery.addEventListener("change", handleChange);
    collapsedQuery.addEventListener("change", handleChange);

    return () => {
      mobileQuery.removeEventListener("change", handleChange);
      collapsedQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // 路由变化时同步选中状态
  useEffect(() => {
    const topMenu = SIDEBAR_PATH_TO_TOP_MENU[currentPath];
    if (topMenu) {
      setTopNavSelected(topMenu);
    }
    const sidebarId = PATH_TO_SIDEBAR_ID[currentPath];
    if (sidebarId) {
      setSidebarSelectedId(sidebarId);
    }
  }, [currentPath]);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowTimeoutModal(false);
    setCountdown(COUNTDOWN_DURATION);

    timeoutRef.current = setTimeout(() => {
      setShowTimeoutModal(true);
      let remaining = COUNTDOWN_DURATION;
      countdownRef.current = setInterval(() => {
        remaining--;
        setCountdown(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          localStorage.removeItem("auth-storage");
          window.location.href = "/admin/login";
        }
      }, 1000);
    }, INACTIVITY_LIMIT);
  }, []);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimeout));
    resetTimeout();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimeout));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetTimeout]);

  const handleTopNavSelect = useCallback(
    (id: string) => {
      setTopNavSelected(id);
      // 切换顶部导航时跳转到该分类的第一个子菜单
      const defaultPaths: Record<string, string> = {
        dashboard: "/admin",
        agent: "/admin/agent-config",
        quality: "/admin/bad-case",
        data: "/admin/knowledge-manage",
        users: "/admin/mobile-users",
        system: "/admin/operation-logs",
      };
      const targetPath = defaultPaths[id] ?? "/admin";
      const targetSidebarId = PATH_TO_SIDEBAR_ID[targetPath] ?? "overview";
      setSidebarSelectedId(targetSidebarId);
      navigate(targetPath);
    },
    [navigate],
  );

  const handleSidebarSelect = useCallback(
    (id: string, path: string) => {
      setSidebarSelectedId(id);
      navigate(path);
    },
    [navigate],
  );

  const handleToggleSidebar = useCallback(() => {
    if (isMobile) {
      // 移动端：打开/关闭抽屉
      setMobileDrawerOpen((prev) => !prev);
    } else {
      // 桌面端：切换侧边栏折叠/展开
      setSidebarCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  // 移动端抽屉内点击菜单项
  const handleMobileMenuItemClick = useCallback(
    (item: SidebarMenuItem) => {
      setSidebarSelectedId(item.id);
      // 同步更新顶部导航分类
      const topMenuId =
        Object.entries(SIDEBAR_MENU_MAP).find(([, items]) =>
          items.some((i) => i.id === item.id),
        )?.[0] ?? "dashboard";
      setTopNavSelected(topMenuId);
      navigate(item.path);
      setMobileDrawerOpen(false);
    },
    [navigate],
  );

  // 内容区域布局类名
  const contentClassName = cn(
    "overflow-y-auto transition-[margin] duration-200 ease-out",
    // 移动端：仅 header 高度
    isMobile ? "h-screen pt-[56px]" : "h-screen pt-[104px]",
    // 侧边栏左边距
    isMobile
      ? ""
      : sidebarCollapsed
        ? "ml-[64px]"
        : "ml-[200px]",
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* 固定头部 —— Menu 按钮在移动端打开抽屉 */}
      <AdminHeader
        onToggleSidebar={handleToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* 固定顶部导航 —— 移动端隐藏 */}
      <TopNavBar
        selected={topNavSelected}
        onSelect={handleTopNavSelect}
        visible={!isMobile}
      />

      {/* 固定侧边栏 —— 移动端隐藏（导航内容进抽屉） */}
      {!isMobile && (
        <AdminSidebar
          topMenuId={topNavSelected}
          selectedId={sidebarSelectedId}
          onSelect={handleSidebarSelect}
          collapsed={sidebarCollapsed}
        />
      )}

      {/* 移动端导航抽屉 */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          side="left"
          hideClose
          className={cn(
            "!w-[280px] sm:!max-w-[280px]",
            "p-0 border-r border-[#E5E5E5]",
            "bg-white shadow-none",
            "flex flex-col",
          )}
        >
          <SheetTitle className="sr-only">导航菜单</SheetTitle>

          {/* 抽屉头部 Logo */}
          <div className="flex items-center justify-between shrink-0 px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-4 h-4 rounded-sm bg-[#0A0A0A]",
                  "flex items-center justify-center",
                )}
              >
                <span className="text-[8px] font-bold text-white">钢</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[13px] font-medium text-[#0A0A0A]">
                  钢铁Agent
                </span>
                <span className="text-[11px] leading-[1.5] text-[#737373]">
                  管理后台
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(false)}
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-md",
                "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              )}
              aria-label="关闭导航"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>

          {/* 分隔线 */}
          <div className="mx-4 border-t border-[#E5E5E5]" />

          {/* 导航菜单项（所有分类） */}
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {Object.entries(SIDEBAR_MENU_MAP).map(([menuId, items]) => {
              if (items.length === 0) return null;
              const title = TOP_MENU_TITLES[menuId] ?? menuId;
              return (
                <div key={menuId} className="mb-4">
                  {/* 分类标题 */}
                  <div className="px-3 pb-2">
                    <span className="text-[12px] leading-[1.5] text-[#737373]">
                      {title}
                    </span>
                  </div>
                  {/* 分类下的菜单项 */}
                  {items.map((item) => (
                    <MobileMenuItem
                      key={item.id}
                      item={item}
                      isSelected={sidebarSelectedId === item.id}
                      onClick={() => handleMobileMenuItemClick(item)}
                    />
                  ))}
                </div>
              );
            })}
          </nav>

          {/* 底部分隔线 */}
          <div className="mx-4 border-t border-[#E5E5E5]" />

          {/* 底部版本号 */}
          <div className="shrink-0 px-4 py-3">
            <span className="text-[11px] leading-[1.5] text-[#A3A3A3]">V1.0</span>
          </div>
        </SheetContent>
      </Sheet>

      {/* 主内容区域 */}
      <main className={contentClassName}>
        <div className="p-6">{children}</div>
      </main>

      {showTimeoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 max-w-sm mx-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <h3 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A] mb-2">
              会话即将过期
            </h3>
            <p className="text-[14px] text-[#404040] mb-6">
              您已 {Math.floor(INACTIVITY_LIMIT / 60000)} 分钟无操作，{countdown} 秒后将自动退出登录。
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("auth-storage");
                  window.location.href = "/admin/login";
                }}
                className="border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA] rounded-full h-10 px-5 text-[14px]"
              >
                立即退出
              </Button>
              <Button
                onClick={resetTimeout}
                className="bg-[#0A0A0A] text-white hover:bg-[#404040] rounded-full h-10 px-5 text-[14px]"
              >
                继续使用
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
