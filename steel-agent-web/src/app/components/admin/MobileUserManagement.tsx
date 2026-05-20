import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MobileUser, PaginatedResponse } from "@/app/types/admin";
import {
  getMobileUsers,
  getMobileUserDetail,
  disableMobileUser,
  enableMobileUser,
  exportMobileUsers,
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
function mapStatus(status: string): AdminStatusBadgeStatus {
  return status === "active" ? "active" : "disabled";
}

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
  return [
    {
      id: "conv-001",
      date: "2026-05-17 10:12",
      question: "螺纹钢HRB400E 20mm 上海今日报价？",
      intent: "查询价格",
      feedback: "up",
    },
    {
      id: "conv-002",
      date: "2026-05-17 09:05",
      question: "热卷Q235B最近一周走势怎么样？",
      intent: "价格走势",
      feedback: "up",
    },
    {
      id: "conv-003",
      date: "2026-05-16 15:30",
      question: "帮我计算100吨螺纹钢送到杭州的报价",
      intent: "计算报价",
      feedback: "down",
    },
    {
      id: "conv-004",
      date: "2026-05-16 11:00",
      question: "Q345B和Q355B的区别是什么？",
      intent: "知识查询",
      feedback: "up",
    },
    {
      id: "conv-005",
      date: "2026-05-15 16:20",
      question: "最近有没有上海的螺纹钢招标？",
      intent: "招标查询",
      feedback: "up",
    },
    {
      id: "conv-006",
      date: "2026-05-15 09:45",
      question: "帮我设置螺纹钢价格预警",
      intent: "设置预警",
      feedback: "down",
    },
  ];
}

function generateMockQuotations(): QuotationRecord[] {
  return [
    {
      id: "quo-001",
      date: "2026-05-16 14:20",
      spec: "螺纹钢 HRB400E 20mm × 100吨",
      totalPrice: "¥385,000",
      status: "已发送",
    },
    {
      id: "quo-002",
      date: "2026-05-10 09:30",
      spec: "热卷 Q235B 5.75mm × 50吨",
      totalPrice: "¥207,500",
      status: "已接受",
    },
    {
      id: "quo-003",
      date: "2026-05-03 11:15",
      spec: "冷轧 DC01 1.0mm × 30吨",
      totalPrice: "¥162,000",
      status: "草稿",
    },
  ];
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
      });

      setUsers(result.items);
      setTotal(result.total);

      // 模拟统计值（后端 API 暂不返回 stats 汇总）
      setStats({
        totalRegistered: result.total,
        todayNew: 12,
        dailyActive: 847,
        monthlyActive: 2156,
      });
    } catch (err) {
      setError("加载用户数据失败，请重试");
      console.error("fetchUsers error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
  // 表格列定义
  // ============================================================

  const columns: TableColumn<MobileUser>[] = React.useMemo(
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
            label={row.status === "active" ? "正常" : "禁用"}
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
        width: "80px",
        render: (_: unknown, row: MobileUser) => (
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
        ),
      },
    ],
    [handleViewDetail],
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
        }
      >
        {/* ============================================================ */}
        {/* 1. 统计卡片行 */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AdminStatCard
            icon={<Users size={20} strokeWidth={1.75} />}
            label="注册总量"
            value={stats.totalRegistered.toLocaleString()}
          />
          <AdminStatCard
            icon={<UserPlus size={20} strokeWidth={1.75} />}
            label="今日新增"
            value={stats.todayNew}
            change={3}
            changePct={33.33}
          />
          <AdminStatCard
            icon={<Activity size={20} strokeWidth={1.75} />}
            label="日活跃"
            value={stats.dailyActive.toLocaleString()}
            change={-23}
            changePct={-2.64}
          />
          <AdminStatCard
            icon={<TrendingUp size={20} strokeWidth={1.75} />}
            label="月活跃"
            value={stats.monthlyActive.toLocaleString()}
            change={156}
            changePct={7.8}
          />
        </div>

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
  const isDisabled = user.status === "disabled";
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
        </div>

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
        </div>

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
