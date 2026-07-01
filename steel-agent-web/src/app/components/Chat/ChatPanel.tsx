// ============================================================
// ChatPanel — 工作台右侧聊天面板
// 从 ChatPage 提取的独立面板组件，放在 WorkbenchRightPanel 中
// 保留 SSE 流式输出、消息渲染、AgentProgressCard
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/app/stores/chatStore";
import { useAuthStore } from "@/app/stores/authStore";
import { useLoginDialogStore } from "@/app/stores/loginDialogStore";
import { useChat } from "@/app/hooks/useChat";
import { ChatBubble, TypingIndicator } from "@/app/components/Chat/ChatBubble";
import AgentProgressCard from "@/app/components/Chat/AgentProgressCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Square,
  Upload,
  BarChart3,
  FileText,
  Search,
  Bell,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { CardAttachment } from "@/app/types/chat";

// ---- Quick command definitions ----
const QUICK_COMMANDS = [
  { id: "price", label: "查价格", icon: BarChart3 },
  { id: "quote", label: "算报价", icon: FileText },
  { id: "tender", label: "看招标", icon: Search },
  { id: "alert", label: "设预警", icon: Bell },
  { id: "trend", label: "看走势", icon: TrendingUp },
] as const;

export function ChatPanel() {
  const store = useChatStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginDialog = useLoginDialogStore((s) => s.openLoginDialog);

  const {
    sendMessage,
    stopGeneration,
    loadSessions,
  } = useChat();

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sessions on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [loadSessions, isAuthenticated]);

  // Auto scroll to bottom
  useEffect(() => {
    const scrollEl = scrollRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null;
    if (scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  }, [store.messages]);

  const handleSend = () => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }
    if (store.isStreaming) return;
    const content = store.inputValue.trim();
    if (!content) return;

    sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickCommand = (prompt: string) => {
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }
    if (store.isStreaming) return;
    sendMessage(prompt);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // Trigger send with file context
    if (!isAuthenticated) {
      openLoginDialog();
      return;
    }
    const fileNames = Array.from(files)
      .map((f) => f.name)
      .join("、");
    sendMessage(`请分析这个文件：${fileNames}`);
  };

  const lastMsg =
    store.messages.length > 0
      ? store.messages[store.messages.length - 1]
      : null;
  const isLastMessageUser = lastMsg?.role === "user";

  return (
    <div className="flex flex-col h-full">
      {/* ---- Quick Commands ---- */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border shrink-0">
        {QUICK_COMMANDS.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.id}
              type="button"
              onClick={() => handleQuickCommand(cmd.label)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-card text-[12px] leading-[16px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors duration-150"
            >
              <Icon className="size-3" strokeWidth={2} aria-hidden="true" />
              {cmd.label}
            </button>
          );
        })}
      </div>

      {/* ---- Messages Area ---- */}
      <div className="flex-1 min-h-0">
        <ScrollArea ref={scrollRef} className="h-full">
          {store.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 min-h-[200px]">
              <div className="size-10 rounded-full border border-border flex items-center justify-center mb-3">
                <Sparkles className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="text-[13px] leading-[18px] text-muted-foreground text-center">
                选择上方快捷指令或输入问题
              </p>
            </div>
          ) : (
            <div className="px-3 py-3 space-y-1.5">
              {store.messages.map((msg, index) => {
                const prevMsg = index > 0 ? store.messages[index - 1] : null;
                const hideAvatar =
                  msg.role === "assistant" && prevMsg?.role === "assistant";
                return (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isStreaming={
                      store.isStreaming &&
                      index === store.messages.length - 1 &&
                      msg.role === "assistant"
                    }
                    isLast={index === store.messages.length - 1}
                    hideAvatar={hideAvatar}
                    onCopy={(content) =>
                      navigator.clipboard.writeText(content).catch(() => {})
                    }
                    onRegenerate={() => {}}
                    onContinue={() => {}}
                    onFeedback={() => {}}
                    onSwipeQuote={() => {}}
                    onDisclaimer={() => {}}
                    onCardClick={(att: CardAttachment) =>
                      store.setSelectedCard(att)
                    }
                    onCardDoubleClick={() => {}}
                  />
                );
              })}

              {/* Typing indicator */}
              {store.isStreaming && isLastMessageUser && store.agentSteps.length === 0 && (
                <TypingIndicator />
              )}

              {/* Agent progress */}
              {store.agentSteps.length > 0 && (
                <div className="ml-7">
                  <AgentProgressCard
                    steps={store.agentSteps}
                    isActive={store.isStreaming}
                  />
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ---- Input Area ---- */}
      <div className="border-t border-border px-3 py-2 shrink-0">
        <div className="flex items-end gap-2">
          {/* Upload button */}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            aria-label="上传文件"
          >
            <Upload className="size-4 text-muted-foreground" strokeWidth={2} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
          />

          {/* Textarea */}
          <Textarea
            value={store.inputValue}
            onChange={(e) => store.setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题..."
            rows={1}
            className="min-h-[36px] max-h-[80px] resize-none text-[13px] leading-[18px] flex-1"
            aria-label="聊天输入框"
          />

          {/* Send / Stop button */}
          {store.isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              className="size-8 shrink-0"
              onClick={stopGeneration}
              aria-label="停止生成"
            >
              <Square className="size-3.5" strokeWidth={2.5} />
            </Button>
          ) : (
            <Button
              size="icon"
              className="size-8 shrink-0"
              onClick={handleSend}
              disabled={!store.inputValue.trim()}
              aria-label="发送消息"
            >
              <Send className="size-4" strokeWidth={2} />
            </Button>
          )}
        </div>

        <p className="text-[11px] leading-[16px] text-muted-foreground text-center mt-1.5">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}
