// ============================================================
// AdminUserManagement -- 后台用户管理页面
//
// 包含功能：
//   1. 管理员列表表格
//   2. 角色说明表格
//   3. 添加/编辑管理员弹窗（表单 Dialog）
//   4. 删除确认弹窗（AdminModal destructive）
//   5. 密码自动生成 + 复制
//   6. 超级管理员保护（不可删除、角色不可修改）
//
// Design tokens: 使用项目色板/字阶/圆角规范
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Copy,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminModal } from "./AdminModal";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from "@/app/api/admin";
import type { AdminUser, AdminRole, AdminUserStatus } from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

/** 角色中文显示映射 */
const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "超级管理员",
  operator: "运营管理员",
  data_admin: "数据管理员",
  viewer: "只读观察员",
};

/** 角色图标映射 */
const ROLE_ICONS: Record<AdminRole, React.ReactNode> = {
  super_admin: <Shield size={14} strokeWidth={1.75} className="text-[#0A0A0A] shrink-0" />,
  operator: <ShieldCheck size={14} strokeWidth={1.75} className="text-[#737373] shrink-0" />,
  data_admin: <ShieldAlert size={14} strokeWidth={1.75} className="text-[#737373] shrink-0" />,
  viewer: <ShieldQuestion size={14} strokeWidth={1.75} className="text-[#A3A3A3] shrink-0" />,
};

/** 添加/编辑时可选的角�（不包含 super_admin，仅现有 super_admin 编辑时显示） */
const ALLOWED_ROLES: { value: AdminRole | ""; label: string }[] = [
  { value: "operator", label: "运营管理员" },
  { value: "data_admin", label: "数据管理员" },
  { value: "viewer", label: "只读观察员" },
];

/** 角色说明数据 */
const ROLE_DESCRIPTIONS = [
  { role: "super_admin", name: "超级管理员", scope: "全部功能（唯一账号，不可删除）" },
  { role: "operator", name: "运营管理员", scope: "Agent配置、数据管理、用户管理、质量管理" },
  { role: "data_admin", name: "数据管理员", scope: "数据爬虫、采集任务、数据源管理" },
  { role: "viewer", name: "只读观察员", scope: "仅查看数据，不可修改" },
];

/** 角色说明表格列 */
const ROLE_COLUMNS: TableColumn<typeof ROLE_DESCRIPTIONS[number]>[] = [
  {
    key: "name",
    title: "角色",
    render: (_, row) => {
      const roleKey = row.role as AdminRole;
      return (
        <span className="inline-flex items-center gap-2 text-[13px] leading-[1.5] text-[#0A0A0A]">
          {ROLE_ICONS[roleKey]}
          {row.name}
        </span>
      );
    },
  },
  {
    key: "scope",
    title: "权限范围",
    render: (_, row) => (
      <span className="text-[13px] leading-[1.5] text-[#404040]">{row.scope}</span>
    ),
  },
];

// ============================================================
// 类型
// ============================================================

interface AdminUserFormData {
  username: string;
  nickname: string;
  password: string;
  role: AdminRole | "";
}

const EMPTY_FORM: AdminUserFormData = {
  username: "",
  nickname: "",
  password: "",
  role: "operator",
};

// ============================================================
// 工具函数
// ============================================================

/** 生成 12 位随机密码（包含大小写字母、数字） */
function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** 复制文本到剪贴板 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 降级方案
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

// ============================================================
// AdminUserManagement 组件
// ============================================================

