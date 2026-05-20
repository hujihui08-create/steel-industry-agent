import { cn } from "@/lib/utils";
import type { GradeCompareItem } from "@/app/types/knowledge";

interface GradeCompareCardProps {
  grades: GradeCompareItem[];
  className?: string;
}

const COLUMNS = [
  { key: "grade", label: "牌号" },
  { key: "yield_strength", label: "屈服强度" },
  { key: "tensile_strength", label: "抗拉强度" },
  { key: "elongation", label: "伸长率" },
  { key: "application", label: "用途" },
] as const;

export function GradeCompareCard({ grades, className }: GradeCompareCardProps) {
  if (!grades || grades.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-8 text-center", className)}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E5E5]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A3A3A3" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <p className="text-[15px] leading-[1.6] text-[#404040]">暂无牌号对比数据</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E5E5E5]">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-normal whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {grades.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] whitespace-nowrap"
                  >
                    {item[col.key as keyof GradeCompareItem] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          className={cn(
            "rounded-full border border-[#E5E5E5] px-4 h-8",
            "text-[13px] leading-[1.5] text-[#404040]",
            "hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
            "transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
          )}
        >
          查看详细标准
        </button>
        <button
          className={cn(
            "rounded-full border border-[#E5E5E5] px-4 h-8",
            "text-[13px] leading-[1.5] text-[#404040]",
            "hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
            "transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
          )}
        >
          查看牌号对照
        </button>
      </div>
    </div>
  );
}
