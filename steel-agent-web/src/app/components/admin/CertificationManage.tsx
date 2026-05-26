import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCertificationList, approveCertification, rejectCertification, type CertificationData } from "@/app/api/certification";

const STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
};

function statusBadge(status: string) {
  const config: Record<string, string> = {
    pending: "text-[#B45309] bg-amber-50",
    approved: "text-[#1F7A4D] bg-emerald-50",
    rejected: "text-[#B42318] bg-rose-50",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 h-5 rounded-full text-[11px] leading-[1.5] font-medium",
        config[status] ?? "text-[#737373] bg-[#F5F5F5]",
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return iso;
  }
}

const PAGE_SIZE = 20;

export default function CertificationManage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<CertificationData | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-certifications", { status: filterStatus || undefined, page }],
    queryFn: async () => {
      const offset = (page - 1) * PAGE_SIZE;
      return getCertificationList(filterStatus || undefined, PAGE_SIZE, offset);
    },
    placeholderData: (prev) => prev,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveCertification(id),
    onSuccess: () => {
      toast.success("认证已通过");
      queryClient.invalidateQueries({ queryKey: ["admin-certifications"] });
      setReviewTarget(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "操作失败");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remark }: { id: number; remark: string }) =>
      rejectCertification(id, remark),
    onSuccess: () => {
      toast.success("认证已驳回");
      queryClient.invalidateQueries({ queryKey: ["admin-certifications"] });
      setReviewTarget(null);
      setShowRejectInput(false);
      setRejectRemark("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "操作失败");
    },
  });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setPage(1);
  };

  const openReview = (item: CertificationData) => {
    setReviewTarget(item);
    setShowRejectInput(false);
    setRejectRemark("");
  };

  const handleApprove = () => {
    if (reviewTarget) approveMutation.mutate(reviewTarget.id);
  };

  const handleReject = () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    if (!rejectRemark.trim()) {
      toast.error("请输入驳回原因");
      return;
    }
    if (reviewTarget) {
      rejectMutation.mutate({ id: reviewTarget.id, remark: rejectRemark.trim() });
    }
  };

  const closeDialog = () => {
    if (!approveMutation.isPending && !rejectMutation.isPending) {
      setReviewTarget(null);
      setShowRejectInput(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] leading-[1.3] font-medium text-[#0A0A0A]">
          企业认证审核
        </h1>
        <div className="flex items-center gap-2">
          <label
            htmlFor="cert-status-filter"
            className="text-[13px] leading-[1.5] text-[#737373]"
          >
            状态
          </label>
          <select
            id="cert-status-filter"
            value={filterStatus}
            onChange={handleStatusChange}
            className={cn(
              "h-8 px-3 rounded-[10px]",
              "border border-[#E5E5E5] bg-white",
              "text-[13px] leading-[1.5] text-[#404040]",
              "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
              "transition-colors duration-150",
              "appearance-none pr-7",
              "bg-no-repeat bg-[length:14px] bg-[right_8px_center]",
            )}
            style={{
              backgroundImage:
                `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div
          className={cn(
            "bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-6",
            "flex flex-col items-center gap-3",
          )}
        >
          <p className="text-[14px] leading-[1.6] text-[#B42318]">
            {error instanceof Error ? error.message : "加载失败，请重试"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className={cn(
              "inline-flex items-center gap-1.5",
              "h-8 px-4 rounded-full",
              "border border-[#B42318]/30 bg-white",
              "text-[13px] leading-[1.5] text-[#B42318]",
              "hover:bg-[#FEF2F2]",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-[#B42318]/10",
            )}
          >
            重试
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-6 h-6 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && !isError && data && data.list.length === 0 && (
        <div
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-2xl",
            "flex flex-col items-center justify-center py-16 gap-2",
          )}
        >
          <p className="text-[15px] leading-[1.6] text-[#404040]">
            暂无认证申请
          </p>
        </div>
      )}

      {!isLoading && !isError && data && data.list.length > 0 && (
        <>
          <div className="border border-[#E5E5E5] rounded-2xl overflow-hidden bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[60px]">
                    ID
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373]">
                    企业名称
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373]">
                    信用代码
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373]">
                    联系人
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373]">
                    联系电话
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[80px]">
                    状态
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[130px]">
                    提交时间
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[90px]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.list.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[#E5E5E5] last:border-b-0",
                      index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                    )}
                  >
                    <td className="px-5 py-3 text-[13px] leading-[1.5] text-[#737373] font-mono">
                      {item.id}
                    </td>
                    <td className="px-5 py-3 text-[13px] leading-[1.5] text-[#0A0A0A]">
                      {item.company_name}
                    </td>
                    <td className="px-5 py-3 text-[13px] leading-[1.5] text-[#404040] font-mono">
                      {item.credit_code}
                    </td>
                    <td className="px-5 py-3 text-[13px] leading-[1.5] text-[#404040]">
                      {item.contact_name}
                    </td>
                    <td className="px-5 py-3 text-[13px] leading-[1.5] text-[#404040]">
                      {item.contact_phone}
                    </td>
                    <td className="px-5 py-3">{statusBadge(item.status)}</td>
                    <td className="px-5 py-3 text-[12px] leading-[1.5] text-[#737373]">
                      {formatTime(item.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      {item.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => openReview(item)}
                          className={cn(
                            "h-7 px-3 rounded-full",
                            "border border-[#0A0A0A]",
                            "text-[12px] leading-[1.5] text-[#0A0A0A]",
                            "hover:bg-[#0A0A0A] hover:text-white",
                            "transition-colors duration-150",
                          )}
                        >
                          审核
                        </button>
                      ) : (
                        <span className="text-[12px] leading-[1.5] text-[#737373]">
                          {item.remark || "已处理"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] leading-[1.5] text-[#737373]">
              共 {total} 条
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className={cn(
                  "h-8 px-3 rounded-md",
                  "border border-[#E5E5E5]",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "hover:border-[#0A0A0A]",
                  "transition-colors duration-150",
                )}
              >
                上一页
              </button>
              <span className="text-[13px] leading-[1.5] text-[#404040]">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  "h-8 px-3 rounded-md",
                  "border border-[#E5E5E5]",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "hover:border-[#0A0A0A]",
                  "transition-colors duration-150",
                )}
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}

      {reviewTarget && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={closeDialog}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className={cn(
                "bg-white border border-[#E5E5E5] rounded-2xl",
                "w-full max-w-md p-6",
              )}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A]">
                  认证详情
                </h2>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="p-1 rounded hover:bg-[#FAFAFA] text-[#737373]"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-[13px] leading-[1.5] text-[#737373]">
                    企业名称
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#0A0A0A]">
                    {reviewTarget.company_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] leading-[1.5] text-[#737373]">
                    信用代码
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040] font-mono">
                    {reviewTarget.credit_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] leading-[1.5] text-[#737373]">
                    联系人
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040]">
                    {reviewTarget.contact_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] leading-[1.5] text-[#737373]">
                    联系电话
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040]">
                    {reviewTarget.contact_phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[13px] leading-[1.5] text-[#737373]">
                    提交时间
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040]">
                    {formatTime(reviewTarget.created_at)}
                  </span>
                </div>
              </div>

              {showRejectInput && (
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[12px] leading-[1.5] text-[#B42318]">
                    驳回原因（必填）
                  </label>
                  <textarea
                    value={rejectRemark}
                    onChange={(e) => setRejectRemark(e.target.value)}
                    rows={3}
                    placeholder="请输入驳回原因..."
                    className={cn(
                      "w-full px-3 py-2 rounded-[10px]",
                      "border border-[#E5E5E5] bg-white",
                      "text-[13px] leading-[1.6] text-[#404040]",
                      "placeholder:text-[#A3A3A3]",
                      "resize-y outline-none",
                      "focus:border-[#B42318] focus:ring-2 focus:ring-[#B42318]/10",
                      "transition-colors duration-150",
                    )}
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={cn(
                    "flex-1 h-9 rounded-full",
                    "border border-[#1F7A4D]",
                    "text-[13px] leading-[1.5] text-[#1F7A4D]",
                    "hover:bg-[#1F7A4D] hover:text-white",
                    "transition-colors duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {approveMutation.isPending ? "处理中..." : "通过"}
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={cn(
                    "flex-1 h-9 rounded-full",
                    "border border-[#B42318]",
                    "text-[13px] leading-[1.5] text-[#B42318]",
                    "hover:bg-[#B42318] hover:text-white",
                    "transition-colors duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {rejectMutation.isPending
                    ? "处理中..."
                    : showRejectInput
                      ? "确认驳回"
                      : "驳回"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
