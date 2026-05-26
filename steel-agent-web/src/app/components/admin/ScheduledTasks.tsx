import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  Play,
  Pause,
  ScrollText,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import {
  getScheduledTasks,
  triggerTask,
  getTaskLogs,
  toggleTask,
} from "@/app/api/admin";
import type { ScheduledTask, TaskExecutionLog } from "@/app/types/admin";
import { AdminPageShell } from "./AdminPageShell";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { AdminEmpty } from "./AdminEmpty";
import {
  showSuccessToast,
  showErrorToast,
} from "./AdminToast";

// ============================================================
// Cron 表达式 -> 中文可读描述
// ============================================================

function parseCronExpr(expr: string): string {
  if (!expr) return "-";
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // 简单模式匹配
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    // 每天 or 每 N 小时
    if (hour.includes("*/")) {
      const interval = hour.split("*/")[1];
      return `每 ${interval} 小时`;
    }
    if (hour.includes(",")) {
      const times = hour.split(",").map((h) => `${h.padStart(2, "0")}:${minute.padStart(2, "0")}`);
      return `每天 ${times.join("、")}`;
    }
    if (hour !== "*" && minute !== "*") {
      return `每天 ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
    }
  }

  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    // 每周
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    const days = dayOfWeek.split(",").map((d) => {
      const idx = parseInt(d, 10);
      return `周${dayNames[idx] ?? d}`;
    });
    return `每${days.join("、")} ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }

  if (dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
    // 每月
    return `每月 ${dayOfMonth} 日 ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }

  // 兜底：保留原表达式
  return expr;
}

// ============================================================
// 时间格式化
// ============================================================

function formatDateTime(ts: string | null): string {
  if (!ts) return "暂无";
  // "2026-05-26 03:00:00" -> "2026-05-26 03:00"
  const parts = ts.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1].slice(0, 5)}`;
  }
  return ts;
}

// ============================================================
// 计算执行耗时
// ============================================================

function calcDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "进行中";
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const diff = end - start;
  if (diff < 0) return "-";
  if (diff < 1000) return `${diff}ms`;
  if (diff < 60_000) return `${(diff / 1000).toFixed(1)}s`;
  const minutes = Math.floor(diff / 60_000);
  const seconds = Math.round((diff % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// ============================================================
// 确认弹窗
// ============================================================

interface ConfirmDialogProps {
  open: boolean;
  taskName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  taskName,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        "flex items-center justify-center",
        "bg-black/50",
      )}
      onClick={loading ? undefined : onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-white border border-[#E5E5E5] rounded-lg",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "p-6 w-full max-w-[400px] mx-4",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="确认执行任务"
      >
        <h3 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A] mb-2">
          确认执行
        </h3>
        <p className="text-[13px] leading-[1.6] text-[#737373] mb-5">
          确定要立即执行「{taskName}」吗？
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className={cn(
              "h-9 px-4 rounded-full",
              "border border-[#E5E5E5]",
              "bg-white text-[#0A0A0A] text-[13px] leading-[1.5]",
              "hover:bg-[#FAFAFA]",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
          >
            取消
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "h-9 px-4 rounded-full",
              "bg-[#0A0A0A] text-white",
              "text-[13px] leading-[1.5] font-medium",
              "hover:bg-[#404040]",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                执行中...
              </span>
            ) : (
              "确认"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 日志抽屉
// ============================================================

interface LogDrawerProps {
  open: boolean;
  taskId: number;
  taskName: string;
  onClose: () => void;
}

function LogDrawer({ open, taskId, taskName, onClose }: LogDrawerProps) {
  const [logs, setLogs] = useState<TaskExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !taskId) return;

    let cancelled = false;
    setLoading(true);

    getTaskLogs(taskId)
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {
        if (!cancelled) showErrorToast("加载执行日志失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, taskId]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full z-50",
        "w-[480px]",
        "bg-white border-l border-[#E5E5E5]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        "flex flex-col",
      )}
    >
      {/* 标题栏 */}
      <div
        className={cn(
          "flex items-center justify-between",
          "shrink-0",
          "px-5 py-4",
          "border-b border-[#E5E5E5]",
        )}
      >
        <div className="flex items-center gap-2">
          <Clock size={18} strokeWidth={1.75} className="text-[#404040]" />
          <h3 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
            执行日志
          </h3>
          <span className="text-[12px] leading-[1.5] text-[#737373] ml-1">
            {taskName}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "flex items-center justify-center",
            "w-8 h-8 rounded-md",
            "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
            "transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
          )}
          aria-label="关闭日志"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              size={22}
              strokeWidth={1.75}
              className="animate-spin text-[#A3A3A3]"
            />
          </div>
        ) : logs.length === 0 ? (
          <AdminEmpty
            icon={<ScrollText size={22} strokeWidth={1.75} className="text-[#A3A3A3]" />}
            title="暂无执行日志"
            description="该任务暂无执行记录"
          />
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className={cn(
                    "border border-[#E5E5E5] rounded-md",
                    "bg-white",
                    "transition-colors duration-150",
                  )}
                >
                  {/* 日志摘要行 */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : log.id)
                    }
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3",
                      "text-left",
                      "hover:bg-[#FAFAFA]",
                      "transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A0A0A]/10",
                    )}
                  >
                    {/* 状态标记 */}
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        log.status === "success"
                          ? "bg-[#1F7A4D]"
                          : "bg-[#B42318]",
                      )}
                      aria-hidden="true"
                    />

                    {/* 时间 */}
                    <span className="text-[13px] leading-[1.5] text-[#0A0A0A] shrink-0 min-w-[130px]">
                      {formatDateTime(log.started_at)}
                    </span>

                    {/* 耗时 */}
                    <span className="text-[12px] leading-[1.5] text-[#737373] shrink-0 w-[60px]">
                      {calcDuration(log.started_at, log.finished_at)}
                    </span>

                    {/* 状态标签 */}
                    <AdminStatusBadge
                      status={log.status === "success" ? "success" : "error"}
                      label={log.status === "success" ? "成功" : "失败"}
                    />

                    {/* 展开箭头 */}
                    <div className="flex-1" />
                    <svg
                      className={cn(
                        "w-4 h-4 text-[#A3A3A3] shrink-0",
                        "transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div
                      className={cn(
                        "px-4 pb-4",
                        "border-t border-[#E5E5E5]",
                      )}
                    >
                      <div className="mt-3 space-y-2">
                        <div>
                          <span className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#737373]">
                            执行结果
                          </span>
                          <p
                            className={cn(
                              "mt-1 text-[13px] leading-[1.6]",
                              "p-3 rounded-md",
                              "bg-[#FAFAFA] border border-[#E5E5E5]",
                              "text-[#404040] whitespace-pre-wrap break-all",
                            )}
                          >
                            {log.result_detail || "无详情"}
                          </p>
                        </div>

                        {log.error_message && (
                          <div>
                            <span className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-[#B42318]">
                              错误信息
                            </span>
                            <p
                              className={cn(
                                "mt-1 text-[13px] leading-[1.6]",
                                "p-3 rounded-md",
                                "bg-[#FEF2F2] border border-[#FECACA]",
                                "text-[#B42318] whitespace-pre-wrap break-all",
                              )}
                            >
                              {log.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export function ScheduledTasks() {
  // ---------- 任务列表 ----------
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- 确认弹窗 ----------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTask, setConfirmTask] = useState<ScheduledTask | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  // ---------- 切换加载 ----------
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // ---------- 日志抽屉 ----------
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [logTaskId, setLogTaskId] = useState(0);
  const [logTaskName, setLogTaskName] = useState("");

  // ============================================================
  // 数据加载
  // ============================================================

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScheduledTasks();
      setTasks(data);
    } catch {
      showErrorToast("加载定时任务失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ============================================================
  // 立即执行
  // ============================================================

  const handleOpenConfirm = useCallback((task: ScheduledTask) => {
    setConfirmTask(task);
    setConfirmOpen(true);
  }, []);

  const handleCloseConfirm = useCallback(() => {
    if (triggerLoading) return;
    setConfirmOpen(false);
    setConfirmTask(null);
  }, [triggerLoading]);

  const handleTriggerConfirm = useCallback(async () => {
    if (!confirmTask) return;

    setTriggerLoading(true);
    try {
      await triggerTask(confirmTask.name);
      showSuccessToast("任务已触发");
      setConfirmOpen(false);
      setConfirmTask(null);
      await loadTasks();
    } catch (err: any) {
      showErrorToast(err?.message ?? "触发任务失败");
    } finally {
      setTriggerLoading(false);
    }
  }, [confirmTask, loadTasks]);

  // ============================================================
  // 暂停/恢复
  // ============================================================

  const handleToggle = useCallback(
    async (task: ScheduledTask) => {
      setToggleLoading(task.name);
      try {
        const newStatus = await toggleTask(task.name);
        // 更新本地状态
        setTasks((prev) =>
          prev.map((t) =>
            t.name === task.name
              ? { ...t, status: newStatus as "running" | "paused" }
              : t,
          ),
        );
        showSuccessToast(
          newStatus === "paused" ? "任务已暂停" : "任务已恢复",
        );
      } catch {
        showErrorToast("操作失败");
      } finally {
        setToggleLoading(null);
      }
    },
    [],
  );

  // ============================================================
  // 查看日志
  // ============================================================

  const handleOpenLogs = useCallback((task: ScheduledTask) => {
    setLogTaskId(task.id);
    setLogTaskName(task.name);
    setLogDrawerOpen(true);
  }, []);

  const handleCloseLogs = useCallback(() => {
    setLogDrawerOpen(false);
    setLogTaskId(0);
    setLogTaskName("");
  }, []);

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="定时任务"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "系统管理" },
        { label: "定时任务" },
      ]}
      actions={
        <button
          type="button"
          disabled={loading}
          onClick={loadTasks}
          className={cn(
            "inline-flex items-center gap-2",
            "h-9 px-4 rounded-full",
            "border border-[#E5E5E5] bg-white",
            "text-[13px] leading-[1.5] text-[#0A0A0A]",
            "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
          )}
        >
          <RefreshCw
            size={14}
            strokeWidth={1.75}
            className={cn(loading && "animate-spin")}
          />
          刷新
        </button>
      }
    >
      {/* ============================================================
          加载中
      ============================================================ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={22}
            strokeWidth={1.75}
            className="animate-spin text-[#A3A3A3]"
          />
        </div>
      ) : tasks.length === 0 ? (
        /* ============================================================
           空状态
        ============================================================ */
        <AdminEmpty
          icon={<Clock size={22} strokeWidth={1.75} className="text-[#A3A3A3]" />}
          title="暂无定时任务"
          description="当前系统暂无配置定时任务"
        />
      ) : (
        /* ============================================================
           任务卡片网格
        ============================================================ */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const isRunning = task.status === "running";
            const isToggling = toggleLoading === task.name;

            return (
              <div
                key={task.id}
                className={cn(
                  "bg-white border border-[#E5E5E5] rounded-xl",
                  "p-5",
                  "flex flex-col",
                )}
              >
                {/* ---- 任务名称 ---- */}
                <div className="flex items-center gap-2.5 mb-2">
                  <Clock
                    size={18}
                    strokeWidth={1.75}
                    className="text-[#404040] shrink-0"
                  />
                  <h3 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A] truncate">
                    {task.name}
                  </h3>
                </div>

                {/* ---- 描述 ---- */}
                {task.description && (
                  <p className="text-[12px] leading-[1.5] text-[#737373] mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}

                {/* ---- 调度规则 ---- */}
                <div className="flex items-center gap-2 mb-3">
                  <Clock
                    size={14}
                    strokeWidth={1.75}
                    className="text-[#737373] shrink-0"
                  />
                  <span className="text-[12px] leading-[1.5] text-[#404040]">
                    {parseCronExpr(task.cron_expr)}
                  </span>
                </div>

                {/* ---- 状态标签 ---- */}
                <div className="mb-3">
                  <AdminStatusBadge
                    status={isRunning ? "active" : "disabled"}
                    label={isRunning ? "运行中" : "已暂停"}
                  />
                </div>

                {/* ---- 时间信息 ---- */}
                <div className="space-y-1.5 mb-5 text-[12px] leading-[1.5]">
                  <p className="text-[#737373]">
                    上次执行：{formatDateTime(task.last_run_at)}
                  </p>
                  <p className="text-[#737373]">
                    下次执行：{formatDateTime(task.next_run_at)}
                  </p>
                </div>

                {/* ---- 操作按钮 ---- */}
                <div className="mt-auto flex items-center gap-2">
                  {/* 立即执行 */}
                  <button
                    type="button"
                    onClick={() => handleOpenConfirm(task)}
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      "h-8 px-3 rounded-full",
                      "border border-[#E5E5E5]",
                      "text-[13px] leading-[1.5] text-[#0A0A0A]",
                      "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                      "transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    )}
                  >
                    <Play size={13} strokeWidth={1.75} />
                    立即执行
                  </button>

                  {/* 查看日志 */}
                  <button
                    type="button"
                    onClick={() => handleOpenLogs(task)}
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      "h-8 px-3 rounded-full",
                      "border border-[#E5E5E5]",
                      "text-[13px] leading-[1.5] text-[#0A0A0A]",
                      "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                      "transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    )}
                  >
                    <ScrollText size={13} strokeWidth={1.75} />
                    查看日志
                  </button>

                  {/* 暂停/恢复 */}
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={() => handleToggle(task)}
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      "h-8 px-3 rounded-full",
                      "border border-[#E5E5E5]",
                      "text-[13px] leading-[1.5] text-[#0A0A0A]",
                      "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                      "transition-colors duration-150",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    )}
                  >
                    {isToggling ? (
                      <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                    ) : isRunning ? (
                      <Pause size={13} strokeWidth={1.75} />
                    ) : (
                      <Play size={13} strokeWidth={1.75} />
                    )}
                    {isRunning ? "暂停" : "恢复"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================
          确认弹窗
      ============================================================ */}
      <ConfirmDialog
        open={confirmOpen}
        taskName={confirmTask?.name ?? ""}
        loading={triggerLoading}
        onConfirm={handleTriggerConfirm}
        onCancel={handleCloseConfirm}
      />

      {/* ============================================================
          日志抽屉
      ============================================================ */}
      <LogDrawer
        open={logDrawerOpen}
        taskId={logTaskId}
        taskName={logTaskName}
        onClose={handleCloseLogs}
      />
    </AdminPageShell>
  );
}

export default ScheduledTasks;
