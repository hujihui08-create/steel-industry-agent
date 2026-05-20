// ============================================================
// 用户资料 API 函数封装
// GET /api/v1/users/profile
// PUT /api/v1/users/profile
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { UserProfile, ProfileUpdateData } from "@/app/types/user";

// -----------------------------------------------------------
// 获取用户资料
// GET /api/v1/users/profile
// -----------------------------------------------------------

export async function getProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<ApiResponse<UserProfile>>(
    "/users/profile",
  );
  if (!data?.data) throw new Error(data?.message || "获取用户信息失败");
  return data.data;
}

// -----------------------------------------------------------
// 更新用户资料
// PUT /api/v1/users/profile
// -----------------------------------------------------------

export async function updateProfile(
  payload: ProfileUpdateData,
): Promise<UserProfile> {
  const { data } = await apiClient.put<ApiResponse<UserProfile>>(
    "/users/profile",
    payload,
  );
  if (!data?.data) throw new Error(data?.message || "更新用户信息失败");
  return data.data;
}
