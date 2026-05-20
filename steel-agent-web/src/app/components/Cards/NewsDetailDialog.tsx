"use client";

import { ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { NewsItem } from "./NewsCard";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NewsDetailDialogProps {
  /** News data — pass `null` to close the dialog. */
  news: NewsItem | null;
  /** Called when the user dismisses the dialog (mask click / X / close btn). */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO / date-ish string into something readable. */
function formatTime(raw?: string): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewsDetailDialog({
  news,
  onClose,
}: NewsDetailDialogProps) {
  const open = news !== null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={
          "rounded-2xl border border-steel-line !shadow-none max-w-lg " +
          "p-6 gap-0"
        }
      >
        {news && (
          <>
            {/* ---- Title ---- */}
            <h2
              className={
                "text-[18px] leading-[1.4] font-medium text-steel-ink mb-3"
              }
            >
              {news.title}
            </h2>

            {/* ---- Meta row: source · time · category badge ---- */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {news.source && (
                <span className="text-[12px] text-steel-muted">
                  {news.source}
                </span>
              )}

              {news.source && news.published_at && (
                <span className="text-[12px] text-steel-placeholder">·</span>
              )}

              {news.published_at && (
                <span className="text-[12px] text-steel-placeholder">
                  {formatTime(news.published_at)}
                </span>
              )}

              {news.category && (
                <span
                  className={
                    "rounded-md border border-steel-line " +
                    "text-[11px] text-steel-muted px-2 py-0.5"
                  }
                >
                  {news.category}
                </span>
              )}
            </div>

            {/* ---- Divider ---- */}
            <hr className="border-steel-line my-4" />

            {/* ---- Body ---- */}
            <div
              className={
                "text-[15px] leading-[1.6] text-steel-body " +
                "whitespace-pre-wrap max-h-[50vh] overflow-y-auto"
              }
            >
              {news.content || news.summary || "暂无详细内容"}
            </div>

            {/* ---- Bottom actions ---- */}
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={onClose}
                className={
                  "rounded-full border border-steel-line " +
                  "text-[13px] text-steel-ink hover:bg-steel-surface " +
                  "px-5 py-2 transition-colors duration-150"
                }
              >
                关闭
              </button>

              {news.source_url && (
                <button
                  type="button"
                  onClick={() => window.open(news.source_url, "_blank", "noopener,noreferrer")}
                  className={
                    "rounded-full bg-steel-ink text-steel-canvas text-[13px] " +
                    "hover:bg-steel-body px-5 py-2 " +
                    "transition-colors duration-150 " +
                    "inline-flex items-center gap-1.5"
                  }
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  阅读原文
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
