import { Section } from "./Section";
import { Menu, MoreHorizontal, Sparkles, ArrowUp, Plus, Mic, ArrowUpRight } from "lucide-react";

export function Preview() {
  return (
    <Section
      id="06"
      title="组合预览"
      desc="将以上元素组合为真实使用场景：移动端对话流。展示典型的 AI + 卡片 + 操作 + 多轮追问形态。"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-[380px] rounded-[36px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-[680px]">
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
            <button className="size-8 rounded-full hover:bg-neutral-100 flex items-center justify-center">
              <Menu className="size-4" strokeWidth={1.75} />
            </button>
            <div className="text-center">
              <div className="text-[14px] text-neutral-900">钢铁助手</div>
              <div className="text-[10px] text-neutral-400">AI · 实时在线</div>
            </div>
            <button className="size-8 rounded-full hover:bg-neutral-100 flex items-center justify-center">
              <MoreHorizontal className="size-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* Conversation */}
          <div className="px-4 py-4 space-y-4 bg-neutral-50/50 flex-1 overflow-y-auto">
            {/* AI greeting */}
            <div className="flex gap-2 max-w-[88%]">
              <div className="size-7 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
                <Sparkles className="size-3.5" strokeWidth={1.5} />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white border border-neutral-200/60 px-3.5 py-2.5 text-[13.5px] text-neutral-800">
                您好，我是钢铁行业智能助手 👋
              </div>
            </div>

            {/* User */}
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-neutral-900 text-white px-3.5 py-2.5 text-[13.5px] max-w-[80%]">
                螺纹钢今天什么价格？
              </div>
            </div>

            {/* AI with card */}
            <div className="flex gap-2 max-w-[88%]">
              <div className="size-7 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
                <Sparkles className="size-3.5" strokeWidth={1.5} />
              </div>
              <div className="space-y-2 flex-1">
                <div className="rounded-2xl rounded-tl-sm bg-white border border-neutral-200/60 px-3.5 py-2.5 text-[13.5px] text-neutral-800">
                  今日螺纹钢 HRB400E 20mm 主流价格：
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-neutral-100 flex justify-between">
                    <span className="text-[11px] tracking-wider uppercase text-neutral-400">Price</span>
                    <span className="text-[10px] text-neutral-400">14:32</span>
                  </div>
                  <div className="divide-y divide-neutral-100 text-[13px]">
                    {[
                      ["上海", "3,850", 12, 0.31],
                      ["北京", "3,780", 8, 0.21],
                      ["广州", "3,920", 15, 0.38],
                    ].map(([c, p, d, pc]) => (
                      <div key={c as string} className="px-4 py-2.5 flex justify-between">
                        <span className="text-neutral-700">{c}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="tabular-nums text-neutral-900">¥{p}</span>
                          <span className="flex items-center text-emerald-700 text-[11px] tabular-nums">
                            <ArrowUpRight className="size-3" />
                            {d} ({pc}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] text-neutral-700">
                    查看走势图
                  </button>
                  <button className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] text-neutral-700">
                    设置预警
                  </button>
                </div>
              </div>
            </div>

            {/* User follow-up */}
            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-neutral-900 text-white px-3.5 py-2.5 text-[13.5px] max-w-[80%]">
                那热卷呢？
              </div>
            </div>

            {/* --- 滚动可见的额外内容，演示固定输入栏 --- */}
            <div className="flex gap-2 max-w-[88%]">
              <div className="size-7 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
                <Sparkles className="size-3.5" strokeWidth={1.5} />
              </div>
              <div className="space-y-2 flex-1">
                <div className="rounded-2xl rounded-tl-sm bg-white border border-neutral-200/60 px-3.5 py-2.5 text-[13.5px] text-neutral-800">
                  热卷 Q235B 5.75mm 今日价格：
                </div>
                <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-neutral-100 flex justify-between">
                    <span className="text-[11px] tracking-wider uppercase text-neutral-400">Hot Rolled</span>
                    <span className="text-[10px] text-neutral-400">14:35</span>
                  </div>
                  <div className="divide-y divide-neutral-100 text-[13px]">
                    {[
                      ["上海", "4,200", 20, 0.48],
                      ["天津", "4,080", 10, 0.25],
                      ["乐从", "4,150", 18, 0.44],
                    ].map(([c, p, d, pc]) => (
                      <div key={c as string} className="px-4 py-2.5 flex justify-between">
                        <span className="text-neutral-700">{c}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="tabular-nums text-neutral-900">¥{p}</span>
                          <span className="flex items-center text-emerald-700 text-[11px] tabular-nums">
                            <ArrowUpRight className="size-3" />
                            {d} ({pc}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] text-neutral-700">
                    查看走势图
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-neutral-900 text-white px-3.5 py-2.5 text-[13.5px] max-w-[80%]">
                冷轧板卷今天什么价？
              </div>
            </div>

            <div className="flex gap-2 max-w-[88%]">
              <div className="size-7 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
                <Sparkles className="size-3.5" strokeWidth={1.5} />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white border border-neutral-200/60 px-3.5 py-2.5 text-[13.5px] text-neutral-800">
                冷轧板卷 SPCC 1.0mm 上海 ¥4,580 ↑8 (+0.18%)
              </div>
            </div>

            <div className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-neutral-900 text-white px-3.5 py-2.5 text-[13.5px] max-w-[80%]">
                中厚板 q345B 20mm 报价
              </div>
            </div>

            <div className="flex gap-2 max-w-[88%]">
              <div className="size-7 shrink-0 rounded-full border border-neutral-200 bg-white flex items-center justify-center">
                <Sparkles className="size-3.5" strokeWidth={1.5} />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white border border-neutral-200/60 px-3.5 py-2.5 text-[13.5px] text-neutral-800">
                中厚板 Q345B 20mm 上海 ¥4,350 ↑5 (+0.12%)
              </div>
            </div>
          </div>

          {/* Composer */}
          <div className="flex-shrink-0 px-3 pt-3 pb-5 bg-white border-t border-neutral-100">
            <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar">
              {["📊 查价格", "💰 算报价", "📚 查知识", "🎯 看招标"].map((t, i) => (
                <button
                  key={t}
                  className={
                    "shrink-0 rounded-full px-3 py-1.5 text-[12px] " +
                    (i === 0
                      ? "bg-neutral-900 text-white"
                      : "border border-neutral-200 text-neutral-700")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-1.5 rounded-2xl border border-neutral-200 p-1.5 pl-2.5">
              <button className="size-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500">
                <Plus className="size-3.5" strokeWidth={1.75} />
              </button>
              <div className="flex-1 min-h-[28px] py-1 text-[13px] text-neutral-400">
                输入消息…
              </div>
              <button className="size-7 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500">
                <Mic className="size-3.5" strokeWidth={1.75} />
              </button>
              <button className="size-7 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                <ArrowUp className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
