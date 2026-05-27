import { adminApiClient } from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { AdminUser } from "@/app/types/admin";

export async function adminLogin(username: string, password: string): Promise<{ token: string }> {
  const { data } = await adminApiClient.post<ApiResponse<{ token: string }>>("/admin/auth/login", {
    username,
    password,
  });
  if (!data?.data?.token) {
    throw new Error(data?.message || "登录失败");
  }
  return data.data;
}

export async function adminLogout(): Promise<void> {
  await adminApiClient.post<ApiResponse<null>>("/admin/auth/logout");
}

export async function adminGetInfo(): Promise<AdminUser> {
  const { data } = await adminApiClient.get<ApiResponse<AdminUser>>("/admin/auth/info");
  if (!data?.data) {
    throw new Error(data?.message || "获取管理员信息失败");
  }
  return data.data;
}

export async function adminUpdatePassword(oldPassword: string, newPassword: string): Promise<void> {
  await adminApiClient.put<ApiResponse<null>>("/admin/auth/password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
}

export async function adminUpdateProfile(nickname: string): Promise<void> {
  await adminApiClient.put<ApiResponse<null>>("/admin/auth/profile", {
    nickname,
  });
}
