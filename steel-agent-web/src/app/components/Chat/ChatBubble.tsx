"use client";

import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage } from "@/app/types/chat";
import { Sparkles, User, Copy, RefreshCw, ThumbsUp, ThumbsDown, Pencil, Trash2 } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

const MemoMarkdownContent = React.memo(MarkdownContent, (prev, next) => prev.content === next.content);

type EmptyStateType = "no-results" | "out-of-scope" | "need-more-info" | "ai-uncertain";

interface EmptyStateTemplateProps {
  type: EmptyStateType;
}

export function EmptyStateTemplate({ type }: EmptyStateTemplateProps) {
  const templates = {
    "no-results": {
      eyebrow: "无搜索结果",
      title: "未找到相关招标信息",
      subtitle: "尝试更换关键词或扩大地区范围",
    },
    "out-of-scope": {
      eyebrow: "超出能力",
      title: "暂不支持期货行情查询",
      subtitle: "您可以查询螺纹钢、热卷等现货价格",
    },
    "need-more-info": {
      eyebrow: "需要补充信息",
      title: "请告诉我具体的规格与地区",
      subtitle: "例如：HRB400E 20mm，上海",
    },
    "ai-uncertain": {
      eyebrow: "AI 不确定",
      title: "该信息未找到权威来源",
      subtitle: "建议联系行业分析师确认",
    },
  };

  const template = templates[type];
  return (
    <div className="rounded-2xl border border-steel-line bg-steel-canvas px-4 py-4">
      <div className="text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted mb-1">
        {template.eyebrow}
      </div>
      <p className="text-[14px] leading-[1.5] text-steel-ink mb-1">
        {template.title}
      </p>
      <p className="text-[12px] leading-[1.5] text-steel-muted">
        {template.subtitle}
      </p>
    </div>
  );
}

function StreamCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1.2em] bg-steel-ink ml-0.5 align-middle animate-caret-blink"
      aria-hidden="true"
    />
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[85%] md:max-w-[640px] xl:max-w-[720px] animate-splash-in" aria-label="AI 正在思考中" aria-live="polite">
      <div className="relative size-7 shrink-0">
        <Avatar className="size-7 border border-steel-line bg-steel-canvas">
          <AvatarFallback className="bg-steel-canvas">
            <Sparkles className="size-3.5 text-steel-ink" strokeWidth={1.75} aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-steel-surface border border-steel-line px-4 py-3 flex gap-[6px] items-center min-h-[44px]">
        <span className="size-[1.5px] rounded-full bg-steel-placeholder animate-pulse" />
        <span className="size-[1.5px] rounded-full bg-steel-placeholder animate-pulse" style={{ animationDelay: "120ms" }} />
        <span className="size-[1.5px] rounded-full bg-steel-placeholder animate-pulse" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}

interface AIBubbleProps {
  children: React.ReactNode;
  isError?: boolean;
  hideAvatar?: boolean;
  ariaLive?: "polite" | "off" | "assertive";
}

