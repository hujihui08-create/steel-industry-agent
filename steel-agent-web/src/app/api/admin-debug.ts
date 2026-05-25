// ============================================================
// Agent调试工具 API 层
// 对应后端 /api/v1/admin/debug/* 接口
// ============================================================

import apiClient from "./client";
import type { ApiResponse } from "@/app/types/api";

// ============================================================
// 类型定义
// ============================================================

export interface ToolSchema {
  name: string;
  displayName: string;
  description: string;
  parameters: ToolParameterSchema;
}

export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, ToolParamProperty>;
  required?: string[];
}

export interface ToolParamProperty {
  type: "string" | "number" | "boolean";
  description: string;
  enum?: string[];
}

export interface ToolHealthItem {
  name: string;
  displayName: string;
  status: "normal" | "degraded" | "down";
  responseTime: number;
  successRate: number;
  lastError: string;
}

export interface ToolHealthResult {
  tools: ToolHealthItem[];
  summary: {
    normal: number;
    degraded: number;
    down: number;
  };
}

export interface ToolExecuteResult {
  status: "success" | "error";
  result: unknown;
  chain: CallChainStep[];
  durationMs: number;
}

export interface CallChainStep {
  step: string;
  status: "success" | "error" | "skipped";
  durationMs: number;
  detail?: string;
}

export interface IntentTestEntity {
  key: string;
  value: string;
}

export interface IntentTestResult {
  intent: { code: string; name: string; confidence: number };
  entities: IntentTestEntity[];
  matchedKeywords: string[];
  matchMethod: "keyword" | "model";
}

export interface PromptPreviewResult {
  renderedPrompt: string;
  totalChars: number;
  estimatedTokens: number;
  variablesUsed: string[];
}

export interface DebugSessionItem {
  id: string;
  title: string;
  turnCount: number;
  createdAt: string;
  userId: number;
}

export interface DebugSessionMessages {
  sessionId: string;
  messages: DebugMessage[];
}

export interface DebugMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp?: string;
  toolCalls?: unknown[];
}

export interface MockConfig {
  toolName: string;
  mockData: unknown;
  scenario: string;
}

export interface DebugChatStreamEvent {
  type: "token" | "debug_info" | "tool_call" | "done" | "error" | "intent_match";
  data: DebugTokenData | DebugInfoData | ToolCallData | DebugDoneData | { message: string } | IntentMatchData;
}

export interface DebugTokenData {
  token: string;
}

export interface DebugInfoData {
  intent: string;
  entities: Record<string, string>;
  promptTokens: number;
  completionTokens: number;
  anaphoraResolved: boolean;
  contextRefTurn: number | null;
  intentChanged: boolean;
  previousIntent: string | null;
}

export interface IntentMatchData {
  match_method: "keyword" | "llm" | "none";
  intent: string;
  confidence: number;
  entities: Record<string, string>;
}

export interface ToolCallData {
  toolName: string;
  params: Record<string, unknown>;
  result: unknown;
  durationMs: number;
}

export interface DebugDoneData {
  summary: string;
  totalPromptTokens: number;
  totalCompletionTokens: number;
}

// ============================================================
// 获取工具 Schema 列表
// ============================================================

export async function getToolSchemas(): Promise<ToolSchema[]> {
  const { data } = await apiClient.get<ApiResponse<ToolSchema[]>>("/admin/debug/tool/schemas");
  return data.data ?? [];
}

// ============================================================
// 获取工具健康状态
// ============================================================

export async function getToolHealth(): Promise<ToolHealthResult> {
  const { data } = await apiClient.get<ApiResponse<ToolHealthResult>>("/admin/debug/tool/health");
  return data.data!;
}

// ============================================================
// 执行工具
// ============================================================

export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  useMock = false,
): Promise<ToolExecuteResult> {
  const { data } = await apiClient.post<ApiResponse<ToolExecuteResult>>(
    "/admin/debug/tool/execute",
    { tool_name: toolName, params, mock: useMock },
  );
  if (!data?.data) throw new Error(data?.message || "工具执行失败");
  return data.data;
}

// ============================================================
// 测试意图识别
// ============================================================

export async function testIntent(text: string): Promise<IntentTestResult> {
  const { data } = await apiClient.post<ApiResponse<{
    intent: { code: string; name: string; confidence: number };
    entities: IntentTestEntity[];
    matched_keywords: string[];
    match_method: string;
  }>>(
    "/admin/debug/intent",
    { text },
  );
  if (!data?.data) throw new Error(data?.message || "意图测试失败");
  return {
    intent: data.data.intent,
    entities: data.data.entities ?? [],
    matchedKeywords: data.data.matched_keywords ?? [],
    matchMethod: (data.data.match_method as "keyword" | "model") ?? "keyword",
  };
}

