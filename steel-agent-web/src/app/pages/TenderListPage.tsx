// ============================================================
// TenderListPage — 招标列表页
// 展示招标信息列表：状态、标题、预算、地区、截止日期
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { EmptyState } from "@/app/components/shared/EmptyState";

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
      return <LoadingSkeleton variant="list" count={3} className="px-4 pt-4" />;
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
      <div className="divide-y divide-steel-line">
        {tenders.map((item) => {
          const status = STATUS_MAP[item.status];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/tenders/${item.id}`)}
              className="w-full text-left px-4 py-4 hover:bg-steel-surface transition-colors duration-150 block"
            >
              {/* Row 1: status dot + title + status label */}
              <div className="flex items-start gap-2">
                <span className={`text-[12px] leading-none mt-[3px] shrink-0 ${status.dotColor}`}>
                  {status.dot}
                </span>
                <h3 className="text-[15px] leading-[1.6] text-steel-ink truncate flex-1 min-w-0">
                  {item.title}
                </h3>
                <span className="text-[12px] leading-[1.5] text-steel-muted shrink-0">
                  {status.label}
                </span>
              </div>

              {/* Row 2: region + category + budget */}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[13px] leading-[1.5] text-steel-body truncate flex-1 min-w-0">
                  {item.region} \u00B7 {item.category}
                </span>
                <span className="text-[15px] leading-[1.6] font-medium text-steel-ink tabular-nums shrink-0 ml-4">
                  {formatBudget(item.budget)}
                </span>
              </div>

              {/* Row 3: deadline */}
              <p className="text-[12px] leading-[1.5] text-steel-placeholder mt-1">
                投标截止 {formatDate(item.bid_deadline)}
              </p>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="招投标管理"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}
