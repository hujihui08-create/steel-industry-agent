// ============================================================
// AlertListPage — 价格预警列表页
// 展示用户设置的所有价格预警，支持查看与删除
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// 允许例外的 destructive 操作使用 down 色 (#B42318)
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { useAlertStore } from "@/app/stores/alertStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PriceAlert } from "@/app/types/alert";

// ============================================================
// Helpers
// ============================================================

/** 将条件枚举转为显示符号 */
function conditionSymbol(condition: "above" | "below"): string {
  return condition === "above" ? "\u2265" : "\u2264";
}

/** 格式化日期为 时:分 · 月日 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const M = d.getMonth() + 1;
  const D = d.getDate();
  return `${hh}:${mm} \u00B7 ${M}\u6708${D}\u65E5`;
}

/** 格式化价格为千分位 */
function formatPrice(price: number): string {
  return `\u00A5${price.toLocaleString()}`;
}

// ============================================================
// Component
// ============================================================

export default function AlertListPage() {
  const navigate = useNavigate();
  const { alerts, isLoading, error, fetchAlerts, deleteAlert } =
    useAlertStore();

  const [deleteTarget, setDeleteTarget] = useState<PriceAlert | null>(null);

  // ---- Initial fetch ----
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ---- Handlers ----
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAlert(deleteTarget.id);
      toast("已删除");
    } catch {
      toast("删除失败，请重试");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRetry = () => {
    fetchAlerts();
  };

  // ==========================================================
  // Render Helpers
  // ==========================================================

  function renderStatusBadge(isActive: boolean) {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] leading-[1.5] text-steel-up">
          <span className="w-1.5 h-1.5 rounded-full bg-steel-up" />
          生效中
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] leading-[1.5] text-steel-muted">
        <span className="w-1.5 h-1.5 rounded-full border border-steel-placeholder" />
        已关闭
      </span>
    );
  }

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="flex flex-col h-full bg-steel-canvas">
      {/* ---- Page Header ---- */}
      <PageHeader title="价格预警" onBack={() => navigate(-1)} />

      {/* ---- Loading State ---- */}
      {isLoading && (
        <div className="p-4">
          <LoadingSkeleton variant="list" count={3} />
        </div>
      )}

      {/* ---- Error State ---- */}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={handleRetry} />
      )}

      {/* ---- Empty State ---- */}
      {!isLoading && !error && alerts.length === 0 && (
        <EmptyState
          title="暂未设置预警"
          description="在对话中查询价格时可一键设置预警"
        />
      )}

      {/* ---- List ---- */}
      {!isLoading && !error && alerts.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-steel-line">
            {alerts.map((alert) => (
              <div key={alert.id} className="px-4 py-4">
                <div className="flex items-start justify-between">
                  {/* Left: info */}
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[15px] leading-[1.6] text-steel-ink truncate">
                      {alert.category} {alert.spec}
                    </p>
                    <p className="text-[12px] leading-[1.5] text-steel-muted mt-1">
                      {alert.region}{" "}
                      \u00B7{" "}
                      当价格 {conditionSymbol(alert.condition)}{" "}
                      {formatPrice(alert.target_price)} 时提醒
                    </p>
                  </div>

                  {/* Right: price + status + date + delete */}
                  <div className="shrink-0 flex flex-col items-end">
                    <span className="text-[15px] font-medium text-steel-ink">
                      {formatPrice(alert.target_price)}
                    </span>
                    <span className="mt-1">
                      {renderStatusBadge(alert.is_active)}
                    </span>
                    <span className="text-[12px] leading-[1.5] text-steel-placeholder mt-1">
                      {formatDate(alert.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(alert)}
                      className="inline-flex items-center justify-center mt-1.5 text-steel-placeholder hover:text-steel-down transition-colors duration-150 min-w-[28px] min-h-[28px]"
                      aria-label={`删除 ${alert.category} 预警`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation Dialog ---- */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border border-steel-line bg-steel-canvas !shadow-none max-w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[18px] leading-[1.4] font-medium text-steel-ink">
              确认删除
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-[1.6] text-steel-body">
              删除后无法恢复
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full border border-steel-line text-steel-ink text-[13px] h-10 px-5 hover:bg-steel-surface transition-colors duration-150">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="rounded-full bg-steel-down text-steel-canvas text-[13px] h-10 px-5 hover:bg-steel-down/80 transition-colors duration-150"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
