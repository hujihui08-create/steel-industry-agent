// ============================================================
// CommandPalette · ⌘K / Ctrl+K 命令面板
// 搜索快捷指令与页面跳转的模态对话框
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  DollarSign,
  Calculator,
  FileText,
  TrendingUp,
  Bell,
  User,
  Settings,
  BellOff,
  Keyboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DEFAULT_QUICK_COMMANDS, type QuickCommand } from "@/app/types/chat";
import { ROUTE } from "@/app/constants/auth";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface CommandPaletteProps {
  /** Whether the palette dialog is open. */
  open: boolean;
  /** Called to change the open state. */
  onOpenChange: (open: boolean) => void;
  /** Called when a quick command is selected, with the command text. */
  onSelectCommand?: (command: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

// ------------------------------------------------------------------
// Navigation items (页面跳转)
// ------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "个人中心", icon: User, path: ROUTE.PROFILE },
  { id: "messages", label: "消息中心", icon: Bell, path: ROUTE.MESSAGES },
  { id: "settings", label: "设置", icon: Settings, path: ROUTE.SETTINGS },
  {
    id: "quotations",
    label: "我的报价单",
    icon: FileText,
    path: ROUTE.QUOTATIONS,
  },
  { id: "alerts", label: "价格预警", icon: BellOff, path: ROUTE.ALERTS },
];

// ------------------------------------------------------------------
// Quick command icon map (matches ChatInput pattern)
// ------------------------------------------------------------------

const QUICK_ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  Calculator,
  FileText,
  TrendingUp,
  Bell,
};

function getQuickIcon(iconName: string): LucideIcon | null {
  return QUICK_ICON_MAP[iconName.trim()] ?? null;
}

// ==================================================================
// CommandPalette
// ==================================================================

export function CommandPalette({
  open,
  onOpenChange,
  onSelectCommand,
}: CommandPaletteProps) {
  const navigate = useNavigate();

  // ---- Global keyboard shortcut ------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ⌘K (Mac) or Ctrl+K (Windows) — toggle open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      // Escape when open — the Dialog handles this natively via
      // Radix, but we also handle here for robustness.
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // ---- Handlers ----------------------------------------------

  const handleSelectQuickCommand = useCallback(
    (cmd: QuickCommand) => {
      onOpenChange(false);
      onSelectCommand?.(cmd.prompt);
    },
    [onOpenChange, onSelectCommand],
  );

  const handleSelectNav = useCallback(
    (item: NavItem) => {
      onOpenChange(false);
      navigate(item.path);
    },
    [onOpenChange, navigate],
  );

  // ---- Render ------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 gap-0",
          "bg-steel-canvas border border-steel-line rounded-2xl",
          "shadow-none",
          "max-w-[480px]",
        )}
      >
        {/* sr-only header for a11y */}
        <DialogHeader className="sr-only">
          <DialogTitle>命令面板</DialogTitle>
          <DialogDescription>
            搜索快捷指令或页面，使用 ⌘K 打开
          </DialogDescription>
        </DialogHeader>

        <Command
          className={cn(
            // Remove border from the input wrapper
            "[&_[data-slot=command-input-wrapper]]:border-0",
            // Group heading styling (11px · tracking-wider · uppercase)
            "[&_[cmdk-group-heading]]:px-3",
            "[&_[cmdk-group-heading]]:pt-3",
            "[&_[cmdk-group-heading]]:pb-1.5",
            "[&_[cmdk-group-heading]]:text-[11px]",
            "[&_[cmdk-group-heading]]:font-medium",
            "[&_[cmdk-group-heading]]:tracking-[0.18em]",
            "[&_[cmdk-group-heading]]:uppercase",
            "[&_[cmdk-group-heading]]:text-steel-muted",
            // Item styling
            "[&_[cmdk-item]]:px-3",
            "[&_[cmdk-item]]:py-2.5",
            "[&_[cmdk-item]_svg]:size-4",
            "[&_[cmdk-item]_svg]:shrink-0",
          )}
        >
          <CommandInput
            placeholder="搜索快捷指令或页面..."
            className="text-[15px] placeholder:text-steel-placeholder"
          />

          <CommandList className="max-h-[320px]">
            <CommandEmpty className="text-[13px] text-steel-muted">
              未找到匹配的命令
            </CommandEmpty>

            {/* ---- Group 1: 快捷指令 ---- */}
            <CommandGroup heading="快捷指令">
              {DEFAULT_QUICK_COMMANDS.map((cmd) => {
                const Icon = getQuickIcon(cmd.icon);
                return (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => handleSelectQuickCommand(cmd)}
                    className="text-[15px] text-steel-ink data-[selected=true]:bg-steel-surface rounded-lg mx-1"
                  >
                    {Icon && (
                      <Icon
                        className="h-4 w-4 text-steel-muted"
                        strokeWidth={1.75}
                      />
                    )}
                    <span>{cmd.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* ---- Group 2: 页面跳转 ---- */}
            <CommandGroup heading="页面跳转">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => handleSelectNav(item)}
                    className="text-[15px] text-steel-ink data-[selected=true]:bg-steel-surface rounded-lg mx-1"
                  >
                    <Icon
                      className="h-4 w-4 text-steel-muted"
                      strokeWidth={1.75}
                    />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {/* ---- Group 3: 键盘快捷键 ---- */}
            <CommandGroup heading="键盘快捷键">
              {[
                { keys: "\u2318K", desc: "打开命令面板" },
                { keys: "\u2318\u21A9", desc: "发送消息" },
                { keys: "\u2318\u21E7N", desc: "新建会话" },
                { keys: "\u2318/", desc: "聚焦输入框" },
                { keys: "Esc", desc: "中断生成 / 关闭抽屉" },
                { keys: "\u2318\\", desc: "折叠 / 展开侧栏" },
                { keys: "\u2191", desc: "编辑上一条消息" },
              ].map((shortcut) => (
                <CommandItem
                  key={shortcut.keys}
                  value={shortcut.keys + " " + shortcut.desc}
                  onSelect={() => {}}
                  className="text-[15px] text-steel-ink data-[selected=true]:bg-steel-surface rounded-lg mx-1 cursor-default"
                >
                  <Keyboard
                    className="h-4 w-4 text-steel-muted shrink-0"
                    strokeWidth={1.75}
                  />
                  <span className="flex-1 text-steel-body font-mono text-[11px]">
                    {shortcut.keys}
                  </span>
                  <span className="text-[13px] text-steel-muted">
                    {shortcut.desc}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
