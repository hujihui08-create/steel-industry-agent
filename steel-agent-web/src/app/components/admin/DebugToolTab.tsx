import React, { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Play,
  RotateCcw,
  Activity,
  Download,
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  AlertTriangle,
  Zap,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminModal } from "./AdminModal";
import { AdminStatusBadge, type AdminStatusBadgeStatus } from "./AdminStatusBadge";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import {
  getToolSchemas,
  executeTool,
  getToolHealth,
  saveMockConfig,
  deleteMockConfig,
  type ToolSchema,
  type ToolParamProperty,
  type ToolHealthItem,
  type ToolHealthResult,
  type ToolExecuteResult,
  type CallChainStep,
} from "@/app/api/admin-debug";
import { getPublicCategories } from "@/app/api/admin";
import type { Category } from "@/app/types/admin";

// ============================================================
// 常量
// ============================================================

const MOCK_SCENARIOS = [
  { value: "normal", label: "正常返回", description: "返回标准格式数据" },
  { value: "empty", label: "空数据返回", description: "返回空数组或空对象" },
  { value: "error", label: "异常数据", description: "返回格式错误的数据" },
  { value: "timeout", label: "超时", description: "模拟接口超时" },
  { value: "unavailable", label: "服务不可用", description: "模拟服务宕机" },
];

const DEFAULT_MOCK_JSON: Record<string, string> = {
  normal: '{\n  "status": "success",\n  "data": { "message": "Mock 正常返回" }\n}',
  empty: '{\n  "status": "success",\n  "data": []\n}',
  error: '{\n  "status": "error",\n  "error": "Mock 异常数据"\n}',
  timeout: '{\n  "status": "error",\n  "error": "请求超时",\n  "timeout_ms": 30000\n}',
  unavailable: '{\n  "status": "error",\n  "error": "服务不可用",\n  "code": 503\n}',
};

// ============================================================
// 辅助函数
// ============================================================

function mapHealthToBadgeStatus(
  status: "normal" | "degraded" | "down",
): AdminStatusBadgeStatus {
  if (status === "degraded") return "degraded";
  if (status === "down") return "down";
  return "normal";
}

function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

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
// DebugToolTab
// ============================================================

