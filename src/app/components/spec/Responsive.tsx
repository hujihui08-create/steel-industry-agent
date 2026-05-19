import { Section, Block } from "./Section";
import { Sparkles, Search, Plus, ArrowUp, MessageSquare, PanelRight, Command } from "lucide-react";

const breakpoints = [
  { name: "sm", v: "640", use: "大屏手机 / 小平板竖屏" },
  { name: "md", v: "768", use: "切换到双栏（会话列表 + 对话区）" },
  { name: "lg", v: "1024", use: "桌面常驻侧栏 + 输入栏内联快捷指令" },
  { name: "xl", v: "1280", use: "进入三栏（+ 右侧详情抽屉）" },
  { name: "2xl", v: "1536", use: "对话区最大 720px 居中，两侧留白" },
];

const behaviors = [
  ["气泡最大宽度", "85%", "640px", "720px"],
  ["富媒体卡片", "单列", "单列", "双列网格"],
  ["快捷指令", "横向滚动", "横向滚动", "内联输入栏右侧"],
  ["会话列表", "抽屉（汉堡触发）", "侧栏 240px", "侧栏 280px"],
  ["详情抽屉", "全屏覆盖", "全屏覆盖", "右侧 360px"],
  ["主标题字号", "28px", "40px", "48px"],
  ["底部输入栏", "fixed 全宽", "fixed 全宽", "居中 720px + 阴影脱离" ],
];

const shortcuts = [
  ["⌘ K", "打开命令面板（搜索 / 跳转 / 快捷指令）"],
  ["⌘ ↩", "发送消息"],
  ["⌘ ⇧ N", "新建会话"],
  ["⌘ /", "聚焦输入框"],
  ["Esc", "中断生成 / 关闭抽屉"],
  ["⌘ \\", "折叠 / 展开侧栏"],
  ["↑", "编辑上一条已发送消息"],
];

