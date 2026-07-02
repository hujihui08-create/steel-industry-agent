// ============================================================
// ChatPage 页面测试
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ChatMessage, CardAttachment } from '@/app/types/chat';

// ============================================================
// Test data
// ============================================================
const mockMessages: ChatMessage[] = [
  {
    id: 1,
    session_id: 1,
    role: 'user',
    content: '上海螺纹钢价格',
    tokens: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    session_id: 1,
    role: 'assistant',
    content: '今日螺纹钢小幅上涨',
    tokens: 50,
    created_at: '2026-01-01T00:00:01Z',
    attachments: [
      {
        type: 'price',
        data: {
          eyebrow: 'PRICE',
          title: '螺纹钢',
          prices: [
            {
              region: '上海',
              spec: 'HRB400E 20mm',
              price: 3850,
              change: 12,
              changePct: 0.31,
            },
          ],
        },
      },
    ] as CardAttachment[],
  },
];

// ============================================================
// vi.hoisted: define mutable mock refs before vi.mock hoisting
// ============================================================
const {
  mockNavigate,
  mockUseChatStoreImpl,
  mockUseAuthStoreImpl,
  mockUseLoginDialogStoreImpl,
  mockUseSettingsStoreImpl,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseChatStoreImpl: vi.fn(),
  mockUseAuthStoreImpl: vi.fn(),
  mockUseLoginDialogStoreImpl: vi.fn(),
  mockUseSettingsStoreImpl: vi.fn(),
}));

// ============================================================
// Mock react-router-dom
// ============================================================
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ============================================================
// Mock chatStore
// ============================================================
vi.mock('@/app/stores/chatStore', () => ({
  useChatStore: mockUseChatStoreImpl,
}));

// ============================================================
// Mock authStore
// ============================================================
vi.mock('@/app/stores/authStore', () => ({
  useAuthStore: mockUseAuthStoreImpl,
}));

// ============================================================
// Mock loginDialogStore
// ============================================================
vi.mock('@/app/stores/loginDialogStore', () => ({
  useLoginDialogStore: mockUseLoginDialogStoreImpl,
}));

// ============================================================
// Mock settingsStore
// ============================================================
vi.mock('@/app/stores/settingsStore', () => ({
  useSettingsStore: mockUseSettingsStoreImpl,
}));

// ============================================================
// Mock useChat hook
// ============================================================
vi.mock('@/app/hooks/useChat', () => ({
  useChat: () => ({
    sendMessage: vi.fn(),
    stopGeneration: vi.fn(),
    continueGeneration: vi.fn(),
    switchSession: vi.fn(),
    newSession: vi.fn(),
    loadSessions: vi.fn(),
    deleteSession: vi.fn(),
  }),
}));

// ============================================================
// Mock useTenderFavorite hook
// ============================================================
vi.mock('@/app/hooks/useTenderFavorite', () => ({
  useTenderFavorite: () => ({
    isFavorited: () => false,
    toggleFavorite: vi.fn(),
    favoriteSet: new Set(),
  }),
}));

// ============================================================
// Mock ChatBubble / TypingIndicator
// ============================================================
vi.mock('@/app/components/Chat/ChatBubble', () => ({
  ChatBubble: (props: any) => (
    <div
      data-testid={`chat-bubble-${props.message.id}`}
      data-role={props.message.role}
      data-has-oncardclick={props.onCardClick ? 'true' : 'false'}
      data-has-oncarddblclick={props.onCardDoubleClick ? 'true' : 'false'}
    >
      <span data-testid={`bubble-content-${props.message.id}`}>
        {props.message.content}
      </span>
      {props.message.attachments && props.message.attachments.length > 0 && (
        <div data-testid={`bubble-cards-${props.message.id}`}>
          {props.message.attachments.map((att: any, i: number) => (
            <div
              key={i}
              data-testid={`card-${att.type}-${i}`}
              onClick={() => props.onCardClick?.(att)}
            >
              CARD: {att.type}
            </div>
          ))}
        </div>
      )}
      {props.onDisclaimer && (
        <button
          data-testid={`trigger-disclaimer-${props.message.id}`}
          onClick={() => props.onDisclaimer('test disclaimer', props.message.id)}
        >
          Disclaimer
        </button>
      )}
    </div>
  ),
  TypingIndicator: () => <div data-testid="typing-indicator">AI thinking...</div>,
}));

// ============================================================
// Mock ChatSidebar
// ============================================================
vi.mock('@/app/components/Chat/ChatSidebar', () => ({
  ChatSidebar: (props: any) => <div data-testid="chat-sidebar">Sidebar</div>,
}));

// ============================================================
// Mock ChatInput
// ============================================================
vi.mock('@/app/components/Chat/ChatInput', () => ({
  default: (props: any) => (
    <div data-testid="chat-input">
      <textarea data-testid="message-input" placeholder="输入消息..." />
      <button
        data-testid="send-button"
        onClick={() => props.onSend?.('test message')}
      >
        发送
      </button>
    </div>
  ),
}));

