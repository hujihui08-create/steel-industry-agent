import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Bell,
  ChevronDown,
  User,
  KeyRound,
  LogOut,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAdminNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from "@/app/api/admin";
import { adminGetInfo } from "@/app/api/admin-auth";

interface AdminNotification {
  id: number;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;

  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function AdminHeader({
  onToggleSidebar,
  sidebarCollapsed,
}: AdminHeaderProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminInfo, setAdminInfo] = useState<{ username: string; nickname: string } | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    loadAdminInfo();
  }, []);

  async function loadNotifications() {
    try {
      const res = await getAdminNotifications({ page: 1, page_size: 10 });
      setNotifications(res.items || []);
    } catch { /* ignore */ }
  }

  async function loadUnreadCount() {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.count || 0);
    } catch { /* ignore */ }
  }

  async function loadAdminInfo() {
    try {
      const info = await adminGetInfo();
      setAdminInfo({ username: info.username, nickname: info.nickname });
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("全部已读");
    } catch { /* ignore */ }
  }

  async function handleMarkRead(id: number) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }

  const handleLogout = () => {
    navigate("/admin/login");
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "h-[56px]",
        "bg-white border-b border-[#E5E5E5]",
        "flex items-center justify-between",
        "px-4",
      )}
    >
      {/* 左侧：Logo 区域 */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={cn(
              "flex items-center justify-center",
              "w-9 h-9 rounded-md",
              "text-[#404040] hover:bg-[#FAFAFA]",
              "transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
            aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
        )}
        <button
          onClick={() => navigate("/admin")}
          className={cn(
            "flex items-center gap-2",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 rounded-sm",
          )}
        >
          <Building2
            size={20}
            strokeWidth={1.75}
            className="text-[#0A0A0A]"
          />
          <span className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A]">
            钢铁Agent管理后台
          </span>
        </button>
      </div>

      {/* 右侧：通知 & 用户 */}
      <div className="flex items-center gap-2">
        {/* 通知 Bell */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "relative flex items-center justify-center",
                "w-9 h-9 rounded-md",
                "text-[#404040] hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              )}
              aria-label={`通知，${unreadCount} 条未读`}
            >
              <Bell size={18} strokeWidth={1.75} />
              {unreadCount > 0 && (
                <Badge
                  className={cn(
                    "absolute -top-1 -right-1",
                    "min-w-[18px] h-[18px] px-1",
                    "flex items-center justify-center",
                    "text-[11px] leading-none",
                    "bg-[#0A0A0A] text-white border-none",
                    "rounded-full",
                  )}
                >
                  {unreadCount}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className={cn(
              "w-[320px] p-0",
              "bg-white border border-[#E5E5E5] rounded-lg",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
              <span className="text-[14px] font-medium text-[#0A0A0A]">
                通知
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className={cn(
                    "text-[12px] text-[#737373] hover:text-[#0A0A0A]",
                    "transition-colors duration-150",
                  )}
                >
                  全部已读
                </button>
              )}
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.is_read) handleMarkRead(notif.id);
                  }}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3",
                    "border-b border-[#E5E5E5] last:border-b-0",
                    "hover:bg-[#FAFAFA] cursor-pointer",
                    "transition-colors duration-150",
                    !notif.is_read && "bg-[#FAFAFA]",
                  )}
                >
                  {!notif.is_read && (
                    <span
                      className="mt-[6px] block w-[6px] h-[6px] rounded-full bg-[#0A0A0A] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {notif.is_read && <div className="w-[6px] shrink-0" aria-hidden="true" />}
                  <div className="flex-1">
                    <p className="text-[13px] leading-[1.5] text-[#404040]">
                      {notif.title}
                    </p>
                    <p className="text-[11px] leading-[1.5] text-[#A3A3A3] mt-1">
                      {formatRelativeTime(notif.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 管理员下拉菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2",
                "h-9 px-2 rounded-md",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              )}
            >
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-[11px] bg-[#0A0A0A] text-white">
                  {(adminInfo?.nickname || "管").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[13px] text-[#404040]">
                {adminInfo?.nickname || adminInfo?.username || "管理员"}
              </span>
              <ChevronDown size={14} strokeWidth={1.75} className="text-[#A3A3A3]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(
              "w-[160px]",
              "bg-white border border-[#E5E5E5] rounded-lg",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            )}
          >
            <DropdownMenuItem
              onClick={() => navigate("/admin/profile")}
              className="text-[13px] text-[#404040] cursor-pointer"
            >
              <User size={14} strokeWidth={1.75} className="text-[#737373]" />
              个人信息
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/admin/change-password")}
              className="text-[13px] text-[#404040] cursor-pointer"
            >
              <KeyRound size={14} strokeWidth={1.75} className="text-[#737373]" />
              修改密码
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#E5E5E5]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[13px] text-[#B42318] cursor-pointer"
            >
              <LogOut size={14} strokeWidth={1.75} className="text-[#B42318]" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
