// ============================================================
// LoginLogs -- 登录日志页面
//
// 包含功能：
//   1. 顶部统计卡片行（今日登录总数 / 成功 / 失败 / 失败率）
//   2. 筛选栏（用户类型下拉）
//   3. 日志表格（排序 + 分页）
//   4. 加载态骨架屏 / 空态 / 错误态
//
// Design tokens: ink #0A0A0A, 1px borders, no shadows except minimal,
// no gradients, no blue colors.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LogIn,
  UserCheck,
  UserX,
  Percent,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminLoading } from "./AdminLoading";
import { AdminEmpty } from "./AdminEmpty";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLoginLogs, getLoginLogStats } from "@/app/api/admin";
import type {
  LoginLogEntry,
  LoginLogStats,
  PaginatedResponse,
} from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

/** 用户类型筛选选项 */
const USER_TYPE_OPTIONS = [
  { label: "全部", value: "all" },
  { label: "管理员", value: "admin" },
  { label: "移动端用户", value: "mobile" },
];

/** 用户类型中文标签映射 */
const USER_TYPE_LABELS: Record<string, string> = {
  admin: "管理员",
  mobile: "移动端",
};

// ============================================================
// 工具函数
// ============================================================

/** 格式化时间戳 "2026-05-26T10:30:25" -> "05-26 10:30:25" */
function formatTime(ts: string): string {
  if (!ts) return "—";
  // 支持 ISO 格式和 "YYYY-MM-DD HH:mm:ss" 格式
  const d = new Date(ts);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${mm}-${dd} ${hh}:${mi}:${ss}`;
  }
  // 兜底：尝试匹配 "YYYY-MM-DD HH:mm:ss" 格式
  const match = ts.match(/^(\d{4})-(\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/);
  if (match) return `${match[2]} ${match[3]}`;
  return ts;
}

/** 计算失败率 */
function calcFailureRate(failure: number, total: number): string {
  if (total === 0) return "0%";
  return ((failure / total) * 100).toFixed(1) + "%";
}

// ============================================================
// 表格列定义
// ============================================================

const COLUMNS: TableColumn<LoginLogEntry>[] = [
  {
    key: "created_at",
    title: "时间",
    sortable: true,
    width: "160px",
    render: (value) => {
      const ts = value as string;
      return (
        <span className="text-[12px] text-[#737373] tabular-nums whitespace-nowrap">
          {formatTime(ts)}
        </span>
      );
    },
  },
  {
    key: "user_type",
    title: "用户类型",
    width: "120px",
    render: (value) => {
      const type = value as string;
      const label = USER_TYPE_LABELS[type] ?? type;
      const isAdmin = type === "admin";
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5",
            "rounded-full px-2.5 py-0.5",
            "text-[12px] leading-[1.5] whitespace-nowrap",
            isAdmin ? "bg-[#FAFAFA] text-[#404040]" : "bg-white text-[#404040]",
            "border border-[#E5E5E5]",
          )}
        >
          {isAdmin ? (
            <ShieldCheck size={11} strokeWidth={1.75} className="text-[#737373]" />
          ) : (
            <Smartphone size={11} strokeWidth={1.75} className="text-[#737373]" />
          )}
          {label}
        </span>
      );
    },
  },
  {
    key: "admin_id",
    title: "用户名",
    render: (_value, row) => {
      if (row.user_type === "admin" && row.admin_id) {
        return (
          <span className="text-[13px] text-[#404040] whitespace-nowrap tabular-nums">
            ID: {row.admin_id}
          </span>
        );
      }
      if (row.user_type === "mobile" && row.user_id) {
        return (
          <span className="text-[13px] text-[#404040] whitespace-nowrap tabular-nums">
            ID: {row.user_id}
          </span>
        );
      }
      return <span className="text-[13px] text-[#A3A3A3]">—</span>;
    },
  },
  {
    key: "login_type",
    title: "操作",
    width: "100px",
    render: (value) => {
      const type = value as string;
      const isSuccess = type === "success";
      return (
        <span
          className={cn(
            "text-[13px] leading-[1.5] font-medium whitespace-nowrap",
            isSuccess ? "text-[#1F7A4D]" : "text-[#B42318]",
          )}
        >
          {isSuccess ? "登录成功" : "登录失败"}
        </span>
      );
    },
  },
  {
    key: "fail_reason",
    title: "失败原因",
    render: (value, row) => {
      if (row.login_type !== "failure") {
        return <span className="text-[13px] text-[#A3A3A3]">—</span>;
      }
      const reason = (value as string) || "未知";
      return (
        <span
          className="text-[13px] text-[#737373] block max-w-[240px] truncate"
          title={reason}
        >
          {reason}
        </span>
      );
    },
  },
  {
    key: "ip_address",
    title: "IP 地址",
    width: "140px",
    render: (value) => {
      const ip = (value as string) || "—";
      return (
        <span className="text-[12px] text-[#A3A3A3] font-mono tabular-nums whitespace-nowrap">
          {ip}
        </span>
      );
    },
  },
];

// ============================================================
// 统计卡片组件（行内定义，避免文件膨胀）
// ============================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
}

function StatCard({ icon, label, value, valueColor }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-[#E5E5E5] rounded-xl p-5",
        "flex flex-col gap-3",
      )}
    >
      {/* 图标区 */}
      <div
        className={cn(
          "flex items-center justify-center",
          "w-10 h-10 rounded-lg",
          "bg-[#FAFAFA]",
        )}
        aria-hidden="true"
      >
        <span className="text-[#0A0A0A]">{icon}</span>
      </div>

      {/* 主数值 */}
      <div>
        <p
          className={cn(
            "text-[28px] leading-[1.2] font-medium tabular-nums",
            valueColor ?? "text-[#0A0A0A]",
          )}
        >
          {value}
        </p>
        <p className="text-[12px] leading-[1.5] text-[#737373] mt-1">
          {label}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LoginLogs 主组件
// ============================================================

export function LoginLogs() {
  // 筛选状态
  const [filterUserType, setFilterUserType] = useState("all");

  // 统计数据
  const [stats, setStats] = useState<LoginLogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 表格数据
  const [logs, setLogs] = useState<LoginLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // 数据获取：统计数据
  // ============================================================

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const result = await getLoginLogStats();
      setStats(result);
    } catch {
      // 统计获取失败不阻塞主流程
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ============================================================
  // 数据获取：日志列表
  // ============================================================

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: PaginatedResponse<LoginLogEntry> = await getLoginLogs({
        page,
        page_size: pageSize,
        user_type: filterUserType === "all" ? undefined : filterUserType,
      });
      setLogs(result.items);
      setTotal(result.total);
    } catch {
      setError("获取登录日志失败，请重试");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterUserType]);

  // 首次加载
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 筛选变化 */
  const handleUserTypeChange = useCallback((value: string) => {
    setFilterUserType(value);
    setPage(1);
  }, []);

  /** 排序变化 */
  const handleSort = useCallback(
    (key: string, order: "asc" | "desc") => {
      setSortBy(key || "created_at");
      setSortOrder(key ? order : "desc");
      setPage(1);
    },
    [],
  );

  /** 重置筛选 */
  const handleReset = useCallback(() => {
    setFilterUserType("all");
    setPage(1);
    fetchStats();
  }, [fetchStats]);

  // ============================================================
  // 计算值
  // ============================================================

  const failureRate = useMemo(() => {
    if (!stats) return "—";
    return calcFailureRate(stats.today_failure, stats.today_total);
  }, [stats]);

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="登录日志"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "用户管理" },
        { label: "登录日志" },
      ]}
    >
      {/* ================================================================ */}
      {/* 1. 统计卡片行 */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <AdminLoading type="card" />
            <AdminLoading type="card" />
            <AdminLoading type="card" />
            <AdminLoading type="card" />
          </>
        ) : (
          <>
            <StatCard
              icon={<LogIn size={18} strokeWidth={1.75} />}
              label="今日登录总数"
              value={stats?.today_total ?? 0}
            />
            <StatCard
              icon={<UserCheck size={18} strokeWidth={1.75} />}
              label="成功登录"
              value={stats?.today_success ?? 0}
              valueColor="text-[#1F7A4D]"
            />
            <StatCard
              icon={<UserX size={18} strokeWidth={1.75} />}
              label="失败登录"
              value={stats?.today_failure ?? 0}
              valueColor="text-[#B42318]"
            />
            <StatCard
              icon={<Percent size={18} strokeWidth={1.75} />}
              label="失败率"
              value={failureRate}
              valueColor={
                stats && stats.today_failure > 0
                  ? "text-[#B45309]"
                  : "text-[#0A0A0A]"
              }
            />
          </>
        )}
      </div>

      {/* ================================================================ */}
      {/* 2. 筛选栏 */}
      {/* ================================================================ */}
      <div
        className={cn(
          "bg-white border border-[#E5E5E5] rounded-lg p-4 mb-4",
          "flex flex-wrap items-center gap-3",
        )}
      >
        {/* 用户类型 */}
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[#737373] whitespace-nowrap">
            用户类型
          </label>
          <Select value={filterUserType} onValueChange={handleUserTypeChange}>
            <SelectTrigger
              variant="filter"
              className="h-9 w-[140px] text-[13px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent variant="filter">
              {USER_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 重置 */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="button"
            onClick={handleReset}
            variant="ghost"
            className={cn(
              "h-9 px-3 rounded-md",
              "text-[13px] text-[#737373]",
              "hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
              "transition-colors duration-150",
            )}
          >
            重置
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. 日志表格 */}
      {/* ================================================================ */}
      {error ? (
        <div
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg",
            "flex flex-col items-center justify-center py-20 px-4 gap-4",
          )}
        >
          <p className="text-[15px] text-[#B42318]">{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              fetchStats();
              fetchLogs();
            }}
            className={cn(
              "h-9 px-4 rounded-full",
              "border-[#E5E5E5] text-[#0A0A0A] text-[13px]",
              "hover:bg-[#FAFAFA]",
              "transition-colors duration-150",
            )}
          >
            重试
          </Button>
        </div>
      ) : (
        <AdminTable
          columns={COLUMNS}
          data={logs}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={loading}
          empty={
            <AdminEmpty
              icon={
                <LogIn
                  size={22}
                  strokeWidth={1.75}
                  className="text-[#A3A3A3]"
                />
              }
              title="暂无登录日志"
              description="当前筛选条件下没有匹配的登录日志记录"
            />
          }
        />
      )}
    </AdminPageShell>
  );
}

export default LoginLogs;
