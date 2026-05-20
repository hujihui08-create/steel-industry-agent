import { BookOpen } from "lucide-react";
import type { KnowledgeItem } from "@/app/types/knowledge";

interface StandardDetailCardProps {
  standard: KnowledgeItem | null;
}

export function StandardDetailCard({ standard }: StandardDetailCardProps) {
  if (!standard) {
    return (
      <div className="rounded-2xl border border-steel-line p-5 flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-full border border-steel-line flex items-center justify-center">
          <BookOpen className="size-5 text-steel-muted" strokeWidth={1.75} />
        </div>
        <p className="text-[13px] text-steel-muted">未找到相关标准信息</p>
      </div>
    );
  }

  const contentItems = parseContent(standard.content);

  return (
    <div className="rounded-2xl border border-steel-line overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-steel-line">
        <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted mb-1">
          STANDARD
        </div>
        <div className="text-[18px] leading-[1.4] font-medium text-steel-ink">
          {standard.standard_no && (
            <span className="mr-2">{standard.standard_no}</span>
          )}
          {standard.title}
        </div>
      </div>

      <div className="divide-y divide-steel-line">
        {contentItems.length > 0 ? (
          contentItems.map((item, idx) => (
            <div key={idx} className="px-5 py-3">
              <div className="text-[13px] leading-[1.6] text-steel-muted mb-0.5">
                {item.key}
              </div>
              <div className="text-[15px] leading-[1.6] text-steel-body">
                {item.value}
              </div>
            </div>
          ))
        ) : (
          <div className="px-5 py-6">
            <p className="text-[15px] leading-[1.6] text-steel-body">{standard.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function parseContent(content: string): { key: string; value: string }[] {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }
  } catch {}
  return [];
}

export default StandardDetailCard;
