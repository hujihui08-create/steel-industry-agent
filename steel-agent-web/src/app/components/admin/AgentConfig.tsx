import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Play,
  Undo2,
  ChevronDown as ChevronDownIcon,
  Loader2,
  RotateCcw,
  GripHorizontal,
} from "lucide-react";

import { AdminPageShell } from "./AdminPageShell";
import { AdminModal } from "./AdminModal";
import { AdminTable } from "./AdminTable";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  getAgentConfig,
  saveAgentConfig,
  getPromptVersions,
  testModelConnection,
  getPublicCategories,
} from "@/app/api/admin";

import type {
  AgentConfig,
  PromptVersion,
  QuickCommand,
  HallucinationRule,
  ModelConfig,
  Category,
} from "@/app/types/admin";

// ============================================================
// 常量定义
// ============================================================

const ICON_OPTIONS = [
  { value: "Search", label: "搜索" },
  { value: "Calculator", label: "计算" },
  { value: "FileText", label: "文档" },
  { value: "BookOpen", label: "知识" },
  { value: "TrendingUp", label: "走势" },
  { value: "Bell", label: "提醒" },
  { value: "DollarSign", label: "价格" },
  { value: "Package", label: "订单" },
  { value: "Truck", label: "物流" },
  { value: "BarChart3", label: "图表" },
];

const DEFAULT_DISCLAIMER =
  "以上数据仅供参考，实际价格以交易时为准。数据来源于公开市场信息，不构成投资建议。";

const DEFAULT_WELCOME_MESSAGE =
  "您好！我是**钢小秘**，钢铁行业智能助手，专门为采购商、销售商和分析师提供服务。\n\n**价格查询**：实时查询各品种、规格、地区钢材价格\n**价格走势**：查看历史价格趋势，辅助分析判断\n**报价计算**：根据品种、规格、数量计算材料费、加工费、运费和税费\n**知识搜索**：查询钢材标准、牌号对照、术语解释、工艺说明\n**招标信息**：按关键词和地区查询招标公告\n**行业资讯**：搜索价格行情、政策、行业动态等新闻\n**重量计算**：根据形状和规格估算钢材理论重量\n**价格预警**：设置目标价位，到价提醒\n\n有什么可以帮您的吗？";

const DEFAULT_SYSTEM_PROMPT = `你是一个钢铁行业智能助手。重要规则：
1. 所有价格数据必须通过工具调用获取，禁止编造
2. 如果不确定，明确告知用户"我需要查询一下"
3. 涉及交易决策时，必须附加免责声明
4. 结论先行，数据优先，来源可追溯
5. 数字格式：价格用千分位+单位（¥3,850/吨），涨跌用符号+百分比（+12 +0.31%）`;

const DEFAULT_QUICK_COMMANDS: QuickCommand[] = [
  { id: "qc-1", icon: "Search", label: "查价格", prompt: "帮我查询螺纹钢最新价格", order: 1 },
  { id: "qc-2", icon: "Calculator", label: "算报价", prompt: "帮我计算报价", order: 2 },
  { id: "qc-3", icon: "FileText", label: "看招标", prompt: "最近有哪些招标信息？", order: 3 },
  { id: "qc-4", icon: "BookOpen", label: "搜知识", prompt: "帮我查一下国家标准", order: 4 },
  { id: "qc-5", icon: "TrendingUp", label: "看走势", prompt: "螺纹钢价格走势如何？", order: 5 },
  { id: "qc-6", icon: "Bell", label: "设预警", prompt: "帮我设置价格预警", order: 6 },
];

// ============================================================
// 辅助函数：从树形品类中提取叶子品种名称
// ============================================================

function flattenCategoryNames(categories: Category[]): string[] {
  const names: string[] = [];
  for (const cat of categories) {
    if (cat.children && cat.children.length > 0) {
      for (const child of cat.children) names.push(child.name);
    } else {
      names.push(cat.name);
    }
  }
  return names;
}

// ============================================================
// 子组件：Section 卡片容器
// ============================================================

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}

function SectionCard({ title, children, rightAction, className }: SectionCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-[#E5E5E5] rounded-2xl",
        className,
      )}
    >
      {/* 卡片头部 */}
      <div
        className={cn(
          "flex items-center justify-between",
          "px-5 py-4",
          "border-b border-[#E5E5E5]",
        )}
      >
        <h2 className="text-[18px] leading-[1.4] font-medium text-[#0A0A0A]">
          {title}
        </h2>
        {rightAction && <div className="flex items-center gap-2">{rightAction}</div>}
      </div>

      {/* 卡片内容 */}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ============================================================
// 子组件：字段标签
// ============================================================

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[13px] leading-[1.5] text-[#404040] mb-2 font-medium"
    >
      {children}
    </label>
  );
}

// ============================================================
// 主组件：AgentConfig
// ============================================================

