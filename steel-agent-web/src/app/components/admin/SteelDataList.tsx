import React, { useState, useEffect, useCallback, useReducer } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, Plus, Upload, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import {
  getAdminPrices,
  getAdminNews,
  getAdminTenders,
  createAdminPrice,
  updateAdminPrice,
  deleteAdminPrice,
  batchImportPrices,
} from "@/app/api/admin";
import PriceFormDialog, { type PriceFormData } from "./PriceFormDialog";
import PriceImportDialog, { type PriceImportRow } from "./PriceImportDialog";
import { AdminModal } from "./AdminModal";

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

interface PaginationState {
  offset: number;
  hasMore: boolean;
}

type PaginationAction =
  | { type: "RESET" }
  | { type: "LOAD_MORE"; newOffset: number }
  | { type: "SET_HAS_MORE"; hasMore: boolean };

function paginationReducer(state: PaginationState, action: PaginationAction): PaginationState {
  switch (action.type) {
    case "RESET":
      return { offset: 0, hasMore: true };
    case "LOAD_MORE":
      return { ...state, offset: action.newOffset };
    case "SET_HAS_MORE":
      return { ...state, hasMore: action.hasMore };
    default:
      return state;
  }
}

export default function SteelDataList() {
  const [searchParams] = useSearchParams();
  const dataType = searchParams.get("type") as DataType;
  const sourceName = searchParams.get("source") || "";
  const config = dataType && TYPE_CONFIG[dataType] ? TYPE_CONFIG[dataType] : TYPE_CONFIG.price;
  const effectiveType: DataType = dataType && TYPE_CONFIG[dataType] ? dataType : "price";

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, dispatchPagination] = useReducer(paginationReducer, { offset: 0, hasMore: true });
  const [loadingMore, setLoadingMore] = useState(false);

  // CRUD dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
        dispatchPagination({ type: "RESET" });
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const currentOffset = reset ? 0 : pagination.offset;
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
        dispatchPagination({ type: "SET_HAS_MORE", hasMore: result.length === PAGE_SIZE });
      } catch (err: any) {
        setError(err?.message || "加载失败");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [effectiveType, sourceName, pagination.offset],
  );

  useEffect(() => {
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveType, sourceName]);

  const loadMore = () => {
    const newOffset = pagination.offset + PAGE_SIZE;
    dispatchPagination({ type: "LOAD_MORE", newOffset });
  };

  useEffect(() => {
    if (pagination.offset > 0) {
      loadData(false);
    }
  }, [pagination.offset]);

  // ---- CRUD Handlers ----

  const handleCreate = async (data: PriceFormData) => {
    await createAdminPrice(data);
    await loadData(true);
  };

  const handleUpdate = async (data: PriceFormData) => {
    if (!editingRow?.id) return;
    await updateAdminPrice(editingRow.id, data);
    await loadData(true);
  };

  const handleSave = async (data: PriceFormData) => {
    if (editingRow) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  const handleOpenCreate = () => {
    setEditingRow(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (row: any) => {
    setEditingRow(row);
    setFormOpen(true);
  };

  const handleDeleteClick = (row: any) => {
    setDeletingRow(row);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRow?.id) return;
    setDeleteLoading(true);
    try {
      await deleteAdminPrice(deletingRow.id);
      setDeleteConfirmOpen(false);
      setDeletingRow(null);
      await loadData(true);
    } catch {
      // error handled by AdminModal closing
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleImport = async (prices: PriceImportRow[]) => {
    await batchImportPrices(prices);
    await loadData(true);
  };

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
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-[#737373]">
            共 {rows.length} 条{pagination.hasMore ? "+" : ""}
          </div>
          {effectiveType === "price" && (
            <>
              <button
                onClick={handleOpenCreate}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-8 rounded-full",
                  "border border-[#E5E5E5] text-[#0A0A0A] text-[12px]",
                  "hover:bg-[#FAFAFA] hover:border-[#0A0A0A] transition-colors duration-150",
                )}
              >
                <Plus size={14} strokeWidth={1.75} />
                新增
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-8 rounded-full",
                  "border border-[#E5E5E5] text-[#0A0A0A] text-[12px]",
                  "hover:bg-[#FAFAFA] hover:border-[#0A0A0A] transition-colors duration-150",
                )}
              >
                <Upload size={14} strokeWidth={1.75} />
                批量导入
              </button>
            </>
          )}
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
                  {effectiveType === "price" && (
                    <th className="px-4 py-3 text-left text-[11px] leading-[1.5] text-[#737373] font-normal whitespace-nowrap">
                      操作
                    </th>
                  )}
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
                    {effectiveType === "price" && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(row)}
                            className={cn(
                              "flex items-center justify-center w-7 h-7 rounded-full",
                              "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                              "transition-colors duration-150",
                            )}
                            aria-label="编辑"
                          >
                            <Pencil size={14} strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(row)}
                            className={cn(
                              "flex items-center justify-center w-7 h-7 rounded-full",
                              "text-[#737373] hover:text-[#B42318] hover:bg-[#B42318]/5",
                              "transition-colors duration-150",
                            )}
                            aria-label="删除"
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.hasMore && (
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

      {/* Price Form Dialog */}
      <PriceFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRow(null);
        }}
        onSave={handleSave}
        initialData={
          editingRow
            ? {
                category: editingRow.category ?? "",
                spec: editingRow.spec ?? "",
                region: editingRow.region ?? "",
                price: editingRow.price ?? 0,
                change: editingRow.change ?? 0,
                change_pct: editingRow.change_pct ?? 0,
                source: editingRow.source ?? "",
                price_date: editingRow.price_date
                  ? new Date(editingRow.price_date).toISOString().slice(0, 10)
                  : new Date().toISOString().slice(0, 10),
              }
            : undefined
        }
      />

      {/* Price Import Dialog */}
      <PriceImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />

      {/* Delete Confirmation */}
      <AdminModal
        open={deleteConfirmOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteConfirmOpen(false);
            setDeletingRow(null);
          }
        }}
        title="确认删除"
        description={`确定要删除「${deletingRow?.category ?? ""} ${deletingRow?.spec ?? ""}」这条价格记录吗？此操作不可撤销。`}
        confirmLabel="删除"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
      />
    </AdminPageShell>
  );
}
