import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  ChatBubble,
  AIBubble,
  UserBubble,
  TypingIndicator,
  ErrorBubble,
} from "@/app/components/Chat/ChatBubble";
import type { ChatMessage, CardAttachment } from "@/app/types/chat";

// Mock ResizeObserver for recharts (not available in jsdom)
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// ===========================================================================
// Factory helper - create a ChatMessage matching the type definition
// ===========================================================================
function makeMsg(
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: 1,
    session_id: 100,
    role: "assistant",
    content: "螺纹钢 HRB400E 当前价格 ¥3,850/吨",
    tokens: 42,
    created_at: "2026-05-18T10:30:00Z",
    ...overrides,
  } as ChatMessage;
}

// ===========================================================================
// TypingIndicator
// ===========================================================================
describe("TypingIndicator", () => {
  it("should render three animated dots", () => {
    render(<TypingIndicator />);

    // Three dot elements inside the bubble
    const dots = document.querySelectorAll(".size-\\[1\\.5px\\]");
    expect(dots).toHaveLength(3);
  });

  it("should have accessible label for screen readers", () => {
    render(<TypingIndicator />);

    expect(
      screen.getByLabelText("AI 正在思考中"),
    ).toBeInTheDocument();
  });

  it("should render avatar with Sparkles icon", () => {
    const { container } = render(<TypingIndicator />);

    // The bubble container with styling
    const bubble = container.querySelector(
      '[class*="rounded-2xl"][class*="rounded-tl-sm"]',
    );
    expect(bubble).toBeInTheDocument();
  });
});

// ===========================================================================
// AIBubble
// ===========================================================================
describe("AIBubble", () => {
  it("should render children content", () => {
    render(<AIBubble>AI 回复内容</AIBubble>);

    expect(screen.getByText("AI 回复内容")).toBeInTheDocument();
  });

  it("should render avatar when hideAvatar is false (default)", () => {
    const { container } = render(<AIBubble>content</AIBubble>);

    // Avatar should be present
    const avatar = container.querySelector('[class*="size-7"]');
    expect(avatar).toBeInTheDocument();
  });

  it("should hide avatar with spacer when hideAvatar is true", () => {
    const { container } = render(
      <AIBubble hideAvatar>content</AIBubble>,
    );

    // Should have an invisible spacer div with aria-hidden
    const spacer = container.querySelector('[aria-hidden="true"]');
    expect(spacer).toBeInTheDocument();
  });

  it("should use error styling when isError is true", () => {
    const { container } = render(
      <AIBubble isError>错误内容</AIBubble>,
    );

    const bubble = container.querySelector('[class*="bg-rose-50"]');
    expect(bubble).toBeInTheDocument();
  });

  it("should use default styling when isError is false", () => {
    const { container } = render(<AIBubble>content</AIBubble>);

    const bubble = container.querySelector('[class*="bg-steel-surface"]');
    expect(bubble).toBeInTheDocument();
  });
});

// ===========================================================================
// UserBubble
// ===========================================================================
describe("UserBubble", () => {
  it("should render children content", () => {
    render(<UserBubble>用户消息</UserBubble>);

    expect(screen.getByText("用户消息")).toBeInTheDocument();
  });

  it("should render with ink background on bubble", () => {
    const { container } = render(<UserBubble>用户消息</UserBubble>);

    const bubble = container.querySelector('[class*="bg-steel-ink"]');
    expect(bubble).toBeInTheDocument();
  });

  it("should render quoted content when provided", () => {
    render(
      <UserBubble quotedContent="引用的原始消息">
        用户追问
      </UserBubble>,
    );

    expect(screen.getByText("引用的原始消息")).toBeInTheDocument();
  });

  it("should not render quoted content when not provided", () => {
    render(<UserBubble>用户消息</UserBubble>);

    // The quoted content div uses specific styling - check it's not there
    const quotedDivs = document.querySelectorAll(
      '[class*="border-l-2"][class*="border-steel-line"]',
    );
    expect(quotedDivs).toHaveLength(0);
  });
});

