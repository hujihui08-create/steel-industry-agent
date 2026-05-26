// ============================================================
// MenuManagement -- 菜单管理页面
//
// 包含功能：
//   1. 树形表格展示（展开/折叠、层级缩进）
//   2. 添加/编辑菜单弹窗（表单 Dialog）
//   3. 删除确认弹窗（含子菜单数量提示）
//
// Design tokens: 使用项目色板/字阶/圆角规范
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Menu,
  ChevronRight,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminModal } from "./AdminModal";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMenuTree, createMenu, updateMenu, deleteMenu } from "@/app/api/admin";
import type { MenuNode } from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

/** 可见角色选项 */
const ROLE_OPTIONS = [
  { key: "super_admin", label: "超级管理员" },
  { key: "operator", label: "运营管理员" },
  { key: "data_admin", label: "数据管理员" },
  { key: "viewer", label: "观察者" },
];

// ============================================================
// 类型
// ============================================================

/** 扁平化后的行数据 */
interface FlatMenuRow {
  id: number;
  parent_id: number | null;
  name: string;
  icon: string;
  path: string;
  sort_order: number;
  visible_roles: string;
  status: number;
  created_at: string;
  updated_at: string;
  /** 树层级深度（0 = 根） */
  depth: number;
  /** 是否有子菜单 */
  hasChildren: boolean;
  /** 子菜单数量 */
  childCount: number;
}

/** 表单数据 */
interface MenuFormData {
  parent_id: number | null;
  name: string;
  icon: string;
  path: string;
  sort_order: number;
  visible_roles: string;
  status: number;
}

const EMPTY_FORM: MenuFormData = {
  parent_id: null,
  name: "",
  icon: "",
  path: "",
  sort_order: 0,
  visible_roles: "viewer",
  status: 1,
};

// ============================================================
// 工具函数
// ============================================================

/** 将 MenuNode 树扁平化为带层级深度的行数组 */
function flattenMenuTree(
  nodes: MenuNode[],
  depth: number = 0,
  expandedIds: Set<number>,
): FlatMenuRow[] {
  const result: FlatMenuRow[] = [];
  for (const node of nodes) {
    const childCount = node.children?.length ?? 0;
    const row: FlatMenuRow = {
      id: node.id,
      parent_id: node.parent_id,
      name: node.name,
      icon: node.icon,
      path: node.path,
      sort_order: node.sort_order,
      visible_roles: node.visible_roles,
      status: node.status,
      created_at: node.created_at,
      updated_at: node.updated_at,
      depth,
      hasChildren: childCount > 0,
      childCount,
    };
    result.push(row);

    // 如果已展开且有子节点，递归处理子节点
    if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
      result.push(...flattenMenuTree(node.children, depth + 1, expandedIds));
    }
  }
  return result;
}

/** 从树中递归查找节点 */
function findNodeInTree(nodes: MenuNode[], id: number): MenuNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** 将角色字符串转为可读标签 */
function formatRoles(rolesStr: string): string {
  if (!rolesStr) return "—";
  const roles = rolesStr.split(",").filter(Boolean);
  return roles
    .map((r) => ROLE_OPTIONS.find((o) => o.key === r.trim())?.label ?? r.trim())
    .join("、");
}

// ============================================================
// MenuManagement 组件
// ============================================================

