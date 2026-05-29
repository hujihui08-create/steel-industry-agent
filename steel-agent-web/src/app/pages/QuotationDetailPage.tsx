import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, FileDown, RefreshCw, Save, X } from "lucide-react";

import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { Input } from "@/components/ui/input";

import {
  getQuotationDetail,
  updateQuotation,
  deleteQuotation,
  exportQuotationPDF,
  calculateQuotation,
} from "@/app/api/quotations";
import type { CalculateQuotationResult } from "@/app/api/quotations";
import type { Quotation } from "@/app/types/quotation";

// -----------------------------------------------------------
// Status badge mapping
// -----------------------------------------------------------

const STATUS_MAP: Record<Quotation["status"], { label: string; color: string }> = {
  draft: { label: "草稿", color: "text-steel-muted" },
  sent: { label: "已发送", color: "text-steel-up" },
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
// Shared row layout (view mode)
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

// -----------------------------------------------------------
// Edit mode row layout
// -----------------------------------------------------------

function EditRow({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[15px] leading-[1.6] text-steel-body shrink-0">
        {label}
      </span>
      <Input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-[10px] border-steel-line text-[15px] text-right w-[200px]"
      />
    </div>
  );
}

// -----------------------------------------------------------
// Cost row (shared between view and recalculated display)
// -----------------------------------------------------------

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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // --- Edit mode state ---
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    delivery_location: "",
    spec: "",
    quantity: "",
    unit: "",
  });

  // --- Recalculated costs state ---
  const [costs, setCosts] = useState<CalculateQuotationResult | null>(null);

  // --- Query ---
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

  // --- Auto-enter edit mode from URL param ---
  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      setIsEditing(true);
    }
  }, [searchParams]);

  // --- Populate edit form when entering edit mode ---
  useEffect(() => {
    if (isEditing && quotation) {
      setEditForm({
        customer_name: quotation.customer_name || "",
        delivery_location: quotation.delivery_location || "",
        spec: quotation.spec || "",
        quantity: String(quotation.quantity || ""),
        unit: quotation.unit || "",
      });
    }
  }, [isEditing, quotation]);

  // --- Enter / exit edit mode ---
  const enterEditMode = () => setIsEditing(true);

  const cancelEdit = () => {
    setIsEditing(false);
    setCosts(null);
  };

  // --- Save mutation ---
  const saveMutation = useMutation({
    mutationFn: () =>
      updateQuotation(Number(id), {
        customer_name: editForm.customer_name,
        delivery_location: editForm.delivery_location,
        spec: editForm.spec,
        quantity: Number(editForm.quantity),
        unit: editForm.unit,
      }),
    onSuccess: () => {
      toast("修改已保存");
      setIsEditing(false);
      setCosts(null);
      queryClient.invalidateQueries({ queryKey: ["quotation", id] });
      refetch();
    },
    onError: () => {
      toast("保存失败，请重试");
    },
  });

  // --- Delete mutation ---
  const deleteMutation = useMutation({
    mutationFn: () => deleteQuotation(Number(id)),
    onSuccess: () => {
      toast("报价单已删除");
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      navigate("/quotations", { replace: true });
    },
    onError: () => {
      toast("删除失败，请重试");
    },
  });

  // --- Handlers ---
  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm("确定要删除此报价单吗？")) {
      deleteMutation.mutate();
    }
  };

  const handleExportPDF = async () => {
    toast("正在导出...");
    try {
      await exportQuotationPDF(Number(id));
    } catch {
      toast("导出失败，请重试");
    }
  };

  const handleRecalculate = async () => {
    if (!quotation) return;
    try {
      const result = await calculateQuotation({
        category: quotation.category,
        spec: quotation.spec,
        quantity: quotation.quantity,
      });
      setCosts(result);
      toast("费用已重新计算");
    } catch {
      toast("重新计算失败，请重试");
    }
  };

  // -----------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------

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
    const displayCosts = costs || quotation;

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
          {/* Category - read-only */}
          <InfoRow label="品种" value={quotation.category} />

          {/* Editable fields */}
          {isEditing ? (
            <>
              <EditRow
                label="规格"
                value={editForm.spec}
                onChange={(v) =>
                  setEditForm((prev) => ({ ...prev, spec: v }))
                }
              />
              <EditRow
                label="数量"
                value={editForm.quantity}
                onChange={(v) =>
                  setEditForm((prev) => ({ ...prev, quantity: v }))
                }
                type="number"
              />
              <EditRow
                label="单位"
                value={editForm.unit}
                onChange={(v) =>
                  setEditForm((prev) => ({ ...prev, unit: v }))
                }
              />
              <EditRow
                label="收货地"
                value={editForm.delivery_location}
                onChange={(v) =>
                  setEditForm((prev) => ({ ...prev, delivery_location: v }))
                }
              />
              <EditRow
                label="客户"
                value={editForm.customer_name}
                onChange={(v) =>
                  setEditForm((prev) => ({ ...prev, customer_name: v }))
                }
              />
            </>
          ) : (
            <>
              <InfoRow label="规格" value={quotation.spec} />
              <InfoRow
                label="数量"
                value={`${quotation.quantity.toLocaleString("zh-CN")} ${quotation.unit}`}
              />
              {quotation.delivery_location && (
                <InfoRow label="收货地" value={quotation.delivery_location} />
              )}
              <InfoRow label="客户" value={quotation.customer_name} />
            </>
          )}

          {/* Status - read-only */}
          <InfoRow label="状态" value={status.label} />
        </div>

        {/* Cost breakdown */}
        <div className="mt-6 bg-steel-surface rounded-2xl p-5 border border-steel-line">
          <CostRow label="材料费" value={formatPrice(displayCosts.material_cost)} />
          <CostRow label="加工费" value={formatPrice(displayCosts.process_cost)} />
          <CostRow label="运费" value={formatPrice(displayCosts.freight_cost)} />
          <CostRow label="税费" value={formatPrice(displayCosts.tax_cost)} />

          <div className="border-t border-steel-line my-3" />

          <div className="flex items-baseline justify-between">
            <span className="text-[15px] leading-[1.6] text-steel-muted">
              合计
            </span>
            <span className="text-[24px] leading-[1.3] font-medium text-steel-ink tabular-nums">
              {formatPrice(displayCosts.total_price)}
            </span>
          </div>

          {/* Recalculated notice */}
          {costs && (
            <div className="mt-3 pt-2 border-t border-steel-line">
              <span className="text-[12px] leading-[1.5] text-steel-warn">
                已重新计算（未保存）
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-steel-ink text-white border border-steel-ink text-[13px] px-4 py-2 hover:bg-steel-body transition-colors duration-150"
              >
                <Save className="h-4 w-4" strokeWidth={1.75} />
                {saveMutation.isPending ? "保存中..." : "保存"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line text-[13px] text-steel-ink px-4 py-2 hover:bg-steel-surface transition-colors duration-150"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
                取消
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={enterEditMode}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line text-[13px] text-steel-ink px-4 py-2 hover:bg-steel-surface transition-colors duration-150"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
                编辑
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line text-[13px] text-steel-ink px-4 py-2 hover:bg-steel-surface transition-colors duration-150"
              >
                <FileDown className="h-4 w-4" strokeWidth={1.75} />
                导出 PDF
              </button>
              <button
                type="button"
                onClick={handleRecalculate}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line text-[13px] text-steel-ink px-4 py-2 hover:bg-steel-surface transition-colors duration-150"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
                重新计算
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line text-[13px] text-steel-down px-4 py-2 hover:border-steel-down hover:bg-steel-surface transition-colors duration-150"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                {deleteMutation.isPending ? "删除中..." : "删除"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader title="报价单详情" onBack={() => navigate(-1)} />

      <div className="flex-1">{renderContent()}</div>
    </div>
  );
}
