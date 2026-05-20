import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";

import { getQuotationDetail } from "@/app/api/quotations";
import type { Quotation } from "@/app/types/quotation";

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

// -----------------------------------------------------------
// Shared row layout
// -----------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-3">
      <span className="text-[15px] leading-[1.6] text-steel-body shrink-0">
        {label}
      </span>
      <span className="text-[15px] leading-[1.6] text-steel-ink tabular-nums text-right ml-4">
        {value}
      </span>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <span className="text-[15px] leading-[1.6] text-steel-body">
        {label}
      </span>
      <span className="text-[15px] leading-[1.6] text-steel-ink tabular-nums ml-4">
        {value}
      </span>
    </div>
  );
}

// -----------------------------------------------------------
// QuotationDetailPage
// -----------------------------------------------------------

export default function QuotationDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    data: quotation,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["quotation", id],
    queryFn: () => getQuotationDetail(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  const handleAction = (name: string) => {
    toast("功能开发中", {
      description: `${name}功能即将上线`,
    });
  };

  // --- Render helpers ---

  const renderContent = () => {
    // Loading
    if (isLoading) {
      return (
        <div className="max-w-[720px] mx-auto px-4 py-6">
          <LoadingSkeleton variant="card" />
        </div>
      );
    }

    // Error
    if (isError || !quotation) {
      return <ErrorState onRetry={() => refetch()} />;
    }

    const status = STATUS_MAP[quotation.status];

    return (
      <div className="max-w-[720px] mx-auto px-4 py-6">
        {/* Status badge */}
        <div className="mb-3">
          <span
            className={`inline-block text-[12px] leading-[1.5] ${status.color}`}
          >
            {status.label}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink mb-6">
          {quotation.title}
        </h1>

        {/* Info section */}
        <div className="divide-y divide-steel-line">
          <InfoRow label="品种" value={quotation.category} />
          <InfoRow label="规格" value={quotation.spec} />
          <InfoRow
            label="数量"
            value={`${quotation.quantity.toLocaleString("zh-CN")} ${quotation.unit}`}
          />
          {quotation.delivery_location && (
            <InfoRow label="收货地" value={quotation.delivery_location} />
          )}
          <InfoRow label="客户" value={quotation.customer_name} />
        </div>

        {/* Cost breakdown */}
        <div className="mt-6 bg-steel-surface rounded-2xl p-5 border border-steel-line">
          <CostRow label="材料费" value={formatPrice(quotation.material_cost)} />
          <CostRow label="加工费" value={formatPrice(quotation.process_cost)} />
          <CostRow label="运费" value={formatPrice(quotation.freight_cost)} />
          <CostRow label="税费" value={formatPrice(quotation.tax_cost)} />

          <div className="border-t border-steel-line my-3" />

          <div className="flex items-baseline justify-between">
            <span className="text-[15px] leading-[1.6] text-steel-muted">
              合计
            </span>
            <span className="text-[24px] leading-[1.3] font-medium text-steel-ink tabular-nums">
              {formatPrice(quotation.total_price)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          {["保存", "分享", "重新计算"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleAction(label)}
              className="inline-flex items-center rounded-full border border-steel-line text-[13px] text-steel-ink px-4 py-2 hover:bg-steel-surface transition-colors duration-150"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader
        title="报价单详情"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}
