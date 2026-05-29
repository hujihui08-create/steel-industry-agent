// ============================================================
// ChatPage — 主对话页面
// 三栏布局（桌面端）: Sidebar + Conversation + Detail
// 单栏布局（移动端）: 抽屉式 Sidebar + Conversation
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/app/stores/chatStore';
import { useAuthStore } from '@/app/stores/authStore';
import { useLoginDialogStore } from '@/app/stores/loginDialogStore';
import { useSettingsStore } from '@/app/stores/settingsStore';
import { useChat } from '@/app/hooks/useChat';
import { ChatSidebar } from '@/app/components/Chat/ChatSidebar';
import { ChatBubble, TypingIndicator } from '@/app/components/Chat/ChatBubble';
import ChatInput from '@/app/components/Chat/ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Sparkles, X, Bookmark, ExternalLink, Info, ArrowUpRight, ArrowDownRight, Minus, BarChart3, PanelRight } from 'lucide-react';
import { toast } from 'sonner';

import { PriceCard } from '@/app/components/Cards/PriceCard';
import type { PriceItem } from '@/app/components/Cards/PriceCard';
import { TrendCard } from '@/app/components/Cards/TrendCard';
import type { TrendDataPoint } from '@/app/components/Cards/TrendCard';
import { NewsCard } from '@/app/components/Cards/NewsCard';
import type { NewsItem } from '@/app/components/Cards/NewsCard';
import NewsDetailDialog from '@/app/components/Cards/NewsDetailDialog';
import { CompareCard } from '@/app/components/Cards/CompareCard';
import type { CompareCategory } from '@/app/components/Cards/CompareCard';
import { QuotationCard } from '@/app/components/Cards/QuotationCard';
import type { QuotationItem } from '@/app/components/Cards/QuotationCard';
import { AlertCard } from '@/app/components/Cards/AlertCard';
import type { AlertCardProps } from '@/app/components/Cards/AlertCard';
import { TenderCard } from '@/app/components/Cards/TenderCard';
import type { TenderCardItem } from '@/app/components/Cards/TenderCard';
import { TenderDetailCard } from '@/app/components/Cards/TenderDetailCard';
import type { TenderDetailCardData } from '@/app/components/Cards/TenderDetailCard';
import { QuickSelectChips } from '@/app/components/Chat/QuickSelectChips';
import type { CardAttachment } from '@/app/types/chat';
import { CommandPalette } from '@/app/components/shared/CommandPalette';
import LoginDialog from '@/app/components/Auth/LoginDialog';
import { NetworkStatus } from '@/app/components/shared/NetworkStatus';
import { createQuotation } from '@/app/api/quotations';
import { useTenderFavorite } from '@/app/hooks/useTenderFavorite';

