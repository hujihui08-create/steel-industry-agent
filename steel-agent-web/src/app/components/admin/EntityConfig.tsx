// ============================================================
// EntityConfig -- 实体配置管理页面
//
// 功能：
//   1. 添加实体值（输入 + 按钮）
//   2. 实体列表展示（表格）
//   3. 删除确认弹窗（AdminModal）
//
// Design tokens: 使用项目色板/字阶/圆角规范
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Info, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminModal } from "./AdminModal";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEntityConfigs,
  createEntityConfig,
  deleteEntityConfig,
  type EntityConfig,
} from "@/app/api/admin";

// ============================================================
// 常量
// ============================================================

/** 支持的实体类型 */
const ENTITY_TYPES = [
  { key: "region", label: "地区" },
  { key: "category", label: "品种" },
  { key: "spec", label: "规格" },
];

/** 实体类型到中文标签的映射 */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  region: "地区",
  category: "品种",
  spec: "规格",
};

// ============================================================
// EntityConfig 组件
// ============================================================

export function EntityConfig() {
  // ---- 实体类型筛选 ----
  const [entityType, setEntityType] = useState("region");

  // ---- 列表状态 ----
  const [configs, setConfigs] = useState<EntityConfig[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ---- 添加 ----
  const [inputValue, setInputValue] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // ---- 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState<EntityConfig | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============================================================
  // 数据加载
  // ============================================================

  const loadConfigs = useCallback(async (type: string) => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await getEntityConfigs(type);
      setConfigs(data);
    } catch {
      setListError("加载实体配置失败，请重试");
    } finally {
      setListLoading(false);
    }
  }, []);

  // 首次加载 + 类型切换时重新加载
  useEffect(() => {
    loadConfigs(entityType);
  }, [entityType, loadConfigs]);

  // ============================================================
  // 添加操作
  // ============================================================

  const handleAdd = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // 检查重复
    if (configs.some((c) => c.entity_value === trimmed)) {
      showErrorToast(`实体值"${trimmed}"已存在`);
      return;
    }

    setAddLoading(true);
    try {
      await createEntityConfig(entityType, trimmed);
      showSuccessToast(`已添加"${ENTITY_TYPE_LABELS[entityType] ?? entityType}"：${trimmed}`);
      setInputValue("");
      await loadConfigs(entityType);
    } catch {
      showErrorToast("添加失败，请重试");
    } finally {
      setAddLoading(false);
    }
  }, [inputValue, entityType, configs, loadConfigs]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !addLoading) {
        handleAdd();
      }
    },
    [handleAdd, addLoading],
  );

  // ============================================================
  // 删除操作
  // ============================================================

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteEntityConfig(deleteTarget.id);
      showSuccessToast(`已删除"${deleteTarget.entity_value}"`);
      setDeleteTarget(null);
      await loadConfigs(entityType);
    } catch {
      showErrorToast("删除失败，请重试");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, loadConfigs, entityType]);

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns: TableColumn<EntityConfig>[] = useMemo(
    () => [
      {
        key: "entity_value",
        title: "实体值",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#0A0A0A] font-medium">
            {row.entity_value}
          </span>
        ),
      },
      {
        key: "created_at",
        title: "创建时间",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#737373] tabular-nums">
            {row.created_at || "-"}
          </span>
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: "80px",
        render: (_, row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className={cn(
              "flex items-center justify-center",
              "w-7 h-7 rounded-md",
              "text-[#737373] hover:text-[#B42318] hover:bg-[#FEF2F2]",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-[#B42318]/10",
            )}
            aria-label={`删除实体 ${row.entity_value}`}
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        ),
      },
    ],
    [],
  );

  // ============================================================
  // 按钮样式
  // ============================================================

  const primaryBtnClass = cn(
    "inline-flex items-center gap-1.5",
    "h-8 px-3.5 rounded-full",
    "bg-[#0A0A0A] text-white",
    "text-[13px] leading-[1.5] font-medium",
    "hover:bg-[#404040]",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  );

  const entityTypeLabel = ENTITY_TYPE_LABELS[entityType] ?? entityType;

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="实体配置"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "Agent管理" },
        { label: "实体配置" },
      ]}
    >
      {/* ========================================================== */}
      {/* 1. 筛选 + 添加区域 */}
      {/* ========================================================== */}
      <div className="flex items-center gap-3 mb-4">
        {/* 实体类型下拉 */}
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger variant="filter" className="h-9 w-[140px] text-[13px] leading-[1.5]">
            <SelectValue placeholder="选择类型" />
          </SelectTrigger>
          <SelectContent variant="filter">
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 添加输入框 */}
        <div className="relative flex-1 max-w-[400px]">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`输入${entityTypeLabel}名称...`}
            disabled={addLoading}
            className={cn(
              "h-9 pl-3 pr-3 rounded-md",
              "border border-[#E5E5E5]",
              "text-[13px] leading-[1.5] text-[#404040]",
              "placeholder:text-[#A3A3A3]",
              "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
            )}
          />
        </div>

        {/* 添加按钮 */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={addLoading || !inputValue.trim()}
          className={primaryBtnClass}
        >
          {addLoading ? (
            <span
              className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Plus size={14} strokeWidth={1.75} />
          )}
          添加
        </button>
      </div>

      {/* ========================================================== */}
      {/* 2. 错误态 */}
      {/* ========================================================== */}
      {listError && !listLoading && (
        <div
          className={cn(
            "mb-4 px-4 py-3 rounded-lg",
            "border border-[#FECACA] bg-[#FEF2F2]",
            "text-[13px] leading-[1.5] text-[#B42318]",
            "flex items-center gap-2",
          )}
        >
          <Info size={14} strokeWidth={1.75} />
          {listError}
          <button
            type="button"
            onClick={() => { setListError(null); loadConfigs(entityType); }}
            className="ml-auto text-[#0A0A0A] underline hover:text-[#404040] text-[12px]"
          >
            重试
          </button>
        </div>
      )}

      {/* ========================================================== */}
      {/* 3. 实体列表 */}
      {/* ========================================================== */}
      <AdminTable<EntityConfig>
        columns={columns}
        data={configs}
        loading={listLoading}
        rowKey={(row) => String(row.id)}
        empty={
          <AdminEmpty
            title="暂无配置项"
            description={`还未添加任何${entityTypeLabel}实体值，在上方输入框中添加`}
          />
        }
        className="mb-6"
      />

      {/* ========================================================== */}
      {/* 4. 删除确认弹窗 */}
      {/* ========================================================== */}
      <AdminModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="确认删除实体"
        description={`确定要删除${entityTypeLabel}"${deleteTarget?.entity_value}"吗？删除后不可恢复。`}
        confirmLabel="删除"
        cancelLabel="取消"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </AdminPageShell>
  );
}