// ============================================================
// Mock UI components used by ChatPage
// ============================================================
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: React.forwardRef(({ children }: any, _ref: any) => (
    <div data-testid="scroll-area">{children}</div>
  )),
}));

// ============================================================
// Mock CommandPalette
// ============================================================
vi.mock('@/app/components/shared/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));

// ============================================================
// Mock LoginDialog
// ============================================================
vi.mock('@/app/components/Auth/LoginDialog', () => ({
  default: () => <div data-testid="login-dialog" />,
}));

// ============================================================
// Mock NetworkStatus
// ============================================================
vi.mock('@/app/components/shared/NetworkStatus', () => ({
  NetworkStatus: () => <div data-testid="network-status" />,
}));

// ============================================================
// Mock NewsDetailDialog
// ============================================================
vi.mock('@/app/components/Cards/NewsDetailDialog', () => ({
  default: () => <div data-testid="news-detail-dialog" />,
}));

// ============================================================
// Mock all card components directly imported by ChatPage
// ============================================================
vi.mock('@/app/components/Cards/PriceCard', () => ({
  PriceCard: () => <div data-testid="price-card" />,
}));

vi.mock('@/app/components/Cards/TrendCard', () => ({
  TrendCard: () => <div data-testid="trend-card" />,
}));

vi.mock('@/app/components/Cards/NewsCard', () => ({
  NewsCard: () => <div data-testid="news-card" />,
}));

vi.mock('@/app/components/Cards/CompareCard', () => ({
  CompareCard: () => <div data-testid="compare-card" />,
}));

vi.mock('@/app/components/Cards/QuotationCard', () => ({
  QuotationCard: () => <div data-testid="quotation-card" />,
}));

vi.mock('@/app/components/Cards/AlertCard', () => ({
  AlertCard: () => <div data-testid="alert-card" />,
}));

vi.mock('@/app/components/Cards/TenderCard', () => ({
  TenderCard: () => <div data-testid="tender-card" />,
}));

vi.mock('@/app/components/Cards/TenderDetailCard', () => ({
  TenderDetailCard: () => <div data-testid="tender-detail-card" />,
}));

// ============================================================
// Mock QuickSelectChips
// ============================================================
vi.mock('@/app/components/Chat/QuickSelectChips', () => ({
  QuickSelectChips: () => <div data-testid="quick-select-chips" />,
}));

// ============================================================
// Mock sonner toast
// ============================================================
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ============================================================
// Mock quotations API
// ============================================================
vi.mock('@/app/api/quotations', () => ({
  createQuotation: vi.fn().mockResolvedValue({}),
}));

// ============================================================
// Helper: setup default store state
// ============================================================
function setupStore(overrides: Record<string, any> = {}) {
  const mockStore = {
    currentSessionId: 1,
    sessions: [],
    messages: [],
    isStreaming: false,
    isLoading: false,
    error: null,
    inputValue: '',
    statusMessage: null,
    lastMessageImage: null,
    selectedCard: null,
    focusInputTrigger: 0,
    activeQuickCommand: null,
    agentSteps: [],
    agentPlan: null,
    setInputValue: vi.fn(),
    setError: vi.fn(),
    setStatusMessage: vi.fn(),
    setIsLoading: vi.fn(),
    sendMessage: vi.fn(),
    clearError: vi.fn(),
    fetchSessions: vi.fn(),
    createSession: vi.fn(),
    setSelectedCard: vi.fn(),
    clearSelectedCard: vi.fn(),
    newSession: vi.fn(),
    removeSession: vi.fn(),
    ...overrides,
  };
  mockUseChatStoreImpl.mockReturnValue(mockStore);
  return mockStore;
}

// ============================================================
// Helper: render ChatPage with standard wrapper
// ============================================================
async function renderChatPage() {
  // Dynamic import to apply mocks
  const module = await import('@/app/pages/ChatPage');
  const ChatPage = module.default;

  const result = render(
    <MemoryRouter initialEntries={['/chat']}>
      <ChatPage />
    </MemoryRouter>,
  );
  return result;
}

// ============================================================
// Test suite
// ============================================================

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default store: no messages, not streaming
    setupStore();

    // Default: not authenticated
    mockUseAuthStoreImpl.mockReturnValue({
      isAuthenticated: false,
      access_token: null,
      refresh_token: null,
    });

    // Default: login dialog closed
    mockUseLoginDialogStoreImpl.mockReturnValue({
      open: false,
      openLoginDialog: vi.fn(),
      closeLoginDialog: vi.fn(),
    });

    // Default: no site config
    mockUseSettingsStoreImpl.mockReturnValue({
      siteConfig: null,
      loadSiteConfig: vi.fn(),
    });
  });

  // =======================================================================
  // Test 1: Empty state
  // =======================================================================
  it('renders empty state when there are no messages', async () => {
    await renderChatPage();

    // Empty state shows the app name or default title (appears in both
    // mobile header h1 + empty state h2; getAllByText handles duplicates)
    expect(screen.getAllByText('钢小秘')).toHaveLength(2);
    // Empty state shows helper text
    expect(
      screen.getByText(/查价格、算报价、看走势/),
    ).toBeInTheDocument();
  });

  // =======================================================================
  // Test 2: Renders message list with user and assistant bubbles
  // =======================================================================
  it('renders message list with user and assistant bubbles', async () => {
    setupStore({ messages: mockMessages });

    await renderChatPage();

    // User bubble
    const userBubble = screen.getByTestId('chat-bubble-1');
    expect(userBubble).toBeInTheDocument();
    expect(userBubble).toHaveAttribute('data-role', 'user');

    // Assistant bubble
    const aiBubble = screen.getByTestId('chat-bubble-2');
    expect(aiBubble).toBeInTheDocument();
    expect(aiBubble).toHaveAttribute('data-role', 'assistant');

    // Content
    expect(screen.getByTestId('bubble-content-1').textContent).toBe(
      '上海螺纹钢价格',
    );
  });

  // =======================================================================
  // Test 3: Passes onCardClick and onCardDoubleClick to ChatBubble
  // =======================================================================
  it('passes onCardClick and onCardDoubleClick to ChatBubble', async () => {
    setupStore({ messages: mockMessages });

    await renderChatPage();

    const aiBubble = screen.getByTestId('chat-bubble-2');

    // Both callbacks should be passed to the bubble
    expect(aiBubble).toHaveAttribute('data-has-oncardclick', 'true');
    expect(aiBubble).toHaveAttribute('data-has-oncarddblclick', 'true');
  });

  // =======================================================================
  // Test 4: Renders chat input area
  // =======================================================================
  it('renders chat input area', async () => {
    await renderChatPage();

    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  // =======================================================================
  // Test 5: Renders typing indicator when streaming with last user message
  // =======================================================================
  it('renders typing indicator when streaming with last user message', async () => {
    setupStore({
      isStreaming: true,
      messages: [
        {
          id: 1,
          session_id: 1,
          role: 'user',
          content: 'hello',
          tokens: 0,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    await renderChatPage();

    // Typing indicator should appear
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    expect(screen.getByText('AI thinking...')).toBeInTheDocument();
  });

  // =======================================================================
  // Test 6: Renders status message when streaming
  // =======================================================================
  it('renders status message when streaming', async () => {
    setupStore({
      isStreaming: true,
      statusMessage: '正在查询价格...',
      messages: [
        {
          id: 1,
          session_id: 1,
          role: 'user',
          content: 'hello',
          tokens: 0,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    await renderChatPage();

    // Status message should be visible
    expect(screen.getByText('正在查询价格...')).toBeInTheDocument();
  });

  // =======================================================================
  // Test 7: Does NOT show typing indicator when not streaming
  // =======================================================================
  it('does not show typing indicator when not streaming', async () => {
    setupStore({
      isStreaming: false,
      messages: [
        {
          id: 1,
          session_id: 1,
          role: 'user',
          content: 'hello',
          tokens: 0,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    await renderChatPage();

    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  // =======================================================================
  // Test 8: Does NOT show typing indicator when last message is assistant
  // =======================================================================
  it('does not show typing indicator when last message is assistant', async () => {
    setupStore({
      isStreaming: true,
      messages: [
        {
          id: 1,
          session_id: 1,
          role: 'assistant',
          content: 'hello reply',
          tokens: 0,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });

    await renderChatPage();

    // When last message is already assistant, no typing indicator
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
  });

  // =======================================================================
  // Test 9: Renders error banner when store has error
  // =======================================================================
  it('renders error banner when store has error', async () => {
    setupStore({
      error: '网络连接失败，请检查网络',
      messages: mockMessages,
    });

    await renderChatPage();

    // Error banner should be rendered with role=alert
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('网络连接失败，请检查网络'),
    ).toBeInTheDocument();

    // Close button should exist
    expect(
      screen.getByRole('button', { name: '关闭错误提示' }),
    ).toBeInTheDocument();
  });

  // =======================================================================
  // Test 10: Renders sidebar component
  // =======================================================================
  it('renders sidebar component', async () => {
    await renderChatPage();

    expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
  });

  // =======================================================================
  // Test 11: Wraps message content correctly for accessibility
  // =======================================================================
  it('wraps message list with aria-live for accessibility', async () => {
    setupStore({ messages: mockMessages });

    await renderChatPage();

    // The message list container should have role=log and aria-live
    const log = screen.getByRole('log');
    expect(log).toBeInTheDocument();
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(log).toHaveAttribute('aria-label', '对话消息列表');
  });
});
