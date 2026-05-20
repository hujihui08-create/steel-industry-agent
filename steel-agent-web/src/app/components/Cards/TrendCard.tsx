import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TrendCardProps {
  title: string;
  data: TrendDataPoint[];
  changePct?: number;
  period?: string;
}

function formatValue(value: number): string {
  if (value >= 1000) {
    return `¥${value.toLocaleString()}`;
  }
  return String(value);
}

export function TrendCard({
  title,
  data,
  changePct,
  period,
}: TrendCardProps) {
  const isUp = changePct != null && changePct >= 0;
  const isDown = changePct != null && changePct < 0;
  const trendColor = isUp ? "text-steel-up" : isDown ? "text-steel-down" : "";
  const trendLabel =
    changePct != null
      ? `${isUp ? "+" : ""}${changePct.toFixed(2)}%`
      : null;

  const lastValue = data.length > 0 ? data[data.length - 1].value : null;

  // Compute Y-axis domain with padding
  const values = data.map((d) => d.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 0;
  const padding = Math.max((maxVal - minVal) * 0.15, 20);

  return (
    <div className="rounded-2xl border border-steel-line p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <h3 className="text-[18px] leading-[1.4] font-medium text-steel-ink">
            {title}
          </h3>
          {period && (
            <span className="text-[12px] leading-[1.5] text-steel-muted mt-0.5 block">
              {period}
            </span>
          )}
        </div>
        <div className="text-right shrink-0 ml-4">
          {lastValue != null && (
            <div className="text-[18px] tabular-nums text-steel-ink">
              {formatValue(lastValue)}
            </div>
          )}
          {trendLabel && (
            <div
              className={`flex items-center justify-end gap-0.5 text-[11px] leading-[1.5] tabular-nums ${trendColor}`}
            >
              {isUp ? (
                <ArrowUpRight className="size-3" strokeWidth={2} />
              ) : (
                <ArrowDownRight className="size-3" strokeWidth={2} />
              )}
              {trendLabel}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px] w-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[13px] text-steel-muted">
            暂无走势数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--steel-placeholder)" }}
              />
              <YAxis
                hide
                domain={[minVal - padding, maxVal + padding]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--steel-canvas)",
                  border: "1px solid var(--steel-line)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "inherit",
                }}
                labelStyle={{ color: "var(--steel-muted)" }}
                formatter={(value: number) => [formatValue(value), ""]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--steel-ink)"
                strokeWidth={1.5}
                dot={{ r: 2, fill: "var(--steel-ink)" }}
                activeDot={{ r: 4, fill: "var(--steel-ink)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default TrendCard;