export function AgentConfigPage() {
  // ---------- 全局状态 ----------
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // ---------- 配置数据状态 ----------
  const [primaryModel, setPrimaryModel] = useState("gpt-4o-mini");
  const [backupModel, setBackupModel] = useState("qwen-turbo");
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [timeout, setTimeout_] = useState(30);
  const [contextTurns, setContextTurns] = useState(5);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);
  const [hallucinationRules, setHallucinationRules] = useState<HallucinationRule[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [forceToolForData, setForceToolForData] = useState(true);
  const [useTemplateForChat, setUseTemplateForChat] = useState(false);
  const [models, setModels] = useState<ModelConfig[]>([]);

  // 动态品种分类（用于生成幻觉防控规则默认值）
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // ---------- Prompt 版本 ----------
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  // ---------- 测试连接 ----------
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // ---------- 弹窗状态 ----------
  const [rollbackModal, setRollbackModal] = useState<{
    open: boolean;
    version: PromptVersion | null;
  }>({ open: false, version: null });
  const [saveConfirmModal, setSaveConfirmModal] = useState(false);

  // ---------- 开场白预览模态 ----------
  const [welcomePreviewOpen, setWelcomePreviewOpen] = useState(false);

  // ---------- 原始数据快照（用于 dirty 检测） ----------
  const originalValues = useRef<string>("");

  // ---------- 加载数据 ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const config = await getAgentConfig();
        if (cancelled) return;

        setPrimaryModel(config.primaryModel ?? "");
        setBackupModel(config.backupModel ?? "");
        setTemperature(config.temperature ?? 0.1);
        setMaxTokens(config.maxTokens ?? 2048);
        setTimeout_(config.timeout ?? 30);
        setContextTurns(config.contextTurns ?? 5);
        setApiKey(config.apiKey ?? "");
        setSystemPrompt(config.systemPrompt ?? "");
        setWelcomeMessage(config.welcomeMessage ?? "");
        setQuickCommands(Array.isArray(config.quickCommands) ? [...config.quickCommands] : []);
        setHallucinationRules(Array.isArray(config.hallucinationRules) ? [...config.hallucinationRules] : []);
        setDisclaimer(config.disclaimer ?? "");
        setForceToolForData(config.forceToolForData ?? true);
        setUseTemplateForChat(config.useTemplateForChat ?? false);
        setModels(Array.isArray(config.models) ? [...config.models] : []);
        // 保存原始快照
        originalValues.current = JSON.stringify({
          primaryModel: config.primaryModel,
          backupModel: config.backupModel,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          timeout: config.timeout,
          contextTurns: config.contextTurns,
          apiKey: config.apiKey,
          systemPrompt: config.systemPrompt,
          welcomeMessage: config.welcomeMessage,
          quickCommands: config.quickCommands,
          hallucinationRules: config.hallucinationRules,
          disclaimer: config.disclaimer,
          forceToolForData: config.forceToolForData,
          useTemplateForChat: config.useTemplateForChat,
          models: config.models,
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError("加载配置失败，请刷新重试");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // 加载动态品种分类
  useEffect(() => {
    getPublicCategories()
      .then((data) => {
        const names = [
          ...flattenCategoryNames(data.spot),
          ...flattenCategoryNames(data.futures),
        ];
        setAvailableCategories(names);
      })
      .catch(() => {
        // 静默失败，保持空数组
      });
  }, []);

  // 当 categories 加载且 hallucinationRules 为空时，自动生成默认规则
  useEffect(() => {
    if (availableCategories.length > 0 && hallucinationRules.length === 0) {
      const defaultRules: HallucinationRule[] = availableCategories.map((catName, i) => ({
        id: `hr-${i + 1}`,
        category: catName,
        minPrice: 3000,
        maxPrice: 8000,
      }));
      setHallucinationRules(defaultRules);
    }
  }, [availableCategories, hallucinationRules.length]);

  // ---------- Dirty 检测 ----------
  useEffect(() => {
    const current = JSON.stringify({
      primaryModel,
      backupModel,
      temperature,
      maxTokens,
      timeout,
      contextTurns,
      apiKey,
      systemPrompt,
      welcomeMessage,
      quickCommands,
      hallucinationRules,
      disclaimer,
      forceToolForData,
      useTemplateForChat,
      models,
    });
    setDirty(current !== originalValues.current);
  }, [
    primaryModel, backupModel, temperature, maxTokens, timeout, contextTurns, apiKey,
    systemPrompt, welcomeMessage, quickCommands, hallucinationRules,
    disclaimer, forceToolForData, useTemplateForChat, models,
  ]);

  // ---------- 页面离开拦截 ----------
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // ---------- 构建保存用的 config 对象 ----------
  const buildConfig = useCallback((): AgentConfig => ({
    primaryModel,
    backupModel,
    temperature,
    maxTokens,
    apiKey,
    timeout,
    contextTurns,
    systemPrompt,
    welcomeMessage,
    quickCommands: quickCommands.map((qc, i) => ({ ...qc, order: i + 1 })),
    hallucinationRules,
    disclaimer,
    forceToolForData,
    useTemplateForChat,
    models,
  }), [
    primaryModel, backupModel, temperature, maxTokens, apiKey, timeout,
    contextTurns,
    systemPrompt, welcomeMessage, quickCommands, hallucinationRules,
    disclaimer, forceToolForData, useTemplateForChat, models,
  ]);

  // ---------- 保存 ----------
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveAgentConfig(buildConfig());
      originalValues.current = JSON.stringify({
        primaryModel, backupModel, temperature, maxTokens, timeout, contextTurns, apiKey,
        systemPrompt, welcomeMessage, quickCommands, hallucinationRules,
        disclaimer, forceToolForData, useTemplateForChat, models,
      });
      setDirty(false);
      showSuccessToast("保存成功");
    } catch {
      showErrorToast("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }, [buildConfig, primaryModel, backupModel, temperature, maxTokens, timeout, contextTurns, apiKey, systemPrompt, welcomeMessage, quickCommands, hallucinationRules, disclaimer, forceToolForData, useTemplateForChat, models]);

  // ---------- 测试连接 ----------
  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const selectedModel = models.find((m) => m.id === primaryModel);
      const result = await testModelConnection({
        apiKey: apiKey || selectedModel?.apiKey || "",
        baseUrl: selectedModel?.baseUrl || "",
        model: selectedModel?.name || primaryModel,
      });
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: "连接测试失败，请检查网络与 API Key" });
    } finally {
      setTesting(false);
    }
  }, [primaryModel, apiKey, models]);

  // ---------- 加载 Prompt 版本 ----------
  const loadPromptVersions = useCallback(async () => {
    setVersionLoading(true);
    try {
      const versions = await getPromptVersions();
      setPromptVersions(versions);
    } catch {
      showErrorToast("加载版本历史失败");
    } finally {
      setVersionLoading(false);
    }
  }, []);

  // ---------- 恢复默认 System Prompt ----------
  const handleResetSystemPrompt = useCallback(() => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  }, []);

  // ---------- 恢复默认开场白 ----------
  const handleResetWelcome = useCallback(() => {
    setWelcomeMessage(DEFAULT_WELCOME_MESSAGE);
  }, []);

  // ---------- 版本操作 ----------
  const handleVersionView = useCallback((version: PromptVersion) => {
    setSystemPrompt(version.content ?? "");
    showSuccessToast(`已查看版本 ${version.version}`);
  }, []);

  const handleVersionRollback = useCallback((version: PromptVersion) => {
    setRollbackModal({ open: true, version });
  }, []);

  const confirmRollback = useCallback(() => {
    if (rollbackModal.version) {
      setSystemPrompt(rollbackModal.version.content ?? "");
      showSuccessToast(`已回滚到 ${rollbackModal.version.version}`);
      setRollbackModal({ open: false, version: null });
    }
  }, [rollbackModal.version]);

  // ---------- 快捷指令操作 ----------
  const handleAddQuickCommand = useCallback(() => {
    if (quickCommands.length >= 6) {
      showErrorToast("最多只能添加 6 个快捷指令");
      return;
    }
    const newId = `qc-${Date.now()}`;
    setQuickCommands((prev) => [
      ...prev,
      { id: newId, icon: "Search", label: "", prompt: "", order: prev.length + 1 },
    ]);
  }, [quickCommands]);

  const handleUpdateQuickCommand = useCallback(
    (id: string, field: keyof QuickCommand, value: string) => {
      setQuickCommands((prev) =>
        prev.map((qc) => (qc.id === id ? { ...qc, [field]: value } : qc)),
      );
    },
    [],
  );

  const handleDeleteQuickCommand = useCallback((id: string) => {
    setQuickCommands((prev) =>
      prev.filter((qc) => qc.id !== id).map((qc, i) => ({ ...qc, order: i + 1 })),
    );
  }, []);

  const handleMoveQuickCommand = useCallback((id: string, direction: "up" | "down") => {
    setQuickCommands((prev) => {
      const index = prev.findIndex((qc) => qc.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;

      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((qc, i) => ({ ...qc, order: i + 1 }));
    });
  }, []);

  // ---------- 幻觉防控规则操作 ----------
  const handleAddHallucinationRule = useCallback(() => {
    const newId = `hr-${Date.now()}`;
    setHallucinationRules((prev) => [
      ...prev,
      { id: newId, category: "", minPrice: 0, maxPrice: 0 },
    ]);
  }, []);

  const handleUpdateHallucinationRule = useCallback(
    (id: string, field: keyof HallucinationRule, value: string | number) => {
      setHallucinationRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const handleDeleteHallucinationRule = useCallback((id: string) => {
    setHallucinationRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ---------- 模型配置操作 ----------
  const handleAddModel = useCallback(() => {
    const newId = `m-${Date.now()}`;
    setModels((prev) => [
      ...prev,
      { id: newId, name: "", baseUrl: "", apiKey: "" },
    ]);
  }, []);

  const handleUpdateModel = useCallback(
    (id: string, field: keyof ModelConfig, value: string) => {
      setModels((prev) =>
        prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
      );
    },
    [],
  );

  const handleDeleteModel = useCallback((id: string) => {
    setModels((prev) => {
      const next = prev.filter((m) => m.id !== id);
      return next;
    });
  }, []);

  // 从 models 列表构建下拉选项
  const modelOptions = useMemo(() => {
    return models.map((m) => ({
      value: m.id,
      label: m.name || "(未命名模型)",
    }));
  }, [models]);

  // ---------- System Prompt 字符数 / Token 估算 ----------
  const promptStats = useMemo(() => {
    const charCount = (systemPrompt ?? "").length;
    const estimatedTokens = Math.ceil(charCount / 2.5);
    return { charCount, estimatedTokens };
  }, [systemPrompt]);

  const promptLines = useMemo(() => (systemPrompt ?? "").split("\n"), [systemPrompt]);

  // ---------- 渲染加载态 ----------
  if (loading) {
    return (
      <AdminPageShell
        title="Agent配置"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "Agent管理" },
          { label: "Agent配置" },
        ]}
      >
        <div className="space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-[#E5E5E5] rounded-2xl p-5 space-y-4 animate-pulse"
            >
              <div className="h-6 w-48 bg-[#E5E5E5] rounded" />
              <div className="h-10 w-full bg-[#E5E5E5] rounded-md" />
              <div className="h-10 w-3/4 bg-[#E5E5E5] rounded-md" />
              <div className="h-10 w-1/2 bg-[#E5E5E5] rounded-md" />
            </div>
          ))}
        </div>
      </AdminPageShell>
    );
  }

  // ---------- 渲染错误态 ----------
  if (loadError) {
    const handleRetry = () => window.location.reload();
    return (
      <AdminPageShell
        title="Agent配置"
        breadcrumbs={[
          { label: "首页", path: "/admin" },
          { label: "Agent管理" },
          { label: "Agent配置" },
        ]}
      >
        <div
          className={cn(
            "bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-6",
            "flex flex-col items-center gap-3",
          )}
        >
          <XCircle size={24} strokeWidth={1.75} className="text-[#B42318]" />
          <p className="text-[14px] leading-[1.6] text-[#B42318]">{loadError}</p>
          <p className="text-[12px] leading-[1.5] text-[#737373]">
            请确认后端服务已启动（端口 8081），然后重试
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className={cn(
              "mt-1 px-4 py-2 rounded-full",
              "bg-[#0A0A0A] text-white text-[13px] leading-[1.5]",
              "hover:bg-[#404040] transition-colors duration-150",
            )}
          >
            重新加载
          </button>
        </div>
      </AdminPageShell>
    );
  }

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <AdminPageShell
      title="Agent配置"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "Agent管理" },
        { label: "Agent配置" },
      ]}
      actions={
        <Button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "h-9 px-5 rounded-full text-[13px] leading-[1.5] font-medium",
            "transition-all duration-150",
            dirty
              ? "bg-[#0A0A0A] text-white hover:bg-[#404040]"
              : "border border-[#E5E5E5] text-[#404040] bg-white hover:bg-[#FAFAFA]",
          )}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              保存中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save size={14} strokeWidth={1.75} />
              保存配置
            </span>
          )}
        </Button>
      }
    >
      <div className="space-y-5 pb-8">

        {/* ================================================== */}
        {/* 1. AI模型配置 */}
        {/* ================================================== */}
        <SectionCard title="AI模型配置">
          {/* 第一行：主力模型 + 备选模型 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <FieldLabel htmlFor="primaryModel">主力模型</FieldLabel>
              <Select value={primaryModel} onValueChange={setPrimaryModel}>
                <SelectTrigger id="primaryModel" variant="filter">
                  <SelectValue placeholder="选择主力模型" />
                </SelectTrigger>
                <SelectContent variant="filter">
                  {modelOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="backupModel">备选模型</FieldLabel>
              <Select value={backupModel} onValueChange={setBackupModel}>
                <SelectTrigger id="backupModel" variant="filter">
                  <SelectValue placeholder="选择备选模型" />
                </SelectTrigger>
                <SelectContent variant="filter">
                  {modelOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 第二行：温度参数 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] leading-[1.5] text-[#404040] font-medium">
                温度参数
              </span>
              <span className="text-[12px] leading-[1.5] text-[#737373] tabular-nums">
                {temperature.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#A3A3A3] w-4 text-right tabular-nums">0</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className={cn(
                  "flex-1 h-4 appearance-none bg-[#E5E5E5] rounded-full outline-none cursor-pointer",
                  "[&::-webkit-slider-thumb]:appearance-none",
                  "[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
                  "[&::-webkit-slider-thumb]:rounded-full",
                  "[&::-webkit-slider-thumb]:bg-[#0A0A0A]",
                  "[&::-webkit-slider-thumb]:cursor-pointer",
                  "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100",
                  "[&::-webkit-slider-thumb]:hover:scale-110",
                )}
              />
              <span className="text-[11px] text-[#A3A3A3] w-4 tabular-nums">1</span>
            </div>
          </div>

          {/* 第三行：最大Token + 超时 + API Key */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <FieldLabel htmlFor="maxTokens">最大Token</FieldLabel>
              <Input
                id="maxTokens"
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className={cn(
                  "h-10 rounded-[10px] border-[#E5E5E5]",
                  "text-[14px] text-[#404040] placeholder:text-[#A3A3A3]",
                  "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                )}
              />
            </div>
            <div>
              <FieldLabel htmlFor="timeout">响应超时(秒)</FieldLabel>
              <Input
                id="timeout"
                type="number"
                value={timeout}
                onChange={(e) => setTimeout_(Number(e.target.value))}
                className={cn(
                  "h-10 rounded-[10px] border-[#E5E5E5]",
                  "text-[14px] text-[#404040] placeholder:text-[#A3A3A3]",
                  "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                )}
              />
            </div>
            <div>
              <FieldLabel htmlFor="apiKey">API Key</FieldLabel>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={cn(
                    "h-10 rounded-[10px] border-[#E5E5E5] pr-10",
                    "text-[14px] text-[#404040] placeholder:text-[#A3A3A3]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2",
                    "text-[#A3A3A3] hover:text-[#404040]",
                    "transition-colors duration-150",
                  )}
                  aria-label={showApiKey ? "隐藏 API Key" : "显示 API Key"}
                >
                  {showApiKey ? (
                    <EyeOff size={16} strokeWidth={1.75} />
                  ) : (
                    <Eye size={16} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 上下文轮数 */}
          <div className="mb-4">
            <FieldLabel htmlFor="contextTurns">上下文轮数</FieldLabel>
            <p className="text-[11px] leading-[1.5] text-[#A3A3A3] mb-2">
              控制每次对话携带的历史消息轮数，越大上下文越全但 Token 消耗越高
            </p>
            <Select
              value={String(contextTurns)}
              onValueChange={(v) => setContextTurns(Number(v))}
            >
              <SelectTrigger id="contextTurns" variant="filter" className="w-[140px]">
                <SelectValue placeholder="选择轮数" />
              </SelectTrigger>
              <SelectContent variant="filter">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-[13px]">
                    {n} 轮
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 测试连接 */}
          <div className="flex items-center gap-3 pt-2 border-t border-[#E5E5E5]">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
              className={cn(
                "h-9 px-4 rounded-full",
                "border border-[#E5E5E5] text-[#0A0A0A]",
                "text-[13px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
              )}
            >
              {testing ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                  测试中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} strokeWidth={1.75} />
                  测试连接
                </span>
              )}
            </Button>

            {testResult && (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-[12px] leading-[1.5]",
                  testResult.success ? "text-[#1F7A4D]" : "text-[#B42318]",
                )}
              >
                {testResult.success ? (
                  <CheckCircle2 size={14} strokeWidth={1.75} />
                ) : (
                  <XCircle size={14} strokeWidth={1.75} />
                )}
                {testResult.message}
              </span>
            )}
          </div>
        </SectionCard>

        {/* ================================================== */}
        {/* 1.5 模型管理 */}
        {/* ================================================== */}
        <SectionCard
          title="模型管理"
          rightAction={
            <span className="text-[11px] text-[#737373]">
              {models.length} 个模型
            </span>
          }
        >
          {models.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[13px] text-[#A3A3A3] mb-3">
                尚未添加任何模型，请添加后选择主力和备选模型
              </p>
              <Button
                variant="outline"
                onClick={handleAddModel}
                className={cn(
                  "h-8 px-3 rounded-full",
                  "border border-dashed border-[#D4D4D4] text-[#737373]",
                  "text-[12px] leading-[1.5]",
                  "hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
                  "transition-colors duration-150",
                )}
              >
                <Plus size={12} strokeWidth={1.75} className="mr-1" />
                添加模型
              </Button>
            </div>
          ) : (
            <>
              {/* 表头 */}
              <div
                className={cn(
                  "grid grid-cols-[1fr_250px_280px_60px] gap-3 mb-2",
                  "px-1 text-[11px] leading-[1.5] text-[#737373]",
                )}
              >
                <span>模型名称</span>
                <span>API URL</span>
                <span>API Key</span>
                <span />
              </div>

              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={cn(
                      "grid grid-cols-[1fr_250px_280px_60px] gap-3 items-center",
                      "p-3 rounded-[10px]",
                      "border border-[#E5E5E5] bg-white",
                    )}
                  >
                    <Input
                      value={model.name}
                      onChange={(e) =>
                        handleUpdateModel(model.id, "name", e.target.value)
                      }
                      placeholder="例如：GPT-4o-mini"
                      className={cn(
                        "h-9 rounded-[6px] border-[#E5E5E5]",
                        "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                        "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                      )}
                    />
                    <Input
                      value={model.baseUrl}
                      onChange={(e) =>
                        handleUpdateModel(model.id, "baseUrl", e.target.value)
                      }
                      placeholder="https://api.openai.com/v1"
                      className={cn(
                        "h-9 rounded-[6px] border-[#E5E5E5]",
                        "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                        "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                      )}
                    />
                    <div className="relative">
                      <Input
                        type="password"
                        value={model.apiKey}
                        onChange={(e) =>
                          handleUpdateModel(model.id, "apiKey", e.target.value)
                        }
                        placeholder="sk-..."
                        className={cn(
                          "h-9 rounded-[6px] border-[#E5E5E5] pr-8",
                          "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                          "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                        )}
                      />
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteModel(model.id)}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-[6px]",
                          "text-[#A3A3A3] hover:text-[#B42318] hover:bg-[#FEF2F2]",
                          "transition-colors duration-150",
                        )}
                        aria-label="删除模型"
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleAddModel}
                className={cn(
                  "mt-3 h-8 px-3 rounded-full",
                  "border border-dashed border-[#D4D4D4] text-[#737373]",
                  "text-[12px] leading-[1.5]",
                  "hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
                  "transition-colors duration-150",
                )}
              >
                <Plus size={12} strokeWidth={1.75} className="mr-1" />
                添加模型
              </Button>
            </>
          )}
        </SectionCard>

        {/* ================================================== */}
        {/* 2. 系统Prompt编辑 */}
        {/* ================================================== */}
        <SectionCard
          title="系统Prompt"
          rightAction={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPromptVersions}
                  className={cn(
                    "h-8 px-3 rounded-full",
                    "border border-[#E5E5E5] text-[#404040]",
                    "text-[12px] leading-[1.5]",
                    "hover:bg-[#FAFAFA]",
                    "transition-colors duration-150",
                  )}
                >
                  版本管理
                  <ChevronDownIcon size={12} strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-[#E5E5E5] rounded-[10px] min-w-[180px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                {versionLoading ? (
                  <div className="px-3 py-4 text-center text-[12px] text-[#737373]">
                    加载中...
                  </div>
                ) : promptVersions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[12px] text-[#A3A3A3]">
                    暂无版本历史
                  </div>
                ) : (
                  promptVersions.map((v) => (
                    <DropdownMenuItem
                      key={v.version}
                      onClick={() => handleVersionView(v)}
                      className="text-[13px] text-[#404040] cursor-pointer"
                    >
                      <span className="flex items-center justify-between w-full">
                        <span>{v.version}</span>
                        <span className="flex items-center gap-3 text-[11px] text-[#737373]">
                          {v.editor}
                          {v.isCurrent && (
                            <span className="text-[11px] text-[#1F7A4D]">(当前)</span>
                          )}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        >
          {/* 代码编辑器外观的 Textarea */}
          <div className="relative border border-[#E5E5E5] rounded-[10px] overflow-hidden">
            {/* 顶部栏（模拟编辑器标题栏） */}
            <div
              className={cn(
                "flex items-center justify-between",
                "px-4 py-2",
                "bg-[#1E1E1E]",
                "text-[11px] text-[#A3A3A3]",
              )}
            >
              <span className="tracking-[0.02em]">system_prompt.txt</span>
              <span>{promptLines.length} 行</span>
            </div>

            {/* 编辑器主体：行号 + 代码区域 */}
            <div className="flex bg-[#0A0A0A] min-h-[240px]">
              {/* 行号列 */}
              <div
                className={cn(
                  "select-none py-3 pl-4 pr-3",
                  "bg-[#0D0D0D]",
                  "text-right text-[11px] leading-[1.7] text-[#525252]",
                  "font-mono",
                )}
                aria-hidden="true"
              >
                {promptLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* 编辑区域 */}
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className={cn(
                  "flex-1 py-3 pr-4 pl-3",
                  "bg-transparent border-0 rounded-none",
                  "text-[13px] leading-[1.7] text-[#E5E5E5]",
                  "font-mono",
                  "resize-y min-h-[240px]",
                  "placeholder:text-[#525252]",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "selection:bg-[#264F78]",
                )}
                placeholder="输入系统 Prompt..."
                style={{ caretColor: "#E5E5E5" }}
              />
            </div>
          </div>

          {/* 底部信息栏 */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[12px] leading-[1.5] text-[#737373] tabular-nums">
              字符数：{promptStats.charCount} Token估算：~{promptStats.estimatedTokens}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWelcomePreviewOpen(true)}
                className={cn(
                  "h-8 px-3 rounded-full",
                  "border border-[#E5E5E5] text-[#404040]",
                  "text-[12px] leading-[1.5]",
                  "hover:bg-[#FAFAFA]",
                  "transition-colors duration-150",
                )}
              >
                <Play size={12} strokeWidth={1.75} className="mr-1" />
                预览效果
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSystemPrompt}
                className={cn(
                  "h-8 px-3 rounded-full",
                  "border border-[#E5E5E5] text-[#404040]",
                  "text-[12px] leading-[1.5]",
                  "hover:bg-[#FAFAFA]",
                  "transition-colors duration-150",
                )}
              >
                <RotateCcw size={12} strokeWidth={1.75} className="mr-1" />
                恢复默认
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* ================================================== */}
        {/* 3. 开场白配置 */}
        {/* ================================================== */}
        <SectionCard
          title="开场白配置"
          rightAction={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWelcomePreviewOpen(true)}
              className={cn(
                "h-8 px-3 rounded-full",
                "border border-[#E5E5E5] text-[#404040]",
                "text-[12px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
              )}
            >
              <Play size={12} strokeWidth={1.75} className="mr-1" />
              预览效果
            </Button>
          }
        >
          {/* 欢迎语 */}
          <div className="mb-5">
            <FieldLabel htmlFor="welcomeMessage">欢迎语文案</FieldLabel>
            <Textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className={cn(
                "h-20 rounded-[10px] border-[#E5E5E5]",
                "text-[14px] leading-[1.6] text-[#404040]",
                "placeholder:text-[#A3A3A3]",
                "resize-y",
                "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
              )}
              placeholder={"支持变量替换：{用户昵称}、{当前日期}、{关注品种}"}
            />
          </div>

          {/* 快捷指令按钮配置 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] leading-[1.5] text-[#404040] font-medium">
                快捷指令按钮配置
              </label>
              <span className="text-[11px] text-[#A3A3A3]">
                {quickCommands.length}/6
              </span>
            </div>

            <div className="space-y-2">
              {quickCommands.map((qc) => (
                <div
                  key={qc.id}
                  className={cn(
                    "flex items-center gap-2",
                    "p-3 rounded-[10px]",
                    "border border-[#E5E5E5] bg-white",
                  )}
                >
                  {/* 图标选择 */}
                  <Select
                    value={qc.icon}
                    onValueChange={(v) => handleUpdateQuickCommand(qc.id, "icon", v)}
                  >
                    <SelectTrigger variant="filter" className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent variant="filter">
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 按钮文字 */}
                  <Input
                    value={qc.label}
                    onChange={(e) =>
                      handleUpdateQuickCommand(qc.id, "label", e.target.value)
                    }
                    placeholder="按钮文字"
                    maxLength={6}
                    className={cn(
                      "flex-1 h-9 rounded-[6px] border-[#E5E5E5]",
                      "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                      "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                    )}
                  />

                  {/* 指令内容 */}
                  <Input
                    value={qc.prompt}
                    onChange={(e) =>
                      handleUpdateQuickCommand(qc.id, "prompt", e.target.value)
                    }
                    placeholder="点击后发送的指令"
                    className={cn(
                      "flex-[2] h-9 rounded-[6px] border-[#E5E5E5]",
                      "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                      "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                    )}
                  />

                  {/* 上移/下移 */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveQuickCommand(qc.id, "up")}
                      className={cn(
                        "w-6 h-5 flex items-center justify-center rounded-[4px]",
                        "text-[#A3A3A3] hover:text-[#404040] hover:bg-[#FAFAFA]",
                        "transition-colors duration-150",
                      )}
                      aria-label="上移"
                    >
                      <ChevronUp size={12} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveQuickCommand(qc.id, "down")}
                      className={cn(
                        "w-6 h-5 flex items-center justify-center rounded-[4px]",
                        "text-[#A3A3A3] hover:text-[#404040] hover:bg-[#FAFAFA]",
                        "transition-colors duration-150",
                      )}
                      aria-label="下移"
                    >
                      <ChevronDown size={12} strokeWidth={1.75} />
                    </button>
                  </div>

                  {/* 拖拽手柄 */}
                  <GripHorizontal
                    size={14}
                    strokeWidth={1.75}
                    className="text-[#D4D4D4] mx-0.5 cursor-grab"
                    aria-hidden="true"
                  />

                  {/* 删除 */}
                  <button
                    type="button"
                    onClick={() => handleDeleteQuickCommand(qc.id)}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-[6px]",
                      "text-[#A3A3A3] hover:text-[#B42318] hover:bg-[#FEF2F2]",
                      "transition-colors duration-150",
                    )}
                    aria-label="删除快捷指令"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>

            {/* 添加快捷指令按钮 */}
            <Button
              variant="outline"
              onClick={handleAddQuickCommand}
              disabled={quickCommands.length >= 6}
              className={cn(
                "mt-2 h-8 px-3 rounded-full",
                "border border-dashed border-[#D4D4D4] text-[#737373]",
                "text-[12px] leading-[1.5]",
                "hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
                "transition-colors duration-150",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              <Plus size={12} strokeWidth={1.75} className="mr-1" />
              添加快捷指令
            </Button>
          </div>

          {/* 欢迎语恢复默认 */}
          <div className="flex items-center justify-end pt-3 border-t border-[#E5E5E5]">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetWelcome}
              className={cn(
                "h-8 px-3 rounded-full",
                "border border-[#E5E5E5] text-[#404040]",
                "text-[12px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
              )}
            >
              <RotateCcw size={12} strokeWidth={1.75} className="mr-1" />
              恢复默认
            </Button>
          </div>
        </SectionCard>

        {/* ================================================== */}
        {/* 4. 幻觉防控规则 */}
        {/* ================================================== */}
        <SectionCard title="幻觉防控规则">
          <div className="space-y-3">
            {/* 表头 */}
            <div
              className={cn(
                "grid grid-cols-[1fr_120px_120px_60px] gap-3",
                "px-1 text-[11px] leading-[1.5] text-[#737373]",
              )}
            >
              <span>品种</span>
              <span className="text-right tabular-nums">最低价(元/吨)</span>
              <span className="text-right tabular-nums">最高价(元/吨)</span>
              <span />
            </div>

            {hallucinationRules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "grid grid-cols-[1fr_120px_120px_60px] gap-3 items-center",
                  "p-3 rounded-[10px]",
                  "border border-[#E5E5E5] bg-white",
                )}
              >
                <Input
                  value={rule.category}
                  onChange={(e) =>
                    handleUpdateHallucinationRule(rule.id, "category", e.target.value)
                  }
                  placeholder="品种名称"
                  className={cn(
                    "h-9 rounded-[6px] border-[#E5E5E5]",
                    "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                  )}
                />
                <Input
                  type="number"
                  value={rule.minPrice}
                  onChange={(e) =>
                    handleUpdateHallucinationRule(rule.id, "minPrice", Number(e.target.value))
                  }
                  className={cn(
                    "h-9 rounded-[6px] border-[#E5E5E5] text-right",
                    "text-[13px] text-[#404040]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                  )}
                />
                <Input
                  type="number"
                  value={rule.maxPrice}
                  onChange={(e) =>
                    handleUpdateHallucinationRule(rule.id, "maxPrice", Number(e.target.value))
                  }
                  className={cn(
                    "h-9 rounded-[6px] border-[#E5E5E5] text-right",
                    "text-[13px] text-[#404040]",
                    "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                  )}
                />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteHallucinationRule(rule.id)}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-[6px]",
                      "text-[#A3A3A3] hover:text-[#B42318] hover:bg-[#FEF2F2]",
                      "transition-colors duration-150",
                    )}
                    aria-label="删除规则"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleAddHallucinationRule}
            className={cn(
              "mt-3 h-8 px-3 rounded-full",
              "border border-dashed border-[#D4D4D4] text-[#737373]",
              "text-[12px] leading-[1.5]",
              "hover:border-[#0A0A0A] hover:text-[#0A0A0A]",
              "transition-colors duration-150",
            )}
          >
            <Plus size={12} strokeWidth={1.75} className="mr-1" />
            添加规则
          </Button>
        </SectionCard>

        {/* ================================================== */}
        {/* 5. 免责声明与对话行为 */}
        {/* ================================================== */}
        <SectionCard title="免责声明与对话行为">
          {/* 免责声明 */}
          <div className="mb-5">
            <FieldLabel htmlFor="disclaimer">免责声明确认文案</FieldLabel>
            <Textarea
              id="disclaimer"
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              className={cn(
                "h-20 rounded-[10px] border-[#E5E5E5]",
                "text-[14px] leading-[1.6] text-[#404040]",
                "placeholder:text-[#A3A3A3]",
                "resize-y",
                "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
              )}
            />
          </div>

          {/* 对话行为开关 */}
          <div className="space-y-3 pt-3 border-t border-[#E5E5E5]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] leading-[1.5] text-[#404040] font-medium">
                  价格数据强制使用工具获取
                </span>
                <p className="text-[11px] leading-[1.5] text-[#A3A3A3] mt-0.5">
                  禁止模型编造价格数据，所有价格必须通过 Function Calling 获取
                </p>
              </div>
              <Switch
                checked={forceToolForData}
                onCheckedChange={setForceToolForData}
                className={cn(
                  "data-[state=checked]:bg-[#0A0A0A]",
                  "data-[state=unchecked]:bg-[#CBCED4]",
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] leading-[1.5] text-[#404040] font-medium">
                  使用开场白模板
                </span>
                <p className="text-[11px] leading-[1.5] text-[#A3A3A3] mt-0.5">
                  新会话自动发送欢迎语
                </p>
              </div>
              <Switch
                checked={useTemplateForChat}
                onCheckedChange={setUseTemplateForChat}
                className={cn(
                  "data-[state=checked]:bg-[#0A0A0A]",
                  "data-[state=unchecked]:bg-[#CBCED4]",
                )}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ================================================== */}
      {/* Preview 弹窗：预览开场白 */}
      {/* ================================================== */}
      <AdminModal
        open={welcomePreviewOpen}
        onOpenChange={setWelcomePreviewOpen}
        title="开场白预览"
        size="md"
      >
        <div className="space-y-4">
          {/* 模拟对话界面 */}
          <div
            className={cn(
              "bg-[#FAFAFA] border border-[#E5E5E5] rounded-2xl rounded-tl-sm",
              "p-4 max-w-[85%]",
            )}
          >
            <p className="text-[15px] leading-[1.6] text-[#404040] whitespace-pre-wrap">
              {welcomeMessage || "(未配置欢迎语)"}
            </p>
          </div>

          {/* 快捷指令预览 */}
          {quickCommands.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-2">
              {quickCommands.map((qc) => (
                <span
                  key={qc.id}
                  className={cn(
                    "inline-flex items-center gap-1.5",
                    "px-3 py-1.5 rounded-full",
                    "border border-[#E5E5E5]",
                    "text-[13px] leading-[1.5] text-[#404040]",
                  )}
                >
                  <span className="text-[#A3A3A3]">{qc.icon}</span>
                  {qc.label || "(空)"}
                </span>
              ))}
            </div>
          )}

          {/* 免责声明预览 */}
          {disclaimer && (
            <p className="text-[11px] leading-[1.5] text-[#A3A3A3] pt-2 border-t border-[#E5E5E5]">
              {disclaimer}
            </p>
          )}
        </div>
      </AdminModal>

      {/* ================================================== */}
      {/* 回滚确认弹窗 */}
      {/* ================================================== */}
      <AdminModal
        open={rollbackModal.open}
        onOpenChange={(open) =>
          setRollbackModal(open ? rollbackModal : { open: false, version: null })
        }
        title="确认回滚"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[14px] leading-[1.6] text-[#404040]">
            确认将系统 Prompt 回滚到{" "}
            <span className="font-medium text-[#0A0A0A]">
              {rollbackModal.version?.version}
            </span>
            ？
          </p>
          <p className="text-[12px] leading-[1.5] text-[#A3A3A3]">
            当前未保存的修改将丢失。建议先保存当前配置。
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setRollbackModal({ open: false, version: null })}
              className={cn(
                "h-9 px-5 rounded-full",
                "border border-[#E5E5E5] text-[#0A0A0A]",
                "text-[13px] leading-[1.5]",
                "hover:bg-[#FAFAFA]",
                "transition-colors duration-150",
              )}
            >
              取消
            </Button>
            <Button
              onClick={confirmRollback}
              className={cn(
                "h-9 px-5 rounded-full",
                "bg-[#0A0A0A] text-white",
                "text-[13px] leading-[1.5]",
                "hover:bg-[#404040]",
                "transition-colors duration-150",
              )}
            >
              <Undo2 size={14} strokeWidth={1.75} className="mr-1" />
              确认回滚
            </Button>
          </div>
        </div>
      </AdminModal>
    </AdminPageShell>
  );
}