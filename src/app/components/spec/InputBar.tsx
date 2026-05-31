import { Section, Block } from "./Section";
import {
  ArrowUp,
  Mic,
  Plus,
  TrendingUp,
  Calculator,
  BookOpen,
  Target,
  LineChart,
} from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

const quicks = [
  { icon: TrendingUp, label: "查价格" },
  { icon: Calculator, label: "算报价" },
  { icon: BookOpen, label: "查知识" },
  { icon: Target, label: "看招标" },
  { icon: LineChart, label: "看走势" },
];

export function InputBar() {
  return (
    <Section
      id="04"
      title="输入栏与快捷指令"
      desc="基于 shadcn Button + Textarea 构建。快捷指令使用 Button outline 变体并强制 rounded-full + 1px 描边。"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Block label="快捷指令 / Quick Commands (Button)">
          <div className="flex flex-wrap gap-2">
            {quicks.map((q, i) => (
              <Button
                key={q.label}
                variant={i === 0 ? "default" : "outline"}
                size="sm"
                className={
                  i === 0
                    ? "rounded-full bg-neutral-900 hover:bg-neutral-800 text-[13px] h-8"
                    : "rounded-full border-neutral-200 hover:border-neutral-900 hover:bg-transparent text-[13px] text-neutral-700 h-8"
                }
              >
                <q.icon className="size-3.5" strokeWidth={1.75} />
                {q.label}
              </Button>
            ))}
          </div>
        </Block>

        <Block label="输入栏 / Composer (Textarea + Button)">
          <div className="space-y-4">
            {/* default state */}
            <div className="flex items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-2 pl-3">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-neutral-500"
              >
                <Plus className="size-4" strokeWidth={1.75} />
              </Button>
              <Textarea
                placeholder="询问钢材价格、报价、招标信息…"
                rows={1}
                className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 py-1.5 min-h-0 text-[14px]"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-neutral-500"
              >
                <Mic className="size-4" strokeWidth={1.75} />
              </Button>
              <Button
                size="icon"
                className="size-8 rounded-full bg-neutral-900 hover:bg-neutral-800"
              >
                <ArrowUp className="size-4" strokeWidth={2} />
              </Button>
            </div>

            {/* focused state */}
            <div className="flex items-end gap-2 rounded-2xl border border-neutral-900 bg-white p-2 pl-3 ring-4 ring-neutral-900/5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-neutral-500"
              >
                <Plus className="size-4" strokeWidth={1.75} />
              </Button>
              <div className="flex-1 min-h-[36px] py-1.5 text-[14px] text-neutral-900">
                给我报 100 吨 HRB400E 20mm 螺纹钢的价格
              </div>
              <Button
                size="icon"
                className="size-8 rounded-full bg-neutral-900 hover:bg-neutral-800"
              >
                <ArrowUp className="size-4" strokeWidth={2} />
              </Button>
            </div>
            <div className="text-[11px] text-neutral-400">
              状态：默认 / 聚焦 — 描边由 neutral-200 → neutral-900，附 4px 柔光
            </div>
          </div>
        </Block>
      </div>
    </Section>
  );
}
