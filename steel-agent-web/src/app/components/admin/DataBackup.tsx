import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Database,
  FileArchive,
  Clock,
  Settings,
  Calendar,
  Loader2,
  AlertTriangle,
  HardDrive,
} from "lucide-react";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { AdminEmpty } from "./AdminEmpty";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
} from "./AdminToast";
import {
  getBackupOverview,
  getBackupRecords,
  triggerBackup,
  restoreBackup,
  downloadBackup,
  getAutoBackupSettings,
  saveAutoBackupSettings,
} from "@/app/api/admin";
import type {
  BackupOverview,
  BackupRecord,
  PaginatedResponse,
} from "@/app/types/admin";

// ============================================================
// 类型定义
// ============================================================

interface RestoreDialogState {
  open: boolean;
  record: BackupRecord | null;
  confirmText: string;
}

interface AutoBackupSettingsState {
  open: boolean;
  backupTime: string;
  retentionDays: number;
  storagePath: string;
  saving: boolean;
}

// ============================================================
// 时间格式化
// ============================================================

function formatTimestamp(ts: string): string {
  // "2026-05-17 03:00:00" -> "05-17 03:00"
  if (!ts) return "-";
  const parts = ts.split(" ");
  const datePart = parts[0] ?? "";
  const timePart = parts[1] ?? "";
  const dateSegments = datePart.split("-");
  return `${dateSegments[1] ?? ""}-${dateSegments[2] ?? ""} ${timePart.slice(0, 5)}`;
}

// ============================================================
// 自动备份时间选项
// ============================================================

const TIME_OPTIONS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

// ============================================================
// 主组件
// ============================================================

