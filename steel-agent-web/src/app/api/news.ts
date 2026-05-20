// ============================================================
// 资讯新闻 API 函数封装
// GET /api/v1/news/:id
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { NewsDetail } from "@/app/types/news";

// -----------------------------------------------------------
// 获取资讯详情
// GET /api/v1/news/:id
// -----------------------------------------------------------

export async function getNewsDetail(id: string): Promise<NewsDetail> {
  const { data } = await apiClient.get<ApiResponse<NewsDetail>>(
    `/news/${id}`,
  );
  if (!data?.data) throw new Error(data?.message || "获取资讯详情失败");
  return data.data;
}
