// ============================================================
// 用户设置 API 函数封装
// GET /api/v1/settings
// PUT /api/v1/settings
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { UserSettings, SettingsUpdateData } from "@/app/types/settings";

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
