// ============================================================
// WorkbenchRightPanel — 工作台右侧面板
// 包含 AgentChatPanel + NotificationCenter
// 可折叠，通过 PanelRightClose/Open 切换
// ============================================================

import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen, Bell } from "lucide-react";
import type { ReactNode } from "react";

interface WorkbenchRightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

export function WorkbenchRightPanel({
  isOpen,
  onToggle,
  children,
}: WorkbenchRightPanelProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            className="border-l border-border bg-card overflow-hidden shrink-0"
            aria-label="右侧面板"
          >
            <div className="w-[260px] h-full flex flex-col">
              {/* Panel Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-[13px] leading-[18px] font-medium text-foreground">
                  助手面板
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={onToggle}
                  aria-label="关闭右侧面板"
                >
                  <PanelRightClose className="size-4" strokeWidth={2} />
                </Button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto">
                {children || (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <Bell className="size-8 text-muted-foreground/40 mb-3" strokeWidth={2} aria-hidden="true" />
                    <p className="text-[13px] leading-[18px] text-muted-foreground">
                      右侧面板内容将在此显示
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Collapsed panel toggle button */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 self-start mt-4 ml-2"
          onClick={onToggle}
          aria-label="打开右侧面板"
        >
          <PanelRightOpen className="size-4" strokeWidth={2} />
        </Button>
      )}
    </>
  );
}
