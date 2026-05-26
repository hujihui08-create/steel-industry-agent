import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Download,
  Plus,
  Eye,
  Wrench,
  CheckCircle2,
  User,
  Bot,
  AlertTriangle,
  TestTube,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  BadCase,
  BadCaseStatus,
  BadCaseStats,
  BadCaseVerifyResult,
  PaginatedResponse,
} from "@/app/types/admin";
import type { AdminStatusBadgeStatus } from "./AdminStatusBadge";
import {
  getBadCases,
  getBadCaseDetail,
  updateBadCase,
  exportBadCases,
  getBadCaseStats as fetchBadCaseStats,
  verifyBadCase,
  importBadCases,
  createBadCase,
} from "@/app/api/admin";
import { AdminPageShell } from "./AdminPageShell";
import { AdminTable, type TableColumn } from "./AdminTable";
import { AdminDrawer } from "./AdminDrawer";
import { AdminStatusBadge } from "./AdminStatusBadge";
import { AdminEmpty } from "./AdminEmpty";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ============================================================
// 常量
// ============================================================

/** 错误类型中文映射 */
const ERROR_TYPE_MAP: Record<string, string> = {
  price_inaccurate: "价格不准确",
  missing_data: "数据缺失",
  calculation_error: "计算错误",
  refuse_answer: "拒绝回答",
  data_anomaly: "数据异常",
};

const ERROR_TYPE_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "price_inaccurate", label: "价格不准确" },
  { value: "missing_data", label: "数据缺失" },
  { value: "calculation_error", label: "计算错误" },
  { value: "refuse_answer", label: "拒绝回答" },
  { value: "data_anomaly", label: "数据异常" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待处理" },
  { value: "fixing", label: "修复中" },
  { value: "fixed", label: "已修复" },
  { value: "verified", label: "已验证" },
];

/** 统计卡片配置 */
interface StatCardConfig {
  key: BadCaseStatus | "all";
  label: string;
  lightBg: string;
  lightText: string;
  borderColor: string;
  selectedBg: string;
  selectedText: string;
}

const STAT_CARD_CONFIGS: StatCardConfig[] = [
  {
    key: "pending",
    label: "待处理",
    lightBg: "bg-[#FFFBEB]",
    lightText: "text-[#B45309]",
    borderColor: "border-[#B45309]",
    selectedBg: "bg-[#B45309]",
    selectedText: "text-white",
  },
  {
    key: "fixing",
    label: "修复中",
    lightBg: "bg-[#FAFAFA]",
    lightText: "text-[#404040]",
    borderColor: "border-[#0A0A0A]",
    selectedBg: "bg-[#0A0A0A]",
    selectedText: "text-white",
  },
  {
    key: "fixed",
    label: "已修复",
    lightBg: "bg-[#ECFDF5]",
    lightText: "text-[#1F7A4D]",
    borderColor: "border-[#1F7A4D]",
    selectedBg: "bg-[#1F7A4D]",
    selectedText: "text-white",
  },
  {
    key: "verified",
    label: "已验证",
    lightBg: "bg-[#ECFDF5]",
    lightText: "text-[#1F7A4D]",
    borderColor: "border-[#1F7A4D]",
    selectedBg: "bg-[#1F7A4D]",
    selectedText: "text-white",
  },
];

// ============================================================
// 工具函数
// ============================================================

/** 将 BadCase 状态映射为 AdminStatusBadge 可用的状态 */
function badgeStatus(
  status: BadCaseStatus,
): { status: AdminStatusBadgeStatus; label: string } {
  const map: Record<
    BadCaseStatus,
    { status: AdminStatusBadgeStatus; label: string }
  > = {
    pending: { status: "pending", label: "待处理" },
    fixing: { status: "fixing", label: "修复中" },
    fixed: { status: "completed", label: "已修复" },
    verified: { status: "verified", label: "已验证" },
  };
  return map[status];
}

/** 获取错误类型中文 */
function errorTypeLabel(type: string): string {
  return ERROR_TYPE_MAP[type] ?? type;
}

/** 格式化日期范围输入值为 YYYY-MM-DD */
function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ============================================================
// 组件
// ============================================================