export function AdminUserManagement() {
  // ---- 列表状态 ----
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ---- 添加/编辑弹窗 ----
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AdminUserFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ---- 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============================================================
  // 数据加载
  // ============================================================

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setListError("加载管理员列表失败，请检查网络后重试");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ============================================================
  // 表单校验
  // ============================================================

  const validateForm = useCallback(
    (data: AdminUserFormData): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!data.username.trim()) {
        errors.username = "请输入用户名";
      } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(data.username.trim())) {
        errors.username = "用户名为3-20位字母、数字或下划线";
      }
      if (!isEditing && !data.password) {
        errors.password = "请输入初始密码";
      }
      if (!data.role) {
        errors.role = "请选择角色";
      }
      return errors;
    },
    [isEditing],
  );

  // ============================================================
  // CRUD 操作
  // ============================================================

  const openAddForm = useCallback(() => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({ ...EMPTY_FORM, password: generatePassword() });
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((user: AdminUser) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      nickname: user.nickname,
      password: "",
      role: user.role,
    });
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(async () => {
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      // 聚焦第一个错误字段
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.querySelector<HTMLInputElement>(
        `[data-field-id="${firstErrorKey}"]`,
      );
      el?.focus();
      return;
    }

    setFormSubmitting(true);
    try {
      if (isEditing && editingUserId !== null) {
        await updateAdminUser(editingUserId, {
          nickname: formData.nickname.trim(),
          role: formData.role as AdminRole,
        });
        showSuccessToast(`管理员"${formData.username}"已更新`);
      } else {
        await createAdminUser({
          username: formData.username.trim(),
          nickname: formData.nickname.trim() || formData.username.trim(),
          password: formData.password,
          role: formData.role as AdminRole,
        });
        showSuccessToast(`管理员"${formData.username}"已创建`);
      }

      setFormOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : isEditing ? "更新管理员失败，请重试" : "创建管理员失败，请重试";
      showErrorToast(message);
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, isEditing, editingUserId, validateForm, loadUsers]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteAdminUser(deleteTarget.id);
      showSuccessToast(`管理员"${deleteTarget.username}"已删除`);
      setDeleteTarget(null);
      await loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除管理员失败，请重试";
      showErrorToast(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, loadUsers]);

  // ============================================================
  // 密码操作
  // ============================================================

  const handleGeneratePassword = useCallback(() => {
    setFormData((prev) => ({ ...prev, password: generatePassword() }));
  }, []);

  const handleCopyPassword = useCallback(async () => {
    if (!formData.password) return;
    await copyToClipboard(formData.password);
    showSuccessToast("密码已复制到剪贴板");
  }, [formData.password]);

  // ============================================================
  // 样式
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

  const ghostIconBtnClass = cn(
    "flex items-center justify-center",
    "w-7 h-7 rounded-md",
    "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
  );

  const dangerIconBtnClass = cn(
    "flex items-center justify-center",
    "w-7 h-7 rounded-md",
    "text-[#737373] hover:text-[#B42318] hover:bg-[#FEF2F2]",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-[#B42318]/10",
  );

  // ============================================================
  // 表格列定义
  // ============================================================

  const userColumns: TableColumn<AdminUser>[] = useMemo(
    () => [
      {
        key: "username",
        title: "用户名",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#0A0A0A] font-medium tabular-nums">
            {row.username}
          </span>
        ),
      },
      {
        key: "nickname",
        title: "昵称",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#404040]">
            {row.nickname || "—"}
          </span>
        ),
      },
      {
        key: "role",
        title: "角色",
        render: (_, row) => (
          <span className="inline-flex items-center gap-1.5 text-[13px] leading-[1.5] text-[#404040]">
            {ROLE_ICONS[row.role]}
            {ROLE_LABELS[row.role]}
          </span>
        ),
      },
      {
        key: "status",
        title: "状态",
        render: (_, row) => (
          <AdminStatusBadge
            status={row.status === "active" ? "active" : "disabled"}
            label={row.status === "active" ? "正常" : "已停用"}
          />
        ),
      },
      {
        key: "lastLoginAt",
        title: "最后登录",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#737373] tabular-nums">
            {row.lastLoginAt || "—"}
          </span>
        ),
      },
      {
        key: "actions",
        title: "操作",
        width: "100px",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditForm(row);
              }}
              className={ghostIconBtnClass}
              aria-label={`编辑管理员 ${row.username}`}
              title="编辑"
            >
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            {row.role !== "super_admin" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(row);
                }}
                className={dangerIconBtnClass}
                aria-label={`删除管理员 ${row.username}`}
                title="删除"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [openEditForm],
  );

  // ============================================================
  // 渲染
  // ============================================================

  // ---- 错误状态 ----
  if (listError && !listLoading) {
    return (
      <AdminPageShell
        title="后台用户管理"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "用户管理" },
          { label: "后台用户" },
        ]}
        actions={
          <button
            type="button"
            onClick={loadUsers}
            className={cn(primaryBtnClass, "bg-white border border-[#E5E5E5] text-[#0A0A0A] hover:bg-[#FAFAFA]")}
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            重试
          </button>
        }
      >
        <div
          className={cn(
            "bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-6",
            "flex flex-col items-center gap-3",
          )}
        >
          <X size={24} strokeWidth={1.75} className="text-[#B42318]" />
          <p className="text-[14px] leading-[1.6] text-[#B42318]">{listError}</p>
        </div>
      </AdminPageShell>
    );
  }

  // ---- 加载状态 ----
  if (listLoading && users.length === 0) {
    return (
      <AdminPageShell
        title="后台用户管理"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "用户管理" },
          { label: "后台用户" },
        ]}
      >
        <AdminLoading type="table" rows={5} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="后台用户管理"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "用户管理" },
        { label: "后台用户" },
      ]}
      actions={
        <button type="button" onClick={openAddForm} className={primaryBtnClass}>
          <Plus size={14} strokeWidth={1.75} />
          添加管理员
        </button>
      }
    >
      {/* ========================================================== */}
      {/* 1. 管理员列表 */}
      {/* ========================================================== */}
      <div className="mb-6">
        <AdminTable<AdminUser>
          columns={userColumns}
          data={users}
          loading={listLoading}
          empty={<AdminEmpty description="暂无管理员数据" />}
        />
      </div>

      {/* ========================================================== */}
      {/* 2. 角色说明表格 */}
      {/* ========================================================== */}
      <div className="mb-4">
        <h2
          className={cn(
            "text-[18px] leading-[1.4] font-medium text-[#0A0A0A]",
            "mb-3",
          )}
        >
          角色说明
        </h2>
        <AdminTable<typeof ROLE_DESCRIPTIONS[number]>
          columns={ROLE_COLUMNS}
          data={ROLE_DESCRIPTIONS}
          rowKey={(row) => row.role}
        />
      </div>

      {/* ========================================================== */}
      {/* 3. 添加/编辑管理员弹窗 */}
      {/* ========================================================== */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && formSubmitting) return; // 提交中不允许关闭
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
          {/* 标题栏 */}
          <DialogHeader className="mb-5 p-0">
            <DialogTitle
              className={cn(
                "text-[16px] leading-[1.4] font-medium text-[#0A0A0A]",
              )}
            >
              {isEditing ? "编辑管理员" : "添加管理员"}
            </DialogTitle>
          </DialogHeader>

          {/* 表单 */}
          <div className="flex flex-col gap-4">
            {/* 用户名 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className={cn(
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "after:content-['_*'] after:text-[#B42318]",
                )}
                htmlFor="field-username"
              >
                用户名
              </Label>
              <Input
                id="field-username"
                data-field-id="username"
                placeholder="请输入用户名（3-20位字母、数字或下划线）"
                value={formData.username}
                readOnly={isEditing}
                disabled={isEditing}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, username: e.target.value }));
                  if (formErrors.username) setFormErrors((prev) => ({ ...prev, username: "" }));
                }}
                className={cn(
                  "h-10 px-3 rounded-[10px]",
                  "border text-[14px] leading-[1.5]",
                  formErrors.username
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10"
                    : "border-[#E5E5E5] focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  isEditing && "bg-[#FAFAFA] text-[#A3A3A3] cursor-not-allowed",
                  "placeholder:text-[#A3A3A3]",
                  "transition-colors duration-200",
                )}
                aria-invalid={!!formErrors.username}
                aria-describedby={formErrors.username ? "err-username" : undefined}
              />
              {formErrors.username && (
                <p id="err-username" className="text-[12px] leading-[1.5] text-[#B42318]">
                  {formErrors.username}
                </p>
              )}
            </div>

            {/* 昵称 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className="text-[13px] leading-[1.5] text-[#404040]"
                htmlFor="field-nickname"
              >
                昵称
              </Label>
              <Input
                id="field-nickname"
                data-field-id="nickname"
                placeholder="请输入昵称"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                }
                className={cn(
                  "h-10 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "text-[14px] leading-[1.5] text-[#0A0A0A]",
                  "placeholder:text-[#A3A3A3]",
                  "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  "transition-colors duration-200",
                )}
              />
            </div>

            {/* 初始密码（仅添加时显示） */}
            {!isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label
                  className={cn(
                    "text-[13px] leading-[1.5] text-[#404040]",
                    "after:content-['_*'] after:text-[#B42318]",
                  )}
                  htmlFor="field-password"
                >
                  初始密码
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="field-password"
                      data-field-id="password"
                      type="password"
                      placeholder="自动生成或手动输入"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, password: e.target.value }));
                        if (formErrors.password)
                          setFormErrors((prev) => ({ ...prev, password: "" }));
                      }}
                      className={cn(
                        "h-10 px-3 pr-10 rounded-[10px]",
                        "border text-[14px] leading-[1.5]",
                        formErrors.password
                          ? "border-[#B42318] focus-visible:ring-[#B42318]/10"
                          : "border-[#E5E5E5] focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                        "placeholder:text-[#A3A3A3]",
                        "transition-colors duration-200",
                      )}
                      aria-invalid={!!formErrors.password}
                      aria-describedby={formErrors.password ? "err-password" : undefined}
                    />
                    {/* 复制按钮 */}
                    {formData.password && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2",
                          "flex items-center justify-center",
                          "w-7 h-7 rounded-md",
                          "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                          "transition-colors duration-150",
                          "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                        )}
                        aria-label="复制密码"
                      >
                        <Copy size={14} strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className={cn(
                      "inline-flex items-center gap-1",
                      "h-10 px-3 rounded-full shrink-0",
                      "border border-[#E5E5E5] bg-white",
                      "text-[13px] leading-[1.5] text-[#0A0A0A]",
                      "hover:bg-[#FAFAFA]",
                      "transition-colors duration-150",
                      "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    )}
                  >
                    <RefreshCw size={14} strokeWidth={1.75} />
                    生成
                  </button>
                </div>
                {formErrors.password && (
                  <p id="err-password" className="text-[12px] leading-[1.5] text-[#B42318]">
                    {formErrors.password}
                  </p>
                )}
              </div>
            )}

            {/* 角色 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className={cn(
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "after:content-['_*'] after:text-[#B42318]",
                )}
                htmlFor="field-role"
              >
                角色
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, role: value as AdminRole }));
                  if (formErrors.role) setFormErrors((prev) => ({ ...prev, role: "" }));
                }}
                disabled={isEditing && formData.role === "super_admin"}
              >
                <SelectTrigger
                  id="field-role"
                  data-field-id="role"
                  className={cn(
                    "h-10 px-3 rounded-[10px]",
                    "border text-[14px] leading-[1.5]",
                    formErrors.role
                      ? "border-[#B42318] focus:ring-[#B42318]/10"
                      : "border-[#E5E5E5] focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A]",
                    "transition-colors duration-200",
                  )}
                  aria-invalid={!!formErrors.role}
                  aria-describedby={formErrors.role ? "err-role" : undefined}
                >
                  <SelectValue placeholder="请选择角色" />
                </SelectTrigger>
                <SelectContent className="border border-[#E5E5E5] rounded-md">
                  {/* 超级管理员仅编辑时显示 */}
                  {isEditing && formData.role === "super_admin" ? (
                    <SelectItem value="super_admin">
                      <span className="inline-flex items-center gap-2">
                        {ROLE_ICONS["super_admin"]}
                        超级管理员
                      </span>
                    </SelectItem>
                  ) : (
                    ALLOWED_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="inline-flex items-center gap-2">
                          {ROLE_ICONS[r.value as AdminRole]}
                          {r.label}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p id="err-role" className="text-[12px] leading-[1.5] text-[#B42318]">
                  {formErrors.role}
                </p>
              )}
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
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {formSubmitting && <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />}
              确定
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* 4. 删除确认弹窗 */}
      {/* ========================================================== */}
      <AdminModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteTarget(null);
        }}
        title="确定删除该管理员？"
        description="删除后该管理员将无法登录后台系统"
        confirmLabel="删除"
        cancelLabel="取消"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </AdminPageShell>
  );
}

export default AdminUserManagement;
