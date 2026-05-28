// ============================================================
// ChatSidebar - 对话侧栏
// 桌面端：固定 240px 左侧栏，border-r 分隔
// 移动端：Sheet 抽屉从左侧滑入
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  X,
  BarChart3,
  FileText,
  Target,
  Bell,
  Star,
  Settings,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/components/ui/use-mobile";
import type { ChatSession } from "@/app/types/chat";
import { ROUTE } from "@/app/constants/auth";
import { useAuthStore } from "@/app/stores/authStore";
import { useLoginDialogStore } from "@/app/stores/loginDialogStore";
import { useSettingsStore } from "@/app/stores/settingsStore";

// ==================================================================
// Props
// ==================================================================
export interface ChatSidebarProps {
  /** 所有会话列表 */
  sessions: ChatSession[];
  /** 当前选中的会话 ID */
  currentSessionId: number | null;
  /** 选中会话回调 */
  onSelectSession: (sessionId: number) => void;
  /** 新建会话回调 */
  onNewSession: () => void;
  /** 删除会话回调 */
  onDeleteSession: (sessionId: number) => void;
  /** 移动端 Sheet 是否打开 */
  isOpen: boolean;
  /** 切换移动端 Sheet 开关 */
  onToggle: () => void;
}

// ==================================================================
// 相对时间格式化
// ==================================================================

