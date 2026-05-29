import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface PriceFormData {
  category: string;
  spec: string;
  region: string;
  price: number;
  change: number;
  change_pct: number;
  source: string;
  price_date: string;
}

export interface PriceFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: PriceFormData) => Promise<void>;
  initialData?: PriceFormData;
}

const DEFAULT_FORM_DATA: PriceFormData = {
  category: "",
  spec: "",
  region: "",
  price: 0,
  change: 0,
  change_pct: 0,
  source: "",
  price_date: new Date().toISOString().slice(0, 10),
};

export default function PriceFormDialog({
  open,
  onClose,
  onSave,
  initialData,
}: PriceFormDialogProps) {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState<PriceFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFormData(initialData ?? { ...DEFAULT_FORM_DATA });
      setErrors({});
      setSaving(false);
    }
  }, [open, initialData]);

  const updateField = useCallback(
    (field: keyof PriceFormData, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.category.trim()) errs.category = "品种不能为空";
    if (formData.price === 0 && !formData.price) errs.price = "价格不能为空";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    "w-full h-10 rounded-[10px] border border-steel-line bg-steel-canvas",
    "px-3 text-[14px] leading-[1.5] text-steel-ink",
    "placeholder:text-steel-placeholder",
    "outline-none transition-colors duration-200",
    "focus:border-steel-ink focus:ring-4 focus:ring-steel-ink/5",
  );

  const inputErrorClass = "border-steel-down focus:border-steel-down focus:ring-steel-down/10";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "bg-steel-canvas border border-steel-line rounded-2xl",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "p-6 max-w-[480px]",
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-[16px] leading-[1.4] font-medium text-steel-ink">
            {isEdit ? "编辑价格" : "新增价格"}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-[1.6] text-steel-muted">
            {isEdit ? "修改钢材价格信息" : "添加一条新的钢材价格记录"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* category */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              品种 <span className="text-steel-down">*</span>
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="如：螺纹钢"
              className={cn(inputClass, errors.category && inputErrorClass)}
            />
            {errors.category && (
              <p className="text-[12px] text-steel-down mt-1">{errors.category}</p>
            )}
          </div>

          {/* spec */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              规格
            </label>
            <input
              type="text"
              value={formData.spec}
              onChange={(e) => updateField("spec", e.target.value)}
              placeholder="如：HRB400E 20mm"
              className={inputClass}
            />
          </div>

          {/* region */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              地区
            </label>
            <input
              type="text"
              value={formData.region}
              onChange={(e) => updateField("region", e.target.value)}
              placeholder="如：上海"
              className={inputClass}
            />
          </div>

          {/* price */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              价格 <span className="text-steel-down">*</span>
            </label>
            <input
              type="number"
              value={formData.price || ""}
              onChange={(e) => updateField("price", parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={cn(inputClass, errors.price && inputErrorClass)}
            />
            {errors.price && (
              <p className="text-[12px] text-steel-down mt-1">{errors.price}</p>
            )}
          </div>

          {/* change */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              涨跌额
            </label>
            <input
              type="number"
              value={formData.change}
              onChange={(e) => updateField("change", parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={inputClass}
            />
          </div>

          {/* change_pct */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              涨跌幅
            </label>
            <input
              type="number"
              value={formData.change_pct}
              onChange={(e) => updateField("change_pct", parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={inputClass}
            />
          </div>

          {/* source */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              来源
            </label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => updateField("source", e.target.value)}
              placeholder="如：Wind 终端"
              className={inputClass}
            />
          </div>

          {/* price_date */}
          <div className="col-span-1">
            <label className="block text-[13px] leading-[1.5] text-steel-body mb-1.5">
              日期
            </label>
            <input
              type="date"
              value={formData.price_date}
              onChange={(e) => updateField("price_date", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <button
            onClick={onClose}
            disabled={saving}
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
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "h-9 px-4 rounded-full",
              "bg-steel-ink text-white text-[13px] leading-[1.5] font-medium",
              "hover:bg-steel-body",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-steel-ink/10",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                保存中...
              </span>
            ) : (
              isEdit ? "更新" : "创建"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