// ============================================================
// debug_info SSE 事件归一化
// 后端发送: { intent: {code, name, confidence}, entities: [{key, value}], ... }
// 前端期望: { intent: string, entities: Record<string, string>, ... }
// ============================================================

export function normalizeDebugInfo(raw: Record<string, unknown>): {
  intent: string;
  entities: Record<string, string>;
  promptTokens: number;
  completionTokens: number;
  anaphoraResolved: boolean;
  contextRefTurn: number | null;
  intentChanged: boolean;
  previousIntent: string | null;
} {
  const intentObj = (raw.intent as Record<string, unknown>) ?? {};
  const intentStr = typeof raw.intent === "string"
    ? raw.intent
    : ((intentObj.name as string) ?? (intentObj.code as string) ?? "");

  const entitiesArr = (raw.entities as Array<{ key: string; value: string }>) ?? [];
  const entities: Record<string, string> = {};
  for (const e of entitiesArr) {
    if (e.key && e.value) entities[e.key] = e.value;
  }

  return {
    intent: intentStr,
    entities,
    promptTokens: (raw.prompt_tokens as number) ?? (raw.promptTokens as number) ?? 0,
    completionTokens: (raw.completion_tokens as number) ?? (raw.completionTokens as number) ?? 0,
    anaphoraResolved: (raw.anaphora_resolved as boolean) ?? (raw.anaphoraResolved as boolean) ?? false,
    contextRefTurn: (raw.context_ref_turn as number) ?? (raw.contextRefTurn as number) ?? null,
    intentChanged: (raw.intent_changed as boolean) ?? (raw.intentChanged as boolean) ?? false,
    previousIntent: (raw.previous_intent as string) ?? (raw.previousIntent as string) ?? null,
  };
}

// ============================================================
// Prompt 预览
// ============================================================

export async function previewPrompt(
  variables: Record<string, string>,
): Promise<PromptPreviewResult> {
  const { data } = await apiClient.post<ApiResponse<PromptPreviewResult>>(
    "/admin/debug/prompt/preview",
    { variables },
  );
  if (!data?.data) throw new Error(data?.message || "Prompt预览失败");
  return data.data;
}

// ============================================================
// 获取历史调试会话列表
// ============================================================

export async function getDebugSessions(): Promise<DebugSessionItem[]> {
  const { data } = await apiClient.get<ApiResponse<DebugSessionItem[]>>(
    "/admin/debug/chat/sessions",
  );
  return data.data ?? [];
}

// ============================================================
// 加载历史会话
// ============================================================

export async function loadDebugSession(
  sessionId: string,
): Promise<DebugSessionMessages> {
  const { data } = await apiClient.post<ApiResponse<DebugSessionMessages>>(
    "/admin/debug/chat/load-session",
    { session_id: sessionId },
  );
  if (!data?.data) throw new Error(data?.message || "加载会话失败");
  return data.data;
}

// ============================================================
// Mock 配置管理
// ============================================================

export async function getMockConfigs(): Promise<MockConfig[]> {
  const { data } = await apiClient.get<ApiResponse<MockConfig[]>>(
    "/admin/debug/tool/mock",
  );
  return data.data ?? [];
}

export async function saveMockConfig(
  toolName: string,
  mockData: unknown,
  scenario: string,
): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(
    "/admin/debug/tool/mock",
    { tool_name: toolName, mock_data: mockData, scenario },
  );
  if (data.code !== 200) throw new Error(data.message || "保存Mock配置失败");
}

export async function deleteMockConfig(toolName: string): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(
    "/admin/debug/tool/mock",
    { data: { tool_name: toolName } },
  );
  if (data.code !== 200) throw new Error(data.message || "删除Mock配置失败");
}

// ============================================================
// 调试对话（SSE 流式）
// ============================================================

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function* debugChatStream(
  sessionId: string,
  message: string,
  contextTurns: number,
  model: string,
  summaryMode: string = "auto",
): AsyncGenerator<DebugChatStreamEvent, void, undefined> {
  const token = getStoredToken();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";

  const response = await fetch(`${baseUrl}/admin/debug/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      context_turns: contextTurns,
      model,
      summary_mode: summaryMode,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    yield { type: "error", data: { message: `HTTP ${response.status}: ${errorText}` } };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: "error", data: { message: "无法读取响应流" } };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr === "[DONE]") {
          yield { type: "done", data: { summary: "", totalPromptTokens: 0, totalCompletionTokens: 0 } };
          return;
        }

        try {
          const event: DebugChatStreamEvent = JSON.parse(jsonStr);
          yield event;
        } catch {
          // 跳过无法解析的帧
        }
      }
    }

    // 处理剩余缓冲区
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data: ")) {
        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr !== "[DONE]") {
          try {
            const event: DebugChatStreamEvent = JSON.parse(jsonStr);
            yield event;
          } catch {
            // 跳过
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
