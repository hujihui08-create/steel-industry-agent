import { Section, Block } from "./Section";

const colors = [
  { name: "Ink / 主文字", value: "#0A0A0A", token: "neutral-950" },
  { name: "Body / 正文", value: "#404040", token: "neutral-700" },
  { name: "Muted / 辅助", value: "#737373", token: "neutral-500" },
  { name: "Line / 描边", value: "#E5E5E5", token: "neutral-200" },
  { name: "Surface / 表面", value: "#FAFAFA", token: "neutral-50" },
  { name: "Canvas / 画布", value: "#FFFFFF", token: "white" },
  { name: "Accent / 强调", value: "#0A0A0A", token: "ink" },
  { name: "Up / 涨", value: "#1F7A4D", token: "emerald-700" },
  { name: "Down / 跌", value: "#B42318", token: "rose-700" },
];

const types = [
  { label: "Display", cls: "text-[40px] leading-[1.1] tracking-tight", sample: "钢铁行业 Agent" },
  { label: "H1 / 标题", cls: "text-[24px] leading-[1.3]", sample: "今日螺纹钢价格" },
  { label: "H2 / 小标题", cls: "text-[18px] leading-[1.4]", sample: "上海主流市场" },
  { label: "Body / 正文", cls: "text-[15px] leading-[1.6]", sample: "AI 对话回复内容会以正文字号呈现，确保长文本舒适阅读。" },
  { label: "Caption / 说明", cls: "text-[12px] leading-[1.5] text-neutral-500", sample: "数据来源：Mysteel · 更新于 14:32" },
];

const radii = [
  { name: "sm", v: 6 },
  { name: "md", v: 10 },
  { name: "lg", v: 16 },
  { name: "xl", v: 20 },
  { name: "2xl", v: 24 },
];

const spacing = [4, 8, 12, 16, 24, 32, 48];

export function Tokens() {
  return (
    <Section
      id="01"
      title="设计 Token"
      desc="极简风以中性灰阶为基调，仅通过单一墨色强调与最低限度的语义色（涨/跌）传达信息，避免视觉噪声。"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Block label="色板 / Palette">
          <div className="grid grid-cols-3 gap-3">
            {colors.map((c) => (
              <div key={c.name}>
                <div
                  className="h-16 rounded-lg border border-neutral-200"
                  style={{ background: c.value }}
                />
                <div className="mt-2 text-[13px] text-neutral-900">{c.name}</div>
                <div className="text-[11px] text-neutral-400 font-mono">{c.value}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="字阶 / Typography">
          <div className="space-y-5">
            {types.map((t) => (
              <div key={t.label} className="flex items-baseline gap-6 border-b border-neutral-100 pb-4 last:border-0">
                <div className="w-24 text-[11px] text-neutral-400 shrink-0">{t.label}</div>
                <div className={t.cls}>{t.sample}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="圆角 / Radius">
          <div className="flex items-end gap-5">
            {radii.map((r) => (
              <div key={r.name} className="text-center">
                <div
                  className="h-20 w-20 bg-neutral-100 border border-neutral-200"
                  style={{ borderRadius: r.v }}
                />
                <div className="mt-2 text-[11px] text-neutral-500 font-mono">
                  {r.name} · {r.v}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="间距 / Spacing">
          <div className="space-y-2">
            {spacing.map((s) => (
              <div key={s} className="flex items-center gap-4">
                <div className="w-10 text-[11px] text-neutral-400 font-mono">{s}px</div>
                <div className="h-2 bg-neutral-900" style={{ width: s * 4 }} />
              </div>
            ))}
          </div>
        </Block>
      </div>
    </Section>
  );
}
