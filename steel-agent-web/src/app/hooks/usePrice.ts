// ============================================================
// 价格相关 TanStack Query Hooks
// ============================================================

import { useQuery } from "@tanstack/react-query";
import {
  getLatestPrice,
  getPriceList,
  comparePrices,
  getDailyReport,
  getWeeklyReport,
  type PriceData,
  type PriceListResponse,
  type PriceCompareData,
  type DailyReportData,
  type WeeklyReportData,
} from "@/app/api/price";
import { getPriceTrend } from "@/app/api/trend";
import type { TrendDataPoint, TrendQueryParams } from "@/app/types/trend";

// -----------------------------------------------------------
// 最新价格
// -----------------------------------------------------------

export function useLatestPrice(category: string) {
  return useQuery<PriceData>({
    queryKey: ["price-latest", category],
    queryFn: () => getLatestPrice(category),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
}

// -----------------------------------------------------------
// 价格列表
// -----------------------------------------------------------

export function usePriceList(params: {
  category?: string;
  spec?: string;
  region?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<PriceListResponse>({
    queryKey: ["price-list", params],
    queryFn: () => getPriceList(params),
    staleTime: 2 * 60 * 1000,
  });
}

// -----------------------------------------------------------
// 价格走势（复用 trend API）
// -----------------------------------------------------------

export function usePriceTrend(params: TrendQueryParams) {
  return useQuery<TrendDataPoint[]>({
    queryKey: ["price-trend", params],
    queryFn: () => getPriceTrend(params),
    enabled: !!params.category,
    staleTime: 10 * 60 * 1000,
  });
}

// -----------------------------------------------------------
// 多品种价格对比
// -----------------------------------------------------------

export function usePriceCompare(categories: string[]) {
  return useQuery<PriceCompareData>({
    queryKey: ["price-compare", categories],
    queryFn: () => comparePrices(categories),
    enabled: categories.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// -----------------------------------------------------------
// 日报
// -----------------------------------------------------------

export function useDailyReport() {
  return useQuery<DailyReportData>({
    queryKey: ["daily-report"],
    queryFn: getDailyReport,
    staleTime: 10 * 60 * 1000,
  });
}

// -----------------------------------------------------------
// 周报
// -----------------------------------------------------------

export function useWeeklyReport() {
  return useQuery<WeeklyReportData>({
    queryKey: ["weekly-report"],
    queryFn: getWeeklyReport,
    staleTime: 30 * 60 * 1000,
  });
}
