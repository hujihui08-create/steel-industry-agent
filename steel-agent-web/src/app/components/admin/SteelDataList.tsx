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
  const [selectedPriceRow, setSelectedPriceRow] = useState<number | null>(null);
  const [selectedTenderRow, setSelectedTenderRow] = useState<number | null>(null);

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
          <p className="text-steel-muted text-[13px]">{error}</p>
          <button
            onClick={() => loadData(true)}
            className={cn(
              "flex items-center gap-2 px-4 h-9 rounded-full",
              "border border-steel-line text-steel-ink text-[13px]",
              "hover:bg-steel-surface transition-colors duration-150",
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
            <div className="text-[12px] text-steel-muted">
              共 {rows.length} 条{pagination.hasMore ? "+" : ""}
            </div>
            {effectiveType === "price" && (
              <>
                <button
                  onClick={handleOpenCreate}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-8 rounded-full",
                    "border border-steel-line text-steel-ink text-[12px]",
                    "hover:bg-steel-surface hover:border-steel-ink transition-colors duration-150",
                  )}
                >
                  <Plus size={14} strokeWidth={1.75} />
                  新增
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-8 rounded-full",
                    "border border-steel-line text-steel-ink text-[12px]",
                    "hover:bg-steel-surface hover:border-steel-ink transition-colors duration-150",
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
              "border border-steel-line text-steel-muted",
              "hover:text-steel-ink hover:bg-steel-surface transition-colors duration-150",
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
        <div className="border border-steel-line rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-steel-line bg-steel-surface">
                    {config.columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-[11px] leading-[1.5] text-steel-muted font-normal whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                    {effectiveType === "price" && (
                      <th className="px-4 py-3 text-left text-[11px] leading-[1.5] text-steel-muted font-normal whitespace-nowrap">
                        操作
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-line">
                  {rows.map((row, i) => (
                    <React.Fragment key={row.id || i}>
                      <tr
                        className={cn(
                          "transition-colors duration-150",
                          (effectiveType === "price" || effectiveType === "tender") &&
                            "cursor-pointer",
                          (effectiveType === "price" && selectedPriceRow === (row.id ?? i)) ||
                            (effectiveType === "tender" && selectedTenderRow === (row.id ?? i))
                            ? "bg-steel-surface"
                            : "hover:bg-steel-surface",
                        )}
                        onClick={() => {
                          if (effectiveType === "price") {
                            setSelectedPriceRow(
                              selectedPriceRow === (row.id ?? i) ? null : (row.id ?? i),
                            );
                          } else if (effectiveType === "tender") {
                            setSelectedTenderRow(
                              selectedTenderRow === (row.id ?? i) ? null : (row.id ?? i),
                            );
                          }
                        }}
                      >
                        {config.columns.map((col) => (
                          <td
                            key={col.key}
                            className="px-4 py-3 text-[13px] leading-[1.5] text-steel-body whitespace-nowrap max-w-[240px] truncate"
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(row);
                                }}
                                className={cn(
                                  "flex items-center justify-center w-7 h-7 rounded-full",
                                  "text-steel-muted hover:text-steel-ink hover:bg-steel-surface",
                                  "transition-colors duration-150",
                                )}
                                aria-label="编辑"
                              >
                                <Pencil size={14} strokeWidth={1.75} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(row);
                                }}
                                className={cn(
                                  "flex items-center justify-center w-7 h-7 rounded-full",
                                  "text-steel-muted hover:text-steel-down hover:bg-steel-down/5",
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
                      {effectiveType === "price" &&
                        selectedPriceRow === (row.id ?? i) && (
                          <tr>
                            <td colSpan={config.columns.length + 1}>
                              <div className="rounded-2xl border border-steel-line bg-steel-surface p-5 mx-4 my-3">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">品种</span>
                                    <span className="text-steel-body text-[14px]">{row.category ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">规格</span>
                                    <span className="text-steel-body text-[14px]">{row.spec ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">地区</span>
                                    <span className="text-steel-body text-[14px]">{row.region ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">价格</span>
                                    <span className="text-steel-body text-[14px]">
                                      {row.price != null ? `¥${Number(row.price).toLocaleString()}` : "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">涨跌额</span>
                                    <span className="text-steel-body text-[14px]">
                                      {row.change != null
                                        ? `${row.change > 0 ? "+" : ""}${row.change}`
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">涨跌幅</span>
                                    <span className="text-steel-body text-[14px]">
                                      {row.change_pct != null
                                        ? `${row.change_pct > 0 ? "+" : ""}${row.change_pct}%`
                                        : "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">来源</span>
                                    <span className="text-steel-body text-[14px]">{row.source ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">日期</span>
                                    <span className="text-steel-body text-[14px]">
                                      {row.price_date
                                        ? new Date(row.price_date).toLocaleDateString("zh-CN")
                                        : "-"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEdit(row);
                                    }}
                                    className={cn(
                                      "px-4 h-8 rounded-full text-[13px]",
                                      "border border-steel-line text-steel-ink",
                                      "hover:bg-steel-surface hover:border-steel-ink transition-colors duration-150",
                                    )}
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(row);
                                    }}
                                    className={cn(
                                      "px-4 h-8 rounded-full text-[13px]",
                                      "border border-steel-line text-steel-ink",
                                      "hover:bg-steel-surface hover:border-steel-ink transition-colors duration-150",
                                    )}
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      {effectiveType === "tender" &&
                        selectedTenderRow === (row.id ?? i) && (
                          <tr>
                            <td colSpan={config.columns.length}>
                              <div className="rounded-2xl border border-steel-line bg-steel-surface p-5 mx-4 my-3">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">标题</span>
                                    <span className="text-steel-body text-[14px]">{row.title ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">地区</span>
                                    <span className="text-steel-body text-[14px]">{row.region ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">品类</span>
                                    <span className="text-steel-body text-[14px]">{row.category ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">预算</span>
                                    <span className="text-steel-body text-[14px]">
                                      {row.budget != null ? `¥${Number(row.budget).toLocaleString()}` : "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">状态</span>
                                    <span className="text-steel-body text-[14px]">{row.status ?? "-"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-steel-muted text-[12px] w-16 shrink-0">截止日期</span>
                                    <span className="text-steel-body text-[14px]">
                                      {row.deadline
                                        ? new Date(row.deadline).toLocaleDateString("zh-CN")
                                        : "-"}
                                    </span>
                                  </div>
                                  {row.description && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-steel-muted text-[12px] w-16 shrink-0 mt-0.5">
                                        描述
                                      </span>
                                      <span className="text-steel-body text-[14px]">
                                        {row.description}
                                      </span>
                                    </div>
                                  )}
                                  {row.source_url && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-steel-muted text-[12px] w-16 shrink-0">来源</span>
                                      <a
                                        href={row.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-steel-ink text-[14px] underline hover:text-steel-body transition-colors duration-150"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {row.source_url}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.hasMore && (
              <div className="flex justify-center py-4 border-t border-steel-line">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className={cn(
                    "px-4 h-8 rounded-full text-[12px]",
                    "border border-steel-line text-steel-body",
                    "hover:border-steel-ink hover:text-steel-ink transition-colors duration-150",
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