// ===========================================================================
// ErrorBubble
// ===========================================================================
describe("ErrorBubble", () => {
  it("should render error content with role=alert", () => {
    render(<ErrorBubble content="查询超时，请重试" />);

    expect(screen.getByText("查询超时，请重试")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should render retry button when onRegenerate is provided", () => {
    const onRegenerate = vi.fn();

    render(
      <ErrorBubble
        content="查询失败"
        onRegenerate={onRegenerate}
      />,
    );

    expect(screen.getByText("重试")).toBeInTheDocument();
    expect(screen.getByLabelText("重试")).toBeInTheDocument();
  });

  it("should call onRegenerate when retry button clicked", async () => {
    const onRegenerate = vi.fn();
    const user = userEvent.setup();

    render(
      <ErrorBubble
        content="查询失败"
        onRegenerate={onRegenerate}
      />,
    );

    await user.click(screen.getByText("重试"));

    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("should NOT render retry button when onRegenerate is not provided", () => {
    render(<ErrorBubble content="查询失败" />);

    expect(screen.queryByText("重试")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// ChatBubble - User message
// ===========================================================================
describe("ChatBubble - User message", () => {
  it("should render user bubble with content", () => {
    const msg = makeMsg({ role: "user", content: "查螺纹钢价格" });

    render(<ChatBubble message={msg} />);

    expect(screen.getByText("查螺纹钢价格")).toBeInTheDocument();
  });

  it("should render user bubble with ink background", () => {
    const msg = makeMsg({ role: "user", content: "用户消息" });
    const { container } = render(<ChatBubble message={msg} />);

    const bubble = container.querySelector('[class*="bg-steel-ink"]');
    expect(bubble).toBeInTheDocument();
  });

  it("should show message action bar on hover", () => {
    const msg = makeMsg({ role: "user", content: "用户消息" });
    const onCopy = vi.fn();

    render(<ChatBubble message={msg} onCopy={onCopy} onEdit={vi.fn()} />);

    // Action bar exists but is opacity-0 by default
    const actionBar = document.querySelector(
      '[aria-label="用户消息操作"]',
    );
    expect(actionBar).toBeInTheDocument();
    expect(actionBar?.className).toContain("opacity-0");
  });
});

// ===========================================================================
// ChatBubble - Assistant message
// ===========================================================================
describe("ChatBubble - Assistant message", () => {
  it("should render AI bubble with content", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "螺纹钢 HRB400E 当前价格 ¥3,850/吨",
    });

    render(<ChatBubble message={msg} />);

    expect(
      screen.getByText("螺纹钢 HRB400E 当前价格 ¥3,850/吨"),
    ).toBeInTheDocument();
  });

  it("should parse and display source citation", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "螺纹钢价格 ¥3,850\n来源：Wind 终端",
    });

    render(<ChatBubble message={msg} />);

    expect(screen.getByText(/来源：Wind 终端/)).toBeInTheDocument();
    // Main content should not include the source line
    expect(screen.getByText("螺纹钢价格 ¥3,850")).toBeInTheDocument();
  });

  it("should show streaming cursor when isStreaming is true", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "正在生成回复",
    });

    render(<ChatBubble message={msg} isStreaming />);

    // Streaming cursor element
    const cursor = document.querySelector('[class*="animate-caret-blink"]');
    expect(cursor).toBeInTheDocument();
  });

  it("should use aria-live=polite when streaming", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "流式输出中",
    });

    render(<ChatBubble message={msg} isStreaming />);

    expect(screen.getByText("流式输出中").closest('[aria-live="polite"]')).toBeInTheDocument();
  });
});

// ===========================================================================
// ChatBubble - Error message handling
// ===========================================================================
describe("ChatBubble - Error messages", () => {
  it("should detect error when content starts with error keywords", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "查询失败：远程服务不可用",
    });

    render(<ChatBubble message={msg} />);

    // Should have error bubble with role=alert
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should show retry button in error state when onRegenerate provided", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "查询异常，请稍后重试",
    });
    const onRegenerate = vi.fn();

    render(
      <ChatBubble message={msg} onRegenerate={onRegenerate} />,
    );

    expect(screen.getByText("重试")).toBeInTheDocument();
  });
});

