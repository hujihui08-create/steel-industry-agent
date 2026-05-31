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
      <div className="w-20 text-[11px] text-neutral-500 font-mono">{name}</div>
      <button className={cls}>{label}</button>
    </div>
  );
}

function MessageActions() {
  return (
    <div className="flex gap-1 rounded-full border border-neutral-200 bg-white p-1 w-fit">
      {[Copy, RotateCw, ThumbsUp, ThumbsDown].map((Icon, i) => (
        <button
          key={i}
          className="size-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500"
        >
          <Icon className="size-3.5" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

function StreamingControl() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 w-fit">
        <span className="size-1.5 rounded-full bg-neutral-900 animate-pulse" />
        <span className="text-[12px] text-neutral-700">AI 正在生成回复</span>
        <button className="ml-1 size-5 rounded-full bg-neutral-900 text-white flex items-center justify-center">
          <Square className="size-2.5 fill-white" strokeWidth={0} />
        </button>
      </div>
      <div className="text-[11px] text-neutral-400">
        点击方块按钮可<span className="text-neutral-700">中断生成</span>，已输出的内容保留
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
              cls="rounded-full bg-neutral-900 text-white px-5 py-2 text-[13px]"
            />
            <StateRow
              name="hover"
              label="发送"
              cls="rounded-full bg-neutral-800 text-white px-5 py-2 text-[13px]"
            />
            <StateRow
              name="active"
              label="发送"
              cls="rounded-full bg-neutral-900 text-white px-5 py-2 text-[13px] scale-[0.97]"
            />
            <StateRow
              name="focus"
              label="发送"
              cls="rounded-full bg-neutral-900 text-white px-5 py-2 text-[13px] ring-4 ring-neutral-900/15"
            />
            <StateRow
              name="loading"
              label="发送中…"
              cls="rounded-full bg-neutral-900 text-white px-5 py-2 text-[13px] opacity-80"
            />
            <StateRow
              name="disabled"
              label="发送"
              cls="rounded-full bg-neutral-100 text-neutral-400 px-5 py-2 text-[13px]"
            />
          </div>
          <div className="mt-4 text-[11px] text-neutral-400">
            键盘可访问：所有交互组件须支持 Tab 聚焦与可见 focus ring（4px / 透明度 5%-15%）
          </div>
        </Block>

        {/* Hit area */}
        <Block label="命中区域 / Hit Area">
          <div className="flex items-end gap-6">
            <div className="text-center">
              <div className="relative size-11 rounded-full bg-neutral-900 flex items-center justify-center text-white text-[12px]">
                ✓
                <div className="absolute inset-[-6px] rounded-full border border-dashed border-emerald-500" />
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">移动端 ≥ 44px</div>
            </div>
            <div className="text-center">
              <div className="relative size-9 rounded-full bg-neutral-900 flex items-center justify-center text-white text-[12px]">
                ✓
                <div className="absolute inset-[-4px] rounded-full border border-dashed border-emerald-500" />
              </div>
              <div className="mt-2 text-[11px] text-neutral-500">桌面端 ≥ 36px</div>
            </div>
            <div className="text-center">
              <div className="relative size-6 rounded-full bg-neutral-300 flex items-center justify-center text-white text-[10px]">
                ✗
                <div className="absolute inset-[-2px] rounded-full border border-dashed border-rose-500" />
              </div>
              <div className="mt-2 text-[11px] text-rose-600">不允许 &lt; 24px</div>
            </div>
          </div>
        </Block>

        {/* Gestures */}
        <Block label="手势 / Gestures">
          <div className="space-y-3 text-[13px]">
            {[
              ["长按消息", "弹出操作菜单（复制 / 重新生成 / 点赞 / 引用）", Hand],
              ["左滑消息", "快捷引用为下一条用户输入", Hand],
              ["下拉会话顶部", "刷新数据，触发 stream 回填", RotateCw],
              ["双击数据卡片", "放大查看（如走势图全屏）", Hand],
            ].map(([title, desc, Icon]: any) => (
              <div key={title} className="flex gap-3 items-start">
                <div className="size-7 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  <Icon className="size-3.5 text-neutral-600" strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-neutral-900">{title}</div>
                  <div className="text-[12px] text-neutral-500 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Block>

        {/* Message actions */}
        <Block label="消息操作 / Message Actions">
          <div className="space-y-4">
            <MessageActions />
            <div className="text-[12px] text-neutral-500 leading-relaxed">
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
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="size-4 mt-0.5 text-rose-700 shrink-0" strokeWidth={1.75} />
                <div className="flex-1">
                  <div className="text-[13px] text-rose-900">生成失败，请稍后重试</div>
                  <div className="text-[11px] text-rose-700/80 mt-0.5">code: TIMEOUT_504</div>
                </div>
                <button className="text-[12px] text-rose-900 underline">重试</button>
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 flex gap-2 items-center">
              <WifiOff className="size-4 text-neutral-500" strokeWidth={1.75} />
              <div className="flex-1 text-[13px] text-neutral-700">网络已断开，已切换离线模式</div>
              <button className="text-[12px] text-neutral-700">重连</button>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex gap-2 items-center">
              <CheckCircle2 className="size-4 text-emerald-700" strokeWidth={1.75} />
              <div className="flex-1 text-[13px] text-emerald-900">已为您保存到收藏</div>
            </div>
          </div>
        </Block>
      </div>
    </Section>
  );
}
