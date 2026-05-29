import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface PriceImportRow {
  category: string;
  spec: string;
  price: number;
  change: number;
  change_pct: number;
  region: string;
  source: string;
  price_date: string;
}

export interface PriceImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (prices: PriceImportRow[]) => Promise<void>;
}

const IMPORT_EXAMPLE = `[
  { "category": "螺纹钢", "spec": "HRB400E 20mm", "price": 3850, "change": 12, "change_pct": 0.31, "region": "上海", "source": "Wind", "price_date": "2026-05-26" },
  { "category": "热卷", "spec": "Q235B 5.5mm", "price": 3920, "change": -8, "change_pct": -0.20, "region": "上海", "source": "Wind", "price_date": "2026-05-26" }
]`;

export default function PriceImportDialog({
  open,
  onClose,
  onImport,
}: PriceImportDialogProps) {
  const [jsonText, setJsonText] = useState("");
  const [preview, setPreview] = useState<PriceImportRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    setParseError(null);
    setPreview(null);

    if (!jsonText.trim()) {
      setParseError("请输入 JSON 数据");
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setParseError("JSON 必须是一个数组");
        return;
      }
      if (parsed.length === 0) {
        setParseError("数组不能为空");
        return;
      }

      // Validate each row has required fields
      for (let i = 0; i < parsed.length; i++) {
        const row = parsed[i];
        if (!row.category || typeof row.category !== "string") {
          setParseError(`第 ${i + 1} 行缺少有效的 category 字段`);
          return;
        }
        if (row.price === undefined || row.price === null || typeof row.price !== "number") {
          setParseError(`第 ${i + 1} 行缺少有效的 price 字段`);
          return;
        }
        // Ensure numeric fields are numbers
        row.change = typeof row.change === "number" ? row.change : 0;
        row.change_pct = typeof row.change_pct === "number" ? row.change_pct : 0;
      }

      setPreview(parsed as PriceImportRow[]);
    } catch (err: any) {
      setParseError(`JSON 解析失败：${err.message || "格式错误"}`);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    try {
      await onImport(preview);
      setJsonText("");
      setPreview(null);
      setParseError(null);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      setJsonText("");
      setPreview(null);
      setParseError(null);
      onClose();
    }
  };

  const previewColumns = [
    { key: "category", label: "品种" },
    { key: "spec", label: "规格" },
    { key: "region", label: "地区" },
    { key: "price", label: "价格", render: (v: number) => `¥${v.toLocaleString()}` },
    { key: "change", label: "涨跌额", render: (v: number) => `${v > 0 ? "+" : ""}${v}` },
    { key: "change_pct", label: "涨跌幅", render: (v: number) => `${v > 0 ? "+" : ""}${v}%` },
    { key: "source", label: "来源" },
    { key: "price_date", label: "日期" },
  ];

  const textareaClass = cn(
    "w-full min-h-[180px] rounded-[10px] border border-steel-line bg-steel-canvas",
    "p-3 text-[13px] leading-[1.6] text-steel-ink font-mono",
    "placeholder:text-steel-placeholder",
    "outline-none transition-colors duration-200 resize-y",
    "focus:border-steel-ink focus:ring-4 focus:ring-steel-ink/5",
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={cn(
          "bg-steel-canvas border border-steel-line rounded-2xl",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "p-6 max-w-[640px] max-h-[90vh] overflow-y-auto",
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-[16px] leading-[1.4] font-medium text-steel-ink">
            批量导入价格
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.6] text-steel-muted">
            粘贴 JSON 数组格式的价格数据，每行包含品种、规格、价格等字段
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Textarea */}
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setParseError(null);
              setPreview(null);
            }}
            placeholder={IMPORT_EXAMPLE}
            className={textareaClass}
          />

          {/* Format hint */}
          <details className="group">
            <summary className="text-[12px] text-steel-muted cursor-pointer hover:text-steel-body transition-colors duration-150">
              查看格式说明
            </summary>
            <pre className="mt-2 p-3 rounded-[10px] bg-steel-surface border border-steel-line text-[12px] leading-[1.6] text-steel-body overflow-x-auto">
              {IMPORT_EXAMPLE}
            </pre>
          </details>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-[10px] bg-steel-down/5 border border-steel-down/20">
              <span className="text-[13px] leading-[1.5] text-steel-down">{parseError}</span>
            </div>
          )}

          {/* Parse button */}
          {!preview && (
            <button
              onClick={handleParse}
              disabled={!jsonText.trim()}
              className={cn(
                "h-9 px-4 rounded-full",
                "border border-steel-line",
                "bg-steel-canvas text-steel-ink text-[13px] leading-[1.5]",
                "hover:bg-steel-surface hover:border-steel-ink",
                "transition-colors duration-150",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              解析预览
            </button>
          )}

          {/* Preview table */}
          {preview && preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-steel-body">
                  共 <span className="font-medium text-steel-ink">{preview.length}</span> 条待导入
                </span>
                <button
                  onClick={() => {
                    setPreview(null);
                    setParseError(null);
                  }}
                  disabled={importing}
                  className="text-[12px] text-steel-muted hover:text-steel-ink transition-colors duration-150 disabled:opacity-50"
                >
                  重新编辑
                </button>
              </div>
              <div className="border border-steel-line rounded-lg overflow-hidden max-h-[240px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0">
                    <tr className="border-b border-steel-line bg-steel-surface">
                      {previewColumns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2 text-left text-[11px] leading-[1.5] text-steel-muted font-normal whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-line">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {previewColumns.map((col) => (
                          <td
                            key={col.key}
                            className="px-3 py-2 text-[12px] leading-[1.5] text-steel-body whitespace-nowrap"
                          >
                            {col.render
                              ? col.render((row as any)[col.key])
                              : (row as any)[col.key] ?? "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          <button
            onClick={handleClose}
            disabled={importing}
            className={cn(
              "h-9 px-4 rounded-full",
              "border border-steel-line",
              "bg-steel-canvas text-steel-ink text-[13px] leading-[1.5]",
              "hover:bg-steel-surface",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-steel-ink/10",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            取消
          </button>
          {preview && preview.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className={cn(
                "h-9 px-4 rounded-full",
                "bg-steel-ink text-white text-[13px] leading-[1.5] font-medium",
                "hover:bg-steel-body",
                "transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-steel-ink/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  导入中...
                </span>
              ) : (
                `导入 ${preview.length} 条`
              )}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
