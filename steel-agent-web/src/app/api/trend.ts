// ============================================================
// 价格走势 API 函数封装
// GET /api/v1/prices/trend
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { TrendQueryParams, TrendDataPoint } from "@/app/types/trend";

// -----------------------------------------------------------
// 获取价格走势数据
// GET /api/v1/prices/trend
// -----------------------------------------------------------

export async function getPriceTrend(
  params: TrendQueryParams,
): Promise<TrendDataPoint[]> {
  const { data } = await apiClient.get<ApiResponse<TrendDataPoint[]>>(
    "/prices/trend",
    { params },
  );
  if (!data?.data) throw new Error(data?.message || "获取走势数据失败");
  return data.data;
}
