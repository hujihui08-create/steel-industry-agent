// ============================================================
// AI 对话 Zustand 状态管理
// 管理会话列表、消息列表、流式输出、输入状态
// ============================================================

import { create } from "zustand";
import type { ChatSession, ChatMessage, QuickCommand, CardAttachment } from "@/app/types/chat";

let __messageIdCounter = 0;

interface ChatState {
  currentSessionId: number | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  isStreaming: boolean;
  inputValue: string;
  error: string | null;
  activeQuickCommand: string | null;
  selectedCard: CardAttachment | null;
  focusInputTrigger: number;
  statusMessage: string | null;

  setCurrentSessionId: (id: number | null) => void;
  triggerFocusInput: () => void;
  setSessions: (sessions: ChatSession[]) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  appendToLastMessage: (token: string) => void;
  updateLastMessage: (content: string) => void;
  markLastMessageStopped: () => void;
  setStreaming: (streaming: boolean) => void;
  setInputValue: (value: string) => void;
  setError: (error: string | null) => void;
  setStatusMessage: (message: string | null) => void;
  setActiveQuickCommand: (commandId: string | null) => void;
  setSelectedCard: (card: CardAttachment | null) => void;
  clearSelectedCard: () => void;
  newSession: () => void;
  removeSession: (sessionId: number) => void;
  appendAttachment: (messageIndex: number, attachment: CardAttachment) => void;
  clearAttachments: () => void;
  fixMessageSessionIds: (sessionId: number) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentSessionId: null,
  sessions: [],
  messages: [],
  isStreaming: false,
  inputValue: "",
  error: null,
  activeQuickCommand: null,
  selectedCard: null,
  focusInputTrigger: 0,
  statusMessage: null,

  setCurrentSessionId: (id) => set({ currentSessionId: id }),

  triggerFocusInput: () => set({ focusInputTrigger: Date.now() }),

  setSessions: (sessions) => set({ sessions }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  appendToLastMessage: (token) =>
    set((state) => {
      if (!state.isStreaming) return state;
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant") {
        messages[messages.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + token,
        };
      } else {
        messages.push({
          id: Date.now() * 1000 + (__messageIdCounter++ % 1000),
          session_id: state.currentSessionId || 0,
          role: "assistant",
          content: token,
          tokens: 0,
          created_at: new Date().toISOString(),
        });
      }
      return { messages };
    }),

  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant") {
        messages[messages.length - 1] = { ...lastMsg, content };
      }
      return { messages };
    }),

  markLastMessageStopped: () =>
    set((state) => {
      const messages = [...state.messages];
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant") {
        messages[messages.length - 1] = {
          ...lastMsg,
          is_stopped: true,
        };
      }
      return { messages };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setInputValue: (inputValue) => set({ inputValue }),

  setError: (error) => set({ error }),

  setStatusMessage: (statusMessage) => set({ statusMessage }),

  setActiveQuickCommand: (activeQuickCommand) => set({ activeQuickCommand }),

  setSelectedCard: (selectedCard) => set({ selectedCard }),

  clearSelectedCard: () => set({ selectedCard: null }),

  newSession: () =>
    set({
      currentSessionId: null,
      messages: [],
      inputValue: "",
      error: null,
      activeQuickCommand: null,
      selectedCard: null,
      statusMessage: null,
      focusInputTrigger: 0,
    }),

  removeSession: (sessionId) =>
    set((state) => {
      const isRemovingCurrent = state.currentSessionId === sessionId;
      return {
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSessionId: isRemovingCurrent ? null : state.currentSessionId,
        messages: isRemovingCurrent ? [] : state.messages,
        ...(isRemovingCurrent && {
          isStreaming: false,
          error: null,
          activeQuickCommand: null,
          selectedCard: null,
          statusMessage: null,
        }),
      };
    }),

  appendAttachment: (messageIndex, attachment) =>
    set((state) => {
      const messages = [...state.messages];
      if (messageIndex >= 0 && messageIndex < messages.length) {
        const target = messages[messageIndex];
        const existingAttachments = target.attachments || [];
        messages[messageIndex] = {
          ...target,
          attachments: [...existingAttachments, attachment],
        };
      }
      return { messages };
    }),

  clearAttachments: () =>
    set((state) => ({
      messages: state.messages.map((msg, i) =>
        i === state.messages.length - 1 ? { ...msg, attachments: [] } : msg
      ),
    })),

  fixMessageSessionIds: (sessionId) =>
    set((state) => ({
      messages: state.messages.map((msg) => ({
        ...msg,
        session_id: sessionId,
      })),
    })),

  reset: () =>
    set({
      currentSessionId: null,
      sessions: [],
      messages: [],
      isStreaming: false,
      inputValue: "",
      error: null,
      activeQuickCommand: null,
      selectedCard: null,
      focusInputTrigger: 0,
      statusMessage: null,
    }),
}));