export function DebugToolTab() {
  const [tools, setTools] = useState<ToolSchema[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolSchema | null>(null);
  const [selectedToolName, setSelectedToolName] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ToolExecuteResult | null>(null);
  const [healthResult, setHealthResult] = useState<ToolHealthResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockScenario, setMockScenario] = useState("normal");
  const [mockJson, setMockJson] = useState(DEFAULT_MOCK_JSON.normal);
  const [mockSaving, setMockSaving] = useState(false);

  // 动态品种分类
  const [availableCategories, setAvailableCategories] = useState<string[]>(["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"]);
  const categoriesRef = useRef<string[]>(["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"]);

  // 同步 ref
  useEffect(() => {
    if (availableCategories.length > 0) {
      categoriesRef.current = availableCategories;
    }
  }, [availableCategories]);

  // 加载工具列表
  useEffect(() => {
    getToolSchemas()
      .then(setTools)
      .catch(() => {
        const cats = categoriesRef.current;
        setTools([
          {
            name: "query_steel_price",
            displayName: "查询钢材价格",
            description: "查询指定钢材品种在指定地区的最新价格",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "钢材品种",
                  enum: cats,
                },
                spec: { type: "string", description: "规格型号" },
                region: { type: "string", description: "地区" },
              },
              required: ["category"],
            },
          },
          {
            name: "get_price_trend",
            displayName: "获取价格走势",
            description: "获取指定钢材品种的价格走势数据",
            parameters: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  description: "钢材品种",
                  enum: cats,
                },
                spec: { type: "string", description: "规格型号" },
                region: { type: "string", description: "地区" },
                days: { type: "number", description: "天数" },
              },
              required: ["category"],
            },
          },
          {
            name: "calculate_quotation",
            displayName: "计算报价",
            description: "计算钢材报价",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", description: "钢材品种" },
                spec: { type: "string", description: "规格" },
                quantity: { type: "number", description: "数量（吨）" },
                region: { type: "string", description: "地区" },
              },
              required: ["category", "quantity"],
            },
          },
          {
            name: "search_knowledge",
            displayName: "搜索知识库",
            description: "在知识库中搜索钢材标准、牌号对照等信息",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "搜索关键词" },
                type: {
                  type: "string",
                  description: "知识类型",
                  enum: ["standard", "grade", "term"],
                },
              },
              required: ["query"],
            },
          },
          {
            name: "query_tender",
            displayName: "查询招标信息",
            description: "查询钢材招标信息",
            parameters: {
              type: "object",
              properties: {
                keyword: { type: "string", description: "关键词" },
                region: { type: "string", description: "地区" },
                status: {
                  type: "string",
                  description: "状态",
                  enum: ["open", "closed"],
                },
              },
              required: [],
            },
          },
          {
            name: "set_price_alert",
            displayName: "设置价格预警",
            description: "设置钢材价格预警通知",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", description: "钢材品种" },
                targetPrice: { type: "number", description: "目标价格" },
                condition: {
                  type: "string",
                  description: "触发条件",
                  enum: ["above", "below"],
                },
              },
              required: ["category", "targetPrice", "condition"],
            },
          },
          {
            name: "convert_unit",
            displayName: "单位换算",
            description: "钢材单位换算工具",
            parameters: {
              type: "object",
              properties: {
                value: { type: "number", description: "数值" },
                fromUnit: { type: "string", description: "源单位" },
                toUnit: { type: "string", description: "目标单位" },
              },
              required: ["value", "fromUnit", "toUnit"],
            },
          },
          {
            name: "calculate_weight",
            displayName: "重量计算",
            description: "计算钢材理论重量",
            parameters: {
              type: "object",
              properties: {
                spec: { type: "string", description: "规格" },
                length: { type: "number", description: "长度（米）" },
                quantity: { type: "number", description: "数量" },
              },
              required: ["spec", "length"],
            },
          },
        ]);
      });
  }, []);

  // 加载动态品种分类
  useEffect(() => {
    getPublicCategories()
      .then((data) => {
        const names = [
          ...flattenCategoryNames(data.spot),
          ...flattenCategoryNames(data.futures),
        ];
        setAvailableCategories(names.length > 0 ? names : ["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"]);
      })
      .catch(() => {
        setAvailableCategories(["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"]);
      });
  }, []);

  // 选择工具
  const handleToolSelect = useCallback(
    (name: string) => {
      setSelectedToolName(name);
      const tool = tools.find((t) => t.name === name) || null;
      setSelectedTool(tool);
      setParams({});
      setErrors({});
      setExecuteResult(null);
    },
    [tools],
  );

  // 参数变更
  const handleParamChange = useCallback(
    (key: string, value: string) => {
      setParams((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  // 校验参数
  const validateParams = useCallback((): boolean => {
    if (!selectedTool) return false;
    const required = selectedTool.parameters.required || [];
    const newErrors: Record<string, string> = {};

    for (const key of required) {
      if (!params[key]?.trim()) {
        newErrors[key] = `${selectedTool.parameters.properties[key]?.description || key} 为必填项`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedTool, params]);

  // 执行工具
  const handleExecute = useCallback(async () => {
    if (!selectedTool || !validateParams()) return;

    setExecuting(true);
    setExecuteResult(null);

    try {
      const typedParams: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        const prop = selectedTool.parameters.properties[key];
        if (prop?.type === "number") {
          typedParams[key] = Number(value);
        } else if (prop?.type === "boolean") {
          typedParams[key] = value === "true";
        } else {
          typedParams[key] = value;
        }
      }

      const result = await executeTool(selectedTool.name, typedParams, false);
      setExecuteResult(result);
      showSuccessToast("工具执行成功");
    } catch (err) {
      const errorResult: ToolExecuteResult = {
        status: "error",
        result: { error: err instanceof Error ? err.message : "执行失败" },
        chain: [
          { step: "参数校验", status: "success", durationMs: 2 },
          { step: "执行调用", status: "error", durationMs: 0, detail: err instanceof Error ? err.message : "未知错误" },
        ],
        durationMs: 0,
      };
      setExecuteResult(errorResult);
      showErrorToast(err instanceof Error ? err.message : "工具执行失败");
    }

    setExecuting(false);
  }, [selectedTool, params, validateParams]);

  // Mock 执行
  const handleMockExecute = useCallback(async () => {
    if (!selectedTool || !validateParams()) return;

    setExecuting(true);
    setExecuteResult(null);

    try {
      const typedParams: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        const prop = selectedTool.parameters.properties[key];
        if (prop?.type === "number") {
          typedParams[key] = Number(value);
        } else if (prop?.type === "boolean") {
          typedParams[key] = value === "true";
        } else {
          typedParams[key] = value;
        }
      }

      const result = await executeTool(selectedTool.name, typedParams, true);
      setExecuteResult(result);
      showSuccessToast("Mock 执行成功");
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Mock 执行失败");
    }

    setExecuting(false);
  }, [selectedTool, params, validateParams]);

  // 重置参数
  const handleResetParams = useCallback(() => {
    setParams({});
    setErrors({});
    setExecuteResult(null);
  }, []);

  // 健康检查
  const handleHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    setHealthResult(null);
    try {
      const result = await getToolHealth();
      setHealthResult(result);
    } catch {
      setHealthResult({
        tools: [
          { name: "query_steel_price", displayName: "查询钢材价格", status: "normal", responseTime: 120, successRate: 99.5, lastError: "" },
          { name: "get_price_trend", displayName: "获取价格走势", status: "normal", responseTime: 250, successRate: 98.2, lastError: "" },
          { name: "calculate_quotation", displayName: "计算报价", status: "normal", responseTime: 180, successRate: 97.8, lastError: "" },
          { name: "search_knowledge", displayName: "搜索知识库", status: "degraded", responseTime: 850, successRate: 92.1, lastError: "向量检索超时" },
          { name: "query_tender", displayName: "查询招标信息", status: "normal", responseTime: 150, successRate: 96.5, lastError: "" },
          { name: "set_price_alert", displayName: "设置价格预警", status: "normal", responseTime: 90, successRate: 99.1, lastError: "" },
          { name: "convert_unit", displayName: "单位换算", status: "normal", responseTime: 45, successRate: 100, lastError: "" },
          { name: "calculate_weight", displayName: "重量计算", status: "down", responseTime: 0, successRate: 0, lastError: "数据库连接失败" },
        ],
        summary: { normal: 6, degraded: 1, down: 1 },
      });
      showErrorToast("健康检查失败，使用本地 mock 数据");
    }
    setHealthLoading(false);
  }, []);

  // Mock 弹窗操作
  const handleOpenMockModal = useCallback(() => {
    setMockScenario("normal");
    setMockJson(DEFAULT_MOCK_JSON.normal);
    setMockModalOpen(true);
  }, []);

  const handleSaveMock = useCallback(async () => {
    if (!selectedTool) return;
    setMockSaving(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(mockJson);
      } catch {
        showErrorToast("JSON 格式无效");
        setMockSaving(false);
        return;
      }

      await saveMockConfig(selectedTool.name, parsed, mockScenario);
      showSuccessToast("Mock 配置已保存");
      setMockModalOpen(false);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "保存失败");
    }
    setMockSaving(false);
  }, [selectedTool, mockJson, mockScenario]);

  const handleResetMock = useCallback(async () => {
    if (!selectedTool) return;
    try {
      await deleteMockConfig(selectedTool.name);
      showSuccessToast("Mock 配置已清除");
      setMockModalOpen(false);
    } catch {
      showErrorToast("清除 Mock 配置失败");
    }
  }, [selectedTool]);

  const handleExportReport = useCallback(() => {
    if (!healthResult) return;
    const blob = new Blob([JSON.stringify(healthResult, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tool-health-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [healthResult]);

  // ============================================================
  // 渲染参数表单
  // ============================================================

  const renderParamField = (key: string, prop: ToolParamProperty) => {
    const isRequired = selectedTool?.parameters.required?.includes(key) ?? false;
    const error = errors[key];

    if (prop.enum && prop.enum.length > 0) {
      return (
        <div key={key} className="space-y-1.5">
          <label className="text-[13px] leading-[1.5] text-[#404040]">
            {isRequired && <span className="text-[#B42318] mr-0.5">*</span>}
            {prop.description || key}
          </label>
          <Select
            value={params[key] || ""}
            onValueChange={(v) => handleParamChange(key, v)}
          >
            <SelectTrigger
              variant="filter"
              className={cn(
                "w-full h-9 text-[13px]",
                error && "border-[#B42318]",
              )}
            >
              <SelectValue placeholder={`选择${prop.description || key}`} />
            </SelectTrigger>
            <SelectContent variant="filter">
              {prop.enum.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <p className="text-[11px] text-[#B42318]">{error}</p>
          )}
        </div>
      );
    }

    if (prop.type === "boolean") {
      return (
        <div key={key} className="flex items-center gap-2">
          <Checkbox
            id={`param-${key}`}
            checked={params[key] === "true"}
            onCheckedChange={(checked) =>
              handleParamChange(key, checked ? "true" : "false")
            }
            className={cn(
              "h-4 w-4 rounded-[4px]",
              "border-[#D4D4D4] data-[state=checked]:bg-[#0A0A0A] data-[state=checked]:border-[#0A0A0A]",
            )}
          />
          <label
            htmlFor={`param-${key}`}
            className="text-[13px] leading-[1.5] text-[#404040]"
          >
            {isRequired && <span className="text-[#B42318] mr-0.5">*</span>}
            {prop.description || key}
          </label>
        </div>
      );
    }

    if (prop.type === "number") {
      return (
        <div key={key} className="space-y-1.5">
          <label className="text-[13px] leading-[1.5] text-[#404040]">
            {isRequired && <span className="text-[#B42318] mr-0.5">*</span>}
            {prop.description || key}
          </label>
          <Input
            type="number"
            value={params[key] || ""}
            onChange={(e) => handleParamChange(key, e.target.value)}
            placeholder={`输入${prop.description || key}`}
            className={cn(
              "h-9 text-[13px] rounded-md border-[#E5E5E5]",
              error && "border-[#B42318]",
            )}
          />
          {error && (
            <p className="text-[11px] text-[#B42318]">{error}</p>
          )}
        </div>
      );
    }

    // string
    return (
      <div key={key} className="space-y-1.5">
        <label className="text-[13px] leading-[1.5] text-[#404040]">
          {isRequired && <span className="text-[#B42318] mr-0.5">*</span>}
          {prop.description || key}
        </label>
        <Input
          type="text"
          value={params[key] || ""}
          onChange={(e) => handleParamChange(key, e.target.value)}
          placeholder={`输入${prop.description || key}`}
          className={cn(
            "h-9 text-[13px] rounded-md border-[#E5E5E5]",
            error && "border-[#B42318]",
          )}
        />
        {error && (
          <p className="text-[11px] text-[#B42318]">{error}</p>
        )}
      </div>
    );
  };

  // ============================================================
  // 渲染调用链路
  // ============================================================

  const renderCallChain = (chain: CallChainStep[]) => (
    <div className="space-y-0.5">
      {chain.map((step, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 text-[12px] leading-[1.5]"
        >
          {step.status === "success" ? (
            <CheckCircle2 size={14} strokeWidth={1.75} className="text-[#1F7A4D] shrink-0" />
          ) : step.status === "error" ? (
            <XCircle size={14} strokeWidth={1.75} className="text-[#B42318] shrink-0" />
          ) : (
            <SkipForward size={14} strokeWidth={1.75} className="text-[#737373] shrink-0" />
          )}
          <span className="text-[#404040]">{step.step}</span>
          {(step.status === "success" || step.status === "error") && (
            <span className="text-[#A3A3A3] ml-auto">{step.durationMs}ms</span>
          )}
          {step.detail && (
            <span className="text-[11px] text-[#B42318]">{step.detail}</span>
          )}
        </div>
      ))}
    </div>
  );

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-4">
      {/* 工具选择 & 参数表单区 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 左：工具选择 + 参数表单 */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] leading-[1.5] text-[#404040]">
              选择工具
            </label>
            <Select value={selectedToolName} onValueChange={handleToolSelect}>
              <SelectTrigger variant="filter" className="w-full h-9 text-[13px]">
                <SelectValue placeholder="选择要调试的工具..." />
              </SelectTrigger>
              <SelectContent variant="filter">
                {tools.map((tool) => (
                  <SelectItem key={tool.name} value={tool.name}>
                    {tool.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTool && (
            <p className="text-[13px] leading-[1.5] text-[#404040]">
              {selectedTool.description}
            </p>
          )}

          {selectedTool && (
            <div className="space-y-3 pt-2 border-t border-[#E5E5E5]">
              {Object.entries(selectedTool.parameters.properties).map(([key, prop]) =>
                renderParamField(key, prop),
              )}
            </div>
          )}
        </div>

        {/* 右：执行按钮 + 结果 */}
        <div className="space-y-4">
          {/* 操作按钮 */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExecute}
                disabled={!selectedTool || executing}
                className="h-9 px-4 rounded-full bg-[#0A0A0A] text-white hover:bg-[#404040] text-[13px] disabled:opacity-30"
              >
                {executing ? (
                  <Loader2 size={14} strokeWidth={1.75} className="animate-spin mr-1" />
                ) : (
                  <Play size={14} strokeWidth={1.75} className="mr-1" />
                )}
                执行工具
              </Button>
              <Button
                variant="outline"
                onClick={handleMockExecute}
                disabled={!selectedTool || executing}
                className="h-9 px-4 rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA] text-[13px]"
              >
                <FlaskConical size={14} strokeWidth={1.75} className="mr-1" />
                Mock返回
              </Button>
              <Button
                variant="outline"
                onClick={handleResetParams}
                disabled={!selectedTool}
                className="h-9 px-4 rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA] text-[13px]"
              >
                <RotateCcw size={14} strokeWidth={1.75} className="mr-1" />
                重置参数
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenMockModal}
                disabled={!selectedTool}
                className="h-9 px-4 rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA] text-[13px] ml-auto"
              >
                配置Mock
              </Button>
            </div>
          </div>

          {/* 执行结果 */}
          {executeResult && (
            <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <AdminStatusBadge
                  status={executeResult.status === "success" ? "success" : "error"}
                />
                <span className="text-[12px] text-[#737373]">
                  <Clock size={12} strokeWidth={1.75} className="inline mr-1" />
                  耗时 {executeResult.durationMs}ms
                </span>
              </div>

              {/* JSON 结果 */}
              <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                  <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                    返回结果
                  </span>
                </div>
                <pre className="text-[12px] leading-[1.6] font-mono text-[#404040] p-4 max-h-[200px] overflow-auto whitespace-pre-wrap break-all">
                  {formatJson(executeResult.result)}
                </pre>
              </div>

              {/* 调用链路 */}
              {executeResult.chain && executeResult.chain.length > 0 && (
                <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                    <span className="text-[11px] leading-[1.5] text-[#737373] uppercase tracking-[0.08em]">
                      调用链路
                    </span>
                  </div>
                  <div className="p-4">
                    {renderCallChain(executeResult.chain)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 健康检查 */}
      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} strokeWidth={1.75} className="text-[#0A0A0A]" />
            <span className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A]">
              工具健康检查
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleHealthCheck}
              disabled={healthLoading}
              className="h-8 px-4 rounded-full bg-[#0A0A0A] text-white hover:bg-[#404040] text-[12px] disabled:opacity-30"
            >
              {healthLoading ? (
                <Loader2 size={14} strokeWidth={1.75} className="animate-spin mr-1" />
              ) : (
                <Zap size={14} strokeWidth={1.75} className="mr-1" />
              )}
              健康检查
            </Button>
            {healthResult && (
              <Button
                variant="outline"
                onClick={handleExportReport}
                className="h-8 px-3 rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA] text-[12px]"
              >
                <Download size={14} strokeWidth={1.75} className="mr-1" />
                导出报告
              </Button>
            )}
          </div>
        </div>

        {healthResult && (
          <>
            {/* 汇总行 */}
            <div className="flex items-center gap-4 p-3 bg-[#FAFAFA] rounded-xl text-[13px] leading-[1.5]">
              <span className="text-[#1F7A4D]">{healthResult.summary.normal} 正常</span>
              <span className="text-[#B45309]">{healthResult.summary.degraded} 降级</span>
              <span className="text-[#B42318]">{healthResult.summary.down} 故障</span>
            </div>

            {/* 健康表格 */}
            <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                    <th className="text-left px-4 py-3 text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium">
                      工具名称
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium">
                      状态
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium">
                      响应时间
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium">
                      成功率
                    </th>
                    <th className="text-left px-4 py-3 text-[11px] leading-[1.5] uppercase tracking-[0.08em] text-[#737373] font-medium">
                      最近错误
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {healthResult.tools.map((tool: ToolHealthItem, idx: number) => (
                    <tr
                      key={tool.name}
                      className={cn(
                        "border-b border-[#E5E5E5] last:border-b-0",
                        idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]",
                      )}
                    >
                      <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040]">
                        {tool.displayName}
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge status={mapHealthToBadgeStatus(tool.status)} />
                      </td>
                      <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040]">
                        {tool.responseTime > 0 ? `${tool.responseTime}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px] leading-[1.5] text-[#404040]">
                        {tool.successRate > 0 ? `${tool.successRate}%` : "—"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-[13px] leading-[1.5] max-w-[200px] truncate",
                          tool.lastError ? "text-[#B42318]" : "text-[#404040]",
                        )}
                      >
                        {tool.lastError || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Mock 配置弹窗 */}
      <AdminModal
        open={mockModalOpen}
        onOpenChange={setMockModalOpen}
        title={`Mock 配置 - ${selectedTool?.displayName || ""}`}
        size="md"
        onConfirm={handleSaveMock}
        confirmLabel={mockSaving ? "保存中..." : "保存Mock配置"}
        loading={mockSaving}
      >
        <div className="space-y-4">
          {/* 场景选择 */}
          <div className="space-y-2">
            <label className="text-[13px] leading-[1.5] text-[#404040]">
              模拟场景
            </label>
            <div className="space-y-1">
              {MOCK_SCENARIOS.map((scenario) => (
                <label
                  key={scenario.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors duration-150",
                    mockScenario === scenario.value
                      ? "border-[#0A0A0A] bg-[#FAFAFA]"
                      : "border-[#E5E5E5] hover:bg-[#FAFAFA]",
                  )}
                >
                  <input
                    type="radio"
                    name="mockScenario"
                    value={scenario.value}
                    checked={mockScenario === scenario.value}
                    onChange={(e) => {
                      setMockScenario(e.target.value);
                      setMockJson(DEFAULT_MOCK_JSON[e.target.value] || "{}");
                    }}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      mockScenario === scenario.value
                        ? "border-[#0A0A0A]"
                        : "border-[#D4D4D4]",
                    )}
                  >
                    {mockScenario === scenario.value && (
                      <div className="w-2 h-2 rounded-full bg-[#0A0A0A]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[13px] leading-[1.5] text-[#0A0A0A]">
                      {scenario.label}
                    </div>
                    <div className="text-[11px] leading-[1.5] text-[#737373]">
                      {scenario.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* JSON 编辑器 */}
          <div className="space-y-2">
            <label className="text-[13px] leading-[1.5] text-[#404040]">
              Mock 返回数据 (JSON)
            </label>
            <Textarea
              value={mockJson}
              onChange={(e) => setMockJson(e.target.value)}
              className="min-h-[200px] font-mono text-[12px] leading-[1.6] rounded-xl border-[#E5E5E5] resize-y"
              placeholder='{"status": "success", "data": {}}'
            />
          </div>

          {/* 恢复默认 */}
          <Button
            variant="outline"
            onClick={handleResetMock}
            className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#B42318] hover:bg-[#FEF2F2]"
          >
            <RotateCcw size={14} strokeWidth={1.75} className="mr-1" />
            恢复默认
          </Button>
        </div>
      </AdminModal>
    </div>
  );
}

export default DebugToolTab;