export default function ChatPage() {
  const navigate = useNavigate();
  const store = useChatStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginDialog = useLoginDialogStore((s) => s.openLoginDialog);
  const closeLoginDialog = useLoginDialogStore((s) => s.closeLoginDialog);
  const loginDialogOpen = useLoginDialogStore((s) => s.open);
  const {
    sendMessage,
    stopGeneration,
    continueGeneration,
    switchSession,
    newSession,
    loadSessions,
    deleteSession,
  } = useChat();
  const { isFavorited, toggleFavorite, favoriteSet } = useTenderFavorite();

  // ---- site config (public branding) --------------------------
  const { siteConfig, loadSiteConfig } = useSettingsStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // ---- Mobile sidebar open state ----------------------------
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Derived current session title ------------------------
  const currentSessionTitle = useMemo(() => {
    if (!store.currentSessionId) return "";
    const session = store.sessions.find((s) => s.id === store.currentSessionId);
    return session?.title || "";
  }, [store.currentSessionId, store.sessions]);

  // ---- Command palette open state ---------------------------
  const [commandOpen, setCommandOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<number>(0);
  const [feedbackErrorType, setFeedbackErrorType] = useState('data_anomaly');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // ---- News detail dialog state ------------------------------
  const [detailNews, setDetailNews] = useState<NewsItem | null>(null);

  // ---- Fullscreen card state (double-tap) ---------------------
  const [fullscreenCard, setFullscreenCard] = useState<CardAttachment | null>(null);

  // ============================================================
  // Pull-to-refresh (mobile: pull down > 80px to refresh history)
  // ============================================================
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullRef = useRef<{ startY: number; tracking: boolean }>({ startY: 0, tracking: false });
  const lastTapRef = useRef<{ time: number; cardKey: string | null }>({ time: 0, cardKey: null });

  const handlePullStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    // 获取 scroll area 的 viewport 元素
    const scrollEl = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    if (scrollEl && scrollEl.scrollTop > 5) return;
    pullRef.current = { startY: e.touches[0].clientY, tracking: true };
  }, [isRefreshing]);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (!pullRef.current.tracking || isRefreshing) return;
    const deltaY = e.touches[0].clientY - pullRef.current.startY;
    if (deltaY < 0) { pullRef.current.tracking = false; setPullDistance(0); return; }
    setPullDistance(Math.min(deltaY * 0.5, 120));
    e.preventDefault();
  }, [isRefreshing]);

  const handlePullEnd = useCallback(() => {
    if (!pullRef.current.tracking) return;
    pullRef.current.tracking = false;
    if (pullDistance >= 80) {
      setIsRefreshing(true);
      loadSessions().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, loadSessions]);

  // ============================================================
  // Sidebar swipe gestures (mobile only, pointer: coarse)
  // ============================================================
  const sidebarSwipeRef = useRef<{
    startX: number;
    startY: number;
    startLeftEdge: boolean;
    tracking: boolean;
  }>({ startX: 0, startY: 0, startLeftEdge: false, tracking: false });

  const isTouchDeviceRef = useRef(false);

  // Detect touch device
  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)');
    const update = () => { isTouchDeviceRef.current = mql.matches; };
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const handleConversationTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDeviceRef.current) return;
    const touch = e.touches[0];
    const leftEdge = touch.clientX <= 20;
    sidebarSwipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startLeftEdge: leftEdge,
      tracking: true,
    };
  }, []);

  const handleConversationTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchDeviceRef.current || !sidebarSwipeRef.current.tracking) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - sidebarSwipeRef.current.startX;
    const deltaY = Math.abs(touch.clientY - sidebarSwipeRef.current.startY);

    // Ignore vertical scrolling (dominant Y movement)
    if (deltaY > Math.abs(deltaX)) {
      sidebarSwipeRef.current.tracking = false;
      return;
    }

    // Swipe right from left edge → open sidebar
    if (sidebarSwipeRef.current.startLeftEdge && deltaX > 50 && !sidebarOpen) {
      setSidebarOpen(true);
      sidebarSwipeRef.current.tracking = false;
    }

    // Swipe right when sidebar is open → close sidebar
    if (sidebarOpen && deltaX > 50) {
      setSidebarOpen(false);
      sidebarSwipeRef.current.tracking = false;
    }
  }, [sidebarOpen]);

  const handleConversationTouchEnd = useCallback(() => {
    sidebarSwipeRef.current.tracking = false;
  }, []);

  // ---- Detail panel visibility toggle -----------------------
  const [detailPanelOpen, setDetailPanelOpen] = useState(true);

  // ---- Selected card from store -----------------------------
  const selectedCard = store.selectedCard;
  const { setSelectedCard, clearSelectedCard } = store;

  // ---- Load sessions on mount -------------------------------
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [loadSessions, isAuthenticated]);

  // ---- Load site config on mount -----------------------------
  useEffect(() => {
    loadSiteConfig();
  }, [loadSiteConfig]);

  // ---- Auto scroll to bottom on new messages ---------------
  useEffect(() => {
    const scrollEl = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }, [store.messages]);

  // ---- Keyboard shortcut: Cmd+\ (Ctrl+\) toggle detail panel ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setDetailPanelOpen((prev) => !prev);
      }
      // ⌘⇧N / Ctrl+Shift+N = 新建会话
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        newSession();
      }
      // ⌘/ / Ctrl+/ = 聚焦输入框
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        useChatStore.getState().triggerFocusInput();
      }
      // Esc closes selected card on mobile
      if (e.key === 'Escape' && window.innerWidth < 1280) {
        const card = useChatStore.getState().selectedCard;
        if (card) {
          useChatStore.getState().clearSelectedCard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================================
  // Handlers
  // ============================================================

  const handleSend = (content: string, files?: File[]) => {
    if (!isAuthenticated) { openLoginDialog(); return; }
    if (store.isStreaming) return;
    if (files && files.length > 0) {
      const fileNames = files.map((f) => f.name).join("、");
      sendMessage(content ? `${content}\n[附件：${fileNames}]` : `[附件：${fileNames}]`);
    } else {
      sendMessage(content);
    }
  };


  const handleCommandSelect = (command: string) => {
    store.setInputValue(command);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {
      // Silently ignore clipboard errors
    });
  };

  const handleRegenerate = () => {
    if (!isAuthenticated) { openLoginDialog(); return; }
    // Re-send last user message
    const userMessages = store.messages.filter((m) => m.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMsg = userMessages[userMessages.length - 1];
      sendMessage(lastUserMsg.content);
    }
  };

  const handleFeedback = (isHelpful: boolean) => {
    const assistantMessages = store.messages.filter(
      (m) => m.role === 'assistant',
    );
    if (assistantMessages.length > 0) {
      const lastAssistantId = assistantMessages[assistantMessages.length - 1].id;
      if (!isHelpful) {
        setFeedbackMessageId(lastAssistantId);
        setFeedbackDialogOpen(true);
        return;
      }
      import('@/app/api/chat').then(({ submitFeedback }) => {
        submitFeedback({
          message_id: lastAssistantId,
          is_helpful: true,
        });
      });
    }
  };

  const handleFeedbackSubmit = async () => {
    setFeedbackSubmitting(true);
    try {
      const { submitFeedback } = await import('@/app/api/chat');
      await submitFeedback({
        message_id: feedbackMessageId,
        is_helpful: false,
        error_type: feedbackErrorType,
      });
      toast.success('感谢反馈，我们会尽快修正');
    } catch {
      toast.error('反馈提交失败');
    } finally {
      setFeedbackSubmitting(false);
      setFeedbackDialogOpen(false);
    }
  };

  const handleSwipeQuote = (content: string) => {
    const quoted = content.length > 80 ? content.slice(0, 80) + '...' : content;
    store.setInputValue(`> ${quoted}\n`);
  };

  // ============================================================
  // Card Attachment Renderer
  // ============================================================

  function renderCards(attachments: CardAttachment[], messageIndex: number) {
    // Don't render cards during streaming for the last message
    if (store.isStreaming && messageIndex === store.messages.length - 1) {
      return null;
    }

    const handleCardClick = (att: CardAttachment, cardKey: string) => {
      const now = Date.now();
      if (lastTapRef.current.cardKey === cardKey && now - lastTapRef.current.time < 400) {
        // 双击：全屏显示
        setFullscreenCard(att);
        lastTapRef.current = { time: 0, cardKey: null };
      } else {
        // 单击：桌面端显示详情面板
        setSelectedCard(att);
        lastTapRef.current = { time: now, cardKey };
      }
    };

    return attachments.map((att, i) => {
      const cardKey = `card-${messageIndex}-${i}`;

      switch (att.type) {
        case 'price': {
          const data = att.data as unknown as {
            eyebrow?: string; title?: string; prices?: PriceItem[];
            source?: string; sourceTime?: string;
          };
          if (!data.prices || data.prices.length === 0) return null;
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <PriceCard
                eyebrow={data.eyebrow}
                title={data.title || '价格查询'}
                prices={data.prices}
                source={data.source}
                sourceTime={data.sourceTime}
                onViewTrend={(e?: React.MouseEvent) => {
                  e?.stopPropagation();
                  const first = data.prices![0];
                  handleSend(`查看${first.region || ''}${data.title || ''}最近一周走势`);
                }}
              />
            </div>
          );
        }

        case 'trend': {
          const data = att.data as unknown as {
            title?: string; data?: TrendDataPoint[]; changePct?: number;
          };
          if (!data.data || data.data.length === 0) return null;
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <TrendCard
                title={data.title || '价格走势'}
                data={data.data}
                changePct={data.changePct}
              />
            </div>
          );
        }

        case 'news': {
          const data = att.data as unknown as {
            title?: string; news?: NewsItem[];
            source?: string; sourceTime?: string;
          };
          if (!data.news || data.news.length === 0) return null;
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <NewsCard
                title={data.title}
                news={data.news}
                source={data.source}
                sourceTime={data.sourceTime}
                onViewDetail={(item) => setDetailNews(item)}
              />
            </div>
          );
        }

        case 'compare': {
          const data = att.data as unknown as {
            eyebrow?: string; title?: string; categories?: CompareCategory[];
            source?: string; sourceTime?: string;
          };
          if (!data.categories || data.categories.length === 0) return null;
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <CompareCard
                eyebrow={data.eyebrow}
                title={data.title}
                categories={data.categories}
                source={data.source}
                sourceTime={data.sourceTime}
              />
            </div>
          );
        }

        case 'quotation': {
          const data = att.data as unknown as {
            title?: string; items?: QuotationItem[]; total?: number;
            currency?: string; customer_name?: string; spec?: string;
            quantity?: number; region?: string; delivery_location?: string;
            category?: string; material_cost?: number; freight_cost?: number;
            tax_cost?: number;
          };
          const items: QuotationItem[] = data.items || [];
          if (data.material_cost != null) {
            items.push({ label: '材料费', value: data.material_cost, detail: data.category ? `${data.category} ${data.spec || ''}` : undefined });
          }
          if (data.freight_cost != null) {
            items.push({ label: '运费', value: data.freight_cost, detail: data.delivery_location || data.region || undefined });
          }
          if (data.tax_cost != null) {
            items.push({ label: '税费', value: data.tax_cost });
          }
          if (items.length === 0 && data.total == null) return null;
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <QuotationCard
                title={data.title || '报价单'}
                items={items}
                total={data.total || 0}
                currency={data.currency}
                onSave={() => {
                  if (!data.category || !data.spec) {
                    toast.error('报价信息不完整，无法保存');
                    return;
                  }
                  createQuotation({
                    title: data.title || `${data.category || ''} ${data.spec || ''}`.trim() || '报价单',
                    category: data.category,
                    spec: data.spec,
                    quantity: data.quantity || 0,
                    customer_name: data.customer_name,
                    delivery_location: data.delivery_location || data.region,
                  }).then(() => {
                    toast.success('报价单已保存');
                  }).catch(() => {
                    toast.error('保存失败，请重试');
                  });
                }}
                onShare={() => {
                  const text = items.map(i => `${i.label}: ¥${i.value.toLocaleString()}`).join(' | ') + ` | 合计: ¥${(data.total || 0).toLocaleString()}`;
                  navigator.clipboard.writeText(text).then(() => toast.success('已复制报价信息'));
                }}
                onRecalculate={() => {
                  store.setInputValue('重新计算报价');
                }}
              />
            </div>
          );
        }

        case 'quick_select': {
          const data = att.data as unknown as {
            options?: string[]; label?: string; single?: boolean;
          };
          if (!data.options || data.options.length === 0) return null;
          return (
            <div key={cardKey} className="mt-3 max-w-[85%]">
              <QuickSelectChips
                options={data.options}
                label={data.label}
                disabled={store.isStreaming}
                onSelect={(value: string) => {
                  if (store.isStreaming) return;
                  store.setInputValue(value);
                  setTimeout(() => handleSend(value), 50);
                }}
              />
            </div>
          );
        }

        case 'alert': {
          const raw = att.data as Record<string, unknown>;
          const data: AlertCardProps = {
            id: raw.id as number | undefined,
            category: (raw.category as string) || '',
            spec: (raw.spec as string) || '',
            region: (raw.region as string) || '',
            targetPrice: (raw.target_price as number) || 0,
            condition: (raw.condition as 'above' | 'below') || 'above',
            notifyMethod: raw.notify_method as string | undefined,
            isActive: raw.is_active as boolean | undefined,
            isTriggered: raw.is_triggered as boolean | undefined,
            currentPrice: raw.current_price as number | undefined,
            triggeredAt: raw.triggered_at as string | undefined,
          };
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <AlertCard
                {...data}
                onModify={() => {
                  store.setInputValue(`修改${data.category || ''}${data.spec || ''}预警条件`);
                }}
                onViewAll={() => {
                  handleSend('查看我的预警');
                }}
              />
            </div>
          );
        }

        case 'tender_list': {
          const raw = att.data as Record<string, unknown>;
          const items = (raw.items as TenderCardItem[]) || [];
          if (items.length === 0) {
            return (
              <div key={cardKey} className="mt-3 max-w-[85%]">
                <TenderCard items={[]} />
              </div>
            );
          }
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <TenderCard
                title={raw.title as string}
                subtitle={raw.subtitle as string}
                items={items}
                totalCount={raw.total_count as number}
                isReminder={raw.is_reminder as boolean}
                source={raw.source as string}
                sourceTime={raw.sourceTime as string}
                favoritedIds={favoriteSet}
                onFavorite={toggleFavorite}
                onViewDetail={(id) => {
                  handleSend(`查看招标${id}的详情`);
                }}
              />
            </div>
          );
        }

        case 'tender_detail': {
          const raw = att.data as Record<string, unknown>;
          const detailData: TenderDetailCardData = {
            id: raw.id as (number | string),
            title: (raw.title as string) || '',
            bidding_company: raw.bidding_company as string,
            budget: (raw.budget as number) || 0,
            region: (raw.region as string) || '',
            category: (raw.category as string) || '',
            deadline: (raw.deadline as string) || '',
            bid_deadline: (raw.bid_deadline as string) || '',
            description: raw.description as string,
            items: raw.items as TenderDetailCardData['items'],
            source_url: raw.source_url as string,
            is_favorited: isFavorited(raw.id as (number | string)),
          };
          return (
            <div
              key={cardKey}
              role="button"
              tabIndex={0}
              className="mt-3 max-w-[85%] cursor-pointer animate-card-in"
              style={{ animationDelay: `${i * 100}ms` }}
              onClick={() => handleCardClick(att, cardKey)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCard(att); } }}
            >
              <TenderDetailCard
                data={detailData}
                isFavorited={isFavorited(raw.id as (number | string))}
                onFavorite={toggleFavorite}
                onViewSource={(url) => {
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              />
            </div>
          );
        }

        default:
          return null;
      }
    });
  }

  // ============================================================
  // Empty State (no messages yet)
  // ============================================================

  function EmptyState() {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-8" aria-live="polite">
        <div className="w-16 h-16 rounded-full border border-steel-line flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-steel-ink" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h2 className="text-[22px] leading-[1.2] md:text-[24px] md:leading-[1.3] font-medium text-steel-ink mb-2">
          {siteConfig?.siteName || "钢小秘"}
        </h2>
        <p className="text-[15px] leading-[1.6] text-steel-muted text-center max-w-[360px]">
          查价格、算报价、看走势、搜知识、查招标、看资讯、算重量、设预警
        </p>
      </div>
    );
  }

  // ============================================================
  // Detail Panel Content Renderer
  // ============================================================

  function DetailPanelContent({ isMobile }: { isMobile?: boolean }) {
    // ---- Empty State ----
    if (!selectedCard) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[400px]">
          <div className="w-12 h-12 rounded-full border border-steel-line flex items-center justify-center mb-4">
            <Info className="w-6 h-6 text-steel-placeholder" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p className="text-[15px] leading-[1.6] text-steel-body">点击消息中的卡片查看详情</p>
          <p className="text-[12px] leading-[1.5] text-steel-muted mt-2">选择价格、走势、报价等卡片以查看完整信息</p>
        </div>
      );
    }

    // ---- Price Card Detail ----
    if (selectedCard.type === 'price') {
      const data = selectedCard.data as unknown as {
        eyebrow?: string; title?: string; prices?: PriceItem[];
        source?: string; sourceTime?: string;
      };
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <div className="min-w-0">
              {data.eyebrow && (
                <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                  {data.eyebrow}
                </div>
              )}
              <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
                {data.title || '价格详情'}
              </h2>
            </div>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>

          {/* Source info */}
          {data.source && (
            <div className="px-5 py-2 text-[12px] leading-[1.5] text-steel-muted">
              数据来源: {data.source}
              {data.sourceTime && ` · ${data.sourceTime}`}
            </div>
          )}

          {/* Price rows */}
          {data.prices && data.prices.length > 0 && (
            <div className="divide-y divide-steel-line">
              {data.prices.map((item) => {
                const isUp = item.change > 0;
                const isDown = item.change < 0;
                const changeColor = isUp
                  ? 'text-steel-up'
                  : isDown
                    ? 'text-steel-down'
                    : 'text-steel-muted';
                const ArrowIcon = isUp
                  ? ArrowUpRight
                  : isDown
                    ? ArrowDownRight
                    : Minus;

                return (
                  <div
                    key={item.region}
                    className="px-5 py-4 flex items-center justify-between"
                  >
                    <span className="text-[15px] leading-[1.6] text-steel-body">
                      {item.region}
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-[18px] tabular-nums text-steel-ink">
                        ¥{item.price.toLocaleString()}
                      </span>
                      <span
                        className={`flex items-center gap-0.5 text-[12px] leading-[1.5] tabular-nums ${changeColor}`}
                      >
                        <ArrowIcon className="size-3" strokeWidth={2} />
                        {item.change >= 0 ? '+' : ''}{item.change} ({item.change >= 0 ? '+' : ''}{item.changePct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View trend action */}
          {data.prices && data.prices.length > 0 && (
            <div className="px-5 py-3">
              <button
                type="button"
                aria-label="查看走势图"
                onClick={() => {
                  const first = data.prices![0];
                  const params = new URLSearchParams({
                    category: data.title || '',
                    spec: '',
                    region: first.region || '',
                  });
                  navigate(`/price-board?${params.toString()}`);
                }}
                className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
              >
                <BarChart3 className="size-3.5" strokeWidth={1.75} />
                查看走势图
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-steel-line flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast('已收藏')}
              aria-label="收藏"
              className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Bookmark className="size-4" strokeWidth={1.75} />
              收藏
            </button>
            {data.source && (
              <button
                type="button"
                aria-label="查看来源"
                className="rounded-full border border-steel-line text-[13px] text-steel-muted hover:border-steel-ink hover:text-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
              >
                <ExternalLink className="size-4" strokeWidth={1.75} />
                来源
              </button>
            )}
          </div>
        </div>
      );
    }

    // ---- Compare Card Detail ----
    if (selectedCard.type === 'compare') {
      const data = selectedCard.data as unknown as {
        eyebrow?: string; title?: string; categories?: { name: string; spec: string; regions: { region: string; price: number; change: number; changePct: number }[] }[];
        source?: string; sourceTime?: string;
      };
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <div className="min-w-0">
              {data.eyebrow && (
                <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                  {data.eyebrow}
                </div>
              )}
              <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
                {data.title || '价格对比'}
              </h2>
            </div>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>

          {/* Source info */}
          {data.source && (
            <div className="px-5 py-2 text-[12px] leading-[1.5] text-steel-muted">
              数据来源: {data.source}
              {data.sourceTime && ` · ${data.sourceTime}`}
            </div>
          )}

          {/* Categories comparison */}
          {data.categories && data.categories.length > 0 && (
            <div className="flex-1 overflow-x-auto">
              <div className="flex min-w-max">
                {data.categories.map((cat, ci) => (
                  <div
                    key={cat.name}
                    className={`min-w-[160px] px-5 py-4 ${ci < data.categories!.length - 1 ? 'border-r border-steel-line' : ''}`}
                  >
                    <div className="text-[15px] font-medium text-steel-ink mb-1">
                      {cat.name}
                    </div>
                    <div className="text-[13px] text-steel-muted mb-3">
                      {cat.spec}
                    </div>
                    <div className="divide-y divide-steel-line">
                      {cat.regions.map((r) => {
                        const isUp = r.change > 0;
                        const isDown = r.change < 0;
                        const changeColor = isUp ? 'text-steel-up' : isDown ? 'text-steel-down' : 'text-steel-muted';
                        const ArrowIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
                        return (
                          <div key={r.region} className="py-2.5 flex items-center justify-between">
                            <span className="text-[13px] text-steel-muted">{r.region}</span>
                            <div className="text-right">
                              <span className="text-[15px] tabular-nums text-steel-ink">
                                ¥{r.price.toLocaleString()}
                              </span>
                              <span className={`flex items-center gap-0.5 justify-end text-[12px] tabular-nums ${changeColor}`}>
                                <ArrowIcon className="size-3" strokeWidth={2} />
                                {r.change >= 0 ? '+' : ''}{r.change} ({r.change >= 0 ? '+' : ''}{r.changePct}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-steel-line flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast('已收藏')}
              aria-label="收藏"
              className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Bookmark className="size-4" strokeWidth={1.75} />
              收藏
            </button>
          </div>
        </div>
      );
    }

    // ---- Quotation Card Detail ----
    if (selectedCard.type === 'quotation') {
      const data = selectedCard.data as unknown as {
        title?: string; items?: { label: string; value: number; detail?: string }[];
        total?: number; currency?: string; source?: string; sourceTime?: string;
      };
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <div className="min-w-0">
              <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                QUOTATION
              </div>
              <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
                {data.title || '报价单'}
              </h2>
            </div>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>

          {/* Source info */}
          {data.source && (
            <div className="px-5 py-2 text-[12px] leading-[1.5] text-steel-muted">
              数据来源: {data.source}
              {data.sourceTime && ` · ${data.sourceTime}`}
            </div>
          )}

          {/* Line items */}
          {data.items && data.items.length > 0 && (
            <>
              <div className="divide-y divide-steel-line px-5">
                {data.items.map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[15px] leading-[1.6] text-steel-body">
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="text-[12px] leading-[1.5] text-steel-muted ml-2">
                          {item.detail}
                        </span>
                      )}
                    </div>
                    <span className="text-[15px] leading-[1.6] text-steel-ink tabular-nums shrink-0 ml-4">
                      {data.currency || '¥'}{item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total row */}
              {data.total != null && (
                <div className="mx-5 my-2 rounded-lg bg-steel-surface px-5 py-4 flex items-baseline justify-between">
                  <span className="text-[12px] leading-[1.5] text-steel-muted">合计</span>
                  <span className="text-[24px] leading-[1.3] font-medium text-steel-ink tabular-nums">
                    {data.currency || '¥'}{data.total.toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-steel-line flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast('已收藏')}
              aria-label="收藏"
              className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Bookmark className="size-4" strokeWidth={1.75} />
              收藏
            </button>
          </div>
        </div>
      );
    }

    // ---- Table Card Detail ----
    if (selectedCard.type === 'table') {
      const data = selectedCard.data as unknown as {
        title?: string; headers?: string[]; rows?: string[][];
        source?: string; sourceTime?: string;
      };
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
              {data.title || '数据表'}
            </h2>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>

          {/* Source info */}
          {data.source && (
            <div className="px-5 py-2 text-[12px] leading-[1.5] text-steel-muted">
              数据来源: {data.source}
              {data.sourceTime && ` · ${data.sourceTime}`}
            </div>
          )}

          {/* Mini table */}
          {data.headers && data.headers.length > 0 ? (
            <div className="flex-1 overflow-auto px-5 py-3">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-steel-line">
                    {data.headers.map((header, i) => (
                      <th
                        key={i}
                        className="px-3 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted font-medium h-9 text-left"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.rows || []).map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="border-b border-steel-line last:border-b-0"
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-3 py-3 text-[13px] leading-[1.5] text-steel-body"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.rows || data.rows.length === 0) && (
                <div className="py-8 text-center text-[13px] text-steel-muted">
                  暂无数据
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-steel-line flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast('已收藏')}
              aria-label="收藏"
              className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Bookmark className="size-4" strokeWidth={1.75} />
              收藏
            </button>
          </div>
        </div>
      );
    }

    // ---- Trend Card Detail ----
    if (selectedCard.type === 'trend') {
      const data = selectedCard.data as unknown as {
        title?: string; data?: TrendDataPoint[]; changePct?: number; period?: string;
      };
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
              {data.title || '价格走势'}
            </h2>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>

          {/* Chart */}
          <div className="p-5">
            <div className="rounded-lg border border-steel-line p-4">
              <h3 className="text-[15px] leading-[1.6] font-medium text-steel-ink mb-3">
                {data.title || '价格走势'}
              </h3>
              <TrendCard
                title=""
                data={data.data || []}
                changePct={data.changePct}
                period={data.period}
              />
            </div>
          </div>

          {/* Period tabs */}
          <div className="px-5 flex gap-1">
            {['近7天', '近30天', '近90天'].map((label) => (
              <button
                key={label}
                type="button"
                aria-label={`查看${label}走势`}
                className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-3 py-1.5"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer actions */}
          <div className="px-5 py-4 border-t border-steel-line flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast('已收藏')}
              aria-label="收藏"
              className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Bookmark className="size-4" strokeWidth={1.75} />
              收藏
            </button>
            <button
              type="button"
              aria-label="查看来源"
              className="rounded-full border border-steel-line text-[13px] text-steel-muted hover:border-steel-ink hover:text-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} />
              来源
            </button>
          </div>
        </div>
      );
    }

    // ---- Alert Card Detail ----
    if (selectedCard.type === 'alert') {
      const raw = selectedCard.data as Record<string, unknown>;
      const data: AlertCardProps = {
        id: raw.id as number | undefined,
        category: (raw.category as string) || '',
        spec: (raw.spec as string) || '',
        region: (raw.region as string) || '',
        targetPrice: (raw.target_price as number) || 0,
        condition: (raw.condition as 'above' | 'below') || 'above',
        notifyMethod: raw.notify_method as string | undefined,
        isActive: raw.is_active as boolean | undefined,
        isTriggered: raw.is_triggered as boolean | undefined,
        currentPrice: raw.current_price as number | undefined,
        triggeredAt: raw.triggered_at as string | undefined,
      };
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
              {data.category} {data.spec} 预警
            </h2>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>
          <div className="p-5">
            <AlertCard
              {...data}
              onModify={() => {
                store.setInputValue(`修改${data.category || ''}${data.spec || ''}预警条件`);
              }}
              onViewAll={() => {
                handleSend('查看我的预警');
              }}
            />
          </div>
          <div className="flex-1" />
          <div className="px-5 py-4 border-t border-steel-line flex items-center gap-2">
            <button
              type="button"
              onClick={() => toast('已收藏')}
              aria-label="收藏"
              className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Bookmark className="size-4" strokeWidth={1.75} />
              收藏
            </button>
          </div>
        </div>
      );
    }

    // ---- Tender List Card Detail ----
    if (selectedCard.type === 'tender_list') {
      const raw = selectedCard.data as Record<string, unknown>;
      const items = (raw.items as TenderCardItem[]) || [];
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <div className="min-w-0">
              <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                TENDER
              </div>
              <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
                {(raw.title as string) || '招标列表'}
              </h2>
            </div>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <TenderCard
              title={undefined}
              items={items}
              totalCount={raw.total_count as number}
              isReminder={raw.is_reminder as boolean}
              source={raw.source as string}
              sourceTime={raw.sourceTime as string}
              favoritedIds={favoriteSet}
              onFavorite={toggleFavorite}
              onViewDetail={(id) => {
                handleSend(`查看招标${id}的详情`);
              }}
            />
          </div>
        </div>
      );
    }

    // ---- Tender Detail Card Detail ----
    if (selectedCard.type === 'tender_detail') {
      const raw = selectedCard.data as Record<string, unknown>;
      const detailData: TenderDetailCardData = {
        id: raw.id as (number | string),
        title: (raw.title as string) || '',
        bidding_company: raw.bidding_company as string,
        budget: (raw.budget as number) || 0,
        region: (raw.region as string) || '',
        category: (raw.category as string) || '',
        deadline: (raw.deadline as string) || '',
        bid_deadline: (raw.bid_deadline as string) || '',
        description: raw.description as string,
        items: raw.items as TenderDetailCardData['items'],
        source_url: raw.source_url as string,
      };
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
            <div className="min-w-0">
              <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                招标详情
              </div>
              <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
                {detailData.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={clearSelectedCard}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
              aria-label="关闭详情"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <TenderDetailCard
              data={detailData}
              isFavorited={isFavorited(raw.id as (number | string))}
              onFavorite={toggleFavorite}
              onViewSource={(url) => {
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            />
          </div>
        </div>
      );
    }

    // ---- Default: basic info for other card types ----
    const data = selectedCard.data as Record<string, unknown>;
    const source = typeof data.source === 'string' ? data.source : null;
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-line">
          <h2 className="text-[18px] leading-[1.4] font-medium text-steel-ink truncate">
            {(data.title as string) || selectedCard.type}
          </h2>
          <button
            type="button"
            onClick={clearSelectedCard}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2"
            aria-label="关闭详情"
          >
            <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
          </button>
        </div>

        {/* Basic content */}
        <div className="flex-1 p-5">
          <div className="text-[13px] leading-[1.6] text-steel-muted uppercase tracking-[0.18em] mb-2">
            {selectedCard.type}
          </div>
          <p className="text-[15px] leading-[1.6] text-steel-body">
            {(data.title as string) || '卡片详情'}
          </p>
          {source && (
            <p className="text-[12px] leading-[1.5] text-steel-muted mt-2">
              数据来源: {source}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-steel-line flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast('已收藏')}
            aria-label="收藏"
            className="rounded-full border border-steel-line text-[13px] text-steel-ink hover:border-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
          >
            <Bookmark className="size-4" strokeWidth={1.75} />
            收藏
          </button>
          {source && (
            <button
              type="button"
              aria-label="查看来源"
              className="rounded-full border border-steel-line text-[13px] text-steel-muted hover:border-steel-ink hover:text-steel-ink transition-colors duration-150 px-4 py-2 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} />
              来源
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // Derived values (before render)
  // ============================================================
  const lastMsg = store.messages.length > 0 ? store.messages[store.messages.length - 1] : null;
  const isLastMessageUser = lastMsg?.role === 'user';

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="h-screen flex bg-steel-canvas relative overflow-hidden">
      {/* ---- Network Status Bar ---- */}
      <NetworkStatus />

      {/* ==========================================================
          Sidebar
          - Desktop (md+): 240px left column, always visible
          - Mobile (<md): Sheet slide-in drawer, controlled by sidebarOpen
          ChatSidebar handles responsive rendering internally.
          ========================================================== */}
      <ChatSidebar
        sessions={store.sessions}
        currentSessionId={store.currentSessionId}
        onSelectSession={(id) => {
          switchSession(id);
          setSidebarOpen(false);
        }}
        onNewSession={() => {
          newSession();
          setSidebarOpen(false);
        }}
        onDeleteSession={deleteSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* ==========================================================
          Main Chat Area
          (Touch handlers for swipe gestures applied here, mobile only)
          ========================================================== */}
      <div
        ref={conversationRef}
        className="flex-1 flex flex-col min-w-0 pt-0 h-full"
        onTouchStart={handleConversationTouchStart}
        onTouchMove={handleConversationTouchMove}
        onTouchEnd={handleConversationTouchEnd}
      >
        {/* ---- Mobile Header ---- */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-steel-line">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-steel-surface active:bg-steel-surface active:scale-95 transition-all duration-[80ms]"
            aria-label="打开会话列表"
          >
            <MessageSquare
              className="w-5 h-5 text-steel-ink"
              strokeWidth={1.75}
            />
          </button>
          <h1 className="text-[18px] leading-[1.4] font-medium text-steel-ink">
            {siteConfig?.siteName || "钢小秘"}
          </h1>
          <div className="w-8" />
        </div>

        {/* ---- Desktop Header ---- */}
        <div className="hidden md:flex items-center justify-between px-6 py-[11px] border-b border-steel-line shrink-0">
          <h1 className="text-[15px] leading-[1.5] font-medium text-steel-ink truncate min-w-0">
            {currentSessionTitle || siteConfig?.siteName || "钢铁助手"}
          </h1>
          <button
            onClick={() => setDetailPanelOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-steel-surface shrink-0 ml-2 transition-colors duration-150"
            aria-label={detailPanelOpen ? "收起详情" : "展开详情"}
          >
            <PanelRight className="w-4 h-4 text-steel-muted" strokeWidth={1.75} />
          </button>
        </div>

        {/* ---- Messages Area ---- */}
        <div
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          onTouchStart={handlePullStart}
          onTouchMove={handlePullMove}
          onTouchEnd={handlePullEnd}
        >
          {/* Pull-to-refresh indicator */}
          <div
            className="flex items-center justify-center overflow-hidden transition-all duration-200"
            style={{ height: `${pullDistance}px`, opacity: pullDistance > 10 ? 1 : 0 }}
          >
            {isRefreshing ? (
              <div className="w-5 h-5 border-2 border-steel-line border-t-steel-ink rounded-full animate-spin" />
            ) : pullDistance >= 80 ? (
              <span className="text-[12px] leading-[1.5] text-steel-muted">释放刷新</span>
            ) : (
              <span className="text-[12px] leading-[1.5] text-steel-placeholder">下拉刷新历史消息</span>
            )}
          </div>
          <ScrollArea
        ref={scrollRef}
        className="flex-1 h-full"
      >
            {store.messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                className="max-w-[720px] mx-auto px-4 py-6 space-y-4"
                role="log"
                aria-live="polite"
                aria-label="对话消息列表"
              >
                {store.messages.map((msg, index) => {
                  const prevMsg = index > 0 ? store.messages[index - 1] : null;
                  const hideAvatar = msg.role === 'assistant' && prevMsg?.role === 'assistant';
                  return (
                  <div key={msg.id}>
                    <ChatBubble
                      message={msg}
                      isStreaming={
                        store.isStreaming &&
                        index === store.messages.length - 1 &&
                        msg.role === 'assistant'
                      }
                      isLast={index === store.messages.length - 1}
                      hideAvatar={hideAvatar}
                      onCopy={handleCopy}
                      onRegenerate={handleRegenerate}
                      onContinue={continueGeneration}
                      onFeedback={handleFeedback}
                      onSwipeQuote={() => handleSwipeQuote(msg.content)}
                    />
                    {msg.role === 'assistant' && msg.attachments && msg.attachments.length > 0 && (
                      renderCards(msg.attachments, index)
                    )}
                  </div>
                  );
                })}

                {/* Typing indicator — shown when AI is generating but hasn't started output yet */}
                {store.isStreaming && isLastMessageUser && (
                  <TypingIndicator />
                )}
                {/* Tool status message — shown during function calling */}
                {store.isStreaming && store.statusMessage && isLastMessageUser && (
                  <div className="flex gap-3 max-w-[85%] animate-splash-in">
                    <div className="size-7 shrink-0" aria-hidden="true" />
                    <div className="rounded-2xl rounded-tl-sm bg-steel-surface border border-steel-line px-4 py-2.5 text-[13px] leading-[1.5] text-steel-muted flex items-center gap-2">
                      <span className="inline-block size-[1.5px] rounded-full bg-steel-placeholder animate-pulse" />
                      {store.statusMessage}
                    </div>
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* ---- Error Banner ---- */}
          {store.error && (
            <div className="mx-4 mb-2 px-4 py-2 rounded-md bg-rose-50 border border-rose-200 text-[13px] text-steel-down flex items-center justify-between" role="alert" aria-live="assertive">
              <span>{store.error}</span>
              <button
                type="button"
                onClick={() => store.setError(null)}
                aria-label="关闭错误提示"
                className="text-[13px] text-steel-muted hover:text-steel-ink focus:ring-4 focus:ring-steel-ink/10 active:scale-97 transition-all duration-[160ms] ease-[cubic-bezier(.2,.8,.2,1)] ml-2 px-3 py-1 rounded-[6px]"
              >
                关闭
              </button>
            </div>
          )}
        </div>

        {/* ---- Input Area ---- */}
        <div className="flex-shrink-0 border-t border-steel-line bg-steel-canvas px-4 pb-4 pt-3 relative z-10">
          <div className="max-w-[720px] mx-auto">
            <ChatInput
              onSend={handleSend}
              isStreaming={store.isStreaming}
              onStop={stopGeneration}
              value={store.inputValue}
              onChange={store.setInputValue}
              lastUserMessage={store.messages.filter(m => m.role === 'user').slice(-1)[0]?.content}
            />
          </div>
        </div>
      </div>

      {/* ==========================================================
          Detail Panel
          - Desktop (xl+): Fixed 360px right side, togglable via Cmd+\
          - Mobile (<xl): Full-screen overlay when card selected
          ========================================================== */}
      {/* ---- Desktop Side Panel ---- */}
      {detailPanelOpen && (
        <div className="hidden xl:flex flex-col w-[360px] border-l border-steel-line bg-steel-canvas" role="complementary" aria-label="详情面板">
          <div className="flex items-center justify-between px-5 py-[11px] border-b border-steel-line shrink-0">
            <span className="text-[15px] leading-[1.5] font-medium text-steel-ink">
              详情
            </span>
            <span className="text-[10px] text-steel-placeholder font-mono">⌘\</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DetailPanelContent />
          </div>
        </div>
      )}

      {/* ---- Mobile Full-Screen Overlay ---- */}
      {selectedCard && (
        <div className="xl:hidden fixed inset-0 z-50 bg-steel-canvas flex flex-col overflow-y-auto">
          <DetailPanelContent isMobile />
        </div>
      )}

      {/* ---- Double-tap Fullscreen Card Overlay ---- */}
      {fullscreenCard && (
        <div className="fixed inset-0 z-[60] bg-steel-canvas flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-steel-line shrink-0">
            <span className="text-[15px] leading-[1.5] font-medium text-steel-ink">全屏查看</span>
            <button
              type="button"
              onClick={() => { setFullscreenCard(null); clearSelectedCard(); }}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-steel-surface"
              aria-label="退出全屏"
            >
              <X className="w-5 h-5 text-steel-ink" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DetailPanelContent isMobile />
          </div>
        </div>
      )}

      {/* ---- News Detail Dialog ---- */}
      <NewsDetailDialog
        news={detailNews}
        onClose={() => setDetailNews(null)}
      />

      {/* ---- Command Palette (⌘K / Ctrl+K) ---- */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onSelectCommand={handleCommandSelect}
      />

      {/* ---- Login Dialog (未登录引导) ---- */}
      <LoginDialog open={loginDialogOpen} onOpenChange={(open) => { if (!open) closeLoginDialog(); }} />

      {/* ---- 负反馈问题类型选择弹窗 ---- */}
      {feedbackDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setFeedbackDialogOpen(false); }}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white border border-[#E5E5E5] rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] w-full max-w-sm mx-4 z-10">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-[16px] leading-[1.4] font-medium text-[#0A0A0A]">问题反馈</h3>
              <p className="text-[13px] text-[#737373] mt-1">请选择本次回复的问题类型，帮助我们改进</p>
            </div>
            <div className="px-5 pb-2 flex flex-col gap-2">
              {[
                { value: 'price_inaccurate', label: '价格不准确' },
                { value: 'missing_data', label: '数据缺失' },
                { value: 'calculation_error', label: '计算错误' },
                { value: 'refuse_answer', label: '拒绝回答' },
                { value: 'data_anomaly', label: '数据异常' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFeedbackErrorType(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] leading-[1.5] border transition-colors duration-150 ${
                    feedbackErrorType === opt.value
                      ? 'border-[#0A0A0A] bg-[#FAFAFA] text-[#0A0A0A]'
                      : 'border-[#E5E5E5] text-[#404040] hover:border-[#0A0A0A]/30'
                  }`}
                >
                  {feedbackErrorType === opt.value && (
                    <div className="w-4 h-4 rounded-full bg-[#0A0A0A] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                  {feedbackErrorType !== opt.value && (
                    <div className="w-4 h-4 rounded-full border border-[#D4D4D4]" />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
              <button
                type="button"
                onClick={() => setFeedbackDialogOpen(false)}
                className="h-9 px-4 rounded-full border border-[#E5E5E5] text-[13px] text-[#404040] hover:bg-[#FAFAFA] transition-colors duration-150"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting}
                className="h-9 px-5 rounded-full bg-[#0A0A0A] text-white text-[13px] hover:bg-[#404040] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {feedbackSubmitting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                提交反馈
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
