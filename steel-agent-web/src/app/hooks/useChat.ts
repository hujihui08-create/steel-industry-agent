// ============================================================
// useChat SSE 流式对话 Hook
// 封装 sendMessage / stopGeneration / continueGeneration
// 以及 session 切换、新建、删除、加载等操作
// ============================================================

import { useCallback, useRef } from 'react';
import { useChatStore } from '@/app/stores/chatStore';
import * as chatApi from '@/app/api/chat';
import type { ChatMessage, CardAttachment } from '@/app/types/chat';

export function useChat() {
  const store = useChatStore();
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  // -----------------------------------------------------------
  // 发送消息（SSE 流式）
  // -----------------------------------------------------------
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || store.isStreaming) return;

    const sessionId = store.currentSessionId || 0;
    const userMessage: ChatMessage = {
      id: Date.now(),
      session_id: sessionId,
      role: 'user',
      content: content.trim(),
      tokens: 0,
      created_at: new Date().toISOString(),
    };

    store.addMessage(userMessage);
    store.setInputValue('');
    store.setError(null);
    store.setStreaming(true);
    store.clearAttachments();
    stoppedRef.current = false;

    const fullContent: string[] = [];

    const controller = chatApi.sendMessage(
      { session_id: sessionId, content: content.trim() },
      (chunk) => {
        fullContent.push(chunk);
        store.setStatusMessage(null);
        store.appendToLastMessage(chunk);
      },
      (error) => {
        store.setStatusMessage(null);
        store.setError(error);
        store.setStreaming(false);
      },
      async () => {
        store.setStatusMessage(null);
        store.setStreaming(false);
        if (store.currentSessionId !== null) {
          try {
            const [sessions, messages] = await Promise.all([
              chatApi.getSessions(),
              chatApi.getSessionMessages(store.currentSessionId),
            ]);
            store.setSessions(sessions);
            if (messages.length > 0) {
              store.setMessages(messages);
            }
          } catch {
            // 静默失败
          }
        }
      },
      (card) => {
        const currentMessages = useChatStore.getState().messages;
        const lastIdx = currentMessages.length - 1;
        if (lastIdx >= 0) {
          store.appendAttachment(lastIdx, card);
        }
      },
      (newSessionId, title) => {
        store.fixMessageSessionIds(newSessionId);
        store.setCurrentSessionId(newSessionId);

        const now = new Date().toISOString();
        store.setSessions([
          {
            id: newSessionId,
            user_id: 0,
            title: title || content.trim().slice(0, 30),
            model: '',
            message_count: 1,
            context: null,
            created_at: now,
            updated_at: now,
          },
          ...useChatStore.getState().sessions,
        ]);
      },
      (status) => {
        store.setStatusMessage(status);
      },
    );

    abortRef.current = controller;
  }, [store]);

  // -----------------------------------------------------------
  // 停止生成
  // -----------------------------------------------------------
  const stopGeneration = useCallback(async () => {
    if (!store.isStreaming || !store.currentSessionId) return;

    stoppedRef.current = true;
    abortRef.current?.abort();
    store.setStreaming(false);
    store.markLastMessageStopped();

    try {
      await chatApi.stopGeneration(store.currentSessionId);
    } catch {
      // 静默失败
    }
  }, [store]);

  // -----------------------------------------------------------
  // 继续生成
  // -----------------------------------------------------------
  const continueGeneration = useCallback(async () => {
    if (!store.currentSessionId) return;

    store.setStreaming(true);
    store.setError(null);
    stoppedRef.current = false;

    const currentMessages = useChatStore.getState().messages;
    const lastIdx = currentMessages.length - 1;
    if (lastIdx >= 0) {
      const lastMsg = currentMessages[lastIdx];
      if (lastMsg.role === "assistant" && lastMsg.content.includes("_已停止生成_")) {
        useChatStore.setState({
          messages: currentMessages.map((m, i) =>
            i === lastIdx
              ? { ...m, content: m.content.replace(/_已停止生成_/g, "").trim() }
              : m,
          ),
        });
      }
    }

    const controller = chatApi.continueGeneration(
      { session_id: store.currentSessionId, content: '' },
      (chunk) => {
        store.setStatusMessage(null);
        store.appendToLastMessage(chunk);
      },
      (error) => {
        store.setStatusMessage(null);
        store.setError(error);
        store.setStreaming(false);
      },
      () => {
        store.setStatusMessage(null);
        store.setStreaming(false);
      },
      (card) => {
        const currentMessages = useChatStore.getState().messages;
        const lastIdx = currentMessages.length - 1;
        if (lastIdx >= 0) {
          store.appendAttachment(lastIdx, card);
        }
      }
    );

    abortRef.current = controller;
  }, [store]);

  // -----------------------------------------------------------
  // 切换会话
  // -----------------------------------------------------------
  const switchSession = useCallback(async (sessionId: number) => {
    store.setCurrentSessionId(sessionId);
    store.setError(null);
    try {
      const messages = await chatApi.getSessionMessages(sessionId);
      store.setMessages(messages);
    } catch {
      store.setMessages([]);
    }
  }, [store]);

  // -----------------------------------------------------------
  // 新建会话
  // -----------------------------------------------------------
  const newSession = useCallback(() => {
    store.newSession();
  }, [store]);

  // -----------------------------------------------------------
  // 加载会话列表
  // -----------------------------------------------------------
  const loadSessions = useCallback(async () => {
    try {
      const sessions = await chatApi.getSessions();
      store.setSessions(sessions);
      if (sessions.length > 0) {
        store.setCurrentSessionId(sessions[0].id);
        const messages = await chatApi.getSessionMessages(sessions[0].id);
        store.setMessages(messages);
      }
    } catch {
      // 静默失败
    }
  }, []);

  // -----------------------------------------------------------
  // 删除会话
  // -----------------------------------------------------------
  const deleteSession = useCallback(async (sessionId: number) => {
    try {
      await chatApi.deleteSession(sessionId);
      store.removeSession(sessionId);
    } catch {
      store.setError("删除会话失败，请稍后重试");
      throw new Error("deleteSession failed");
    }
  }, [store]);

  return {
    sendMessage,
    stopGeneration,
    continueGeneration,
    switchSession,
    newSession,
    loadSessions,
    deleteSession,
  };
}
