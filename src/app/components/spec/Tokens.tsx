import { Section, Block } from "./Section";

const colors = [
  { name: "Primary / 主色", value: "#030213", token: "primary" },
  { name: "Foreground / 前景", value: "#0A0A0A", token: "foreground" },
  { name: "Muted-Foreground / 辅助", value: "#717182", token: "muted-foreground" },
  { name: "Border / 描边", value: "#E5E5E5", token: "border" },
  { name: "Card / 表面", value: "#FFFFFF", token: "card" },
  { name: "Background / 画布", value: "#FFFFFF", token: "background" },
  { name: "Muted / 底色", value: "#ECECF0", token: "muted" },
  { name: "Success / 涨", value: "#16A34A", token: "success" },
  { name: "Destructive / 跌", value: "#DC2626", token: "destructive" },
];

const types = [
  { label: "Display", cls: "text-[40px] leading-[1.1] tracking-tight", sample: "钢铁行业 Agent" },
  { label: "H1 / 标题", cls: "text-[24px] leading-[32px]", sample: "今日螺纹钢价格" },
  { label: "H2 / 小标题", cls: "text-[18px] leading-[28px]", sample: "上海主流市场" },
  { label: "Body / 正文", cls: "text-[14px] leading-[20px]", sample: "AI 对话回复内容会以正文字号呈现，确保长文本舒适阅读。" },
  { label: "Caption / 说明", cls: "text-[12px] leading-[16px] text-muted-foreground", sample: "数据来源：Mysteel · 更新于 14:32" },
];

const radii = [
  { name: "sm", v: 4 },
  { name: "md", v: 6 },
  { name: "lg", v: 10 },
  { name: "xl", v: 12 },
  { name: "2xl", v: 16 },
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
          <div className="grid grid-cols-3 gap-2">
            {colors.map((c) => (
              <div key={c.name}>
                <div
                  className="h-16 rounded-xl border border-border"
                  style={{ background: c.value }}
                />
                <div className="mt-2 text-[13px] text-foreground">{c.name}</div>
                <div className="text-[12px] leading-[16px] text-muted-foreground font-mono">{c.value}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="字阶 / Typography">
          <div className="space-y-4">
            {types.map((t) => (
              <div key={t.label} className="flex items-baseline gap-6 border-b border-border pb-4 last:border-0">
                <div className="w-24 text-[12px] leading-[16px] text-muted-foreground shrink-0">{t.label}</div>
                <div className={t.cls}>{t.sample}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block label="圆角 / Radius">
          <div className="flex items-end gap-4">
            {radii.map((r) => (
              <div key={r.name} className="text-center">
                <div
                  className="h-20 w-20 bg-muted border border-border"
                  style={{ borderRadius: r.v }}
                />
                <div className="mt-2 text-[12px] leading-[16px] text-muted-foreground font-mono">
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
                <div className="w-10 text-[12px] leading-[16px] text-muted-foreground font-mono">{s}px</div>
                <div className="h-2 bg-primary" style={{ width: s * 4 }} />
              </div>
            ))}
          </div>
        </Block>
      </div>
    </Section>
  );
}
