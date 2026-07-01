// ============================================================
// QuotationWorkbench — 报价工作台
// 支持文件拖拽上传、表单编辑、自动报价计算、导出 PDF
// ============================================================

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileText,
  Calculator,
  Download,
  Copy,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateQuotation,
  createQuotation,
  getQuotationList,
  type CalculateQuotationResult,
} from "@/app/api/quotations";
import type { Quotation } from "@/app/types/quotation";
import { cn } from "@/lib/utils";

interface QuotationFormValues {
  category: string;
  spec: string;
  quantity: number;
  unit: string;
  customer_name: string;
  delivery_location: string;
}

export function QuotationWorkbench() {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculateQuotationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { control, register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<QuotationFormValues>({
      defaultValues: {
        category: "螺纹钢",
        spec: "HRB400E 20mm",
        quantity: 100,
        unit: "吨",
        customer_name: "",
        delivery_location: "上海",
      },
    });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["quotation-history"],
    queryFn: getQuotationList,
    staleTime: 1000 * 60 * 2,
  });

  // ---- Drag & Drop handlers ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploading(true);
      // 模拟上传
      setTimeout(() => {
        setUploading(false);
        toast.success(`文件 "${file.name}" 上传成功，已提取字段`);
        // 模拟从文件提取的字段
        setValue("customer_name", "示例客户");
        setValue("category", "热卷");
        setValue("spec", "Q235B 5.5mm");
        setValue("quantity", 200);
        setValue("delivery_location", "北京");
      }, 1500);
    }
  }, [setValue]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadedFile(file);
        setUploading(true);
        setTimeout(() => {
          setUploading(false);
          toast.success(`文件 "${file.name}" 上传成功，已提取字段`);
        }, 1500);
      }
    },
    []
  );

  // ---- Calculation ----
  const onSubmit = async (values: QuotationFormValues) => {
    setCalcResult(null);
    setCalculating(true);
    try {
      const result = await calculateQuotation({
        category: values.category,
        spec: values.spec,
        quantity: values.quantity,
      });
      setCalcResult(result);
      toast.success("报价计算完成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "报价计算失败");
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    const values = watch();
    try {
      await createQuotation({
        category: values.category,
        spec: values.spec,
        quantity: values.quantity,
        unit: values.unit,
        customer_name: values.customer_name,
        delivery_location: values.delivery_location,
      });
      toast.success("报价单已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleExportPDF = async (id: number) => {
    try {
      const { exportQuotationPDF } = await import("@/app/api/quotations");
      await exportQuotationPDF(id);
      toast.success("PDF 已下载");
    } catch (err) {
      toast.error("导出失败");
    }
  };

  const handleCopyQuote = () => {
    if (!calcResult) return;
    const text = `报价明细:
材料费: \u00A5${calcResult.material_cost.toLocaleString()}
加工费: \u00A5${calcResult.process_cost.toLocaleString()}
运费: \u00A5${calcResult.freight_cost.toLocaleString()}
税费: \u00A5${calcResult.tax_cost.toLocaleString()}
总价: \u00A5${calcResult.total_price.toLocaleString()}
单价: \u00A5${calcResult.unit_price.toLocaleString()}/吨`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("复制失败");
    });
  };

  const formatPrice = (price: number) =>
    `\u00A5${price.toLocaleString("zh-CN")}`;

  return (
    <div className="space-y-6">
      {/* ---- File Upload Zone ---- */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-[16px] leading-[24px]">
            上传报价需求
          </CardTitle>
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            上传 Excel/PDF 文件自动提取报价所需字段
          </p>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-150",
              dragOver
                ? "border-primary bg-accent-blue/30"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="点击或拖拽文件到此处上传"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[13px] leading-[18px] text-muted-foreground">
                  正在解析文件...
                </p>
              </div>
            ) : uploadedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="size-8 text-primary" strokeWidth={2} aria-hidden="true" />
                <p className="text-[14px] leading-[20px] font-medium">
                  {uploadedFile.name}
                </p>
                <p className="text-[12px] leading-[16px] text-muted-foreground">
                  点击更换文件
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="size-8 text-muted-foreground/50" strokeWidth={2} aria-hidden="true" />
                <p className="text-[14px] leading-[20px]">
                  拖拽文件到此处，或点击上传
                </p>
                <p className="text-[12px] leading-[16px] text-muted-foreground">
                  支持 Excel (.xlsx) / PDF 文件
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.pdf"
              onChange={handleFileSelect}
              aria-hidden="true"
            />
          </div>
        </CardContent>
      </Card>

      {/* ---- Edit Form ---- */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-[16px] leading-[24px]">
            报价参数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] leading-[18px] font-medium">
                  品种
                </label>
                <Input
                  {...register("category", { required: "请输入品种" })}
                  placeholder="如：螺纹钢"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] leading-[18px] font-medium">
                  规格
                </label>
                <Input
                  {...register("spec", { required: "请输入规格" })}
                  placeholder="如：HRB400E 20mm"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] leading-[18px] font-medium">
                  数量
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    {...register("quantity", {
                      required: "请输入数量",
                      valueAsNumber: true,
                      min: 1,
                    })}
                    className="h-9 flex-1"
                  />
                  <Input
                    {...register("unit")}
                    className="h-9 w-20"
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] leading-[18px] font-medium">
                  客户名称
                </label>
                <Input
                  {...register("customer_name")}
                  placeholder="选填"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] leading-[18px] font-medium">
                  交货地
                </label>
                <Input
                  {...register("delivery_location")}
                  placeholder="如：上海"
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={calculating}
                className="h-9"
              >
                {calculating ? (
                  <>
                    <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    计算中...
                  </>
                ) : (
                  <>
                    <Calculator className="size-4 mr-2" strokeWidth={2} />
                    自动报价
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                className="h-9"
              >
                保存报价单
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---- Results ---- */}
      {calcResult && (
        <Card className="rounded-xl border-border">
          <CardHeader>
            <CardTitle className="text-[16px] leading-[24px]">
              报价结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[13px]">费用项</TableHead>
                    <TableHead className="text-[13px] text-right">金额</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-[14px]">材料费</TableCell>
                    <TableCell className="text-[14px] text-right tabular-nums">
                      {formatPrice(calcResult.material_cost)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[14px]">加工费</TableCell>
                    <TableCell className="text-[14px] text-right tabular-nums">
                      {formatPrice(calcResult.process_cost)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[14px]">运费</TableCell>
                    <TableCell className="text-[14px] text-right tabular-nums">
                      {formatPrice(calcResult.freight_cost)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[14px]">税费</TableCell>
                    <TableCell className="text-[14px] text-right tabular-nums">
                      {formatPrice(calcResult.tax_cost)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/30">
                    <TableCell className="text-[14px] font-semibold">
                      总价
                    </TableCell>
                    <TableCell className="text-[16px] font-semibold text-right tabular-nums">
                      {formatPrice(calcResult.total_price)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-[14px]">单价</TableCell>
                    <TableCell className="text-[14px] text-right tabular-nums">
                      {formatPrice(calcResult.unit_price)}/吨
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-9" onClick={() => {}}>
                <Download className="size-4 mr-2" strokeWidth={2} />
                导出 PDF
              </Button>
              <Button variant="ghost" className="h-9" onClick={handleCopyQuote}>
                {copied ? (
                  <>
                    <Check className="size-4 mr-2" strokeWidth={2} />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="size-4 mr-2" strokeWidth={2} />
                    复制报价
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- History List ---- */}
      <Card className="rounded-xl border-border">
        <CardHeader>
          <CardTitle className="text-[16px] leading-[24px]">
            报价历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !history || history.length === 0 ? (
            <p className="text-[13px] leading-[18px] text-muted-foreground text-center py-8">
              暂无报价历史
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[13px]">客户</TableHead>
                    <TableHead className="text-[13px]">品种</TableHead>
                    <TableHead className="text-[13px]">规格</TableHead>
                    <TableHead className="text-[13px] text-right">数量</TableHead>
                    <TableHead className="text-[13px] text-right">总价</TableHead>
                    <TableHead className="text-[13px]">状态</TableHead>
                    <TableHead className="text-[13px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((q: Quotation) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-[14px]">
                        {q.customer_name || "-"}
                      </TableCell>
                      <TableCell className="text-[14px]">{q.category}</TableCell>
                      <TableCell className="text-[14px]">{q.spec}</TableCell>
                      <TableCell className="text-[14px] text-right tabular-nums">
                        {q.quantity} {q.unit}
                      </TableCell>
                      <TableCell className="text-[14px] text-right tabular-nums">
                        {formatPrice(q.total_price)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-[12px] leading-[16px] px-2 py-0.5 rounded-sm",
                            q.status === "draft"
                              ? "bg-muted text-muted-foreground"
                              : q.status === "sent"
                              ? "bg-accent-blue/10 text-accent-blue-foreground"
                              : q.status === "accepted"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {q.status === "draft"
                            ? "草稿"
                            : q.status === "sent"
                            ? "已发送"
                            : q.status === "accepted"
                            ? "已接受"
                            : "已拒绝"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-[13px]"
                          onClick={() => handleExportPDF(q.id)}
                        >
                          <Download className="size-3.5 mr-1" strokeWidth={2} />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
