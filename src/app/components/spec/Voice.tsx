import { Section, Block } from "./Section";
import { Check, X } from "lucide-react";

function CompareRow({ ok, no, ctx }: { ok: string; no: string; ctx?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-success/20 bg-success/10 p-3">
        <div className="flex items-center gap-1.5 text-[12px] leading-[16px] text-success mb-1.5">
          <Check className="size-3" strokeWidth={2.5} /> 推荐
        </div>
        <div className="text-[13px] leading-[18px] text-foreground leading-relaxed">{ok}</div>
      </div>
      <div className="rounded-xl border border-border bg-muted p-3">
        <div className="flex items-center gap-1.5 text-[12px] leading-[16px] text-muted-foreground mb-1.5">
          <X className="size-3" strokeWidth={2.5} /> 避免
        </div>
        <div className="text-[13px] leading-[18px] text-muted-foreground leading-relaxed">{no}</div>
      </div>
      {ctx && (
        <div className="col-span-2 text-[12px] leading-[16px] text-muted-foreground -mt-1">{ctx}</div>
      )}
    </div>
  );
}

export function Voice() {
  return (
    <Section
      id="09"
      title="文案与无障碍"
      desc="文案语气统一为：专业、简洁、不卑不亢。所有 AI 回复必须可被屏幕阅读器理解，关键决策结论在前、解释在后。"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Block label="语气 / Voice & Tone">
          <div className="space-y-4">
            <CompareRow
              ok="今日螺纹钢上海 ¥3,850，较昨日 +12 元/吨。"
              no="尊敬的用户您好！今天螺纹钢的价格是 3850 元呢～希望能帮到您！"
              ctx="结论先行，去除谄媚与无意义寒暄"
            />
            <CompareRow
              ok="数据更新至 14:32，仅供参考。"
              no="我也不太确定，可能是 3850 吧，您再看看。"
              ctx="保持确定性，不确定时给出来源与时间"
            />
            <CompareRow
              ok="未找到相关招标信息，请尝试更换关键词或地区。"
              no="抱歉抱歉！我没找到您要的信息呜呜呜～"
              ctx="错误反馈给出可执行的下一步"
            />
          </div>
        </Block>

        <Block label="数字格式 / Number">
          <div className="space-y-3 text-[13px] leading-[18px]">
            {[
              ["价格", "¥3,850 / 吨", "千分位 + 单位"],
              ["涨跌", "+12 (+0.31%)", "符号在前"],
              ["数量", "100 吨", "数字与单位空格分隔"],
              ["时间", "14:32 · 5 月 14 日", "24h 制，中点分隔"],
              ["范围", "¥3,800 – ¥3,900", "en-dash，前后空格"],
              ["枚举", "上海、北京、广州", "中文顿号分隔"],
            ].map(([k, v, note]) => (
              <div key={k} className="flex items-baseline gap-2 border-b border-border pb-2 last:border-0">
                <div className="w-12 text-[12px] leading-[16px] text-muted-foreground">{k}</div>
                <div className="w-40 tabular-nums text-foreground font-mono text-[13px]">{v}</div>
                <div className="text-[12px] leading-[16px] text-muted-foreground">{note}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="对比度 / Contrast">
          <div className="space-y-2">
            {[
              { fg: "hsl(var(--primary))", bg: "hsl(var(--card))", ratio: "20.1", label: "主文字 / 白底", ok: true },
              { fg: "hsl(var(--foreground))", bg: "hsl(var(--card))", ratio: "10.4", label: "正文 / 白底", ok: true },
              { fg: "hsl(var(--muted-foreground))", bg: "hsl(var(--card))", ratio: "4.7", label: "辅助 / 白底（≥ 4.5 ✓）", ok: true },
              { fg: "#A3A3A3", bg: "hsl(var(--card))", ratio: "2.8", label: "占位 / 白底（仅装饰）", ok: false },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <div
                  className="h-8 w-12 rounded flex items-center justify-center text-[12px] leading-[16px]"
                  style={{ background: c.bg, color: c.fg }}
                >
                  Aa
                </div>
                <div className="flex-1 text-[13px] text-foreground">{c.label}</div>
                <div className="text-[12px] leading-[16px] tabular-nums font-mono">
                  <span className={c.ok ? "text-success" : "text-muted-foreground"}>
                    {c.ratio}:1
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[12px] leading-[16px] text-muted-foreground">
            正文须满足 WCAG AA（≥ 4.5:1），大文本与图标 ≥ 3:1
          </div>
        </Block>

        <Block label="无障碍 / A11y 清单">
          <ul className="space-y-2 text-[13px] leading-[18px] text-foreground">
            {[
              "所有图标按钮提供 aria-label，仅图形不传达语义",
              "AI 流式输出使用 aria-live='polite'，避免打断用户",
              "颜色不是唯一信息载体（涨跌同时给出符号 ↑↓）",
              "焦点顺序遵循阅读流，绝不通过 tabindex 跳跃",
              "支持 prefers-reduced-motion，禁用入场动画",
              "支持 prefers-color-scheme，预留暗色 token",
              "表单错误使用 aria-invalid + aria-describedby",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="size-4 mt-0.5 text-success shrink-0" strokeWidth={2} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Block>

        <Block label="空态 / 拒答模板" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              {
                t: "无搜索结果",
                b: "未找到相关招标信息",
                a: "尝试更换关键词或扩大地区范围",
              },
              {
                t: "超出能力",
                b: "暂不支持期货行情查询",
                a: "您可以查询螺纹钢、热卷等现货价格",
              },
              {
                t: "需要补充信息",
                b: "请告诉我具体的规格与地区",
                a: "例如：HRB400E 20mm，上海",
              },
              {
                t: "AI 不确定",
                b: "该信息未找到权威来源",
                a: "建议联系行业分析师确认",
              },
            ].map((s) => (
              <div key={s.t} className="rounded-xl border border-border p-4">
                <div className="text-[12px] leading-[16px] tracking-wider uppercase text-muted-foreground">{s.t}</div>
                <div className="mt-1 text-[14px] leading-[20px] text-foreground">{s.b}</div>
                <div className="mt-1 text-[12px] leading-[16px] text-muted-foreground">{s.a}</div>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </Section>
  );
}
