// ============================================================
// WorkbenchLayout — 智能工作台布局框架
// 三栏布局: Sidebar(200px) + Center(flex:1) + RightPanel(260px, 可收起)
// Desktop: Sidebar 常驻 (hidden lg:flex w-[200px])
// Mobile: Sheet 侧边抽屉替代 Sidebar
// ============================================================

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Menu } from "lucide-react";
import { WorkbenchNav, type WorkbenchNavId } from "./WorkbenchNav";
import { WorkbenchRightPanel } from "./WorkbenchRightPanel";

interface WorkbenchLayoutProps {
  /** Currently active nav item */
  activeNav: WorkbenchNavId;
  /** Navigation handler */
  onNavigate: (id: WorkbenchNavId) => void;
  /** Main content area */
  children: ReactNode;
  /** Optional right panel content */
  rightPanelContent?: ReactNode;
  /** Page title shown in mobile header */
  pageTitle?: string;
}

export function WorkbenchLayout({
  activeNav,
  onNavigate,
  children,
  rightPanelContent,
  pageTitle = "智能工作台",
}: WorkbenchLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-muted/30 flex w-full font-sans text-foreground overflow-hidden">
        {/* ==========================================================
            Mobile Sidebar Overlay
            ========================================================== */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* ==========================================================
            Desktop Sidebar (lg+)
            Mobile: Sheet component
            ========================================================== */}

        {/* Desktop Sidebar */}
        <aside
          className="hidden lg:flex w-[200px] shrink-0 border-r border-border bg-card flex-col"
          aria-label="工作台侧边栏"
        >
          {/* Logo Area */}
          <div className="h-14 px-6 border-b border-border flex items-center gap-3 shrink-0">
            <div
              className="size-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground"
              aria-hidden="true"
            >
              <span className="text-[14px] font-semibold">S</span>
            </div>
            <span className="font-medium text-[15px] leading-[20px] tracking-tight">
              智能工作台
            </span>
          </div>

          {/* Navigation */}
          <WorkbenchNav activeId={activeNav} onNavigate={onNavigate} />
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[200px] p-0">
            <aside className="h-full bg-card flex flex-col" aria-label="工作台侧边栏">
              <div className="h-14 px-6 border-b border-border flex items-center gap-3 shrink-0">
                <div
                  className="size-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground"
                  aria-hidden="true"
                >
                  <span className="text-[14px] font-semibold">S</span>
                </div>
                <span className="font-medium text-[15px] leading-[20px] tracking-tight">
                  智能工作台
                </span>
              </div>
              <WorkbenchNav
                activeId={activeNav}
                onNavigate={(id) => {
                  onNavigate(id);
                  setSidebarOpen(false);
                }}
              />
            </aside>
          </SheetContent>
        </Sheet>

        {/* ==========================================================
            Main Content Area (Header + Center + RightPanel)
            ========================================================== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 bg-card border-b border-border flex items-center px-6 shrink-0 gap-3">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0 -ml-3"
              onClick={() => setSidebarOpen(true)}
              aria-label="打开菜单"
            >
              <Menu className="size-5" strokeWidth={2} />
            </Button>
            <h1 className="text-[15px] leading-[20px] font-medium">
              {pageTitle}
            </h1>
          </header>

          {/* Content Row: Center + RightPanel */}
          <div className="flex-1 flex min-h-0">
            {/* Center Content */}
            <main className="flex-1 min-w-0 overflow-auto" role="main">
              <div className="p-6 lg:p-8">{children}</div>
            </main>

            {/* Right Panel (collapsible via motion) */}
            <WorkbenchRightPanel
              isOpen={rightPanelOpen}
              onToggle={() => setRightPanelOpen((prev) => !prev)}
            >
              {rightPanelContent}
            </WorkbenchRightPanel>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
