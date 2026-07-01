import { Section, Block } from "./Section";
import { ArrowUpRight, ChevronRight, Bell, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const trendData = [
  { d: "5/8", v: 3782 },
  { d: "5/9", v: 3795 },
  { d: "5/10", v: 3810 },
  { d: "5/11", v: 3804 },
  { d: "5/12", v: 3828 },
  { d: "5/13", v: 3838 },
  { d: "5/14", v: 3850 },
];

function PriceCard() {
  const items = [
    { city: "上海", price: 3850, delta: 12, pct: 0.31 },
    { city: "北京", price: 3780, delta: 8, pct: 0.21 },
    { city: "广州", price: 3920, delta: 15, pct: 0.38 },
  ];
  return (
    <Card className="rounded-xl border-border gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border flex-row items-center justify-between space-y-0">
        <div>
          <div className="text-[12px] leading-[16px] tracking-wider uppercase text-muted-foreground">Price</div>
          <div className="text-[14px] leading-[20px] text-foreground mt-0.5">螺纹钢 HRB400E 20mm</div>
        </div>
        <div className="text-[12px] leading-[16px] text-muted-foreground">14:32 · Mysteel</div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {items.map((it) => (
          <div key={it.city} className="px-5 py-3.5 flex items-center justify-between">
            <div className="text-[14px] leading-[20px] text-foreground">{it.city}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-[18px] tabular-nums text-foreground">¥{it.price.toLocaleString()}</div>
              <div className="flex items-center gap-0.5 text-[12px] leading-[16px] tabular-nums text-success">
                <ArrowUpRight className="size-3" strokeWidth={2} />
                {it.delta} ({it.pct}%)
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChartCard() {
  return (
    <Card className="rounded-xl border-border gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border flex-row items-center justify-between space-y-0">
        <div>
          <div className="text-[12px] leading-[16px] tracking-wider uppercase text-muted-foreground">Trend · 7D</div>
          <div className="text-[14px] leading-[20px] text-foreground mt-0.5">螺纹钢 · 上海</div>
        </div>
        <div className="text-right">
          <div className="text-[18px] tabular-nums text-foreground">¥3,850</div>
          <div className="text-[12px] leading-[16px] text-success tabular-nums">+1.80% · 周</div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-44 w-full px-2 pt-2 pb-3">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#a3a3a3" }} />
              <YAxis hide domain={[(min: number) => min - 20, (max: number) => max + 20]} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 2, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function QuoteCard() {
  const rows = [
    ["材料费", "¥385,000"],
    ["运费", "¥3,500"],
    ["税费 (13%)", "¥50,570"],
  ];
  return (
    <Card className="rounded-xl border-border gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border space-y-0">
        <div className="text-[12px] leading-[16px] tracking-wider uppercase text-muted-foreground">Quotation</div>
        <div className="text-[14px] leading-[20px] text-foreground mt-0.5">螺纹钢 HRB400E 20mm · 100 吨 · 上海</div>
      </CardHeader>
      <CardContent className="px-5 py-3 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-[14px] leading-[20px]">
            <span className="text-muted-foreground">{k}</span>
            <span className="text-foreground tabular-nums">{v}</span>
          </div>
        ))}
      </CardContent>
      <div className="px-5 py-4 border-t border-border flex justify-between items-baseline bg-muted">
        <span className="text-[12px] leading-[16px] text-muted-foreground">合计</span>
        <span className="text-[22px] tabular-nums text-foreground">¥444,070</span>
      </div>
    </Card>
  );
}

function TableCard() {
  const data = [
    { name: "Q235B", strength: "375-500", use: "建筑结构" },
    { name: "Q345B", strength: "470-630", use: "桥梁/船舶" },
    { name: "HRB400E", strength: "≥540", use: "抗震钢筋" },
  ];
  return (
    <Card className="rounded-xl border-border gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border space-y-0">
        <div className="text-[12px] leading-[16px] tracking-wider uppercase text-muted-foreground">Table</div>
        <div className="text-[14px] leading-[20px] text-foreground mt-0.5">常用牌号对照</div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="px-5 text-muted-foreground text-[12px] leading-[16px] tracking-wider uppercase h-9">牌号</TableHead>
            <TableHead className="px-5 text-muted-foreground text-[12px] leading-[16px] tracking-wider uppercase h-9">抗拉强度 MPa</TableHead>
            <TableHead className="px-5 text-muted-foreground text-[12px] leading-[16px] tracking-wider uppercase h-9">主要用途</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.name} className="border-border hover:bg-muted/50">
              <TableCell className="px-5 py-3 text-foreground text-[13px] leading-[18px]">{r.name}</TableCell>
              <TableCell className="px-5 py-3 text-foreground text-[13px] leading-[18px] tabular-nums">{r.strength}</TableCell>
              <TableCell className="px-5 py-3 text-muted-foreground text-[13px] leading-[18px]">{r.use}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ListCard() {
  const items = [
    { title: "中铁建华南公司螺纹钢采购招标", meta: "上海 · 截止 5/20", tag: "螺纹钢" },
    { title: "宝武集团 Q345B 板材年度协议", meta: "武汉 · 截止 5/22", tag: "板材" },
    { title: "广铁集团高铁专用钢轨招标", meta: "广州 · 截止 5/25", tag: "钢轨" },
  ];
  return (
    <Card className="rounded-xl border-border gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border flex-row items-center justify-between space-y-0">
        <div>
          <div className="text-[12px] leading-[16px] tracking-wider uppercase text-muted-foreground">List</div>
          <div className="text-[14px] leading-[20px] text-foreground mt-0.5">最新招标 · 3 条</div>
        </div>
        <Button variant="ghost" size="sm" className="text-[12px] leading-[16px] text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground">
          查看全部 <ChevronRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {items.map((it) => (
          <div key={it.title} className="px-5 py-3.5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[14px] leading-[20px] text-foreground truncate">{it.title}</div>
              <div className="text-[12px] leading-[16px] text-muted-foreground mt-0.5">{it.meta}</div>
            </div>
            <Badge variant="outline" className="rounded text-[12px] leading-[16px] border-border text-muted-foreground">
              {it.tag}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActionRow() {
  const actions = [
    { icon: BarChart3, label: "查看走势图" },
    { icon: Bell, label: "设置预警" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.label}
          variant="outline"
          size="sm"
          className="rounded-full border-border hover:border-primary hover:bg-transparent text-[13px] leading-[18px] h-8 px-3.5"
        >
          <a.icon className="size-3.5" strokeWidth={2} />
          {a.label}
        </Button>
      ))}
    </div>
  );
}

export function RichCards() {
  return (
    <Section
      id="03"
      title="富媒体卡片"
      desc="基于 shadcn Card / Table / Button / Badge 构建。所有卡片使用 12px 圆角 + 1px 描边，零阴影。"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Block label="价格卡 (Card + 自定义内容)">
          <PriceCard />
          <div className="mt-4">
            <ActionRow />
          </div>
        </Block>
        <Block label="走势图卡 (Card + recharts)">
          <ChartCard />
        </Block>
        <Block label="报价单卡 (Card)">
          <QuoteCard />
        </Block>
        <Block label="表格卡 (Card + Table)">
          <TableCard />
        </Block>
        <Block label="列表卡 (Card + Badge)" className="md:col-span-2">
          <ListCard />
        </Block>
      </div>
    </Section>
  );
}
