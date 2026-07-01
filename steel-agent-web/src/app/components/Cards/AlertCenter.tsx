// ============================================================
// AlertCenter — 预警中心
// 统计卡片 + 预警规则列表 (Table + Switch) + 创建/编辑 Dialog + 触发历史 Timeline
// ============================================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Plus, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getAlertList,
  createAlert,
  updateAlert,
  deleteAlert,
  type CreateAlertParams,
} from "@/app/api/alerts";
import type { PriceAlert } from "@/app/types/alert";
import { cn } from "@/lib/utils";

export function AlertCenter() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState("螺纹钢");
  const [formSpec, setFormSpec] = useState("");
  const [formRegion, setFormRegion] = useState("上海");
  const [formPrice, setFormPrice] = useState(0);
  const [formCondition, setFormCondition] = useState<"above" | "below">("above");

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alert-list"],
    queryFn: getAlertList,
    staleTime: 1000 * 60 * 2,
  });

  const createMutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-list"] });
      toast.success("预警规则已创建");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateAlert(id, { is_active: isActive } as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-list"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-list"] });
      toast.success("预警已删除");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setFormCategory("螺纹钢");
    setFormSpec("");
    setFormRegion("上海");
    setFormPrice(0);
    setFormCondition("above");
    setEditingAlert(null);
  };

  const handleEdit = (alert: PriceAlert) => {
    setEditingAlert(alert);
    setFormCategory(alert.category);
    setFormSpec(alert.spec);
    setFormRegion(alert.region);
    setFormPrice(alert.target_price);
    setFormCondition(alert.condition);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const params: CreateAlertParams = {
      category: formCategory,
      spec: formSpec,
      region: formRegion,
      target_price: formPrice,
      condition: formCondition,
    };
    createMutation.mutate(params);
  };

  const activeCount = alerts?.filter((a) => a.is_active).length || 0;
  const totalCount = alerts?.length || 0;

  const formatPrice = (price: number) =>
    `\u00A5${price.toLocaleString("zh-CN")}`;

  return (
    <div className="space-y-6">
      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-accent-blue/10 flex items-center justify-center" aria-hidden="true">
                <Bell className="size-5 text-accent-blue-foreground" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] leading-[16px] tracking-[0.18em] uppercase text-muted-foreground">
                  活跃预警
                </p>
                <p className="text-[24px] leading-[32px] font-semibold tabular-nums">
                  {activeCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-accent-emerald/10 flex items-center justify-center" aria-hidden="true">
                <CheckCircle2 className="size-5 text-accent-emerald-foreground" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] leading-[16px] tracking-[0.18em] uppercase text-muted-foreground">
                  今日触发
                </p>
                <p className="text-[24px] leading-[32px] font-semibold tabular-nums">
                  0
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-md bg-muted/50 flex items-center justify-center" aria-hidden="true">
                <Clock className="size-5 text-muted-foreground" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[11px] leading-[16px] tracking-[0.18em] uppercase text-muted-foreground">
                  总计规则
                </p>
                <p className="text-[24px] leading-[32px] font-semibold tabular-nums">
                  {totalCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Alert Rules List ---- */}
      <Card className="rounded-xl border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[16px] leading-[24px]">
            预警规则
          </CardTitle>
          <Button
            className="h-9"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4 mr-2" strokeWidth={2} />
            新建规则
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="size-8 text-muted-foreground/40 mb-3" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-[14px] leading-[20px] text-muted-foreground">
                暂无预警规则
              </p>
              <p className="text-[13px] leading-[18px] text-muted-foreground mt-1">
                点击"新建规则"开始设置价格预警
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[13px]">品种</TableHead>
                    <TableHead className="text-[13px]">规格</TableHead>
                    <TableHead className="text-[13px]">区域</TableHead>
                    <TableHead className="text-[13px]">条件</TableHead>
                    <TableHead className="text-[13px] text-right">目标价</TableHead>
                    <TableHead className="text-[13px]">状态</TableHead>
                    <TableHead className="text-[13px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="text-[14px] leading-[20px]">
                        {alert.category}
                      </TableCell>
                      <TableCell className="text-[13px] leading-[18px] text-muted-foreground">
                        {alert.spec}
                      </TableCell>
                      <TableCell className="text-[13px] leading-[18px]">
                        {alert.region}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[12px] leading-[16px]",
                            alert.condition === "above"
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {alert.condition === "above" ? "高于" : "低于"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[14px] leading-[20px] text-right tabular-nums">
                        {formatPrice(alert.target_price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={alert.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({
                                id: alert.id,
                                isActive: checked,
                              })
                            }
                            aria-label={`${alert.is_active ? "禁用" : "启用"}预警`}
                          />
                          <span
                            className={cn(
                              "text-[12px] leading-[16px]",
                              alert.is_active
                                ? "text-success"
                                : "text-muted-foreground"
                            )}
                          >
                            {alert.is_active ? "已开启" : "已关闭"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[13px]"
                            onClick={() => handleEdit(alert)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[13px] text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(alert.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Trigger History Timeline ---- */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-[16px] leading-[24px]">
            触发历史
          </CardTitle>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            最近价格预警触发记录
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 border-l-2 border-muted space-y-6">
            {/* Sample timeline items */}
            {[
              {
                date: "2026-07-01 14:30",
                title: "螺纹钢 HRB400E 触发预警",
                description: "上海地区价格 3,780元/吨，低于目标价 3,800元/吨",
                type: "below",
              },
              {
                date: "2026-06-28 09:15",
                title: "热卷 Q235B 触发预警",
                description: "广州地区价格 4,150元/吨，高于目标价 4,100元/吨",
                type: "above",
              },
              {
                date: "2026-06-25 16:00",
                title: "冷轧 DC01 触发预警",
                description: "上海地区价格 5,320元/吨，高于目标价 5,300元/吨",
                type: "above",
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                {/* Dot on the timeline */}
                <div
                  className={cn(
                    "absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-card",
                    item.type === "above"
                      ? "bg-success"
                      : "bg-destructive"
                  )}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[12px] leading-[16px] text-muted-foreground">
                    {item.date}
                  </p>
                  <p className="text-[14px] leading-[20px] font-medium mt-0.5">
                    {item.title}
                  </p>
                  <p className="text-[13px] leading-[18px] text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Empty state for no triggers */}
            <div className="relative">
              <div
                className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-card bg-muted-foreground/30"
                aria-hidden="true"
              />
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                无更多记录
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Create/Edit Dialog ---- */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[16px] leading-[24px]">
              {editingAlert ? "编辑预警规则" : "新建预警规则"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] leading-[18px] font-medium">
                品种
              </label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板"].map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] leading-[18px] font-medium">
                规格
              </label>
              <Input
                value={formSpec}
                onChange={(e) => setFormSpec(e.target.value)}
                placeholder="如: HRB400E 20mm"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] leading-[18px] font-medium">
                区域
              </label>
              <Select value={formRegion} onValueChange={setFormRegion}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["上海", "北京", "广州", "杭州", "南京", "武汉", "成都"].map(
                    (r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] leading-[18px] font-medium">
                条件
              </label>
              <Select
                value={formCondition}
                onValueChange={(v) => setFormCondition(v as "above" | "below")}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">价格高于</SelectItem>
                  <SelectItem value="below">价格低于</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] leading-[18px] font-medium">
                目标价格 (元/吨)
              </label>
              <Input
                type="number"
                value={formPrice || ""}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                placeholder="如: 3800"
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="h-9"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              className="h-9"
              onClick={handleSave}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
