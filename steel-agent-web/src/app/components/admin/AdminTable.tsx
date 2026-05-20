import React, { useState, useCallback, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";

/**
 * AdminTable -- 通用管理后台表格
 *
 * 集成了排序、分页、行选择、加载态、空态等管理后台常用功能。
 *
 * Design tokens:
 * - 表头: text-[11px] text-[#737373] uppercase tracking-wider
 * - 表体行: text-[13px] text-[#404040], 偶数行 bg-[#FAFAFA]
 * - 排序图标: ArrowUpDown/ArrowUp/ArrowDown, 三态切换
 * - 分页: 底部 page info + prev/next + page numbers
 * - 选择: Checkbox 列
 */

// ============================================================
// 类型定义
// ============================================================

export interface TableColumn<T = unknown> {
  /** 列唯一标识（对应 data 中的字段名） */
  key: string;
  /** 列标题 */
  title: string;
  /** 是否可排序 */
  sortable?: boolean;
  /** 自定义渲染函数 */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** 列宽度（Tailwind CSS class） */
  width?: string;
}

export interface AdminTableProps<T = unknown> {
  /** 列定义 */
  columns: TableColumn<T>[];
  /** 数据源 */
  data: T[];
  /** 当前排序字段 */
  sortBy?: string;
  /** 当前排序方向 */
  sortOrder?: "asc" | "desc";
  /** 排序变化回调 */
  onSort?: (key: string, order: "asc" | "desc") => void;
  /** 当前页码（从 1 开始） */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 总数据条数 */
  total?: number;
  /** 分页变化回调 */
  onPageChange?: (page: number) => void;
  /** 每页条数变化回调（触发时自动重置到第 1 页） */
  onPageSizeChange?: (pageSize: number) => void;
  /** 是否加载中 */
  loading?: boolean;
  /** 空状态配置（不传则使用默认 AdminEmpty） */
  empty?: React.ReactNode;
  /** 行点击回调 */
  onRowClick?: (row: T, index: number) => void;
  /** 是否可选 */
  selectable?: boolean;
  /** 已选中的 ID 列表 */
  selectedIds?: string[];
  /** 选择变化回调 */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** 额外的 className */
  className?: string;
  /** 行的 key 提取函数，用于选择（默认取 row.id） */
  rowKey?: (row: T) => string;
}

// ============================================================
// 常量
// ============================================================

const MAX_PAGE_BUTTONS = 7; // 最多显示 7 个页码按钮
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// ============================================================
// 分页计算
// ============================================================

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= MAX_PAGE_BUTTONS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  pages.push(1);
  if (left > 2) pages.push("ellipsis");

  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  if (right < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
}

// ============================================================
// 排序图标组件
// ============================================================

interface SortIconProps {
  active: boolean;
  direction?: "asc" | "desc";
}

function SortIcon({ active, direction }: SortIconProps) {
  if (!active) {
    return (
      <ArrowUpDown
        size={12}
        strokeWidth={1.75}
        className="text-[#A3A3A3] shrink-0"
      />
    );
  }
  if (direction === "asc") {
    return (
      <ArrowUp
        size={12}
        strokeWidth={1.75}
        className="text-[#0A0A0A] shrink-0"
      />
    );
  }
  return (
    <ArrowDown
      size={12}
      strokeWidth={1.75}
      className="text-[#0A0A0A] shrink-0"
    />
  );
}

// ============================================================
// AdminTable 组件
// ============================================================

function AdminTableInner<T>({
  columns,
  data,
  sortBy,
  sortOrder,
  onSort,
  page = 1,
  pageSize = 20,
  total,
  onPageChange,
  onPageSizeChange,
  loading = false,
  empty,
  onRowClick,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  className,
  rowKey,
}: AdminTableProps<T>) {
  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : 0;

  // 三态排序切换
  const handleSort = useCallback(
    (key: string) => {
      if (!onSort) return;
      if (sortBy === key) {
        // 当前列: asc -> desc -> 取消排序
        if (sortOrder === "asc") {
          onSort(key, "desc");
        } else if (sortOrder === "desc") {
          // 取消排序（传回空字符串表示）
          onSort("", "asc");
        }
      } else {
        onSort(key, "asc");
      }
    },
    [sortBy, sortOrder, onSort],
  );

  // 每页条数变化 —— 切换时自动重置到第 1 页
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value);
      onPageSizeChange?.(newSize);
      onPageChange?.(1);
    },
    [onPageSizeChange, onPageChange],
  );

  // 全选 / 取消全选
  const allSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((row) => {
      const id = rowKey
        ? rowKey(row)
        : String((row as Record<string, unknown>).id);
      return selectedIds.includes(id);
    });
  }, [data, selectedIds, rowKey]);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      const allIds = data.map((row) =>
        rowKey
          ? rowKey(row)
          : String((row as Record<string, unknown>).id),
      );
      onSelectionChange(allIds);
    }
  }, [allSelected, data, onSelectionChange, rowKey]);

  const handleSelectRow = useCallback(
    (row: T) => {
      if (!onSelectionChange) return;
      const id = rowKey
        ? rowKey(row)
        : String((row as Record<string, unknown>).id);
      const next = selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id];
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange, rowKey],
  );

  const getId = useCallback(
    (row: T) =>
      rowKey ? rowKey(row) : String((row as Record<string, unknown>).id),
    [rowKey],
  );

  // 加载态
  if (loading) {
    return (
      <div className={cn("bg-white border border-[#E5E5E5] rounded-lg", className)}>
        <AdminLoading type="table" rows={pageSize > 10 ? 10 : pageSize} />
      </div>
    );
  }

  // 空态
  if (data.length === 0) {
    return (
      <div className={cn("bg-white border border-[#E5E5E5] rounded-lg", className)}>
        {empty ?? <AdminEmpty />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white border border-[#E5E5E5] rounded-lg overflow-hidden",
        className,
      )}
    >
      <Table className="w-full">
        {/* 表头 */}
        <TableHeader>
          <TableRow className="border-b border-[#E5E5E5] hover:bg-transparent">
            {/* 选择列 */}
            {selectable && (
              <TableHead className="w-10 px-3 py-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="全选"
                  className={cn(
                    "h-4 w-4 rounded-[4px]",
                    "border-[#D4D4D4] data-[state=checked]:bg-[#0A0A0A] data-[state=checked]:border-[#0A0A0A]",
                  )}
                />
              </TableHead>
            )}

            {columns.map((col) => (
              <TableHead
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  "px-4 py-3",
                  "text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373]",
                  "font-medium whitespace-nowrap select-none",
                  // 可排序列的交互样式
                  col.sortable && [
                    "cursor-pointer hover:text-[#0A0A0A]",
                    "transition-colors duration-150",
                  ],
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  sortBy === col.key
                    ? sortOrder === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.title}
                  {col.sortable && (
                    <SortIcon
                      active={sortBy === col.key}
                      direction={sortBy === col.key ? sortOrder : undefined}
                    />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        {/* 表体 */}
        <TableBody>
          {data.map((row, rowIndex) => {
            const isSelected = selectedIds.includes(getId(row));
            return (
              <TableRow
                key={getId(row) ?? rowIndex}
                className={cn(
                  "border-b border-[#E5E5E5] last:border-b-0",
                  "transition-colors duration-150",
                  // 偶数行浅灰底
                  rowIndex % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                  // 选中态
                  isSelected && "bg-[#F5F5F5]",
                  // 可点击行
                  onRowClick && "cursor-pointer hover:bg-[#F5F5F5]",
                )}
                onClick={
                  onRowClick
                    ? (e) => {
                        // 不拦截 checkbox 的点击
                        const target = e.target as HTMLElement;
                        if (target.closest('[role="checkbox"]')) return;
                        onRowClick(row, rowIndex);
                      }
                    : undefined
                }
              >
                {/* 选择列 */}
                {selectable && (
                  <TableCell className="w-10 px-3 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRow(row)}
                      aria-label={`选择第 ${rowIndex + 1} 行`}
                      className={cn(
                        "h-4 w-4 rounded-[4px]",
                        "border-[#D4D4D4] data-[state=checked]:bg-[#0A0A0A] data-[state=checked]:border-[#0A0A0A]",
                      )}
                    />
                  </TableCell>
                )}

                {columns.map((col) => {
                  const value = (row as Record<string, unknown>)[col.key];
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "px-4 py-3",
                        "text-[13px] leading-[1.5] text-[#404040]",
                        "whitespace-nowrap",
                      )}
                    >
                      {col.render
                        ? col.render(value as unknown, row, rowIndex)
                        : (value as React.ReactNode) ?? "—"}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* 分页栏 */}
      {total && totalPages > 0 && onPageChange && (
        <div
          className={cn(
            "flex items-center justify-between",
            "px-5 py-3",
            "border-t border-[#E5E5E5]",
          )}
        >
          {/* 左侧：信息 */}
          <span className="text-[12px] leading-[1.5] text-[#737373] shrink-0">
            共 {total} 条，第 {page}/{totalPages} 页
          </span>

          {/* 右侧：分页按钮 + 每页条数选择器 */}
          <div className="flex items-center gap-4">
            {/* 分页按钮组 */}
            <div className="flex items-center gap-1">
              {/* 上一页 */}
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className={cn(
                  "flex items-center justify-center",
                  "w-8 h-8 rounded-md",
                  "text-[#404040] hover:bg-[#FAFAFA]",
                  "transition-colors duration-150",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                )}
                aria-label="上一页"
              >
                <ChevronLeft size={16} strokeWidth={1.75} />
              </button>

              {/* 页码 */}
              {getPageNumbers(page, totalPages).map((p, idx) => {
                if (p === "ellipsis") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-[12px] text-[#A3A3A3]"
                      aria-hidden="true"
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={cn(
                      "w-8 h-8 rounded-md",
                      "text-[12px] leading-[1.5]",
                      "transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                      p === page
                        ? "bg-[#0A0A0A] text-white"
                        : "text-[#404040] hover:bg-[#FAFAFA]",
                    )}
                    aria-label={`第 ${p} 页`}
                    aria-current={p === page ? "page" : undefined}
                  >
                    {p}
                  </button>
                );
              })}

              {/* 下一页 */}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className={cn(
                  "flex items-center justify-center",
                  "w-8 h-8 rounded-md",
                  "text-[#404040] hover:bg-[#FAFAFA]",
                  "transition-colors duration-150",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                )}
                aria-label="下一页"
              >
                <ChevronRight size={16} strokeWidth={1.75} />
              </button>
            </div>

            {/* 每页条数选择器 */}
            <div className="flex items-center gap-2 shrink-0">
              <label
                htmlFor="admin-table-page-size"
                className="text-[13px] leading-[1.5] text-[#737373] whitespace-nowrap"
              >
                每页：
              </label>
              <select
                id="admin-table-page-size"
                value={pageSize}
                onChange={handlePageSizeChange}
                className={cn(
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "border border-[#E5E5E5]",
                  "rounded-md",
                  "px-2 py-1",
                  "bg-white",
                  "cursor-pointer",
                  "focus:outline-none focus:border-[#0A0A0A]",
                  "transition-colors duration-150",
                )}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 导出版本 —— 无需泛型约束 */
export function AdminTable<T>(
  props: AdminTableProps<T>,
) {
  return <AdminTableInner {...props} />;
}

export default AdminTable;
