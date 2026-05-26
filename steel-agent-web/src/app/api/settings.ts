// ============================================================
// 用户设置 API 函数封装
// GET /api/v1/settings
// PUT /api/v1/settings
// GET /api/v1/public/config
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { UserSettings, SettingsUpdateData } from "@/app/types/settings";

// -----------------------------------------------------------
// 站点公开配置类型
// -----------------------------------------------------------

export interface SiteConfig {
  siteName: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
}

// -----------------------------------------------------------
// 获取用户设置
// GET /api/v1/settings
// -----------------------------------------------------------

export async function getSettings(): Promise<UserSettings> {
  const { data } = await apiClient.get<ApiResponse<UserSettings>>(
    "/settings",
  );
  if (!data?.data) throw new Error(data?.message || "获取设置失败");
  return data.data;
}

// -----------------------------------------------------------
// 更新用户设置
// PUT /api/v1/settings
// -----------------------------------------------------------

export async function updateSettings(
  payload: SettingsUpdateData,
): Promise<UserSettings> {
  const { data } = await apiClient.put<ApiResponse<UserSettings>>(
    "/settings",
    payload,
  );
  if (!data?.data) throw new Error(data?.message || "更新设置失败");
  return data.data;
}

// -----------------------------------------------------------
// 获取站点公开配置（无需认证）
// GET /api/v1/public/config
// -----------------------------------------------------------

export async function getPublicConfig(): Promise<SiteConfig> {
  const { data } = await apiClient.get<ApiResponse<SiteConfig>>(
    "/public/config",
  );
  return data.data!;
}
