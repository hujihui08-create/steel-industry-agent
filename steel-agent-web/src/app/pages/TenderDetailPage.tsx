// ============================================================
// TenderDetailPage — 招标详情页
// 展示单个招标的完整信息：状态、预算、地区、品类、
// 截止日期、项目描述、操作按钮
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, Bell, ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTenderDetail } from "@/app/api/tenders";
import type { TenderDetail } from "@/app/types/tender";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";

// -----------------------------------------------------------
// Status config
// -----------------------------------------------------------

interface StatusConfig {
  dot: string;
  dotClass: string;
  label: string;
  labelClass: string;
}

const statusMap: Record<TenderDetail["status"], StatusConfig> = {
  open: {
    dot: "●",
    dotClass: "text-steel-ink",
    label: "进行中",
    labelClass: "text-steel-ink",
  },
  closed: {
    dot: "○",
    dotClass: "text-steel-placeholder",
    label: "已截止",
    labelClass: "text-steel-muted",
  },
  won: {
    dot: "●",
    dotClass: "text-steel-up",
    label: "已中标",
    labelClass: "text-steel-up",
  },
  lost: {
    dot: "●",
    dotClass: "text-steel-down",
    label: "未中标",
    labelClass: "text-steel-down",
  },
};

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

/** Format an ISO date string to yyyy-MM-dd. */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

/** Format a number to CNY with thousand separators. */
function formatBudget(value: number): string {
  return `¥${value.toLocaleString("zh-CN")}`;
}

// -----------------------------------------------------------
// Info Row
// -----------------------------------------------------------

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[12px] leading-[1.5] text-steel-muted mb-1">{label}</p>
      <div className="text-[15px] leading-[1.6] text-steel-body">{children}</div>
    </div>
  );
}

// -----------------------------------------------------------
// Action Pill
// -----------------------------------------------------------

function ActionPill({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-steel-line px-4 py-2 text-[13px] text-steel-ink hover:bg-steel-surface transition-colors duration-150"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

// ============================================================
// TenderDetailPage
// ============================================================

export default function TenderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: tender,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tender", id],
    queryFn: () => getTenderDetail(id!),
    enabled: !!id,
  });

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-steel-canvas">
        <PageHeader title="招标详情" onBack={() => navigate(-1)} />
        <div className="max-w-[720px] mx-auto px-4 py-6">
          <LoadingSkeleton variant="card" count={2} />
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (isError || !tender) {
    return (
      <div className="min-h-screen bg-steel-canvas">
        <PageHeader title="招标详情" onBack={() => navigate(-1)} />
        <ErrorState
          message={
            error instanceof Error ? error.message : "加载招标详情失败"
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // ---- Status config ----
  const status = statusMap[tender.status];

  return (
    <div className="min-h-screen bg-steel-canvas">
      <PageHeader title="招标详情" onBack={() => navigate(-1)} />

      <main className="max-w-[720px] mx-auto px-4 py-6">
        {/* ==========================================================
            Status indicator
            ========================================================== */}
        <div className="flex items-center gap-2 mb-6">
          <span className={`text-[14px] leading-none ${status.dotClass}`}>
            {status.dot}
          </span>
          <span className={`text-[13px] leading-[1.5] font-medium ${status.labelClass}`}>
            {status.label}
          </span>
        </div>

        {/* ==========================================================
            Title
            ========================================================== */}
        <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink mb-4">
          {tender.title}
        </h1>

        {/* ==========================================================
            Info cards
            ========================================================== */}
        <div className="bg-steel-canvas border border-steel-line rounded-2xl p-5 mb-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <InfoItem label="预算金额">
              <span className="text-[18px] font-medium text-steel-ink">
                {formatBudget(tender.budget)}
              </span>
            </InfoItem>

            <InfoItem label="所属地区">
              <span>{tender.region}</span>
            </InfoItem>

            <InfoItem label="品类">
              <span>{tender.category}</span>
            </InfoItem>

            <div />

            <InfoItem label="报名截止">
              <span>{formatDate(tender.deadline)}</span>
            </InfoItem>

            <InfoItem label="投标截止">
              <span>{formatDate(tender.bid_deadline)}</span>
            </InfoItem>
          </div>
        </div>

        {/* ==========================================================
            Description
            ========================================================== */}
        {tender.description && (
          <div className="mt-4">
            <p className="text-[12px] leading-[1.5] text-steel-muted mb-2">
              项目描述
            </p>
            <p className="text-[15px] leading-[1.6] text-steel-body whitespace-pre-wrap">
              {tender.description}
            </p>
          </div>
        )}

        {/* ==========================================================
            Action buttons
            ========================================================== */}
        <div className="mt-6 flex gap-3 flex-wrap">
          <ActionPill
            icon={Bookmark}
            label="收藏"
            onClick={() => toast("功能开发中", {
              description: "招标收藏功能即将上线",
            })}
          />

          <ActionPill
            icon={Bell}
            label="设置提醒"
            onClick={() => toast("功能开发中", {
              description: "招标提醒功能即将上线",
            })}
          />

          {tender.source_url && (
            <ActionPill
              icon={ExternalLink}
              label="查看来源"
              onClick={() => window.open(tender.source_url, "_blank", "noopener,noreferrer")}
            />
          )}
        </div>
      </main>
    </div>
  );
}
