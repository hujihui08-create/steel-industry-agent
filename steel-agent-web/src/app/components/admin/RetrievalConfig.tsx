import React, { useState, useEffect, useCallback } from "react";
import { Save, RotateCcw, Eye, EyeOff, BarChart3, Zap, Database, SlidersHorizontal, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AdminPageShell } from "./AdminPageShell";
import { AdminLoading } from "./AdminLoading";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import * as adminKnowledgeApi from "@/app/api/admin-knowledge";
import type { RAGConfig } from "@/app/types/knowledge";

const MODEL_OPTIONS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small", dimension: 1536 },
  { value: "text-embedding-3-large", label: "text-embedding-3-large", dimension: 3072 },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002", dimension: 1536 },
];

const CHUNK_METHODS = [
  { value: "paragraph", label: "按段落" },
  { value: "char_count", label: "按字符数" },
  { value: "semantic", label: "按语义" },
];

const SEARCH_MODES = [
  { value: "vector", label: "纯向量检索" },
  { value: "hybrid", label: "混合检索" },
  { value: "keyword", label: "关键词检索" },
];

export default function RetrievalConfig() {
  const [config, setConfig] = useState<RAGConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await adminKnowledgeApi.adminGetRAGConfig();
      setConfig(cfg);
      setDirty(false);
    } catch {
      showErrorToast("加载配置失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const updateConfig = useCallback(<K extends keyof RAGConfig>(key: K, value: RAGConfig[K]) => {
    setConfig((prev) => prev ? { ...prev, [key]: value } : null);
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    try {
      const saved = await adminKnowledgeApi.adminUpdateRAGConfig(config);
      setConfig(saved);
      setDirty(false);
      showSuccessToast("配置已保存");
    } catch {
      showErrorToast("保存配置失败");
    } finally {
      setSaving(false);
    }
  }, [config]);

  if (loading) {
    return (
      <AdminPageShell title="检索配置" breadcrumbs={[{ label: "首页", path: "/admin" }, { label: "数据管理" }, { label: "检索配置" }]}>
        <AdminLoading />
      </AdminPageShell>
    );
  }

  if (!config) {
    return (
      <AdminPageShell title="检索配置" breadcrumbs={[{ label: "首页", path: "/admin" }, { label: "数据管理" }, { label: "检索配置" }]}>
        <div className="text-center py-12 text-[#737373]">加载配置失败</div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="检索配置"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "数据管理" },
        { label: "检索配置" },
      ]}
    >
      <div className="flex flex-col gap-6 max-w-[720px]">
        {/* 保存按钮 */}
        <div className="flex items-center justify-end gap-3">
          {dirty && (
            <span className="text-[12px] text-[#B45309]">配置已修改</span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={cn(
              "h-9 px-5 rounded-full",
              "bg-[#0A0A0A] text-white",
              "text-[13px] leading-[1.5]",
              "hover:bg-[#404040]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-150",
              "gap-1.5",
            )}
          >
            {saving ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} strokeWidth={1.75} />
            )}
            保存配置
          </Button>
        </div>

        {/* Embedding 模型配置 */}
        <SectionCard icon={<Zap size={16} strokeWidth={1.75} />} title="Embedding 模型">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">模型名称</label>
              <select
                value={config.embedding_model}
                onChange={(e) => updateConfig("embedding_model", e.target.value)}
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A]",
                  "cursor-pointer transition-colors duration-150",
                )}
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}（{opt.dimension} 维）
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">向量维度</label>
              <span className="h-9 flex items-center text-[13px] text-[#404040]">
                {MODEL_OPTIONS.find((m) => m.value === config.embedding_model)?.dimension ?? "—"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">API Key（可选）</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={config.embedding_api_key || ""}
                  onChange={(e) => updateConfig("embedding_api_key", e.target.value)}
                  placeholder="不填则复用主模型 API Key"
                  className={cn(
                    "h-9 px-3 pr-9 rounded-[10px] w-full",
                    "border border-[#E5E5E5]",
                    "bg-white",
                    "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                    "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                    "transition-colors duration-150",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className={cn(
                    "absolute right-2.5 top-1/2 -translate-y-1/2",
                    "text-[#A3A3A3] hover:text-[#404040]",
                    "transition-colors duration-150",
                  )}
                  aria-label={showApiKey ? "隐藏" : "显示"}
                >
                  {showApiKey ? (
                    <EyeOff size={14} strokeWidth={1.75} />
                  ) : (
                    <Eye size={14} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">Base URL（可选）</label>
              <input
                type="text"
                value={config.embedding_base_url || ""}
                onChange={(e) => updateConfig("embedding_base_url", e.target.value)}
                placeholder="默认 https://api.openai.com/v1"
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040] placeholder:text-[#A3A3A3]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "transition-colors duration-150",
                )}
              />
            </div>
          </div>
        </SectionCard>

        {/* 分块策略 */}
        <SectionCard icon={<Database size={16} strokeWidth={1.75} />} title="文档分块策略">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">分块方式</label>
              <select
                value={config.chunk_method}
                onChange={(e) => updateConfig("chunk_method", e.target.value)}
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "cursor-pointer transition-colors duration-150",
                )}
              >
                {CHUNK_METHODS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="chunk-size" className="text-[12px] text-[#737373]">分块大小</label>
              <input
                id="chunk-size"
                type="number"
                min={64}
                max={4096}
                value={config.chunk_size}
                onChange={(e) => updateConfig("chunk_size", Number(e.target.value))}
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "transition-colors duration-150",
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="chunk-overlap" className="text-[12px] text-[#737373]">重叠字符数</label>
              <input
                id="chunk-overlap"
                type="number"
                min={0}
                max={1024}
                value={config.chunk_overlap}
                onChange={(e) => updateConfig("chunk_overlap", Number(e.target.value))}
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "transition-colors duration-150",
                )}
              />
            </div>
          </div>
        </SectionCard>

        {/* 检索参数 */}
        <SectionCard icon={<SlidersHorizontal size={16} strokeWidth={1.75} />} title="检索参数">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="default-topk" className="text-[12px] text-[#737373]">默认 Top-K</label>
              <input
                id="default-topk"
                type="number"
                min={1}
                max={50}
                value={config.default_top_k}
                onChange={(e) => updateConfig("default_top_k", Number(e.target.value))}
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "transition-colors duration-150",
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="default-threshold" className="text-[12px] text-[#737373]">默认阈值</label>
              <input
                id="default-threshold"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={config.default_threshold}
                onChange={(e) => updateConfig("default_threshold", Number(e.target.value))}
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "transition-colors duration-150",
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#737373]">检索模式</label>
              <select
                value={config.search_mode}
                onChange={(e) => updateConfig("search_mode", e.target.value)}
                className={cn(
                  "h-9 px-3 rounded-[10px]",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "cursor-pointer transition-colors duration-150",
                )}
              >
                {SEARCH_MODES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="hybrid-weight" className="text-[12px] text-[#737373]">
                混合权重：{config.hybrid_weight.toFixed(1)}
              </label>
              <input
                id="hybrid-weight"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={config.hybrid_weight}
                onChange={(e) => updateConfig("hybrid_weight", parseFloat(e.target.value))}
                className="accent-[#0A0A0A] mt-1"
              />
              <div className="flex justify-between text-[11px] text-[#A3A3A3]">
                <span>关键词 0</span>
                <span>向量 1</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 高级配置 */}
        <SectionCard icon={<Settings2 size={16} strokeWidth={1.75} />} title="高级配置">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] text-[#404040]">查询重写</span>
                <p className="text-[12px] text-[#737373] mt-0.5">使用 LLM 重写用户查询以提高召回率</p>
              </div>
              <Switch
                checked={config.query_rewrite_enabled}
                onCheckedChange={(v) => updateConfig("query_rewrite_enabled", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] text-[#404040]">结果重排序</span>
                <p className="text-[12px] text-[#737373] mt-0.5">使用 Reranker 模型对检索结果二次排序</p>
              </div>
              <Switch
                checked={config.rerank_enabled}
                onCheckedChange={(v) => updateConfig("rerank_enabled", v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] text-[#404040]">缓存策略</span>
                <p className="text-[12px] text-[#737373] mt-0.5">对高频查询结果进行缓存以降低延迟</p>
              </div>
              <Switch
                checked={config.cache_enabled}
                onCheckedChange={(v) => updateConfig("cache_enabled", v)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-recall" className="text-[12px] text-[#737373]">最大召回数</label>
              <input
                id="max-recall"
                type="number"
                min={10}
                max={500}
                value={config.max_recall}
                onChange={(e) => updateConfig("max_recall", Number(e.target.value))}
                className={cn(
                  "h-9 px-3 rounded-[10px] w-32",
                  "border border-[#E5E5E5]",
                  "bg-white",
                  "text-[13px] text-[#404040]",
                  "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                  "transition-colors duration-150",
                )}
              />
            </div>
          </div>
        </SectionCard>

        {/* 性能统计 */}
        <SectionCard icon={<BarChart3 size={16} strokeWidth={1.75} />} title="性能统计">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-[#FAFAFA] p-4 text-center">
              <div className="text-[24px] leading-[1.3] font-medium text-[#0A0A0A]">--</div>
              <div className="text-[12px] text-[#737373] mt-1">平均检索耗时</div>
            </div>
            <div className="rounded-lg bg-[#FAFAFA] p-4 text-center">
              <div className="text-[24px] leading-[1.3] font-medium text-[#0A0A0A]">--</div>
              <div className="text-[12px] text-[#737373] mt-1">缓存命中率</div>
            </div>
            <div className="rounded-lg bg-[#FAFAFA] p-4 text-center">
              <div className="text-[24px] leading-[1.3] font-medium text-[#0A0A0A]">--</div>
              <div className="text-[12px] text-[#737373] mt-1">今日检索次数</div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AdminPageShell>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#0A0A0A]">{icon}</span>
        <h3 className="text-[15px] leading-[1.6] font-medium text-[#0A0A0A]">{title}</h3>
      </div>
      {children}
    </div>
  );
}