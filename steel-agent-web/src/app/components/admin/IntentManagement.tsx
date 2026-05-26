// ============================================================
// IntentManagement -- 意图管理页面
//
// 包含功能：
//   1. 意图列表（筛选 + 表格 + 分页）
//   2. 意图统计表
//   3. 添加/编辑意图弹窗（表单 Dialog）
//   4. 意图测试面板
//   5. 删除确认弹窗（AdminModal）
//
// Design tokens: 使用项目色板/字阶/圆角规范
// ============================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search,
  Plus,
  Zap,
  Pencil,
  Trash2,
  X,
  Tag,
  Target,
  Hash,
  Layers,
  Play,
  Clock,
  RotateCcw,
  Info,
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getIntents,
  createIntent,
  updateIntent,
  deleteIntent,
  getIntentStats,
  testIntent,
} from "@/app/api/admin";
import type { Intent, IntentStats, IntentTestResult, PaginatedResponse } from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

/** 可关联的实体列表 */
const ALL_ENTITIES = [
  { key: "category", label: "品种 (category)" },
  { key: "spec", label: "规格 (spec)" },
  { key: "region", label: "地区 (region)" },
  { key: "time", label: "时间 (time)" },
  { key: "quantity", label: "数量 (quantity)" },
];

/** 匹配方式中文标签 */
const MATCH_TYPE_LABELS: Record<string, string> = {
  exact_keyword: "精确匹配",
  fuzzy: "模糊匹配",
  fallback: "回退匹配",
  exact_match: "规则匹配",
};

// ============================================================
// 类型
// ============================================================

interface IntentFormData {
  code: string;
  name: string;
  keywords: string;
  entities: string[];
  template: string;
  priority: number;
  status: "enabled" | "disabled";
}

interface TestHistoryItem {
  text: string;
  result: IntentTestResult;
  timestamp: string;
}

const EMPTY_FORM: IntentFormData = {
  code: "",
  name: "",
  keywords: "",
  entities: [],
  template: "",
  priority: 5,
  status: "enabled",
};

// ============================================================
// IntentManagement 组件
// ============================================================

