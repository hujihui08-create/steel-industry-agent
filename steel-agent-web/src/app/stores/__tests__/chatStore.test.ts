import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "@/app/stores/chatStore";
import type { ChatMessage } from "@/app/types/chat";

// Helper to create a test message
function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 1,
    session_id: 100,
    role: "assistant",
    content: "测试消息",
    tokens: 10,
    created_at: "2026-05-18T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  // Reset store to initial state before each test
  const store = useChatStore.getState();
  store.reset();
});

// ===========================================================================
// 1. Initial State
// ===========================================================================
describe("initialState", () => {
  it("should have default values", () => {
    const state = useChatStore.getState();

    expect(state.currentSessionId).toBeNull();
    expect(state.sessions).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.inputValue).toBe("");
    expect(state.error).toBeNull();
    expect(state.activeQuickCommand).toBeNull();
    expect(state.selectedCard).toBeNull();
  });
});

// ===========================================================================
// 2. setCurrentSessionId
// ===========================================================================
describe("setCurrentSessionId()", () => {
  it("should set current session id", () => {
    const store = useChatStore.getState();
    store.setCurrentSessionId(42);

    expect(useChatStore.getState().currentSessionId).toBe(42);
  });

  it("should set to null", () => {
    const store = useChatStore.getState();
    store.setCurrentSessionId(42);
    store.setCurrentSessionId(null);

    expect(useChatStore.getState().currentSessionId).toBeNull();
  });
});

// ===========================================================================
// 3. setSessions / setMessages
// ===========================================================================
describe("setSessions()", () => {
  it("should set session list", () => {
    const sessions = [
      {
        id: 1,
        user_id: 1,
        title: "会话1",
        model: "gpt-4o",
        message_count: 3,
        context: null,
        created_at: "2026-05-18T10:00:00Z",
        updated_at: "2026-05-18T10:00:00Z",
      },
    ];

    useChatStore.getState().setSessions(sessions);
    expect(useChatStore.getState().sessions).toHaveLength(1);
    expect(useChatStore.getState().sessions[0].title).toBe("会话1");
  });
});

describe("setMessages()", () => {
  it("should replace message list", () => {
    const msgs = [makeMsg({ id: 1 }), makeMsg({ id: 2 })];

    useChatStore.getState().setMessages(msgs);
    expect(useChatStore.getState().messages).toHaveLength(2);
  });
});

// ===========================================================================
// 4. addMessage
// ===========================================================================
describe("addMessage()", () => {
  it("should append message to the list", () => {
    const store = useChatStore.getState();

    store.addMessage(makeMsg({ id: 1, role: "user", content: "你好" }));
    store.addMessage(makeMsg({ id: 2, role: "assistant", content: "你好！" }));

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].role).toBe("user");
    expect(state.messages[1].role).toBe("assistant");
    expect(state.messages[0].content).toBe("你好");
    expect(state.messages[1].content).toBe("你好！");
  });
});

// ===========================================================================
// 5. appendToLastMessage (streaming tokens)
// ===========================================================================
describe("appendToLastMessage()", () => {
  it("should append token to the last assistant message", () => {
    const store = useChatStore.getState();
    store.addMessage(
      makeMsg({ id: 1, role: "assistant", content: "螺纹钢" }),
    );

    store.appendToLastMessage("价格");
    store.appendToLastMessage("¥3,850");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toBe("螺纹钢价格¥3,850");
  });

  it("should create new assistant message if last message is not assistant", () => {
    const store = useChatStore.getState();
    store.addMessage(makeMsg({ id: 1, role: "user", content: "查询" }));

    store.appendToLastMessage("新消息");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].role).toBe("assistant");
    expect(state.messages[1].content).toBe("新消息");
  });

  it("should create new message if messages list is empty", () => {
    useChatStore.getState().appendToLastMessage("第一条");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].content).toBe("第一条");
  });
});

