import { cn } from "@/lib/utils";

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
}: CompareCardProps) {
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
