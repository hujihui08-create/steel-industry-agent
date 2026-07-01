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
  const abortRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);
  const generationRef = useRef(0);

  // -----------------------------------------------------------
  // 发送消息（SSE 流式）
  // -----------------------------------------------------------
  const sendMessage = useCallback(async (content: string) => {
    const store = useChatStore.getState();
    if (!content.trim() || store.isStreaming) return;

    const genId = ++generationRef.current;

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

    const controller = chatApi.sendMessage(
      { session_id: sessionId, content: content.trim() },
      (chunk) => {
        const s = useChatStore.getState();
        s.setStatusMessage(null);
        s.appendToLastMessage(chunk);
      },
      (error) => {
        const s = useChatStore.getState();
        s.setStatusMessage(null);
        s.setError(error);
        s.setStreaming(false);
      },
      async () => {
        const s = useChatStore.getState();
        s.setStatusMessage(null);
        s.setStreaming(false);

        const inMemoryAttachments = new Map<number, CardAttachment[]>();
        s.messages.forEach((msg, idx) => {
          if (msg.role === 'assistant' && msg.attachments && msg.attachments.length > 0) {
            inMemoryAttachments.set(idx, [...msg.attachments]);
          }
        });

        if (s.currentSessionId !== null) {
          try {
            const [sessions, messages] = await Promise.all([
              chatApi.getSessions(),
              chatApi.getSessionMessages(s.currentSessionId),
            ]);
            if (genId !== generationRef.current) return;
            s.setSessions(sessions);
            if (messages.length > 0) {
              if (inMemoryAttachments.size > 0) {
                const mergedMessages = messages.map((msg, idx) => {
                  if (msg.role === 'assistant' && inMemoryAttachments.has(idx)) {
                    return { ...msg, attachments: inMemoryAttachments.get(idx) };
                  }
                  return msg;
                });
                s.setMessages(mergedMessages);
              } else {
                s.setMessages(messages);
              }
            }
          } catch {
            // 静默失败
          }
        }
        // Reset agent state on completion
        s.resetAgentState();
      },
      (card) => {
        const s = useChatStore.getState();
        const currentMessages = s.messages;
        const lastIdx = currentMessages.length - 1;
        if (lastIdx >= 0) {
          s.appendAttachment(lastIdx, card);
        }
      },
      (newSessionId, title) => {
        const s = useChatStore.getState();
        s.fixMessageSessionIds(newSessionId);
        s.setCurrentSessionId(newSessionId);

        const now = new Date().toISOString();
        s.setSessions([
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
          ...s.sessions,
        ]);
      },
      (status) => {
        useChatStore.getState().setStatusMessage(status);
      },
      (eventType, data) => {
        const s = useChatStore.getState();
        switch (eventType) {
          case 'plan_created':
            s.setAgentPlan(data as unknown as import('@/app/stores/chatStore').AgentPlan);
            break;
          case 'step_start': {
            const stepIdx = (data.step as number) - 1;
            s.updateAgentStep(stepIdx, { status: 'running' });
            break;
          }
          case 'step_complete': {
            const stepIdx = (data.step as number) - 1;
            s.updateAgentStep(stepIdx, {
              status: 'done',
              result: typeof data.result === 'string' ? data.result : JSON.stringify(data.result),
            });
            break;
          }
          case 'step_failed': {
            const stepIdx = (data.step as number) - 1;
            s.updateAgentStep(stepIdx, {
              status: 'failed',
              error: typeof data.error === 'string' ? data.error : '步骤执行失败',
            });
            break;
          }
          case 'reflection':
            // Reflection data stored for potential display
            break;
        }
      },
    );

    abortRef.current = controller;
  }, []);

  // -----------------------------------------------------------
  // 停止生成
  // -----------------------------------------------------------
  const stopGeneration = useCallback(async () => {
    const store = useChatStore.getState();
    if (!store.isStreaming || !store.currentSessionId) return;

    stoppedRef.current = true;
    abortRef.current?.abort();
    store.setStreaming(false);
    store.markLastMessageStopped();
    store.resetAgentState();

    try {
      await chatApi.stopGeneration(store.currentSessionId);
    } catch {
      // 静默失败
    }
  }, []);

  // -----------------------------------------------------------
  // 继续生成
  // -----------------------------------------------------------
  const continueGeneration = useCallback(async () => {
    const store = useChatStore.getState();
    if (!store.currentSessionId) return;

    store.setStreaming(true);
    store.setError(null);
    stoppedRef.current = false;

    const currentMessages = store.messages;
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
        const s = useChatStore.getState();
        s.setStatusMessage(null);
        s.appendToLastMessage(chunk);
      },
      (error) => {
        const s = useChatStore.getState();
        s.setStatusMessage(null);
        s.setError(error);
        s.setStreaming(false);
      },
      () => {
        const s = useChatStore.getState();
        s.setStatusMessage(null);
        s.setStreaming(false);
      },
      (card) => {
        const s = useChatStore.getState();
        const currentMessages = s.messages;
        const lastIdx = currentMessages.length - 1;
        if (lastIdx >= 0) {
          s.appendAttachment(lastIdx, card);
        }
      }
    );

    abortRef.current = controller;
  }, []);

  // -----------------------------------------------------------
  // 切换会话
  // -----------------------------------------------------------
  const switchSession = useCallback(async (sessionId: number) => {
    const store = useChatStore.getState();
    store.setCurrentSessionId(sessionId);
    store.setError(null);
    try {
      const messages = await chatApi.getSessionMessages(sessionId);
      store.setMessages(messages);
    } catch {
      store.setMessages([]);
    }
  }, []);

  // -----------------------------------------------------------
  // 新建会话
  // -----------------------------------------------------------
  const newSession = useCallback(() => {
    useChatStore.getState().newSession();
  }, []);

  // -----------------------------------------------------------
  // 加载会话列表
  // -----------------------------------------------------------
  const loadSessions = useCallback(async () => {
    try {
      const sessions = await chatApi.getSessions();
      useChatStore.getState().setSessions(sessions);
    } catch {
      // 静默失败
    }
  }, []);

  // -----------------------------------------------------------
  // 删除会话
  // -----------------------------------------------------------
  const deleteSession = useCallback(async (sessionId: number) => {
    const store = useChatStore.getState();
    try {
      await chatApi.deleteSession(sessionId);
      store.removeSession(sessionId);
    } catch {
      store.setError("删除会话失败，请稍后重试");
      throw new Error("deleteSession failed");
    }
  }, []);

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