export function DataBackup() {
  // ---------- 概览 ----------
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // ---------- 记录列表 ----------
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // ---------- 手动备份 ----------
  const [manualBackingUp, setManualBackingUp] = useState(false);

  // ---------- 恢复 ----------
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialogState>({
    open: false,
    record: null,
    confirmText: "",
  });
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  // ---------- 自动备份设置 ----------
  const [settingsDialog, setSettingsDialog] = useState<AutoBackupSettingsState>({
    open: false,
    backupTime: "03:00",
    retentionDays: 30,
    storagePath: "/data/backups/",
    saving: false,
  });

  // ---------- ref ----------
  const recordsContainerRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // 数据加载
  // ============================================================

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = await getBackupOverview();
      setOverview(data);
    } catch {
      showErrorToast("加载备份概览失败");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadRecords = useCallback(async (p: number) => {
    setRecordsLoading(true);
    try {
      const res: PaginatedResponse<BackupRecord> = await getBackupRecords(p, pageSize);
      setRecords(res.items);
      setRecordsTotal(res.total);
    } catch {
      showErrorToast("加载备份记录失败");
    } finally {
      setRecordsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadOverview();
    loadRecords(1);
  }, [loadOverview, loadRecords]);

  // ============================================================
  // 手动备份
  // ============================================================

  const handleManualBackup = useCallback(async () => {
    setManualBackingUp(true);
    try {
      const newRecord = await triggerBackup();
      showSuccessToast("备份完成");
      // 刷新概览和列表
      await loadOverview();
      await loadRecords(1);
      setPage(1);

      // 自动滚动到表格顶部
      setTimeout(() => {
        recordsContainerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch {
      showErrorToast("备份失败，请重试");
    } finally {
      setManualBackingUp(false);
    }
  }, [loadOverview, loadRecords]);

  // ============================================================
  // 下载备份
  // ============================================================

  const handleDownload = useCallback(async (record: BackupRecord) => {
    try {
      const blob = await downloadBackup(record.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${record.timestamp.replace(/[: ]/g, "-")}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccessToast("下载已开始");
    } catch {
      showErrorToast("下载失败，请重试");
    }
  }, []);

  // ============================================================
  // 恢复备份
  // ============================================================

  const openRestoreDialog = useCallback((record: BackupRecord) => {
    setRestoreDialog({
      open: true,
      record,
      confirmText: "",
    });
  }, []);

  const closeRestoreDialog = useCallback(() => {
    if (restoring) return; // 进行中不可关闭
    setRestoreDialog({
      open: false,
      record: null,
      confirmText: "",
    });
  }, [restoring]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!restoreDialog.record) return;

    setRestoring(true);
    setRestoreProgress(0);

    // 模拟进度条
    const progressInterval = setInterval(() => {
      setRestoreProgress((prev) => {
        const next = prev + Math.random() * 15;
        return Math.min(next, 95);
      });
    }, 600);

    try {
      await restoreBackup(restoreDialog.record.id);
      clearInterval(progressInterval);
      setRestoreProgress(100);

      // 短暂延迟后关闭
      setTimeout(() => {
        setRestoring(false);
        setRestoreProgress(0);
        setRestoreDialog({
          open: false,
          record: null,
          confirmText: "",
        });
        showSuccessToast("数据恢复成功");
        loadOverview();
        loadRecords(1);
      }, 800);
    } catch {
      clearInterval(progressInterval);
      setRestoring(false);
      setRestoreProgress(0);
      showErrorToast("恢复失败，请重试");
    }
  }, [restoreDialog.record, loadOverview, loadRecords]);

  // ============================================================
  // 自动备份设置
  // ============================================================

  const openSettingsDialog = useCallback(async () => {
    try {
      const settings = await getAutoBackupSettings();
      setSettingsDialog({
        open: true,
        backupTime: settings.backupTime,
        retentionDays: settings.retentionDays,
        storagePath: settings.storagePath,
        saving: false,
      });
    } catch {
      showErrorToast("加载备份设置失败");
    }
  }, []);

  const closeSettingsDialog = useCallback(() => {
    setSettingsDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setSettingsDialog((prev) => ({ ...prev, saving: true }));
    try {
      await saveAutoBackupSettings({
        backupTime: settingsDialog.backupTime,
        retentionDays: settingsDialog.retentionDays,
        storagePath: settingsDialog.storagePath,
      });
      showSuccessToast("备份设置已保存");
      setSettingsDialog((prev) => ({ ...prev, open: false, saving: false }));
      loadOverview();
    } catch {
      showErrorToast("保存设置失败");
      setSettingsDialog((prev) => ({ ...prev, saving: false }));
    }
  }, [settingsDialog.backupTime, settingsDialog.retentionDays, settingsDialog.storagePath, loadOverview]);

  // ============================================================
  // 分页
  // ============================================================

  const handlePageChange = useCallback(
    (p: number) => {
      setPage(p);
      loadRecords(p);
    },
    [loadRecords],
  );

  // ============================================================
  // 表格列定义
  // ============================================================

  const columns: TableColumn<BackupRecord>[] = [
    {
      key: "timestamp",
      title: "备份时间",
      render: (_value, row) => (
        <span className="text-[13px] text-[#0A0A0A]">{formatTimestamp(row.timestamp)}</span>
      ),
    },
    {
      key: "fileSize",
      title: "文件大小",
      render: (_value, row) => (
        <span className="text-[13px] text-[#404040]">{row.fileSize}</span>
      ),
    },
    {
      key: "type",
      title: "类型",
      render: (_value, row) => (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-sm text-[12px] leading-[1.5]",
            row.type === "auto"
              ? "bg-[#FAFAFA] text-[#737373]"
              : "bg-[#FAFAFA] text-[#0A0A0A]",
          )}
        >
          {row.type === "auto" ? "自动" : "手动"}
        </span>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: "100px",
      render: (_value, row) => (
        <AdminStatusBadge
          status={row.status === "success" ? "success" : "error"}
          label={row.status === "success" ? "成功" : "失败"}
        />
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "160px",
      render: (_value, row) => {
        if (row.status === "success") {
          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(row);
                }}
                className={cn(
                  "text-[13px] leading-[1.5] text-[#0A0A0A]",
                  "hover:underline",
                  "transition-colors duration-150",
                  "outline-none focus-visible:underline",
                )}
              >
                下载
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openRestoreDialog(row);
                }}
                className={cn(
                  "text-[13px] leading-[1.5] text-[#0A0A0A]",
                  "hover:underline",
                  "transition-colors duration-150",
                  "outline-none focus-visible:underline",
                )}
              >
                恢复
              </button>
            </div>
          );
        }

        // failed
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleManualBackup();
              }}
              className={cn(
                "text-[13px] leading-[1.5] text-[#0A0A0A]",
                "hover:underline",
                "transition-colors duration-150",
                "outline-none focus-visible:underline",
              )}
            >
              重试
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                showWarningToast(`备份 ${row.id} 日志：磁盘空间不足，备份写入失败`);
              }}
              className={cn(
                "text-[13px] leading-[1.5] text-[#737373]",
                "hover:underline",
                "transition-colors duration-150",
                "outline-none focus-visible:underline",
              )}
            >
              查看日志
            </button>
          </div>
        );
      },
    },
  ];

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="数据备份"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "系统管理" },
        { label: "数据备份" },
      ]}
      actions={
        <div className="flex items-center gap-3">
          {/* 立即备份按钮 */}
          <button
            type="button"
            disabled={manualBackingUp}
            onClick={handleManualBackup}
            className={cn(
              "inline-flex items-center gap-2",
              "h-9 px-4 rounded-full",
              "bg-[#0A0A0A] text-white",
              "text-[13px] leading-[1.5] font-medium",
              "hover:bg-[#404040]",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
          >
            {manualBackingUp ? (
              <>
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />
                备份中...
              </>
            ) : (
              <>
                <HardDrive size={14} strokeWidth={1.75} />
                立即备份
              </>
            )}
          </button>

          {/* 自动备份设置按钮 */}
          <button
            type="button"
            onClick={openSettingsDialog}
            className={cn(
              "inline-flex items-center gap-2",
              "h-9 px-4 rounded-full",
              "border border-[#E5E5E5] bg-white",
              "text-[13px] leading-[1.5] text-[#0A0A0A]",
              "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
              "transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
          >
            <Settings size={14} strokeWidth={1.75} />
            自动备份设置
          </button>
        </div>
      }
    >
      {/* ============================================================
          1. 备份概览行
      ============================================================ */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-8 gap-y-3",
          "px-5 py-4 rounded-lg",
          "bg-[#FAFAFA] border border-[#E5E5E5]",
          "mb-6",
        )}
      >
        {overviewLoading ? (
          // 骨架加载
          <>
            {[110, 100, 120, 170, 130].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#E5E5E5] animate-pulse" />
                <div
                  className="h-4 rounded bg-[#E5E5E5] animate-pulse"
                  style={{ width: `${w}px` }}
                />
              </div>
            ))}
          </>
        ) : overview ? (
          <>
            {/* 数据库大小 */}
            <div className="flex items-center gap-2">
              <Database size={16} strokeWidth={1.75} className="text-[#404040] shrink-0" />
              <span className="text-[13px] leading-[1.5] text-[#404040]">
                数据库大小：{overview.dbSize}
              </span>
            </div>

            {/* 备份文件数 */}
            <div className="flex items-center gap-2">
              <FileArchive size={16} strokeWidth={1.75} className="text-[#404040] shrink-0" />
              <span className="text-[13px] leading-[1.5] text-[#404040]">
                备份文件数：{overview.fileCount}
              </span>
            </div>

            {/* 最近备份 */}
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.75} className="text-[#404040] shrink-0" />
              <span className="text-[13px] leading-[1.5] text-[#404040]">
                最近备份：{formatTimestamp(overview.lastBackup)}
              </span>
            </div>

            {/* 自动备份 */}
            <div className="flex items-center gap-2">
              <Settings size={16} strokeWidth={1.75} className="text-[#404040] shrink-0" />
              <span className="text-[13px] leading-[1.5] text-[#404040]">
                自动备份：
                {overview.autoBackupEnabled ? (
                  <span className="text-[#1F7A4D]">
                    已启用（每日 {overview.autoBackupTime}）
                  </span>
                ) : (
                  <span className="text-[#B42318]">未启用</span>
                )}
              </span>
            </div>

            {/* 保留策略 */}
            <div className="flex items-center gap-2">
              <Calendar size={16} strokeWidth={1.75} className="text-[#404040] shrink-0" />
              <span className="text-[13px] leading-[1.5] text-[#404040]">
                保留策略：最近{overview.retentionDays}天
              </span>
            </div>
          </>
        ) : (
          <span className="text-[13px] text-[#737373]">加载失败</span>
        )}
      </div>

      {/* ============================================================
          2. 备份记录表格
      ============================================================ */}
      <div ref={recordsContainerRef}>
        <h2 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A] mb-3">
          备份列表
        </h2>

        <AdminTable<BackupRecord>
          columns={columns}
          data={records}
          loading={recordsLoading}
          page={page}
          pageSize={pageSize}
          total={recordsTotal}
          onPageChange={handlePageChange}
          empty={
            <AdminEmpty
              icon={<Database size={22} strokeWidth={1.75} className="text-[#A3A3A3]" />}
              title="暂无备份记录"
              description="点击「立即备份」创建第一个备份"
              action={{
                label: "立即备份",
                onClick: handleManualBackup,
              }}
            />
          }
        />
      </div>

      {/* ============================================================
          3. 恢复确认对话框
      ============================================================ */}
      {restoreDialog.open && restoreDialog.record && (
        <div
          className={cn(
            "fixed inset-0 z-50",
            "flex items-center justify-center",
            "bg-black/50",
          )}
          onClick={closeRestoreDialog}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "bg-white border border-[#E5E5E5] rounded-lg",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
              "p-6 w-full max-w-[440px] mx-4",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="数据恢复确认"
          >
            {/* 标题 */}
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle
                size={20}
                strokeWidth={1.75}
                className="text-[#B45309] shrink-0"
              />
              <h3 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                数据恢复确认
              </h3>
            </div>

            {/* 备份信息 */}
            <div className="space-y-2 mb-4 p-3 rounded-md bg-[#FAFAFA] border border-[#E5E5E5]">
              <p className="text-[13px] leading-[1.5] text-[#404040]">
                您即将恢复以下备份：
              </p>
              <div className="grid grid-cols-2 gap-2 text-[13px] leading-[1.5]">
                <span className="text-[#737373]">备份时间：</span>
                <span className="text-[#0A0A0A]">
                  {restoreDialog.record.timestamp}
                </span>
                <span className="text-[#737373]">文件大小：</span>
                <span className="text-[#0A0A0A]">
                  {restoreDialog.record.fileSize}
                </span>
              </div>
            </div>

            {/* 警告 */}
            <div
              className={cn(
                "p-3 rounded-md mb-5",
                "bg-[#FEF2F2] border border-[#FECACA]",
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  strokeWidth={1.75}
                  className="text-[#B42318] shrink-0 mt-0.5"
                />
                <div className="text-[13px] leading-[1.6] text-[#B42318]">
                  <p className="font-medium mb-1">警告：</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>恢复操作将覆盖当前数据库所有数据</li>
                    <li>恢复过程中服务将暂时不可用</li>
                    <li>此操作不可撤销</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 确认输入 */}
            <div className="mb-5">
              <label
                htmlFor="restore-confirm-input"
                className={cn(
                  "block text-[13px] leading-[1.5] text-[#404040] mb-2",
                )}
              >
                请输入 &ldquo;CONFIRM&rdquo; 确认恢复：
              </label>
              <input
                id="restore-confirm-input"
                type="text"
                value={restoreDialog.confirmText}
                onChange={(e) =>
                  setRestoreDialog((prev) => ({
                    ...prev,
                    confirmText: e.target.value,
                  }))
                }
                placeholder="CONFIRM"
                disabled={restoring}
                className={cn(
                  "w-full h-10 px-3 rounded-md",
                  "border border-[#E5E5E5]",
                  "bg-white text-[15px] leading-[1.6] text-[#0A0A0A]",
                  "placeholder:text-[#A3A3A3]",
                  "focus:outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                  "transition-colors duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* 按钮 */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={restoring}
                onClick={closeRestoreDialog}
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
                disabled={
                  restoring ||
                  restoreDialog.confirmText !== "CONFIRM"
                }
                onClick={handleRestoreConfirm}
                className={cn(
                  "h-9 px-4 rounded-full",
                  "text-[13px] leading-[1.5] font-medium",
                  "transition-colors duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  "bg-[#B42318]/10 text-[#B42318]",
                  "hover:bg-[#B42318]/15",
                  "border border-[#B42318]/30",
                  "focus-visible:ring-[#B42318]/10",
                )}
              >
                {restoring ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                    恢复中...
                  </span>
                ) : (
                  "确认恢复"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          4. 全屏恢复进度遮罩
      ============================================================ */}
      {restoring && (
        <div
          className={cn(
            "fixed inset-0 z-[60]",
            "flex items-center justify-center",
            "bg-black/50",
          )}
        >
          <div
            className={cn(
              "bg-white border border-[#E5E5E5] rounded-lg",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
              "p-8 w-full max-w-[400px] mx-4",
              "flex flex-col items-center gap-5",
            )}
          >
            {/* 标题 */}
            <div className="flex items-center gap-2">
              <Loader2
                size={20}
                strokeWidth={1.75}
                className="animate-spin text-[#0A0A0A]"
              />
              <span className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                正在恢复数据...
              </span>
            </div>

            {/* 进度条 */}
            <div className="w-full space-y-2">
              <div className="w-full h-2 rounded-full bg-[#E5E5E5] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    "bg-[#0A0A0A]",
                    "transition-all duration-300 ease-out",
                  )}
                  style={{ width: `${restoreProgress}%` }}
                />
              </div>
              <p className="text-[12px] leading-[1.5] text-[#737373] text-center">
                {Math.round(restoreProgress)}%
              </p>
            </div>

            {/* 提示 */}
            <p className="text-[12px] leading-[1.5] text-[#737373] text-center">
              请勿关闭页面或进行其他操作
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
          5. 自动备份设置对话框
      ============================================================ */}
      {settingsDialog.open && (
        <div
          className={cn(
            "fixed inset-0 z-50",
            "flex items-center justify-center",
            "bg-black/50",
          )}
          onClick={closeSettingsDialog}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "bg-white border border-[#E5E5E5] rounded-lg",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
              "p-6 w-full max-w-[440px] mx-4",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="自动备份设置"
          >
            {/* 标题 */}
            <div className="flex items-center gap-2 mb-5">
              <Settings
                size={18}
                strokeWidth={1.75}
                className="text-[#0A0A0A] shrink-0"
              />
              <h3 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                自动备份设置
              </h3>
            </div>

            {/* 表单 */}
            <div className="space-y-4 mb-5">
              {/* 备份时间 */}
              <div>
                <label
                  htmlFor="backup-time-select"
                  className={cn(
                    "block text-[13px] leading-[1.5] text-[#404040] mb-1.5",
                  )}
                >
                  备份时间
                </label>
                <select
                  id="backup-time-select"
                  value={settingsDialog.backupTime}
                  onChange={(e) =>
                    setSettingsDialog((prev) => ({
                      ...prev,
                      backupTime: e.target.value,
                    }))
                  }
                  className={cn(
                    "w-full h-10 px-3 rounded-md",
                    "border border-[#E5E5E5]",
                    "bg-white text-[15px] leading-[1.6] text-[#0A0A0A]",
                    "focus:outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "transition-colors duration-200",
                    "appearance-none",
                  )}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* 保留天数 */}
              <div>
                <label
                  htmlFor="retention-days-input"
                  className={cn(
                    "block text-[13px] leading-[1.5] text-[#404040] mb-1.5",
                  )}
                >
                  保留天数
                </label>
                <input
                  id="retention-days-input"
                  type="number"
                  min={7}
                  max={365}
                  value={settingsDialog.retentionDays}
                  onChange={(e) =>
                    setSettingsDialog((prev) => ({
                      ...prev,
                      retentionDays: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className={cn(
                    "w-full h-10 px-3 rounded-md",
                    "border border-[#E5E5E5]",
                    "bg-white text-[15px] leading-[1.6] text-[#0A0A0A]",
                    "focus:outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "transition-colors duration-200",
                  )}
                />
              </div>

              {/* 存储路径 */}
              <div>
                <label
                  htmlFor="storage-path-input"
                  className={cn(
                    "block text-[13px] leading-[1.5] text-[#404040] mb-1.5",
                  )}
                >
                  存储路径
                </label>
                <input
                  id="storage-path-input"
                  type="text"
                  value={settingsDialog.storagePath}
                  onChange={(e) =>
                    setSettingsDialog((prev) => ({
                      ...prev,
                      storagePath: e.target.value,
                    }))
                  }
                  className={cn(
                    "w-full h-10 px-3 rounded-md",
                    "border border-[#E5E5E5]",
                    "bg-white text-[15px] leading-[1.6] text-[#0A0A0A]",
                    "focus:outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "transition-colors duration-200",
                  )}
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={settingsDialog.saving}
                onClick={closeSettingsDialog}
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
                disabled={settingsDialog.saving}
                onClick={handleSaveSettings}
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
                {settingsDialog.saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={13} strokeWidth={1.75} className="animate-spin" />
                    保存中...
                  </span>
                ) : (
                  "保存设置"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

export default DataBackup;
