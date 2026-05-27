// ============================================================
// Agent调试工具 API 层
// 对应后端 /api/v1/admin/debug/* 接口
// ============================================================

import { adminApiClient } from "./client";
import type { ApiResponse } from "@/app/types/api";
import { getAdminToken } from "@/app/utils/auth";

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
  id: number;
  title: string;
  createdAt: string;
  turnCount: number;
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

export type DebugChatStreamEvent =
  | { type: "token"; data: { content: string } }
  | { type: "debug_info"; data: { intent?: { code?: string; name?: string }; entities?: Array<{ key: string; value: string }>; prompt_tokens?: number; completion_tokens?: number; match_method?: string; keywords?: string[] } }
  | { type: "tool_call"; data: { tool_name: string; arguments: string } }
  | { type: "tool_result"; data: { tool_name: string; status: string; result?: unknown; error?: string; duration_ms?: number } }
  | { type: "done"; data: { message?: string; turns?: number; total_prompt_tokens?: number; total_completion_tokens?: number } }
  | { type: "error"; data: { message: string } }
  | { type: "intent_match"; data: IntentMatchData };

export interface DebugTokenData {
  content: string;
}

export interface DebugInfoData {
  intent: string;
  entities: Record<string, string>;
  tool_name?: string;
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
  tool_name?: string;
}

export interface ToolCallData {
  tool_name: string;
  arguments: string;
}

export interface DebugDoneData {
  message?: string;
  turns?: number;
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
}

// ============================================================
// 获取工具 Schema 列表
// ============================================================

export async function getToolSchemas(): Promise<ToolSchema[]> {
  const { data } = await adminApiClient.get<ApiResponse<ToolSchema[]>>("/admin/debug/tool/schemas");
  return data.data ?? [];
}

// ============================================================
// 获取工具健康状态
// ============================================================

export async function getToolHealth(): Promise<ToolHealthResult> {
  const { data } = await adminApiClient.get<ApiResponse<ToolHealthResult>>("/admin/debug/tool/health");
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
  const { data } = await adminApiClient.post<ApiResponse<ToolExecuteResult>>(
    "/admin/debug/tool/execute",
    { tool_name: toolName, params, use_mock: useMock },
  );
  if (!data?.data) throw new Error(data?.message || "工具执行失败");
  return data.data;
}

// ============================================================
// 测试意图识别
// ============================================================

export async function testIntent(text: string): Promise<IntentTestResult> {
  const { data } = await adminApiClient.post<ApiResponse<{
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
  const { data } = await adminApiClient.post<ApiResponse<PromptPreviewResult>>(
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
  const { data } = await adminApiClient.get<ApiResponse<DebugSessionItem[]>>(
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
  const { data } = await adminApiClient.post<ApiResponse<DebugSessionMessages>>(
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
  const { data } = await adminApiClient.get<ApiResponse<MockConfig[]>>(
    "/admin/debug/tool/mock",
  );
  return data.data ?? [];
}

export async function saveMockConfig(
  toolName: string,
  mockData: unknown,
  scenario: string,
): Promise<void> {
  const { data } = await adminApiClient.post<ApiResponse<null>>(
    "/admin/debug/tool/mock",
    { tool_name: toolName, mock_data: mockData, scenario },
  );
  if (data.code !== 200) throw new Error(data.message || "保存Mock配置失败");
}

// DELETE 通过请求体传参，因为 toolName 可能包含特殊字符不适合作为 URL 路径段，
// 且该接口遵循后端 RESTful 风格约定使用 data 字段传递参数。
export async function deleteMockConfig(toolName: string): Promise<void> {
  const { data } = await adminApiClient.delete<ApiResponse<null>>(
    "/admin/debug/tool/mock",
    { data: { tool_name: toolName } },
  );
  if (data.code !== 200) throw new Error(data.message || "删除Mock配置失败");
}

// ============================================================
// 调试对话（SSE 流式）
// ============================================================

export async function* debugChatStream(
  sessionId: string,
  message: string,
  contextTurns: number,
  model: string,
  summaryMode: string = "auto",
): AsyncGenerator<DebugChatStreamEvent, void, undefined> {
  const token = getAdminToken();
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
          yield { type: "done", data: { message: "", total_prompt_tokens: 0, total_completion_tokens: 0 } };
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
