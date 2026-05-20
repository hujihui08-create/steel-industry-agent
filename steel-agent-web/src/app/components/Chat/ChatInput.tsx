// ============================================================
// ChatInput / Composer 组件
// 输入栏 + 快捷指令 + 自动增高 textarea
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色
// ============================================================

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  KeyboardEvent,
  ChangeEvent,
  DragEvent as ReactDragEvent,
} from "react";
import {
  ArrowUp,
  Mic,
  Plus,
  Square,
  X,
  Upload,
  Paperclip,
  Image,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/app/stores/chatStore";
import { useVoiceInput } from "@/app/hooks/useVoiceInput";
import { DEFAULT_QUICK_COMMANDS, type QuickCommand } from "@/app/types/chat";
import type { ChatMessage } from "@/app/types/chat";

// ------------------------------------------------------------------
// Props
// ------------------------------------------------------------------
export interface ChatInputProps {
  /** 发送消息回调（content + 可选文件列表） */
  onSend: (content: string, files?: File[]) => void;
  /** AI 是否正在流式输出 */
  isStreaming: boolean;
  /** 停止生成回调 */
  onStop: () => void;
  /** 受控输入值 */
  value: string;
  /** 受控 onChange */
  onChange: (value: string) => void;
  /** 上一条用户消息（用于 ↑ 编辑） */
  lastUserMessage?: string;
}

// ------------------------------------------------------------------
// 文件附件相关常量
// ------------------------------------------------------------------

/** 允许上传的文件类型 */
const ACCEPTED_FILE_TYPES = "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** 单文件最大 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 最大附件数 */
const MAX_ATTACHMENTS = 4;

// ------------------------------------------------------------------
// 常量
// ------------------------------------------------------------------

/** 最大可见行数 */
const MAX_ROWS = 4;

/** 单行高度（15px × 1.6 行高 ≈ 24px） */
const LINE_HEIGHT = 24;

/** textarea 最小高度（含 py-1.5 的 12px） */
const MIN_TEXTAREA_HEIGHT = LINE_HEIGHT + 12;

/** textarea 最大高度 */
const MAX_TEXTAREA_HEIGHT = MAX_ROWS * LINE_HEIGHT + 12;

// ------------------------------------------------------------------
// 辅助函数
// ------------------------------------------------------------------

// ==================================================================
// ChatInput
// ==================================================================
export function ChatInput({
  onSend,
  isStreaming,
  onStop,
  value,
  onChange,
  lastUserMessage,
}: ChatInputProps) {
  // ---- refs ------------------------------------------------
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el && el.offsetParent !== null) {
      textareaRef.current = el;
    } else if (!el) {
      textareaRef.current = null;
    }
  }, []);

  // ---- local state -----------------------------------------
  const [isFocused, setIsFocused] = useState(false);

  // ---- store -----------------------------------------------
  const activeQuickCommand = useChatStore((s) => s.activeQuickCommand);
  const setActiveQuickCommand = useChatStore((s) => s.setActiveQuickCommand);
  const focusInputTrigger = useChatStore((s) => s.focusInputTrigger);
  const triggerFocusInput = useChatStore((s) => s.triggerFocusInput);

  // ---- focus input trigger (⌘/ keyboard shortcut) -----------
  useEffect(() => {
    if (focusInputTrigger > 0 && textareaRef.current) {
      textareaRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusInputTrigger]);

  // ---- voice input -----------------------------------------
  const voice = useVoiceInput();

  // 监听中：实时同步 interim 结果到输入框
  useEffect(() => {
    if (voice.isListening && voice.transcript) {
      onChange(voice.transcript);
    }
  }, [voice.isListening, voice.transcript, onChange]);

  // 停止监听后：将最终 transcript 写入输入框并自动发送
  const prevListeningRef = useRef(voice.isListening);
  useEffect(() => {
    const wasListening = prevListeningRef.current;
    prevListeningRef.current = voice.isListening;
    if (wasListening && !voice.isListening && voice.transcript.trim()) {
      const text = voice.transcript.trim();
      onChange(text);
      voice.resetTranscript();
      onSend(text);
    }
  }, [voice.isListening, voice.transcript, onChange, onSend, voice]);

  // 错误处理
  useEffect(() => {
    if (voice.error) {
      toast.error(voice.error);
      voice.resetTranscript();
    }
  }, [voice.error, voice]);

  // ---- file attachment ------------------------------------
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    { file: File; previewUrl: string }[]
  >([]);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ---- drag-and-drop ------------------------------------
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      const selectedFiles = Array.from(fileList ?? []);
      if (attachedFiles.length + selectedFiles.length > MAX_ATTACHMENTS) {
        toast.error(`最多只能上传 ${MAX_ATTACHMENTS} 个文件`);
        return;
      }

      const validFiles = selectedFiles.filter((f) => {
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`${f.name} 超过 10MB 限制`);
          return false;
        }
        return true;
      });

      const newFiles = validFiles.map((f) => ({
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));

      setAttachedFiles((prev) => [...prev, ...newFiles]);
    },
    [attachedFiles.length],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      e.target.value = "";
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer?.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: ReactDragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: ReactDragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      if (isStreaming) return;
      processFiles(e.dataTransfer?.files ?? null);
    },
    [isStreaming, processFiles],
  );

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  useEffect(() => {
    return () => {
      attachedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- auto-grow helper ------------------------------------
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    // 重置高度以获取真实的 scrollHeight
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.max(MIN_TEXTAREA_HEIGHT, Math.min(scrollH, MAX_TEXTAREA_HEIGHT))}px`;
    // 禁用滚动条，始终隐藏滚动
    el.style.overflowY = "hidden";
  }, []);

  // ---- handlers -------------------------------------------

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      requestAnimationFrame(adjustHeight);
    },
    [onChange, adjustHeight],
  );

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && attachedFiles.length === 0) || isStreaming) return;
    onSend(trimmed, attachedFiles.map((f) => f.file));
    setAttachedFiles([]);
  }, [value, isStreaming, onSend, attachedFiles]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd+Enter or Ctrl+Enter → send
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
        return;
      }
      // Enter alone → send (not Shift+Enter)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
      // ArrowUp in empty input → edit last message
      if (e.key === "ArrowUp" && !value && !isStreaming) {
        e.preventDefault();
        const messages = useChatStore.getState().messages;
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
        if (lastUserMsg) {
          onChange(lastUserMsg.content);
        }
      }
    },
    [handleSend, value, isStreaming, onChange],
  );

  const handleQuickCommand = useCallback(
    (cmd: QuickCommand) => {
      if (isStreaming) return;
      setActiveQuickCommand(cmd.id);
      onChange(cmd.prompt);
      // 立即发送，不要延迟
      onSend(cmd.prompt);
      // 立即重置激活状态，给一个小的视觉反馈时间
      setTimeout(() => {
        setActiveQuickCommand(null);
      }, 200);
    },
    [setActiveQuickCommand, onChange, onSend, isStreaming],
  );

  // ---- Quick Command Pills (icon + text)
  const quickCommandPills = DEFAULT_QUICK_COMMANDS.map((cmd) => {
    const isActive = activeQuickCommand === cmd.id;

    return (
      <button
        key={cmd.id}
        type="button"
        onClick={() => handleQuickCommand(cmd)}
        className={cn(
          "flex items-center shrink-0 rounded-full border px-3 py-1.5",
          "text-[13px] leading-[1.5]",
          "transition-colors duration-150",
          isActive
            ? "bg-steel-ink text-steel-canvas border-transparent"
            : "border-steel-line text-steel-body hover:border-steel-ink hover:bg-transparent",
        )}
        aria-label={cmd.label}
      >
        <span>{cmd.label}</span>
      </button>
    );
  });

  // ---- file preview thumbnails ---------------------------

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const filePreviews =
    attachedFiles.length > 0 ? (
      <div className="flex gap-2 overflow-x-auto pb-2 px-4">
        {attachedFiles.map(({ file, previewUrl }, i) => (
          <div
            key={i}
            className="relative shrink-0 group"
          >
            {isImageFile(file) ? (
              <div className="w-14 h-14 rounded-md border border-steel-line overflow-hidden">
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-md border border-steel-line bg-steel-surface flex items-center justify-center">
                {file.type.includes("pdf") ? (
                  <FileText className="size-5 text-steel-muted" strokeWidth={1.75} />
                ) : file.type.includes("sheet") || file.name.endsWith(".csv") ? (
                  <FileText className="size-5 text-steel-muted" strokeWidth={1.75} />
                ) : (
                  <Paperclip className="size-5 text-steel-muted" strokeWidth={1.75} />
                )}
              </div>
            )}
            <span
              className="block w-14 text-[10px] leading-[1.3] text-steel-muted truncate mt-0.5 text-center"
              title={file.name}
            >
              {file.name.length > 8
                ? file.name.slice(0, 6) + ".."
                : file.name}
            </span>
            <button
              type="button"
              onClick={() => handleRemoveFile(i)}
              className={cn(
                "absolute -top-1.5 -right-1.5 size-4 rounded-full",
                "bg-steel-ink text-white",
                "flex items-center justify-center",
                "opacity-0 group-hover:opacity-100",
                "transition-opacity duration-150",
              )}
              aria-label={`移除 ${file.name}`}
            >
              <X className="size-2.5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    ) : null;

  // ---- render ----------------------------------------------

  const inputControls = (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAttachClick}
        disabled={isStreaming || attachedFiles.length >= MAX_ATTACHMENTS}
        className={cn(
          "size-8 rounded-full shrink-0",
          "text-steel-muted hover:bg-steel-surface hover:text-steel-body",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        )}
        aria-label={attachedFiles.length > 0 ? `已添加 ${attachedFiles.length} 个附件` : "添加附件"}
      >
        <Plus className="size-4" strokeWidth={1.75} />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      <textarea
        ref={setTextareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="询问钢材价格、报价、招标信息…"
        disabled={isStreaming}
        rows={1}
        aria-label="输入消息"
        className="flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-[15px] leading-[1.6] text-steel-ink placeholder:text-steel-placeholder outline-none"
        style={{
          minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
          maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
        }}
      />

      {voice.isSupported ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => voice.isListening ? voice.stopListening() : voice.startListening()}
          disabled={isStreaming}
          className={cn(
            "size-8 rounded-full shrink-0",
            voice.isListening ? "text-steel-down" : "text-steel-muted hover:bg-steel-surface hover:text-steel-body",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label={voice.isListening ? "停止语音输入" : "语音输入"}
        >
          <Mic className={cn("size-4", voice.isListening && "animate-pulse")} strokeWidth={1.75} />
        </Button>
      ) : null}

      {isStreaming ? (
        <Button size="icon" onClick={onStop} className="size-8 rounded-full bg-steel-ink hover:bg-steel-body text-steel-canvas shrink-0" aria-label="停止生成">
          <Square className="size-3.5" fill="currentColor" strokeWidth={0} />
        </Button>
      ) : (
        <Button size="icon" onClick={handleSend} disabled={!value.trim() && attachedFiles.length === 0} className="size-8 rounded-full bg-steel-ink hover:bg-steel-body text-steel-canvas shrink-0 disabled:opacity-30" aria-label="发送消息">
          <ArrowUp className="size-4" strokeWidth={2} />
        </Button>
      )}
    </>
  );

  const interruptBar = (
    <div className={cn(
      "flex items-center justify-between gap-3 px-3",
      "h-12",
      "bg-steel-surface rounded-2xl",
      "border border-steel-ink",
    )}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-2 rounded-full bg-steel-ink animate-pulse shrink-0" />
        <span className="text-[13px] leading-[1.5] text-steel-body truncate">
          AI 正在生成中…
        </span>
      </div>
      <button
        type="button"
        onClick={onStop}
        className={cn(
          "flex items-center gap-1.5 shrink-0",
          "rounded-full bg-steel-ink hover:bg-steel-body",
          "text-steel-canvas",
          "transition-colors duration-150",
          "h-9 px-4",
          "text-[13px] leading-[1.5]",
          "focus:outline-none focus:ring-4 focus:ring-steel-ink/10",
        )}
        aria-label="中断生成"
      >
        <Square className="size-3" fill="currentColor" strokeWidth={0} />
        <span className="hidden lg:inline">停止</span>
      </button>
    </div>
  );

  return (
    <div
      className="w-full relative"
      role="region"
      aria-label="消息输入区域"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ============================================================
          拖拽上传遮罩层
          ============================================================ */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-steel-ink bg-steel-canvas/90 flex flex-col items-center justify-center gap-2 pointer-events-none"
          aria-label="拖拽文件到此处上传"
        >
          <div className="size-12 rounded-full bg-steel-surface border border-steel-line flex items-center justify-center">
            <Upload className="size-5 text-steel-ink" strokeWidth={1.75} />
          </div>
          <span className="text-[15px] leading-[1.6] text-steel-ink font-medium">
            拖拽文件到此处上传
          </span>
          <span className="text-[12px] leading-[1.5] text-steel-muted">
            支持 PNG、JPEG、PDF、Excel、CSV，单文件 ≤10MB，最多 {MAX_ATTACHMENTS} 个
          </span>
        </div>
      )}

      {/* ============================================================
          移动端（< lg）
          快捷指令在输入栏正上方横向滚动
          ============================================================ */}
      <div className={cn(
        "overflow-hidden transition-all duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:hidden",
        isStreaming ? "max-h-0 opacity-0 scale-[0.97] translate-y-[12px] mb-0" : "max-h-[60px] opacity-100 scale-100 translate-y-0 mb-3"
      )}>
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-1 pb-1">
          {quickCommandPills}
        </div>
      </div>

      {filePreviews}

      {/* ============================================================
          移动端输入栏
          ============================================================ */}
      <div
        className={cn(
          "lg:hidden rounded-2xl border relative",
          "transition-[border-color,background-color] duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          !isStreaming && isFocused && "border-steel-ink ring-4 ring-steel-ink/5 bg-steel-canvas",
          !isStreaming && !isFocused && "border-steel-line bg-steel-canvas",
          isStreaming && "border-steel-ink bg-steel-surface",
        )}
      >
        <div className={cn(
          "flex items-end gap-2 p-2 pl-3",
          "transition-all duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isStreaming
            ? "opacity-0 scale-[0.98] absolute inset-0 pointer-events-none overflow-hidden"
            : "opacity-100 scale-100",
        )}>
          {inputControls}
        </div>
        <div className={cn(
          "transition-all duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isStreaming
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 absolute inset-0 pointer-events-none overflow-hidden",
        )}>
          {interruptBar}
        </div>
      </div>

      {/* ============================================================
          桌面端（≥ lg）
          Figma 设计: 统一圆角容器，快捷指令在顶部，输入栏在下方
          ============================================================ */}
      <div
        className={cn(
          "hidden lg:block rounded-2xl border overflow-hidden relative",
          "transition-[border-color,background-color] duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          !isStreaming && isFocused && "border-steel-ink ring-4 ring-steel-ink/5 bg-steel-canvas",
          !isStreaming && !isFocused && "border-steel-line bg-steel-canvas",
          isStreaming && "border-steel-ink bg-steel-surface",
        )}
      >
        <div className={cn(
          "overflow-hidden transition-all duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isStreaming ? "max-h-0 opacity-0 scale-[0.97] translate-y-[12px]" : "max-h-[60px] opacity-100 scale-100 translate-y-0"
        )}>
          <div className="flex gap-2 pt-2 pb-1 px-4">
            {quickCommandPills}
          </div>
        </div>

        {filePreviews}

        <div className={cn(
          "flex items-end gap-2 px-2 pb-2",
          "transition-all duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isStreaming
            ? "opacity-0 scale-[0.98] absolute inset-0 pointer-events-none overflow-hidden"
            : "opacity-100 scale-100",
        )}>
          {inputControls}
        </div>
        <div className={cn(
          "transition-all duration-[240ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          isStreaming
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1 absolute inset-0 pointer-events-none overflow-hidden",
        )}>
          {interruptBar}
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