// ===========================================================================
// ChatBubble - Stopped content
// ===========================================================================
describe("ChatBubble - Stopped content", () => {
  it("should show stopped indicator when is_stopped is true", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "部分回复内容",
      is_stopped: true,
    });

    render(<ChatBubble message={msg} />);

    expect(screen.getByText("已停止生成")).toBeInTheDocument();
  });

  it("should show continue button when onContinue is provided", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "部分内容",
      is_stopped: true,
    });
    const onContinue = vi.fn();

    render(
      <ChatBubble message={msg} onContinue={onContinue} />,
    );

    const continueBtn = screen.getByText("继续");
    expect(continueBtn).toBeInTheDocument();
  });

  it("should NOT show continue button when onContinue is not provided", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "部分内容",
      is_stopped: true,
    });

    render(<ChatBubble message={msg} />);

    expect(screen.queryByText("继续")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// ChatBubble - Action buttons (inline icon buttons on hover/tap)
// ===========================================================================
describe("ChatBubble - Action buttons", () => {
  it("should render inline action buttons for assistant messages", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "正常回复",
    });

    render(<ChatBubble message={msg} onCopy={vi.fn()} />);

    // Inline icon buttons use aria-label, not raw text
    expect(screen.getByLabelText("复制")).toBeInTheDocument();
  });

  it("should include thumbs-up/thumbs-down buttons for assistant with feedback", () => {
    const msg = makeMsg({
      role: "assistant",
      content: "正常回复",
    });

    render(
      <ChatBubble
        message={msg}
        onCopy={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("有帮助")).toBeInTheDocument();
    expect(screen.getByLabelText("不准确")).toBeInTheDocument();
  });
});

// ===========================================================================
// ChatBubble - Card inline rendering
// ===========================================================================

function makeAssistantMsgWithCards(
  content: string,
  attachments: CardAttachment[],
  overrides?: Partial<ChatMessage>,
): ChatMessage {
  return {
    id: 200,
    session_id: 1,
    role: "assistant",
    content,
    tokens: 0,
    created_at: "2026-01-01T00:00:00Z",
    attachments,
    ...overrides,
  } as ChatMessage;
}

const mockPriceAttachment: CardAttachment = {
  type: "price",
  data: {
    eyebrow: "PRICE",
    title: "螺纹钢",
    prices: [
      { region: "上海", spec: "HRB400E 20mm", price: 3850, change: 12, changePct: 0.31 },
    ],
  },
};

