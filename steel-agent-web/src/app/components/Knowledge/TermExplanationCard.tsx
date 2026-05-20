import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import type { KnowledgeItem } from "@/app/types/knowledge";

interface TermExplanationCardProps {
  item: KnowledgeItem | null;
  className?: string;
}

export function TermExplanationCard({ item, className }: TermExplanationCardProps) {
  if (!item) {
    return (
      <div className={cn("rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-8 text-center", className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E5E5]">
          <BookOpen size={18} strokeWidth={1.75} className="text-[#A3A3A3]" />
        </div>
        <p className="text-[15px] leading-[1.6] text-[#404040]">未找到相关术语解释</p>
      </div>
    );
  }

  const contentStr = typeof item.content === "string" ? item.content : JSON.stringify(item.content);

  return (
    <div className={cn("rounded-2xl border border-[#E5E5E5] bg-white p-5", className)}>
      <div className="mb-3">
        <span className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373]">
          TERM
        </span>
      </div>

      <h3 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A] mb-3">
        {item.title}
      </h3>

      <p className="text-[15px] leading-[1.6] text-[#404040]">
        {contentStr}
      </p>

      {item.keywords && (
        <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
          <span className="text-[12px] leading-[1.5] text-[#737373]">关键词: {item.keywords}</span>
        </div>
      )}
    </div>
  );
}
