import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, Clock, AlertTriangle, Coins } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

import { AdminPageShell } from "./AdminPageShell";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";

import {
  getApiStatsOverview,
  getApiEndpointStats,
  getApiModelStats,
  getApiUserStats,
  getApiTrend,
} from "@/app/api/admin";

import type {
  ApiCallOverview,
  ApiEndpointStat,
  ApiModelStat,
  ApiUserStat,
  ApiTrendPoint,
} from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

type TimeRange = "7d" | "30d";
type DetailTab = "endpoint" | "model" | "user";

const TIME_RANGE_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7天" },
  { key: "30d", label: "30天" },
];

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "endpoint", label: "按接口" },
  { key: "model", label: "按模型" },
  { key: "user", label: "按用户" },
];

// ============================================================
// 子组件
// ============================================================

/** 趋势图自定义 Tooltip */
function CustomTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "bg-white border border-[#E5E5E5] rounded-md px-3 py-2",
        "text-[12px] leading-[1.5]",
      )}
    >
      <p className="text-[#737373] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-[#0A0A0A] tabular-nums">
          <span
            className="inline-block w-2 h-0.5 mr-1.5 align-middle"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}：{entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/** 自定义图例 */
function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-6 mt-3">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 bg-[#0A0A0A]" aria-hidden="true" />
        <span className="text-[12px] leading-[1.5] text-[#404040]">
          调用量
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 bg-[#A3A3A3] border-dashed" aria-hidden="true" />
        <span className="text-[12px] leading-[1.5] text-[#404040]">
          平均耗时
        </span>
      </div>
    </div>
  );
}

// ============================================================
// 格式化工具
// ============================================================

function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  return num.toLocaleString();
}

function formatTokens(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return String(num);
}

function formatErrorRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

// ============================================================
// 主组件
// ============================================================