// ===========================================================================
// 6. updateLastMessage
// ===========================================================================
describe("updateLastMessage()", () => {
  it("should replace content of the last assistant message", () => {
    const store = useChatStore.getState();
    store.addMessage(
      makeMsg({ id: 1, role: "assistant", content: "草稿内容" }),
    );

    store.updateLastMessage("最终内容");

    expect(useChatStore.getState().messages[0].content).toBe("最终内容");
  });

  it("should do nothing if last message is not assistant", () => {
    const store = useChatStore.getState();
    store.addMessage(makeMsg({ id: 1, role: "user", content: "用户" }));

    store.updateLastMessage("改不掉");

    expect(useChatStore.getState().messages[0].content).toBe("用户");
  });
});

// ===========================================================================
// 7. markLastMessageStopped
// ===========================================================================
describe("markLastMessageStopped()", () => {
  it("should append stop marker to last assistant message", () => {
    const store = useChatStore.getState();
    store.addMessage(
      makeMsg({ id: 1, role: "assistant", content: "部分内容" }),
    );

    store.markLastMessageStopped();

    const state = useChatStore.getState();
    expect(state.messages[0].content).toContain("_已停止生成_");
    expect(state.messages[0].content).toBe("部分内容\n\n_已停止生成_");
  });

  it("should do nothing if last message is not assistant", () => {
    const store = useChatStore.getState();
    store.addMessage(makeMsg({ id: 1, role: "user", content: "用户" }));

    store.markLastMessageStopped();

    expect(useChatStore.getState().messages[0].content).toBe("用户");
  });
});

// ===========================================================================
// 8. Streaming state
// ===========================================================================
describe("setStreaming()", () => {
  it("should toggle streaming state", () => {
    const store = useChatStore.getState();

    store.setStreaming(true);
    expect(useChatStore.getState().isStreaming).toBe(true);

    store.setStreaming(false);
    expect(useChatStore.getState().isStreaming).toBe(false);
  });
});

// ===========================================================================
// 9. setInputValue
// ===========================================================================
describe("setInputValue()", () => {
  it("should update input value", () => {
    useChatStore.getState().setInputValue("查询螺纹钢");
    expect(useChatStore.getState().inputValue).toBe("查询螺纹钢");
  });
});

// ===========================================================================
// 10. setError
// ===========================================================================
describe("setError()", () => {
  it("should set and clear error", () => {
    const store = useChatStore.getState();

    store.setError("网络错误");
    expect(useChatStore.getState().error).toBe("网络错误");

    store.setError(null);
    expect(useChatStore.getState().error).toBeNull();
  });
});

// ===========================================================================
// 11. setActiveQuickCommand
// ===========================================================================
describe("setActiveQuickCommand()", () => {
  it("should set and clear active quick command", () => {
    const store = useChatStore.getState();

    store.setActiveQuickCommand("price");
    expect(useChatStore.getState().activeQuickCommand).toBe("price");

    store.setActiveQuickCommand(null);
    expect(useChatStore.getState().activeQuickCommand).toBeNull();
  });
});

// ===========================================================================
// 12. newSession
// ===========================================================================
describe("newSession()", () => {
  it("should reset session state", () => {
    const store = useChatStore.getState();
    store.setCurrentSessionId(1);
    store.addMessage(makeMsg({ id: 1 }));
    store.setInputValue("test");
    store.setError("error");
    store.setActiveQuickCommand("price");

    store.newSession();

    const state = useChatStore.getState();
    expect(state.currentSessionId).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.inputValue).toBe("");
    expect(state.error).toBeNull();
    expect(state.activeQuickCommand).toBeNull();
  });
});