export function MenuManagement() {
  // ---- 数据状态 ----
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // ---- 展开/折叠 ----
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // ---- 添加/编辑弹窗 ----
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MenuFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ---- 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState<FlatMenuRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============================================================
  // 数据加载
  // ============================================================

  const loadMenuTree = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const tree = await getMenuTree();
      setMenuTree(tree);
    } catch {
      setDataError("加载菜单数据失败，请重试");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenuTree();
  }, [loadMenuTree]);

  // 首次加载后自动展开所有一级菜单
  useEffect(() => {
    if (menuTree.length > 0) {
      const rootIds = new Set(menuTree.map((n) => n.id));
      setExpandedIds(rootIds);
    }
  }, [menuTree]);

  // ============================================================
  // 扁平化行数据（根据展开状态动态计算）
  // ============================================================

  const flatRows = useMemo(
    () => flattenMenuTree(menuTree, 0, expandedIds),
    [menuTree, expandedIds],
  );

  // ============================================================
  // 展开/折叠
  // ============================================================

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /** 全部展开 */
  const expandAll = useCallback(() => {
    const allIds = new Set<number>();
    const collect = (nodes: MenuNode[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          allIds.add(node.id);
          collect(node.children);
        }
      }
    };
    collect(menuTree);
    setExpandedIds(allIds);
  }, [menuTree]);

  /** 全部折叠 */
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // ============================================================
  // 表单校验
  // ============================================================

  const validateForm = useCallback((data: MenuFormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) errors.name = "菜单名称不能为空";
    if (!data.path.trim()) errors.path = "路由路径不能为空";
    return errors;
  }, []);

  // ============================================================
  // CRUD 操作
  // ============================================================

  const openAddForm = useCallback(() => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((row: FlatMenuRow) => {
    setIsEditing(true);
    setEditingId(row.id);
    setFormData({
      parent_id: row.parent_id,
      name: row.name,
      icon: row.icon,
      path: row.path,
      sort_order: row.sort_order,
      visible_roles: row.visible_roles,
      status: row.status,
    });
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(async () => {
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.querySelector<HTMLInputElement>(
        `[data-form-field="${firstErrorKey}"]`,
      );
      el?.focus();
      return;
    }

    setFormSubmitting(true);
    try {
      const payload: Partial<MenuNode> = {
        parent_id: formData.parent_id,
        name: formData.name.trim(),
        icon: formData.icon.trim(),
        path: formData.path.trim(),
        sort_order: formData.sort_order,
        visible_roles: formData.visible_roles,
        status: formData.status,
      };

      if (isEditing && editingId !== null) {
        await updateMenu(editingId, payload);
        showSuccessToast(`菜单"${formData.name}"已更新`);
      } else {
        await createMenu(payload);
        showSuccessToast(`菜单"${formData.name}"已创建`);
      }

      setFormOpen(false);
      await loadMenuTree();
    } catch {
      showErrorToast(isEditing ? "更新菜单失败，请重试" : "创建菜单失败，请重试");
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, isEditing, editingId, validateForm, loadMenuTree]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteMenu(deleteTarget.id);
      showSuccessToast(`菜单"${deleteTarget.name}"已删除`);
      setDeleteTarget(null);
      await loadMenuTree();
    } catch {
      showErrorToast("删除菜单失败，请重试");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, loadMenuTree]);

  // ============================================================
  // 父级菜单选项（用于下拉框，排除自身及其子节点）
  // ============================================================

  const parentOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: "null", label: "无（一级菜单）" },
    ];

    const collect = (nodes: MenuNode[], depth: number) => {
      for (const node of nodes) {
        // 编辑时排除自身
        if (isEditing && node.id === editingId) continue;
        const prefix = depth > 0 ? "├ ".repeat(Math.min(depth, 3)) : "";
        options.push({
          value: String(node.id),
          label: `${prefix}${node.name}`,
        });
        if (node.children) {
          collect(node.children, depth + 1);
        }
      }
    };
    collect(menuTree, 0);
    return options;
  }, [menuTree, isEditing, editingId]);

  // ============================================================
  // 角色多选切换
  // ============================================================

  const toggleRole = useCallback((key: string) => {
    setFormData((prev) => {
      const current = prev.visible_roles
        ? prev.visible_roles.split(",").filter(Boolean)
        : [];
      const next = current.includes(key)
        ? current.filter((r) => r !== key)
        : [...current, key];
      return { ...prev, visible_roles: next.join(",") };
    });
  }, []);

  /** 已选角色数组 */
  const selectedRoles = useMemo(
    () => (formData.visible_roles ? formData.visible_roles.split(",").filter(Boolean) : []),
    [formData.visible_roles],
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
  );

  const outlineBtnClass = cn(
    "inline-flex items-center gap-1.5",
    "h-8 px-3.5 rounded-full",
    "border border-[#E5E5E5] bg-white",
    "text-[#0A0A0A] text-[13px] leading-[1.5]",
    "hover:bg-[#FAFAFA]",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
  );

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="菜单管理"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "系统管理" },
        { label: "菜单管理" },
      ]}
      actions={
        <>
          <button type="button" onClick={expandAll} className={outlineBtnClass}>
            <ChevronDown size={14} strokeWidth={1.75} />
            全部展开
          </button>
          <button type="button" onClick={collapseAll} className={outlineBtnClass}>
            <ChevronRight size={14} strokeWidth={1.75} />
            全部折叠
          </button>
          <button type="button" onClick={openAddForm} className={primaryBtnClass}>
            <Plus size={14} strokeWidth={1.75} />
            添加菜单
          </button>
        </>
      }
    >
      {/* ========================================================== */}
      {/* 错误态 */}
      {/* ========================================================== */}
      {dataError && !dataLoading && (
        <div
          className={cn(
            "mb-4 px-4 py-3 rounded-lg",
            "border border-[#FECACA] bg-[#FEF2F2]",
            "text-[13px] leading-[1.5] text-[#B42318]",
            "flex items-center gap-2",
          )}
        >
          <span className="inline-block w-4 h-4 rounded-full border border-[#B42318] flex-shrink-0" />
          {dataError}
          <button
            type="button"
            onClick={() => {
              setDataError(null);
              loadMenuTree();
            }}
            className="ml-auto text-[#0A0A0A] underline hover:text-[#404040] text-[12px]"
          >
            重试
          </button>
        </div>
      )}

      {/* ========================================================== */}
      {/* 树形表格 */}
      {/* ========================================================== */}
      {dataLoading ? (
        <div className="bg-white border border-[#E5E5E5] rounded-lg">
          <AdminLoading type="table" rows={6} />
        </div>
      ) : flatRows.length === 0 ? (
        <AdminEmpty
          title="暂无菜单数据"
          description="点击上方「添加菜单」按钮创建第一个菜单"
        />
      ) : (
        <div
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg overflow-hidden",
          )}
        >
          {/* 表头 */}
          <div
            className={cn(
              "bg-[#FAFAFA] border-b border-[#E5E5E5]",
              "grid grid-cols-[1fr_100px_200px_80px_180px_100px]",
            )}
          >
            {["菜单名称", "图标", "路由路径", "排序", "可见角色", "操作"].map(
              (title, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center h-9 px-4",
                    "text-[11px] leading-[1.5] text-[#737373] font-medium",
                    idx === 0 ? "justify-start" : "justify-start",
                  )}
                >
                  {title}
                </div>
              ),
            )}
          </div>

          {/* 表体 */}
          <div className="divide-y divide-[#E5E5E5]">
            {flatRows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "grid grid-cols-[1fr_100px_200px_80px_180px_100px]",
                  "hover:bg-[#FAFAFA] transition-colors duration-150",
                )}
              >
                {/* 菜单名称（带缩进与展开按钮） */}
                <div className="flex items-center h-11 px-4">
                  {/* 展开/折叠按钮 */}
                  <button
                    type="button"
                    onClick={() => row.hasChildren && toggleExpand(row.id)}
                    disabled={!row.hasChildren}
                    className={cn(
                      "flex items-center justify-center",
                      "w-5 h-5 rounded-sm shrink-0",
                      "mr-1",
                      row.hasChildren
                        ? "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#EEEEEE] cursor-pointer"
                        : "text-transparent cursor-default",
                      "transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    )}
                    aria-label={
                      row.hasChildren
                        ? expandedIds.has(row.id)
                          ? "折叠子菜单"
                          : "展开子菜单"
                        : undefined
                    }
                  >
                    {expandedIds.has(row.id) ? (
                      <ChevronDown size={14} strokeWidth={1.75} />
                    ) : (
                      <ChevronRight size={14} strokeWidth={1.75} />
                    )}
                  </button>

                  {/* 缩进 */}
                  {row.depth > 0 && (
                    <div style={{ width: row.depth * 24 }} aria-hidden="true" />
                  )}

                  {/* 菜单图标 + 名称 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Menu
                      size={14}
                      strokeWidth={1.75}
                      className={cn(
                        "shrink-0",
                        row.depth === 0 ? "text-[#0A0A0A]" : "text-[#737373]",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate",
                        "text-[13px] leading-[1.5]",
                        row.depth === 0
                          ? "text-[#0A0A0A] font-medium"
                          : "text-[#404040]",
                      )}
                    >
                      {row.name}
                    </span>
                  </div>
                </div>

                {/* 图标名 */}
                <div className="flex items-center h-11 px-4">
                  <span
                    className={cn(
                      "text-[12px] leading-[1.5] text-[#737373]",
                      "font-mono truncate",
                    )}
                    title={row.icon || "—"}
                  >
                    {row.icon || "—"}
                  </span>
                </div>

                {/* 路由路径 */}
                <div className="flex items-center h-11 px-4">
                  <span
                    className="text-[12px] leading-[1.5] text-[#404040] font-mono truncate"
                    title={row.path}
                  >
                    {row.path}
                  </span>
                </div>

                {/* 排序 */}
                <div className="flex items-center h-11 px-4">
                  <span className="text-[13px] leading-[1.5] text-[#404040] tabular-nums">
                    {row.sort_order}
                  </span>
                </div>

                {/* 可见角色 */}
                <div className="flex items-center h-11 px-4">
                  <span
                    className="text-[12px] leading-[1.5] text-[#737373] truncate"
                    title={formatRoles(row.visible_roles)}
                  >
                    {formatRoles(row.visible_roles)}
                  </span>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center h-11 px-4 gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditForm(row);
                    }}
                    className={cn(
                      "flex items-center justify-center",
                      "w-7 h-7 rounded-md",
                      "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                      "transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    )}
                    aria-label={`编辑菜单 ${row.name}`}
                  >
                    <Pencil size={14} strokeWidth={1.75} />
                  </button>
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
                    aria-label={`删除菜单 ${row.name}`}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* 添加/编辑菜单弹窗 */}
      {/* ========================================================== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            "p-6 max-w-[520px]",
            "max-h-[90vh] overflow-y-auto",
          )}
        >
          <DialogHeader className="mb-5">
            <DialogTitle className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
              {isEditing ? "编辑菜单" : "添加菜单"}
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-[1.5] text-[#737373] mt-1">
              {isEditing
                ? "修改菜单的名称、图标、路径和权限配置"
                : "创建一个新的菜单项，可配置图标、路由和可见角色"}
            </DialogDescription>
          </DialogHeader>

          {/* 表单内容 */}
          <div className="flex flex-col gap-4">
            {/* 父级菜单 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                父级菜单
              </label>
              <Select
                value={formData.parent_id === null ? "null" : String(formData.parent_id)}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    parent_id: v === "null" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger
                  variant="filter"
                  className="h-9 text-[13px] leading-[1.5]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent variant="filter" className="max-h-[260px]">
                  {parentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 菜单名称 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                菜单名称 <span className="text-[#B42318]">*</span>
              </label>
              <Input
                data-form-field="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="如：菜单管理"
                aria-invalid={!!formErrors.name}
                aria-describedby={formErrors.name ? "err-name" : undefined}
                className={cn(
                  "h-9 px-3 rounded-md",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border",
                  formErrors.name
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10 focus-visible:border-[#B42318]"
                    : "border-[#E5E5E5] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                )}
              />
              {formErrors.name && (
                <span
                  id="err-name"
                  className="text-[11px] leading-[1.5] text-[#B42318]"
                >
                  {formErrors.name}
                </span>
              )}
            </div>

            {/* 图标 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                图标
              </label>
              <Input
                value={formData.icon}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, icon: e.target.value }))
                }
                placeholder="如：LayoutDashboard"
                className={cn(
                  "h-9 px-3 rounded-md",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border border-[#E5E5E5]",
                  "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                )}
              />
              <span className="text-[11px] leading-[1.5] text-[#A3A3A3]">
                lucide-react 图标名称，留空则显示默认图标
              </span>
            </div>

            {/* 路由路径 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                路由路径 <span className="text-[#B42318]">*</span>
              </label>
              <Input
                data-form-field="path"
                value={formData.path}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, path: e.target.value }))
                }
                placeholder="如：/admin/system/menus"
                aria-invalid={!!formErrors.path}
                aria-describedby={formErrors.path ? "err-path" : undefined}
                className={cn(
                  "h-9 px-3 rounded-md",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border",
                  formErrors.path
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10 focus-visible:border-[#B42318]"
                    : "border-[#E5E5E5] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                )}
              />
              {formErrors.path && (
                <span
                  id="err-path"
                  className="text-[11px] leading-[1.5] text-[#B42318]"
                >
                  {formErrors.path}
                </span>
              )}
            </div>

            {/* 排序号 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                排序号
              </label>
              <Input
                type="number"
                value={String(formData.sort_order)}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value, 10) || 0,
                  }))
                }
                placeholder="0"
                className={cn(
                  "h-9 px-3 rounded-md w-[120px]",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border border-[#E5E5E5]",
                  "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  "[appearance:textfield]",
                  "[&::-webkit-outer-spin-button]:appearance-none",
                  "[&::-webkit-inner-spin-button]:appearance-none",
                )}
              />
              <span className="text-[11px] leading-[1.5] text-[#A3A3A3]">
                数值越小越靠前
              </span>
            </div>

            {/* 可见角色 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                可见角色
              </span>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const checked = selectedRoles.includes(role.key);
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => toggleRole(role.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        "h-7 px-2.5 rounded-full",
                        "text-[12px] leading-[1.5]",
                        "border transition-colors duration-150",
                        "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                        checked
                          ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                          : "border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
                      )}
                      aria-pressed={checked}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] leading-[1.5] text-[#A3A3A3]">
                未选中的角色将看不到此菜单
              </span>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                  启用状态
                </span>
                <span className="text-[11px] leading-[1.5] text-[#A3A3A3]">
                  关闭后菜单将不在导航中显示
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.status === 1}
                aria-label="切换启用状态"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    status: prev.status === 1 ? 0 : 1,
                  }))
                }
                className={cn(
                  "relative inline-flex h-6 w-10 shrink-0 rounded-full",
                  "border-2 transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                  formData.status === 1
                    ? "bg-[#0A0A0A] border-[#0A0A0A]"
                    : "bg-[#CBCED4] border-[#CBCED4]",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm",
                    "transition-transform duration-150",
                    formData.status === 1 ? "translate-x-[18px]" : "translate-x-0",
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={formSubmitting}
              className={cn(
                "h-8 px-4 rounded-full",
                "border border-[#E5E5E5] bg-white",
                "text-[#0A0A0A] text-[13px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleFormSubmit}
              disabled={formSubmitting}
              className={cn(
                "h-8 px-4 rounded-full",
                "bg-[#0A0A0A] text-white",
                "text-[13px] leading-[1.5] font-medium",
                "hover:bg-[#404040]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  提交中...
                </span>
              ) : (
                "确定"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* 删除确认弹窗 */}
      {/* ========================================================== */}
      <AdminModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="确认删除菜单"
        description={
          deleteTarget && deleteTarget.childCount > 0
            ? `该菜单下有 ${deleteTarget.childCount} 个子菜单，删除后子菜单将一并移除。确定删除吗？`
            : `确定要删除菜单"${deleteTarget?.name}"吗？删除后不可恢复。`
        }
        confirmLabel="删除"
        cancelLabel="取消"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </AdminPageShell>
  );
}
