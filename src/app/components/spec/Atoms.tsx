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
            <Button className="w-full rounded-full bg-primary hover:bg-primary/90">
              主要按钮 Primary
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full border-border hover:border-primary hover:bg-transparent"
            >
              次要按钮 Secondary
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-full text-muted-foreground hover:text-foreground hover:bg-transparent"
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
            <Badge className="rounded bg-primary hover:bg-primary">P0</Badge>
            <Badge variant="outline" className="rounded border-success/20 bg-success/10 text-success">
              ↑ 涨
            </Badge>
            <Badge variant="outline" className="rounded border-destructive/20 bg-destructive/10 text-destructive">
              ↓ 跌
            </Badge>
            <Badge variant="outline" className="rounded gap-1 bg-muted/50 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" /> 在线
            </Badge>
          </div>
        </Block>

        <Block label="输入框 / Input (shadcn)">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={2} />
              <Input
                placeholder="搜索品种、牌号、地区"
                className="pl-9 rounded-md bg-card border-border"
              />
            </div>
            <Input
              defaultValue="HRB400E"
              className="rounded-md bg-card border-primary"
            />
          </div>
        </Block>

        <Block label="开关 & 选择 (shadcn Switch)">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] leading-[20px] text-foreground">价格波动提醒</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] leading-[20px] text-foreground">语音输入</span>
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
                      ? "rounded-full bg-primary hover:bg-primary/90 h-7 text-[12px] leading-[16px]"
                      : "rounded-full bg-muted hover:bg-muted/80 text-foreground h-7 text-[12px] leading-[16px]"
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
            <Alert className="rounded-md border-border bg-muted">
              <Info className="size-4 text-muted-foreground" strokeWidth={2} />
              <AlertDescription className="text-foreground">
                数据来源 Mysteel，仅供参考，请以实际成交价为准。
              </AlertDescription>
            </Alert>
            <Alert className="rounded-md border-amber-200 bg-amber-50 [&>svg]:text-amber-600">
              <AlertCircle className="size-4" strokeWidth={2} />
              <AlertDescription className="text-amber-900">
                AI 生成内容可能不准确，重要决策请人工核实。
              </AlertDescription>
            </Alert>
          </div>
        </Block>

        <Block label="加载 & 空态 (shadcn Skeleton)">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-3/4 bg-muted" />
              <Skeleton className="h-3 w-full bg-muted" />
              <Skeleton className="h-3 w-1/2 bg-muted" />
            </div>
            <div className="text-center py-6 border border-dashed border-border rounded-md">
              <div className="size-10 mx-auto rounded-full bg-muted border border-border" />
              <div className="mt-2 text-[13px] leading-[18px] text-muted-foreground">暂无数据</div>
              <Button
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-[12px] leading-[16px] text-muted-foreground"
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
