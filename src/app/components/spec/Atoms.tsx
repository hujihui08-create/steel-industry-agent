import { Section, Block } from "./Section";
import { Check, Search, AlertCircle, Info } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Alert, AlertDescription } from "../ui/alert";
import { Skeleton } from "../ui/skeleton";

export function Atoms() {
  return (
    <Section
      id="05"
      title="基础原子"
      desc="按钮、徽标、状态、提示等基础元素，全部基于 shadcn/ui 实现，通过 className 适配极简风。"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Block label="按钮 / Button (shadcn)">
          <div className="space-y-3">
            <Button className="w-full rounded-full bg-neutral-900 hover:bg-neutral-800">
              主要按钮 Primary
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full border-neutral-300 hover:border-neutral-900 hover:bg-transparent"
            >
              次要按钮 Secondary
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-full text-neutral-500 hover:text-neutral-900 hover:bg-transparent"
            >
              文本按钮 Ghost
            </Button>
            <Button disabled className="w-full rounded-full">
              禁用 Disabled
            </Button>
          </div>
        </Block>

        <Block label="徽标 / Badge (shadcn)">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded">默认</Badge>
            <Badge className="rounded bg-neutral-900 hover:bg-neutral-900">P0</Badge>
            <Badge variant="outline" className="rounded border-emerald-200 bg-emerald-50 text-emerald-700">
              ↑ 涨
            </Badge>
            <Badge variant="outline" className="rounded border-rose-200 bg-rose-50 text-rose-700">
              ↓ 跌
            </Badge>
            <Badge variant="outline" className="rounded gap-1 bg-neutral-50 text-neutral-600">
              <span className="size-1.5 rounded-full bg-emerald-500" /> 在线
            </Badge>
          </div>
        </Block>

        <Block label="输入框 / Input (shadcn)">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" strokeWidth={1.75} />
              <Input
                placeholder="搜索品种、牌号、地区"
                className="pl-9 rounded-lg bg-white border-neutral-200"
              />
            </div>
            <Input
              defaultValue="HRB400E"
              className="rounded-lg bg-white border-neutral-900"
            />
          </div>
        </Block>

        <Block label="开关 & 选择 (shadcn Switch)">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-neutral-700">价格波动提醒</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-neutral-700">语音输入</span>
              <Switch />
            </div>
            <div className="flex flex-wrap gap-2">
              {["螺纹钢", "热卷", "中厚板"].map((t, i) => (
                <Button
                  key={t}
                  size="sm"
                  variant={i === 0 ? "default" : "secondary"}
                  className={
                    i === 0
                      ? "rounded-full bg-neutral-900 hover:bg-neutral-800 h-7 text-[12px]"
                      : "rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 h-7 text-[12px]"
                  }
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
        </Block>

        <Block label="提示 / Alert (shadcn)">
          <div className="space-y-3">
            <Alert className="rounded-lg border-neutral-200 bg-neutral-50">
              <Info className="size-4 text-neutral-500" strokeWidth={1.75} />
              <AlertDescription className="text-neutral-700">
                数据来源 Mysteel，仅供参考，请以实际成交价为准。
              </AlertDescription>
            </Alert>
            <Alert className="rounded-lg border-amber-200 bg-amber-50 [&>svg]:text-amber-600">
              <AlertCircle className="size-4" strokeWidth={1.75} />
              <AlertDescription className="text-amber-900">
                AI 生成内容可能不准确，重要决策请人工核实。
              </AlertDescription>
            </Alert>
          </div>
        </Block>

        <Block label="加载 & 空态 (shadcn Skeleton)">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-3/4 bg-neutral-100" />
              <Skeleton className="h-3 w-full bg-neutral-100" />
              <Skeleton className="h-3 w-1/2 bg-neutral-100" />
            </div>
            <div className="text-center py-6 border border-dashed border-neutral-200 rounded-lg">
              <div className="size-10 mx-auto rounded-full bg-neutral-50 border border-neutral-200" />
              <div className="mt-2 text-[13px] text-neutral-500">暂无数据</div>
              <Button
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-[12px] text-neutral-500"
              >
                <Check className="size-3 mr-1" /> 重新加载
              </Button>
            </div>
          </div>
        </Block>
      </div>
    </Section>
  );
}
