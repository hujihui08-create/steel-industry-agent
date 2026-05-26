import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFeedbackList, type FeedbackData } from "@/app/api/feedback";

const TYPE_OPTIONS = [
  { value: "", label: "全部" },
  { value: "bug", label: "Bug" },
  { value: "suggestion", label: "建议" },
  { value: "question", label: "问题" },
  { value: "other", label: "其他" },
];

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  suggestion: "建议",
  question: "问题",
  other: "其他",
};

function typeBadge(type: string) {
  const config: Record<string, string> = {
    bug: "text-[#B42318] bg-[#FEF2F2]",
    suggestion: "text-[#1F7A4D] bg-[#ECFDF5]",
    question: "text-[#0A0A0A] bg-[#FAFAFA]",
    other: "text-[#737373] bg-[#F5F5F5]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 h-5 rounded-full text-[11px] leading-[1.5] font-medium",
        config[type] ?? config.other,
      )}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function truncate(text: string, max = 50): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
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

export default function FeedbackManage() {
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<FeedbackData | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-feedbacks", { type: filterType, page }],
    queryFn: async () => {
      const typeParam = filterType || undefined;
      const offset = (page - 1) * PAGE_SIZE;
      return getFeedbackList(typeParam, PAGE_SIZE, offset);
    },
    placeholderData: (prev) => prev,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value);
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] leading-[1.3] font-medium text-[#0A0A0A]">
          用户反馈
        </h1>
        <div className="flex items-center gap-2">
          <label
            htmlFor="feedback-type-filter"
            className="text-[13px] leading-[1.5] text-[#737373]"
          >
            类型
          </label>
          <select
            id="feedback-type-filter"
            value={filterType}
            onChange={handleTypeChange}
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
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
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
            暂无用户反馈
          </p>
        </div>
      )}

      {!isLoading && !isError && data && data.list.length > 0 && (
        <>
          <div className="border border-[#E5E5E5] rounded-2xl overflow-hidden bg-white">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[100px]">
                    类型
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373]">
                    内容
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[100px]">
                    用户ID
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[160px]">
                    时间
                  </th>
                  <th className="px-5 py-3 text-left text-[12px] font-medium text-[#737373] w-[100px]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.list.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E5E5E5] last:border-b-0 hover:bg-[#FAFAFA]/50 transition-colors duration-150"
                  >
                    <td className="px-5 py-3">{typeBadge(item.type)}</td>
                    <td className="px-5 py-3">
                      <span className="text-[13px] leading-[1.6] text-[#404040]">
                        {truncate(item.content)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[13px] leading-[1.6] text-[#404040] tabular-nums">
                        {item.user_id}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[13px] leading-[1.6] text-[#737373] tabular-nums">
                        {formatTime(item.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setDetail(item)}
                        className={cn(
                          "inline-flex items-center gap-1",
                          "h-7 px-2.5 rounded-full",
                          "border border-[#E5E5E5] bg-white",
                          "text-[12px] leading-[1.5] text-[#404040]",
                          "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                          "transition-colors duration-150",
                          "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                        )}
                        aria-label={`查看反馈 ${item.id} 详情`}
                      >
                        <Eye size={12} strokeWidth={1.75} />
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] leading-[1.5] text-[#737373] tabular-nums">
              共 {total} 条
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "inline-flex items-center justify-center",
                  "h-8 px-2.5 rounded-md",
                  "border border-[#E5E5E5] bg-white",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                  "transition-colors duration-150",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#E5E5E5]",
                  "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                )}
                aria-label="上一页"
              >
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    disabled={pageNum === page}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "inline-flex items-center justify-center",
                      "h-8 min-w-[32px] px-1 rounded-md",
                      "text-[13px] leading-[1.5] tabular-nums",
                      "transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                      pageNum === page
                        ? "bg-[#0A0A0A] text-white"
                        : "border border-[#E5E5E5] bg-white text-[#404040] hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                    )}
                    aria-label={`第 ${pageNum} 页`}
                    aria-current={pageNum === page ? "page" : undefined}
                  >
                    {pageNum}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={cn(
                  "inline-flex items-center justify-center",
                  "h-8 px-2.5 rounded-md",
                  "border border-[#E5E5E5] bg-white",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                  "transition-colors duration-150",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-[#E5E5E5]",
                  "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                )}
                aria-label="下一页"
              >
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <div className="absolute inset-0 bg-black/30" />

          <div
            className={cn(
              "relative z-10",
              "bg-white border border-[#E5E5E5] rounded-2xl",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
              "w-full max-w-md mx-4",
            )}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <h2 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                反馈详情
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className={cn(
                  "inline-flex items-center justify-center",
                  "h-8 w-8 rounded-full",
                  "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                  "transition-colors duration-150",
                )}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            <div className="px-6 pb-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[12px] leading-[1.5] text-[#737373]">
                  类型
                </span>
                {typeBadge(detail.type)}
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] leading-[1.5] text-[#737373]">
                  反馈内容
                </span>
                <p className="text-[15px] leading-[1.6] text-[#0A0A0A] whitespace-pre-wrap break-words">
                  {detail.content}
                </p>
              </div>

              {detail.contact && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] leading-[1.5] text-[#737373]">
                    联系方式
                  </span>
                  <p className="text-[13px] leading-[1.6] text-[#404040]">
                    {detail.contact}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] leading-[1.5] text-[#737373]">
                  用户ID
                </span>
                <p className="text-[13px] leading-[1.6] text-[#404040] tabular-nums">
                  {detail.user_id}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] leading-[1.5] text-[#737373]">
                  提交时间
                </span>
                <p className="text-[13px] leading-[1.6] text-[#404040] tabular-nums">
                  {formatTime(detail.created_at)}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className={cn(
                    "h-9 px-5 rounded-full",
                    "border border-[#E5E5E5] bg-white",
                    "text-[13px] leading-[1.5] text-[#404040]",
                    "hover:bg-[#FAFAFA]",
                    "transition-colors duration-150",
                  )}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
