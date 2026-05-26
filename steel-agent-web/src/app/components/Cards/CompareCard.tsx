import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

export interface CompareRegion {
  region: string;
  price: number;
  change: number;
  changePct: number;
}

export interface CompareCategory {
  name: string;
  spec: string;
  regions: CompareRegion[];
}

export interface CompareCardProps {
  eyebrow?: string;
  title?: string;
  categories: CompareCategory[];
  source?: string;
  sourceTime?: string;
  /** 加载中骨架屏 */
  isLoading?: boolean;
  /** 错误状态 */
  isError?: boolean;
  /** 错误信息文本 */
  errorMessage?: string;
  /** 重试回调 */
  onRetry?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatPrice(value: number): string {
  return `¥${value.toLocaleString()}`;
}

function formatChange(delta: number, pct: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta} (${sign}${pct}%)`;
}

function getChangeArrow(change: number): string {
  if (change > 0) return "↑";
  if (change < 0) return "↓";
  return "—";
}

function getChangeColor(change: number): string {
  if (change > 0) return "text-steel-up";
  if (change < 0) return "text-steel-down";
  return "text-steel-muted";
}

/* ------------------------------------------------------------------ */
/*  Sub-component: single category column                             */
/* ------------------------------------------------------------------ */

function CategoryColumn({ cat }: { cat: CompareCategory }) {
  return (
    <>
      {/* Category header */}
      <div className="text-[15px] font-medium text-steel-ink">
        {cat.name}
      </div>
      <div className="text-[13px] text-steel-muted mt-0.5">
        {cat.spec}
      </div>

      {/* Region rows */}
      <div className="mt-3 divide-y divide-steel-line">
        {cat.regions.map((r) => (
          <div
            key={r.region}
            className="py-2.5 flex items-center justify-between"
          >
            <span className="text-[13px] text-steel-muted">
              {r.region}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] tabular-nums text-steel-ink">
                {formatPrice(r.price)}
              </span>
              <span
                className={cn(
                  "text-[12px] tabular-nums",
                  getChangeColor(r.change),
                )}
              >
                {getChangeArrow(r.change)}{" "}
                {formatChange(r.change, r.changePct)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function CompareCard({
  eyebrow = "COMPARE",
  title = "价格对比",
  categories,
  source,
  sourceTime,
  isLoading = false,
  isError = false,
  errorMessage = "加载失败",
  onRetry,
}: CompareCardProps) {
  // ---- Loading skeleton ----
  if (isLoading) {
    return (
      <div>
        <div className="rounded-2xl border border-steel-line overflow-hidden">
          <div className="px-5 py-4 border-b border-steel-line">
            <div className="animate-pulse rounded bg-steel-line h-3 w-14 mb-2" />
            <div className="animate-pulse rounded bg-steel-line h-5 w-1/3" />
          </div>
          <div className="grid grid-cols-2">
            {[1, 2].map((ci) => (
              <div key={ci} className={cn("px-5 py-4", ci === 1 && "border-r border-steel-line")}>
                <div className="animate-pulse rounded bg-steel-line h-4 w-16 mb-2" />
                <div className="animate-pulse rounded bg-steel-line h-3 w-20 mb-3" />
                <div className="space-y-2.5">
                  {[1, 2, 3].map((ri) => (
                    <div key={ri} className="flex justify-between">
                      <div className="animate-pulse rounded bg-steel-line h-3 w-10" />
                      <div className="flex gap-2">
                        <div className="animate-pulse rounded bg-steel-line h-4 w-16" />
                        <div className="animate-pulse rounded bg-steel-line h-3 w-14" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (isError) {
    return (
      <div>
        <div className="rounded-2xl border border-steel-down/20 overflow-hidden">
          <div className="px-5 py-4 border-b border-steel-down/20 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                {eyebrow}
              </div>
              <div className="text-[18px] leading-[1.4] font-medium text-steel-ink mt-0.5 truncate">
                {title}
              </div>
            </div>
          </div>
          <div className="px-5 py-6 flex flex-col items-center gap-3">
            <p className="text-[13px] text-steel-down text-center">{errorMessage}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line px-3 py-1.5 text-[13px] text-steel-ink hover:bg-steel-surface transition-colors duration-150"
              >
                <RefreshCw className="size-3" strokeWidth={1.75} />
                重试
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !categories || categories.length === 0;
  const isTwoColumns = categories && categories.length === 2;

  return (
    <div>
      <div className="rounded-2xl border border-steel-line overflow-hidden">
        {/* ---- Header ---- */}
        <div className="px-5 py-4 border-b border-steel-line flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
              {eyebrow}
            </div>
            <div className="text-[18px] leading-[1.4] font-medium text-steel-ink mt-0.5 truncate">
              {title}
            </div>
          </div>
          {sourceTime && (
            <div className="text-[12px] leading-[1.5] text-steel-muted shrink-0 ml-4">
              {sourceTime}
            </div>
          )}
        </div>

        {/* ---- Body ---- */}
        {isEmpty ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-steel-placeholder">暂无对比数据</p>
          </div>
        ) : isTwoColumns ? (
          /* 2 品种：网格布局，中间 1px 描边分隔 */
          <div className="grid grid-cols-2">
            {categories.map((cat, ci) => (
              <div
                key={cat.name}
                className={cn(
                  "px-5 py-4",
                  ci === 0 && "border-r border-steel-line",
                )}
              >
                <CategoryColumn cat={cat} />
              </div>
            ))}
          </div>
        ) : (
          /* ≥3 品种：横向滚动容器 */
          <div className="overflow-x-auto">
            <div className="flex min-w-max">
              {categories.map((cat, ci) => (
                <div
                  key={cat.name}
                  className={cn(
                    "min-w-[160px] px-5 py-4",
                    ci < categories.length - 1 &&
                      "border-r border-steel-line",
                  )}
                >
                  <CategoryColumn cat={cat} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Source footer ---- */}
        {source && (
          <div className="px-5 py-3 border-t border-steel-line">
            <span className="text-[12px] leading-[1.5] text-steel-muted">
              数据来源: {source}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompareCard;
