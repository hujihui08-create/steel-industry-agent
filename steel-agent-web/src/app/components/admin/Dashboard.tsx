import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Users,
  Activity,
  MessageSquare,
  Zap,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";

import { AdminPageShell } from "./AdminPageShell";
import { AdminStatCard } from "./AdminStatCard";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";

import {
  getDashboardStats,
  getTrendData,
  getBadCaseStats,
  getToolHealth,
  getRecentLogs,
} from "@/app/api/admin";

import type {
  DashboardStats,
  TrendDataPoint,
  BadCaseStats,
  ToolHealth,
  OperationLog,
} from "@/app/types/admin";

// ============================================================
// 类型
// ============================================================

type TrendPeriod = "today" | "7days" | "30days";

interface TrendPeriodOption {
  key: TrendPeriod;
  label: string;
}

const TREND_PERIODS: TrendPeriodOption[] = [
  { key: "today", label: "今日" },
  { key: "7days", label: "7天" },
  { key: "30days", label: "30天" },
];

// ============================================================
// 子组件
// ============================================================

/** 趋势图 Tooltip */
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
            className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
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
    <div className="flex items-center justify-center gap-6 mt-4">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 bg-[#0A0A0A]" aria-hidden="true" />
        <span className="text-[12px] leading-[1.5] text-[#404040]">
          用户量
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-0.5 bg-[#737373]" aria-hidden="true" />
        <span className="text-[12px] leading-[1.5] text-[#404040]">
          对话量
        </span>
      </div>
    </div>
  );
}

