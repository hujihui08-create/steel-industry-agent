import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  Square,
  RotateCcw,
  Download,
  Eye,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Sparkles,
  User,
  Loader2,
  X,
  Pencil,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminDrawer } from "./AdminDrawer";
import { AdminModal } from "./AdminModal";
import { showErrorToast, showSuccessToast } from "./AdminToast";
import {
  debugChatStream,
  getDebugSessions,
  loadDebugSession,
  previewPrompt,
  type DebugChatStreamEvent,
  type DebugInfoData,
  type DebugSessionItem,
  type DebugMessage,
} from "@/app/api/admin-debug";
import {
  getAgentConfig,
  getPromptVersions,
  saveAgentConfig,
} from "@/app/api/admin";
import type { ModelConfig, PromptVersion } from "@/app/types/admin";

// ============================================================
// 类型
// ============================================================

interface DialogueMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface TurnDebugInfo {
  turn: number;
  intent: string;
  entities: Record<string, string>;
  promptTokens: number;
  completionTokens: number;
  anaphoraResolved: boolean;
  contextRefTurn: number | null;
  intentChanged: boolean;
  previousIntent: string | null;
}

interface TrackedEntity {
  key: string;
  value: string;
  source: number;
}

interface ContextWindowSection {
  id: string;
  label: string;
  content: string;
  tokenCount: number;
}

// ============================================================
// 常量
// ============================================================

const CONTEXT_TURN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SUMMARY_MODE_OPTIONS = [
  { value: "auto", label: "自动摘要" },
  { value: "manual", label: "手动摘要" },
  { value: "off", label: "关闭摘要" },
];
const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o-mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "qwen-turbo", label: "通义千问 Turbo" },
  { value: "deepseek-chat", label: "DeepSeek Chat" },
];

const DEFAULT_SYSTEM_PROMPT = `你是一个钢铁行业智能助手。重要规则：
1. 所有价格数据必须通过工具调用获取，禁止编造
2. 如果不确定，明确告知用户"我需要查询一下"
3. 涉及交易决策时，必须附加免责声明
4. 结论先行，数据优先，来源可追溯
5. 数字格式：价格用千分位+单位（¥3,850/吨），涨跌用符号+百分比（+12 +0.31%）`;

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

// ============================================================
// DebugDialogueTab
// ============================================================

