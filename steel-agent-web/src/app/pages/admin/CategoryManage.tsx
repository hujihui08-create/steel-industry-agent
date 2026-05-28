import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminModal } from "@/app/components/admin/AdminModal";
import { showSuccessToast, showErrorToast } from "@/app/components/admin/AdminToast";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategory,
} from "@/app/api/admin";
import type { Category } from "@/app/types/admin";

// ============================================================
// 类型定义
// ============================================================

interface CategoryFormData {
  name: string;
  type: "spot" | "futures";
  sort_order: number;
  parent_id?: number | null;
}

const EMPTY_FORM: CategoryFormData = {
  name: "",
  type: "spot",
  sort_order: 0,
  parent_id: null,
};

// ============================================================
// 辅助函数：将树形结构展平为带深度的列表
// ============================================================

function flattenTree(items: Category[], depth = 0): Array<Category & { _depth: number }> {
  return items.flatMap((item) => [
    { ...item, _depth: depth },
    ...flattenTree(item.children || [], depth + 1),
  ]);
}

// ============================================================
// CategoryManage
// ============================================================

export default function CategoryManage() {
  // ---------- 列表状态 ----------
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---------- 筛选状态 ----------
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // ---------- 表单弹窗 ----------
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  // ---------- 删除确认 ----------
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingName, setDeletingName] = useState("");
  const [deletingHasChildren, setDeletingHasChildren] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------- 切换状态 ----------
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // ---------- 加载数据 ----------
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params: { type?: string; status?: string } = {};
      if (filterType !== "all") params.type = filterType;
      if (filterStatus !== "all") params.status = filterStatus;
      const result = await getCategories(params);
      setCategories(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载品种列表失败，请刷新重试";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ---------- 表单操作 ----------
  const handleOpenAdd = useCallback(() => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((cat: Category) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      type: cat.type,
      sort_order: cat.sort_order,
      parent_id: cat.parent_id ?? null,
    });
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      showErrorToast("请输入品种名称");
      return;
    }

    setFormSaving(true);
    try {
      if (editingId !== null) {
        // 编辑模式：status 保持现有值
        const existing = categories.find((c) => c.id === editingId);
        await updateCategory(editingId, {
          name: formData.name.trim(),
          type: formData.type,
          status: existing?.status ?? "enabled",
          sort_order: formData.sort_order,
          parent_id: formData.parent_id ?? undefined,
        });
        showSuccessToast("更新成功");
      } else {
        await createCategory({
          name: formData.name.trim(),
          type: formData.type,
          sort_order: formData.sort_order,
          parent_id: formData.parent_id ?? undefined,
        });
        showSuccessToast("创建成功");
      }
      setFormOpen(false);
      fetchCategories();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "保存失败");
    } finally {
      setFormSaving(false);
    }
  }, [formData, editingId, categories, fetchCategories]);

  // ---------- 删除操作 ----------
  const handleOpenDelete = useCallback((cat: Category) => {
    setDeletingId(cat.id);
    setDeletingName(cat.name);
    setDeletingHasChildren((cat.children?.length || 0) > 0);
    setDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingId === null) return;
    setDeleteLoading(true);
    try {
      await deleteCategory(deletingId);
      showSuccessToast("删除成功");
      setDeleteModalOpen(false);
      fetchCategories();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingId, fetchCategories]);

  // ---------- 状态切换 ----------
  const handleToggle = useCallback(
    async (cat: Category) => {
      setTogglingIds((prev) => new Set(prev).add(cat.id));
      try {
        const updated = await toggleCategory(cat.id);
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        showSuccessToast(updated.status === "enabled" ? `「${cat.name}」已启用` : `「${cat.name}」已禁用`);
      } catch (err) {
        showErrorToast(err instanceof Error ? err.message : "切换失败");
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(cat.id);
          return next;
        });
      }
    },
    [],
  );

  // ---------- 渲染类型徽标 ----------
  const renderTypeBadge = (type: string) => {
    if (type === "spot") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] leading-[1.5] text-[#1F7A4D] bg-[#ECFDF5]">
          现货
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] leading-[1.5] text-[#B45309] bg-[#FFFBEB]">
        期货
      </span>
    );
  };

  // ============================================================
  // 渲染
  // ============================================================

  // ---------- 加载态 ----------
  if (loading && (categories ?? []).length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 bg-[#E5E5E5] rounded animate-pulse" />
          <div className="h-9 w-28 bg-[#E5E5E5] rounded-full animate-pulse" />
        </div>
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-[#E5E5E5] rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  // ---------- 错误态 ----------
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-[15px] text-[#B42318] mb-2">{loadError}</p>
        <Button
          onClick={fetchCategories}
          className="h-9 px-5 rounded-full bg-[#0A0A0A] text-white hover:bg-[#404040] text-[13px]"
        >
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] leading-[1.3] font-medium text-[#0A0A0A]">
            品种管理
          </h1>
          <p className="text-[12px] leading-[1.5] text-[#737373] mt-1">
            管理钢材品种分类，控制移动端可选品种范围
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="h-9 px-4 rounded-full bg-[#0A0A0A] text-white hover:bg-[#404040] text-[13px] leading-[1.5]"
        >
          <Plus size={14} strokeWidth={1.75} className="mr-1.5" />
          新增品种
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-2xl">
        <span className="text-[13px] leading-[1.5] text-[#404040] shrink-0">
          筛选：
        </span>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger variant="filter" className="w-[120px] h-8 text-[13px]">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent variant="filter">
            <SelectItem value="all" className="text-[13px]">全部类型</SelectItem>
            <SelectItem value="spot" className="text-[13px]">现货</SelectItem>
            <SelectItem value="futures" className="text-[13px]">期货</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger variant="filter" className="w-[120px] h-8 text-[13px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent variant="filter">
            <SelectItem value="all" className="text-[13px]">全部状态</SelectItem>
            <SelectItem value="enabled" className="text-[13px]">启用</SelectItem>
            <SelectItem value="disabled" className="text-[13px]">禁用</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[12px] text-[#A3A3A3] ml-auto tabular-nums">
          共 {(categories ?? []).length} 个品种
        </span>
      </div>

      {/* 品种表格 */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
        {(categories ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Tag size={32} strokeWidth={1.75} className="text-[#D4D4D4] mb-3" />
            <p className="text-[14px] text-[#A3A3A3]">
              {filterType !== "all" || filterStatus !== "all"
                ? "没有符合筛选条件的品种"
                : "暂无品种数据，点击「新增品种」开始添加"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                <th className="text-left px-5 py-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-medium w-[60px]">
                  #
                </th>
                <th className="text-left px-5 py-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-medium">
                  品种名称
                </th>
                <th className="text-left px-5 py-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-medium">
                  所属品类
                </th>
                <th className="text-left px-5 py-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-medium">
                  类型
                </th>
                <th className="text-left px-5 py-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-medium">
                  状态
                </th>
                <th className="text-left px-5 py-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-medium">
                  排序号
                </th>
                <th className="text-right px-5 py-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373] font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {flattenTree(categories).map((cat, idx) => {
                const isToggling = togglingIds.has(cat.id);
                const parentName = cat.parent_id
                  ? categories.find((c) => c.id === cat.parent_id)?.name ?? "-"
                  : "-";
                const depthPrefix = cat._depth > 0
                  ? "\u251C\u2500 ".repeat(cat._depth)
                  : "";
                return (
                  <tr
                    key={cat.id}
                    className={cn(
                      "hover:bg-[#FAFAFA] transition-colors duration-150",
                      cat.status === "disabled" && "opacity-60",
                    )}
                  >
                    <td className="px-5 py-3 text-[13px] leading-[1.5] text-[#A3A3A3] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3 text-[15px] leading-[1.6] text-[#404040]">
                      <span className="text-[#A3A3A3]">{depthPrefix}</span>
                      {cat.name}
                    </td>
                    <td className="px-5 py-3 text-[13px] leading-[1.5] text-[#737373]">
                      {parentName}
                    </td>
                    <td className="px-5 py-3">
                      {renderTypeBadge(cat.type)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={cat.status === "enabled"}
                          onCheckedChange={() => handleToggle(cat)}
                          disabled={isToggling}
                          className={cn(
                            "data-[state=checked]:bg-[#0A0A0A]",
                            "data-[state=unchecked]:bg-[#CBCED4]",
                          )}
                        />
                        <span
                          className={cn(
                            "text-[12px] leading-[1.5]",
                            cat.status === "enabled"
                              ? "text-[#1F7A4D]"
                              : "text-[#A3A3A3]",
                          )}
                        >
                          {cat.status === "enabled" ? "启用" : "禁用"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[15px] leading-[1.6] text-[#404040] tabular-nums">
                      {cat.sort_order}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-md",
                            "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                            "transition-colors duration-150",
                          )}
                          aria-label={`编辑 ${cat.name}`}
                        >
                          <Pencil size={14} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(cat)}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-md",
                            "text-[#A3A3A3] hover:text-[#B42318] hover:bg-[#FEF2F2]",
                            "transition-colors duration-150",
                          )}
                          aria-label={`删除 ${cat.name}`}
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ================================================== */}
      {/* 新增/编辑品种弹窗 */}
      {/* ================================================== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[440px] border border-[#E5E5E5] rounded-2xl bg-white p-0 gap-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A]">
              {editingId !== null ? "编辑品种" : "新增品种"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-5 space-y-4">
            {/* 品种名称 */}
            <div className="space-y-1.5">
              <label className="block text-[13px] leading-[1.5] text-[#404040] font-medium">
                品种名称
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="例如：螺纹钢"
                className={cn(
                  "h-10 rounded-[10px] border-[#E5E5E5]",
                  "text-[14px] text-[#404040] placeholder:text-[#A3A3A3]",
                  "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                )}
              />
            </div>

            {/* 类型选择 */}
            <div className="space-y-1.5">
              <label className="block text-[13px] leading-[1.5] text-[#404040] font-medium">
                类型
              </label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, type: v as "spot" | "futures", parent_id: null }))
                }
              >
                <SelectTrigger variant="filter" className="w-full">
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent variant="filter">
                  <SelectItem value="spot" className="text-[13px]">现货</SelectItem>
                  <SelectItem value="futures" className="text-[13px]">期货</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 父品类选择 */}
            <div className="space-y-1.5">
              <label className="block text-[13px] leading-[1.5] text-[#404040] font-medium">
                父品类
              </label>
              <Select
                value={formData.parent_id != null ? String(formData.parent_id) : "__none__"}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    parent_id: v === "__none__" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger variant="filter" className="w-full">
                  <SelectValue placeholder="无（顶级品类）" />
                </SelectTrigger>
                <SelectContent variant="filter">
                  <SelectItem value="__none__" className="text-[13px]">无（顶级品类）</SelectItem>
                  {categories
                    .filter(
                      (c) =>
                        c.parent_id == null &&
                        c.type === formData.type &&
                        c.id !== editingId,
                    )
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-[13px]">
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 排序号 */}
            <div className="space-y-1.5">
              <label className="block text-[13px] leading-[1.5] text-[#404040] font-medium">
                排序号
              </label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sort_order: Number(e.target.value),
                  }))
                }
                placeholder="数值越小越靠前"
                className={cn(
                  "h-10 rounded-[10px] border-[#E5E5E5]",
                  "text-[14px] text-[#404040] placeholder:text-[#A3A3A3]",
                  "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                )}
              />
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2 border-t border-[#E5E5E5]">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className={cn(
                "h-9 px-5 rounded-full",
                "border border-[#E5E5E5] text-[#0A0A0A]",
                "text-[13px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
              )}
            >
              取消
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formSaving || !formData.name.trim()}
              className={cn(
                "h-9 px-5 rounded-full",
                "bg-[#0A0A0A] text-white",
                "text-[13px] leading-[1.5]",
                "hover:bg-[#404040]",
                "transition-colors duration-150",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              {formSaving ? "保存中..." : editingId !== null ? "保存修改" : "创建品种"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================== */}
      {/* 删除确认弹窗 */}
      {/* ================================================== */}
      <AdminModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="确认删除"
        description={
          deletingHasChildren
            ? `「${deletingName}」下有子品种，请先删除子品种后再删除该品类`
            : `确认删除品种「${deletingName}」？删除后移动端将不再显示此品种，已关联的数据不受影响。`
        }
        confirmLabel={deleteLoading ? "删除中..." : "确认删除"}
        cancelLabel="取消"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
