// ============================================================
// OperationLogs -- 操作日志页面
//
// 包含功能：
//   1. 筛选栏（操作人 / 操作类型 / 时间范围）
//   2. 日志列表（排序 + 分页）
//   3. 日志详情弹窗（Dialog）
//   4. 导出日志（CSV 下载）
//
// Design tokens: 使用项目色板/字阶/圆角规范
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Download,
  X,
  FileText,
  Clock,
  User,
  Globe,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOperationLogs,
  getOperationLogDetail,
  exportOperationLogs,
} from "@/app/api/admin";
import type { OperationLog, PaginatedResponse } from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

/** 操作人类别选项 */
const OPERATOR_OPTIONS = [
  { label: "全部", value: "all" },
  { label: "系统管理员", value: "admin" },
  { label: "运营人员A", value: "operator_a" },
  { label: "数据管理员B", value: "data_b" },
  { label: "系统", value: "system" },
];

/** 操作类型选项 */
const ACTION_TYPE_OPTIONS = [
  { label: "全部", value: "all" },
  { label: "修改配置", value: "system_config" },
  { label: "数据操作", value: "data_operation" },
  { label: "用户管理", value: "user_management" },
  { label: "系统任务", value: "system_task" },
  { label: "登录", value: "login" },
  { label: "质量管理", value: "quality_management" },
];

/** 操作类型中文标签映射 */
const ACTION_TYPE_LABELS: Record<string, string> = {
  system_config: "修改配置",
  data_operation: "数据操作",
  user_management: "用户管理",
  system_task: "系统任务",
  login: "登录",
  quality_management: "质量管理",
};

/** 操作类型颜色映射（使用设计系统色板） */
const ACTION_TYPE_COLORS: Record<string, string> = {
  system_config: "text-[#0A0A0A]",
  data_operation: "text-[#1F7A4D]",
  user_management: "text-[#B42318]",
  system_task: "text-[#737373]",
  login: "text-[#B45309]",
  quality_management: "text-[#0A0A0A]",
};

// ============================================================
// 工具函数
// ============================================================

