// ============================================================
// AI 对话 API 函数封装
// - REST 接口通过 apiClient 发送（自动附带 Token 并刷新）
// - SSE 流式接口使用原生 fetch（支持 ReadableStream）
// ============================================================

import apiClient from "@/app/api/client";
import { AUTH_STORAGE_KEY } from "@/app/config";
import type { ApiResponse, AuthStorageState } from "@/app/types/api";
import type {
  ChatSession,
  ChatMessage,
  ChatCompletionsRequest,
  AIFeedback,
  CardAttachment,
} from "@/app/types/chat";

// -----------------------------------------------------------
// Token 读取工具（与 client.ts 保持一致）
// -----------------------------------------------------------

function getStoredTokens(): {
  access_token: string | null;
  refresh_token: string | null;
} {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { access_token: null, refresh_token: null };
    const parsed: AuthStorageState = JSON.parse(raw);
    return {
      access_token: parsed.state?.access_token ?? null,
      refresh_token: parsed.state?.refresh_token ?? null,
    };
  } catch {
    return { access_token: null, refresh_token: null };
  }
}

// -----------------------------------------------------------
// 获取会话列表
// GET /api/v1/chat/sessions
// -----------------------------------------------------------

export async function getSessions(
  limit = 20,
  offset = 0,
): Promise<ChatSession[]> {
  const { data } = await apiClient.get<ApiResponse<ChatSession[]>>(
    "/chat/sessions",
    { params: { limit, offset } },
  );
  if (!data?.data) throw new Error(data?.message || "获取会话列表失败");
  return data.data;
}

// -----------------------------------------------------------
// 获取会话消息
// GET /api/v1/chat/sessions/:id/messages
// -----------------------------------------------------------

export async function getSessionMessages(
  sessionId: number,
): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<ApiResponse<ChatMessage[]>>(
    `/chat/sessions/${sessionId}/messages`,
  );
  if (!data?.data) throw new Error(data?.message || "获取消息列表失败");
  return data.data;
}

// -----------------------------------------------------------
// SSE 流式解析（共享实现）
// -----------------------------------------------------------

function parseSSEStream(
  response: Response,
  onChunk: (chunk: string) => void,
  onError: (error: string) => void,
  onDone: () => void,
  onCard?: (card: CardAttachment) => void,
  onSessionId?: (sessionId: number, title?: string) => void,
  onStatus?: (status: string) => void,
): Promise<void> {
  return new Promise<void>(async (resolve) => {
    try {
      const reader = response.body?.getReader();
      if (!reader) {
        onError("Response body is not readable");
        resolve();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();

          if (data === "[DONE]") {
            onDone();
            resolve();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              onError(parsed.error);
            } else if (parsed.status) {
              onStatus?.(parsed.status);
            } else if (parsed.session_id !== undefined) {
              onSessionId?.(parsed.session_id, parsed.title);
            } else if (parsed.content !== undefined) {
              onChunk(parsed.content);
            } else if (parsed.type === "card" && parsed.card_type && parsed.data) {
              onCard?.({ type: parsed.card_type as CardAttachment['type'], data: parsed.data });
            }
          } catch {
            // 跳过无法解析的行（如 keep-alive 注释）
          }
        }
      }
      onDone();
    } catch {
      // 静默
    }
    resolve();
  });
}

// -----------------------------------------------------------
// SSE 流式对话
// POST /api/v1/chat/completions
//
// 使用原生 fetch + ReadableStream 处理 SSE 协议。
// 返回值 AbortController 用于中断生成。
// -----------------------------------------------------------

export function sendMessage(
  request: ChatCompletionsRequest,
  onChunk: (chunk: string) => void,
  onError: (error: string) => void,
  onDone: () => void,
  onCard?: (card: CardAttachment) => void,
  onSessionId?: (sessionId: number, title?: string) => void,
  onStatus?: (status: string) => void,
): AbortController {
  const controller = new AbortController();
  const { access_token } = getStoredTokens();

  fetch("/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify(request),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      await parseSSEStream(response, onChunk, onError, onDone, onCard, onSessionId, onStatus);
    })
    .catch((err: Error) => {
      if (err.name !== "AbortError") {
        onError(err.message);
      }
    });

  return controller;
}

// -----------------------------------------------------------
// 停止生成
// POST /api/v1/chat/stop
// -----------------------------------------------------------

export async function stopGeneration(sessionId: number): Promise<void> {
  await apiClient.post("/chat/stop", { session_id: sessionId });
}

// -----------------------------------------------------------
// 继续生成（中断后恢复）
// POST /api/v1/chat/continue
// -----------------------------------------------------------

export function continueGeneration(
  request: ChatCompletionsRequest,
  onChunk: (chunk: string) => void,
  onError: (error: string) => void,
  onDone: () => void,
  onCard?: (card: CardAttachment) => void,
  onSessionId?: (sessionId: number, title?: string) => void,
  onStatus?: (status: string) => void,
): AbortController {
  const controller = new AbortController();
  const { access_token } = getStoredTokens();

  fetch("/api/v1/chat/continue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({ session_id: request.session_id }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      await parseSSEStream(response, onChunk, onError, onDone, onCard, onSessionId, onStatus);
    })
    .catch((err: Error) => {
      if (err.name !== "AbortError") {
        onError(err.message);
      }
    });

  return controller;
}

// -----------------------------------------------------------
// 提交反馈
// POST /api/v1/chat/feedback
// -----------------------------------------------------------

export async function submitFeedback(feedback: AIFeedback): Promise<void> {
  await apiClient.post("/chat/feedback", feedback);
}

// -----------------------------------------------------------
// 删除会话
// DELETE /api/v1/chat/sessions/:id
// -----------------------------------------------------------

export async function deleteSession(sessionId: number): Promise<void> {
  await apiClient.delete(`/chat/sessions/${sessionId}`);
}
