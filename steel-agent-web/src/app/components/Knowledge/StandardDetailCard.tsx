import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { KnowledgeItem } from "@/app/types/knowledge";

interface StandardDetailCardProps {
  item: KnowledgeItem | null;
  className?: string;
}

function parseContent(content: string): string[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "string") return [parsed];
    if (Array.isArray(parsed)) return parsed.map(String);
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`);
    }
  } catch {
    return content.split("\n").filter(Boolean);
  }
  return [];
}

export function StandardDetailCard({ item, className }: StandardDetailCardProps) {
  if (!item) {
    return (
      <div className={cn("rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-8 text-center", className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E5E5]">
          <FileText size={18} strokeWidth={1.75} className="text-[#A3A3A3]" />
        </div>
        <p className="text-[15px] leading-[1.6] text-[#404040]">未找到相关标准信息</p>
      </div>
    );
  }

  const sections = parseContent(item.content);

  return (
    <div className={cn("rounded-2xl border border-[#E5E5E5] bg-white p-5", className)}>
      <div className="mb-4">
        <span className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373]">
          STANDARD
        </span>
      </div>

      <h2 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A] mb-3">
        {item.standard_no && (
          <span className="font-mono text-[#737373] mr-2">{item.standard_no}</span>
        )}
        {item.title}
      </h2>

      {item.category && (
        <div className="mb-4">
          <span className="inline-block rounded border border-[#E5E5E5] px-2 py-0.5 text-[11px] leading-[1.5] text-[#737373]">
            {item.category}
          </span>
        </div>
      )}

      {sections.length > 0 && (
        <div className="divide-y divide-[#E5E5E5]">
          {sections.map((section, i) => (
            <div key={i} className="py-3 first:pt-0 last:pb-0">
              <p className="text-[15px] leading-[1.6] text-[#404040]">{section}</p>
            </div>
          ))}
        </div>
      )}

      {item.keywords && (
        <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
          <span className="text-[12px] leading-[1.5] text-[#737373]">关键词: {item.keywords}</span>
        </div>
      )}
    </div>
  );
}