/** 格式化时间戳为短格式 "MM-DD HH:mm:ss" */
function formatShortTime(ts: string): string {
  if (!ts) return "—";
  // ts 格式: "2026-05-17 10:30:25"
  const match = ts.match(/^\d{4}-(\d{2}-\d{2})\s(\d{2}:\d{2}:\d{2})$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return ts;
}

/** 获取操作类型标签 */
function getActionTypeLabel(actionType: string): string {
  return ACTION_TYPE_LABELS[actionType] ?? actionType;
}

/** 获取操作类型颜色 */
function getActionTypeColor(actionType: string): string {
  return ACTION_TYPE_COLORS[actionType] ?? "text-[#737373]";
}

/** 获取今天的日期字符串 */
function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 获取 N 天前的日期字符串 */
function getDaysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ============================================================
// 表格列定义
// ============================================================

const COLUMNS: TableColumn<OperationLog>[] = [
  {
    key: "timestamp",
    title: "时间",
    sortable: true,
    width: "160px",
    render: (value) => {
      const ts = value as string;
      return (
        <span className="text-[12px] text-[#737373] tabular-nums whitespace-nowrap">
          {formatShortTime(ts)}
        </span>
      );
    },
  },
  {
    key: "operator",
    title: "操作人",
    render: (value) => {
      const name = value as string;
      return (
        <span className="text-[13px] text-[#404040] whitespace-nowrap">
          {name}
        </span>
      );
    },
  },
  {
    key: "actionType",
    title: "操作类型",
    width: "120px",
    render: (value) => {
      const type = value as string;
      const label = getActionTypeLabel(type);
      const color = getActionTypeColor(type);
      return (
        <span className={cn("text-[12px] font-medium whitespace-nowrap", color)}>
          {label}
        </span>
      );
    },
  },
  {
    key: "summary",
    title: "操作内容",
    render: (value) => {
      const text = value as string;
      return (
        <span
          className="text-[13px] text-[#404040] block max-w-[320px] truncate"
          title={text}
        >
          {text}
        </span>
      );
    },
  },
  {
    key: "ip",
    title: "IP",
    width: "140px",
    render: (value) => {
      const ip = value as string;
      return (
        <span className="text-[12px] text-[#A3A3A3] font-mono tabular-nums whitespace-nowrap">
          {ip}
        </span>
      );
    },
  },
];

// ============================================================
// 详情弹窗组件
// ============================================================

interface DetailDialogProps {
  open: boolean;
  log: OperationLog | null;
  loading: boolean;
  onClose: () => void;
}

function DetailDialog({ open, log, loading, onClose }: DetailDialogProps) {
  if (!log && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          "bg-white border border-[#E5E5E5] rounded-2xl",
          "max-w-[560px] w-[calc(100%-32px)]",
          "p-0 gap-0",
        )}
      >
        {/* 标题栏 */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A]">
              日志详情
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex items-center justify-center",
                "w-8 h-8 rounded-full",
                "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              )}
              aria-label="关闭"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
        </DialogHeader>

        {/* 内容区 */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <AdminLoading type="inline" />
            </div>
          ) : log ? (
            <div className="space-y-4">
              {/* 键值对列表 */}
              <div className="space-y-3">
                {/* 时间 */}
                <DetailRow
                  icon={<Clock size={14} strokeWidth={1.75} />}
                  label="时间"
                  value={log.timestamp}
                />

                {/* 操作人 */}
                <DetailRow
                  icon={<User size={14} strokeWidth={1.75} />}
                  label="操作人"
                  value={`${log.operator}（${log.operatorAccount}）`}
                />

                {/* 操作类型 */}
                <DetailRow
                  icon={<Tag size={14} strokeWidth={1.75} />}
                  label="操作类型"
                  value={
                    <span className={cn("text-[13px] font-medium", getActionTypeColor(log.actionType))}>
                      {getActionTypeLabel(log.actionType)}
                    </span>
                  }
                />

                {/* IP 地址 */}
                <DetailRow
                  icon={<Globe size={14} strokeWidth={1.75} />}
                  label="IP 地址"
                  value={log.ip}
                />

                {/* 操作内容摘要 */}
                <DetailRow
                  icon={<FileText size={14} strokeWidth={1.75} />}
                  label="操作内容"
                  value={log.summary}
                />
              </div>

              {/* 操作详情 JSON */}
              <div className="pt-2">
                <p className="text-[11px] leading-[1.5] tracking-[0.08em] uppercase text-[#737373] mb-2">
                  操作详情
                </p>
                <pre
                  className={cn(
                    "bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg",
                    "p-4 overflow-auto max-h-[320px]",
                    "text-[12px] leading-[1.6] text-[#404040]",
                    "font-mono whitespace-pre-wrap break-all",
                  )}
                >
                  {JSON.stringify(log.detail, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#E5E5E5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={cn(
              "h-9 px-5 rounded-full",
              "border-[#E5E5E5] text-[#0A0A0A] text-[13px]",
              "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
              "transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
          >
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 详情行组件 */
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 w-[100px] shrink-0 pt-[1px]">
        <span className="text-[#A3A3A3] flex-shrink-0">{icon}</span>
        <span className="text-[12px] leading-[1.5] text-[#737373]">
          {label}
        </span>
      </div>
      <div className="text-[13px] leading-[1.5] text-[#404040] break-all">
        {value}
      </div>
    </div>
  );
}

// ============================================================
// OperationLogs 主组件
// ============================================================

export function OperationLogs() {
  // 筛选状态
  const [filterOperator, setFilterOperator] = useState("all");
  const [filterActionType, setFilterActionType] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState(getDaysAgoStr(7));
  const [filterEndDate, setFilterEndDate] = useState(getTodayStr());

  // 数据状态
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 详情弹窗状态
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<OperationLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 导出状态
  const [exporting, setExporting] = useState(false);

  // ============================================================
  // 数据获取
  // ============================================================

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: PaginatedResponse<OperationLog> = await getOperationLogs({
        page,
        pageSize,
        operator: filterOperator,
        actionType: filterActionType,
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
      setLogs(result.items);
      setTotal(result.total);
    } catch (err) {
      setError("获取操作日志失败，请重试");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterOperator, filterActionType, filterStartDate, filterEndDate]);

  // 首次加载 & 筛选/分页变化时重新获取
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ============================================================
  // 事件处理
  // ============================================================

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPage(1);
    fetchLogs();
  }, [fetchLogs]);

  /** 排序变化 */
  const handleSort = useCallback((key: string, order: "asc" | "desc") => {
    setSortBy(key || "timestamp");
    setSortOrder(key ? order : "desc");
    setPage(1);
  }, []);

  /** 行点击 - 打开详情 */
  const handleRowClick = useCallback(async (row: OperationLog) => {
    setDetailLog(null);
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const detail = await getOperationLogDetail(row.id);
      setDetailLog(detail);
    } catch {
      showErrorToast("获取日志详情失败");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /** 关闭详情 */
  const handleDetailClose = useCallback(() => {
    setDetailOpen(false);
    setDetailLog(null);
  }, []);

  /** 导出日志 */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await exportOperationLogs({
        operator: filterOperator,
        actionType: filterActionType,
        startDate: filterStartDate,
        endDate: filterEndDate,
      });

      // 触发下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `operation-logs-${filterStartDate}_${filterEndDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccessToast("日志导出成功");
    } catch {
      showErrorToast("日志导出失败，请重试");
    } finally {
      setExporting(false);
    }
  }, [filterOperator, filterActionType, filterStartDate, filterEndDate]);

  /** 重置筛选 */
  const handleReset = useCallback(() => {
    setFilterOperator("all");
    setFilterActionType("all");
    setFilterStartDate(getDaysAgoStr(7));
    setFilterEndDate(getTodayStr());
    setPage(1);
  }, []);

  // ============================================================
  // 过滤后的数据（本地排序 -- API 已排序，这里做兜底）
  // ============================================================

  const displayLogs = useMemo(() => {
    const sorted = [...logs];
    if (sortBy === "timestamp") {
      sorted.sort((a, b) => {
        const cmp = a.timestamp.localeCompare(b.timestamp);
        return sortOrder === "desc" ? -cmp : cmp;
      });
    }
    return sorted;
  }, [logs, sortBy, sortOrder]);

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="操作日志"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "系统管理" },
        { label: "操作日志" },
      ]}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={exporting || loading}
          className={cn(
            "h-9 px-4 rounded-full gap-2",
            "border-[#E5E5E5] text-[#0A0A0A] text-[13px]",
            "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
            "transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
          )}
        >
          {exporting ? (
            <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <Download size={16} strokeWidth={1.75} />
          )}
          <span>{exporting ? "导出中..." : "导出日志"}</span>
        </Button>
      }
    >
      {/* ================================================================ */}
      {/* 1. 筛选栏 */}
      {/* ================================================================ */}
      <div
        className={cn(
          "bg-white border border-[#E5E5E5] rounded-lg p-4 mb-4",
          "flex flex-wrap items-center gap-3",
        )}
      >
        {/* 操作人 */}
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[#737373] whitespace-nowrap">
            操作人
          </label>
          <Select
            value={filterOperator}
            onValueChange={setFilterOperator}
          >
            <SelectTrigger
              className={cn(
                "h-9 w-[130px] rounded-md",
                "border-[#E5E5E5] bg-white",
                "text-[13px] text-[#404040]",
                "outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A]",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 操作类型 */}
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[#737373] whitespace-nowrap">
            操作类型
          </label>
          <Select
            value={filterActionType}
            onValueChange={setFilterActionType}
          >
            <SelectTrigger
              className={cn(
                "h-9 w-[130px] rounded-md",
                "border-[#E5E5E5] bg-white",
                "text-[13px] text-[#404040]",
                "outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A]",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 时间范围 */}
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-[#737373] whitespace-nowrap">
            时间
          </label>
          <Input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className={cn(
              "h-9 w-[140px] rounded-md px-3",
              "border-[#E5E5E5] bg-white",
              "text-[13px] text-[#404040]",
              "outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A]",
            )}
          />
          <span className="text-[12px] text-[#A3A3A3]">~</span>
          <Input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className={cn(
              "h-9 w-[140px] rounded-md px-3",
              "border-[#E5E5E5] bg-white",
              "text-[13px] text-[#404040]",
              "outline-none focus:ring-2 focus:ring-[#0A0A0A]/10 focus:border-[#0A0A0A]",
            )}
          />
        </div>

        {/* 操作按钮 */}
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
          <Button
            type="button"
            onClick={handleSearch}
            className={cn(
              "h-9 px-4 rounded-full gap-1.5",
              "bg-[#0A0A0A] text-white text-[13px]",
              "hover:bg-[#404040]",
              "transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/20",
            )}
          >
            <Search size={14} strokeWidth={1.75} />
            <span>搜索</span>
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. 日志表格 */}
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
            onClick={fetchLogs}
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
          data={displayLogs}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          loading={loading}
          onRowClick={handleRowClick}
          empty={
            <AdminEmpty
              icon={
                <FileText
                  size={22}
                  strokeWidth={1.75}
                  className="text-[#A3A3A3]"
                />
              }
              title="暂无操作日志"
              description="当前筛选条件下没有匹配的操作日志记录"
            />
          }
        />
      )}

      {/* ================================================================ */}
      {/* 3. 日志详情弹窗 */}
      {/* ================================================================ */}
      <DetailDialog
        open={detailOpen}
        log={detailLog}
        loading={detailLoading}
        onClose={handleDetailClose}
      />
    </AdminPageShell>
  );
}

export default OperationLogs;