/** 将 ISO 时间戳格式化为中文相对时间 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return "刚刚";
  if (diffHours < 24) return "今天";
  if (diffHours < 48) return "昨天";

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}天前`;

  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

// ==================================================================
// ChatSidebar
// ==================================================================
export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  // ---- responsive -------------------------------------------
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // ---- auth --------------------------------------------------
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginDialog = useLoginDialogStore((s) => s.openLoginDialog);

  // ---- site config (public branding) --------------------------
  const siteConfig = useSettingsStore((s) => s.siteConfig);

  const requireAuth = useCallback(
    (fn: () => void) => {
      if (!isAuthenticated) {
        openLoginDialog();
        return;
      }
      fn();
    },
    [isAuthenticated, openLoginDialog],
  );

  // ---- local state ------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- derived data -----------------------------------------
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  // ==============================================================
  // Handlers
  // ==============================================================

  const handleSelectSession = useCallback(
    (sessionId: number) => {
      requireAuth(() => {
        onSelectSession(sessionId);
        if (isMobile) onToggle();
      });
    },
    [onSelectSession, isMobile, onToggle, requireAuth],
  );

  const handleNewSession = useCallback(() => {
    requireAuth(() => {
      onNewSession();
      if (isMobile) onToggle();
    });
  }, [onNewSession, isMobile, onToggle, requireAuth]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const sessionTitle = deleteTarget.title;
    try {
      await onDeleteSession(deleteTarget.id);
      toast.success(`已删除「${sessionTitle}」`);
    } catch {
      toast.error("删除失败，请稍后重试");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDeleteSession]);

  // ---- long press (mobile) -----------------------------------
  const handleTouchStart = useCallback((session: ChatSession) => {
    longPressTimer.current = setTimeout(() => {
      requireAuth(() => {
        setDeleteTarget(session);
      });
    }, 500);
  }, [requireAuth]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  // ==============================================================
  // Shared sidebar content (used by both desktop & mobile)
  // ==============================================================
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ============================================================
          Brand Header — 品牌 Logo + 标题
          ============================================================ */}
      <div className="flex items-center gap-2 px-3 py-[11px] border-b border-steel-line shrink-0">
        {siteConfig?.logoUrl ? (
          <img
            src={siteConfig.logoUrl}
            alt={siteConfig.siteName || "品牌 Logo"}
            className="w-7 h-7 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-steel-ink flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-steel-canvas" strokeWidth={2} />
          </div>
        )}
        <span className="text-[15px] leading-[1.5] text-steel-ink font-medium">
          {siteConfig?.siteName || "钢铁助手"}
        </span>
      </div>

      {/* ============================================================
          Not Authenticated State
          ============================================================ */}
      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-steel-surface flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6 text-steel-placeholder" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[15px] leading-[1.6] text-steel-ink font-medium mb-1">
                请登录以使用完整功能
              </p>
              <p className="text-[13px] leading-[1.5] text-steel-muted">
                登录后可以保存对话历史和所有功能
              </p>
            </div>
            <button
              onClick={openLoginDialog}
              className="w-full h-8 bg-steel-ink text-steel-canvas rounded-full flex items-center justify-center gap-1.5 text-[13px] leading-[1.5] font-medium hover:bg-steel-body active:scale-[0.97] transition-colors duration-150"
            >
              立即登录
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ============================================================
              Search Input
              ============================================================ */}
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="flex items-center gap-2 border border-steel-line rounded-[10px] px-2.5 py-[6px]">
              <Search className="h-3.5 w-3.5 text-steel-placeholder shrink-0" strokeWidth={1.75} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索会话"
                className="flex-1 bg-transparent border-0 outline-none text-[11px] leading-[1.5] text-steel-ink placeholder:text-steel-placeholder"
                aria-label="搜索会话"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 w-4 h-4 flex items-center justify-center hover:bg-steel-surface rounded"
                  aria-label="清除搜索"
                >
                  <X className="h-3 w-3 text-steel-placeholder" strokeWidth={1.75} />
                </button>
              ) : (
                <span className="text-[10px] text-steel-placeholder shrink-0 font-mono">⌘K</span>
              )}
            </div>
          </div>

          {/* ============================================================
              Session List
              ============================================================ */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-2 flex flex-col gap-0.5" role="listbox" aria-label="会话列表">
              {filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 select-none">
                  <MessageSquare
                    className="h-7 w-7 text-steel-placeholder mb-2"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <p className="text-[12px] leading-[1.5] text-steel-muted">
                    {searchQuery ? "未找到匹配的会话" : "暂无对话记录"}
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isActive = currentSessionId === session.id;
                  const timeLabel = formatRelativeTime(
                    session.updated_at || session.created_at,
                  );

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      onTouchStart={() => handleTouchStart(session)}
                      onTouchEnd={handleTouchCancel}
                      onTouchMove={handleTouchCancel}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        requireAuth(() => {
                          setDeleteTarget(session);
                        });
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer select-none group",
                        "transition-colors duration-150",
                        isActive ? "bg-steel-surface" : "hover:bg-steel-surface",
                      )}
                      role="option"
                      tabIndex={0}
                      aria-selected={isActive}
                      aria-current={isActive ? "true" : undefined}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectSession(session.id);
                        }
                      }}
                    >
                      <MessageSquare
                        className={cn(
                          "size-3 shrink-0",
                          isActive ? "text-steel-ink" : "text-steel-placeholder",
                        )}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />

                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "block text-[12px] leading-[1.5] truncate",
                          isActive ? "text-steel-ink" : "text-steel-body",
                        )}>
                          {session.title}
                        </span>
                      </div>

                      <span className="text-[10px] leading-[1.5] text-steel-placeholder shrink-0">
                        {timeLabel}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requireAuth(() => {
                            setDeleteTarget(session);
                          });
                        }}
                        className={cn(
                          "h-5 w-5 flex items-center justify-center rounded shrink-0",
                          "opacity-0 group-hover:opacity-100",
                          "hover:bg-steel-line",
                          "transition-opacity duration-150",
                        )}
                        aria-label={`删除会话: ${session.title}`}
                      >
                        <Trash2 className="h-3 w-3 text-steel-muted hover:text-steel-down" strokeWidth={1.75} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* ============================================================
              New Session Button — 移至会话列表下方
              ============================================================ */}
          <div className="px-3 py-3 shrink-0">
            <button
              onClick={handleNewSession}
              className={cn(
                "w-full h-[30px] bg-steel-ink text-steel-canvas rounded-full",
                "flex items-center justify-center gap-1.5",
                "text-[12px] leading-[1.5] font-medium",
                "hover:bg-steel-body active:scale-[0.97]",
                "transition-colors duration-150",
              )}
              aria-label="新建对话"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              新会话
            </button>
          </div>

          {/* ============================================================
              Management Menu
              ============================================================ */}
          <div className="border-t border-steel-line py-1.5 px-1.5 shrink-0" role="navigation" aria-label="管理功能">
            <p className="px-3 py-1.5 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-placeholder select-none">
              管理功能
            </p>

            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (isMobile) onToggle();
                navigate(ROUTE.PRICE_BOARD);
              })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-steel-surface transition-colors duration-150 text-left"
              aria-label="价格看板"
            >
              <BarChart3 className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] leading-[1.5] text-steel-ink">价格看板</span>
            </button>

            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (isMobile) onToggle();
                navigate(ROUTE.QUOTATIONS);
              })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-steel-surface transition-colors duration-150 text-left"
              aria-label="我的报价单"
            >
              <FileText className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] leading-[1.5] text-steel-ink">我的报价单</span>
            </button>

            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (isMobile) onToggle();
                navigate(ROUTE.TENDERS);
              })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-steel-surface transition-colors duration-150 text-left"
              aria-label="招投标管理"
            >
              <Target className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] leading-[1.5] text-steel-ink">招投标管理</span>
            </button>

            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (isMobile) onToggle();
                navigate(ROUTE.ALERTS);
              })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-steel-surface transition-colors duration-150 text-left"
              aria-label="价格预警"
            >
              <Bell className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] leading-[1.5] text-steel-ink">价格预警</span>
            </button>

            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (isMobile) onToggle();
                navigate(ROUTE.FAVORITES);
              })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-steel-surface transition-colors duration-150 text-left"
              aria-label="我的收藏"
            >
              <Star className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] leading-[1.5] text-steel-ink">我的收藏</span>
            </button>

            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (isMobile) onToggle();
                navigate(ROUTE.SETTINGS);
              })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-steel-surface transition-colors duration-150 text-left"
              aria-label="设置"
            >
              <Settings className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] leading-[1.5] text-steel-ink">设置</span>
            </button>

            <button
              type="button"
              onClick={() => requireAuth(() => {
                if (isMobile) onToggle();
                navigate(ROUTE.HELP);
              })}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-steel-surface transition-colors duration-150 text-left"
              aria-label="帮助与反馈"
            >
              <HelpCircle className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
              <span className="text-[13px] leading-[1.5] text-steel-ink">帮助与反馈</span>
            </button>
          </div>
        </>
      )}

      {/* ============================================================
          Delete Confirmation Dialog
          ============================================================ */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl border-steel-line p-6 max-w-[360px] !shadow-none">
          <DialogHeader>
            <DialogTitle className="text-[18px] leading-[1.4] font-medium text-steel-ink">
              确认删除
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-[1.6] text-steel-muted">
              将删除会话「{deleteTarget?.title ?? ""}」及其所有消息，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 justify-end mt-4">
            <button
              onClick={() => setDeleteTarget(null)}
              className={cn(
                "h-9 px-4 rounded-full border border-steel-line",
                "text-[15px] text-steel-ink",
                "hover:bg-steel-surface",
                "transition-colors duration-150",
              )}
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className={cn(
                "h-9 px-4 rounded-full bg-steel-down text-steel-canvas",
                "text-[15px]",
                "hover:bg-red-800",
                "transition-colors duration-150 active:scale-[0.97]",
              )}
            >
              删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // ==============================================================
  // Mobile: Sheet slide-in drawer
  // ==============================================================
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent
          side="left"
          hideClose
          className="w-[240px] max-w-[240px] p-0 border-r border-steel-line !shadow-none"
        >
          <SheetHeader className="px-3 pt-4 pb-0">
            <SheetTitle className="sr-only">会话列表</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // ==============================================================
  // ---- Desktop: Fixed 240px sidebar
  // ==============================================================
  return (
    <div className="flex flex-col h-full w-[240px] border-r border-steel-line bg-steel-canvas flex-shrink-0" role="navigation" aria-label="侧边导航栏">
      {sidebarContent}
    </div>
  );
}