import { Badge } from "@/components/ui/badge";

export interface ListItem {
  id?: string;
  text: string;
  tag?: string;
  onClick?: () => void;
}

export interface ListCardProps {
  title: string;
  items: ListItem[];
}

export function ListCard({ title, items }: ListCardProps) {
  return (
    <div className="rounded-2xl border border-steel-line overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-steel-line">
        <div className="text-[18px] leading-[1.4] font-medium text-steel-ink">
          {title}
        </div>
      </div>

      {/* List items */}
      <div className="divide-y divide-steel-line">
        {items.map((item, idx) => (
          <div
            key={item.id ?? idx}
            onClick={item.onClick}
            className={`px-5 py-3.5 flex items-start justify-between gap-4 ${
              item.onClick
                ? "cursor-pointer hover:bg-steel-surface transition-colors"
                : ""
            }`}
            role={item.onClick ? "button" : undefined}
            tabIndex={item.onClick ? 0 : undefined}
            onKeyDown={
              item.onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      item.onClick!();
                    }
                  }
                : undefined
            }
          >
            <span className="text-[15px] leading-[1.6] text-steel-ink truncate min-w-0 flex-1">
              {item.text}
            </span>
            {item.tag && (
              <Badge
                variant="outline"
                className="shrink-0 rounded-md border-steel-line text-steel-muted text-[11px] leading-[1.5] px-2 py-0"
              >
                {item.tag}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="px-5 py-8 text-center text-[13px] text-steel-muted">
          暂无数据
        </div>
      )}
    </div>
  );
}

export default ListCard;
