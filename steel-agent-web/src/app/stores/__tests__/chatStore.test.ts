// ============================================================
// chatStore 单元测试
//
// 覆盖场景：
//   1. 初始状态
//   2. 添加用户消息
//   3. 流式状态切换
//   4. 追加 token 到流式消息
//   5. 新建会话
//   6. 重置状态
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "@/app/stores/chatStore";
import type { ChatMessage } from "@/app/types/chat";

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    session_id: 100,
    role: "user",
    content: "Hello",
    tokens: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  } as ChatMessage;
}

describe("chatStore", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  // ------------------------------------------------------------------
  // 1. 初始状态
  // ------------------------------------------------------------------
  describe("initial state", () => {
    it("should have empty sessions, messages, and null currentSessionId", () => {
      const state = useChatStore.getState();
      expect(state.sessions).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.currentSessionId).toBeNull();
      expect(state.isStreaming).toBe(false);
      expect(state.inputValue).toBe("");
      expect(state.error).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // 2. setSessions / setCurrentSessionId
  // ------------------------------------------------------------------
  describe("sessions", () => {
    it("should set sessions list", () => {
      useChatStore.getState().setSessions([
        { id: 1, title: "Session 1", messages: [], created_at: "", updated_at: "" },
      ]);
      expect(useChatStore.getState().sessions).toHaveLength(1);
    });

    it("should set currentSessionId", () => {
      useChatStore.getState().setCurrentSessionId(42);
      expect(useChatStore.getState().currentSessionId).toBe(42);
    });
  });

  // ------------------------------------------------------------------
  // 3. addMessage
  // ------------------------------------------------------------------
  describe("addMessage", () => {
    it("should add a message to the messages array", () => {
      const msg = makeMsg({ id: 1, role: "user", content: "Hello" });
      useChatStore.getState().addMessage(msg);
      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe("Hello");
      expect(state.messages[0].role).toBe("user");
    });

    it("should append messages in order", () => {
      useChatStore.getState().addMessage(makeMsg({ id: 1, content: "First" }));
      useChatStore.getState().addMessage(makeMsg({ id: 2, role: "assistant", content: "Second" }));
      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].content).toBe("First");
      expect(state.messages[1].content).toBe("Second");
    });
  });

  // ------------------------------------------------------------------
  // 4. setStreaming
  // ------------------------------------------------------------------
  describe("streaming", () => {
    it("should set streaming state to true", () => {
      useChatStore.getState().setStreaming(true);
      expect(useChatStore.getState().isStreaming).toBe(true);
    });

    it("should set streaming state to false", () => {
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().setStreaming(false);
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 5. appendToLastMessage
  // ------------------------------------------------------------------
  describe("appendToLastMessage", () => {
    it("should create new assistant message when no messages exist", () => {
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().appendToLastMessage("Hello");
      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe("assistant");
      expect(state.messages[0].content).toBe("Hello");
    });

    it("should append token to existing assistant message when streaming", () => {
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().addMessage(makeMsg({ role: "assistant", content: "Hel" }));
      useChatStore.getState().appendToLastMessage("lo");
      const state = useChatStore.getState();
      expect(state.messages[state.messages.length - 1].content).toBe("Hello");
    });

    it("should NOT append when isStreaming is false", () => {
      useChatStore.getState().addMessage(makeMsg({ role: "assistant", content: "Hel" }));
      useChatStore.getState().appendToLastMessage("lo");
      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe("Hel");
    });
  });

  // ------------------------------------------------------------------
  // 6. markLastMessageStopped
  // ------------------------------------------------------------------
  describe("markLastMessageStopped", () => {
    it("should mark last assistant message as stopped", () => {
      useChatStore.getState().addMessage(makeMsg({ role: "assistant", content: "Partial content" }));
      useChatStore.getState().markLastMessageStopped();
      const state = useChatStore.getState();
      expect(state.messages[state.messages.length - 1].is_stopped).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // 7. newSession
  // ------------------------------------------------------------------
  describe("newSession", () => {
    it("should reset messages and input when creating new session", () => {
      useChatStore.getState().addMessage(makeMsg({ content: "Test" }));
      useChatStore.getState().setInputValue("some input");
      useChatStore.getState().newSession();

      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.inputValue).toBe("");
      expect(state.currentSessionId).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // 8. removeSession
  // ------------------------------------------------------------------
  describe("removeSession", () => {
    it("should remove session from list", () => {
      useChatStore.getState().setSessions([
        { id: 1, title: "S1", messages: [], created_at: "", updated_at: "" },
        { id: 2, title: "S2", messages: [], created_at: "", updated_at: "" },
      ]);
      useChatStore.getState().removeSession(1);
      expect(useChatStore.getState().sessions).toHaveLength(1);
      expect(useChatStore.getState().sessions[0].id).toBe(2);
    });

    it("should clear messages if removing current session", () => {
      useChatStore.getState().setSessions([
        { id: 1, title: "S1", messages: [], created_at: "", updated_at: "" },
      ]);
      useChatStore.getState().setCurrentSessionId(1);
      useChatStore.getState().addMessage(makeMsg({ content: "Test" }));
      useChatStore.getState().removeSession(1);

      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.currentSessionId).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // 9. reset
  // ------------------------------------------------------------------
  describe("reset", () => {
    it("should clear all state to initial values", () => {
      useChatStore.getState().setCurrentSessionId(99);
      useChatStore.getState().addMessage(makeMsg({ content: "Test" }));
      useChatStore.getState().setInputValue("foo");
      useChatStore.getState().setStreaming(true);
      useChatStore.getState().setError("error msg");

      useChatStore.getState().reset();

      const state = useChatStore.getState();
      expect(state.currentSessionId).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.inputValue).toBe("");
      expect(state.isStreaming).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
