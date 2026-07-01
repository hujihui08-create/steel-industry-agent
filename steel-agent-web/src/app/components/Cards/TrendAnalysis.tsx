// ============================================================
// TrendAnalysis — 趋势分析
// 品种 + 时间范围选择 + recharts LineChart (实线历史 + 虚线预测)
// Tabs 日期范围选择器 + Alert 季节性提示
// ============================================================

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getPriceTrend } from "@/app/api/trend";
import type { TrendDataPoint } from "@/app/types/trend";

const CATEGORIES = ["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板"];

const TIME_RANGES = [
  { label: "1周", days: 7 },
  { label: "1月", days: 30 },
  { label: "3月", days: 90 },
  { label: "半年", days: 180 },
  { label: "1年", days: 365 },
] as const;

// ---- Simple moving average prediction ----
function predictNextPoints(
  data: TrendDataPoint[],
  count: number
): { price_date: string; price: number; isPrediction: boolean }[] {
  if (data.length < 3) return [];

  const lastPrices = data.slice(-5).map((d) => d.price);
  const avg = lastPrices.reduce((a, b) => a + b, 0) / lastPrices.length;

  const result: { price_date: string; price: number; isPrediction: boolean }[] = [];
  const lastDate = new Date(data[data.length - 1].price_date);

  for (let i = 1; i <= count; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + i);
    // Simple linear extrapolation with slight noise
    const trend = data.length >= 10
      ? (data[data.length - 1].price - data[data.length - 10].price) / 10
      : 0;
    const predicted = avg + trend * i + (Math.random() - 0.5) * 20;

    result.push({
      price_date: nextDate.toISOString().slice(0, 10),
      price: Math.round(predicted),
      isPrediction: true,
    });
  }

  return result;
}

export function TrendAnalysis() {
  const [category, setCategory] = useState("螺纹钢");
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState("chart");

  const { data, isLoading } = useQuery({
    queryKey: ["trend-analysis", category, days],
    queryFn: () =>
      getPriceTrend({
        category,
        days,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { historical: [], combined: [] };

    const historical = data.map((d) => ({
      date: d.price_date.slice(5), // MM-DD
      price: d.price,
      isPrediction: false,
    }));

    const predictions = predictNextPoints(data, 7);
    const combined = [
      ...data.map((d) => ({
        date: d.price_date.slice(5),
        price: d.price,
        isPrediction: false,
      })),
      ...predictions.map((p) => ({
        date: p.price_date.slice(5),
        price: p.price,
        isPrediction: true,
      })),
    ];

    return { historical, combined };
  }, [data]);

  const stats = useMemo(() => {
    if (!data || data.length < 2) return null;
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = last - first;
    const changePct = first !== 0 ? ((change / first) * 100).toFixed(2) : "0";
    return { min, max, avg: Math.round(avg), change, changePct };
  }, [data]);

  const formatPrice = (price: number) =>
    `\u00A5${price.toLocaleString("zh-CN")}`;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { date: string; price: number; isPrediction: boolean } }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-sm">
        <p className="text-[12px] leading-[16px] text-muted-foreground">
          {label}
          {item.isPrediction && " (预测)"}
        </p>
        <p className="text-[14px] leading-[20px] font-semibold tabular-nums">
          {formatPrice(item.price)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ---- Controls ---- */}
      <Card className="rounded-xl border-border">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-[140px]" aria-label="品种选择">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time Range Tabs */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.days}
                  type="button"
                  onClick={() => setDays(tr.days)}
                  className={
                    days === tr.days
                      ? "bg-background text-foreground rounded-sm px-3 py-1 text-[13px] leading-[18px] shadow-sm transition-colors duration-150"
                      : "text-muted-foreground hover:text-foreground rounded-sm px-3 py-1 text-[13px] leading-[18px] transition-colors duration-150"
                  }
                >
                  {tr.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Seasonal Tip ---- */}
      <Alert className="rounded-lg border-border bg-accent-blue/5">
        <Info className="size-4 text-accent-blue-foreground" strokeWidth={2} />
        <AlertDescription className="text-[13px] leading-[18px] text-muted-foreground">
          {category}当前处于需求旺季，价格波动较大。建议关注市场供需变化，
          合理设置价格预警。
        </AlertDescription>
      </Alert>

      {/* ---- Chart ---- */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-[16px] leading-[24px]">
            {category} 价格走势
          </CardTitle>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            虚线部分为基于历史数据的趋势预测，仅供参考
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : !data || data.length === 0 ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                暂无走势数据
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData.combined}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `\u00A5${(v / 1000).toFixed(1)}k`}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {/* Historical line (solid) */}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                    data={chartData.combined.filter((d) => !d.isPrediction)}
                    name="历史价格"
                  />

                  {/* Last data point as ReferenceLine */}
                  {chartData.combined.filter((d) => !d.isPrediction).length > 0 && (
                    <ReferenceLine
                      x={
                        chartData.combined.filter((d) => !d.isPrediction)[
                          chartData.combined.filter((d) => !d.isPrediction).length - 1
                        ].date
                      }
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  )}

                  {/* Prediction line (dashed) */}
                  {chartData.combined.some((d) => d.isPrediction) && (
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
                      data={chartData.combined.filter((d) => d.isPrediction)}
                      name="预测价格"
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>

              {/* ---- Stats ---- */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] leading-[16px] text-muted-foreground">
                      当前价
                    </p>
                    <p className="text-[16px] leading-[24px] font-semibold tabular-nums">
                      {formatPrice(stats.max)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] leading-[16px] text-muted-foreground">
                      最低价
                    </p>
                    <p className="text-[16px] leading-[24px] font-semibold tabular-nums">
                      {formatPrice(stats.min)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] leading-[16px] text-muted-foreground">
                      均价
                    </p>
                    <p className="text-[16px] leading-[24px] font-semibold tabular-nums">
                      {formatPrice(stats.avg)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] leading-[16px] text-muted-foreground">
                      涨跌
                    </p>
                    <p
                      className={`text-[16px] leading-[24px] font-semibold tabular-nums ${
                        stats.change >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {stats.change >= 0 ? "+" : ""}
                      {stats.change} ({stats.change >= 0 ? "+" : ""}
                      {stats.changePct}%)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
