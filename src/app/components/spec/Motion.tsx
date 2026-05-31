import { useState } from "react";
import { Section, Block } from "./Section";
import { Sparkles, RefreshCw, ArrowUp } from "lucide-react";

const durations = [
  { name: "instant", v: "80ms", use: "Hover / Tap 反馈" },
  { name: "fast", v: "160ms", use: "按钮态 / Tooltip" },
  { name: "base", v: "240ms", use: "气泡入场 / 抽屉" },
  { name: "slow", v: "400ms", use: "页面切换 / 卡片展开" },
  { name: "stream", v: "20ms/字", use: "AI 流式输出节奏" },
];

const easings = [
  { name: "standard", v: "cubic-bezier(.2,.8,.2,1)", use: "通用进出" },
  { name: "emphasized", v: "cubic-bezier(.3,0,0,1)", use: "强调入场（卡片/抽屉）" },
  { name: "exit", v: "cubic-bezier(.4,0,1,1)", use: "退场 / 消失" },
  { name: "linear", v: "linear", use: "光标 / 进度条 / Skeleton" },
];

function ReplayBubble() {
  const [k, setK] = useState(0);
  return (
    <div>
      <div className="h-24 flex items-end">
        <div
          key={k}
          className="flex gap-2 max-w-[80%] [animation:bubbleIn_240ms_cubic-bezier(.2,.8,.2,1)_both]"
        >
          <div className="size-7 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
            <Sparkles className="size-3.5" strokeWidth={1.5} />
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-neutral-50 border border-neutral-200/60 px-3.5 py-2.5 text-[13.5px] text-neutral-800">
            正在为您查询螺纹钢价格…
          </div>
        </div>
      </div>
      <button
        onClick={() => setK((v) => v + 1)}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-900"
      >
        <RefreshCw className="size-3" /> 重放
      </button>
    </div>
  );
}

function StreamText() {
  const [k, setK] = useState(0);
  const text = "今日螺纹钢 HRB400E 20mm 上海价格 ¥3,850";
  return (
    <div>
      <div key={k} className="rounded-2xl bg-neutral-50 border border-neutral-200/60 px-4 py-3 min-h-[60px]">
        <span className="text-[14px] text-neutral-800">
          {text.split("").map((c, i) => (
            <span
              key={i}
              className="opacity-0 [animation:fadeIn_120ms_linear_both]"
              style={{ animationDelay: `${i * 22}ms` }}
            >
              {c}
            </span>
          ))}
          <span
            className="ml-0.5 inline-block w-1.5 h-4 align-middle bg-neutral-900 [animation:caretBlink_900ms_steps(2)_infinite]"
            style={{ animationDelay: `${text.length * 22}ms` }}
          />
        </span>
      </div>
      <button
        onClick={() => setK((v) => v + 1)}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-900"
      >
        <RefreshCw className="size-3" /> 重放
      </button>
    </div>
  );
}

function CardStream() {
  const [k, setK] = useState(0);
  const rows = [
    ["上海", "¥3,850"],
    ["北京", "¥3,780"],
    ["广州", "¥3,920"],
  ];
  return (
    <div>
      <div key={k} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden [animation:cardIn_400ms_cubic-bezier(.3,0,0,1)_both]">
        <div className="px-4 py-2.5 border-b border-neutral-100 text-[11px] tracking-wider uppercase text-neutral-400">
          Price · Streaming
        </div>
        <div className="divide-y divide-neutral-100 text-[13px]">
          {rows.map(([c, p], i) => (
            <div
              key={c}
              className="px-4 py-2.5 flex justify-between opacity-0 [animation:rowIn_280ms_cubic-bezier(.2,.8,.2,1)_both]"
              style={{ animationDelay: `${200 + i * 100}ms` }}
            >
              <span className="text-neutral-700">{c}</span>
              <span className="tabular-nums text-neutral-900">{p}</span>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setK((v) => v + 1)}
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-900"
      >
        <RefreshCw className="size-3" /> 重放
      </button>
    </div>
  );
}

function PressDemo() {
  return (
    <div className="space-y-3">
      <div className="text-[12px] text-neutral-500">悬停 / 按下查看反馈</div>
      <div className="flex gap-3 items-center">
        <button className="rounded-full bg-neutral-900 text-white px-5 py-2.5 text-[14px] transition-all duration-150 ease-out hover:opacity-90 active:scale-[0.97]">
          发送
          <ArrowUp className="inline size-3.5 ml-1" strokeWidth={2} />
        </button>
        <button className="rounded-full border border-neutral-300 px-5 py-2.5 text-[14px] transition-colors duration-150 hover:border-neutral-900 hover:bg-neutral-50 active:bg-neutral-100">
          快捷指令
        </button>
        <button className="rounded-full px-5 py-2.5 text-[14px] text-neutral-500 transition-colors duration-150 hover:text-neutral-900">
          取消
        </button>
      </div>
    </div>
  );
}

function FocusDemo() {
  return (
    <div className="space-y-3">
      <div className="text-[12px] text-neutral-500">点击输入框查看聚焦动效（描边 + 4px 柔光）</div>
      <input
        placeholder="输入消息…"
        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[14px] outline-none transition-all duration-200 ease-out focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5"
      />
    </div>
  );
}

export function Motion() {
  return (
    <Section
      id="07"
      title="动效规范"
      desc="动效服务于信息感知，而非表演。所有过渡时长不超过 400ms，使用同一组缓动曲线，禁止弹性、回弹与旋转类装饰动画。"
    >
      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes caretBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Block label="时长 Token / Duration">
          <div className="space-y-2">
            {durations.map((d) => (
              <div key={d.name} className="flex items-baseline gap-4 border-b border-neutral-100 pb-2 last:border-0">
                <div className="w-20 text-[12px] text-neutral-900 font-mono">{d.name}</div>
                <div className="w-20 text-[12px] text-neutral-500 font-mono">{d.v}</div>
                <div className="text-[12px] text-neutral-500">{d.use}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="缓动曲线 / Easing">
          <div className="space-y-2">
            {easings.map((e) => (
              <div key={e.name} className="border-b border-neutral-100 pb-2 last:border-0">
                <div className="flex items-baseline gap-3">
                  <div className="text-[12px] text-neutral-900 font-mono">{e.name}</div>
                  <div className="text-[11px] text-neutral-500">{e.use}</div>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{e.v}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="气泡入场 · 240ms standard">
          <ReplayBubble />
        </Block>

        <Block label="流式输出 · 22ms/字 + 光标闪烁">
          <StreamText />
        </Block>

        <Block label="卡片入场 + 行级 stagger · 100ms">
          <CardStream />
        </Block>

        <Block label="按钮反馈 · 80–160ms">
          <PressDemo />
        </Block>

        <Block label="输入聚焦 · 200ms" className="lg:col-span-2">
          <FocusDemo />
        </Block>
      </div>

      <div className="mt-6 rounded-2xl bg-neutral-50 border border-neutral-200 p-5 text-[13px] text-neutral-600 leading-relaxed">
        <span className="text-neutral-900">原则：</span>
        ① 入场用 standard / emphasized，退场用 exit；
        ② 同屏多元素入场使用 60–120ms 的 stagger，避免同时弹出；
        ③ 长流式内容必须显示光标，告知"仍在输出"；
        ④ 用户开启<span className="font-mono"> prefers-reduced-motion </span>时，所有非必要动画退化为 0ms。
      </div>
    </Section>
  );
}