export function IntentManagement() {
  // ---- 列表状态 ----
  const [intents, setIntents] = useState<Intent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ---- 筛选 ----
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState(""); // 输入框即时值
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- 统计 ----
  const [stats, setStats] = useState<IntentStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ---- 添加/编辑弹窗 ----
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<IntentFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ---- 删除确认 ----
  const [deleteTarget, setDeleteTarget] = useState<Intent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---- 测试面板 ----
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<IntentTestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);

  // ============================================================
  // 数据加载
  // ============================================================

  const loadIntents = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res: PaginatedResponse<Intent> = await getIntents({
        page,
        pageSize,
        keyword: keyword || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setIntents(res.items);
      setTotal(res.total);
    } catch (err) {
      setListError("加载意图列表失败，请重试");
    } finally {
      setListLoading(false);
    }
  }, [page, pageSize, keyword, statusFilter]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getIntentStats();
      setStats(data);
    } catch {
      // 统计加载失败不影响主列表
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    loadIntents();
    loadStats();
  }, [loadIntents, loadStats]);

  // ============================================================
  // 筛选处理（300ms 防抖）
  // ============================================================

  const handleSearchInput = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setKeyword(value.trim());
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  // ============================================================
  // 排序
  // ============================================================

  const handleSort = useCallback((key: string, order: "asc" | "desc") => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  // ============================================================
  // 表单校验
  // ============================================================

  const validateForm = useCallback((data: IntentFormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!data.code.trim()) errors.code = "意图编码不能为空";
    if (!data.name.trim()) errors.name = "意图名称不能为空";
    if (!data.keywords.trim()) errors.keywords = "触发关键词不能为空";
    return errors;
  }, []);

  // ============================================================
  // CRUD 操作
  // ============================================================

  const openAddForm = useCallback(() => {
    setIsEditing(false);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((intent: Intent) => {
    setIsEditing(true);
    setFormData({
      code: intent.code,
      name: intent.name,
      keywords: intent.keywords,
      entities: [...intent.entities],
      template: intent.template,
      priority: intent.priority,
      status: intent.status,
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
      const el = document.querySelector<HTMLInputElement>(`[data-form-field="${firstErrorKey}"]`);
      el?.focus();
      return;
    }

    setFormSubmitting(true);
    try {
      const intentPayload: Intent = {
        id: isEditing ? (intents.find((i) => i.code === formData.code)?.id ?? "") : `intent-${Date.now()}`,
        code: formData.code.trim(),
        name: formData.name.trim(),
        keywords: formData.keywords.trim(),
        entities: formData.entities,
        template: formData.template.trim(),
        priority: formData.priority,
        status: formData.status,
      };

      if (isEditing) {
        await updateIntent(intentPayload);
        showSuccessToast(`意图"${formData.name}"已更新`);
      } else {
        await createIntent(intentPayload);
        showSuccessToast(`意图"${formData.name}"已创建`);
      }

      setFormOpen(false);
      await loadIntents();
      await loadStats();
    } catch {
      showErrorToast(isEditing ? "更新意图失败，请重试" : "创建意图失败，请重试");
    } finally {
      setFormSubmitting(false);
    }
  }, [formData, isEditing, validateForm, loadIntents, loadStats, intents]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteIntent(deleteTarget.id);
      showSuccessToast(`意图"${deleteTarget.name}"已删除`);
      setDeleteTarget(null);
      await loadIntents();
      await loadStats();
    } catch {
      showErrorToast("删除意图失败，请重试");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, loadIntents, loadStats]);

  // ============================================================
  // 测试操作
  // ============================================================

  const handleTest = useCallback(async () => {
    if (!testInput.trim()) return;
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    try {
      const result = await testIntent(testInput.trim());
      setTestResult(result);

      // 保存测试历史（最多 10 条）
      const historyItem: TestHistoryItem = {
        text: testInput.trim(),
        result,
        timestamp: new Date().toLocaleString("zh-CN", { hour12: false }),
      };
      setTestHistory((prev) => [historyItem, ...prev].slice(0, 10));
    } catch {
      setTestError("意图测试失败，请重试");
    } finally {
      setTestLoading(false);
    }
  }, [testInput]);

  const handleHistoryClick = useCallback((item: TestHistoryItem) => {
    setTestInput(item.text);
    setTestResult(item.result);
  }, []);

  // ============================================================
  // 实体多选
  // ============================================================

  const toggleEntity = useCallback((key: string) => {
    setFormData((prev) => ({
      ...prev,
      entities: prev.entities.includes(key)
        ? prev.entities.filter((e) => e !== key)
        : [...prev.entities, key],
    }));
  }, []);

  // ============================================================
  // 表格列定义
  // ============================================================

  const intentColumns: TableColumn<Intent>[] = useMemo(
    () => [
      {
        key: "name",
        title: "意图名称",
        sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Tag size={14} strokeWidth={1.75} className="text-[#737373] shrink-0" />
            <span className="text-[13px] leading-[1.5] text-[#0A0A0A] font-medium">
              {row.name}
            </span>
            <span className="text-[11px] leading-[1.5] text-[#A3A3A3] font-mono">
              {row.code}
            </span>
          </div>
        ),
      },
      {
        key: "keywords",
        title: "触发关键词",
        render: (_, row) => (
          <div className="flex flex-wrap gap-1 max-w-[280px]">
            {row.keywords.split(/[,，]/).filter(Boolean).map((kw, i) => (
              <span
                key={i}
                className={cn(
                  "inline-block text-[11px] leading-[1.5]",
                  "px-1.5 py-0.5 rounded-sm",
                  "bg-[#FAFAFA] text-[#737373] border border-[#E5E5E5]",
                )}
              >
                {kw.trim()}
              </span>
            ))}
          </div>
        ),
      },
      {
        key: "priority",
        title: "优先级",
        sortable: true,
        render: (_, row) => (
          <span className="inline-flex items-center gap-1 text-[13px] leading-[1.5] text-[#404040] tabular-nums">
            <Hash size={12} strokeWidth={1.75} className="text-[#A3A3A3]" />
            {row.priority}
          </span>
        ),
      },
      {
        key: "status",
        title: "状态",
        render: (_, row) => (
          <AdminStatusBadge
            status={row.status === "enabled" ? "enabled" : "disabled"}
            label={row.status === "enabled" ? "启用" : "禁用"}
          />
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
              className={cn(
                "flex items-center justify-center",
                "w-7 h-7 rounded-md",
                "text-[#737373] hover:text-[#0A0A0A] hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
              )}
              aria-label={`编辑意图 ${row.name}`}
            >
              <Pencil size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row);
              }}
              className={cn(
                "flex items-center justify-center",
                "w-7 h-7 rounded-md",
                "text-[#737373] hover:text-[#B42318] hover:bg-[#FEF2F2]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#B42318]/10",
              )}
              aria-label={`删除意图 ${row.name}`}
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        ),
      },
    ],
    [openEditForm],
  );

  const statsColumns: TableColumn<IntentStats>[] = useMemo(
    () => [
      {
        key: "name",
        title: "意图名称",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#0A0A0A]">{row.name}</span>
        ),
      },
      {
        key: "todayCalls",
        title: "今日调用",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#404040] tabular-nums">
            {row.todayCalls.toLocaleString()}
          </span>
        ),
      },
      {
        key: "hitRate",
        title: "命中率",
        render: (_, row) => (
          <span
            className={cn(
              "text-[13px] leading-[1.5] tabular-nums",
              row.hitRate >= 0.9
                ? "text-[#1F7A4D]"
                : row.hitRate >= 0.8
                  ? "text-[#B45309]"
                  : "text-[#B42318]",
            )}
          >
            {(row.hitRate * 100).toFixed(1)}%
          </span>
        ),
      },
      {
        key: "avgResponseTime",
        title: "平均响应时间",
        render: (_, row) => (
          <span className="text-[13px] leading-[1.5] text-[#404040] tabular-nums">
            {row.avgResponseTime.toFixed(2)} s
          </span>
        ),
      },
    ],
    [],
  );

  // ============================================================
  // 按钮样式
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

  const outlineBtnClass = cn(
    "inline-flex items-center gap-1.5",
    "h-8 px-3.5 rounded-full",
    "border border-[#E5E5E5] bg-white",
    "text-[#0A0A0A] text-[13px] leading-[1.5]",
    "hover:bg-[#FAFAFA]",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
  );

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="意图管理"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "Agent管理" },
        { label: "意图管理" },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => setTestPanelOpen(true)}
            className={outlineBtnClass}
          >
            <Zap size={14} strokeWidth={1.75} />
            意图测试
          </button>
          <button
            type="button"
            onClick={openAddForm}
            className={primaryBtnClass}
          >
            <Plus size={14} strokeWidth={1.75} />
            添加意图
          </button>
        </>
      }
    >
      {/* ========================================================== */}
      {/* 1. 筛选栏 */}
      {/* ========================================================== */}
      <div className="flex items-center gap-3 mb-4">
        {/* 状态筛选 */}
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger variant="filter" className="h-9 w-[130px] text-[13px] leading-[1.5]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent variant="filter">
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>

        {/* 搜索框 */}
        <div className="relative flex-1 max-w-[360px]">
          <Search
            size={14}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]"
          />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="输入意图名称或关键词..."
            className={cn(
              "h-9 pl-8 pr-3 rounded-md",
              "border border-[#E5E5E5]",
              "text-[13px] leading-[1.5] text-[#404040]",
              "placeholder:text-[#A3A3A3]",
              "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
            )}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setKeyword("");
                setPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#0A0A0A]"
              aria-label="清除搜索"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* 2. 意图列表 */}
      {/* ========================================================== */}

      {/* 错误态 */}
      {listError && !listLoading && (
        <div
          className={cn(
            "mb-4 px-4 py-3 rounded-lg",
            "border border-[#FECACA] bg-[#FEF2F2]",
            "text-[13px] leading-[1.5] text-[#B42318]",
            "flex items-center gap-2",
          )}
        >
          <Info size={14} strokeWidth={1.75} />
          {listError}
          <button
            type="button"
            onClick={() => { setListError(null); loadIntents(); }}
            className="ml-auto text-[#0A0A0A] underline hover:text-[#404040] text-[12px]"
          >
            重试
          </button>
        </div>
      )}

      <AdminTable<Intent>
        columns={intentColumns}
        data={intents}
        loading={listLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        empty={
          <AdminEmpty
            title="暂无意图配置"
            description="点击上方「添加意图」按钮创建第一个意图"
          />
        }
        className="mb-6"
      />

      {/* ========================================================== */}
      {/* 3. 意图统计 */}
      {/* ========================================================== */}
      {statsLoading ? (
        <div className="bg-white border border-[#E5E5E5] rounded-lg">
          <AdminLoading type="table" rows={5} />
        </div>
      ) : stats.length > 0 ? (
        <div className="mb-6">
          <h2
            className={cn(
              "text-[16px] leading-[1.4] font-medium text-[#0A0A0A]",
              "mb-3",
            )}
          >
            意图统计
          </h2>
          <AdminTable<IntentStats>
            columns={statsColumns}
            data={stats}
            rowKey={(row) => row.code}
          />
        </div>
      ) : null}

      {/* ========================================================== */}
      {/* 4. 添加/编辑意图弹窗 */}
      {/* ========================================================== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            "p-6 max-w-[520px]",
            "max-h-[90vh] overflow-y-auto",
          )}
        >
          <DialogHeader className="mb-5">
            <DialogTitle
              className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]"
            >
              {isEditing ? "编辑意图" : "添加意图"}
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-[1.5] text-[#737373] mt-1">
              {isEditing
                ? "修改意图的触发关键词、关联实体和模板配置"
                : "配置新的意图识别规则，定义关键词、实体和工具映射"}
            </DialogDescription>
          </DialogHeader>

          {/* 表单内容 */}
          <div className="flex flex-col gap-4">
            {/* 意图编码 */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12px] leading-[1.5] text-[#404040] font-medium"
              >
                意图编码 <span className="text-[#B42318]">*</span>
              </label>
              <Input
                data-form-field="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="如: query_price"
                disabled={isEditing}
                aria-invalid={!!formErrors.code}
                aria-describedby={formErrors.code ? "err-code" : undefined}
                className={cn(
                  "h-9 px-3 rounded-md",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border",
                  formErrors.code
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10 focus-visible:border-[#B42318]"
                    : "border-[#E5E5E5] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  isEditing && "bg-[#FAFAFA] text-[#737373]",
                )}
              />
              {formErrors.code && (
                <span id="err-code" className="text-[11px] leading-[1.5] text-[#B42318]">
                  {formErrors.code}
                </span>
              )}
            </div>

            {/* 意图名称 */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12px] leading-[1.5] text-[#404040] font-medium"
              >
                意图名称 <span className="text-[#B42318]">*</span>
              </label>
              <Input
                data-form-field="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="如: 查询价格"
                aria-invalid={!!formErrors.name}
                aria-describedby={formErrors.name ? "err-name" : undefined}
                className={cn(
                  "h-9 px-3 rounded-md",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border",
                  formErrors.name
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10 focus-visible:border-[#B42318]"
                    : "border-[#E5E5E5] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                )}
              />
              {formErrors.name && (
                <span id="err-name" className="text-[11px] leading-[1.5] text-[#B42318]">
                  {formErrors.name}
                </span>
              )}
            </div>

            {/* 触发关键词 */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12px] leading-[1.5] text-[#404040] font-medium"
              >
                触发关键词 <span className="text-[#B42318]">*</span>
              </label>
              <Input
                data-form-field="keywords"
                value={formData.keywords}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, keywords: e.target.value }))
                }
                placeholder="逗号分隔，如: 价格、多少钱、报价"
                aria-invalid={!!formErrors.keywords}
                aria-describedby={formErrors.keywords ? "err-keywords" : undefined}
                className={cn(
                  "h-9 px-3 rounded-md",
                  "text-[13px] leading-[1.5] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border",
                  formErrors.keywords
                    ? "border-[#B42318] focus-visible:ring-[#B42318]/10 focus-visible:border-[#B42318]"
                    : "border-[#E5E5E5] focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                )}
              />
              {formErrors.keywords && (
                <span id="err-keywords" className="text-[11px] leading-[1.5] text-[#B42318]">
                  {formErrors.keywords}
                </span>
              )}
            </div>

            {/* 关联实体 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                关联实体
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_ENTITIES.map((entity) => {
                  const checked = formData.entities.includes(entity.key);
                  return (
                    <button
                      key={entity.key}
                      type="button"
                      onClick={() => toggleEntity(entity.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        "h-7 px-2.5 rounded-full",
                        "text-[12px] leading-[1.5]",
                        "border transition-colors duration-150",
                        "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                        checked
                          ? "bg-[#0A0A0A] text-white border-[#0A0A0A]"
                          : "border-[#E5E5E5] text-[#737373] hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
                      )}
                      aria-pressed={checked}
                    >
                      <Layers size={12} strokeWidth={1.75} />
                      {entity.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 回复模板 */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[12px] leading-[1.5] text-[#404040] font-medium"
              >
                回复模板
              </label>
              <textarea
                value={formData.template}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, template: e.target.value }))
                }
                placeholder="如: 查询{category}{spec}在{region}的最新价格"
                rows={3}
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "text-[13px] leading-[1.6] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border border-[#E5E5E5]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  "resize-none",
                )}
              />
            </div>

            {/* 优先级 & 状态 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] leading-[1.5] text-[#404040] font-medium"
                >
                  优先级
                </label>
                <Select
                  value={String(formData.priority)}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, priority: Number(v) }))
                  }
                >
                  <SelectTrigger variant="filter" className="h-9 text-[13px] leading-[1.5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        优先级 {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[12px] leading-[1.5] text-[#404040] font-medium"
                >
                  状态
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, status: v as "enabled" | "disabled" }))
                  }
                >
                  <SelectTrigger variant="filter" className="h-9 text-[13px] leading-[1.5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent variant="filter">
                    <SelectItem value="enabled">启用</SelectItem>
                    <SelectItem value="disabled">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={formSubmitting}
              className={cn(
                "h-8 px-4 rounded-full",
                "border border-[#E5E5E5] bg-white",
                "text-[#0A0A0A] text-[13px] leading-[1.5]",
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
              onClick={handleFormSubmit}
              disabled={formSubmitting}
              className={cn(
                "h-8 px-4 rounded-full",
                "bg-[#0A0A0A] text-white",
                "text-[13px] leading-[1.5] font-medium",
                "hover:bg-[#404040]",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {formSubmitting ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  提交中...
                </span>
              ) : (
                "确定"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* 5. 意图测试面板 */}
      {/* ========================================================== */}
      <Dialog open={testPanelOpen} onOpenChange={setTestPanelOpen}>
        <DialogContent
          className={cn(
            "bg-white border border-[#E5E5E5] rounded-lg",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
            "p-6 max-w-[560px]",
          )}
        >
          <DialogHeader className="mb-5">
            <DialogTitle
              className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]"
            >
              意图测试
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-[1.5] text-[#737373] mt-1">
              输入用户消息，测试意图识别与实体抽取效果
            </DialogDescription>
          </DialogHeader>

          {/* 测试输入区 */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="输入测试文本，如：上海螺纹钢HRB400E 20mm今天什么价格？"
                rows={3}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md",
                  "text-[13px] leading-[1.6] text-[#404040]",
                  "placeholder:text-[#A3A3A3]",
                  "border border-[#E5E5E5]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10 focus-visible:border-[#0A0A0A]",
                  "resize-none",
                )}
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testLoading || !testInput.trim()}
                className={cn(
                  "inline-flex items-center justify-center",
                  "w-9 h-9 rounded-md shrink-0 self-start",
                  "bg-[#0A0A0A] text-white",
                  "hover:bg-[#404040]",
                  "transition-colors duration-150",
                  "focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
                aria-label="执行测试"
              >
                {testLoading ? (
                  <span
                    className="inline-block w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Play size={14} strokeWidth={1.75} />
                )}
              </button>
            </div>

            {/* Loading */}
            {testLoading && (
              <div className="flex items-center gap-2 px-3 py-6 text-[#A3A3A3] text-[13px] leading-[1.5]">
                <span
                  className="inline-block w-3.5 h-3.5 border border-[#A3A3A3] border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                正在识别意图...
              </div>
            )}

            {/* Error */}
            {testError && !testLoading && (
              <div
                className={cn(
                  "px-3 py-3 rounded-md",
                  "border border-[#FECACA] bg-[#FEF2F2]",
                  "text-[13px] leading-[1.5] text-[#B42318]",
                  "flex items-center gap-2",
                )}
              >
                <Info size={14} strokeWidth={1.75} />
                {testError}
              </div>
            )}

            {/* Result */}
            {testResult && !testLoading && (
              <div className="border border-[#E5E5E5] rounded-md divide-y divide-[#E5E5E5]">
                <div className="px-3 py-2.5 flex items-center gap-2">
                  <Target size={14} strokeWidth={1.75} className="text-[#737373]" />
                  <span className="text-[12px] leading-[1.5] text-[#737373]">识别意图</span>
                  <span className="text-[13px] leading-[1.5] text-[#0A0A0A] font-medium ml-auto">
                    {testResult.intent}
                  </span>
                  <AdminStatusBadge
                    status={testResult.confidence > 0.5 ? "enabled" : "disabled"}
                    label={testResult.confidence > 0.5 ? "命中" : "未命中"}
                  />
                </div>
                {testResult.entities && Object.keys(testResult.entities).length > 0 && (
                  <div className="px-3 py-2.5">
                    <span className="text-[12px] leading-[1.5] text-[#737373]">抽取实体</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Object.entries(testResult.entities).map(([key, value]) => (
                        <span
                          key={key}
                          className={cn(
                            "inline-flex items-center gap-1",
                            "px-2 py-0.5 rounded-sm",
                            "bg-[#FAFAFA] border border-[#E5E5E5]",
                            "text-[12px] leading-[1.5] text-[#404040]",
                          )}
                        >
                          <span className="text-[#A3A3A3]">{key}</span>
                          <span>{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {testResult.confidence !== undefined && (
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <span className="text-[12px] leading-[1.5] text-[#737373]">置信度</span>
                    <span
                      className={cn(
                        "text-[13px] leading-[1.5] font-medium tabular-nums",
                        testResult.confidence >= 0.8
                          ? "text-[#1F7A4D]"
                          : testResult.confidence >= 0.5
                            ? "text-[#B45309]"
                            : "text-[#B42318]",
                      )}
                    >
                      {(testResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* History */}
            {testHistory.length > 0 && (
              <div className="mt-1">
                <span className="text-[12px] leading-[1.5] text-[#737373]">测试历史</span>
                <div className="mt-1.5 flex flex-col gap-1 max-h-[160px] overflow-y-auto">
                  {testHistory.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleHistoryClick(item)}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 rounded-md",
                        "text-left hover:bg-[#FAFAFA]",
                        "transition-colors duration-150",
                      )}
                    >
                      <Clock size={12} strokeWidth={1.75} className="text-[#A3A3A3] shrink-0" />
                      <span className="text-[12px] leading-[1.5] text-[#404040] truncate flex-1">
                        {item.text}
                      </span>
                      <span className="text-[11px] leading-[1.5] text-[#A3A3A3] tabular-nums shrink-0">
                        {item.timestamp}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* 6. 删除确认弹窗 */}
      {/* ========================================================== */}
      <AdminModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="确认删除意图"
        description={`确定要删除意图"${deleteTarget?.name}"吗？删除后不可恢复。`}
        confirmLabel="删除"
        cancelLabel="取消"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </AdminPageShell>
  );
}