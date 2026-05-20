export interface TableCardProps {
  title: string;
  headers: string[];
  rows: string[][];
}

export function TableCard({ title, headers, rows }: TableCardProps) {
  return (
    <div className="rounded-2xl border border-steel-line overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-steel-line">
        <div className="text-[18px] leading-[1.4] font-medium text-steel-ink">
          {title}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-steel-line">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-5 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted font-medium h-9 text-left"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-steel-line last:border-b-0 hover:bg-steel-surface transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-5 py-3 text-[13px] leading-[1.5] text-steel-body"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="px-5 py-8 text-center text-[13px] text-steel-muted">
          暂无数据
        </div>
      )}
    </div>
  );
}

export default TableCard;