/** Bad Case 统计行 */
function BadCaseRow({
  label,
  count,
  color,
  total,
}: {
  label: string;
  count: number;
  color: string;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] leading-[1.5] text-[#404040] w-[56px] shrink-0">
        {label}
      </span>
      <span className="text-[13px] leading-[1.5] text-[#0A0A0A] tabular-nums w-[32px] shrink-0 text-right">
        {count}
      </span>
      <div className="flex-1 h-1.5 bg-[#FAFAFA] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/** 工具健康状态行 */
function ToolHealthRow({ tool }: { tool: ToolHealth }) {
  const dotColor =
    tool.status === "normal"
      ? "bg-[#1F7A4D]"
      : tool.status === "degraded"
        ? "bg-[#B45309]"
        : "bg-[#B42318]";

  const statusLabel =
    tool.status === "normal"
      ? "正常"
      : tool.status === "degraded"
        ? "降级"
        : "离线";

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span
          className={cn("w-[6px] h-[6px] rounded-full shrink-0", dotColor)}
          aria-hidden="true"
        />
        <span className="text-[13px] leading-[1.5] text-[#404040]">
          {tool.displayName}
        </span>
      </div>
      <span
        className={cn(
          "text-[11px] leading-[1.5]",
          tool.status === "normal" && "text-[#1F7A4D]",
          tool.status === "degraded" && "text-[#B45309]",
          tool.status === "down" && "text-[#B42318]",
        )}
      >
        {statusLabel}
      </span>
    </div>
  );
}

/** 最近操作日志行 */
function LogRow({ log }: { log: OperationLog }) {
  // 提取时间部分（HH:mm）
  const timePart = log.timestamp.slice(11, 16);

  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="text-[12px] leading-[1.5] text-[#A3A3A3] tabular-nums shrink-0 w-[40px]">
        {timePart}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[13px] leading-[1.5] text-[#0A0A0A]">
          {log.operator}
        </span>
        <span className="text-[13px] leading-[1.5] text-[#737373] ml-1.5">
          {log.summary}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export function Dashboard() {
  const navigate = useNavigate();

  // ---- 状态 ----
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("7days");
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [badCaseStats, setBadCaseStats] = useState<BadCaseStats | null>(null);
  const [toolHealth, setToolHealth] = useState<ToolHealth[]>([]);
  const [recentLogs, setRecentLogs] = useState<OperationLog[]>([]);

  // ---- 数据获取 ----
  const fetchAllData = useCallback(
    async (showLoading: boolean, period: TrendPeriod) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const results = await Promise.allSettled([
        getDashboardStats(),
        getTrendData(period),
        getBadCaseStats(),
        getToolHealth(),
        getRecentLogs(),
      ]);

      const [
        statsResult,
        trendResult,
        badCaseResult,
        toolResult,
        logsResult,
      ] = results;

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(null);
        setError("核心数据加载失败，请稍后重试");
      }

      if (trendResult.status === "fulfilled") {
        setTrendData(trendResult.value);
      } else {
        setTrendData([]);
      }

      if (badCaseResult.status === "fulfilled") {
        setBadCaseStats(badCaseResult.value);
      } else {
        setBadCaseStats(null);
      }

      if (toolResult.status === "fulfilled") {
        setToolHealth(toolResult.value);
      } else {
        setToolHealth([]);
      }

      if (logsResult.status === "fulfilled") {
        setRecentLogs(logsResult.value);
      } else {
        setRecentLogs([]);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [],
  );

  // 保持最新 fetchAllData 引用，避免 setInterval 闭包过期
  const fetchAllDataRef = useRef(fetchAllData);
  fetchAllDataRef.current = fetchAllData;

  // 保持最新 trendPeriod 引用
  const trendPeriodRef = useRef(trendPeriod);
  trendPeriodRef.current = trendPeriod;

  // ---- 初始加载 & 自动刷新 ----
  useEffect(() => {
    fetchAllDataRef.current(true, trendPeriodRef.current);

    const interval = setInterval(() => {
      fetchAllDataRef.current(false, trendPeriodRef.current);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // ---- 周期切换时重新获取趋势数据 ----
  const handlePeriodChange = useCallback((period: TrendPeriod) => {
    setTrendPeriod(period);
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAllData(false, trendPeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendPeriod]);

  // ---- 手动刷新 ----
  const handleRefresh = useCallback(() => {
    fetchAllData(false, trendPeriod);
  }, [fetchAllData, trendPeriod]);

  // ---- Bad Case 合计 ----
  const badCaseTotal = badCaseStats
    ? badCaseStats.pending +
      badCaseStats.fixing +
      badCaseStats.fixed +
      badCaseStats.verified
    : 0;

  // ---- 工具健康汇总 ----
  const toolNormalCount = toolHealth.filter((t) => t.status === "normal").length;
  const toolTotalCount = toolHealth.length;

  // ---- 渲染 ----
  return (
    <AdminPageShell
      title="首页"
      breadcrumbs={[{ label: "首页" }]}
      actions={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className={cn(
            "inline-flex items-center justify-center",
            "w-9 h-9 rounded-lg",
            "border border-[#E5E5E5]",
            "text-[#737373] hover:text-[#0A0A0A] hover:border-[#0A0A0A]",
            "transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label="刷新数据"
        >
          <RefreshCw
            size={16}
            strokeWidth={1.75}
            className={cn(refreshing && "animate-spin")}
          />
        </button>
      }
    >
      {loading ? (
        // ---- 初始加载骨架屏 ----
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminLoading type="card" />
            <AdminLoading type="card" />
            <AdminLoading type="card" />
            <AdminLoading type="card" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <AdminLoading type="card" />
            <AdminLoading type="card" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminLoading type="card" />
            <AdminLoading type="card" />
          </div>
        </div>
      ) : error && !stats ? (
        // ---- 错误状态（无缓存数据时） ----
        <AdminEmpty
          title="加载失败"
          description={error}
          action={{
            label: "重新加载",
            onClick: handleRefresh,
          }}
        />
      ) : (
        // ---- 正常内容 ----
        <div>
          {/* ================================================ */}
          {/* 第一行：4 个统计卡片 */}
          {/* ================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminStatCard
              icon={<Users size={18} strokeWidth={1.75} />}
              label="用户总量"
              value={stats?.totalUsers?.toLocaleString() ?? "--"}
              change={stats?.totalUsersChange}
              changePct={stats?.totalUsersChangePct}
              onClick={() => navigate("/admin/users")}
            />
            <AdminStatCard
              icon={<Activity size={18} strokeWidth={1.75} />}
              label="今日活跃"
              value={stats?.todayActive?.toLocaleString() ?? "--"}
              change={stats?.todayActiveChange}
              changePct={stats?.todayActiveChangePct}
              onClick={() => navigate("/admin/users")}
            />
            <AdminStatCard
              icon={<MessageSquare size={18} strokeWidth={1.75} />}
              label="对话总量"
              value={stats?.totalConversations?.toLocaleString() ?? "--"}
              change={stats?.totalConversationsChange}
              changePct={stats?.totalConversationsChangePct}
              onClick={() => navigate("/admin/conversations")}
            />
            <AdminStatCard
              icon={<Zap size={18} strokeWidth={1.75} />}
              label="AI 调用量"
              value={stats?.aiCalls?.toLocaleString() ?? "--"}
              change={stats?.aiCallsChange}
              changePct={stats?.aiCallsChangePct}
              onClick={() => navigate("/admin/ai-usage")}
            />
          </div>

          {/* ================================================ */}
          {/* 第二行：趋势图 + Bad Case 统计 */}
          {/* ================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* ---- 左侧：趋势图 ---- */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-lg p-5",
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A]">
                  近7天用户量 & 对话量趋势
                </h2>

                {/* 周期切换按钮 */}
                <div className="flex items-center gap-0.5">
                  {TREND_PERIODS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handlePeriodChange(p.key)}
                      className={cn(
                        "px-3 py-1 text-[12px] leading-[1.5] rounded-full",
                        "transition-colors duration-150",
                        "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                        trendPeriod === p.key
                          ? "bg-[#0A0A0A] text-white"
                          : "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                      )}
                      aria-pressed={trendPeriod === p.key}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {trendData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-[12px] text-[#A3A3A3]">
                    暂无趋势数据
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={trendData}
                    margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  >
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#A3A3A3",
                      }}
                      dy={8}
                    />
                    <YAxis hide={true} />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "#E5E5E5",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Legend content={<CustomLegend />} />
                    <Line
                      type="monotone"
                      dataKey="users"
                      name="用户量"
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
                      dataKey="conversations"
                      name="对话量"
                      stroke="#737373"
                      strokeWidth={1.5}
                      dot={{ r: 2, fill: "#737373", strokeWidth: 0 }}
                      activeDot={{
                        r: 4,
                        fill: "#737373",
                        strokeWidth: 0,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ---- 右侧：Bad Case 统计 ---- */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-lg p-5",
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A]">
                  Bad Case 统计
                </h2>
              </div>

              {!badCaseStats || badCaseTotal === 0 ? (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-[12px] text-[#A3A3A3]">
                    暂无 Bad Case 数据
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <BadCaseRow
                    label="待处理"
                    count={badCaseStats.pending}
                    color="#B45309"
                    total={badCaseTotal}
                  />
                  <BadCaseRow
                    label="修复中"
                    count={badCaseStats.fixing}
                    color="#B45309"
                    total={badCaseTotal}
                  />
                  <BadCaseRow
                    label="已修复"
                    count={badCaseStats.fixed}
                    color="#1F7A4D"
                    total={badCaseTotal}
                  />
                  <BadCaseRow
                    label="已验证"
                    count={badCaseStats.verified}
                    color="#1F7A4D"
                    total={badCaseTotal}
                  />

                  {/* 合计行 */}
                  <div
                    className={cn(
                      "flex items-center justify-between pt-3",
                      "border-t border-[#E5E5E5]",
                    )}
                  >
                    <span className="text-[13px] leading-[1.5] text-[#737373]">
                      合计
                    </span>
                    <span className="text-[13px] leading-[1.5] font-medium text-[#0A0A0A] tabular-nums">
                      {badCaseTotal}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================================================ */}
          {/* 第三行：工具健康 + 最近操作日志 */}
          {/* ================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---- 左侧：工具健康状态 ---- */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-lg p-5",
              )}
            >
              <h2 className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A] mb-4">
                工具健康状态
              </h2>

              {toolHealth.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[12px] text-[#A3A3A3]">
                    暂无工具健康数据
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#E5E5E5]">
                    {toolHealth.map((tool) => (
                      <ToolHealthRow key={tool.name} tool={tool} />
                    ))}
                  </div>

                  {/* 汇总 */}
                  <div
                    className={cn(
                      "flex items-center justify-between pt-3 mt-2",
                      "border-t border-[#E5E5E5]",
                    )}
                  >
                    <span className="text-[12px] leading-[1.5] text-[#737373]">
                      汇总
                    </span>
                    <span
                      className={cn(
                        "text-[12px] leading-[1.5] tabular-nums",
                        toolNormalCount === toolTotalCount
                          ? "text-[#1F7A4D]"
                          : "text-[#B45309]",
                      )}
                    >
                      {toolNormalCount}/{toolTotalCount} 正常
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ---- 右侧：最近操作日志 ---- */}
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-lg p-5",
              )}
            >
              <h2 className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A] mb-4">
                最近操作日志
              </h2>

              {recentLogs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[12px] text-[#A3A3A3]">
                    暂无操作日志
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#E5E5E5]">
                    {recentLogs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </div>

                  {/* 查看全部 */}
                  <div className="pt-3 mt-2 border-t border-[#E5E5E5]">
                    <button
                      type="button"
                      onClick={() => navigate("/admin/logs")}
                      className={cn(
                        "inline-flex items-center gap-1",
                        "text-[12px] leading-[1.5] text-[#737373]",
                        "hover:text-[#0A0A0A] transition-colors duration-150",
                        "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 rounded",
                      )}
                      aria-label="查看全部操作日志"
                    >
                      查看全部日志
                      <ChevronRight
                        size={12}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

export default Dashboard;