export default function BadCaseManagement() {
  // ---------- 数据状态 ----------
  const [data, setData] = useState<BadCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BadCaseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ---------- 筛选 / 分页 ----------
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterErrorType, setFilterErrorType] = useState<string>("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  // ---------- 抽屉 ----------
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BadCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingFixSolution, setEditingFixSolution] = useState("");
  const [editingVerification, setEditingVerification] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const fixSolutionRef = useRef<HTMLTextAreaElement>(null);
  const savedScrollRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- 验证流程 ----------
  const [verifyResult, setVerifyResult] = useState<BadCaseVerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  // ---------- 添加 Bad Case 弹窗 ----------
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    user_query: "",
    ai_response: "",
    correct_response: "",
    error_type: "price_inaccurate",
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addingSubmitting, setAddingSubmitting] = useState(false);

  // ---------- 数据加载 ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, unknown> = {
        page,
        pageSize,
      };
      if (filterStatus !== "all") filter.status = filterStatus;
      if (filterErrorType !== "all") filter.error_type = filterErrorType;
      if (searchKeyword.trim()) filter.keyword = searchKeyword.trim();
      // 日期筛选暂由前端处理（Mock API 不支持）
      if (filterDateStart) (filter as any).dateStart = filterDateStart;
      if (filterDateEnd) (filter as any).dateEnd = filterDateEnd;

      const res: PaginatedResponse<BadCase> = await getBadCases(filter as any);
      setData(res.items);
      setTotal(res.total);
    } catch {
      showErrorToast("加载 Bad Case 列表失败");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatus, filterErrorType, searchKeyword, filterDateStart, filterDateEnd]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await fetchBadCaseStats();
      setStats(s);
    } catch {
      // 统计加载失败不阻塞主流程
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ---------- 抽屉详情加载 ----------
  const openDrawer = useCallback(
    async (id: string, focusFixSolution = false) => {
      savedScrollRef.current = window.scrollY;
      setSelectedId(id);
      setDrawerOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const d = await getBadCaseDetail(id);
        setDetail(d);
        setEditingFixSolution(d.fix_solution ?? "");
        setEditingVerification("");

        if (focusFixSolution) {
          setTimeout(() => {
            fixSolutionRef.current?.focus();
          }, 300);
        }
      } catch {
        showErrorToast("加载 Bad Case 详情失败");
        setDrawerOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setVerifyResult(null);
    setVerifying(false);
    // 恢复滚动位置
    requestAnimationFrame(() => {
      window.scrollTo(0, savedScrollRef.current);
    });
  }, []);

  // ---------- 操作 ----------
  /** 标记已修复 */
  const handleMarkFixed = useCallback(async () => {
    if (!selectedId || !detail) return;
    if (!editingFixSolution.trim()) {
      showErrorToast("请先填写修复方案");
      fixSolutionRef.current?.focus();
      return;
    }
    setSavingStatus(true);
    try {
      if (detail.status === "pending") {
        await updateBadCase(selectedId, { status: "fixing", fix_solution: editingFixSolution.trim() });
      }
      await updateBadCase(selectedId, { status: "fixed", fix_solution: editingFixSolution.trim() });
      showSuccessToast("已标记为已修复");
      closeDrawer();
      loadData();
      loadStats();
    } catch {
      showErrorToast("操作失败，请重试");
    } finally {
      setSavingStatus(false);
    }
  }, [selectedId, detail, editingFixSolution, closeDrawer, loadData, loadStats]);

  /** 验证 Bad Case（Step 1: 调用 verifyBadCase API，获取对比结果） */
  const handleVerify = useCallback(async () => {
    if (!selectedId) return;
    setVerifying(true);
    try {
      const result = await verifyBadCase(selectedId);
      setVerifyResult(result);
    } catch {
      showErrorToast("验证失败，请重试");
    } finally {
      setVerifying(false);
    }
  }, [selectedId]);

  /** 确认验证（Step 2: 确认验证通过，更新状态） */
  const handleConfirmVerify = useCallback(async () => {
    if (!selectedId) return;
    setSavingStatus(true);
    try {
      await updateBadCase(selectedId, { status: "verified" });
      showSuccessToast("已验证通过");
      closeDrawer();
      loadData();
      loadStats();
    } catch {
      showErrorToast("操作失败，请重试");
    } finally {
      setSavingStatus(false);
    }
  }, [selectedId, closeDrawer, loadData, loadStats]);

  /** 仍需修复（重置验证结果，回到修复状态） */
  const handleRetryFix = useCallback(() => {
    setVerifyResult(null);
  }, []);

  /** 导出 CSV */
  const handleExport = useCallback(async () => {
    try {
      const filter: Record<string, unknown> = {};
      if (filterStatus !== "all") filter.status = filterStatus;
      if (filterErrorType !== "all") filter.error_type = filterErrorType;
      if (searchKeyword.trim()) filter.keyword = searchKeyword.trim();

      const blob = await exportBadCases(filter);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bad-cases-${formatDateInput(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccessToast("导出成功");
    } catch {
      showErrorToast("导出失败，请重试");
    }
  }, [filterStatus, filterErrorType, searchKeyword]);

  /** 批量导入 */
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importBadCases(file);
      showSuccessToast(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`);
      loadData();
      loadStats();
    } catch {
      showErrorToast("导入失败，请检查文件格式");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** 添加 Bad Case 提交 */
  const handleAddSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!addForm.user_query.trim()) errors.user_query = "请输入用户问题";
    if (!addForm.ai_response.trim()) errors.ai_response = "请输入AI错误回复";
    if (!addForm.error_type) errors.error_type = "请选择问题类型";

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddingSubmitting(true);
    try {
      await createBadCase({
        user_query: addForm.user_query.trim(),
        ai_response: addForm.ai_response.trim(),
        correct_response: addForm.correct_response.trim() || undefined,
        error_type: addForm.error_type,
      });
      showSuccessToast("添加成功");
      setAddModalOpen(false);
      setAddForm({
        user_query: "",
        ai_response: "",
        correct_response: "",
        error_type: "price_inaccurate",
      });
      setAddErrors({});
      loadData();
      loadStats();
    } catch {
      showErrorToast("添加失败，请重试");
    } finally {
      setAddingSubmitting(false);
    }
  };

  /** 处理统计卡片点击 -- 切换筛选 */
  const handleStatClick = useCallback(
    (status: string) => {
      // 如果已经选中此状态则取消筛选
      if (filterStatus === status) {
        setFilterStatus("all");
      } else {
        setFilterStatus(status);
      }
      setPage(1);
    },
    [filterStatus],
  );

  /** 搜索 */
  const handleSearch = useCallback(() => {
    setPage(1);
  }, []);

  /** 排序 */
  const handleSort = useCallback(
    (key: string, order: "asc" | "desc") => {
      if (key === "") {
        setSortBy("");
        setSortOrder("asc");
      } else {
        setSortBy(key);
        setSortOrder(order);
      }
    },
    [],
  );

  // ---------- 表格列定义 ----------
  const columns: TableColumn<BadCase>[] = [
    {
      key: "id",
      title: "编号",
      width: "140px",
    },
    {
      key: "userQuestion",
      title: "用户问题",
      render: (_: unknown, row: BadCase) => {
        const q = String(row.user_query ?? "");
        return (
          <span
            className="block max-w-[280px] truncate"
            title={q}
          >
            {q}
          </span>
        );
      },
    },
    {
      key: "errorType",
      title: "问题类型",
      width: "120px",
      render: (_: unknown, row: BadCase) => {
        const t = String(row.error_type ?? "");
        return (
          <span className="text-[13px] leading-[1.5] text-[#404040]">
            {errorTypeLabel(t)}
          </span>
        );
      },
    },
    {
      key: "status",
      title: "状态",
      width: "100px",
      render: (_: unknown, row: BadCase) => {
        const s = row.status ?? "pending";
        const bs = badgeStatus(s);
        return (
          <AdminStatusBadge
            status={bs.status}
            label={bs.label}
          />
        );
      },
    },
    {
      key: "actions",
      title: "操作",
      width: "160px",
      render: (_: unknown, row: BadCase) => {
        const id = String(row.id ?? "");
        const status = row.status ?? "pending";

        return (
          <div className="flex items-center gap-1.5">
            {/* 查看 - 所有状态都显示 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDrawer(id, false);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-1",
                "h-7 px-2.5 rounded-full",
                "border border-[#E5E5E5]",
                "text-[12px] leading-[1.5] text-[#404040]",
                "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                "transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              )}
              aria-label={`查看 Bad Case ${id}`}
            >
              <Eye size={12} strokeWidth={1.75} />
              查看
            </button>

            {/* 处理 - pending 状态 */}
            {status === "pending" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer(id, true);
                }}
                className={cn(
                  "inline-flex items-center justify-center gap-1",
                  "h-7 px-2.5 rounded-full",
                  "border border-[#E5E5E5]",
                  "text-[12px] leading-[1.5] text-[#0A0A0A]",
                  "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                  "transition-colors duration-150",
                  "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                )}
                aria-label={`处理 Bad Case ${id}`}
              >
                <Wrench size={12} strokeWidth={1.75} />
                处理
              </button>
            )}

            {/* 验证 - fixed 状态 */}
            {status === "fixed" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openDrawer(id, false);
                  // 稍后聚焦验证区域
                  setTimeout(() => {
                    const el = document.getElementById("verification-textarea");
                    el?.focus();
                  }, 400);
                }}
                className={cn(
                  "inline-flex items-center justify-center gap-1",
                  "h-7 px-2.5 rounded-full",
                  "border border-[#E5E5E5]",
                  "text-[12px] leading-[1.5] text-[#1F7A4D]",
                  "hover:bg-[#ECFDF5] hover:border-[#1F7A4D]",
                  "transition-colors duration-150",
                  "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                )}
                aria-label={`验证 Bad Case ${id}`}
              >
                <CheckCircle2 size={12} strokeWidth={1.75} />
                验证
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ---------- 渲染 ----------
  const statCardValue = (key: string): number => {
    if (!stats) return 0;
    if (key === "pending") return stats.pending;
    if (key === "fixing") return stats.fixing;
    if (key === "fixed") return stats.fixed;
    if (key === "verified") return stats.verified;
    return 0;
  };

  /** 顶部操作按钮 */
  const actions = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.csv,.json"
        className="hidden"
        onChange={handleImport}
      />
      <Button
        variant="outline"
        onClick={handleExport}
        className={cn(
          "h-9 px-4 rounded-full",
          "border border-[#E5E5E5]",
          "text-[13px] leading-[1.5] text-[#404040]",
          "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
          "transition-colors duration-150",
          "gap-1.5",
        )}
      >
        <Download size={14} strokeWidth={1.75} />
        导出
      </Button>
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "h-9 px-4 rounded-full",
          "border border-[#E5E5E5]",
          "text-[13px] leading-[1.5] text-[#404040]",
          "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
          "transition-colors duration-150",
          "gap-1.5",
        )}
      >
        <Upload size={14} strokeWidth={1.75} />
        导入
      </Button>
      <Button
        onClick={() => setAddModalOpen(true)}
        className={cn(
          "h-9 px-4 rounded-full",
          "bg-[#0A0A0A] text-white",
          "text-[13px] leading-[1.5]",
          "hover:bg-[#404040]",
          "transition-colors duration-150",
          "gap-1.5",
        )}
      >
        <Plus size={14} strokeWidth={1.75} />
        添加Bad Case
      </Button>
    </>
  );

  /** 抽屉底部操作按钮 */
  const drawerFooter = detail ? (
    <>
      {/* 已验证状态 - 显示对比结果，确认验证 / 仍需修复 */}
      {detail.status === "fixed" && verifyResult ? (
        <>
          <Button
            onClick={handleRetryFix}
            variant="outline"
            className={cn(
              "h-9 px-5 rounded-full",
              "border border-[#E5E5E5]",
              "text-[13px] leading-[1.5] text-[#404040]",
              "hover:bg-[#FAFAFA]",
              "transition-colors duration-150",
            )}
          >
            仍需修复
          </Button>
          <Button
            onClick={handleConfirmVerify}
            disabled={savingStatus}
            className={cn(
              "h-9 px-5 rounded-full",
              "bg-[#1F7A4D] text-white",
              "text-[13px] leading-[1.5]",
              "hover:bg-[#166534]",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "gap-1.5",
            )}
          >
            {savingStatus ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={14} strokeWidth={1.75} />
            )}
            确认验证
          </Button>
        </>
      ) : null}

      {(detail.status === "pending" || detail.status === "fixing") && (
        <Button
          onClick={handleMarkFixed}
          disabled={savingStatus}
          className={cn(
            "h-9 px-5 rounded-full",
            "bg-[#0A0A0A] text-white",
            "text-[13px] leading-[1.5]",
            "hover:bg-[#404040]",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "gap-1.5",
          )}
        >
          {savingStatus ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 size={14} strokeWidth={1.75} />
          )}
          标记已修复
        </Button>
      )}
      {detail.status === "fixed" && !verifyResult && (
        <Button
          onClick={handleVerify}
          disabled={verifying}
          className={cn(
            "h-9 px-5 rounded-full",
            "bg-[#1F7A4D] text-white",
            "text-[13px] leading-[1.5]",
            "hover:bg-[#166534]",
            "transition-colors duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "gap-1.5",
          )}
        >
          {verifying ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <CheckCircle2 size={14} strokeWidth={1.75} />
          )}
          {verifying ? "验证中..." : "验证"}
        </Button>
      )}
      <Button
        variant="outline"
        onClick={closeDrawer}
        className={cn(
          "h-9 px-5 rounded-full",
          "border border-[#E5E5E5]",
          "text-[13px] leading-[1.5] text-[#404040]",
          "hover:bg-[#FAFAFA]",
          "transition-colors duration-150",
        )}
      >
        关闭
      </Button>
    </>
  ) : null;

  return (
    <AdminPageShell
      title="Bad Case管理"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "质量管理" },
        { label: "Bad Case管理" },
      ]}
      actions={actions}
    >
      {/* ================================================================ */}
      {/* 1. 统计卡片行 */}
      {/* ================================================================ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STAT_CARD_CONFIGS.map((cfg) => {
          const isSelected = filterStatus === cfg.key;
          const value = statCardValue(cfg.key);

          return (
            <button
              key={cfg.key}
              type="button"
              onClick={() => handleStatClick(cfg.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "p-5 rounded-lg border",
                "transition-all duration-200",
                "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:ring-offset-1",
                isSelected
                  ? [
                      cfg.selectedBg,
                      cfg.selectedText,
                      "border-transparent",
                    ]
                  : [
                      cfg.lightBg,
                      cfg.lightText,
                      "border-[#E5E5E5]",
                      "hover:border-[#0A0A0A]/20",
                    ],
              )}
              aria-label={`${cfg.label} ${value} 条，点击筛选`}
              aria-pressed={isSelected}
            >
              {statsLoading ? (
                <div className="h-8 w-12 bg-[#E5E5E5] rounded animate-pulse" />
              ) : (
                <span
                  className={cn(
                    "text-[24px] leading-[1.2] font-medium tabular-nums",
                  )}
                >
                  {value}
                </span>
              )}
              <span
                className={cn(
                  "text-[12px] leading-[1.5]",
                  isSelected ? "opacity-80" : "",
                )}
              >
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* 2. 筛选栏 */}
      {/* ================================================================ */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 mb-6",
          "p-4 rounded-lg",
          "bg-white border border-[#E5E5E5]",
        )}
      >
        {/* 类型下拉 */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-type"
            className="text-[12px] leading-[1.5] text-[#737373] whitespace-nowrap"
          >
            类型
          </label>
          <Select value={filterErrorType} onValueChange={(v) => { setFilterErrorType(v); setPage(1); }}>
            <SelectTrigger id="filter-type" variant="filter" className="h-8 w-[120px] text-[13px]">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent variant="filter">
              {ERROR_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-[13px]">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 状态下拉 */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="text-[12px] leading-[1.5] text-[#737373] whitespace-nowrap"
          >
            状态
          </label>
          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger id="filter-status" variant="filter" className="h-8 w-[120px] text-[13px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent variant="filter">
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-[13px]">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 日期范围 */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-date-start"
            className="text-[12px] leading-[1.5] text-[#737373] whitespace-nowrap"
          >
            日期
          </label>
          <input
            id="filter-date-start"
            type="date"
            value={filterDateStart}
            onChange={(e) => {
              setFilterDateStart(e.target.value);
              setPage(1);
            }}
            className={cn(
              "h-8 px-3 rounded-[10px]",
              "border border-[#E5E5E5]",
              "bg-white",
              "text-[13px] leading-[1.5] text-[#404040]",
              "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
              "transition-colors duration-150",
            )}
          />
          <span className="text-[12px] leading-[1.5] text-[#A3A3A3]">至</span>
          <input
            id="filter-date-end"
            type="date"
            value={filterDateEnd}
            onChange={(e) => {
              setFilterDateEnd(e.target.value);
              setPage(1);
            }}
            className={cn(
              "h-8 px-3 rounded-[10px]",
              "border border-[#E5E5E5]",
              "bg-white",
              "text-[13px] leading-[1.5] text-[#404040]",
              "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
              "transition-colors duration-150",
            )}
          />
        </div>

        {/* 搜索框 */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="搜索用户问题..."
              className={cn(
                "h-8 pl-8 pr-3 rounded-[10px] w-48",
                "border border-[#E5E5E5]",
                "bg-white",
                "text-[13px] leading-[1.5] text-[#404040]",
                "placeholder:text-[#A3A3A3]",
                "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                "transition-colors duration-150",
                "transition-colors duration-150",
                "w-48",
              )}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className={cn(
              "h-8 px-3 rounded-md",
              "bg-[#0A0A0A] text-white",
              "text-[13px] leading-[1.5]",
              "hover:bg-[#404040]",
              "transition-colors duration-150",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
            )}
          >
            搜索
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. 表格 */}
      {/* ================================================================ */}
      <AdminTable<BadCase>
        columns={columns}
        data={data}
        loading={loading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        empty={
          <AdminEmpty
            title="暂无Bad Case记录"
            description="没有符合当前筛选条件的Bad Case"
          />
        }
      />

      {/* ================================================================ */}
      {/* 4. 详情抽屉 */}
      {/* ================================================================ */}
      <AdminDrawer
        open={drawerOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeDrawer();
        }}
        title={detail ? `Bad Case #${detail.id}` : "Bad Case 详情"}
        footer={drawerFooter}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <span className="inline-block w-6 h-6 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
              <span className="text-[13px] leading-[1.5] text-[#737373]">
                加载详情中...
              </span>
            </div>
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-6">
            {/* ---- 基本信息 ---- */}
            <div className="flex flex-col gap-4">
              <h3
                className={cn(
                  "text-[13px] leading-[1.5] font-medium",
                  "text-[#0A0A0A] tracking-[0.04em] uppercase",
                )}
              >
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.04em]">
                    问题类型
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040]">
                    {errorTypeLabel(detail.error_type)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.04em]">
                    状态
                  </span>
                  <AdminStatusBadge
                    status={badgeStatus(detail.status).status}
                    label={badgeStatus(detail.status).label}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.04em]">
                    上报用户
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040]">
                    {detail.reported_by ?? "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.04em]">
                    上报时间
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040]">
                    {detail.created_at}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.04em]">
                    会话ID
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040] font-mono text-[11px]">
                    {detail.conversation_id ?? "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.04em]">
                    消息ID
                  </span>
                  <span className="text-[13px] leading-[1.5] text-[#404040] font-mono text-[11px]">
                    -
                  </span>
                </div>
              </div>
            </div>

            {/* ---- 用户问题 ---- */}
            <div className="flex flex-col gap-2">
              <h3
                className={cn(
                  "text-[13px] leading-[1.5] font-medium",
                  "text-[#0A0A0A] tracking-[0.04em] uppercase",
                )}
              >
                用户问题
              </h3>
              <div
                className={cn(
                  "p-4 rounded-lg",
                  "bg-[#FAFAFA] border border-[#E5E5E5]",
                )}
              >
                <div className="flex items-start gap-2">
                  <User
                    size={16}
                    strokeWidth={1.75}
                    className="text-[#737373] shrink-0 mt-0.5"
                  />
                  <p className="text-[15px] leading-[1.6] text-[#0A0A0A]">
                    {detail.user_query}
                  </p>
                </div>
              </div>
            </div>

            {/* ---- AI回复 ---- */}
            <div className="flex flex-col gap-2">
              <h3
                className={cn(
                  "text-[13px] leading-[1.5] font-medium",
                  "text-[#0A0A0A] tracking-[0.04em] uppercase",
                )}
              >
                AI回复
              </h3>
              <div
                className={cn(
                  "p-4 rounded-lg",
                  "bg-[#FAFAFA] border border-[#E5E5E5]",
                )}
              >
                <div className="flex items-start gap-2">
                  <Bot
                    size={16}
                    strokeWidth={1.75}
                    className="text-[#737373] shrink-0 mt-0.5"
                  />
                  <p className="text-[15px] leading-[1.6] text-[#404040]">
                    {detail.ai_response}
                  </p>
                </div>
              </div>
            </div>

            {/* ---- 正确回复 ---- */}
            <div className="flex flex-col gap-2">
              <h3
                className={cn(
                  "text-[13px] leading-[1.5] font-medium",
                  "text-[#0A0A0A] tracking-[0.04em] uppercase",
                )}
              >
                正确回复
              </h3>
              <div
                className={cn(
                  "p-4 rounded-lg",
                  "bg-[#ECFDF5] border border-[#A7F3D0]",
                )}
              >
                <p className="text-[15px] leading-[1.6] text-[#1F7A4D]">
                  {detail.correct_response || "暂无正确回复"}
                </p>
              </div>
            </div>

            {/* ---- 修复方案 ---- */}
            <div className="flex flex-col gap-2">
              <h3
                className={cn(
                  "text-[13px] leading-[1.5] font-medium",
                  "text-[#0A0A0A] tracking-[0.04em] uppercase",
                )}
              >
                修复方案
              </h3>
              <Textarea
                ref={fixSolutionRef}
                id="fix-solution-textarea"
                value={editingFixSolution}
                onChange={(e) => setEditingFixSolution(e.target.value)}
                placeholder={
                  detail.status === "verified"
                    ? "已验证通过，无需编辑"
                    : "输入修复方案，如：补充意图规则、修正知识库数据..."
                }
                rows={4}
                disabled={detail.status === "verified"}
                className={cn(
                  "rounded-md",
                  "border border-[#E5E5E5]",
                  "text-[13px] leading-[1.6] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "resize-none",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                  "transition-colors duration-150",
                  "disabled:bg-[#FAFAFA] disabled:text-[#737373] disabled:cursor-not-allowed",
                )}
              />
            </div>

            {/* ---- 验证对比结果 ---- */}
            {verifyResult && (
              <div className="flex flex-col gap-3">
                <h3
                  className={cn(
                    "text-[13px] leading-[1.5] font-medium",
                    "text-[#0A0A0A] tracking-[0.04em] uppercase",
                  )}
                >
                  验证对比
                </h3>

                {/* 智能判定横幅 */}
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border",
                    verifyResult.verdict === "fixed"
                      ? "bg-[#F0FDF4] border-[#BBF7D0]"
                      : verifyResult.verdict === "likely_fixed"
                        ? "bg-[#FFFBEB] border-[#FDE68A]"
                        : "bg-[#FEF2F2] border-[#FECACA]",
                  )}
                >
                  <span
                    className={cn(
                      "text-[11px] leading-[1.5] font-medium uppercase tracking-[0.04em]",
                      verifyResult.verdict === "fixed"
                        ? "text-[#1F7A4D]"
                        : verifyResult.verdict === "likely_fixed"
                          ? "text-[#B45309]"
                          : "text-[#B42318]",
                    )}
                  >
                    {verifyResult.verdict === "fixed" ? "✅ 已修复" : verifyResult.verdict === "likely_fixed" ? "⚠️ 可能已修复" : "❌ 仍存在问题"}
                  </span>
                  <span className="text-[12px] leading-[1.5] text-[#404040]">
                    {verifyResult.verdict_reason}
                  </span>
                  <span className="ml-auto text-[11px] leading-[1.5] text-[#737373] tabular-nums whitespace-nowrap">
                    相似度 {verifyResult.similarity}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 原始错误回复 */}
                  <div
                    className={cn(
                      "p-4 rounded-lg",
                      "bg-[#FEF2F2] border border-[#FECACA]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] leading-[1.5] font-medium",
                        "text-[#B42318] uppercase tracking-[0.04em]",
                      )}
                    >
                      原始错误回复
                    </span>
                    <p className="mt-2 text-[13px] leading-[1.6] text-[#404040] whitespace-pre-wrap">
                      {verifyResult.original_reply}
                    </p>
                  </div>
                  {/* 当前 AI 回复 */}
                  <div
                    className={cn(
                      "p-4 rounded-lg",
                      "bg-[#F0FDF4] border border-[#BBF7D0]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] leading-[1.5] font-medium",
                        "text-[#1F7A4D] uppercase tracking-[0.04em]",
                      )}
                    >
                      当前 AI 回复
                    </span>
                    <p className="mt-2 text-[13px] leading-[1.6] text-[#404040] whitespace-pre-wrap">
                      {verifyResult.current_reply}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] leading-[1.5] text-[#737373]">
                  验证时间: {verifyResult.verified_at}
                </span>
              </div>
            )}

            {/* ---- 验证结果 ---- */}
            <div className="flex flex-col gap-2">
              <h3
                className={cn(
                  "text-[13px] leading-[1.5] font-medium",
                  "text-[#0A0A0A] tracking-[0.04em] uppercase",
                )}
              >
                验证结果
              </h3>
              <Textarea
                id="verification-textarea"
                value={editingVerification}
                onChange={(e) => setEditingVerification(e.target.value)}
                placeholder={
                  detail.status === "fixed"
                    ? "输入验证结果，确认修复是否生效..."
                    : detail.status === "verified"
                      ? "已验证通过"
                      : "请先完成修复后验证"
                }
                rows={4}
                disabled={detail.status !== "fixed"}
                className={cn(
                  "rounded-md",
                  "border border-[#E5E5E5]",
                  "text-[13px] leading-[1.6] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "resize-none",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                  "transition-colors duration-150",
                  "disabled:bg-[#FAFAFA] disabled:text-[#737373] disabled:cursor-not-allowed",
                )}
              />
            </div>
          </div>
        ) : null}
      </AdminDrawer>

      {/* ================================================================ */}
      {/* 5. 添加 Bad Case 弹窗 */}
      {/* ================================================================ */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddModalOpen(false);
          }}
        >
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/30" />

          {/* 弹窗 */}
          <div
            className={cn(
              "relative z-10",
              "bg-white border border-[#E5E5E5] rounded-2xl",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
              "w-full max-w-lg",
              "mx-4",
            )}
          >
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h2 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">
                添加 Bad Case
              </h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className={cn(
                  "inline-flex items-center justify-center",
                  "h-8 w-8 rounded-full",
                  "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                  "transition-colors duration-150",
                )}
                aria-label="关闭"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            {/* 表单 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubmit();
              }}
              className="px-6 pb-3 flex flex-col gap-4"
            >
              {/* 用户问题 */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="add-user-query"
                  className="text-[12px] leading-[1.5] font-medium text-[#404040]"
                >
                  用户问题 <span className="text-[#B42318]">*</span>
                </label>
                <textarea
                  id="add-user-query"
                  value={addForm.user_query}
                  onChange={(e) => {
                    setAddForm((prev) => ({ ...prev, user_query: e.target.value }));
                    if (addErrors.user_query) setAddErrors((prev) => ({ ...prev, user_query: "" }));
                  }}
                  maxLength={300}
                  rows={3}
                  placeholder="输入用户原始问题..."
                  className={cn(
                    "rounded-md px-3 py-2",
                    "border",
                    addErrors.user_query ? "border-[#B42318]" : "border-[#E5E5E5]",
                    "text-[13px] leading-[1.6] text-[#404040]",
                    "placeholder:text-[#A3A3A3]",
                    "resize-none",
                    "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "transition-colors duration-150",
                  )}
                />
                {addErrors.user_query && (
                  <span className="text-[11px] leading-[1.5] text-[#B42318]">
                    {addErrors.user_query}
                  </span>
                )}
              </div>

              {/* AI 错误回复 */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="add-ai-response"
                  className="text-[12px] leading-[1.5] font-medium text-[#404040]"
                >
                  AI 错误回复 <span className="text-[#B42318]">*</span>
                </label>
                <textarea
                  id="add-ai-response"
                  value={addForm.ai_response}
                  onChange={(e) => {
                    setAddForm((prev) => ({ ...prev, ai_response: e.target.value }));
                    if (addErrors.ai_response) setAddErrors((prev) => ({ ...prev, ai_response: "" }));
                  }}
                  rows={4}
                  placeholder="输入AI的错误回复内容..."
                  className={cn(
                    "rounded-md px-3 py-2",
                    "border",
                    addErrors.ai_response ? "border-[#B42318]" : "border-[#E5E5E5]",
                    "text-[13px] leading-[1.6] text-[#404040]",
                    "placeholder:text-[#A3A3A3]",
                    "resize-none",
                    "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "transition-colors duration-150",
                  )}
                />
                {addErrors.ai_response && (
                  <span className="text-[11px] leading-[1.5] text-[#B42318]">
                    {addErrors.ai_response}
                  </span>
                )}
              </div>

              {/* 正确回复 */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="add-correct-response"
                  className="text-[12px] leading-[1.5] font-medium text-[#404040]"
                >
                  正确回复
                </label>
                <textarea
                  id="add-correct-response"
                  value={addForm.correct_response}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, correct_response: e.target.value }))
                  }
                  rows={3}
                  placeholder="输入正确的回复内容（可选）..."
                  className={cn(
                    "rounded-md px-3 py-2",
                    "border border-[#E5E5E5]",
                    "text-[13px] leading-[1.6] text-[#404040]",
                    "placeholder:text-[#A3A3A3]",
                    "resize-none",
                    "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "transition-colors duration-150",
                  )}
                />
              </div>

              {/* 问题类型 */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="add-error-type"
                  className="text-[12px] leading-[1.5] font-medium text-[#404040]"
                >
                  问题类型 <span className="text-[#B42318]">*</span>
                </label>
                <Select
                  value={addForm.error_type}
                  onValueChange={(v) => {
                    setAddForm((prev) => ({ ...prev, error_type: v }));
                    if (addErrors.error_type) setAddErrors((prev) => ({ ...prev, error_type: "" }));
                  }}
                >
                  <SelectTrigger
                    id="add-error-type"
                    variant="filter"
                    className={cn(
                      "h-9 w-full text-[13px]",
                      addErrors.error_type && "border-[#B42318]",
                    )}
                  >
                    <SelectValue placeholder="选择问题类型" />
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    {ERROR_TYPE_OPTIONS.filter((opt) => opt.value !== "all").map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {addErrors.error_type && (
                  <span className="text-[11px] leading-[1.5] text-[#B42318]">
                    {addErrors.error_type}
                  </span>
                )}
              </div>

              {/* 按钮 */}
              <div className="flex items-center justify-end gap-2 pt-2 pb-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddModalOpen(false)}
                  disabled={addingSubmitting}
                  className={cn(
                    "h-9 px-5 rounded-full",
                    "border border-[#E5E5E5]",
                    "text-[13px] leading-[1.5] text-[#404040]",
                    "hover:bg-[#FAFAFA]",
                    "transition-colors duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={addingSubmitting}
                  className={cn(
                    "h-9 px-5 rounded-full",
                    "bg-[#0A0A0A] text-white",
                    "text-[13px] leading-[1.5]",
                    "hover:bg-[#404040]",
                    "transition-colors duration-150",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "gap-1.5",
                  )}
                >
                  {addingSubmitting ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      添加中...
                    </>
                  ) : (
                    "确认添加"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}