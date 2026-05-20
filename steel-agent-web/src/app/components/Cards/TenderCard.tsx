import { Bookmark, Eye, Calendar } from "lucide-react";
import type { TenderCardItem } from "@/app/types/chat";

export { type TenderCardItem };

export interface TenderCardProps {
  title?: string;
  subtitle?: string;
  items: TenderCardItem[];
  totalCount?: number;
  isReminder?: boolean;
  source?: string;
  sourceTime?: string;
  favoritedIds?: Set<number | string>;
  onFavorite?: (id: number | string) => void;
  onViewDetail?: (id: number | string) => void;
}

function formatBudget(value: number): string {
  return `¥${value.toLocaleString("zh-CN")}`;
}

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

function getDaysRemaining(dateStr: string): number {
  try {
    const deadline = new Date(dateStr);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function TenderCard({
  title,
  subtitle,
  items,
  totalCount,
  isReminder = false,
  source,
  sourceTime,
  favoritedIds,
  onFavorite,
  onViewDetail,
}: TenderCardProps) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-steel-line bg-steel-canvas p-6 text-center">
        <p className="text-[15px] leading-[1.6] text-steel-body">
          未找到相关招标信息
        </p>
        <p className="text-[12px] leading-[1.5] text-steel-muted mt-1">
          尝试更换关键词或扩大地区范围
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-steel-line overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-line">
          {isReminder && (
            <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-warn mb-1">
              即将截止
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {!isReminder && title && (
                <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted mb-1">
                  TENDER
                </div>
              )}
              <div className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
                {title || "招标列表"}
              </div>
              {subtitle && (
                <div className="text-[12px] leading-[1.5] text-steel-muted mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
            {totalCount != null && (
              <div className="text-[12px] leading-[1.5] text-steel-muted shrink-0 ml-4">
                {totalCount} 项
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-steel-line">
          {items.map((item) => {
            const isFav = favoritedIds?.has(item.id);
            const daysLeft = isReminder ? getDaysRemaining(item.deadline) : null;
            return (
              <div key={item.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-[1.6] text-steel-body truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[18px] leading-[1.3] font-medium text-steel-ink tabular-nums">
                        {formatBudget(item.budget)}
                      </span>
                      {item.region && (
                        <span className="inline-flex items-center rounded-full border border-steel-line px-2.5 py-0.5 text-[11px] text-steel-muted">
                          {item.region}
                        </span>
                      )}
                      <span className="text-[12px] leading-[1.5] text-steel-muted">
                        截止 {formatDate(item.deadline)}
                      </span>
                      {daysLeft != null && (
                        <span className="text-[12px] leading-[1.5] text-steel-warn font-medium">
                          {daysLeft <= 0 ? "已截止" : `剩余 ${daysLeft} 天`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  {onViewDetail && (
                    <button
                      type="button"
                      onClick={() => onViewDetail(item.id)}
                      aria-label="查看详情"
                      className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-3.5 py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Eye className="size-3.5" strokeWidth={1.75} />
                      查看详情
                    </button>
                  )}
                  {onFavorite && (
                    <button
                      type="button"
                      onClick={() => onFavorite(item.id)}
                      aria-label={isFav ? "取消收藏" : "收藏"}
                      className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-3.5 py-1.5 inline-flex items-center gap-1.5"
                    >
                      <Bookmark
                        className="size-3.5"
                        strokeWidth={1.75}
                        fill={isFav ? "currentColor" : "none"}
                      />
                      {isFav ? "已收藏" : "收藏"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {source && (
          <div className="px-5 py-3 border-t border-steel-line">
            <span className="text-[12px] leading-[1.5] text-steel-muted">
              数据来源: {source}
              {sourceTime && ` · ${sourceTime}`}
            </span>
          </div>
        )}
      </div>

      {isReminder && (
        <div className="mt-3 flex items-center gap-1.5 text-[12px] leading-[1.5] text-steel-muted">
          <Calendar className="size-3.5" strokeWidth={1.75} />
          以上招标项目即将截止，请及时关注
        </div>
      )}
    </div>
  );
}

export default TenderCard;
