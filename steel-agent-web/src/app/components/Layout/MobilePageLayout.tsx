// ============================================================
// MobilePageLayout — 移动端页面布局包装器
//
// Desktop (>=768px): 直接渲染 children，不做额外包装
// Mobile (<768px):   固定顶部标题栏 + 可滚动内容区 + 底部安全区
// ============================================================

import { type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useIsMobile } from "@/components/ui/use-mobile";
import { cn } from "@/lib/utils";

interface MobilePageLayoutProps {
  /** 页面标题，显示在顶部标题栏 */
  title: string;
  /** 可选的返回导航回调 */
  onBack?: () => void;
  /** 页面内容 */
  children: ReactNode;
  /** 是否显示返回按钮，默认开启 */
  showBack?: boolean;
}

export function MobilePageLayout({
  title,
  onBack,
  children,
  showBack = true,
}: MobilePageLayoutProps) {
  const isMobile = useIsMobile();

  // ----------------------------------------------------------
  // Desktop: 直接透传 children，桌面端自行管理布局
  // ----------------------------------------------------------
  if (!isMobile) {
    return <>{children}</>;
  }

  // ----------------------------------------------------------
  // Mobile: 固定标题栏 + 内容区
  // ----------------------------------------------------------
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ============================================
          固定顶部标题栏 h-12
          ============================================ */}
      <header
        className={cn(
          "sticky top-0 z-30 shrink-0",
          "h-12",
          "bg-card",
          "border-b border-border",
          "flex items-center",
          "px-4"
        )}
      >
        {/* 返回按钮 */}
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "shrink-0 -ml-2 mr-2",
              "size-9 flex items-center justify-center rounded-md",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted/50",
              "active:scale-95",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="返回"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </button>
        )}

        {/* 页面标题 */}
        <h1
          className={cn(
            "text-[15px] leading-[20px] font-medium text-foreground truncate",
            showBack && onBack ? "flex-1 text-center" : ""
          )}
        >
          {title}
        </h1>

        {/* 右侧占位，与左侧返回按钮对称，保证标题居中 */}
        {showBack && onBack && (
          <div className="size-9 shrink-0" aria-hidden="true" />
        )}
      </header>

      {/* ============================================
          内容区：可滚动 + 水平内边距 + 底部安全区
          ============================================ */}
      <main className="flex-1 overflow-auto px-4 py-4 pb-24" role="main">
        {children}
      </main>
    </div>
  );
}
