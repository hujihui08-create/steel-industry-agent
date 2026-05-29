// ============================================================
// 招标信息 API 函数封装
// GET /api/v1/tenders
// GET /api/v1/tenders/:id
// POST /api/v1/tenders/:id/favorite
// DELETE /api/v1/tenders/:id/favorite
// GET /api/v1/tenders/favorites
// GET /api/v1/calendar
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { TenderDetail } from "@/app/types/tender";

// -----------------------------------------------------------
// Calendar types
// -----------------------------------------------------------

export interface CalendarItem {
  id: number;
  title: string;
  deadline: string;
  status: string;
}

export interface CalendarDate {
  date: string;
  items: CalendarItem[];
}

export interface CalendarData {
  dates: CalendarDate[];
  total: number;
}

// -----------------------------------------------------------
// 获取招标列表
// GET /api/v1/tenders
// -----------------------------------------------------------

export async function getTenderList(): Promise<TenderDetail[]> {
  const { data } = await apiClient.get<ApiResponse<TenderDetail[]>>(
    "/tenders",
  );
  if (!data?.data) throw new Error(data?.message || "获取招标列表失败");
  return data.data;
}

// -----------------------------------------------------------
// 获取招标详情
// GET /api/v1/tenders/:id
// -----------------------------------------------------------

export async function getTenderDetail(id: string): Promise<TenderDetail> {
  const { data } = await apiClient.get<ApiResponse<TenderDetail>>(
    `/tenders/${id}`,
  );
  if (!data?.data) throw new Error(data?.message || "获取招标详情失败");
  return data.data;
}

// -----------------------------------------------------------
// 收藏招标项目
// POST /api/v1/tenders/:id/favorite
// -----------------------------------------------------------

export async function addTenderFavorite(tenderId: number | string): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(
    `/tenders/${tenderId}/favorite`,
  );
  if (data.code !== 200) throw new Error(data.message || "收藏失败");
}

// -----------------------------------------------------------
// 取消收藏招标项目
// DELETE /api/v1/tenders/:id/favorite
// -----------------------------------------------------------

export async function removeTenderFavorite(tenderId: number | string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    `/tenders/${tenderId}/favorite`,
  );
  if (data.code !== 200) throw new Error(data.message || "取消收藏失败");
}

// -----------------------------------------------------------
// 获取用户收藏的招标 ID 列表
// GET /api/v1/tenders/favorites
// -----------------------------------------------------------

export async function getTenderFavorites(): Promise<TenderDetail[]> {
  const { data } = await apiClient.get<ApiResponse<TenderDetail[]>>(
    "/tenders/favorites",
  );
  if (!data?.data) throw new Error(data?.message || "获取收藏列表失败");
  return data.data;
}

// -----------------------------------------------------------
// 获取投标日历
// GET /api/v1/calendar
// -----------------------------------------------------------

export async function getCalendar(): Promise<CalendarData> {
  const { data } = await apiClient.get<ApiResponse<CalendarData>>(
    "/calendar",
  );
  if (!data?.data) throw new Error(data?.message || "获取投标日历失败");
  return data.data;
}
