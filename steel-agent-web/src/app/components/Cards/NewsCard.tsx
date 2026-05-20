import { cn } from "@/lib/utils";

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  source: string;
  source_url: string;
  category: string;
  published_at: string;
}

export interface NewsCardProps {
  eyebrow?: string;           // 默认 "NEWS"
  title?: string;             // 卡片标题，默认 "行业资讯"
  news: NewsItem[];           // 资讯列表
  source?: string;            // 数据来源
  sourceTime?: string;        // 时间
  onViewDetail?: (item: NewsItem) => void;  // 点击查看详情
}

export function NewsCard({
  eyebrow = "NEWS",
  title = "行业资讯",
  news,
  source,
  sourceTime,
  onViewDetail,
}: NewsCardProps) {
  return (
    <div className="rounded-2xl border border-steel-line p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
          {eyebrow}
        </div>
        {sourceTime && (
          <div className="text-[12px] leading-[1.5] text-steel-placeholder shrink-0 ml-4">
            {sourceTime}
          </div>
        )}
      </div>
      <h3 className="text-[18px] leading-[1.4] font-medium text-steel-ink mb-4">
        {title}
      </h3>

      {/* Separator */}
      <hr className="border-steel-line -mx-5" />

      {/* News list */}
      {news.length > 0 ? (
        <div className="divide-y divide-steel-line">
          {news.map((item) => (
            <div key={item.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-[1.6] text-steel-ink truncate">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {item.category && (
                      <span className="rounded-md border border-steel-line text-[11px] leading-[1.5] text-steel-muted px-2 py-0.5">
                        {item.category}
                      </span>
                    )}
                    <span className="text-[12px] leading-[1.5] text-steel-placeholder">
                      {item.published_at}
                    </span>
                  </div>
                </div>

                {/* View detail pill */}
                <button
                  type="button"
                  onClick={() => onViewDetail?.(item)}
                  className={cn(
                    "shrink-0 rounded-full border border-steel-line text-[13px] leading-[1.5] text-steel-ink",
                    "hover:border-steel-ink transition-colors duration-150",
                    "px-4 py-1.5",
                  )}
                  aria-label={`查看 ${item.title} 详情`}
                >
                  查看详情
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-[13px] leading-[1.5] text-steel-placeholder">
          暂无相关资讯
        </div>
      )}

      {/* Source footer */}
      {source && (
        <>
          <hr className="border-steel-line -mx-5" />
          <div className="pt-4">
            <span className="text-[12px] leading-[1.5] text-steel-placeholder">
              数据来源: {source}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default NewsCard;
