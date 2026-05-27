import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  SlidersHorizontal,
  GitBranch,
  FileCog,
  Bug,
  Smartphone,
  Shield,
  Key,
  FileText,
  Settings,
  Database,
  BookOpen,
  Search,
  Sliders,
  Globe,
  Tag,
  LogIn,
  BarChart3,
  Clock,
  Menu,
  MessageSquare,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

// 按顶部导航分类的侧边栏菜单项映射
export const SIDEBAR_MENU_MAP: Record<string, SidebarMenuItem[]> = {
  dashboard: [
    { id: "overview", label: "概览", icon: LayoutDashboard, path: "/admin" },
  ],
  agent: [
    {
      id: "agent-config",
      label: "Agent配置",
      icon: SlidersHorizontal,
      path: "/admin/agent-config",
    },
    {
      id: "intent-management",
      label: "意图管理",
      icon: GitBranch,
      path: "/admin/intent-management",
    },
    {
      id: "entity-config",
      label: "实体配置",
      icon: FileCog,
      path: "/admin/entity-config",
    },
    {
      id: "agent-debug",
      label: "Agent调试工具",
      icon: Bug,
      path: "/admin/agent-debug",
    },
  ],
  quality: [
    {
      id: "bad-case",
      label: "Bad Case管理",
      icon: Bug,
      path: "/admin/bad-case",
    },
  ],
  data: [
    {
      id: "crawler-manage",
      label: "爬虫管理",
      icon: Globe,
      path: "/admin/crawler-manage",
    },
    {
      id: "knowledge-manage",
      label: "知识库管理",
      icon: BookOpen,
      path: "/admin/knowledge-manage",
    },
    {
      id: "vector-search-test",
      label: "向量检索测试",
      icon: Search,
      path: "/admin/vector-search-test",
    },
    {
      id: "retrieval-config",
      label: "检索配置",
      icon: Sliders,
      path: "/admin/retrieval-config",
    },
    {
      id: "category-manage",
      label: "品种管理",
      icon: Tag,
      path: "/admin/category-manage",
    },
  ],
  users: [
    {
      id: "mobile-users",
      label: "移动端用户",
      icon: Smartphone,
      path: "/admin/mobile-users",
    },
    {
      id: "admin-users",
      label: "后台用户",
      icon: Shield,
      path: "/admin/admin-users",
    },
    {
      id: "role-permission",
      label: "角色与权限",
      icon: Key,
      path: "/admin/role-permission",
    },
  ],
  system: [
    {
      id: "operation-logs",
      label: "操作日志",
      icon: FileText,
      path: "/admin/operation-logs",
    },
    {
      id: "system-settings",
      label: "系统设置",
      icon: Settings,
      path: "/admin/system-settings",
    },
    {
      id: "data-backup",
      label: "数据备份",
      icon: Database,
      path: "/admin/data-backup",
    },
    {
      id: "login-logs",
      label: "登录日志",
      icon: LogIn,
      path: "/admin/login-logs",
    },
    {
      id: "api-stats",
      label: "API统计",
      icon: BarChart3,
      path: "/admin/api-stats",
    },
    {
      id: "scheduled-tasks",
      label: "定时任务",
      icon: Clock,
      path: "/admin/scheduled-tasks",
    },
    {
      id: "menu-management",
      label: "菜单管理",
      icon: Menu,
      path: "/admin/menu-management",
    },
    {
      id: "certification-manage",
      label: "企业认证审核",
      icon: ShieldCheck,
      path: "/admin/certifications",
    },
    {
      id: "feedback-manage",
      label: "用户反馈",
      icon: MessageSquare,
      path: "/admin/feedbacks",
    },
  ],
};

// 顶部菜单对应的中文标题
export const TOP_MENU_TITLES: Record<string, string> = {
  dashboard: "首页",
  agent: "Agent管理",
  quality: "质量管理",
  data: "数据管理",
  users: "用户管理",
  system: "系统管理",
};

interface AdminSidebarProps {
  topMenuId: string;
  selectedId: string;
  onSelect: (id: string, path: string) => void;
  collapsed: boolean;
}

export function AdminSidebar({
  topMenuId,
  selectedId,
  onSelect,
  collapsed,
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const menuItems = SIDEBAR_MENU_MAP[topMenuId] ?? [];
  const topMenuTitle = TOP_MENU_TITLES[topMenuId] ?? "";

  const handleItemClick = (item: SidebarMenuItem) => {
    onSelect(item.id, item.path);
    navigate(item.path);
  };

  // 折叠状态：仅显示图标 + Tooltip
  if (collapsed) {
    return (
      <aside
        className={cn(
          "fixed top-[104px] left-0 bottom-0 z-30",
          "w-[64px]",
          "bg-white border-r border-[#E5E5E5]",
          "flex flex-col items-center py-4",
        )}
        aria-label="侧边导航（折叠）"
      >
        {menuItems.map((item) => {
          const isSelected = selectedId === item.id;
          const Icon = item.icon;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "relative flex items-center justify-center",
                    "w-10 h-10 rounded-md my-[2px]",
                    "transition-colors duration-150",
                    "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    isSelected
                      ? "bg-[#FAFAFA] text-[#0A0A0A]"
                      : "text-[#737373] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]",
                  )}
                  aria-label={item.label}
                  aria-current={isSelected ? "page" : undefined}
                >
                  {isSelected && (
                    <span
                      className="absolute left-0 top-[6px] bottom-[6px] w-[4px] bg-[#0A0A0A] rounded-r-sm"
                      aria-hidden="true"
                    />
                  )}
                  <Icon size={18} strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className={cn(
                  "bg-[#0A0A0A] text-white text-[12px]",
                  "px-2.5 py-1 rounded-md",
                  "border-none",
                )}
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </aside>
    );
  }

  // 展开状态：完整侧边栏
  return (
    <aside
      className={cn(
        "fixed top-[104px] left-0 bottom-0 z-30",
        "w-[200px]",
        "bg-white border-r border-[#E5E5E5]",
        "flex flex-col",
      )}
      aria-label="侧边导航"
    >
      {/* 顶部 Logo 区域 */}
      <div className="px-4 pt-4 pb-3">
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
      </div>

      {/* 分隔线 */}
      <div className="mx-4 border-t border-[#E5E5E5]" />

      {/* 分类标题 */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-[12px] leading-[1.5] text-[#737373]">
          {topMenuTitle}
        </span>
      </div>

      {/* 菜单项 */}
      <nav className="flex-1 overflow-y-auto px-2">
        {menuItems.map((item) => {
          const isSelected = selectedId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "relative flex items-center gap-3",
                "w-full h-[40px] px-[14px] mb-[2px]",
                "rounded-md text-[14px] leading-[1.5]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                isSelected
                  ? "bg-[#FAFAFA] text-[#0A0A0A]"
                  : "text-[#404040] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]",
              )}
              aria-current={isSelected ? "page" : undefined}
            >
              {isSelected && (
                <span
                  className="absolute left-0 top-[6px] bottom-[6px] w-[4px] bg-[#0A0A0A] rounded-r-sm"
                  aria-hidden="true"
                />
              )}
              <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 底部分隔线 */}
      <div className="mx-4 border-t border-[#E5E5E5]" />

      {/* 底部版本号 */}
      <div className="px-4 py-3">
        <span className="text-[11px] leading-[1.5] text-[#A3A3A3]">V1.0</span>
      </div>
    </aside>
  );
}
