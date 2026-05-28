import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Loader2,
  Shield, Key, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileRole } from "@/app/types/admin";
import {
  getMobileRoles, createMobileRole, updateMobileRole, deleteMobileRole,
  getRolePermissions, saveRolePermissions,
} from "@/app/api/admin";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminModal } from "./AdminModal";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================
// 常量
// ============================================================

const PERMISSION_ITEMS = [
  { key: "view_price", label: "查看价格" },
  { key: "price_trend", label: "价格走势" },
  { key: "calc_quotation", label: "计算报价" },
  { key: "query_tender", label: "查询招标" },
  { key: "search_knowledge", label: "知识搜索" },
  { key: "query_standard", label: "标准查询" },
  { key: "compare_grade", label: "牌号对比" },
  { key: "query_term", label: "术语查询" },
  { key: "calc_weight", label: "重量计算" },
  { key: "convert_unit", label: "单位换算" },
  { key: "set_alert", label: "设置预警" },
  { key: "ai_chat", label: "AI对话" },
  { key: "export_quotation", label: "导出报价单" },
  { key: "export_report", label: "导出报告" },
  { key: "dashboard", label: "数据看板" },
] as const;

type TabType = "roles" | "permissions";

// ============================================================
// 表单类型
// ============================================================

interface RoleFormData {
  role_type: 'admin' | 'mobile';
  name: string;
  description: string;
  status: boolean;
}

const EMPTY_FORM: RoleFormData = {
  role_type: 'mobile',
  name: "",
  description: "",
  status: true,
};

// ============================================================
// RolePermissionManagement 组件
// ============================================================

