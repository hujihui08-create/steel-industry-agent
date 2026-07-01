import { useState, useEffect, useRef } from "react";
import { Section } from "./Section";
import {
  Menu,
  MoreHorizontal,
  Sparkles,
  ArrowUp,
  Plus,
  Mic,
  ArrowUpRight,
  StopCircle,
  Send,
} from "lucide-react";

type Message = {
  id: string;
  type: "user" | "ai" | "typing";
  content?: string;
  isTyping?: boolean;
  hasCard?: boolean;
};

const quickCommands = [
  { icon: "📊", label: "查价格" },
  { icon: "💰", label: "算报价" },
  { icon: "📚", label: "查知识" },
  { icon: "🎯", label: "看招标" },
];

const initialMessages: Message[] = [
  {
    id: "1",
    type: "ai",
    content: "您好，我是钢铁行业智能助手 👋",
  },
];

function ChatContent() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQuickCommands, setShowQuickCommands] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMessageId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        type: "user",
        content: inputValue,
      },
    ]);

    setInputValue("");
    setShowQuickCommands(false);
    setIsGenerating(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const typingMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: typingMessageId,
        type: "typing",
        isTyping: true,
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === typingMessageId
          ? {
              id: typingMessageId,
              type: "ai",
              content: "今日螺纹钢 HRB400E 20mm 主流价格：",
              hasCard: true,
            }
          : msg
      )
    );

    setIsGenerating(false);
    setShowQuickCommands(true);
  };

  const handleQuickCommand = (label: string) => {
    setInputValue(`给我${label}`);
  };

  const handleStop = () => {
    setIsGenerating(false);
    setShowQuickCommands(true);
    setMessages((prev) =>
      prev
        .filter((msg) => !msg.isTyping)
        .concat({
          id: Date.now().toString(),
          type: "ai",
          content: "已停止生成。",
        })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[380px] rounded-[36px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-[680px]">
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
          <button className="size-8 rounded-full hover:bg-muted flex items-center justify-center">
            <Menu className="size-4" strokeWidth={2} />
          </button>
          <div className="text-center">
            <div className="text-[14px] leading-[20px] text-foreground">钢铁助手</div>
            <div className="text-[10px] text-muted-foreground">AI · 实时在线</div>
          </div>
          <button className="size-8 rounded-full hover:bg-muted flex items-center justify-center">
            <MoreHorizontal className="size-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 bg-muted/50 flex-1 overflow-y-auto">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === "ai" && !message.isTyping && (
                <div className="flex gap-2 max-w-[88%]">
                  <div className="size-7 shrink-0 rounded-full border border-border bg-card flex items-center justify-center">
                    <Sparkles className="size-3.5" strokeWidth={2} />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="rounded-xl rounded-tl-sm bg-card border border-border/60 px-3.5 py-2.5 text-[13px] leading-[18px] text-foreground">
                      {message.content}
                    </div>
                    {message.hasCard && (
                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-border flex justify-between">
                          <span className="text-[12px] leading-[16px] tracking-wider uppercase text-muted-foreground">
                            Price
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            14:32
                          </span>
                        </div>
                        <div className="divide-y divide-border text-[13px] leading-[18px]">
                          {[
                            ["上海", "3,850", 12, 0.31],
                            ["北京", "3,780", 8, 0.21],
                            ["广州", "3,920", 15, 0.38],
                          ].map(([c, p, d, pc]) => (
                            <div
                              key={c as string}
                              className="px-4 py-2.5 flex justify-between"
                            >
                              <span className="text-foreground">{c}</span>
                              <span className="flex items-baseline gap-2">
                                <span className="tabular-nums text-foreground">
                                  ¥{p}
                                </span>
                                <span className="flex items-center text-success text-[12px] leading-[16px] tabular-nums">
                                  <ArrowUpRight className="size-3" />
                                  {d} ({pc}%)
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {message.hasCard && (
                      <div className="flex flex-wrap gap-1.5">
                        <button className="rounded-full border border-border bg-card px-3 py-1 text-[12px] leading-[16px] text-foreground">
                          查看走势图
                        </button>
                        <button className="rounded-full border border-border bg-card px-3 py-1 text-[12px] leading-[16px] text-foreground">
                          设置预警
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {message.type === "user" && (
                <div className="flex justify-end">
                  <div className="rounded-xl rounded-tr-sm bg-primary text-primary-foreground px-3.5 py-2.5 text-[13px] leading-[18px] max-w-[80%]">
                    {message.content}
                  </div>
                </div>
              )}

              {message.type === "typing" && message.isTyping && (
                <div className="flex gap-2 max-w-[88%]">
                  <div className="size-7 shrink-0 rounded-full border border-border bg-card flex items-center justify-center">
                    <Sparkles className="size-3.5" strokeWidth={2} />
                  </div>
                  <div className="rounded-xl rounded-tl-sm bg-card border border-border/60 px-3.5 py-2.5 flex gap-1.5 items-center">
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:120ms]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:240ms]" />
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 bg-card border-t border-border overflow-hidden">
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showQuickCommands ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-3 pt-3">
              <div className="flex gap-1.5 pb-2 overflow-x-auto no-scrollbar">
                {quickCommands.map((cmd, i) => (
                  <button
                    key={cmd.label}
                    onClick={() => handleQuickCommand(cmd.label)}
                    className={
                      "shrink-0 rounded-full px-3 py-1.5 text-[12px] leading-[16px] transition-all duration-150 " +
                      (i === 0
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:border-primary hover:bg-transparent")
                    }
                  >
                    {cmd.icon} {cmd.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-3 pb-5">
            {isGenerating ? (
              <div className="flex items-center gap-2 rounded-xl border border-border p-2 pl-3 bg-muted">
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:120ms]" />
                    <span className="size-1.5 rounded-full bg-muted-foreground animate-pulse [animation-delay:240ms]" />
                  </div>
                  <span className="text-[12px] leading-[16px] text-muted-foreground">
                    正在生成中...
                  </span>
                </div>
                <button
                  onClick={handleStop}
                  className="size-8 rounded-full bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <StopCircle className="size-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-1.5 rounded-xl border border-border p-1.5 pl-2.5 bg-card transition-all duration-150 hover:border-muted-foreground focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5">
                <button className="size-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                  <Plus className="size-3.5" strokeWidth={2} />
                </button>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息…"
                  rows={1}
                  className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 py-1 min-h-0 text-[13px] leading-[18px] text-foreground placeholder:text-muted-foreground max-h-24"
                  style={{ height: "auto", minHeight: "28px" }}
                />
                <button className="size-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
                  <Mic className="size-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`size-7 rounded-full flex items-center justify-center transition-all duration-150 ${
                    inputValue.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {inputValue.trim() ? (
                    <ArrowUp className="size-3.5" strokeWidth={2} />
                  ) : (
                    <Send className="size-3.5" strokeWidth={2} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InteractiveChat() {
  return (
    <Section
      id="07"
      title="交互式对话"
      desc="带有动画效果的完整对话体验：点击发送后快捷指令隐藏，AI生成过程显示正在输入状态，生成完成后快捷指令重新显示。"
    >
      <ChatContent />
    </Section>
  );
}
