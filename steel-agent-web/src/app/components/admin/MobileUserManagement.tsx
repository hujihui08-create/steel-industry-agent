import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Users,
  UserPlus,
  Activity,
  TrendingUp,
  Search,
  RotateCcw,
  Download,
  Phone,
  Building2,
  Calendar,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Eye,
  UserX,
  UserCheck,
  Smartphone,
  MapPin,
  Clock,
  Monitor,
  MessageSquare,
  FileText,
  Star,
  Bell,
  Zap,
  Plus,
  Pencil,
  Trash2,
  Copy,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileUser, MobileRole, PaginatedResponse, RetentionStats } from "@/app/types/admin";
import {
  getMobileUsers,
  getMobileUserDetail,
  disableMobileUser,
  enableMobileUser,
  exportMobileUsers,
  getRetentionStats,
  createMobileUser,
  updateMobileUser,
  deleteMobileUser,
  getMobileRoles,
} from "@/app/api/admin";
import { AdminPageShell } from "./AdminPageShell";
import { AdminStatCard } from "./AdminStatCard";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminStatusBadge, type AdminStatusBadgeStatus } from "./AdminStatusBadge";
import { AdminDrawer } from "./AdminDrawer";
import { AdminModal } from "./AdminModal";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
} from "./AdminToast";
import { maskPhone } from "@/app/utils/mask";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// ============================================================
// 常量
// ============================================================

const PAGE_SIZE = 10;

/** 角色中文映射 */
const ROLE_LABEL_MAP: Record<string, string> = {
  buyer: "采购员",
  seller: "销售经理",
  analyst: "分析师",
};

/** 角色筛选选项（值 → API role 值映射） */
const ROLE_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "全部", value: "" },
  { label: "贸易商", value: "buyer" },
  { label: "采购员", value: "buyer" },
  { label: "销售经理", value: "seller" },
  { label: "分析师", value: "analyst" },
];

/** 状态筛选选项 */
const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "全部", value: "" },
  { label: "正常", value: "active" },
  { label: "禁用", value: "disabled" },
];

/** 将 API 状态映射为 AdminStatusBadge status */
function mapStatus(status: number | string): AdminStatusBadgeStatus {
  const s = typeof status === 'string' ? parseInt(status) : status;
  return s === 1 ? "active" : "disabled";
}

const normalizeStatus = (s: unknown): 'active' | 'disabled' =>
  typeof s === 'number' ? (s === 1 ? 'active' : 'disabled') : (s === 'active' || s === 'disabled' ? s : 'active');

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
// 表单类型
// ============================================================

interface MobileUserFormData {
  phone: string;
  nickname: string;
  company: string;
  roleId: number | null;
  region: string;
  password: string;
  status: number;
}

const EMPTY_FORM: MobileUserFormData = {
  phone: "",
  nickname: "",
  company: "",
  roleId: null,
  region: "",
  password: "",
  status: 1,
};

// ============================================================
// 筛选栏本地状态类型
// ============================================================

interface FilterState {
  phone: string;
  company: string;
  dateStart: string;
  dateEnd: string;
  status: string;
  role: string;
}

const DEFAULT_FILTERS: FilterState = {
  phone: "",
  company: "",
  dateStart: "",
  dateEnd: "",
  status: "",
  role: "",
};

// ============================================================
// 详情面板 Mock 数据
// ============================================================

interface ConversationRecord {
  id: string;
  date: string;
  question: string;
  intent: string;
  feedback: "up" | "down";
}

interface QuotationRecord {
  id: string;
  date: string;
  spec: string;
  totalPrice: string;
  status: string;
}

function generateMockConversations(): ConversationRecord[] {
  return [];
}

function generateMockQuotations(): QuotationRecord[] {
  return [];
}

// ============================================================
// MobileUserManagement 组件
// ============================================================

