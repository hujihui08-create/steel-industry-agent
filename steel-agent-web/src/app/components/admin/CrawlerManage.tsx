import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Globe,
  Play,
  RefreshCw,
  FileText,
  Pause,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPageShell } from "./AdminPageShell";
import { AdminModal } from "./AdminModal";
import { AdminDrawer } from "./AdminDrawer";
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
  getCrawlerSources,
  createCrawlerSource,
  updateCrawlerSource,
  deleteCrawlerSource,
  getCrawlerLogs,
  triggerCrawl,
  getCrawlStatus,
} from "@/app/api/admin";
import type {
  CrawlerSource,
  CrawlerLog,
  CrawlStatus,
  CrawlerSourceFormData,
} from "@/app/types/admin";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  price: "价格",
  news: "资讯",
  tender: "招标",
};

const LOG_STATUS_LABELS: Record<string, string> = {
  running: "运行中",
  success: "成功",
  failed: "失败",
};

function formatInterval(seconds: number): string {
  if (seconds < 60) return `每 ${seconds} 秒`;
  if (seconds < 3600) return `每 ${Math.round(seconds / 60)} 分钟`;
  return `每 ${Math.round(seconds / 3600)} 小时`;
}

function formatTime(value: string | null): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + "...";
}

const EMPTY_FORM: CrawlerSourceFormData = {
  source_name: "",
  source_type: "price",
  source_url: "",
  crawl_rule: "",
  crawl_interval: 1800,
  is_active: true,
};

type FilterTab = "all" | "active" | "inactive";