function DesktopFrame() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="h-7 bg-neutral-50 border-b border-neutral-200 flex items-center px-3 gap-1.5">
        <span className="size-2 rounded-full bg-neutral-300" />
        <span className="size-2 rounded-full bg-neutral-300" />
        <span className="size-2 rounded-full bg-neutral-300" />
        <div className="ml-3 h-3.5 w-40 rounded bg-neutral-200" />
      </div>

      <div className="grid grid-cols-[240px_1fr_320px] h-[460px]">
        {/* Sidebar */}
        <aside className="border-r border-neutral-200 flex flex-col">
          <div className="p-3 border-b border-neutral-100 flex items-center gap-2">
            <div className="size-5 rounded-md bg-neutral-900" />
            <span className="text-[12px]">钢铁助手</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-1.5">
              <Search className="size-3.5 text-neutral-400" strokeWidth={1.75} />
              <span className="text-[11px] text-neutral-400">搜索会话</span>
              <span className="ml-auto text-[10px] font-mono text-neutral-400">⌘K</span>
            </div>
          </div>
          <div className="px-2 flex-1 overflow-y-auto space-y-0.5">
            {[
              ["螺纹钢上海行情", "今天"],
              ["100 吨 HRB400E 报价", "昨天"],
              ["Q235B vs Q345B", "5/12"],
              ["华东招标汇总", "5/10"],
            ].map(([t, d], i) => (
              <div
                key={t}
                className={
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] " +
                  (i === 0 ? "bg-neutral-100 text-neutral-900" : "text-neutral-600")
                }
              >
                <MessageSquare className="size-3 text-neutral-500" strokeWidth={1.75} />
                <span className="truncate flex-1">{t}</span>
                <span className="text-[10px] text-neutral-400">{d}</span>
              </div>
            ))}
          </div>
          <button className="m-3 rounded-full bg-neutral-900 text-white px-3 py-1.5 text-[12px] flex items-center justify-center gap-1.5">
            <Plus className="size-3.5" strokeWidth={1.75} /> 新会话
          </button>
        </aside>

        {/* Main conversation */}
        <main className="flex flex-col bg-neutral-50/40">
          <div className="h-10 border-b border-neutral-100 flex items-center justify-between px-4">
            <span className="text-[12px] text-neutral-700">螺纹钢上海行情</span>
            <PanelRight className="size-3.5 text-neutral-500" strokeWidth={1.75} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex gap-2 max-w-[640px]">
              <div className="size-6 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
                <Sparkles className="size-3" strokeWidth={1.5} />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white border border-neutral-200/60 px-3 py-2 text-[12.5px] text-neutral-800">
                今日螺纹钢 HRB400E 20mm 上海 ¥3,850 ↑12 (+0.31%)
              </div>
            </div>
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-neutral-900 text-white px-3 py-2 text-[12.5px] max-w-[640px]">
                热卷呢？
              </div>
            </div>
            <div className="flex gap-2 max-w-[640px]">
              <div className="size-6 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
                <Sparkles className="size-3" strokeWidth={1.5} />
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div className="rounded-xl border border-neutral-200 bg-white p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Price</div>
                  <div className="text-[13px] tabular-nums mt-0.5">¥4,200</div>
                  <div className="text-[10px] text-emerald-700 tabular-nums">+0.48%</div>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Trend</div>
                  <div className="mt-1 h-7 flex items-end gap-0.5">
                    {[6, 8, 7, 10, 9, 12, 11].map((h, i) => (
                      <div key={i} className="flex-1 bg-neutral-900" style={{ height: h * 2 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Inline composer with quick commands */}
          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-neutral-200 bg-white">
              <div className="flex items-center gap-1 px-2 pt-2">
                {["📊 查价格", "💰 算报价", "📚 查知识", "🎯 看招标"].map((t, i) => (
                  <span
                    key={t}
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] " +
                      (i === 0
                        ? "bg-neutral-900 text-white"
                        : "border border-neutral-200 text-neutral-600")
                    }
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-end gap-1.5 p-2 pl-2.5">
                <Plus className="size-3.5 text-neutral-400" strokeWidth={1.75} />
                <div className="flex-1 text-[12px] text-neutral-400">
                  询问钢材价格、报价、招标信息…
                </div>
                <span className="text-[10px] font-mono text-neutral-400">⌘↩</span>
                <button className="size-6 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                  <ArrowUp className="size-3" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right detail panel */}
        <aside className="border-l border-neutral-200 flex flex-col">
          <div className="h-10 border-b border-neutral-100 flex items-center justify-between px-3">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400">详情</span>
            <span className="text-[10px] text-neutral-400 font-mono">⌘\</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="rounded-xl border border-neutral-200 p-3">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">Trend · 7D</div>
              <div className="text-[15px] tabular-nums mt-0.5">¥3,850</div>
              <div className="text-[10px] text-emerald-700 tabular-nums">+1.80%</div>
              <div className="mt-2 h-12 flex items-end gap-0.5">
                {[3, 5, 4, 7, 6, 8, 10, 9, 11].map((h, i) => (
                  <div key={i} className="flex-1 bg-neutral-900" style={{ height: h * 3 }} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-neutral-400">来源</div>
              <div className="text-[11px] text-neutral-600">Mysteel · 14:32</div>
              <div className="text-[11px] text-neutral-600">兰格钢铁 · 14:30</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MobileFrame() {
  return (
    <div className="mx-auto w-[220px] rounded-[24px] border border-neutral-200 bg-white overflow-hidden">
      <div className="h-7 border-b border-neutral-100 flex items-center justify-between px-3">
        <div className="size-3 rounded-sm bg-neutral-200" />
        <span className="text-[10px]">钢铁助手</span>
        <div className="size-3 rounded-sm bg-neutral-200" />
      </div>
      <div className="p-2 space-y-1.5 bg-neutral-50/50 h-[260px]">
        <div className="text-[14px] tracking-tight">下午好，老李</div>
        <div className="flex gap-1 overflow-hidden">
          {["螺纹钢", "热卷", "中厚板"].map((t) => (
            <div key={t} className="shrink-0 rounded-md border border-neutral-200 bg-white px-1.5 py-1">
              <div className="text-[8px] text-neutral-500">{t}</div>
              <div className="text-[10px] tabular-nums">¥3,8XX</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-neutral-900 text-white p-2 text-[9px] leading-snug">
          受铁矿石上行带动，本周螺纹钢主流市场 +1.2%
        </div>
        <div className="space-y-1">
          {["螺纹钢今天什么价格？", "对比螺纹钢和热卷"].map((t) => (
            <div key={t} className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[9px]">
              {t}
            </div>
          ))}
        </div>
      </div>
      <div className="p-2 border-t border-neutral-100">
        <div className="flex gap-1 mb-1 overflow-hidden">
          {["📊", "💰", "📚", "🎯"].map((e, i) => (
            <span
              key={i}
              className={
                "rounded-full px-1.5 py-0.5 text-[8px] " +
                (i === 0 ? "bg-neutral-900 text-white" : "border border-neutral-200")
              }
            >
              {e}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-1">
          <span className="text-[8px] text-neutral-400 flex-1">输入消息…</span>
          <div className="size-3.5 rounded-full bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}

export function Responsive() {
  return (
    <Section
      id="10"
      title="响应式与 Web 端"
      desc="同一套 Token 与组件，通过断点切换布局拓扑。移动端单列对话，桌面端三栏（会话 + 对话 + 详情），并启用键盘快捷键。"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Block label="断点 / Breakpoints">
          <div className="space-y-2">
            {breakpoints.map((b) => (
              <div key={b.name} className="flex items-baseline gap-4 border-b border-neutral-100 pb-2 last:border-0">
                <div className="w-10 text-[12px] text-neutral-900 font-mono">{b.name}</div>
                <div className="w-16 text-[12px] text-neutral-500 font-mono">≥ {b.v}</div>
                <div className="text-[12px] text-neutral-500">{b.use}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="键盘快捷键 / Shortcuts (桌面端)">
          <div className="space-y-2">
            {shortcuts.map(([k, d]) => (
              <div key={k} className="flex items-center gap-3 border-b border-neutral-100 pb-2 last:border-0">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-mono text-neutral-700 min-w-[60px] text-center">
                  {k}
                </kbd>
                <span className="text-[12.5px] text-neutral-700">{d}</span>
              </div>
            ))}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-500">
              <Command className="size-3" /> 全部快捷键可在 ⌘K 命令面板中查看
            </div>
          </div>
        </Block>

        <Block label="响应式行为表 / Behavior" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-neutral-400 text-left">
                  <th className="py-2 pr-4">元素</th>
                  <th className="py-2 pr-4">移动 &lt; 768</th>
                  <th className="py-2 pr-4">桌面 ≥ 1024</th>
                  <th className="py-2 pr-4">宽屏 ≥ 1280</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {behaviors.map((row) => (
                  <tr key={row[0]} className="text-neutral-700">
                    {row.map((cell, i) => (
                      <td key={i} className={"py-2.5 pr-4 " + (i === 0 ? "text-neutral-900" : "")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>

        <Block label="桌面三栏布局预览 · ≥ 1280" className="lg:col-span-2">
          <DesktopFrame />
        </Block>

        <Block label="同一套组件在移动端" className="lg:col-span-2">
          <div className="flex justify-center py-4">
            <MobileFrame />
          </div>
          <div className="mt-2 text-center text-[11px] text-neutral-500">
            同一套 Token / 气泡 / 卡片 / 输入栏，仅切换布局拓扑与字阶
          </div>
        </Block>
      </div>

      <div className="mt-6 rounded-2xl bg-neutral-50 border border-neutral-200 p-5 text-[13px] text-neutral-600 leading-relaxed">
        <span className="text-neutral-900">实施约定：</span>
        ① 容器使用 CSS Grid 控制三栏，避免 JS 计算宽度；
        ② 侧栏与详情面板宽度固定，对话区弹性 + `max-w-[720px]` 居中；
        ③ 触屏设备无论尺寸均按移动端命中区域处理（≥ 44px）；
        ④ 桌面端禁用滑动手势，全部行为通过 hover 操作条 + 快捷键提供。
      </div>
    </Section>
  );
}
