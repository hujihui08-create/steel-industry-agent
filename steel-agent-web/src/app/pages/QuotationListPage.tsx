import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { EmptyState } from "@/app/components/shared/EmptyState";

import { getQuotationList, deleteQuotation } from "@/app/api/quotations";
import type { Quotation } from "@/app/types/quotation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

// -----------------------------------------------------------
// Status badge mapping
// -----------------------------------------------------------

const STATUS_MAP: Record<Quotation["status"], { label: string; color: string }> = {
  draft:    { label: "草稿",   color: "text-steel-muted" },
  sent:     { label: "已发送", color: "text-steel-up" },
  accepted: { label: "已接受", color: "text-steel-up" },
  rejected: { label: "已拒绝", color: "text-steel-down" },
};

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function formatPrice(value: number): string {
  return `\u00A5${value.toLocaleString("zh-CN")}`;
}

/** YYYY-MM-DD HH:mm:ss → MM-DD HH:mm or as-is fallback */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

// -----------------------------------------------------------
// QuotationListPage
// -----------------------------------------------------------

export default function QuotationListPage() {
  const navigate = useNavigate();

  const {
    data: quotations,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["quotations"],
    queryFn: getQuotationList,
    staleTime: 60_000,
  });

  // --- Handlers ---

  const handleDelete = async (e: React.MouseEvent, item: Quotation) => {
    e.stopPropagation(); // prevent navigating to detail
    if (!window.confirm("确定要删除此报价单吗？")) return;
    try {
      await deleteQuotation(item.id);
      toast.success("报价单已删除");
      refetch();
    } catch {
      toast.error("删除失败，请重试");
    }
  };

  const handleEdit = (e: React.MouseEvent, item: Quotation) => {
    e.stopPropagation(); // prevent navigating to detail
    navigate(`/quotations/${item.id}?edit=true`);
  };

  // --- Render helpers ---

  const renderContent = () => {
    // Loading
    if (isLoading) {
      return (
        <div className="max-w-[720px] mx-auto px-4 py-4">
          <LoadingSkeleton variant="list" count={3} />
        </div>
      );
    }

    // Error
    if (isError) {
      return <ErrorState onRetry={() => refetch()} />;
    }

    // Empty
    if (!quotations || quotations.length === 0) {
      return (
        <EmptyState
          title="暂无报价单"
          description="发起一次对话即可生成报价单"
        />
      );
    }

    // List
    return (
      <div className="max-w-[720px] mx-auto px-4 py-4 space-y-2">
        {quotations.map((item) => {
          const status = STATUS_MAP[item.status];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/quotations/${item.id}`)}
              className="w-full text-left rounded-2xl border border-steel-line bg-steel-canvas p-4 hover:bg-steel-surface/50 transition-colors duration-150"
            >
              {/* Row 1: title + status badge */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[15px] leading-[1.6] text-steel-ink truncate flex-1 min-w-0">
                  {item.title}
                </h3>
                <span
                  className={`inline-block shrink-0 text-[12px] leading-[1.5] ${status.color}`}
                >
                  {status.label}
                </span>
              </div>

              {/* Row 2: customer + total price */}
              <div className="flex items-baseline justify-between mt-1.5">
                <span className="text-[13px] leading-[1.5] text-steel-body truncate flex-1 min-w-0">
                  {item.customer_name}
                </span>
                <span className="text-[15px] leading-[1.6] font-medium text-steel-ink tabular-nums shrink-0 ml-4">
                  {formatPrice(item.total_price)}
                </span>
              </div>

              {/* Row 3: date */}
              <p className="text-[12px] leading-[1.5] text-steel-placeholder mt-1">
                {formatDate(item.created_at)}
              </p>

              {/* Row 4: action buttons */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-steel-line">
                <button
                  type="button"
                  onClick={(e) => handleEdit(e, item)}
                  className="inline-flex items-center gap-1 text-[12px] leading-[1.5] text-steel-body hover:text-steel-ink transition-colors duration-150"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  编辑
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item)}
                  className="inline-flex items-center gap-1 text-[12px] leading-[1.5] text-steel-down transition-colors duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  删除
                </button>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="我的报价单"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}