// ===========================================================================
// 13. removeSession
// ===========================================================================
describe("removeSession()", () => {
  it("should remove session from list", () => {
    const store = useChatStore.getState();
    store.setSessions([
      { id: 1, user_id: 1, title: "A", model: "", message_count: 0, context: null, created_at: "", updated_at: "" },
      { id: 2, user_id: 1, title: "B", model: "", message_count: 0, context: null, created_at: "", updated_at: "" },
    ]);

    store.removeSession(1);

    const state = useChatStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe(2);
  });

  it("should clear currentSessionId if removing current session", () => {
    const store = useChatStore.getState();
    store.setCurrentSessionId(1);
    store.setSessions([
      { id: 1, user_id: 1, title: "A", model: "", message_count: 0, context: null, created_at: "", updated_at: "" },
    ]);
    store.addMessage(makeMsg({ id: 1 }));

    store.removeSession(1);

    const state = useChatStore.getState();
    expect(state.currentSessionId).toBeNull();
    expect(state.messages).toEqual([]);
  });

  it("should keep currentSessionId if removing other session", () => {
    const store = useChatStore.getState();
    store.setCurrentSessionId(1);
    store.setSessions([
      { id: 1, user_id: 1, title: "A", model: "", message_count: 0, context: null, created_at: "", updated_at: "" },
      { id: 2, user_id: 1, title: "B", model: "", message_count: 0, context: null, created_at: "", updated_at: "" },
    ]);

    store.removeSession(2);

    expect(useChatStore.getState().currentSessionId).toBe(1);
  });
});

// ===========================================================================
// 14. fixMessageSessionIds
// ===========================================================================
describe("fixMessageSessionIds()", () => {
  it("should update all message session_ids", () => {
    const store = useChatStore.getState();
    store.addMessage(makeMsg({ id: 1, session_id: 0 }));
    store.addMessage(makeMsg({ id: 2, session_id: 0 }));

    store.fixMessageSessionIds(100);

    const state = useChatStore.getState();
    for (const msg of state.messages) {
      expect(msg.session_id).toBe(100);
    }
  });
});

// ===========================================================================
// 15. appendAttachment
// ===========================================================================
describe("appendAttachment()", () => {
  it("should append attachment to a specific message", () => {
    const store = useChatStore.getState();
    store.addMessage(makeMsg({ id: 1, role: "assistant", content: "价格" }));
    store.addMessage(makeMsg({ id: 2, role: "assistant", content: "走势" }));

    const attachment = { type: "price" as const, data: { price: 3850 } };
    store.appendAttachment(0, attachment);

    const state = useChatStore.getState();
    expect(state.messages[0].attachments).toHaveLength(1);
    expect(state.messages[0].attachments?.[0]).toEqual(attachment);
    expect(state.messages[1].attachments).toBeUndefined();
  });

  it("should do nothing for out-of-bounds index", () => {
    const store = useChatStore.getState();
    store.addMessage(makeMsg({ id: 1 }));

    store.appendAttachment(99, { type: "price", data: {} });

    expect(useChatStore.getState().messages[0].attachments).toBeUndefined();
  });
});

// ===========================================================================
// 16. clearAttachments
// ===========================================================================
describe("clearAttachments()", () => {
  it("should remove attachments from all messages", () => {
    const store = useChatStore.getState();
    store.addMessage(makeMsg({ id: 1 }));
    store.addMessage(makeMsg({ id: 2 }));
    store.appendAttachment(0, { type: "price", data: {} });
    store.appendAttachment(1, { type: "trend", data: {} });

    store.clearAttachments();

    const state = useChatStore.getState();
    for (const msg of state.messages) {
      expect(msg.attachments).toBeUndefined();
    }
  });
});

// ===========================================================================
// 17. reset
// ===========================================================================
describe("reset()", () => {
  it("should clear all state", () => {
    const store = useChatStore.getState();
    store.setCurrentSessionId(1);
    store.setSessions([{ id: 1, user_id: 1, title: "x", model: "", message_count: 0, context: null, created_at: "", updated_at: "" }]);
    store.addMessage(makeMsg({ id: 1 }));
    store.setStreaming(true);
    store.setInputValue("test");
    store.setError("error");
    store.setActiveQuickCommand("price");
    store.setSelectedCard({ type: "price", data: {} });

    store.reset();

    const state = useChatStore.getState();
    expect(state.currentSessionId).toBeNull();
    expect(state.sessions).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.isStreaming).toBe(false);
    expect(state.inputValue).toBe("");
    expect(state.error).toBeNull();
    expect(state.activeQuickCommand).toBeNull();
    expect(state.selectedCard).toBeNull();
  });
});