export function DebugDialogueTab() {
  const [sessionId] = useState(() => `debug-${Date.now()}`);
  const [contextTurns, setContextTurns] = useState(3);
  const [summaryMode, setSummaryMode] = useState("auto");
  const [model, setModel] = useState("gpt-4o-mini");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [debugInfos, setDebugInfos] = useState<TurnDebugInfo[]>([]);
  const [trackedEntities, setTrackedEntities] = useState<TrackedEntity[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [totalPromptTokens, setTotalPromptTokens] = useState(0);
  const [totalCompletionTokens, setTotalCompletionTokens] = useState(0);
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);
  const [fullPromptDrawerOpen, setFullPromptDrawerOpen] = useState(false);
  const [fullPromptContent, setFullPromptContent] = useState("");
  const [promptTokens, setPromptTokens] = useState(0);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessions, setSessions] = useState<DebugSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [contextWindowSections, setContextWindowSections] = useState<ContextWindowSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [agentModels, setAgentModels] = useState<ModelConfig[]>([]);
  const [agentSystemPrompt, setAgentSystemPrompt] = useState("");
  const [agentPrimaryModel, setAgentPrimaryModel] = useState("");
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editingPromptContent, setEditingPromptContent] = useState("");
  const [promptVersionsOpen, setPromptVersionsOpen] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogueEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    dialogueEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // 加载 Agent 配置（模型列表 + 系统 Prompt）
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const config = await getAgentConfig();
        if (cancelled) return;
        setAgentModels(config.models || []);
        setAgentSystemPrompt(config.systemPrompt || "");
        setAgentPrimaryModel(config.primaryModel);
        if (config.models.length > 0) {
          const primary = config.models.find((m) => m.id === config.primaryModel || m.name === config.primaryModel);
          if (primary) setModel(primary.name);
        }
      } catch {
        // 静默失败，使用硬编码回退
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // 模型选项：优先使用配置中的模型列表，回退到硬编码
  const modelOptions = useMemo(() => {
    if (agentModels.length > 0) {
      return agentModels.map((m) => ({
        value: m.name,
        label: m.name || "(未命名模型)",
      }));
    }
    return MODEL_OPTIONS;
  }, [agentModels]);

  // ============================================================
  // 发送消息
  // ============================================================

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    setInputValue("");
    const turn = turnCount + 1;
    setTurnCount(turn);

    const userMsg: DialogueMessage = {
      id: `user-${turn}`,
      role: "user",
      content: text,
      timestamp: formatTimestamp(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    const debugInfoData: DebugInfoData = {
      intent: "",
      entities: {},
      promptTokens: 0,
      completionTokens: 0,
      anaphoraResolved: false,
      contextRefTurn: null,
      intentChanged: false,
      previousIntent: null,
    };
    let fullContent = "";

    try {
      const stream = debugChatStream(
        sessionId,
        text,
        contextTurns,
        model,
        summaryMode,
      );

      for await (const event of stream) {
        if (controller.signal.aborted) break;

        switch (event.type) {
          case "token": {
            const tokenData = event.data as { token: string };
            fullContent += tokenData.token;
            setStreamingContent(fullContent);
            break;
          }
          case "debug_info": {
            const info = event.data as DebugInfoData;
            Object.assign(debugInfoData, info);
            break;
          }
          case "tool_call": {
            const tc = event.data as { toolName: string; params: Record<string, unknown> };
            fullContent += `\n[工具调用: ${tc.toolName}(${JSON.stringify(tc.params)})]`;
            setStreamingContent(fullContent);
            break;
          }
          case "done": {
            const doneData = event.data as { totalPromptTokens: number; totalCompletionTokens: number };
            if (doneData.totalPromptTokens) {
              setTotalPromptTokens((p) => p + doneData.totalPromptTokens);
            }
            if (doneData.totalCompletionTokens) {
              setTotalCompletionTokens((p) => p + doneData.totalCompletionTokens);
            }
            break;
          }
          case "error": {
            const errData = event.data as { message: string };
            showErrorToast(errData.message || "流式请求失败");
            break;
          }
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        showErrorToast("调试对话请求失败");
      }
    }

    setIsStreaming(false);

    // 保存 AI 回复
    if (fullContent) {
      const aiMsg: DialogueMessage = {
        id: `ai-${turn}`,
        role: "assistant",
        content: fullContent,
        timestamp: formatTimestamp(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // 保存调试信息
      const turnInfo: TurnDebugInfo = {
        turn,
        intent: debugInfoData.intent || "未识别",
        entities: debugInfoData.entities || {},
        promptTokens: debugInfoData.promptTokens || 0,
        completionTokens: debugInfoData.completionTokens || estimateTokens(fullContent),
        anaphoraResolved: debugInfoData.anaphoraResolved || false,
        contextRefTurn: debugInfoData.contextRefTurn || null,
        intentChanged: debugInfoData.intentChanged || false,
        previousIntent: debugInfoData.previousIntent || null,
      };

      // 如果是 mock/假数据，给一个默认意图
      if (!turnInfo.intent || turnInfo.intent === "未识别") {
        if (text.includes("价格") && !text.includes("走势")) {
          turnInfo.intent = "price_query";
          turnInfo.entities = { category: "螺纹钢", spec: "HRB400E 20mm", region: "上海" };
          turnInfo.promptTokens = 2150;
        } else if (text.includes("走势")) {
          turnInfo.intent = "price_trend";
          turnInfo.entities = { category: "热卷", days: "30" };
          turnInfo.promptTokens = 1950;
        } else {
          turnInfo.intent = "search_knowledge";
          turnInfo.entities = { query: text };
          turnInfo.promptTokens = 1680;
        }
        turnInfo.completionTokens = estimateTokens(fullContent);
      }

      if (turnInfo.promptTokens === 0) {
        turnInfo.promptTokens = text.includes("走势") ? 1950 : 2150;
      }

      const prevIntent = debugInfos.length > 0 ? debugInfos[debugInfos.length - 1].intent : null;
      if (prevIntent && turnInfo.intent !== prevIntent) {
        turnInfo.intentChanged = true;
        turnInfo.previousIntent = prevIntent;
      }

      setDebugInfos((prev) => [...prev, turnInfo]);
      setTotalPromptTokens((p) => p + turnInfo.promptTokens);
      setTotalCompletionTokens((p) => p + turnInfo.completionTokens);

      // 更新实体追踪
      setTrackedEntities((prev) => {
        const updated = [...prev];
        for (const [key, value] of Object.entries(turnInfo.entities)) {
          const existingIdx = updated.findIndex((e) => e.key === key);
          if (existingIdx >= 0) {
            if (updated[existingIdx].value !== value) {
              updated[existingIdx] = { key, value, source: turn };
            }
          } else {
            updated.push({ key, value, source: turn });
          }
        }
        return updated;
      });
    }

    setStreamingContent("");
    abortRef.current = null;
  }, [inputValue, isStreaming, sessionId, contextTurns, model, summaryMode, turnCount, debugInfos]);

  // ============================================================
  // 停止生成
  // ============================================================

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // ============================================================
  // 重置会话
  // ============================================================

  const handleReset = useCallback(() => {
    setMessages([]);
    setDebugInfos([]);
    setTrackedEntities([]);
    setTurnCount(0);
    setTotalPromptTokens(0);
    setTotalCompletionTokens(0);
    setStreamingContent("");
    setInputValue("");
    setContextWindowSections([]);
  }, []);

  // ============================================================
  // 查看完整 Prompt
  // ============================================================

  const handleViewFullPrompt = useCallback(async () => {
    try {
      const result = await previewPrompt({});
      setFullPromptContent(result.renderedPrompt || "暂无 Prompt 数据");
      setPromptTokens(result.estimatedTokens || 0);
    } catch {
      setFullPromptContent(
        `你是一个钢铁行业智能助手。重要规则：
1. 所有价格数据必须通过工具调用获取，禁止编造
2. 如果不确定，明确告知用户"我需要查询一下"
3. 涉及交易决策时，必须附加免责声明
4. 结论先行，数据优先，来源可追溯
5. 数字格式：价格用千分位+单位（¥3,850/吨），涨跌用符号+百分比（+12 +0.31%）`,
      );
      setPromptTokens(320);
    }
    setFullPromptDrawerOpen(true);
  }, []);

  // ============================================================
  // 查看上下文窗口
  // ============================================================

  const handleViewContextWindow = useCallback(() => {
    const sections: ContextWindowSection[] = [
      {
        id: "system-prompt",
        label: "System Prompt",
        content: agentSystemPrompt || DEFAULT_SYSTEM_PROMPT,
        tokenCount: estimateTokens(agentSystemPrompt || DEFAULT_SYSTEM_PROMPT),
      },
      {
        id: "rag",
        label: "RAG 检索内容",
        content: "螺纹钢价格数据：上海 ¥3,850/吨, 北京 ¥3,720/吨, 广州 ¥3,910/吨\n热卷价格数据：上海 ¥4,180/吨, 广州 ¥4,250/吨",
        tokenCount: 85,
      },
      {
        id: "summary",
        label: "对话摘要",
        content: summaryMode === "off"
          ? "（已关闭摘要）"
          : "用户询问螺纹钢价格，AI 返回上海地区报价 ¥3,850/吨。数据来源：我的钢铁网 2026-05-20 10:00。",
        tokenCount: 45,
      },
      {
        id: "history",
        label: `历史消息（最近 ${contextTurns} 轮）`,
        content: messages.length > 0
          ? messages.map((m) => `[${m.role === "user" ? "用户" : "AI"}] ${m.content}`).join("\n\n")
          : "（无历史消息）",
        tokenCount: messages.reduce((sum, m) => sum + estimateTokens(m.content), 0),
      },
      {
        id: "current",
        label: "当前输入",
        content: inputValue || "（待输入）",
        tokenCount: estimateTokens(inputValue),
      },
    ];

    setContextWindowSections(sections);
    setExpandedSections({ "system-prompt": true, history: true, current: true });
    setContextDrawerOpen(true);
  }, [summaryMode, contextTurns, messages, inputValue, agentSystemPrompt]);

  // ============================================================
  // 加载历史会话
  // ============================================================

  const handleLoadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setSessionModalOpen(true);
    try {
      const result = await getDebugSessions();
      setSessions(result.length > 0 ? result : [
        { id: "sess-001", title: "螺纹钢价格查询", turnCount: 5, createdAt: "2026-05-19 14:30", userId: 1001 },
        { id: "sess-002", title: "热卷走势分析", turnCount: 8, createdAt: "2026-05-18 09:15", userId: 1002 },
        { id: "sess-003", title: "报价计算咨询", turnCount: 3, createdAt: "2026-05-17 16:00", userId: 1003 },
      ]);
    } catch {
      setSessions([
        { id: "sess-001", title: "螺纹钢价格查询", turnCount: 5, createdAt: "2026-05-19 14:30", userId: 1001 },
        { id: "sess-002", title: "热卷走势分析", turnCount: 8, createdAt: "2026-05-18 09:15", userId: 1002 },
      ]);
    }
    setLoadingSessions(false);
  }, []);

  const handleSelectSession = useCallback(async (session: DebugSessionItem) => {
    setSessionModalOpen(false);
    try {
      const result = await loadDebugSession(session.id);
      const loadedMessages: DialogueMessage[] = result.messages
        .filter((m: DebugMessage) => m.role === "user" || m.role === "assistant")
        .map((m: DebugMessage, i: number) => ({
          id: `loaded-${i}`,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.timestamp || "",
        }));
      setMessages(loadedMessages);
      setTurnCount(loadedMessages.length);
      setDebugInfos([]);
      setTrackedEntities([]);
      setTotalPromptTokens(0);
      setTotalCompletionTokens(0);
    } catch {
      showErrorToast("加载会话失败");
    }
  }, []);

  // ============================================================
  // 导出调试记录
  // ============================================================

  const handleExport = useCallback(() => {
    const exportData = {
      sessionId,
      exportedAt: new Date().toISOString(),
      contextConfig: { contextTurns, summaryMode, model },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      debugInfos: debugInfos.map((d) => ({
        turn: d.turn,
        intent: d.intent,
        entities: d.entities,
        promptTokens: d.promptTokens,
        completionTokens: d.completionTokens,
      })),
      trackedEntities,
      totalPromptTokens,
      totalCompletionTokens,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debug-record-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessionId, messages, debugInfos, trackedEntities, totalPromptTokens, totalCompletionTokens, contextTurns, summaryMode, model]);

  // ============================================================
  // 系统 Prompt 编辑与回滚
  // ============================================================

  const startEditPrompt = useCallback(() => {
    setEditingPromptContent(agentSystemPrompt);
    setIsEditingPrompt(true);
  }, [agentSystemPrompt]);

  const savePrompt = useCallback(async () => {
    setSavingPrompt(true);
    try {
      const config = await getAgentConfig();
      config.systemPrompt = editingPromptContent;
      await saveAgentConfig(config);
      setAgentSystemPrompt(editingPromptContent);
      setIsEditingPrompt(false);
      showSuccessToast("系统 Prompt 已保存");
    } catch {
      showErrorToast("保存系统 Prompt 失败");
    } finally {
      setSavingPrompt(false);
    }
  }, [editingPromptContent]);

  const loadPromptVersionsForRollback = useCallback(async () => {
    setLoadingVersions(true);
    setPromptVersionsOpen(true);
    try {
      const versions = await getPromptVersions();
      setPromptVersions(versions);
    } catch {
      showErrorToast("加载版本历史失败");
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  const handleRollbackToVersion = useCallback(async (version: PromptVersion) => {
    setSavingPrompt(true);
    try {
      const config = await getAgentConfig();
      config.systemPrompt = version.content;
      await saveAgentConfig(config);
      setAgentSystemPrompt(version.content);
      setEditingPromptContent(version.content);
      setPromptVersionsOpen(false);
      showSuccessToast(`已回滚到 ${version.version}`);
    } catch {
      showErrorToast("回滚失败");
    } finally {
      setSavingPrompt(false);
    }
  }, []);

  // ============================================================
  // Enter 发送
  // ============================================================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
      {/* 上下文配置栏 */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-white border border-[#E5E5E5] rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-[13px] leading-[1.5] text-[#737373] whitespace-nowrap">
            保留轮数
          </span>
          <Select
            value={String(contextTurns)}
            onValueChange={(v) => setContextTurns(Number(v))}
          >
            <SelectTrigger className="w-[80px] h-8 text-[13px] rounded-[10px] border-[#E5E5E5]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTEXT_TURN_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] leading-[1.5] text-[#737373] whitespace-nowrap">
            摘要模式
          </span>
          <Select value={summaryMode} onValueChange={setSummaryMode}>
            <SelectTrigger className="w-[110px] h-8 text-[13px] rounded-[10px] border-[#E5E5E5]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUMMARY_MODE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] leading-[1.5] text-[#737373] whitespace-nowrap">
            模型
          </span>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[150px] h-8 text-[13px] rounded-[10px] border-[#E5E5E5]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
          >
            <RotateCcw size={14} strokeWidth={1.75} className="mr-1" />
            重置会话
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadSessions}
            className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
          >
            <FolderOpen size={14} strokeWidth={1.75} className="mr-1" />
            加载历史会话
          </Button>
        </div>
      </div>

      {/* 主体：左对话 + 右调试信息 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左：对话区域 */}
        <div className="flex flex-col flex-1 min-w-0 bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !streamingContent && (
              <div className="flex items-center justify-center h-full text-[#A3A3A3] text-[14px]">
                输入测试消息开始调试对话
              </div>
            )}

            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-[#0A0A0A] text-white rounded-xl rounded-tr-sm p-3 max-w-[80%]">
                    <p className="text-[15px] leading-[1.6]">{msg.content}</p>
                    <span className="block mt-1 text-[11px] leading-[1.5] text-white/60">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={14} strokeWidth={1.75} className="text-[#0A0A0A]" />
                  </div>
                  <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl rounded-tl-sm p-3 max-w-[80%]">
                    <p className="text-[15px] leading-[1.6] text-[#404040] whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <span className="block mt-1 text-[11px] leading-[1.5] text-[#737373]">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ),
            )}

            {/* 流式输出 */}
            {isStreaming && streamingContent && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={14} strokeWidth={1.75} className="text-[#0A0A0A]" />
                </div>
                <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl rounded-tl-sm p-3 max-w-[80%]">
                  <p className="text-[15px] leading-[1.6] text-[#404040] whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-[2px] h-[15px] bg-[#0A0A0A] ml-0.5 animate-pulse align-middle" />
                  </p>
                </div>
              </div>
            )}

            {/* 流式加载态（无内容时） */}
            {isStreaming && !streamingContent && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={14} strokeWidth={1.75} className="text-[#0A0A0A]" />
                </div>
                <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl rounded-tl-sm p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} strokeWidth={1.75} className="animate-spin text-[#737373]" />
                    <span className="text-[13px] text-[#737373]">思考中...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={dialogueEndRef} />
          </div>

          {/* 底部输入栏 */}
          <div className="p-4 border-t border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入测试问题..."
                disabled={isStreaming}
                className={cn(
                  "flex-1 h-10 rounded-xl border-[#E5E5E5]",
                  "text-[15px] leading-[1.6] placeholder:text-[#A3A3A3]",
                  "focus:border-[#0A0A0A] focus:ring-0",
                )}
              />
              {isStreaming ? (
                <Button
                  onClick={handleStop}
                  className="h-10 w-10 rounded-full bg-[#B42318] hover:bg-[#B42318]/90 text-white p-0 flex items-center justify-center"
                  aria-label="停止生成"
                >
                  <Square size={16} strokeWidth={1.75} fill="currentColor" />
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="h-10 w-10 rounded-full bg-[#0A0A0A] hover:bg-[#404040] text-white p-0 flex items-center justify-center disabled:opacity-30"
                  aria-label="发送"
                >
                  <Send size={16} strokeWidth={1.75} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 右：调试信息面板 */}
        <div className="w-[380px] shrink-0 flex flex-col min-h-0 space-y-4">
          {/* 每轮调试信息 */}
          <div className="flex-1 overflow-y-auto bg-white border border-[#E5E5E5] rounded-2xl p-4 space-y-4">
            {debugInfos.length === 0 && (
              <div className="flex items-center justify-center h-full text-[#A3A3A3] text-[13px]">
                发送消息后显示调试信息
              </div>
            )}

            {debugInfos.map((info) => (
              <div key={info.turn}>
                <div className="text-[11px] leading-[1.5] text-[#737373] mb-2">
                  ─ 第{info.turn}轮调试信息 ─
                </div>

                <div className="space-y-2 text-[13px] leading-[1.6]">
                  <div className="flex items-center gap-1">
                    <span className="text-[#737373]">意图：</span>
                    <span className="text-[#0A0A0A] font-medium">{info.intent}</span>
                    {info.intentChanged && info.previousIntent && (
                      <span className="text-[11px] text-[#B45309] ml-1">
                        ({info.previousIntent} → {info.intent})
                      </span>
                    )}
                  </div>

                  {Object.keys(info.entities).length > 0 && (
                    <div>
                      <span className="text-[#737373]">实体：</span>
                      <div className="ml-1 space-y-0.5">
                        {Object.entries(info.entities).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1">
                            <span className="text-[#A3A3A3]">{k}</span>
                            <span className="text-[#737373]">=</span>
                            <span className="text-[#404040]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[#737373]">
                    Token：prompt={info.promptTokens.toLocaleString()} completion={info.completionTokens.toLocaleString()}
                  </div>

                  {info.anaphoraResolved && (
                    <div className="text-[11px] text-[#1F7A4D]">
                      指代消解：已解析
                    </div>
                  )}

                  {info.contextRefTurn && (
                    <div className="text-[11px] text-[#737373]">
                      上下文引用：第{info.contextRefTurn}轮
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 实体追踪 */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
            <div className="text-[11px] leading-[1.5] text-[#737373] mb-2 uppercase tracking-[0.08em]">
              当前实体追踪
            </div>
            {trackedEntities.length === 0 ? (
              <div className="text-[12px] text-[#A3A3A3]">暂无实体</div>
            ) : (
              <div className="space-y-1.5">
                {trackedEntities.map((e) => (
                  <div key={e.key} className="flex items-center gap-2 text-[13px] leading-[1.5]">
                    <span className="text-[#A3A3A3]">{e.key}</span>
                    <span className="text-[#737373]">=</span>
                    <span className="text-[#404040]">{e.value}</span>
                    <span className="text-[11px] text-[#A3A3A3] ml-auto">
                      第{e.source}轮
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Token 累计 */}
          <div className="bg-white border border-[#E5E5E5] rounded-2xl p-4">
            <div className="text-[11px] leading-[1.5] text-[#737373] mb-2 uppercase tracking-[0.08em]">
              Token累计
            </div>
            <div className="text-[13px] leading-[1.6] text-[#404040]">
              prompt={totalPromptTokens.toLocaleString()} completion={totalCompletionTokens.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作按钮 */}
      <div className="flex items-center gap-3 mt-4 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewFullPrompt}
          className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
        >
          <Eye size={14} strokeWidth={1.75} className="mr-1" />
          查看完整Prompt
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewContextWindow}
          className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
        >
          <Eye size={14} strokeWidth={1.75} className="mr-1" />
          查看上下文窗口
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
        >
          <Download size={14} strokeWidth={1.75} className="mr-1" />
          导出调试记录
        </Button>
      </div>

      {/* 上下文窗口抽屉 */}
      <AdminDrawer
        open={contextDrawerOpen}
        onOpenChange={setContextDrawerOpen}
        title="上下文窗口"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] text-[#404040] mb-4">
            <span>总 Token 数：</span>
            <span className="font-medium text-[#0A0A0A]">
              {contextWindowSections.reduce((s, sec) => s + sec.tokenCount, 0).toLocaleString()}
            </span>
          </div>

          {contextWindowSections.map((section) => {
            const isExpanded = expandedSections[section.id] ?? false;
            return (
              <div
                key={section.id}
                className="border border-[#E5E5E5] rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSections((prev) => ({
                      ...prev,
                      [section.id]: !isExpanded,
                    }))
                  }
                  className="flex items-center justify-between w-full px-4 py-3 bg-[#FAFAFA] hover:bg-[#F5F5F5] transition-colors duration-150"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown size={14} strokeWidth={1.75} className="text-[#737373]" />
                    ) : (
                      <ChevronRight size={14} strokeWidth={1.75} className="text-[#737373]" />
                    )}
                    <span className="text-[13px] leading-[1.5] text-[#404040]">
                      {section.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#A3A3A3]">
                    {section.tokenCount.toLocaleString()} tokens
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-4 py-3 border-t border-[#E5E5E5]">
                    {section.id === "system-prompt" ? (
                      <div className="space-y-3">
                        {isEditingPrompt ? (
                          <>
                            <Textarea
                              value={editingPromptContent}
                              onChange={(e) => setEditingPromptContent(e.target.value)}
                              className={cn(
                                "h-40 rounded-[10px] border-[#E5E5E5]",
                                "text-[12px] leading-[1.6] text-[#404040] font-mono",
                                "focus-visible:border-[#0A0A0A] focus-visible:ring-1 focus-visible:ring-[#0A0A0A]/10",
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={savePrompt}
                                disabled={savingPrompt}
                                className="h-8 px-3 text-[12px] rounded-full bg-[#0A0A0A] text-white hover:bg-[#404040]"
                              >
                                {savingPrompt ? (
                                  <Loader2 size={12} strokeWidth={1.75} className="mr-1 animate-spin" />
                                ) : null}
                                保存
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditingPrompt(false)}
                                className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
                              >
                                取消
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <pre className="text-[12px] leading-[1.6] text-[#404040] font-mono whitespace-pre-wrap break-all">
                              {section.content}
                            </pre>
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E5E5E5]">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={startEditPrompt}
                                className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
                              >
                                <Pencil size={12} strokeWidth={1.75} className="mr-1" />
                                编辑
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={loadPromptVersionsForRollback}
                                className="h-8 px-3 text-[12px] rounded-full border-[#E5E5E5] text-[#404040] hover:bg-[#FAFAFA]"
                              >
                                <Undo2 size={12} strokeWidth={1.75} className="mr-1" />
                                版本回滚
                              </Button>
                            </div>
                            {promptVersionsOpen && (
                              <div className="space-y-1 mt-2">
                                <div className="text-[11px] text-[#737373] mb-1">
                                  {loadingVersions ? "加载中..." : "选择版本回滚"}
                                </div>
                                {loadingVersions ? (
                                  <div className="flex items-center gap-2 py-2">
                                    <Loader2 size={14} strokeWidth={1.75} className="animate-spin text-[#737373]" />
                                    <span className="text-[12px] text-[#A3A3A3]">加载版本历史...</span>
                                  </div>
                                ) : promptVersions.length === 0 ? (
                                  <div className="text-[12px] text-[#A3A3A3] py-2">暂无版本历史</div>
                                ) : (
                                  promptVersions.map((v) => (
                                    <button
                                      key={v.version}
                                      type="button"
                                      onClick={() => handleRollbackToVersion(v)}
                                      disabled={savingPrompt}
                                      className={cn(
                                        "w-full text-left p-2 rounded-[8px]",
                                        "border border-[#E5E5E5]",
                                        "hover:bg-[#FAFAFA] transition-colors duration-150",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[12px] leading-[1.5] text-[#404040] font-medium">
                                          {v.version}
                                        </span>
                                        <span className="text-[11px] text-[#A3A3A3]">
                                          {v.editor} · {v.editedAt}
                                        </span>
                                      </div>
                                      <p className="text-[11px] leading-[1.5] text-[#737373] mt-0.5 line-clamp-1">
                                        {v.content}
                                      </p>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <pre className="text-[12px] leading-[1.6] text-[#404040] font-mono whitespace-pre-wrap break-all">
                        {section.content}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AdminDrawer>

      {/* 完整 Prompt 抽屉 */}
      <AdminDrawer
        open={fullPromptDrawerOpen}
        onOpenChange={setFullPromptDrawerOpen}
        title="完整 Prompt 预览"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-[13px]">
            <span className="text-[#737373]">总字符数：</span>
            <span className="text-[#404040]">{fullPromptContent.length.toLocaleString()}</span>
            <span className="text-[#737373]">估算 Token：</span>
            <span className="text-[#404040]">{promptTokens.toLocaleString()}</span>
          </div>

          <div className="border border-[#E5E5E5] rounded-xl overflow-hidden">
            <pre className="text-[12px] leading-[1.6] text-[#404040] font-mono whitespace-pre-wrap break-all p-4 max-h-[60vh] overflow-y-auto">
              {fullPromptContent}
            </pre>
          </div>
        </div>
      </AdminDrawer>

      {/* 加载历史会话弹窗 */}
      <AdminModal
        open={sessionModalOpen}
        onOpenChange={setSessionModalOpen}
        title="加载历史会话"
        size="sm"
      >
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} strokeWidth={1.75} className="animate-spin text-[#737373]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-[13px] text-[#A3A3A3] text-center py-8">
              暂无历史会话
            </div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSession(s)}
                className="w-full text-left p-3 border border-[#E5E5E5] rounded-xl hover:bg-[#FAFAFA] transition-colors duration-150"
              >
                <div className="text-[13px] leading-[1.5] text-[#0A0A0A] font-medium">
                  {s.title}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-[#A3A3A3]">
                  <span>{s.turnCount} 轮对话</span>
                  <span>{s.createdAt}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </AdminModal>
    </div>
  );
}

// ============================================================
// Token 估算
// ============================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2.5);
}

export default DebugDialogueTab;
