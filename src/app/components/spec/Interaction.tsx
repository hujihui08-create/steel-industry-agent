import { Section, Block } from "./Section";
import {
  Hand,
  Copy,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Square,
  AlertTriangle,
  WifiOff,
  CheckCircle2,
} from "lucide-react";

function StateRow({
  name,
  cls,
  label,
}: {
  name: string;
  cls: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 text-[12px] leading-[16px] text-muted-foreground font-mono">{name}</div>
      <button className={cls}>{label}</button>
    </div>
  );
}

function MessageActions() {
  return (
    <div className="flex gap-1 rounded-full border border-border bg-card p-1 w-fit">
      {[Copy, RotateCw, ThumbsUp, ThumbsDown].map((Icon, i) => (
        <button
          key={i}
          className="size-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

function StreamingControl() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 w-fit">
        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[12px] leading-[16px] text-foreground">AI 正在生成回复</span>
        <button className="ml-1 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Square className="size-2.5 fill-current" strokeWidth={0} />
        </button>
      </div>
      <div className="text-[12px] leading-[16px] text-muted-foreground">
        点击方块按钮可<span className="text-foreground">中断生成</span>，已输出的内容保留
      </div>
    </div>
  );
}

export function Interaction() {
  return (
    <Section
      id="08"
      title="交互规则"
      desc="交互行为统一定义：状态、手势、消息操作、可中断生成、错误恢复。所有可点击区域最小命中尺寸 ≥ 36×36，移动端 ≥ 44×44。"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* States */}
        <Block label="按钮状态 / States">
          <div className="space-y-3">
            <StateRow
              name="default"
              label="发送"
              cls="rounded-full bg-primary text-primary-foreground px-5 py-2 text-[13px] leading-[18px]"
            />
            <StateRow
              name="hover"
              label="发送"
              cls="rounded-full bg-primary/90 text-primary-foreground px-5 py-2 text-[13px] leading-[18px]"
            />
            <StateRow
              name="active"
              label="发送"
              cls="rounded-full bg-primary text-primary-foreground px-5 py-2 text-[13px] leading-[18px] scale-[0.97]"
            />
            <StateRow
              name="focus"
              label="发送"
              cls="rounded-full bg-primary text-primary-foreground px-5 py-2 text-[13px] leading-[18px] ring-4 ring-primary/15"
            />
            <StateRow
              name="loading"
              label="发送中…"
              cls="rounded-full bg-primary text-primary-foreground px-5 py-2 text-[13px] leading-[18px] opacity-80"
            />
            <StateRow
              name="disabled"
              label="发送"
              cls="rounded-full bg-muted text-muted-foreground px-5 py-2 text-[13px] leading-[18px]"
            />
          </div>
          <div className="mt-4 text-[12px] leading-[16px] text-muted-foreground">
            键盘可访问：所有交互组件须支持 Tab 聚焦与可见 focus ring（4px / 透明度 5%-15%）
          </div>
        </Block>

        {/* Hit area */}
        <Block label="命中区域 / Hit Area">
          <div className="flex items-end gap-6">
            <div className="text-center">
              <div className="relative size-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[12px] leading-[16px]">
                ✓
                <div className="absolute inset-[-6px] rounded-full border border-dashed border-success" />
              </div>
              <div className="mt-2 text-[12px] leading-[16px] text-muted-foreground">移动端 ≥ 44px</div>
            </div>
            <div className="text-center">
              <div className="relative size-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[12px] leading-[16px]">
                ✓
                <div className="absolute inset-[-4px] rounded-full border border-dashed border-success" />
              </div>
              <div className="mt-2 text-[12px] leading-[16px] text-muted-foreground">桌面端 ≥ 36px</div>
            </div>
            <div className="text-center">
              <div className="relative size-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px]">
                ✗
                <div className="absolute inset-[-2px] rounded-full border border-dashed border-destructive" />
              </div>
              <div className="mt-2 text-[12px] leading-[16px] text-destructive">不允许 &lt; 24px</div>
            </div>
          </div>
        </Block>

        {/* Gestures */}
        <Block label="手势 / Gestures">
          <div className="space-y-3 text-[13px] leading-[18px]">
            {[
              ["长按消息", "弹出操作菜单（复制 / 重新生成 / 点赞 / 引用）", Hand],
              ["左滑消息", "快捷引用为下一条用户输入", Hand],
              ["下拉会话顶部", "刷新数据，触发 stream 回填", RotateCw],
              ["双击数据卡片", "放大查看（如走势图全屏）", Hand],
            ].map(([title, desc, Icon]: any) => (
              <div key={title} className="flex gap-2 items-start">
                <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="size-3.5 text-foreground" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-foreground">{title}</div>
                  <div className="text-[12px] leading-[16px] text-muted-foreground mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Block>

        {/* Message actions */}
        <Block label="消息操作 / Message Actions">
          <div className="space-y-4">
            <MessageActions />
            <div className="text-[12px] leading-[16px] text-muted-foreground leading-relaxed">
              悬停 AI 回复出现操作条，包含：复制、重新生成、点赞、点踩。
              用户消息仅显示：复制、编辑后重发。
            </div>
          </div>
        </Block>

        {/* Stoppable */}
        <Block label="可中断生成 / Interruptible">
          <StreamingControl />
        </Block>

        {/* Error recovery */}
        <Block label="错误与恢复 / Error">
          <div className="space-y-3">
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="size-4 mt-0.5 text-destructive shrink-0" strokeWidth={2} />
                <div className="flex-1">
                  <div className="text-[13px] leading-[18px] text-destructive">生成失败，请稍后重试</div>
                  <div className="text-[12px] leading-[16px] text-destructive/80 mt-0.5">code: TIMEOUT_504</div>
                </div>
                <button className="text-[12px] leading-[16px] text-destructive underline">重试</button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted px-4 py-3 flex gap-2 items-center">
              <WifiOff className="size-4 text-muted-foreground" strokeWidth={2} />
              <div className="flex-1 text-[13px] leading-[18px] text-foreground">网络已断开，已切换离线模式</div>
              <button className="text-[12px] leading-[16px] text-foreground">重连</button>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/10 px-4 py-3 flex gap-2 items-center">
              <CheckCircle2 className="size-4 text-success" strokeWidth={2} />
              <div className="flex-1 text-[13px] leading-[18px] text-success">已为您保存到收藏</div>
            </div>
          </div>
        </Block>
      </div>
    </Section>
  );
}