describe("ChatBubble - Card inline rendering", () => {
  it("renders price card inside the AI bubble when assistant has attachments", () => {
    const msg = makeAssistantMsgWithCards("今日螺纹钢小幅上涨", [mockPriceAttachment]);

    const { container } = render(<ChatBubble message={msg} />);

    // The card is inside the AI bubble (bg-steel-surface)
    const bubble = container.querySelector('[class*="bg-steel-surface"]');
    expect(bubble).toBeInTheDocument();

    // The price card renders "PRICE" as eyebrow text
    expect(bubble!.textContent).toContain("PRICE");
    expect(bubble!.textContent).toContain("螺纹钢");

    // Verify text content is also present
    expect(screen.getByText("今日螺纹钢小幅上涨")).toBeInTheDocument();
  });

  it("shows border-t divider between text and cards", () => {
    const msg = makeAssistantMsgWithCards("今日螺纹钢小幅上涨", [mockPriceAttachment]);

    render(<ChatBubble message={msg} />);

    // There should be a border-t element between text content and card area
    const divider = document.querySelector('[class*="border-t"][class*="border-steel-line"]');
    expect(divider).toBeInTheDocument();
  });

  it("renders only card when content is empty", () => {
    const msg = makeAssistantMsgWithCards("", [mockPriceAttachment]);

    const { container } = render(<ChatBubble message={msg} />);

    // Card should render
    expect(screen.getByText("PRICE")).toBeInTheDocument();
    expect(screen.getByText("螺纹钢")).toBeInTheDocument();

    // No border-t divider when no text content
    const cardArea = container.querySelector('[class*="border-t"][class*="border-steel-line"]');
    // The divider should NOT have the "border-t border-steel-line" classes that are only added when content exists
    const dividers = container.querySelectorAll('[class*="border-t"][class*="border-steel-line"]');
    // When content is empty, the card area wrapper has className="" (no border-t)
    expect(dividers.length).toBe(0);
  });

  it("renders normally when no attachments", () => {
    const msg = makeAssistantMsgWithCards("just text", []);

    const { container } = render(<ChatBubble message={msg} />);

    // Text renders
    expect(screen.getByText("just text")).toBeInTheDocument();

    // No card elements rendered
    expect(screen.queryByText("PRICE")).not.toBeInTheDocument();
    expect(container.querySelector('[role="button"]')).not.toBeInTheDocument();
  });

  it("calls onCardClick when clicking a card", async () => {
    const msg = makeAssistantMsgWithCards("今日螺纹钢小幅上涨", [mockPriceAttachment]);
    const onCardClick = vi.fn();
    const user = userEvent.setup();

    render(<ChatBubble message={msg} onCardClick={onCardClick} />);

    // Find the clickable card wrapper (div with role="button" + cursor-pointer class,
    // NOT the internal PriceCard "设置预警" button)
    const cardButton = document.querySelector('[role="button"][class*="cursor-pointer"]');
    expect(cardButton).toBeInTheDocument();

    await user.click(cardButton!);

    expect(onCardClick).toHaveBeenCalledOnce();
    expect(onCardClick).toHaveBeenCalledWith(mockPriceAttachment);
  });

  it("calls onCardDoubleClick when double-clicking a card", async () => {
    const msg = makeAssistantMsgWithCards("今日螺纹钢小幅上涨", [mockPriceAttachment]);
    const onCardClick = vi.fn();
    const onCardDoubleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatBubble
        message={msg}
        onCardClick={onCardClick}
        onCardDoubleClick={onCardDoubleClick}
      />,
    );

    const cardButton = document.querySelector('[role="button"][class*="cursor-pointer"]');
    expect(cardButton).toBeInTheDocument();

    // dblClick fires two clicks rapidly, which triggers the double-click logic
    await user.dblClick(cardButton!);

    // First click triggers onCardClick, second click (within 400ms) triggers onCardDoubleClick
    expect(onCardClick).toHaveBeenCalledOnce();
    expect(onCardDoubleClick).toHaveBeenCalledOnce();
    expect(onCardDoubleClick).toHaveBeenCalledWith(mockPriceAttachment);
  });

  it("shows divider between multiple cards", () => {
    const trendAttachment: CardAttachment = {
      type: "trend",
      data: {
        title: "走势",
        data: [
          { date: "06-20", price: 3800 },
          { date: "06-21", price: 3850 },
        ],
      },
    };

    const msg = makeAssistantMsgWithCards("多卡片消息", [
      mockPriceAttachment,
      trendAttachment,
    ]);

    const { container } = render(<ChatBubble message={msg} />);

    // Both cards should render
    expect(screen.getByText("PRICE")).toBeInTheDocument();
    expect(screen.getByText("螺纹钢")).toBeInTheDocument();
    expect(screen.getByText("走势")).toBeInTheDocument();

    // There should be dividers: one between text and cards + one between cards
    // Actually: border-t between text and card area, and my-3 border-t between cards
    const dividers = container.querySelectorAll('[class*="border-t"][class*="border-steel-line"]');
    // At least 2: one for text/card separation, one between the two cards
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });

  it("does not render cards for user messages", () => {
    const msg: ChatMessage = {
      id: 300,
      session_id: 1,
      role: "user",
      content: "帮我查一下价格",
      tokens: 0,
      created_at: "2026-01-01T00:00:00Z",
      attachments: [mockPriceAttachment],
    };

    render(<ChatBubble message={msg} />);

    // User bubble renders normally
    expect(screen.getByText("帮我查一下价格")).toBeInTheDocument();

    // No card content should be rendered
    expect(screen.queryByText("PRICE")).not.toBeInTheDocument();
    expect(screen.queryByText("螺纹钢")).not.toBeInTheDocument();
  });
});
