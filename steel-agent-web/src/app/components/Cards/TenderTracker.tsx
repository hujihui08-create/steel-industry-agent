// ============================================================
// TenderTracker — 招标追踪
// 过滤栏 + 招标列表 Table + 收藏 + 截止倒计时
// ============================================================

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, ExternalLink } from "lucide-react";
import { getTenderList } from "@/app/api/tenders";
import type { TenderDetail } from "@/app/types/tender";
import { useTenderFavorite } from "@/app/hooks/useTenderFavorite";
import { cn } from "@/lib/utils";

const REGIONS = ["全部", "上海", "北京", "广州", "杭州", "南京", "武汉", "成都"];
const CATEGORIES = ["全部", "螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板"];

function computeDeadline(dateStr: string): { days: number; hours: number; isExpired: boolean } {
  const now = new Date();
  const deadline = new Date(dateStr);
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) return { days: 0, hours: 0, isExpired: true };

  const totalHours = diffMs / (1000 * 60 * 60);
  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);
  return { days, hours, isExpired: false };
}

function TenderDeadlineCell({ deadline }: { deadline: string }) {
  const { days, hours, isExpired } = computeDeadline(deadline);

  if (isExpired) {
    return (
      <span className="text-[12px] leading-[16px] text-muted-foreground">
        已截止
      </span>
    );
  }

  if (days > 0) {
    return (
      <span className="text-[12px] leading-[16px] text-destructive font-medium tabular-nums">
        {days} 天 {hours} 时
      </span>
    );
  }

  return (
    <span className="text-[12px] leading-[16px] text-destructive font-bold tabular-nums animate-pulse">
      {hours} 小时后截止
    </span>
  );
}

export function TenderTracker() {
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("全部");
  const [category, setCategory] = useState("全部");

  const { isFavorited, toggleFavorite } = useTenderFavorite();

  const { data: tenders, isLoading } = useQuery({
    queryKey: ["tender-tracker"],
    queryFn: getTenderList,
    staleTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => {
    if (!tenders) return [];
    return tenders.filter((t: TenderDetail) => {
      if (keyword && !t.title.toLowerCase().includes(keyword.toLowerCase())) {
        return false;
      }
      if (region !== "全部" && t.region !== region) {
        return false;
      }
      if (category !== "全部" && t.category !== category) {
        return false;
      }
      return true;
    });
  }, [tenders, keyword, region, category]);

  const formatBudget = (budget: number) => {
    if (budget >= 10000) {
      return `\u00A5${(budget / 10000).toFixed(1)}万`;
    }
    return `\u00A5${budget.toLocaleString("zh-CN")}`;
  };

  return (
    <div className="space-y-6">
      {/* ---- Filter Bar ---- */}
      <Card className="rounded-xl border-border">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Keyword */}
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                strokeWidth={2}
                aria-hidden="true"
              />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索招标标题..."
                className="h-9 pl-9"
                aria-label="搜索招标标题"
              />
            </div>

            {/* Region */}
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-9 w-[120px]" aria-label="区域筛选">
                <SelectValue placeholder="区域" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 w-[120px]" aria-label="品种筛选">
                <SelectValue placeholder="品种" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-[13px] leading-[18px] text-muted-foreground">
              共 {filtered.length} 条
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ---- Tender List ---- */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-[16px] leading-[24px]">
            招标列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] leading-[18px] text-muted-foreground text-center py-12">
              {keyword || region !== "全部" || category !== "全部"
                ? "没有匹配的招标信息"
                : "暂无招标信息"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="text-[13px]">招标标题</TableHead>
                    <TableHead className="text-[13px]">区域</TableHead>
                    <TableHead className="text-[13px]">品种</TableHead>
                    <TableHead className="text-[13px] text-right">预算</TableHead>
                    <TableHead className="text-[13px]">截止日期</TableHead>
                    <TableHead className="text-[13px]">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t: TenderDetail) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(t.id)}
                          className="p-0.5 rounded-sm hover:bg-accent transition-colors duration-150"
                          aria-label={isFavorited(t.id) ? "取消收藏" : "收藏"}
                        >
                          <Star
                            className={cn(
                              "size-4",
                              isFavorited(t.id)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/40"
                            )}
                            strokeWidth={2}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-[14px] leading-[20px] max-w-[300px] truncate">
                        {t.title}
                      </TableCell>
                      <TableCell className="text-[13px] leading-[18px] text-muted-foreground">
                        {t.region}
                      </TableCell>
                      <TableCell className="text-[13px] leading-[18px]">
                        {t.category}
                      </TableCell>
                      <TableCell className="text-[14px] leading-[20px] text-right tabular-nums">
                        {formatBudget(t.budget)}
                      </TableCell>
                      <TableCell>
                        <TenderDeadlineCell deadline={t.deadline} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[12px] leading-[16px]",
                            t.status === "open"
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {t.status === "open" ? "进行中" : "已关闭"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
