// ============================================================
// SettingsPage — 设置页面
// 通知设置 / 外观 / 数据管理 / 关于 / 退出登录
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { useAuthStore } from "@/app/stores/authStore";
import { useSettingsStore } from "@/app/stores/settingsStore";
import { useThemeStore } from "@/app/stores/themeStore";
import type { Theme } from "@/app/stores/themeStore";
import { ROUTE } from "@/app/constants/auth";

// -----------------------------------------------------------
// Theme items for the segmented control
// -----------------------------------------------------------

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

// -----------------------------------------------------------
// SettingsPage
// -----------------------------------------------------------

export default function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Stores ---
  const logout = useAuthStore((s) => s.logout);
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // --- Local state ---
  const [isToggling, setIsToggling] = useState(false);

  // --- Load settings on mount ---
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // -----------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------

  const handlePushToggle = useCallback(
    async (checked: boolean) => {
      setIsToggling(true);
      try {
        await updateSettings({ notifications_enabled: checked });
      } catch {
        toast.error("更新设置失败");
      } finally {
        setIsToggling(false);
      }
    },
    [updateSettings],
  );

  const handleAlertToggle = useCallback(
    async (checked: boolean) => {
      setIsToggling(true);
      try {
        await updateSettings({ alerts_enabled: checked });
        toast.success(checked ? "预警提醒已开启" : "预警提醒已关闭");
      } catch {
        toast.error("更新设置失败");
      } finally {
        setIsToggling(false);
      }
    },
    [updateSettings],
  );

  const handleThemeChange = (value: Theme) => {
    setTheme(value);
    toast.success(
      value === "light"
        ? "已切换为浅色模式"
        : value === "dark"
          ? "已切换为深色模式"
          : "已切换为跟随系统",
    );
  };

  const handleClearCache = () => {
    // Clear TanStack Query cache and invalidate all queries
    queryClient.clear();
    // Also clear any cached API responses by refetching active queries
    queryClient.invalidateQueries();
    toast.success("缓存已清除");
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTE.CHAT);
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------

  const pushEnabled = settings?.notifications_enabled ?? true;
  const alertEnabled = settings?.alerts_enabled ?? true;

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader title="设置" onBack={() => navigate(-1)} />

      <div className="flex-1">
        {/* =====================================================
            Section 1 — 通知设置
            ===================================================== */}
        <div className="divide-y divide-steel-line">
          {/* Push notification */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] leading-[1.6] text-steel-ink">
              推送通知
            </span>
            <Switch
              checked={pushEnabled}
              onCheckedChange={handlePushToggle}
              disabled={isToggling}
              aria-label="推送通知开关"
              className="data-[state=checked]:bg-steel-ink data-[state=unchecked]:bg-[#CBCED4]"
            />
          </div>

          {/* Alert notification */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] leading-[1.6] text-steel-ink">
              预警提醒
            </span>
            <Switch
              checked={alertEnabled}
              onCheckedChange={handleAlertToggle}
              disabled={isToggling}
              aria-label="预警提醒开关"
              className="data-[state=checked]:bg-steel-ink data-[state=unchecked]:bg-[#CBCED4]"
            />
          </div>
        </div>

        {/* =====================================================
            Section 2 — 外观
            ===================================================== */}
        <div className="divide-y divide-steel-line mt-0">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] leading-[1.6] text-steel-ink">
              深色模式
            </span>

            {/* Segmented theme control */}
            <div className="flex items-center gap-1">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleThemeChange(opt.value)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-[13px] leading-[1.5] transition-colors duration-150",
                      isSelected
                        ? "bg-steel-ink text-steel-canvas"
                        : "border border-steel-line text-steel-body hover:bg-steel-surface",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* =====================================================
            Section 3 — 数据管理
            ===================================================== */}
        <div className="divide-y divide-steel-line mt-0">
          {/* Clear cache */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] leading-[1.6] text-steel-ink">
              清除缓存
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="text-[13px] leading-[1.5] text-steel-down hover:opacity-70 transition-opacity duration-150"
                >
                  清除
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-steel-canvas border border-steel-line rounded-2xl p-6 max-w-[320px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[18px] leading-[1.4] font-medium text-steel-ink">
                    确认清除缓存？
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[14px] leading-[1.6] text-steel-muted">
                    清除后将重新加载数据，不会影响您的账号信息。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full border border-steel-line text-steel-ink hover:bg-steel-surface h-10 px-5 text-[14px]">
                    取消
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearCache}
                    className="rounded-full bg-steel-ink text-steel-canvas hover:bg-steel-body h-10 px-5 text-[14px]"
                  >
                    确定
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* =====================================================
            Section 4 — 关于
            ===================================================== */}
        <div className="divide-y divide-steel-line mt-0">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] leading-[1.6] text-steel-ink">
              版本
            </span>
            <span className="text-[13px] leading-[1.5] text-steel-muted">
              1.0.0
            </span>
          </div>
        </div>

        {/* =====================================================
            Logout button
            ===================================================== */}
        <div className="mx-4 mt-8 mb-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="w-full h-12 border border-steel-line text-[15px] font-medium text-steel-down rounded-full hover:bg-steel-surface transition-colors duration-150"
              >
                退出登录
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-steel-canvas border border-steel-line rounded-2xl p-6 max-w-[320px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[18px] leading-[1.4] font-medium text-steel-ink">
                  确认退出登录？
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[14px] leading-[1.6] text-steel-muted">
                  退出后需要重新登录才能使用服务。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full border border-steel-line text-steel-ink hover:bg-steel-surface h-10 px-5 text-[14px]">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="rounded-full bg-steel-down text-steel-canvas hover:bg-steel-down/80 h-10 px-5 text-[14px]"
                >
                  退出
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
