// ============================================================
// TenderListPage — 招标列表页
// 展示招标信息列表：状态、标题、预算、地区、截止日期
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// 参考组件: spec/RichCards > ListCard
// ============================================================

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { getTenderList } from "@/app/api/tenders";
import type { TenderDetail } from "@/app/types/tender";

// -----------------------------------------------------------
// Status config
// -----------------------------------------------------------

const STATUS_MAP: Record<TenderDetail["status"], { dot: string; dotColor: string; label: string }> = {
  open:   { dot: "\u25CF", dotColor: "text-steel-ink",       label: "进行中" },
  closed: { dot: "\u25CB", dotColor: "text-steel-placeholder", label: "已截止" },
  won:    { dot: "\u25CF", dotColor: "text-steel-up",         label: "已中标" },
  lost:   { dot: "\u25CF", dotColor: "text-steel-down",       label: "未中标" },
};

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function formatBudget(value: number): string {
  return `\u00A5${value.toLocaleString("zh-CN")}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}-${dd}`;
  } catch {
    return dateStr;
  }
}

// ============================================================
// TenderListPage
// ============================================================

export default function TenderListPage() {
  const navigate = useNavigate();

  const {
    data: tenders,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["tenders"],
    queryFn: getTenderList,
    staleTime: 60_000,
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="max-w-[720px] mx-auto px-4 py-4">
          <LoadingSkeleton variant="card" />
        </div>
      );
    }

    if (isError) {
      return <ErrorState onRetry={() => refetch()} />;
    }

    if (!tenders || tenders.length === 0) {
      return (
        <EmptyState
          title="暂无招标信息"
          description="当前没有匹配的招标项目"
        />
      );
    }

    return (
      <div className="max-w-[720px] mx-auto px-4 py-4">
        <Card className="rounded-2xl border-steel-line gap-0 py-0 overflow-hidden">
          <CardHeader className="px-5 py-4 border-b border-steel-line flex-row items-center justify-between space-y-0">
            <div>
              <div className="text-[11px] tracking-[0.18em] uppercase text-steel-muted">TENDERS</div>
              <div className="text-[15px] leading-[1.6] text-steel-ink mt-0.5">
                最新招标 · {tenders.length} 条
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-steel-line">
            {tenders.map((item) => {
              const status = STATUS_MAP[item.status];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/tenders/${item.id}`)}
                  className="w-full text-left px-5 py-3.5 flex items-start justify-between gap-4 hover:bg-steel-surface transition-colors duration-150"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] leading-none shrink-0 ${status.dotColor}`}>
                        {status.dot}
                      </span>
                      <span className="text-[14px] leading-[1.6] text-steel-ink truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[12px] leading-[1.5] text-steel-muted">
                        <Calendar className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                        截止 {formatDate(item.bid_deadline)}
                      </span>
                      <span className="text-[12px] leading-[1.5] text-steel-muted">
                        {item.region}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <Badge
                      variant="outline"
                      className="rounded text-[11px] leading-[1.5] border-steel-line text-steel-muted font-normal px-1.5"
                    >
                      {item.category}
                    </Badge>
                    <span className="text-[14px] leading-[1.6] font-medium text-steel-ink tabular-nums">
                      {formatBudget(item.budget)}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="招标管理"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}