export function AIBubble({
  children,
  isError = false,
  hideAvatar = false,
  ariaLive,
}: AIBubbleProps) {
  return (
    <div className="flex gap-3 max-w-[85%] md:max-w-[640px] xl:max-w-[720px] animate-splash-in">
      {hideAvatar ? (
        <div className="size-7 shrink-0" aria-hidden="true" />
      ) : (
        <div className="relative size-7 shrink-0">
          <Avatar className="size-7 border border-steel-line bg-steel-canvas">
            <AvatarFallback className="bg-steel-canvas">
              <Sparkles
                className="size-3.5 text-steel-ink"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-px -right-px size-[6px] rounded-full bg-steel-up border border-steel-canvas" aria-hidden="true" />
        </div>
      )}
      <div
        aria-live={ariaLive}
        role={isError ? "alert" : undefined}
        className={cn(
          "rounded-2xl rounded-tl-sm px-4 py-3.5 text-[15px] leading-[1.6] text-steel-body",
          isError
            ? "bg-rose-50 border border-rose-200"
            : "bg-steel-surface border border-steel-line"
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface UserBubbleProps {
  children: React.ReactNode;
  quotedContent?: string;
}

export function UserBubble({ children, quotedContent }: UserBubbleProps) {
  return (
    <div className="flex gap-3 max-w-[85%] md:max-w-[640px] xl:max-w-[720px] ml-auto flex-row-reverse animate-splash-in">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-steel-ink text-steel-canvas">
          <User className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        </AvatarFallback>
      </Avatar>
      <div>
        {quotedContent && (
          <div className="mb-1 rounded-lg border-l-2 border-steel-line bg-steel-surface px-3 py-1.5 text-[12px] leading-[1.5] text-steel-muted">
            {quotedContent}
          </div>
        )}
        <div className="rounded-2xl rounded-tr-sm bg-steel-ink text-steel-canvas px-4 py-3 text-[15px] leading-[1.6]">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ErrorBubbleProps {
  content: string;
  onRegenerate?: () => void;
}

export function ErrorBubble({ content, onRegenerate }: ErrorBubbleProps) {
  return (
    <div className="flex gap-3 max-w-[85%] md:max-w-[640px] xl:max-w-[720px] animate-splash-in" role="alert">
      <div className="size-7 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <div className="rounded-2xl rounded-tl-sm bg-rose-50 border border-rose-200 px-4 py-3.5 text-[15px] leading-[1.6] text-steel-body">
          {content}
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            aria-label="重试"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-steel-line px-3 py-1 text-[13px] text-steel-body hover:border-steel-ink transition-colors duration-150"
          >
            重试
          </button>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLast?: boolean;
  hideAvatar?: boolean;
  onCopy?: (content: string) => void;
  onRegenerate?: () => void;
  onContinue?: () => void;
  onFeedback?: (isHelpful: boolean) => void;
  onEdit?: (content: string) => void;
  onDelete?: (messageId: number) => void;
  onSwipeQuote?: () => void;
}

export const ChatBubble = React.memo(function ChatBubble({
  message,
  isStreaming = false,
  hideAvatar = false,
  onCopy,
  onRegenerate,
  onContinue,
  onFeedback,
  onEdit,
  onDelete,
  onSwipeQuote,
}: ChatBubbleProps) {
  const [showActions, setShowActions] = React.useState(false);

  const content = message.content || "";
  const isUser = message.role === "user";
  const isAssistant = !isUser;

  // 1. Stop marker detection
  const stopMarker = "_已停止生成_";
  const hasStop = content.includes(stopMarker);
  const displayContent = hasStop ? content.split(stopMarker)[0].trim().replace(/\n+$/, "") : content;

  // 2. Source citation parsing
  const sourceMatch = displayContent.match(/\n来源[：:]\s*(.+?)$/m);
  const sourceCitation = sourceMatch ? sourceMatch[1] : null;
  const mainContent = sourceCitation ? displayContent.replace(/\n来源[：:]\s*.+$/m, "").trim() : displayContent;

  // 3. Error keyword detection (for assistant messages)
  const errorKeywords = ["查询失败", "查询异常", "请求失败", "服务不可用", "网络异常", "请求超时"];
  const isError = isAssistant && errorKeywords.some(kw => content.startsWith(kw));

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowActions(true);
  };

  if (isUser) {
    return (
      <div
        className="group relative"
        onContextMenu={handleContextMenu}
      >
        <UserBubble>{content}</UserBubble>
        <div
          aria-label="用户消息操作"
          className="absolute bottom-2 right-2 z-10 flex items-center gap-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
        >
          {onCopy && (
            <button onClick={() => onCopy(content)} aria-label="复制" className="size-7 flex items-center justify-center rounded-full border border-steel-line bg-steel-canvas hover:border-steel-ink">
              <Copy className="size-3.5" strokeWidth={1.75} />
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit(content)} aria-label="编辑" className="size-7 flex items-center justify-center rounded-full border border-steel-line bg-steel-canvas hover:border-steel-ink">
              <Pencil className="size-3.5" strokeWidth={1.75} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(message.id)} aria-label="删除" className="size-7 flex items-center justify-center rounded-full border border-steel-line bg-steel-canvas hover:border-rose-200">
              <Trash2 className="size-3.5" strokeWidth={1.75} />
            </button>
          )}
        </div>
        {showActions && isUser && (
          <div className="absolute bottom-full right-0 mb-1 rounded-xl border border-steel-line bg-steel-canvas px-1 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] z-10 flex flex-col">
            {onCopy && <button onClick={() => { onCopy(content); setShowActions(false); }} className="px-3 py-1.5 text-[13px] text-steel-body hover:bg-steel-surface rounded-lg text-left">复制</button>}
            {onEdit && <button onClick={() => { onEdit(content); setShowActions(false); }} className="px-3 py-1.5 text-[13px] text-steel-body hover:bg-steel-surface rounded-lg text-left">编辑</button>}
            {onDelete && <button onClick={() => { onDelete(message.id); setShowActions(false); }} className="px-3 py-1.5 text-[13px] text-down hover:bg-steel-surface rounded-lg text-left">删除</button>}
          </div>
        )}
        {showActions && (
          <div className="fixed inset-0 z-0" onClick={() => setShowActions(false)} />
        )}
      </div>
    );
  }

  return (
    <div
      className="group relative"
      onContextMenu={handleContextMenu}
    >
      <AIBubble hideAvatar={hideAvatar} isError={isError} ariaLive={isStreaming ? "polite" : undefined}>
        <MemoMarkdownContent content={mainContent} />
        {sourceCitation && (
          <div className="mt-1.5 text-[12px] leading-[1.5] text-steel-muted">
            来源：{sourceCitation}
          </div>
        )}
        {isStreaming && <StreamCursor />}
      </AIBubble>
      {hasStop && (
        <div className="flex items-center gap-2 mt-1.5 ml-[calc(1.75rem+12px)]">
          <span className="text-[12px] leading-[1.5] text-steel-muted">已停止生成</span>
          {onContinue && (
            <button
              onClick={onContinue}
              className="text-[13px] text-steel-ink underline underline-offset-2 hover:text-steel-body"
            >
              继续
            </button>
          )}
        </div>
      )}
      {isError && onRegenerate && (
        <div className="mt-1.5 ml-[calc(1.75rem+12px)]">
          <button
            onClick={onRegenerate}
            aria-label="重试"
            className="inline-flex items-center gap-1.5 rounded-full border border-steel-line px-3 py-1 text-[13px] text-steel-body hover:border-steel-ink transition-colors duration-150"
          >
            重试
          </button>
        </div>
      )}
      {isAssistant && (
        <div
          aria-label="AI 消息操作"
          className="absolute bottom-2 right-2 z-10 flex items-center gap-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
        >
          {onCopy && (
            <button onClick={() => onCopy(content)} aria-label="复制" className="size-7 flex items-center justify-center rounded-full border border-steel-line bg-steel-canvas hover:border-steel-ink">
              <Copy className="size-3.5" strokeWidth={1.75} />
            </button>
          )}
          {onRegenerate && (
            <button onClick={onRegenerate} aria-label="重新生成" className="size-7 flex items-center justify-center rounded-full border border-steel-line bg-steel-canvas hover:border-steel-ink">
              <RefreshCw className="size-3.5" strokeWidth={1.75} />
            </button>
          )}
          {onFeedback && (
            <>
              <button onClick={() => onFeedback(true)} aria-label="有帮助" className="size-7 flex items-center justify-center rounded-full border border-steel-line bg-steel-canvas hover:border-steel-up">
                <ThumbsUp className="size-3.5" strokeWidth={1.75} />
              </button>
              <button onClick={() => onFeedback(false)} aria-label="不准确" className="size-7 flex items-center justify-center rounded-full border border-steel-line bg-steel-canvas hover:border-rose-200">
                <ThumbsDown className="size-3.5" strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>
      )}
      {showActions && isAssistant && (
        <div className="absolute bottom-full right-0 mb-1 rounded-xl border border-steel-line bg-steel-canvas px-1 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] z-10 flex flex-col">
          {onCopy && <button onClick={() => { onCopy(content); setShowActions(false); }} className="px-3 py-1.5 text-[13px] text-steel-body hover:bg-steel-surface rounded-lg text-left">复制</button>}
          {onRegenerate && <button onClick={() => { onRegenerate(); setShowActions(false); }} className="px-3 py-1.5 text-[13px] text-steel-body hover:bg-steel-surface rounded-lg text-left">重新生成</button>}
          {onFeedback && <button onClick={() => { onFeedback(true); setShowActions(false); }} className="px-3 py-1.5 text-[13px] text-steel-body hover:bg-steel-surface rounded-lg text-left">有帮助</button>}
          {onFeedback && <button onClick={() => { onFeedback(false); setShowActions(false); }} className="px-3 py-1.5 text-[13px] text-steel-body hover:bg-steel-surface rounded-lg text-left">不准确</button>}
        </div>
      )}
      {showActions && (
        <div className="fixed inset-0 z-0" onClick={() => setShowActions(false)} />
      )}
    </div>
  );
});

export default ChatBubble;
