// ============================================================
// ProfilePage — 个人中心页面
// 展示用户头像、昵称、公司信息，以及功能入口菜单
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Shield,
  Bell,
  Star,
  Settings,
  ChevronRight,
  Check,
} from "lucide-react";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";

import { getProfile } from "@/app/api/users";
import { ROUTE } from "@/app/constants/auth";

// -----------------------------------------------------------
// ProfilePage
// -----------------------------------------------------------

export default function ProfilePage() {
  const navigate = useNavigate();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 60_000,
  });

  // -----------------------------------------------------------
  // Menu items
  // -----------------------------------------------------------

  interface MenuItem {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }

  const menuItems: MenuItem[] = [
    {
      icon: <User className="h-5 w-5 text-steel-muted" strokeWidth={1.75} aria-hidden="true" />,
      label: "个人资料",
      onClick: () => navigate(ROUTE.PROFILE_EDIT),
    },
    {
      icon: <Shield className="h-5 w-5 text-steel-muted" strokeWidth={1.75} aria-hidden="true" />,
      label: "企业认证",
      onClick: () => navigate(ROUTE.CERTIFICATION),
    },
    {
      icon: <Bell className="h-5 w-5 text-steel-muted" strokeWidth={1.75} aria-hidden="true" />,
      label: "消息中心",
      onClick: () => navigate(ROUTE.MESSAGES),
    },
    {
      icon: <Star className="h-5 w-5 text-steel-muted" strokeWidth={1.75} aria-hidden="true" />,
      label: "我的收藏",
      onClick: () => navigate(ROUTE.FAVORITES),
    },
    {
      icon: <Settings className="h-5 w-5 text-steel-muted" strokeWidth={1.75} aria-hidden="true" />,
      label: "设置",
      onClick: () => navigate(ROUTE.SETTINGS),
    },
  ];

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------

  const renderContent = () => {
    // Loading
    if (isLoading) {
      return (
        <div className="px-4 pt-6">
          <LoadingSkeleton variant="card" count={1} />
        </div>
      );
    }

    // Error
    if (isError) {
      return <ErrorState onRetry={() => refetch()} />;
    }

    // Profile data
    if (!profile) {
      return (
        <ErrorState
          message="未获取到用户信息"
          onRetry={() => refetch()}
        />
      );
    }

    const firstChar = profile.nickname
      ? profile.nickname.charAt(0)
      : "";

    return (
      <>
        {/* ---- Top Section: Avatar + Info ---- */}
        <div className="flex flex-col items-center px-4 pt-8 pb-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-steel-surface border-2 border-steel-ink flex items-center justify-center">
            {firstChar ? (
              <span className="text-[24px] leading-[1.3] font-medium text-steel-ink">
                {firstChar}
              </span>
            ) : (
              <User className="h-10 w-10 text-steel-placeholder" strokeWidth={1.75} aria-hidden="true" />
            )}
          </div>

          {/* Nickname */}
          <h2 className="text-[24px] leading-[1.3] font-medium text-steel-ink mt-3">
            {profile.nickname || "未设置昵称"}
          </h2>

          {/* Company */}
          {profile.company && (
            <p className="text-[15px] leading-[1.6] text-steel-body mt-1">
              {profile.company}
            </p>
          )}

          {/* Verified badge */}
          {profile.is_verified && (
            <div className="inline-flex items-center gap-1 mt-1">
              <Check className="h-3.5 w-3.5 text-steel-up" strokeWidth={2} />
              <span className="text-[12px] leading-[1.5] text-steel-up">
                已认证
              </span>
            </div>
          )}
        </div>

        {/* ---- Menu Items ---- */}
        <nav className="divide-y divide-steel-line mx-0 mt-6">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-steel-surface transition-colors duration-150 text-left"
            >
              {item.icon}
              <span className="text-[15px] leading-[1.6] text-steel-ink flex-1">
                {item.label}
              </span>
              <ChevronRight
                className="h-4 w-4 text-steel-placeholder shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          ))}
        </nav>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="个人中心"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1">{renderContent()}</div>
    </div>
  );
}