export function ApiStats() {
  // ---- 状态 ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<ApiCallOverview | null>(null);

  // 趋势
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [trendData, setTrendData] = useState<ApiTrendPoint[]>([]);

  // 详情 tab
  const [detailTab, setDetailTab] = useState<DetailTab>("endpoint");
  const [endpointStats, setEndpointStats] = useState<ApiEndpointStat[]>([]);
  const [modelStats, setModelStats] = useState<ApiModelStat[]>([]);
  const [userStats, setUserStats] = useState<ApiUserStat[]>([]);

  // ---- 数据获取 ----
  const fetchOverview = useCallback(async () => {
    try {
      const data = await getApiStatsOverview();
      setOverview(data);
    } catch {
      setOverview(null);
    }
  }, []);

  const fetchTrend = useCallback(async (days: number) => {
    try {
      const data = await getApiTrend(days);
      setTrendData(data);
    } catch {
      setTrendData([]);
    }
  }, []);

  const fetchDetailData = useCallback(async () => {
    const results = await Promise.allSettled([
      getApiEndpointStats(),
      getApiModelStats(),
      getApiUserStats(),
    ]);

    if (results[0].status === "fulfilled") {
      setEndpointStats(results[0].value);
    } else {
      setEndpointStats([]);
    }

    if (results[1].status === "fulfilled") {
      setModelStats(results[1].value);
    } else {
      setModelStats([]);
    }

    if (results[2].status === "fulfilled") {
      setUserStats(results[2].value);
    } else {
      setUserStats([]);
    }
  }, []);

  // ---- 初始化加载 ----
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        await fetchOverview();
        await fetchTrend(7);
        await fetchDetailData();
      } catch {
        if (!cancelled) setError("数据加载失败，请稍后重试");
      }

      if (!cancelled) setLoading(false);
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [fetchOverview, fetchTrend, fetchDetailData]);

  // ---- 时间范围切换 ----
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      const days = range === "7d" ? 7 : 30;
      fetchTrend(days);
    },
    [fetchTrend],
  );

  // ---- 渲染 ----
  return (
    <AdminPageShell
      title="API 调用统计"
      breadcrumbs={[{ label: "API 调用统计" }]}
    >
      {loading ? (
        // ---- 加载态 ----
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminLoading type="card" />
            <AdminLoading type="card" />
            <AdminLoading type="card" />
            <AdminLoading type="card" />
          </div>
          <AdminLoading type="card" />
        </div>
      ) : error && !overview ? (
        // ---- 错误态 ----
        <AdminEmpty
          title="加载失败"
          description={error}
          action={{
            label: "重新加载",
            onClick: () => window.location.reload(),
          }}
        />
      ) : (
        // ---- 正常内容 ----
        <div>
          {/* ================================================ */}
          {/* 第一行：4 个统计卡片 */}
          {/* ================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* 今日调用量 */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-xl p-5",
                "flex flex-col gap-4",
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FAFAFA]">
                <BarChart3
                  size={18}
                  strokeWidth={1.75}
                  className="text-[#0A0A0A]"
                />
              </div>
              <div>
                <p className="text-[28px] leading-[1.2] font-medium text-[#0A0A0A] tabular-nums">
                  {overview ? formatNumber(overview.today_total) : "--"}
                </p>
                <p className="text-[12px] leading-[1.5] text-[#737373] mt-1">
                  今日调用量
                </p>
              </div>
            </div>

            {/* 平均响应时间 */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-xl p-5",
                "flex flex-col gap-4",
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FAFAFA]">
                <Clock
                  size={18}
                  strokeWidth={1.75}
                  className="text-[#0A0A0A]"
                />
              </div>
              <div>
                <p className="text-[28px] leading-[1.2] font-medium text-[#0A0A0A] tabular-nums">
                  {overview != null
                    ? `${Math.round(overview.avg_duration_ms)}ms`
                    : "--"}
                </p>
                <p className="text-[12px] leading-[1.5] text-[#737373] mt-1">
                  平均响应时间
                </p>
              </div>
            </div>

            {/* 错误率 */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-xl p-5",
                "flex flex-col gap-4",
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FAFAFA]">
                <AlertTriangle
                  size={18}
                  strokeWidth={1.75}
                  className={cn(
                    overview && overview.error_rate > 0.05
                      ? "text-[#B45309]"
                      : "text-[#0A0A0A]",
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "text-[28px] leading-[1.2] font-medium tabular-nums",
                    overview && overview.error_rate > 0.05
                      ? "text-[#B45309]"
                      : "text-[#0A0A0A]",
                  )}
                >
                  {overview != null
                    ? formatErrorRate(overview.error_rate)
                    : "--"}
                </p>
                <p className="text-[12px] leading-[1.5] text-[#737373] mt-1">
                  错误率
                </p>
              </div>
            </div>

            {/* Token 消耗 */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-xl p-5",
                "flex flex-col gap-4",
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#FAFAFA]">
                <Coins
                  size={18}
                  strokeWidth={1.75}
                  className="text-[#0A0A0A]"
                />
              </div>
              <div>
                <p className="text-[28px] leading-[1.2] font-medium text-[#0A0A0A] tabular-nums">
                  {overview != null
                    ? formatTokens(overview.today_tokens)
                    : "--"}
                </p>
                <p className="text-[12px] leading-[1.5] text-[#737373] mt-1">
                  Token 消耗
                </p>
              </div>
            </div>
          </div>

          {/* ================================================ */}
          {/* 第二行：趋势图 */}
          {/* ================================================ */}
          <div
            className={cn(
              "bg-white border border-[#E5E5E5] rounded-xl p-5",
              "mb-6",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A]">
                API 调用趋势
              </h2>

              {/* 时间范围切换 */}
              <div className="flex items-center gap-0.5">
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleTimeRangeChange(opt.key)}
                    className={cn(
                      "px-3 py-1 text-[12px] leading-[1.5] rounded-full",
                      "transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                      timeRange === opt.key
                        ? "bg-[#0A0A0A] text-white"
                        : "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                    )}
                    aria-pressed={timeRange === opt.key}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-[240px]">
                <p className="text-[12px] text-[#A3A3A3]">
                  暂无趋势数据
                </p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={trendData}
                    margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid
                      stroke="#E5E5E5"
                      strokeDasharray="4 4"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 12,
                        fill: "#737373",
                      }}
                      dy={8}
                    />
                    <YAxis
                      hide={true}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "#E5E5E5",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="call_count"
                      name="调用量"
                      stroke="#0A0A0A"
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: "#0A0A0A", strokeWidth: 0 }}
                      activeDot={{
                        r: 4,
                        fill: "#0A0A0A",
                        strokeWidth: 0,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_duration_ms"
                      name="平均耗时"
                      stroke="#A3A3A3"
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={{ r: 2, fill: "#A3A3A3", strokeWidth: 0 }}
                      activeDot={{
                        r: 4,
                        fill: "#A3A3A3",
                        strokeWidth: 0,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <CustomLegend />
              </>
            )}
          </div>

          {/* ================================================ */}
          {/* 第三行：详情统计表格（带 tab 切换） */}
          {/* ================================================ */}
          <div
            className={cn(
              "bg-white border border-[#E5E5E5] rounded-xl overflow-hidden",
            )}
          >
            {/* 详情 Tab 切换 */}
            <div
              className={cn(
                "flex items-center",
                "border-b border-[#E5E5E5]",
              )}
            >
              {DETAIL_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setDetailTab(tab.key)}
                  className={cn(
                    "px-5 py-3",
                    "text-[13px] leading-[1.5]",
                    "transition-colors duration-150",
                    "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A]/10",
                    "relative",
                    detailTab === tab.key
                      ? "text-[#0A0A0A] font-medium"
                      : "text-[#737373] hover:text-[#404040]",
                  )}
                  aria-selected={detailTab === tab.key}
                  role="tab"
                >
                  {tab.label}
                  {detailTab === tab.key && (
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 right-0",
                        "h-[2px] bg-[#0A0A0A]",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* 详情表格内容 */}
            <div className="overflow-x-auto">
              {/* ---- 按接口 ---- */}
              {detailTab === "endpoint" && (
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                      <th className="px-4 py-3 text-left text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        接口路径
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        调用量
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        平均耗时
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        错误数
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        错误率
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {endpointStats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <p className="text-[12px] text-[#A3A3A3]">
                            暂无数据
                          </p>
                        </td>
                      </tr>
                    ) : (
                      endpointStats.map((item, idx) => (
                        <tr
                          key={item.api_path}
                          className={cn(
                            idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                          )}
                        >
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#0A0A0A] font-mono whitespace-nowrap">
                            {item.api_path}
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] text-right tabular-nums">
                            {item.call_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] text-right tabular-nums">
                            {Math.round(item.avg_duration_ms)}ms
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-right tabular-nums">
                            <span
                              className={cn(
                                item.error_count > 0
                                  ? "text-[#B42318]"
                                  : "text-[#404040]",
                              )}
                            >
                              {item.error_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-right tabular-nums">
                            <span
                              className={cn(
                                item.error_rate > 0.05
                                  ? "text-[#B42318]"
                                  : "text-[#404040]",
                              )}
                            >
                              {formatErrorRate(item.error_rate)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* ---- 按模型 ---- */}
              {detailTab === "model" && (
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                      <th className="px-4 py-3 text-left text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        模型
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        调用量
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        Token 消耗
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {modelStats.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center">
                          <p className="text-[12px] text-[#A3A3A3]">
                            暂无数据
                          </p>
                        </td>
                      </tr>
                    ) : (
                      modelStats.map((item, idx) => (
                        <tr
                          key={item.model}
                          className={cn(
                            idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                          )}
                        >
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#0A0A0A] whitespace-nowrap">
                            {item.model}
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] text-right tabular-nums">
                            {item.call_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] text-right tabular-nums">
                            {formatTokens(item.total_tokens)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* ---- 按用户 ---- */}
              {detailTab === "user" && (
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                      <th className="px-4 py-3 text-left text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        用户 ID
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        调用量
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium whitespace-nowrap">
                        Token 消耗
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {userStats.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center">
                          <p className="text-[12px] text-[#A3A3A3]">
                            暂无数据
                          </p>
                        </td>
                      </tr>
                    ) : (
                      userStats.map((item, idx) => (
                        <tr
                          key={item.user_id}
                          className={cn(
                            idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                          )}
                        >
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#0A0A0A] tabular-nums whitespace-nowrap">
                            #{item.user_id}
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] text-right tabular-nums">
                            {item.call_count.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] text-right tabular-nums">
                            {formatTokens(item.total_tokens)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

export default ApiStats;