export default function CrawlerManage() {
  const [sources, setSources] = useState<CrawlerSource[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, CrawlStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<CrawlerSource | null>(null);
  const [form, setForm] = useState<CrawlerSourceFormData>({ ...EMPTY_FORM });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<CrawlerSource | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [logSourceName, setLogSourceName] = useState("");
  const [logs, setLogs] = useState<CrawlerLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srcs, status] = await Promise.allSettled([
        getCrawlerSources(),
        getCrawlStatus(),
      ]);

      if (srcs.status === "fulfilled") {
        setSources(srcs.value);
      } else {
        setError(srcs.reason?.message || "加载数据源失败");
      }

      if (status.status === "fulfilled") {
        setStatusMap(status.value);
      }
    } catch (err: any) {
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const status = useCallback(
    (source: CrawlerSource) => {
      const s = statusMap[source.id];
      if (!source.is_active) return "inactive" as const;
      if (s?.is_running) return "running" as const;
      return "idle" as const;
    },
    [statusMap],
  );

  const openAddForm = () => {
    setEditingSource(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEditForm = (source: CrawlerSource) => {
    setEditingSource(source);
    setForm({
      source_name: source.source_name,
      source_type: source.source_type,
      source_url: source.source_url,
      crawl_rule: source.crawl_rule || "",
      crawl_interval: source.crawl_interval || 1800,
      is_active: source.is_active,
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!form.source_name.trim() || !form.source_type || !form.source_url.trim()) {
      showErrorToast("请填写名称、类型和URL");
      return;
    }
    setFormSubmitting(true);
    try {
      if (editingSource) {
        await updateCrawlerSource(editingSource.id, form);
        showSuccessToast("修改成功");
      } else {
        await createCrawlerSource(form);
        showSuccessToast("添加成功");
      }
      setFormOpen(false);
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "操作失败");
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDeleteConfirm = (source: CrawlerSource) => {
    setDeletingSource(source);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingSource) return;
    setDeleteLoading(true);
    try {
      await deleteCrawlerSource(deletingSource.id);
      showSuccessToast("已删除");
      setDeleteModalOpen(false);
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "删除失败");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (source: CrawlerSource) => {
    try {
      await updateCrawlerSource(source.id, { is_active: !source.is_active });
      showSuccessToast(source.is_active ? "已暂停" : "已启用");
      loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "操作失败");
    }
  };

  const handleTriggerCrawl = async (source: CrawlerSource) => {
    setTriggeringId(source.id);
    try {
      await triggerCrawl(source.id);
      showSuccessToast("采集任务已启动");
      await loadData();
    } catch (err: any) {
      showErrorToast(err?.message || "触发失败");
    } finally {
      setTriggeringId(null);
    }
  };

  const openLogDrawer = async (source: CrawlerSource) => {
    setLogSourceName(source.source_name);
    setLogDrawerOpen(true);
    setLogsLoading(true);
    setLogsError(null);
    setExpandedLogId(null);
    try {
      const result = await getCrawlerLogs(source.id, 50);
      setLogs(result);
    } catch (err: any) {
      setLogsError(err?.message || "加载日志失败");
    } finally {
      setLogsLoading(false);
    }
  };

  const filteredSources = sources.filter((s) => {
    if (filterTab === "active") return s.is_active;
    if (filterTab === "inactive") return !s.is_active;
    return true;
  });

  const isRunning = (source: CrawlerSource) =>
    statusMap[source.id]?.is_running === true;

  if (loading) {
    return (
      <AdminPageShell
        title="数据爬虫管理"
        breadcrumbs={[{ label: "首页" }, { label: "数据管理" }, { label: "爬虫管理" }]}
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AdminLoading type="card" />
          <AdminLoading type="card" />
          <AdminLoading type="card" />
        </div>
      </AdminPageShell>
    );
  }

  if (error && sources.length === 0) {
    return (
      <AdminPageShell
        title="数据爬虫管理"
        breadcrumbs={[{ label: "首页" }, { label: "数据管理" }, { label: "爬虫管理" }]}
      >
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-[#737373] text-[13px]">{error}</p>
          <button
            onClick={loadData}
            className={cn(
              "flex items-center gap-2 px-4 h-9 rounded-full",
              "border border-[#E5E5E5] text-[#0A0A0A] text-[13px]",
              "hover:bg-[#FAFAFA] transition-colors duration-150",
            )}
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            重试
          </button>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="数据爬虫管理"
      breadcrumbs={[{ label: "首页" }, { label: "数据管理" }, { label: "爬虫管理" }]}
    >
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={openAddForm}
            className={cn(
              "flex items-center gap-2 px-4 h-9 rounded-full",
              "bg-[#0A0A0A] text-white text-[13px] leading-[1.5] font-medium",
              "hover:bg-[#404040] transition-colors duration-150",
            )}
          >
            <Plus size={14} strokeWidth={1.75} />
            添加数据源
          </button>
          <button
            onClick={loadData}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full",
              "border border-[#E5E5E5] text-[#737373]",
              "hover:text-[#0A0A0A] hover:bg-[#FAFAFA] transition-colors duration-150",
            )}
            aria-label="刷新"
          >
            <RefreshCw size={14} strokeWidth={1.75} />
          </button>
        </div>
        {/* 状态筛选 */}
        <div className="flex items-center gap-1 bg-[#FAFAFA] rounded-full p-0.5 border border-[#E5E5E5]">
          {(["all", "active", "inactive"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                "px-3 h-7 rounded-full text-[12px] leading-[1.5] transition-colors duration-150",
                filterTab === tab
                  ? "bg-[#0A0A0A] text-white"
                  : "text-[#737373] hover:text-[#0A0A0A]",
              )}
            >
              {tab === "all" ? "全部" : tab === "active" ? "运行中" : "已停用"}
            </button>
          ))}
        </div>
      </div>

      {filteredSources.length === 0 ? (
        <AdminEmpty
          title="暂无数据源"
          description="点击添加数据源开始配置"
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredSources.map((source) => {
            const st = status(source);
            const running = isRunning(source);
            return (
              <div
                key={source.id}
                className={cn(
                  "bg-white border border-[#E5E5E5] rounded-lg p-5",
                  "flex flex-col gap-3",
                  !source.is_active && "opacity-60",
                )}
              >
                {/* 标题行 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe size={16} strokeWidth={1.75} className="text-[#737373] shrink-0" />
                    <h3 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A] truncate">
                      {source.source_name}
                    </h3>
                    <span className="text-[11px] leading-[1.5] text-[#A3A3A3] bg-[#FAFAFA] px-2 py-0.5 rounded-full shrink-0">
                      {SOURCE_TYPE_LABELS[source.source_type] || source.source_type}
                    </span>
                  </div>
                  {/* 状态 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "inline-block w-2 h-2 rounded-full",
                        st === "idle" && "bg-[#1F7A4D]",
                        st === "running" && "bg-[#0A0A0A] animate-pulse",
                        st === "inactive" && "bg-[#B42318]",
                      )}
                    />
                    <span className="text-[12px] leading-[1.5] text-[#737373]">
                      {st === "idle" ? "空闲" : st === "running" ? "采集中" : "已停用"}
                    </span>
                  </div>
                </div>

                {/* URL */}
                <div className="text-[12px] leading-[1.5] text-[#737373] truncate" title={source.source_url}>
                  URL: {truncateUrl(source.source_url, 60)}
                </div>

                {/* 信息行 */}
                <div className="flex items-center gap-4 text-[12px] leading-[1.5] text-[#737373]">
                  <span>采集频率：{formatInterval(source.crawl_interval)}</span>
                  <span>最近采集：{formatTime(source.last_crawl_at)}</span>
                  <span>最近成功：{formatTime(source.last_success_at)}</span>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#E5E5E5]">
                  <button
                    onClick={() => openEditForm(source)}
                    className={cn(
                      "flex items-center gap-1 px-3 h-7 rounded-full text-[12px]",
                      "border border-[#E5E5E5] text-[#404040]",
                      "hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors duration-150",
                    )}
                  >
                    <Pencil size={12} strokeWidth={1.75} />
                    编辑
                  </button>
                  <button
                    onClick={() => handleToggleActive(source)}
                    className={cn(
                      "flex items-center gap-1 px-3 h-7 rounded-full text-[12px]",
                      "border border-[#E5E5E5] text-[#404040]",
                      "hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors duration-150",
                    )}
                  >
                    {source.is_active ? (
                      <>
                        <Pause size={12} strokeWidth={1.75} />
                        暂停
                      </>
                    ) : (
                      <>
                        <Play size={12} strokeWidth={1.75} />
                        启用
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openLogDrawer(source)}
                    className={cn(
                      "flex items-center gap-1 px-3 h-7 rounded-full text-[12px]",
                      "border border-[#E5E5E5] text-[#404040]",
                      "hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors duration-150",
                    )}
                  >
                    <FileText size={12} strokeWidth={1.75} />
                    日志
                  </button>
                  <button
                    onClick={() => handleTriggerCrawl(source)}
                    disabled={running || triggeringId === source.id || !source.is_active}
                    className={cn(
                      "flex items-center gap-1 px-3 h-7 rounded-full text-[12px]",
                      running || !source.is_active
                        ? "border border-[#E5E5E5] text-[#A3A3A3] cursor-not-allowed"
                        : "border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#FAFAFA]",
                      "transition-colors duration-150",
                    )}
                  >
                    {triggeringId === source.id ? (
                      <Loader2 size={12} strokeWidth={1.75} className="animate-spin" />
                    ) : (
                      <Play size={12} strokeWidth={1.75} />
                    )}
                    {running ? "采集中…" : "立即采集"}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => openDeleteConfirm(source)}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full",
                      "text-[#A3A3A3] hover:text-[#B42318] hover:bg-[#FEF2F2] transition-colors duration-150",
                    )}
                    aria-label="删除"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加/编辑数据源 Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            "p-6 max-w-[480px]",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
              {editingSource ? "编辑数据源" : "添加数据源"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] text-[#404040]">
                数据源名称 <span className="text-[#B42318]">*</span>
              </Label>
              <Input
                value={form.source_name}
                onChange={(e) => setForm({ ...form, source_name: e.target.value })}
                placeholder="例如：我的钢铁网"
                className="rounded-md border-[#E5E5E5] h-9 text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] text-[#404040]">
                类型 <span className="text-[#B42318]">*</span>
              </Label>
              <Select
                value={form.source_type}
                onValueChange={(v) => setForm({ ...form, source_type: v })}
              >
                <SelectTrigger className="rounded-md border-[#E5E5E5] h-9 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">价格 (price)</SelectItem>
                  <SelectItem value="news">资讯 (news)</SelectItem>
                  <SelectItem value="tender">招标 (tender)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] text-[#404040]">
                URL <span className="text-[#B42318]">*</span>
              </Label>
              <Input
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://..."
                className="rounded-md border-[#E5E5E5] h-9 text-[13px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] text-[#404040]">
                采集规则 (JSON)
              </Label>
              <Input
                value={form.crawl_rule}
                onChange={(e) => setForm({ ...form, crawl_rule: e.target.value })}
                placeholder='{"container":"table","fields":{"price":"td"}}'
                className="rounded-md border-[#E5E5E5] h-9 text-[13px] font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] text-[#404040]">
                采集间隔 (秒)
              </Label>
              <Input
                type="number"
                value={form.crawl_interval}
                onChange={(e) =>
                  setForm({ ...form, crawl_interval: parseInt(e.target.value) || 1800 })
                }
                min={60}
                className="rounded-md border-[#E5E5E5] h-9 text-[13px]"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setFormOpen(false)}
                disabled={formSubmitting}
                className={cn(
                  "h-9 px-4 rounded-full border border-[#E5E5E5]",
                  "text-[#0A0A0A] text-[13px] bg-white",
                  "hover:bg-[#FAFAFA] transition-colors duration-150",
                )}
              >
                取消
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={formSubmitting}
                className={cn(
                  "h-9 px-4 rounded-full bg-[#0A0A0A] text-white text-[13px] font-medium",
                  "hover:bg-[#404040] transition-colors duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {formSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={12} strokeWidth={1.75} className="animate-spin" />
                    保存中...
                  </span>
                ) : (
                  "保存"
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AdminModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="删除数据源"
        description="确定删除该数据源？删除后将停止自动采集"
        confirmLabel="确定删除"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />

      {/* 采集日志 Drawer */}
      <AdminDrawer
        open={logDrawerOpen}
        onOpenChange={setLogDrawerOpen}
        title={`采集日志 - ${logSourceName}`}
      >
        {logsLoading ? (
          <AdminLoading type="card" />
        ) : logsError ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-[#737373] text-[13px]">{logsError}</p>
            <button
              onClick={() => {
                const src = sources.find((s) => s.source_name === logSourceName);
                if (src) openLogDrawer(src);
              }}
              className={cn(
                "px-3 h-8 rounded-full border border-[#E5E5E5]",
                "text-[#404040] text-[12px] hover:bg-[#FAFAFA]",
              )}
            >
              重试
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#A3A3A3] text-[13px]">暂无采集记录</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className={cn(
                    "border border-[#E5E5E5] rounded-md overflow-hidden",
                  )}
                >
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3",
                      "hover:bg-[#FAFAFA] transition-colors duration-150 text-left",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-block w-2 h-2 rounded-full shrink-0",
                          log.status === "success" && "bg-[#1F7A4D]",
                          log.status === "failed" && "bg-[#B42318]",
                          log.status === "running" && "bg-[#B45309]",
                        )}
                      />
                      <span className="text-[13px] leading-[1.5] text-[#404040]">
                        {formatTime(log.started_at)}
                      </span>
                      <AdminStatusBadge
                        status={
                          log.status === "success"
                            ? "success"
                            : log.status === "failed"
                              ? "error"
                              : "in-progress"
                        }
                        label={LOG_STATUS_LABELS[log.status] || log.status}
                      />
                      <span className="text-[12px] text-[#737373]">
                        采集 {log.items_crawled} 条
                      </span>
                      {log.error_message && (
                        <span className="text-[12px] text-[#B42318] truncate max-w-[200px]">
                          {log.error_message}
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} strokeWidth={1.75} className="text-[#A3A3A3] shrink-0" />
                    ) : (
                      <ChevronDown size={14} strokeWidth={1.75} className="text-[#A3A3A3] shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-[#E5E5E5] pt-3 space-y-1.5 text-[12px] leading-[1.6]">
                      <div className="flex gap-2">
                        <span className="text-[#A3A3A3] w-16 shrink-0">开始时间</span>
                        <span className="text-[#404040]">{formatTime(log.started_at)}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[#A3A3A3] w-16 shrink-0">结束时间</span>
                        <span className="text-[#404040]">{formatTime(log.finished_at)}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[#A3A3A3] w-16 shrink-0">采集条数</span>
                        <span className="text-[#404040]">{log.items_crawled} 条</span>
                      </div>
                      {log.error_message && (
                        <div className="flex gap-2">
                          <span className="text-[#A3A3A3] w-16 shrink-0">错误信息</span>
                          <span className="text-[#B42318]">{log.error_message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </AdminDrawer>
    </AdminPageShell>
  );
}