export function RolePermissionManagement() {
  // ---- Tab ----
  const [activeTab, setActiveTab] = useState<TabType>("roles");

  // ---- 角色列表 ----
  const [roles, setRoles] = useState<MobileRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);

  // ---- 添加/编辑弹窗 ----
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ---- 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState<MobileRole | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePreCheckLoading, setDeletePreCheckLoading] = useState(false);

  // ---- 权限配置 ----
  const [permissionRoles, setPermissionRoles] = useState<MobileRole[]>([]);
  // 权限矩阵: Record<roleId, Record<permKey, boolean>>
  const [permMatrix, setPermMatrix] = useState<Record<number, Record<string, boolean>>>({});
  // 原始矩阵（用于判断 dirty）
  const [originalMatrix, setOriginalMatrix] = useState<Record<number, Record<string, boolean>>>({});
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);

  // ---- 保存权限 ref（避免闭包过期） ----
  const permMatrixRef = useRef(permMatrix);
  permMatrixRef.current = permMatrix;

  // ============================================================
  // 角色列表加载
  // ============================================================

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const data = await getMobileRoles();
      setRoles(data);
    } catch (err) {
      setRolesError("加载角色列表失败，请重试");
      console.error("loadRoles error:", err);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // ============================================================
  // 权限配置加载
  // ============================================================

  const loadPermissions = useCallback(async () => {
    setPermsLoading(true);
    try {
      const data = await getRolePermissions();
      setPermissionRoles(data);

      const matrix: Record<number, Record<string, boolean>> = {};
      for (const role of data) {
        matrix[role.id] = { ...role.permissions };
      }
      setPermMatrix(matrix);
      setOriginalMatrix(JSON.parse(JSON.stringify(matrix)));
    } catch (err) {
      showErrorToast("加载权限配置失败");
      console.error("loadPermissions error:", err);
    } finally {
      setPermsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "permissions") {
      loadPermissions();
    }
  }, [activeTab, loadPermissions]);

  // ============================================================
  // Dirty 判断
  // ============================================================

  const isDirty = useMemo(() => {
    return JSON.stringify(permMatrix) !== JSON.stringify(originalMatrix);
  }, [permMatrix, originalMatrix]);

  // ============================================================
  // 表单校验
  // ============================================================

  const validateForm = useCallback((data: RoleFormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) {
      errors.name = "请输入角色名称";
    } else if (data.name.trim().length > 50) {
      errors.name = "角色名称最多50个字符";
    }
    if (data.description.length > 200) {
      errors.description = "角色描述最多200个字符";
    }
    return errors;
  }, []);

  // ============================================================
  // 角色 CRUD
  // ============================================================

  const openAddForm = useCallback(() => {
    setIsEditing(false);
    setEditingRoleId(null);
    setFormData({ ...EMPTY_FORM, role_type: 'mobile' });
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((role: MobileRole) => {
    setIsEditing(true);
    setEditingRoleId(role.id);
    setFormData({
      role_type: role.role_type || 'mobile',
      name: role.name,
      description: role.description || "",
      status: role.status === 1,
    });
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(async () => {
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFormSubmitting(true);
    try {
      if (isEditing && editingRoleId !== null) {
        await updateMobileRole(editingRoleId, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status ? 1 : 0,
          role_type: formData.role_type,
        });
        showSuccessToast("角色已更新");
      } else {
        await createMobileRole({
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status ? 1 : 0,
          role_type: formData.role_type,
        });
        showSuccessToast("角色已创建");
      }

      setFormOpen(false);
      await loadRoles();
      // 同时刷新权限 tab 数据
      if (activeTab === "permissions") {
        await loadPermissions();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : isEditing ? "更新角色失败" : "创建角色失败";
      showErrorToast(message);
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, isEditing, editingRoleId, validateForm, loadRoles, activeTab, loadPermissions]);

  const handleDeleteClick = useCallback(async (role: MobileRole) => {
    setDeletePreCheckLoading(true);
    try {
      await deleteMobileRole(role.id);
      // 删除成功（无关联用户），刷新列表
      await loadRoles();
      showSuccessToast(`角色"${role.name}"已删除`);
      if (activeTab === "permissions") {
        await loadPermissions();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      if (message.includes("有关联用户") || message.includes("关联用户")) {
        showErrorToast(message);
      } else {
        // 非关联用户错误，打开确认弹窗让用户重试
        setDeleteTarget(role);
      }
    } finally {
      setDeletePreCheckLoading(false);
    }
  }, [loadRoles, activeTab, loadPermissions]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteMobileRole(deleteTarget.id);
      showSuccessToast(`角色"${deleteTarget.name}"已删除`);
      setDeleteTarget(null);
      await loadRoles();
      if (activeTab === "permissions") {
        await loadPermissions();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除失败";
      showErrorToast(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, loadRoles, activeTab, loadPermissions]);

  // ============================================================
  // 权限切换
  // ============================================================

  const handlePermToggle = useCallback((roleId: number, permKey: string, checked: boolean) => {
    setPermMatrix((prev) => {
      const rolePerms = { ...(prev[roleId] ?? {}) };
      rolePerms[permKey] = checked;
      return { ...prev, [roleId]: rolePerms };
    });
  }, []);

  const handleSavePermissions = useCallback(async () => {
    setPermsSaving(true);
    try {
      const currentMatrix = permMatrixRef.current;
      for (const role of permissionRoles) {
        if (currentMatrix[role.id]) {
          await saveRolePermissions(role.id, currentMatrix[role.id]);
        }
      }
      showSuccessToast("权限配置已保存");
      setOriginalMatrix(JSON.parse(JSON.stringify(permMatrixRef.current)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存失败";
      showErrorToast(message);
    } finally {
      setPermsSaving(false);
    }
  }, [permissionRoles]);

  // ============================================================
  // 表格列定义 - 角色列表
  // ============================================================

  const roleColumns: TableColumn<MobileRole>[] = useMemo(
    () => [
      {
        key: "name",
        title: "角色名称",
        width: "140px",
        render: (_: unknown, row: MobileRole) => (
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full",
              "text-[11px] leading-[1.5] font-medium",
              row.role_type === 'admin'
                ? "bg-[#0A0A0A]/5 text-[#404040]"
                : "bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373]"
            )}>
              {row.role_type === 'admin' ? '管理员' : '移动端'}
            </span>
            <span className="text-[13px] text-[#0A0A0A] font-medium">
              {row.name}
            </span>
          </div>
        ),
      },
      {
        key: "description",
        title: "描述",
        width: "auto",
        render: (_: unknown, row: MobileRole) => (
          <span className="text-[13px] text-[#404040] truncate max-w-[280px] inline-block">
            {row.description || "—"}
          </span>
        ),
      },
      {
        key: "user_count",
        title: "用户数",
        width: "90px",
        render: (_: unknown, row: MobileRole) => (
          <span className="text-[13px] text-[#404040] tabular-nums">
            {row.user_count ?? 0}
          </span>
        ),
      },
      {
        key: "status",
        title: "状态",
        width: "80px",
        render: (_: unknown, row: MobileRole) => (
          <AdminStatusBadge
            status={row.status === 1 ? "active" : "disabled"}
            label={row.status === 1 ? "启用" : "禁用"}
          />
        ),
      },
      {
        key: "created_at",
        title: "创建时间",
        width: "150px",
        render: (_: unknown, row: MobileRole) => (
          <span className="text-[12px] text-[#737373] tabular-nums">
            {row.created_at || "—"}
          </span>
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: "100px",
        render: (_: unknown, row: MobileRole) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditForm(row);
              }}
              className={cn(
                "text-[13px] leading-[1.5] text-[#0A0A0A]",
                "hover:text-[#404040]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 rounded-sm",
              )}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(row);
              }}
              disabled={deletePreCheckLoading}
              className={cn(
                "text-[13px] leading-[1.5] text-[#0A0A0A]",
                "hover:text-[#B42318]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#B42318]/10 rounded-sm",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              删除
            </button>
          </div>
        ),
      },
    ],
    [openEditForm, handleDeleteClick, deletePreCheckLoading],
  );

  // ============================================================
  // 渲染辅助
  // ============================================================

  const primaryBtnClass = cn(
    "inline-flex items-center gap-1.5",
    "h-9 px-4 rounded-full",
    "bg-[#0A0A0A] text-white",
    "text-[13px] leading-[1.5] font-medium",
    "hover:bg-[#404040]",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:ring-offset-1",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  );

  // ============================================================
  // 渲染：角色列表 Tab
  // ============================================================

  const renderRolesTab = () => {
    if (rolesError && !rolesLoading) {
      return (
        <AdminEmpty
          title="加载失败"
          description={rolesError}
          action={{ label: "重新加载", onClick: loadRoles }}
        />
      );
    }

    return (
      <AdminTable<MobileRole>
        columns={roleColumns}
        data={roles}
        loading={rolesLoading}
        empty={
          <AdminEmpty
            title="暂无角色"
            description="请点击「添加角色」创建"
            action={{ label: "添加角色", onClick: openAddForm }}
          />
        }
        rowKey={(row) => String(row.id)}
      />
    );
  };

  // ============================================================
  // 渲染：权限配置 Tab
  // ============================================================

  const renderPermissionsTab = () => {
    if (permsLoading) {
      return (
        <div className="bg-white border border-[#E5E5E5] rounded-lg">
          <AdminLoading type="table" rows={Math.min(permissionRoles.length || 5, 5)} />
        </div>
      );
    }

    if (permissionRoles.length === 0) {
      return (
        <AdminEmpty
          title="暂无角色"
          description="请先在「角色列表」中创建角色"
        />
      );
    }

    return (
      <div>
        {/* 权限矩阵表格 */}
        <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* 表头 */}
              <thead>
                <tr className="border-b border-[#E5E5E5]">
                  <th
                    className={cn(
                      "sticky left-0 z-10 bg-white",
                      "px-4 py-3 text-left",
                      "text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373]",
                      "font-medium whitespace-nowrap",
                    )}
                  >
                    功能模块
                  </th>
                  {permissionRoles.map((role) => (
                    <th
                      key={role.id}
                      className={cn(
                        "px-4 py-3 text-center",
                        "text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373]",
                        "font-medium whitespace-nowrap",
                      )}
                    >
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* 表体 */}
              <tbody>
                {PERMISSION_ITEMS.map((item, rowIdx) => (
                  <tr
                    key={item.key}
                    className={cn(
                      "border-b border-[#E5E5E5] last:border-b-0",
                      "transition-colors duration-150",
                      rowIdx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                    )}
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-10",
                        rowIdx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                        "px-4 py-3",
                        "text-[13px] leading-[1.5] text-[#404040]",
                        "whitespace-nowrap",
                      )}
                    >
                      {item.label}
                    </td>
                    {permissionRoles.map((role) => {
                      const checked = permMatrix[role.id]?.[item.key] ?? false;
                      return (
                        <td
                          key={`${role.id}-${item.key}`}
                          className="px-4 py-3 text-center"
                        >
                          <Switch
                            checked={checked}
                            onCheckedChange={(v) =>
                              handlePermToggle(role.id, item.key, v)
                            }
                            className={cn(
                              "data-[state=checked]:bg-[#0A0A0A]",
                              "data-[state=unchecked]:bg-[#CBCED4]",
                            )}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!isDirty || permsSaving}
            onClick={handleSavePermissions}
            className={cn(
              "inline-flex items-center gap-2",
              "h-9 px-5 rounded-full",
              "text-[13px] leading-[1.5] font-medium",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:ring-offset-1",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isDirty
                ? "bg-[#0A0A0A] text-white hover:bg-[#404040]"
                : "bg-white border border-[#E5E5E5] text-[#0A0A0A]",
            )}
          >
            {permsSaving ? (
              <>
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save size={14} strokeWidth={1.75} />
                保存权限
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <>
      <AdminPageShell
        title="角色与权限管理"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "用户管理" },
          { label: "角色与权限" },
        ]}
        actions={
          activeTab === "roles" ? (
            <button type="button" onClick={openAddForm} className={primaryBtnClass}>
              <Plus size={14} strokeWidth={1.75} />
              添加角色
            </button>
          ) : null
        }
      >
        {/* 分段控制器 */}
        <div className="mb-6">
          <div
            className={cn(
              "inline-flex rounded-full p-0.5",
              "bg-[#FAFAFA] border border-[#E5E5E5]",
            )}
            role="tablist"
            aria-label="视图切换"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "roles"}
              onClick={() => setActiveTab("roles")}
              className={cn(
                "px-5 py-1.5 rounded-full",
                "text-[13px] leading-[1.5] font-medium",
                "transition-all duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                activeTab === "roles"
                  ? "bg-[#0A0A0A] text-white"
                  : "text-[#737373] hover:text-[#0A0A0A]",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Shield size={14} strokeWidth={1.75} />
                角色列表
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "permissions"}
              onClick={() => setActiveTab("permissions")}
              className={cn(
                "px-5 py-1.5 rounded-full",
                "text-[13px] leading-[1.5] font-medium",
                "transition-all duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                activeTab === "permissions"
                  ? "bg-[#0A0A0A] text-white"
                  : "text-[#737373] hover:text-[#0A0A0A]",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Key size={14} strokeWidth={1.75} />
                权限配置
              </span>
            </button>
          </div>
        </div>

        {/* Tab 内容 */}
        {activeTab === "roles" ? renderRolesTab() : renderPermissionsTab()}
      </AdminPageShell>

      {/* ========================================================== */}
      {/* 添加/编辑角色弹窗 */}
      {/* ========================================================== */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && formSubmitting) return;
          setFormOpen(open);
        }}
      >
        <DialogContent
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            "p-6 max-w-[440px]",
            "gap-0",
          )}
        >
          <DialogHeader className="mb-5 p-0">
            <DialogTitle
              className={cn(
                "text-[16px] leading-[1.4] font-medium text-[#0A0A0A]",
              )}
            >
              {isEditing ? "编辑角色" : "添加角色"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* 角色类型 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className={cn(
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "after:content-['_*'] after:text-[#B42318]",
                )}
                htmlFor="field-role-type"
              >
                角色类型
              </Label>
              <Select
                value={formData.role_type}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, role_type: v as 'admin' | 'mobile' }))
                }
              >
                <SelectTrigger
                  id="field-role-type"
                  className={cn(
                    "h-10 px-3 rounded-[10px]",
                    "border border-[#E5E5E5] text-[14px] leading-[1.5]",
                    "focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A]",
                    "transition-colors duration-200",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile" className="text-[13px]">
                    移动端角色
                  </SelectItem>
                  <SelectItem value="admin" className="text-[13px]">
                    管理员角色
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 角色名称 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className={cn(
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "after:content-['_*'] after:text-[#B42318]",
                )}
                htmlFor="field-role-name"
              >
                角色名称
              </Label>
              <Input
                id="field-role-name"
                placeholder="请输入角色名称"
                maxLength={50}
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={cn(
                  "h-10 px-3 rounded-[10px]",
                  "border text-[14px] leading-[1.5]",
                  formErrors.name
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10"
                    : "border-[#E5E5E5] focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  "placeholder:text-[#A3A3A3]",
                  "transition-colors duration-200",
                )}
                aria-invalid={!!formErrors.name}
                aria-describedby={formErrors.name ? "err-role-name" : undefined}
              />
              {formErrors.name && (
                <p id="err-role-name" className="text-[12px] leading-[1.5] text-[#B42318]">
                  {formErrors.name}
                </p>
              )}
            </div>

            {/* 角色描述 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className="text-[13px] leading-[1.5] text-[#404040]"
                htmlFor="field-role-desc"
              >
                角色描述
              </Label>
              <Input
                id="field-role-desc"
                placeholder="请输入角色描述"
                maxLength={200}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                  if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: "" }));
                }}
                className={cn(
                  "h-10 px-3 rounded-[10px]",
                  "border text-[14px] leading-[1.5]",
                  formErrors.description
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10"
                    : "border-[#E5E5E5] focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  "placeholder:text-[#A3A3A3]",
                  "transition-colors duration-200",
                )}
                aria-invalid={!!formErrors.description}
                aria-describedby={formErrors.description ? "err-role-desc" : undefined}
              />
              {formErrors.description && (
                <p id="err-role-desc" className="text-[12px] leading-[1.5] text-[#B42318]">
                  {formErrors.description}
                </p>
              )}
            </div>

            {/* 状态 */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label
                  className="text-[13px] leading-[1.5] text-[#404040]"
                  htmlFor="field-role-status"
                >
                  状态
                </Label>
                <span className="text-[12px] leading-[1.5] text-[#737373]">
                  {formData.status ? "启用" : "禁用"}
                </span>
              </div>
              <Switch
                id="field-role-status"
                checked={formData.status}
                onCheckedChange={(v) =>
                  setFormData((prev) => ({ ...prev, status: v }))
                }
                className={cn(
                  "data-[state=checked]:bg-[#0A0A0A]",
                  "data-[state=unchecked]:bg-[#CBCED4]",
                )}
              />
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setFormOpen(false)}
              className={cn(
                "h-9 px-4 rounded-full",
                "border border-[#E5E5E5] bg-white",
                "text-[#0A0A0A] text-[13px] leading-[1.5] font-medium",
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
              disabled={formSubmitting}
              onClick={handleFormSubmit}
              className={cn(
                "inline-flex items-center gap-1.5",
                "h-9 px-4 rounded-full",
                "bg-[#0A0A0A] text-white",
                "text-[13px] leading-[1.5] font-medium",
                "hover:bg-[#404040]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:ring-offset-1",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {formSubmitting && (
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              )}
              确定
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* 删除确认弹窗 */}
      {/* ========================================================== */}
      <AdminModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteTarget(null);
        }}
        title="确定删除该角色？"
        description={`删除角色"${deleteTarget?.name ?? ""}"后，该角色的权限配置将被清除`}
        confirmLabel="删除"
        cancelLabel="取消"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

export default RolePermissionManagement;