export function MobileUserManagement() {
  // ---- 数据状态 ----
  const [users, setUsers] = useState<MobileUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- 分页 & 排序 ----
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ---- 筛选 ----
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // 暂存筛选值（用于在点"搜索"前独立编辑）
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // ---- 统计卡片 ----
  const [stats, setStats] = useState({
    totalRegistered: 0,
    todayNew: 0,
    dailyActive: 0,
    monthlyActive: 0,
  });

  const [retention, setRetention] = useState<RetentionStats | null>(null);

  // ---- 详情抽屉 ----
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MobileUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ---- 确认弹窗 ----
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"disable" | "enable">("disable");
  const [modalLoading, setModalLoading] = useState(false);

  // ---- 导出 ----
  const [exporting, setExporting] = useState(false);

  // ---- 添加/编辑表单 ----
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<MobileUserFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const formFieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>>({});
  const editUserRoleRef = useRef<string | null>(null);

  // ---- 角色列表 ----
  const [roles, setRoles] = useState<MobileRole[]>([]);

  // ---- 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState<MobileUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============================================================
  // 数据获取
  // ============================================================

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: PaginatedResponse<MobileUser> = await getMobileUsers({
        page,
        pageSize: PAGE_SIZE,
        keyword: filters.phone || filters.company || undefined,
        status: filters.status || undefined,
        role: filters.role || undefined,
        dateStart: filters.dateStart || undefined,
        dateEnd: filters.dateEnd || undefined,
      });

      setUsers(result.items);
      setTotal(result.total);

      setStats({
        totalRegistered: result.total,
        todayNew: 0,
        dailyActive: 0,
        monthlyActive: 0,
      });
    } catch (err) {
      setError("加载用户数据失败，请重试");
      console.error("fetchUsers error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchRetention = useCallback(async () => {
    try {
      const data = await getRetentionStats();
      setRetention(data);
    } catch {
      // Silent fail - retention is P1, not critical
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRetention();
  }, [fetchUsers, fetchRetention]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setFilters({ ...draftFilters });
    setPage(1);
  }, [draftFilters]);

  /** 重置 */
  const handleReset = useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  /** 排序 */
  const handleSort = useCallback(
    (key: string, order: "asc" | "desc") => {
      setSortBy(key);
      setSortOrder(order);
    },
    [],
  );

  /** 打开用户详情 */
  const handleViewDetail = useCallback(async (user: MobileUser) => {
    setDetailLoading(true);
    setDrawerOpen(true);
    try {
      const detail = await getMobileUserDetail(user.id);
      setSelectedUser(detail);
    } catch (err) {
      // 降级：直接用列表中的用户数据显示
      setSelectedUser(user);
      showWarningToast("部分统计数据加载失败，基本信息可用");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /** 禁用/启用确认 */
  const handleToggleStatus = useCallback(
    (action: "disable" | "enable") => {
      setModalAction(action);
      setModalOpen(true);
    },
    [],
  );

  /** 执行禁用/启用 */
  const handleConfirmToggle = useCallback(async () => {
    if (!selectedUser) return;
    setModalLoading(true);
    try {
      if (modalAction === "disable") {
        await disableMobileUser(selectedUser.id);
        showSuccessToast("账号已禁用");
      } else {
        await enableMobileUser(selectedUser.id);
        showSuccessToast("账号已启用");
      }
      setModalOpen(false);
      // 刷新列表
      await fetchUsers();
      // 更新抽屉中的用户状态
      setSelectedUser((prev) =>
        prev
          ? {
              ...prev,
              status: modalAction === "disable" ? "disabled" : "active",
            }
          : null,
      );
    } catch (err) {
      showErrorToast(
        modalAction === "disable" ? "禁用失败，请重试" : "启用失败，请重试",
      );
    } finally {
      setModalLoading(false);
    }
  }, [selectedUser, modalAction, fetchUsers]);

  /** 导出 */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportMobileUsers(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `移动端用户数据_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccessToast("导出成功");
    } catch (err) {
      showErrorToast("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }, [filters]);

  // ============================================================
  // 角色获取 & CRUD 操作
  // ============================================================

  /** 获取移动端角色列表 */
  const fetchRoles = useCallback(async () => {
    try {
      const data = await getMobileRoles({ roleType: "mobile" });
      setRoles(data);
    } catch {
      // 角色获取失败不影响主要流程
    }
  }, []);

  /** 打开添加表单 -- 同时预生成密码并获取角色列表 */
  const openAddForm = useCallback(() => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({ ...EMPTY_FORM, password: generatePassword() });
    setFormErrors({});
    fetchRoles();
    setFormOpen(true);
  }, [fetchRoles]);

  /** 打开编辑表单 -- 预填用户数据并获取角色列表 */
  const openEditForm = useCallback(
    (user: MobileUser) => {
      setIsEditing(true);
      setEditingUserId(user.id);
      // 从角色列表中匹配 roleId（通过 role 字符串匹配）
      // 角色列表会在 fetchRoles 完成后更新
      setFormData({
        phone: user.phone,
        nickname: user.nickname,
        company: user.company,
        roleId: null, // 由 fetchRoles 完成后在 useEffect 中设置
        region: user.region,
        password: "",
        status: normalizeStatus(user.status) === 'active' ? 1 : 0,
      });
      setFormErrors({});
      fetchRoles();
      setFormOpen(true);
      editUserRoleRef.current = user.role;
    },
    [fetchRoles],
  );

  /** 当 roles 加载完成后，自动匹配编辑时的 roleId */
  useEffect(() => {
    if (isEditing && roles.length > 0) {
      const roleStr = editUserRoleRef.current;
      if (roleStr) {
        const matched = roles.find((r) => r.name === roleStr);
        if (matched) {
          setFormData((prev) => ({ ...prev, roleId: matched.id }));
        }
        editUserRoleRef.current = null;
      }
    }
  }, [roles, isEditing]);

  /** 表单校验 */
  const validateForm = useCallback(
    (data: MobileUserFormData): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!isEditing) {
        if (!data.phone.trim()) {
          errors.phone = "请输入手机号";
        } else if (!/^1[3-9]\d{9}$/.test(data.phone.trim())) {
          errors.phone = "请输入正确的11位手机号";
        }
      }
      if (!data.roleId) {
        errors.role = "请选择角色";
      }
      if (!isEditing && !data.password) {
        errors.password = "请输入初始密码";
      }
      return errors;
    },
    [isEditing],
  );

  /** 提交表单（创建/编辑） */
  const handleFormSubmit = useCallback(async () => {
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      const el = formFieldRefs.current[firstErrorKey];
      el?.focus();
      return;
    }

    setFormSubmitting(true);
    try {
      if (isEditing && editingUserId !== null) {
        await updateMobileUser(editingUserId, {
          nickname: formData.nickname.trim(),
          company: formData.company.trim(),
          role_id: formData.roleId!,
          region: formData.region.trim(),
          status: formData.status,
        });
        showSuccessToast("用户信息已更新");
      } else {
        await createMobileUser({
          phone: formData.phone.trim(),
          nickname: formData.nickname.trim() || undefined,
          company: formData.company.trim() || undefined,
          role_id: formData.roleId!,
          region: formData.region.trim() || undefined,
          password: formData.password,
          status: formData.status,
        });
        showSuccessToast("用户已创建");
      }

      setFormOpen(false);
      await fetchUsers();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEditing
            ? "更新用户失败，请重试"
            : "创建用户失败，请重试";
      showErrorToast(message);
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, isEditing, editingUserId, validateForm, fetchUsers]);

  /** 删除用户 */
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteMobileUser(deleteTarget.id);
      showSuccessToast("用户已删除");
      setDeleteTarget(null);
      // 如果当前抽屉正在展示被删除的用户，关闭抽屉
      if (selectedUser?.id === deleteTarget.id) {
        setDrawerOpen(false);
        setSelectedUser(null);
      }
      await fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "删除用户失败，请重试";
      showErrorToast(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, selectedUser, fetchUsers]);

  // ---- 密码操作 ----
  const handleGeneratePassword = useCallback(() => {
    setFormData((prev) => ({ ...prev, password: generatePassword() }));
  }, []);

  const handleCopyPassword = useCallback(async () => {
    if (!formData.password) return;
    await copyToClipboard(formData.password);
    showSuccessToast("密码已复制到剪贴板");
  }, [formData.password]);

  // ============================================================
  // 样式类
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

  const columns: TableColumn<MobileUser>[] = useMemo(
    () => [
      {
        key: "phone",
        title: "手机号",
        width: "140px",
        render: (_: unknown, row: MobileUser) => (
          <span className="text-[13px] text-[#404040] tabular-nums">
            {maskPhone(row.phone)}
          </span>
        ),
      },
      {
        key: "nickname",
        title: "昵称",
        width: "100px",
        render: (_: unknown, row: MobileUser) => (
          <span className="text-[13px] text-[#0A0A0A] font-medium">
            {row.nickname}
          </span>
        ),
      },
      {
        key: "company",
        title: "公司",
        width: "auto",
        render: (_: unknown, row: MobileUser) => (
          <span className="text-[13px] text-[#404040] truncate max-w-[200px] inline-block">
            {row.company}
          </span>
        ),
      },
      {
        key: "role",
        title: "角色",
        width: "90px",
        render: (_: unknown, row: MobileUser) => {
          const label = ROLE_LABEL_MAP[row.role] || row.role;
          return (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-sm",
                "text-[12px] leading-[1.5]",
                "bg-[#FAFAFA] text-[#404040]",
              )}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: "status",
        title: "状态",
        width: "80px",
        render: (_: unknown, row: MobileUser) => (
          <AdminStatusBadge
            status={mapStatus(row.status)}
            label={mapStatus(row.status) === "active" ? "正常" : "禁用"}
          />
        ),
      },
      {
        key: "registeredAt",
        title: "注册时间",
        width: "150px",
        sortable: true,
        render: (_: unknown, row: MobileUser) => (
          <span className="text-[12px] text-[#737373] tabular-nums">
            {row.registeredAt}
          </span>
        ),
      },
      {
        key: "operations",
        title: "操作",
        width: "130px",
        render: (_: unknown, row: MobileUser) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetail(row);
              }}
              className={cn(
                "inline-flex items-center gap-1",
                "text-[13px] leading-[1.5] text-[#0A0A0A]",
                "hover:text-[#404040]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 rounded-sm",
              )}
            >
              <Eye size={14} strokeWidth={1.75} />
              详情
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditForm(row);
              }}
              className={ghostIconBtnClass}
              aria-label="编辑用户"
              title="编辑"
            >
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row);
              }}
              className={dangerIconBtnClass}
              aria-label="删除用户"
              title="删除"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        ),
      },
    ],
    [handleViewDetail, openEditForm, ghostIconBtnClass, dangerIconBtnClass],
  );

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <>
      <AdminPageShell
        title="移动端用户管理"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "用户管理" },
          { label: "移动端用户" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button type="button" onClick={openAddForm} className={primaryBtnClass}>
              <Plus size={14} strokeWidth={1.75} />
              添加用户
            </button>
            <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className={cn(
              "inline-flex items-center gap-2",
              "h-9 px-4 rounded-full",
              "border border-[#E5E5E5]",
              "bg-white text-[#0A0A0A] text-[13px] leading-[1.5]",
              "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
              "transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {exporting ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download size={15} strokeWidth={1.75} />
                导出用户数据
              </>
            )}
          </button>
          </div>
        }
      >
        {/* ============================================================ */}
        {/* 1. 统计卡片行 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <AdminStatCard
            icon={<Users size={20} strokeWidth={1.75} />}
            label="注册总量"
            value={stats.totalRegistered.toLocaleString()}
          />
          <AdminStatCard
            icon={<UserPlus size={20} strokeWidth={1.75} />}
            label="今日新增"
            value={stats.todayNew}
          />
          <AdminStatCard
            icon={<Activity size={20} strokeWidth={1.75} />}
            label="日活跃"
            value={stats.dailyActive.toLocaleString()}
          />
          <AdminStatCard
            icon={<TrendingUp size={20} strokeWidth={1.75} />}
            label="月活跃"
            value={stats.monthlyActive.toLocaleString()}
          />
        </div>

        {retention && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <AdminStatCard
              icon={<TrendingUp size={20} strokeWidth={1.75} />}
              label="次日留存"
              value={`${retention.day1.value}%`}
              change={retention.day1.change}
            />
            <AdminStatCard
              icon={<Calendar size={20} strokeWidth={1.75} />}
              label="7日留存"
              value={`${retention.day7.value}%`}
              change={retention.day7.change}
            />
            <AdminStatCard
              icon={<Clock size={20} strokeWidth={1.75} />}
              label="30日留存"
              value={`${retention.day30.value}%`}
              change={retention.day30.change}
            />
          </div>
        )}
        {!retention && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-center h-[132px]">
              <div className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
            </div>
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-center h-[132px]">
              <div className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
            </div>
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 flex items-center justify-center h-[132px]">
              <div className="w-4 h-4 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. 筛选栏 */}
        {/* ============================================================ */}
        <div
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg p-4 mb-6",
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 手机号 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                手机号
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  strokeWidth={1.75}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
                />
                <input
                  type="text"
                  placeholder="请输入手机号"
                  value={draftFilters.phone}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className={cn(
                    "w-full h-9 pl-9 pr-3",
                    "rounded-md border border-[#E5E5E5]",
                    "bg-white text-[13px] text-[#0A0A0A]",
                    "placeholder:text-[#A3A3A3]",
                    "outline-none transition-colors duration-200",
                    "focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                  )}
                />
              </div>
            </div>

            {/* 公司 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                公司
              </label>
              <div className="relative">
                <Building2
                  size={14}
                  strokeWidth={1.75}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
                />
                <input
                  type="text"
                  placeholder="公司名称"
                  value={draftFilters.company}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  className={cn(
                    "w-full h-9 pl-9 pr-3",
                    "rounded-md border border-[#E5E5E5]",
                    "bg-white text-[13px] text-[#0A0A0A]",
                    "placeholder:text-[#A3A3A3]",
                    "outline-none transition-colors duration-200",
                    "focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                  )}
                />
              </div>
            </div>

            {/* 注册时间 - 开始 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                注册开始
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  strokeWidth={1.75}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none"
                />
                <input
                  type="date"
                  value={draftFilters.dateStart}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      dateStart: e.target.value,
                    }))
                  }
                  className={cn(
                    "w-full h-9 pl-9 pr-3",
                    "rounded-md border border-[#E5E5E5]",
                    "bg-white text-[13px] text-[#0A0A0A]",
                    "outline-none transition-colors duration-200",
                    "focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "[color-scheme:light]",
                  )}
                />
              </div>
            </div>

            {/* 注册时间 - 结束 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                注册结束
              </label>
              <div className="relative">
                <Calendar
                  size={14}
                  strokeWidth={1.75}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none"
                />
                <input
                  type="date"
                  value={draftFilters.dateEnd}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      dateEnd: e.target.value,
                    }))
                  }
                  className={cn(
                    "w-full h-9 pl-9 pr-3",
                    "rounded-md border border-[#E5E5E5]",
                    "bg-white text-[13px] text-[#0A0A0A]",
                    "outline-none transition-colors duration-200",
                    "focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "[color-scheme:light]",
                  )}
                />
              </div>
            </div>

            {/* 状态 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                状态
              </label>
              <select
                value={draftFilters.status}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className={cn(
                  "w-full h-9 px-3",
                  "rounded-md border border-[#E5E5E5]",
                  "bg-white text-[13px] text-[#0A0A0A]",
                  "outline-none transition-colors duration-200",
                  "focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                  "appearance-none cursor-pointer",
                )}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 角色 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                角色
              </label>
              <select
                value={draftFilters.role}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                className={cn(
                  "w-full h-9 px-3",
                  "rounded-md border border-[#E5E5E5]",
                  "bg-white text-[13px] text-[#0A0A0A]",
                  "outline-none transition-colors duration-200",
                  "focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                  "appearance-none cursor-pointer",
                )}
              >
                {ROLE_FILTER_OPTIONS.map((opt) => (
                  <option key={`${opt.value}-${opt.label}`} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                "inline-flex items-center gap-1.5",
                "h-9 px-4 rounded-full",
                "border border-[#E5E5E5]",
                "bg-white text-[#737373] text-[13px] leading-[1.5]",
                "hover:text-[#0A0A0A] hover:border-[#0A0A0A]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              )}
            >
              <RotateCcw size={14} strokeWidth={1.75} />
              重置
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className={cn(
                "inline-flex items-center gap-1.5",
                "h-9 px-5 rounded-full",
                "bg-[#0A0A0A] text-white text-[13px] leading-[1.5] font-medium",
                "hover:bg-[#404040]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:ring-offset-1",
              )}
            >
              <Search size={14} strokeWidth={1.75} />
              搜索
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. 用户表格 */}
        {/* ============================================================ */}
        {error ? (
          <div
            className={cn(
              "bg-white border border-[#E5E5E5] rounded-lg",
            )}
          >
            <AdminEmpty
              title="加载失败"
              description={error}
              action={{
                label: "重新加载",
                onClick: fetchUsers,
              }}
            />
          </div>
        ) : (
          <AdminTable<MobileUser>
            columns={columns}
            data={users}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            loading={loading}
            rowKey={(row) => String(row.id)}
          />
        )}
      </AdminPageShell>

      {/* ============================================================ */}
      {/* 4a. 添加/编辑用户表单弹窗 */}
      {/* ============================================================ */}
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
          {/* 标题栏 */}
          <DialogHeader className="mb-5 p-0">
            <DialogTitle className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
              {isEditing ? "编辑用户" : "添加用户"}
            </DialogTitle>
          </DialogHeader>

          {/* 表单 */}
          <div className="flex flex-col gap-4">
            {/* 手机号 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className={cn(
                  "text-[13px] leading-[1.5] text-[#404040]",
                  !isEditing && "after:content-['_*'] after:text-[#B42318]",
                )}
                htmlFor="field-phone"
              >
                手机号
              </Label>
              <Input
                id="field-phone"
                placeholder="请输入11位手机号"
                value={formData.phone}
                disabled={isEditing}
                ref={(el) => {
                  formFieldRefs.current["phone"] = el;
                }}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, phone: e.target.value }));
                  if (formErrors.phone)
                    setFormErrors((prev) => ({ ...prev, phone: "" }));
                }}
                className={cn(
                  "h-10 px-3 rounded-[10px]",
                  "border text-[14px] leading-[1.5]",
                  formErrors.phone
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10"
                    : "border-[#E5E5E5] focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  isEditing && "bg-[#FAFAFA] text-[#A3A3A3] cursor-not-allowed",
                  "placeholder:text-[#A3A3A3]",
                  "transition-colors duration-200",
                )}
                aria-invalid={!!formErrors.phone}
                aria-describedby={formErrors.phone ? "err-phone" : undefined}
              />
              {formErrors.phone && (
                <p id="err-phone" className="text-[12px] leading-[1.5] text-[#B42318]">
                  {formErrors.phone}
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

            {/* 公司 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className="text-[13px] leading-[1.5] text-[#404040]"
                htmlFor="field-company"
              >
                公司
              </Label>
              <Input
                id="field-company"
                placeholder="请输入公司名称"
                value={formData.company}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, company: e.target.value }))
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
                value={formData.roleId ? String(formData.roleId) : ""}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, roleId: Number(value) }));
                  if (formErrors.role)
                    setFormErrors((prev) => ({ ...prev, role: "" }));
                }}
              >
                <SelectTrigger
                  id="field-role"
                  ref={(el) => {
                    formFieldRefs.current["role"] = el;
                  }}
                  variant="filter"
                  className={cn(
                    "px-3 leading-[1.5] transition-colors duration-200",
                    formErrors.role && "border-[#B42318]",
                  )}
                  aria-invalid={!!formErrors.role}
                  aria-describedby={formErrors.role ? "err-role" : undefined}
                >
                  <SelectValue placeholder="请选择角色" />
                </SelectTrigger>
                <SelectContent variant="filter">
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      <span className="text-[13px] leading-[1.5]">{r.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p id="err-role" className="text-[12px] leading-[1.5] text-[#B42318]">
                  {formErrors.role}
                </p>
              )}
            </div>

            {/* 地区 */}
            <div className="flex flex-col gap-1.5">
              <Label
                className="text-[13px] leading-[1.5] text-[#404040]"
                htmlFor="field-region"
              >
                地区
              </Label>
              <Input
                id="field-region"
                placeholder="请输入地区（如上海）"
                value={formData.region}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, region: e.target.value }))
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
                      type="password"
                      placeholder="自动生成或手动输入"
                      value={formData.password}
                      ref={(el) => {
                        formFieldRefs.current["password"] = el;
                      }}
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

            {/* 启用/停用（仅编辑时显示） */}
            {isEditing && (
              <div className="flex items-center justify-between py-1">
                <Label className="text-[13px] leading-[1.5] text-[#404040]">
                  {formData.status === 1 ? "账号已启用" : "账号已停用"}
                </Label>
                <Switch
                  checked={formData.status === 1}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, status: checked ? 1 : 0 }))
                  }
                />
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => {
                setFormOpen(false);
              }}
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
              {formSubmitting && (
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
              )}
              确定
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 4. 用户详情抽屉 */}
      {/* ============================================================ */}
      <AdminDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="用户详情"
      >
        {detailLoading ? (
          <div className="py-12">
            <AdminLoading type="card" />
            <div className="mt-4">
              <AdminLoading type="card" />
            </div>
            <div className="mt-4">
              <AdminLoading type="card" />
            </div>
          </div>
        ) : selectedUser ? (
          <UserDetailContent
            user={selectedUser}
            onToggleStatus={handleToggleStatus}
          />
        ) : (
          <AdminEmpty title="无法加载用户信息" description="请关闭后重试" />
        )}
      </AdminDrawer>

      {/* ============================================================ */}
      {/* 5. 禁用/启用确认弹窗 */}
      {/* ============================================================ */}
      <AdminModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={
          modalAction === "disable" ? "确认禁用该账号？" : "确认启用该账号？"
        }
        description={
          modalAction === "disable"
            ? "禁用后该用户将无法登录和使用 App。账号数据将保留，可随时恢复。"
            : "启用后该用户将恢复登录和使用权限。"
        }
        confirmLabel={modalAction === "disable" ? "确认禁用" : "确认启用"}
        variant={modalAction === "disable" ? "destructive" : "default"}
        loading={modalLoading}
        onConfirm={handleConfirmToggle}
      />

      {/* ============================================================ */}
      {/* 6. 删除用户确认弹窗 */}
      {/* ============================================================ */}
      <AdminModal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleteTarget(null);
        }}
        title="确定删除该用户？"
        description="删除后该用户数据将被清除"
        confirmLabel="删除"
        cancelLabel="取消"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </>
  );
}

// ============================================================
// 用户详情内容组件（抽屉内部）
// ============================================================

interface UserDetailContentProps {
  user: MobileUser;
  onToggleStatus: (action: "disable" | "enable") => void;
}

function UserDetailContent({ user, onToggleStatus }: UserDetailContentProps) {
  const isDisabled = normalizeStatus(user.status) === "disabled";
  const conversations = React.useMemo(() => generateMockConversations(), []);
  const quotations = React.useMemo(() => generateMockQuotations(), []);

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* Section 1: 基本信息 */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div
            className={cn(
              "flex items-center justify-center",
              "w-8 h-8 rounded-full",
              "bg-[#FAFAFA] border border-[#E5E5E5]",
            )}
          >
            <Smartphone size={16} strokeWidth={1.75} className="text-[#0A0A0A]" />
          </div>
          <h3 className="text-[15px] leading-[1.4] font-medium text-[#0A0A0A]">
            基本信息
          </h3>
          {/* 状态标签 */}
          <AdminStatusBadge
            status={isDisabled ? "disabled" : "active"}
            label={isDisabled ? "已禁用" : "正常"}
            className="ml-auto"
          />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* 手机号 */}
          <DetailItem
            icon={<Phone size={14} strokeWidth={1.75} />}
            label="手机号"
            value={user.phone}
            mono
          />
          {/* 昵称 */}
          <DetailItem
            icon={<Users size={14} strokeWidth={1.75} />}
            label="昵称"
            value={user.nickname}
          />
          {/* 公司 */}
          <DetailItem
            icon={<Building2 size={14} strokeWidth={1.75} />}
            label="公司"
            value={user.company}
          />
          {/* 角色 */}
          <DetailItem
            icon={<UserCheck size={14} strokeWidth={1.75} />}
            label="角色"
            value={ROLE_LABEL_MAP[user.role] || user.role}
          />
          {/* 地区 */}
          <DetailItem
            icon={<MapPin size={14} strokeWidth={1.75} />}
            label="地区"
            value={user.region}
          />
          {/* 注册时间 */}
          <DetailItem
            icon={<Clock size={14} strokeWidth={1.75} />}
            label="注册时间"
            value={user.registeredAt}
          />
          {/* 最后登录 */}
          <DetailItem
            icon={<Activity size={14} strokeWidth={1.75} />}
            label="最后登录"
            value={user.lastLoginAt}
          />
          {/* 登录设备 */}
          <DetailItem
            icon={<Monitor size={14} strokeWidth={1.75} />}
            label="登录设备"
            value={user.deviceInfo || "—"}
          />
        </div>

        {/* 禁用/启用按钮 */}
        <div className="mt-5 pt-5 border-t border-[#E5E5E5]">
          {isDisabled ? (
            <button
              type="button"
              onClick={() => onToggleStatus("enable")}
              className={cn(
                "inline-flex items-center gap-2",
                "h-9 px-5 rounded-full",
                "text-[13px] leading-[1.5] font-medium",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A4D]/20 focus-visible:ring-offset-1",
                "bg-[#ECFDF5] text-[#1F7A4D]",
                "hover:bg-[#D1FAE5]",
                "border border-[#1F7A4D]/20",
              )}
            >
              <UserCheck size={15} strokeWidth={1.75} />
              启用账号
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleStatus("disable")}
              className={cn(
                "inline-flex items-center gap-2",
                "h-9 px-5 rounded-full",
                "text-[13px] leading-[1.5] font-medium",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#B42318]/20 focus-visible:ring-offset-1",
                "bg-[#FEF2F2] text-[#B42318]",
                "hover:bg-[#FEE2E2]",
                "border border-[#B42318]/20",
              )}
            >
              <UserX size={15} strokeWidth={1.75} />
              禁用账号
            </button>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 2: 使用统计 */}
      {/* ============================================================ */}
      {user.stats && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-full",
                "bg-[#FAFAFA] border border-[#E5E5E5]",
              )}
            >
              <Star size={16} strokeWidth={1.75} className="text-[#0A0A0A]" />
            </div>
            <h3 className="text-[15px] leading-[1.4] font-medium text-[#0A0A0A]">
              使用统计
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatItem
              icon={<MessageSquare size={14} strokeWidth={1.75} />}
              label="累计对话"
              value={`${user.stats.totalConversations}次`}
            />
            <StatItem
              icon={<FileText size={14} strokeWidth={1.75} />}
              label="累计报价"
              value={`${user.stats.totalQuotations}份`}
            />
            <StatItem
              icon={<Star size={14} strokeWidth={1.75} />}
              label="收藏招标"
              value={`${user.stats.savedTenders}个`}
            />
            <StatItem
              icon={<Bell size={14} strokeWidth={1.75} />}
              label="价格预警"
              value={`${user.stats.priceAlerts}条`}
            />
            <StatItem
              icon={<Zap size={14} strokeWidth={1.75} />}
              label="AI调用量"
              value={`${user.stats.aiCalls}次`}
            />
            <StatItem
              icon={
                user.stats.positiveRate >= 0.5 ? (
                  <ThumbsUp size={14} strokeWidth={1.75} />
                ) : (
                  <ThumbsDown size={14} strokeWidth={1.75} />
                )
              }
              label="平均评分"
              value={`${(user.stats.positiveRate * 100).toFixed(0)}% 好评`}
              valueColor={
                user.stats.positiveRate >= 0.8
                  ? "text-[#1F7A4D]"
                  : user.stats.positiveRate >= 0.5
                    ? "text-[#B45309]"
                    : "text-[#B42318]"
              }
            />
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* Section 3: 最近对话记录 */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-full",
                "bg-[#FAFAFA] border border-[#E5E5E5]",
              )}
            >
              <MessageSquare size={16} strokeWidth={1.75} className="text-[#0A0A0A]" />
            </div>
            <h3 className="text-[15px] leading-[1.4] font-medium text-[#0A0A0A]">
              最近对话记录
            </h3>
          </div>
          {conversations.length > 0 && (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1",
                "text-[12px] leading-[1.5] text-[#737373]",
                "hover:text-[#0A0A0A]",
                "transition-colors duration-150",
              )}
            >
              查看全部
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="border border-[#E5E5E5] rounded-lg py-10 text-center">
            <MessageSquare size={24} strokeWidth={1.75} className="text-[#E5E5E5] mx-auto mb-2" />
            <p className="text-[13px] leading-[1.5] text-[#A3A3A3]">暂无对话记录</p>
          </div>
        ) : (
          <div
            className={cn(
              "border border-[#E5E5E5] rounded-lg overflow-hidden",
              "divide-y divide-[#E5E5E5]",
            )}
          >
            {conversations.slice(0, 4).map((conv, idx) => (
              <div
                key={conv.id}
                className={cn(
                  "px-4 py-3",
                  idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#A3A3A3] tabular-nums">
                    {conv.date}
                  </span>
                  <span className="text-[11px] text-[#737373] bg-[#FAFAFA] border border-[#E5E5E5] rounded-sm px-1.5 py-0.5">
                    {conv.intent}
                  </span>
                </div>
                <p className="text-[13px] leading-[1.5] text-[#404040] truncate">
                  {conv.question}
                </p>
                <div className="mt-1">
                  {conv.feedback === "up" ? (
                    <ThumbsUp
                      size={12}
                      strokeWidth={1.75}
                      className="text-[#1F7A4D]"
                    />
                  ) : (
                    <ThumbsDown
                      size={12}
                      strokeWidth={1.75}
                      className="text-[#B42318]"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* Section 4: 报价记录 */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-full",
                "bg-[#FAFAFA] border border-[#E5E5E5]",
              )}
            >
              <FileText size={16} strokeWidth={1.75} className="text-[#0A0A0A]" />
            </div>
            <h3 className="text-[15px] leading-[1.4] font-medium text-[#0A0A0A]">
              报价记录
            </h3>
          </div>
          {quotations.length > 0 && (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1",
                "text-[12px] leading-[1.5] text-[#737373]",
                "hover:text-[#0A0A0A]",
                "transition-colors duration-150",
              )}
            >
              查看全部
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>

        {quotations.length === 0 ? (
          <div className="border border-[#E5E5E5] rounded-lg py-10 text-center">
            <FileText size={24} strokeWidth={1.75} className="text-[#E5E5E5] mx-auto mb-2" />
            <p className="text-[13px] leading-[1.5] text-[#A3A3A3]">暂无报价记录</p>
          </div>
        ) : (
          <div
            className={cn(
              "border border-[#E5E5E5] rounded-lg overflow-hidden",
              "divide-y divide-[#E5E5E5]",
            )}
          >
            {quotations.slice(0, 2).map((quo, idx) => (
              <div
                key={quo.id}
                className={cn(
                  "flex items-center justify-between px-4 py-3",
                  idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-[#A3A3A3] tabular-nums block mb-0.5">
                    {quo.date}
                  </span>
                  <p className="text-[13px] leading-[1.5] text-[#404040] truncate">
                    {quo.spec}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A] tabular-nums">
                    {quo.totalPrice}
                  </p>
                  <span
                    className={cn(
                      "inline-block text-[11px] leading-[1.5] px-1.5 py-0.5 rounded-sm mt-0.5",
                      quo.status === "已接受"
                        ? "bg-[#ECFDF5] text-[#1F7A4D]"
                        : quo.status === "已发送"
                          ? "bg-[#FFFBEB] text-[#B45309]"
                          : "bg-[#FAFAFA] text-[#737373]",
                    )}
                  >
                    {quo.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// 详情子组件
// ============================================================

/** 详情字段行 */
function DetailItem({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] leading-[1.5] text-[#737373]">{label}</span>
      <span
        className={cn(
          "text-[13px] leading-[1.5] text-[#0A0A0A]",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** 统计小卡片 */
function StatItem({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 p-3",
        "bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[#737373]">{icon}</span>
        <span className="text-[11px] leading-[1.5] text-[#737373]">{label}</span>
      </div>
      <span
        className={cn(
          "text-[15px] leading-[1.6] font-medium tabular-nums",
          valueColor ?? "text-[#0A0A0A]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default MobileUserManagement;
