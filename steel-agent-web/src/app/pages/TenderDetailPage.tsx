// ============================================================
// TenderDetailPage — 招标详情页
// 展示单个招标的完整信息：状态、预算、地区、品类、
// 截止日期、项目描述、操作按钮
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bookmark,
  BookmarkCheck,
  Bell,
  ExternalLink,
  MapPin,
  Calendar,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTenderDetail } from "@/app/api/tenders";
import type { TenderDetail } from "@/app/types/tender";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { useTenderFavorite } from "@/app/hooks/useTenderFavorite";

// -----------------------------------------------------------
// Status config
// -----------------------------------------------------------

interface StatusConfig {
  dot: string;
  textClass: string;
  badgeClass: string;
  label: string;
}

const statusMap: Record<TenderDetail["status"], StatusConfig> = {
  open:   { dot: "\u25CF", textClass: "text-steel-ink", badgeClass: "text-steel-ink border-steel-line bg-steel-canvas", label: "进行中" },
  closed: { dot: "\u25CB", textClass: "text-steel-muted", badgeClass: "text-steel-muted border-steel-line bg-steel-canvas", label: "已截止" },
  won:    { dot: "\u25CF", textClass: "text-steel-up", badgeClass: "text-steel-up border-steel-up bg-steel-up/5", label: "已中标" },
  lost:   { dot: "\u25CF", textClass: "text-steel-down", badgeClass: "text-steel-down border-steel-down bg-steel-down/5", label: "未中标" },
};

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}

function formatBudget(value: number): string {
  return `\u00A5${value.toLocaleString("zh-CN")}`;
}

function formatWanYuan(value: number): string {
  return `\u00A5${(value / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}万`;
}

// -----------------------------------------------------------
// Detail Row (key-value pair)
// -----------------------------------------------------------

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Icon className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
      <span className="text-[13px] leading-[1.5] text-steel-muted w-16 shrink-0">
        {label}
      </span>
      <span className="text-[15px] leading-[1.6] text-steel-body truncate">
        {value}
      </span>
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
  active,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  const colorClass = danger
    ? "text-steel-down border-steel-down hover:bg-steel-down/5"
    : active
      ? "text-steel-ink border-steel-ink bg-steel-surface"
      : "text-steel-ink border-steel-line hover:border-steel-ink hover:bg-steel-surface";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] leading-[1.5] transition-colors duration-150 ${colorClass}`}
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

  const { isFavorited, toggleFavorite } = useTenderFavorite();

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

  if (isError || !tender) {
    return (
      <div className="min-h-screen bg-steel-canvas">
        <PageHeader title="招标详情" onBack={() => navigate(-1)} />
        <ErrorState
          message={error instanceof Error ? error.message : "加载招标详情失败"}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const status = statusMap[tender.status];
  const isExpired = tender.status === "closed" ||
    (tender.status === "open" && new Date(tender.bid_deadline) < new Date());

  return (
    <div className="min-h-screen bg-steel-canvas">
      <PageHeader title="招标详情" onBack={() => navigate(-1)} />

      <main className="max-w-[720px] mx-auto px-4 py-6">
        {/* ====== Title + Status ====== */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink flex-1 min-w-0">
            {tender.title}
          </h1>
          <div className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${status.badgeClass}`}>
            <span className={`text-[10px] leading-none ${status.textClass}`}>
              {status.dot}
            </span>
            <span className="text-[15px] leading-[1.6] font-medium">
              {status.label}
            </span>
          </div>
        </div>

        {/* ====== Budget Hero ====== */}
        <div className="mb-6">
          <p className="text-[12px] leading-[1.5] text-steel-muted mb-1">预算金额</p>
          <p className="text-[40px] leading-[1.1] font-medium text-steel-ink tabular-nums tracking-tight">
            {formatWanYuan(tender.budget)}
          </p>
        </div>

        {/* ====== Detail Card ====== */}
        <div className="bg-steel-canvas border border-steel-line rounded-2xl overflow-hidden mb-4">
          <div className="divide-y divide-steel-line px-5">
            <DetailRow
              icon={MapPin}
              label="地区"
              value={tender.region}
            />
            <DetailRow
              icon={Tag}
              label="品类"
              value={tender.category}
            />
            <DetailRow
              icon={Calendar}
              label="报名截止"
              value={formatDate(tender.deadline)}
            />
            <DetailRow
              icon={Calendar}
              label="投标截止"
              value={formatDate(tender.bid_deadline)}
            />
            {tender.source_url && (
              <div className="flex items-center gap-3 py-3">
                <ExternalLink className="h-4 w-4 text-steel-muted shrink-0" strokeWidth={1.75} />
                <span className="text-[13px] leading-[1.5] text-steel-muted w-16 shrink-0">
                  来源
                </span>
                <a
                  href={tender.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[15px] leading-[1.6] text-steel-body truncate hover:text-steel-ink transition-colors duration-150 underline underline-offset-2"
                >
                  {tender.source_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ====== Description ====== */}
        {tender.description && (
          <div className="bg-steel-surface border border-steel-line rounded-2xl p-5 mb-6">
            <p className="text-[12px] leading-[1.5] text-steel-muted mb-3">
              项目描述
            </p>
            <p className="text-[15px] leading-[1.7] text-steel-body whitespace-pre-wrap">
              {tender.description}
            </p>
          </div>
        )}

        {/* ====== Deadline Warning ====== */}
        {isExpired && tender.status === "open" && (
          <div className="flex items-start gap-2 p-4 rounded-2xl bg-steel-warn/5 border border-steel-warn/20 mb-6">
            <span className="text-[13px] leading-[1.6] text-steel-warn">
              投标已截止，无法继续参与投标
            </span>
          </div>
        )}

        {/* ====== Action Buttons ====== */}
        <div className="flex gap-3 flex-wrap">
          <ActionPill
            icon={isFavorited(Number(id)) ? BookmarkCheck : Bookmark}
            label={isFavorited(Number(id)) ? "已收藏" : "收藏"}
            active={isFavorited(Number(id))}
            onClick={() => {
              if (!id) return;
              const tenderId = Number(id);
              if (isNaN(tenderId)) return;
              toggleFavorite(tenderId);
            }}
          />

          <ActionPill
            icon={Bell}
            label="设置提醒"
            onClick={() =>
              toast("功能开发中", {
                description: "招标提醒功能即将上线",
              })
            }
          />

          {tender.source_url && (
            <ActionPill
              icon={ExternalLink}
              label="查看来源"
              onClick={() =>
                window.open(tender.source_url, "_blank", "noopener,noreferrer")
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
