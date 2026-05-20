import { Button } from "@/components/ui/button";
import type { KnowledgeItem } from "@/app/types/knowledge";

interface GradeCompareCardProps {
  grades: KnowledgeItem[];
  onViewDetail?: (id: number) => void;
  onViewCrossRef?: () => void;
}

export function GradeCompareCard({ grades, onViewDetail, onViewCrossRef }: GradeCompareCardProps) {
  if (grades.length === 0) {
    return (
      <div className="rounded-2xl border border-steel-line p-5 flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-full border border-steel-line flex items-center justify-center">
          <span className="text-steel-muted text-[18px]">—</span>
        </div>
        <p className="text-[13px] text-steel-muted">未找到相关牌号信息</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-steel-line overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted mb-1">
            GRADE COMPARE
          </div>
          <div className="text-[18px] leading-[1.4] font-medium text-steel-ink">
            牌号对比
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-steel-line">
                <th className="text-[11px] leading-[1.5] font-normal text-steel-muted px-5 py-2.5 text-left">
                  属性
                </th>
                {grades.map((g) => (
                  <th
                    key={g.id}
                    className="text-[11px] leading-[1.5] font-normal text-steel-muted px-5 py-2.5 text-left"
                  >
                    {g.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-line">
              {renderRows(grades)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {onViewDetail && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => grades[0] && onViewDetail(grades[0].id)}
            className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
          >
            查看详细标准
          </Button>
        )}
        {onViewCrossRef && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewCrossRef}
            className="rounded-full border-steel-line text-steel-ink hover:bg-transparent hover:border-steel-ink text-[13px] h-8 px-3.5"
          >
            查看牌号对照
          </Button>
        )}
      </div>
    </div>
  );
}

function parseGradeContent(content: string): Record<string, string> {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function renderRows(grades: KnowledgeItem[]) {
  const allKeys = new Set<string>();
  const parsedGrades = grades.map((g) => parseGradeContent(g.content));

  parsedGrades.forEach((pg) => {
    Object.keys(pg).forEach((k) => allKeys.add(k));
  });

  return Array.from(allKeys).map((key, idx) => (
    <tr key={key} className={idx % 2 === 0 ? "bg-transparent" : "bg-steel-surface/50"}>
      <td className="text-[13px] leading-[1.6] text-steel-body px-5 py-3 font-medium">
        {key}
      </td>
      {parsedGrades.map((pg, gi) => (
        <td key={gi} className="text-[13px] leading-[1.6] text-steel-body px-5 py-3 tabular-nums">
          {pg[key] || "—"}
        </td>
      ))}
    </tr>
  ));
}

export default GradeCompareCard;
