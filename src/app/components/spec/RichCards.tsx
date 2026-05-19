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
    <Card className="rounded-2xl border-neutral-200 gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-neutral-100 flex-row items-center justify-between space-y-0">
        <div>
          <div className="text-[11px] tracking-wider uppercase text-neutral-400">Price</div>
          <div className="text-[15px] text-neutral-900 mt-0.5">螺纹钢 HRB400E 20mm</div>
        </div>
        <div className="text-[11px] text-neutral-400">14:32 · Mysteel</div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-neutral-100">
        {items.map((it) => (
          <div key={it.city} className="px-5 py-3.5 flex items-center justify-between">
            <div className="text-[14px] text-neutral-700">{it.city}</div>
            <div className="flex items-baseline gap-3">
              <div className="text-[18px] tabular-nums text-neutral-900">¥{it.price.toLocaleString()}</div>
              <div className="flex items-center gap-0.5 text-[12px] tabular-nums text-emerald-700">
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
    <Card className="rounded-2xl border-neutral-200 gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-neutral-100 flex-row items-center justify-between space-y-0">
        <div>
          <div className="text-[11px] tracking-wider uppercase text-neutral-400">Trend · 7D</div>
          <div className="text-[15px] text-neutral-900 mt-0.5">螺纹钢 · 上海</div>
        </div>
        <div className="text-right">
          <div className="text-[18px] tabular-nums text-neutral-900">¥3,850</div>
          <div className="text-[11px] text-emerald-700 tabular-nums">+1.80% · 周</div>
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
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#737373" }}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#0a0a0a"
                strokeWidth={1.5}
                dot={{ r: 2, fill: "#0a0a0a" }}
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
    <Card className="rounded-2xl border-neutral-200 gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-neutral-100 space-y-0">
        <div className="text-[11px] tracking-wider uppercase text-neutral-400">Quotation</div>
        <div className="text-[15px] text-neutral-900 mt-0.5">螺纹钢 HRB400E 20mm · 100 吨 · 上海</div>
      </CardHeader>
      <CardContent className="px-5 py-3 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-[14px]">
            <span className="text-neutral-500">{k}</span>
            <span className="text-neutral-800 tabular-nums">{v}</span>
          </div>
        ))}
      </CardContent>
      <div className="px-5 py-4 border-t border-neutral-100 flex justify-between items-baseline bg-neutral-50">
        <span className="text-[12px] text-neutral-500">合计</span>
        <span className="text-[22px] tabular-nums text-neutral-900">¥444,070</span>
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
    <Card className="rounded-2xl border-neutral-200 gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-neutral-100 space-y-0">
        <div className="text-[11px] tracking-wider uppercase text-neutral-400">Table</div>
        <div className="text-[15px] text-neutral-900 mt-0.5">常用牌号对照</div>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-neutral-100">
            <TableHead className="px-5 text-neutral-400 text-[11px] tracking-wider uppercase h-9">牌号</TableHead>
            <TableHead className="px-5 text-neutral-400 text-[11px] tracking-wider uppercase h-9">抗拉强度 MPa</TableHead>
            <TableHead className="px-5 text-neutral-400 text-[11px] tracking-wider uppercase h-9">主要用途</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.name} className="border-neutral-100 hover:bg-neutral-50/50">
              <TableCell className="px-5 py-3 text-neutral-800 text-[13px]">{r.name}</TableCell>
              <TableCell className="px-5 py-3 text-neutral-800 text-[13px] tabular-nums">{r.strength}</TableCell>
              <TableCell className="px-5 py-3 text-neutral-500 text-[13px]">{r.use}</TableCell>
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
    <Card className="rounded-2xl border-neutral-200 gap-0 py-0 overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-neutral-100 flex-row items-center justify-between space-y-0">
        <div>
          <div className="text-[11px] tracking-wider uppercase text-neutral-400">List</div>
          <div className="text-[15px] text-neutral-900 mt-0.5">最新招标 · 3 条</div>
        </div>
        <Button variant="ghost" size="sm" className="text-[12px] text-neutral-500 h-auto p-0 hover:bg-transparent hover:text-neutral-900">
          查看全部 <ChevronRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-neutral-100">
        {items.map((it) => (
          <div key={it.title} className="px-5 py-3.5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[14px] text-neutral-900 truncate">{it.title}</div>
              <div className="text-[12px] text-neutral-500 mt-0.5">{it.meta}</div>
            </div>
            <Badge variant="outline" className="rounded text-[11px] border-neutral-200 text-neutral-600">
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
          className="rounded-full border-neutral-200 hover:border-neutral-900 hover:bg-transparent text-[13px] h-8 px-3.5"
        >
          <a.icon className="size-3.5" strokeWidth={1.75} />
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
      desc="基于 shadcn Card / Table / Button / Badge 构建。所有卡片使用 24px 圆角 + 1px 描边，零阴影。"
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
