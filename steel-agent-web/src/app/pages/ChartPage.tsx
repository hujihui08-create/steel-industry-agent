// ============================================================
// ChartPage — 独立价格走势图页面
// 路由: /chart?category=xxx&spec=xxx&region=xxx&days=30
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Maximize2, Minimize2, X } from "lucide-react";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { getPriceTrend } from "@/app/api/trend";
import type { TrendDataPoint } from "@/app/types/trend";

// -----------------------------------------------------------
// 周期选项
// -----------------------------------------------------------

const PERIODS = [
  { label: "1周", days: 7 },
  { label: "1月", days: 30 },
  { label: "3月", days: 90 },
  { label: "1年", days: 365 },
] as const;

// -----------------------------------------------------------
// 格式化价格
// -----------------------------------------------------------

function formatPrice(value: number): string {
  return `¥${value.toLocaleString()}`;
}

// -----------------------------------------------------------
// 自定义 Tooltip
// -----------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-steel-line bg-steel-canvas px-3 py-2 text-[12px] leading-[1.5]">
      <p className="text-steel-muted mb-0.5">{label}</p>
      <p className="text-steel-ink font-medium tabular-nums">
        {formatPrice(payload[0].value)}
      </p>
    </div>
  );
}

// -----------------------------------------------------------
// 图表内容区域（独立组件）
// -----------------------------------------------------------

interface ChartContentProps {
  data: TrendDataPoint[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  chartHeight: number;
}

function ChartContent({
  data,
  isLoading,
  isError,
  error,
  onRetry,
  chartHeight,
}: ChartContentProps) {
  // ---- 计算最高/最低点 ----
  const { maxPoint, minPoint } = useMemo(() => {
    if (!data || data.length === 0) return { maxPoint: null, minPoint: null };

    let max = data[0];
    let min = data[0];

    for (const point of data) {
      if (point.price > max.price) max = point;
      if (point.price < min.price) min = point;
    }

    return { maxPoint: max, minPoint: min };
  }, [data]);

  // ---- 计算 Y 轴缓冲区 ----
  const yDomain = useMemo(() => {
    if (!data || data.length === 0) return [0, 100] as [number, number];

    const prices = data.map((d) => d.price);
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);
    const padding = Math.max((maxVal - minVal) * 0.15, 20);

    return [minVal - padding, maxVal + padding] as [number, number];
  }, [data]);

  // ---- 加载中 ----
  if (isLoading) {
    return <LoadingSkeleton variant="chart" className="p-5" />;
  }

