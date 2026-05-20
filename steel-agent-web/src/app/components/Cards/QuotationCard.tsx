import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, Save, Share2 } from "lucide-react";

export interface QuotationItem {
  label: string;
  value: number;
  detail?: string;
}

export interface QuotationCardProps {
  title?: string;
  items: QuotationItem[];
  total: number;
  currency?: string;
  onSave?: () => void;
  onShare?: () => void;
  onRecalculate?: () => void;
}

function formatCurrency(value: number, currency: string): string {
  return `${currency}${value.toLocaleString()}`;
}

export function QuotationCard({
  title = "报价单",
  items,
  total,
  currency = "¥",
  onSave,
  onShare,
  onRecalculate,
}: QuotationCardProps) {
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <div className="rounded-2xl border border-steel-line overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-steel-line">
          <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
            QUOTATION
          </div>
          <div className="text-[18px] leading-[1.4] font-medium text-steel-ink mt-0.5">
            {title}
          </div>
        </div>

        {/* Line items */}
        <div className="divide-y divide-steel-line px-5 py-1">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-baseline justify-between py-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[15px] leading-[1.6] text-steel-body">
                  {item.label}
                </span>
                {item.detail && (
                  <span className="text-[12px] leading-[1.5] text-steel-muted ml-2">
                    {item.detail}
                  </span>
                )}
              </div>
              <span className="text-[15px] leading-[1.6] text-steel-ink tabular-nums shrink-0 ml-4">
                {formatCurrency(item.value, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div className="px-5 py-4 border-t border-steel-line flex items-baseline justify-between bg-steel-surface">
          <span className="text-[12px] leading-[1.5] text-steel-muted">
            合计
          </span>
          <span className="text-[24px] leading-[1.3] font-medium text-steel-ink tabular-nums">
            {formatCurrency(total, currency)}
          </span>
        </div>
      </div>

      {/* Action pills */}
      {(onSave || onShare || onRecalculate) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {onSave && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!saved) {
                  setSaved(true);
                  onSave();
                  setTimeout(() => setSaved(false), 1500);
                }
              }}
              className={`rounded-full border-steel-line hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5 ${saved ? "text-steel-up" : "text-steel-ink"}`}
            >
              {saved ? (
                <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
              ) : (
                <Save className="size-3.5" strokeWidth={1.75} />
              )}
              {saved ? "已保存" : "保存"}
            </Button>
          )}
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShare}
              className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
            >
              <Share2 className="size-3.5" strokeWidth={1.75} />
              分享
            </Button>
          )}
          {onRecalculate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRecalculate}
              className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
            >
              <RefreshCw className="size-3.5" strokeWidth={1.75} />
              重新计算
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default QuotationCard;
