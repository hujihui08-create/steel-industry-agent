// ============================================================
// MessageCenterPage — 消息中心页面
// 展示通知消息列表，支持已读/未读状态区分
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Info,
  TrendingUp,
  FileText,
} from "lucide-react";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { EmptyState } from "@/app/components/shared/EmptyState";

import { getNotifications, markAsRead } from "@/app/api/notifications";
import type { Notification } from "@/app/types/notification";

// -----------------------------------------------------------
// Type icon mapping
// -----------------------------------------------------------

const TYPE_ICON: Record<Notification["type"], React.ReactNode> = {
  alert: (
    <Bell className="h-3.5 w-3.5 text-steel-warn" strokeWidth={2} />
  ),
  system: (
    <Info className="h-3.5 w-3.5 text-steel-ink" strokeWidth={2} />
  ),
  news: (
    <FileText className="h-3.5 w-3.5 text-steel-ink" strokeWidth={2} />
  ),
  price: (
    <TrendingUp className="h-3.5 w-3.5 text-steel-up" strokeWidth={2} />
  ),
};

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

/** YYYY-MM-DD HH:mm:ss → MM-DD HH:mm or as-is fallback */
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

// -----------------------------------------------------------
// MessageCenterPage
// -----------------------------------------------------------

export default function MessageCenterPage() {
  const navigate = useNavigate();

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    staleTime: 30_000,
  });

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------

  const handleMarkAsRead = async (item: Notification) => {
    if (item.is_read) return;
    try {
      await markAsRead(item.id);
      refetch();
    } catch {
      // Silently fail — visual update via refetch handles it
    }
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------

  const renderContent = () => {
    // Loading
    if (isLoading) {
      return (
        <div className="px-0 pt-0">
          <LoadingSkeleton variant="list" count={5} />
        </div>
      );
    }

    // Error
    if (isError) {
      return <ErrorState onRetry={() => refetch()} />;
    }

    // Empty
    if (!notifications || notifications.length === 0) {
      return (
        <EmptyState
          title="暂无消息"
        />
      );
    }

    // List
    return (
      <div className="divide-y divide-steel-line">
        {notifications.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleMarkAsRead(item)}
            className="w-full flex items-start gap-3 px-4 py-4 hover:bg-steel-surface transition-colors duration-150 text-left"
          >
            {/* Left: Type icon */}
            <div className="w-6 h-6 rounded-full bg-steel-surface flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
              {TYPE_ICON[item.type] ?? (
                <Bell className="h-3.5 w-3.5 text-steel-muted" strokeWidth={2} />
              )}
            </div>

            {/* Right: Content */}
            <div className="flex-1 min-w-0">
              {/* Title + unread dot */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[15px] leading-[1.6] truncate ${
                    item.is_read
                      ? "text-steel-ink font-normal"
                      : "text-steel-ink font-medium"
                  }`}
                >
                  {item.title}
                </span>
                {!item.is_read && (
                  <span className="h-2 w-2 rounded-full bg-steel-ink shrink-0" />
                )}
              </div>

              {/* Summary */}
              <p className="text-[13px] leading-[1.5] text-steel-muted mt-0.5 line-clamp-1">
                {item.summary}
              </p>

              {/* Time */}
              <p className="text-[12px] leading-[1.5] text-steel-placeholder mt-1">
                {formatTime(item.created_at)}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="消息中心"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1">{renderContent()}</div>
    </div>
  );
}