  // ---- 错误 ----
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "暂无走势数据"}
        onRetry={onRetry}
      />
    );
  }

  // ---- 空数据 ----
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[320px] text-[13px] text-steel-muted">
        暂无走势数据
      </div>
    );
  }

  return (
    <>
      {/* ---- 走势图 ---- */}
      <div style={{ width: "100%", height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="price_date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#737373" }}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={yDomain} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#0A0A0A"
              strokeWidth={1.5}
              dot={{ r: 2, fill: "#0A0A0A" }}
              activeDot={{ r: 4, fill: "#0A0A0A" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ---- 最高/最低摘要 ---- */}
      {maxPoint && minPoint && (
        <div className="flex justify-between mt-4 px-1">
          <div className="text-left">
            <p className="text-[12px] leading-[1.5] text-steel-muted mb-0.5">
              最高
            </p>
            <p className="text-[15px] leading-[1.6] text-steel-down tabular-nums font-medium">
              {formatPrice(maxPoint.price)}
            </p>
            <p className="text-[11px] leading-[1.5] text-steel-placeholder mt-0.5">
              {maxPoint.price_date}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] leading-[1.5] text-steel-muted mb-0.5">
              最低
            </p>
            <p className="text-[15px] leading-[1.6] text-steel-up tabular-nums font-medium">
              {formatPrice(minPoint.price)}
            </p>
            <p className="text-[11px] leading-[1.5] text-steel-placeholder mt-0.5">
              {minPoint.price_date}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// -----------------------------------------------------------
// 周期切换选项卡
// -----------------------------------------------------------

interface PeriodTabsProps {
  days: number;
  onChange: (days: number) => void;
}

function PeriodTabs({ days, onChange }: PeriodTabsProps) {
  return (
    <div className="flex items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.days}
          type="button"
          onClick={() => onChange(p.days)}
          aria-label={`查看${p.label}走势`}
          className={
            days === p.days
              ? "bg-steel-ink text-steel-canvas rounded-full px-4 py-1.5 text-[13px] leading-[1.5] transition-colors duration-150"
              : "border border-steel-line text-steel-body rounded-full px-4 py-1.5 text-[13px] leading-[1.5] hover:bg-steel-surface transition-colors duration-150"
          }
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// ChartPage
// ============================================================

export default function ChartPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- 从 URL 参数读取查询条件 ----
  const category = searchParams.get("category") || "";
  const spec = searchParams.get("spec") || "";
  const region = searchParams.get("region") || "";
  const initialDays = Number(searchParams.get("days")) || 30;
  const [days, setDays] = useState<number>(initialDays);

  // ---- 全屏状态 ----
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ---- 页面标题 ----
  const pageTitle = useMemo(() => {
    const parts = [category];
    if (spec) parts.push(spec);
    if (region) parts.push(region);
    const label = parts.filter(Boolean).join(" · ");
    return label ? `${label} 价格走势` : "价格走势";
  }, [category, spec, region]);

  // ---- 数据获取 (TanStack Query) ----
  const {
    data: trendData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TrendDataPoint[]>({
    queryKey: ["price-trend", { category, spec, region, days }],
    queryFn: () => getPriceTrend({ category, spec: spec || undefined, region: region || undefined, days }),
    enabled: !!category,
  });

  // ---- 切换周期 ----
  const handlePeriodChange = (newDays: number) => {
    setDays(newDays);
    const next = new URLSearchParams(searchParams);
    next.set("days", String(newDays));
    setSearchParams(next, { replace: true });
  };

  // ---- 全屏切换 ----
  const handleFullscreenToggle = () => {
    setIsFullscreen((prev) => !prev);
  };

  // ---- 没有 category 参数时的提示 ----
  if (!category) {
    return (
      <div className="min-h-screen bg-steel-canvas flex flex-col">
        <PageHeader title="价格走势" onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center">
          <ErrorState message="缺少查询参数，请从价格卡片进入" />
        </div>
      </div>
    );
  }

  const chartHeight = isFullscreen ? 480 : 320;

  // ============================================================
  // 全屏模式
  // ============================================================

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-steel-canvas z-50 flex flex-col">
        {/* 全屏顶部栏 */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-steel-line shrink-0">
          <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
            {pageTitle}
          </h2>
          <div className="flex items-center gap-2">
            <PeriodTabs days={days} onChange={handlePeriodChange} />
            <button
              type="button"
              onClick={handleFullscreenToggle}
              aria-label="退出全屏"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-steel-ink hover:bg-steel-surface transition-colors duration-150"
            >
              <Minimize2 className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="关闭"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-steel-ink hover:bg-steel-surface transition-colors duration-150"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* 全屏图表区域 */}
        <div className="flex-1 overflow-auto p-5">
          <div className="rounded-lg border border-steel-line p-5">
            <ChartContent
              data={trendData ?? []}
              isLoading={isLoading}
              isError={isError}
              error={error as Error | null}
              onRetry={() => refetch()}
              chartHeight={chartHeight}
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 常规页面模式
  // ============================================================

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title={pageTitle}
        onBack={() => navigate(-1)}
        rightAction={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFullscreenToggle}
              aria-label="全屏"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md text-steel-ink hover:bg-steel-surface transition-colors duration-150"
            >
              <Maximize2 className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        }
      />

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto px-4 py-6">
          {/* 周期选择 */}
          <div className="mb-6">
            <PeriodTabs days={days} onChange={handlePeriodChange} />
          </div>

          {/* 图表卡片 */}
          <div className="rounded-lg border border-steel-line p-5">
            <ChartContent
              data={trendData ?? []}
              isLoading={isLoading}
              isError={isError}
              error={error as Error | null}
              onRetry={() => refetch()}
              chartHeight={chartHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
