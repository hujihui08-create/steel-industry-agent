// ============================================================
// 通知消息 API 函数封装
// GET /api/v1/notifications
// PUT /api/v1/notifications/:id/read
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { Notification } from "@/app/types/notification";

// -----------------------------------------------------------
// 获取通知列表
// GET /api/v1/notifications
// -----------------------------------------------------------

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<ApiResponse<Notification[]>>(
    "/notifications",
  );
  if (!data?.data) throw new Error(data?.message || "获取通知列表失败");
  return data.data;
}

// -----------------------------------------------------------
// 标记通知为已读
// PUT /api/v1/notifications/:id/read
// -----------------------------------------------------------

export async function markAsRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`);
}
