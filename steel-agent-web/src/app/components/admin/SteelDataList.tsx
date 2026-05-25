import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import { getAdminPrices, getAdminNews, getAdminTenders } from "@/app/api/admin";

type DataType = "price" | "news" | "tender";

const TYPE_CONFIG: Record<
  DataType,
  { title: string; breadcrumb: string; columns: { key: string; label: string; render?: (val: any, row: any) => string }[] }
> = {
  price: {
    title: "价格数据",
    breadcrumb: "价格数据",
    columns: [
      { key: "category", label: "品种" },
      { key: "spec", label: "规格" },
      { key: "region", label: "地区" },
      { key: "price", label: "价格", render: (v: number) => v ? `¥${v.toLocaleString()}` : "-" },
      { key: "change", label: "涨跌额", render: (v: number) => v ? `${v > 0 ? "+" : ""}${v}` : "-" },
      { key: "change_pct", label: "涨跌幅", render: (v: number) => v ? `${v > 0 ? "+" : ""}${v}%` : "-" },
      { key: "source", label: "来源" },
      { key: "price_date", label: "日期", render: (v: string) => v ? new Date(v).toLocaleDateString("zh-CN") : "-" },
    ],
  },
  news: {
    title: "资讯数据",
    breadcrumb: "资讯数据",
    columns: [
      { key: "title", label: "标题" },
      { key: "category", label: "分类" },
      { key: "source", label: "来源" },
      { key: "published_at", label: "发布时间", render: (v: string) => v ? new Date(v).toLocaleString("zh-CN") : "-" },
    ],
  },
  tender: {
    title: "招标数据",
    breadcrumb: "招标数据",
    columns: [
      { key: "title", label: "标题" },
      { key: "region", label: "地区" },
      { key: "category", label: "品类" },
      { key: "budget", label: "预算", render: (v: number) => v ? `¥${v.toLocaleString()}` : "-" },
      { key: "status", label: "状态" },
      { key: "deadline", label: "截止日期", render: (v: string) => v ? new Date(v).toLocaleDateString("zh-CN") : "-" },
    ],
  },
};

const PAGE_SIZE = 20;

export default function SteelDataList() {
  const [searchParams] = useSearchParams();
  const dataType = searchParams.get("type") as DataType;
  const sourceName = searchParams.get("source") || "";
  const config = dataType && TYPE_CONFIG[dataType] ? TYPE_CONFIG[dataType] : TYPE_CONFIG.price;
  const effectiveType: DataType = dataType && TYPE_CONFIG[dataType] ? dataType : "price";

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const currentOffset = reset ? 0 : offset;
        let result: any[] = [];

        switch (effectiveType) {
          case "price":
            result = await getAdminPrices({
              limit: PAGE_SIZE,
              offset: currentOffset,
            });
            break;
          case "news":
            result = await getAdminNews({ limit: PAGE_SIZE, offset: currentOffset });
            break;
          case "tender":
            result = await getAdminTenders({ limit: PAGE_SIZE, offset: currentOffset });
            break;
        }

        if (reset) {
          setRows(result);
        } else {
          setRows((prev) => [...prev, ...result]);
        }
        setHasMore(result.length === PAGE_SIZE);
      } catch (err: any) {
        setError(err?.message || "加载失败");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [effectiveType, sourceName, offset],
  );

  useEffect(() => {
    loadData(true);
  }, []);

  const loadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
  };

  useEffect(() => {
    if (offset > 0) {
      loadData(false);
    }
  }, [offset]);

  const title = sourceName
    ? `${config.title} - ${sourceName}`
    : config.title;

  if (loading) {
    return (
      <AdminPageShell
        title={title}
        breadcrumbs={[{ label: "首页" }, { label: "数据管理" }, { label: config.breadcrumb }]}
      >
        <div className="space-y-3">
          <AdminLoading type="card" />
          <AdminLoading type="card" />
          <AdminLoading type="card" />
        </div>
      </AdminPageShell>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AdminPageShell
        title={title}
        breadcrumbs={[{ label: "首页" }, { label: "数据管理" }, { label: config.breadcrumb }]}
      >
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-[#737373] text-[13px]">{error}</p>
          <button
            onClick={() => loadData(true)}
            className={cn(
              "flex items-center gap-2 px-4 h-9 rounded-full",
              "border border-[#E5E5E5] text-[#0A0A0A] text-[13px]",
              "hover:bg-[#FAFAFA] transition-colors duration-150",
            )}
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            重试
          </button>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={title}
      breadcrumbs={[{ label: "首页" }, { label: "数据管理" }, { label: config.breadcrumb }]}
    >
      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[12px] text-[#737373]">
          共 {rows.length} 条{hasMore ? "+" : ""}
        </div>
        <button
          onClick={() => loadData(true)}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-full",
            "border border-[#E5E5E5] text-[#737373]",
            "hover:text-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors duration-150",
          )}
          aria-label="刷新"
        >
          <RefreshCw size={14} strokeWidth={1.75} />
        </button>
      </div>

      {rows.length === 0 ? (
        <AdminEmpty
          title="暂无采集数据"
          description="请先在爬虫管理中触发数据采集"
        />
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                  {config.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-[11px] leading-[1.5] text-[#737373] font-normal whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {rows.map((row, i) => (
                  <tr key={row.id || i} className="hover:bg-[#FAFAFA] transition-colors duration-150">
                    {config.columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040] whitespace-nowrap max-w-[240px] truncate"
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center py-4 border-t border-[#E5E5E5]">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className={cn(
                  "px-4 h-8 rounded-full text-[12px]",
                  "border border-[#E5E5E5] text-[#404040]",
                  "hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </button>
            </div>
          )}
        </div>
      )}
    </AdminPageShell>
  );
}
