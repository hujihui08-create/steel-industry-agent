import { BookOpen } from "lucide-react";
import type { KnowledgeItem } from "@/app/types/knowledge";

interface TermExplanationCardProps {
  term: KnowledgeItem | null;
}

export function TermExplanationCard({ term }: TermExplanationCardProps) {
  if (!term) {
    return (
      <div className="rounded-2xl border border-steel-line p-5 flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-full border border-steel-line flex items-center justify-center">
          <BookOpen className="size-5 text-steel-muted" strokeWidth={1.75} />
        </div>
        <p className="text-[13px] text-steel-muted">未找到相关术语解释</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-steel-line overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-steel-line">
        <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted mb-1">
          TERM
        </div>
        <div className="text-[18px] leading-[1.4] font-medium text-steel-ink">
          {term.title}
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="text-[15px] leading-[1.6] text-steel-body whitespace-pre-wrap">
          {term.content}
        </p>
      </div>

      {term.keywords && (
        <div className="px-5 pb-4 flex flex-wrap gap-1.5">
          {term.keywords.split(",").filter(Boolean).map((kw, i) => (
            <span
              key={i}
              className="text-[11px] leading-[1.5] text-steel-muted px-2 py-0.5 rounded-full border border-steel-line"
            >
              {kw.trim()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default TermExplanationCard;
