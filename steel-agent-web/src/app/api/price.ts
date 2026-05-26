// ============================================================
// 钢材价格 API 函数封装
// GET  /api/v1/prices/latest  - 获取最新价格
// GET  /api/v1/prices         - 获取价格列表
// GET  /api/v1/prices/compare - 多品种价格对比
// GET  /api/v1/reports/daily  - 日报
// GET  /api/v1/reports/weekly - 周报
// ============================================================

import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";

export interface PriceData {
  id: number;
  category: string;
  spec: string;
  price: number;
  change: number;
  change_pct: number;
  region: string;
  source: string;
  price_date: string;
  created_at: string;
}

export interface PriceListResponse {
  items: PriceData[];
  total: number;
  limit: number;
  offset: number;
}

export interface PriceCompareData {
  [category: string]: PriceData;
}

export interface DailyReportData {
  date: string;
  items: Array<{
    category: string;
    spec: string;
    price: number;
    change: number;
    region: string;
  }>;
  total: number;
  up_count: number;
  down_count: number;
  flat_count: number;
}

export interface WeeklyReportData {
  start_date: string;
  end_date: string;
  trends: Array<{
    category: string;
    start_price: number;
    end_price: number;
    high_price: number;
    low_price: number;
    avg_price: number;
    total_change: number;
  }>;
}

// -----------------------------------------------------------
// 获取最新价格
// GET /api/v1/prices/latest?category=螺纹钢
// -----------------------------------------------------------

export async function getLatestPrice(category: string): Promise<PriceData> {
  const { data } = await apiClient.get<ApiResponse<PriceData>>(
    "/prices/latest",
    { params: { category } },
  );
  if (!data?.data) throw new Error(data?.message || "获取最新价格失败");
  return data.data;
}

// -----------------------------------------------------------
// 获取价格列表
// GET /api/v1/prices?category=螺纹钢&region=上海&spec=HRB400E
// -----------------------------------------------------------

export async function getPriceList(params: {
  category?: string;
  spec?: string;
  region?: string;
  limit?: number;
  offset?: number;
}): Promise<PriceListResponse> {
  const { data } = await apiClient.get<ApiResponse<PriceListResponse>>(
    "/prices",
    { params },
  );
  if (!data?.data) throw new Error(data?.message || "获取价格列表失败");
  return data.data;
}

// -----------------------------------------------------------
// 多品种价格对比
// GET /api/v1/prices/compare?categories=螺纹钢,热卷
// -----------------------------------------------------------

export async function comparePrices(
  categories: string[],
): Promise<PriceCompareData> {
  const { data } = await apiClient.get<ApiResponse<PriceCompareData>>(
    "/prices/compare",
    { params: { categories: categories.join(",") } },
  );
  if (!data?.data) throw new Error(data?.message || "获取价格对比失败");
  return data.data;
}

// -----------------------------------------------------------
// 获取日报
// GET /api/v1/reports/daily
// -----------------------------------------------------------

export async function getDailyReport(): Promise<DailyReportData> {
  const { data } = await apiClient.get<ApiResponse<DailyReportData>>(
    "/reports/daily",
  );
  if (!data?.data) throw new Error(data?.message || "获取日报失败");
  return data.data;
}

// -----------------------------------------------------------
// 获取周报
// GET /api/v1/reports/weekly
// -----------------------------------------------------------

export async function getWeeklyReport(): Promise<WeeklyReportData> {
  const { data } = await apiClient.get<ApiResponse<WeeklyReportData>>(
    "/reports/weekly",
  );
  if (!data?.data) throw new Error(data?.message || "获取周报失败");
  return data.data;
}
