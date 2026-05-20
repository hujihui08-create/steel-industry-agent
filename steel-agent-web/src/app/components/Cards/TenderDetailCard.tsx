import { Bookmark, ExternalLink, Calendar, Building2, MapPin, Tag, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TenderDetailCardData } from "@/app/types/chat";

export { type TenderDetailCardData };

export interface TenderDetailCardProps {
  data: TenderDetailCardData;
  isFavorited?: boolean;
  onFavorite?: (id: number | string) => void;
  onViewSource?: (url: string) => void;
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
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:${min}`;
  } catch {
    return dateStr;
  }
}

export function TenderDetailCard({
  data,
  isFavorited,
  onFavorite,
  onViewSource,
}: TenderDetailCardProps) {
  return (
    <div>
      <div className="rounded-2xl border border-steel-line overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted mb-1">
            招标详情
          </div>
          <h2 className="text-[24px] leading-[1.3] font-medium text-steel-ink">
            {data.title}
          </h2>
        </div>

        <div className="border-t border-steel-line px-5 py-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {data.bidding_company && (
              <InfoItem label="招标单位" icon={Building2}>
                {data.bidding_company}
              </InfoItem>
            )}
            <InfoItem label="项目预算" icon={Tag}>
              <span className="text-[18px] leading-[1.3] font-medium text-steel-ink tabular-nums">
                {formatBudget(data.budget)}
              </span>
            </InfoItem>
            <InfoItem label="所属地区" icon={MapPin}>
              {data.region}
            </InfoItem>
            <InfoItem label="品类">
              {data.category}
            </InfoItem>
            <InfoItem label="报名截止" icon={Clock}>
              {formatDate(data.deadline)}
            </InfoItem>
            <InfoItem label="投标截止" icon={Clock}>
              {formatDate(data.bid_deadline)}
            </InfoItem>
          </div>
        </div>

        {data.items && data.items.length > 0 && (
          <div className="border-t border-steel-line">
            <div className="px-5 py-3 text-[12px] leading-[1.5] text-steel-muted">
              采购内容
            </div>
            <div className="divide-y divide-steel-line">
              {data.items.map((item, idx) => (
                <div key={idx} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-[15px] leading-[1.6] text-steel-body">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-3 text-[12px] leading-[1.5] text-steel-muted">
                    {item.spec && <span>{item.spec}</span>}
                    {item.quantity && <span>{item.quantity}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.description && (
          <div className="border-t border-steel-line px-5 py-4">
            <p className="text-[12px] leading-[1.5] text-steel-muted mb-2">
              项目描述
            </p>
            <p className="text-[15px] leading-[1.6] text-steel-body whitespace-pre-wrap">
              {data.description}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {onFavorite && (
          <button
            type="button"
            onClick={() => onFavorite(data.id)}
            aria-label={isFavorited ? "取消收藏" : "收藏"}
            className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
          >
            <Bookmark
              className="size-4"
              strokeWidth={1.75}
              fill={isFavorited ? "currentColor" : "none"}
            />
            {isFavorited ? "已收藏" : "收藏"}
          </button>
        )}
        {data.source_url && onViewSource && (
          <button
            type="button"
            onClick={() => onViewSource(data.source_url!)}
            aria-label="查看完整公告"
            className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
          >
            <ExternalLink className="size-4" strokeWidth={1.75} />
            查看完整公告
          </button>
        )}
        <button
          type="button"
          aria-label="添加到日历"
          className="rounded-full border border-steel-line text-[13px] text-steel-muted hover:border-steel-ink hover:text-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
        >
          <Calendar className="size-4" strokeWidth={1.75} />
          添加到日历
        </button>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[12px] leading-[1.5] text-steel-muted mb-1 flex items-center gap-1">
        {Icon && <Icon className="size-3" strokeWidth={1.75} />}
        {label}
      </p>
      <div className="text-[15px] leading-[1.6] text-steel-body">{children}</div>
    </div>
  );
}

export default TenderDetailCard;
