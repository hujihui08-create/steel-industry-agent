// ============================================================
// NewsDetailPage — 资讯详情独立页面
// 路由: /news/:id
// 设计系统: 极简 · 1px 描边 · 仅 ink 强调色 · 无阴影
// ============================================================

import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Clock, ExternalLink } from "lucide-react";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { getNewsDetail } from "@/app/api/news";
import type { NewsDetail } from "@/app/types/news";

// -----------------------------------------------------------
// 格式化时间
// -----------------------------------------------------------

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

// ============================================================
// NewsDetailPage
// ============================================================

export default function NewsDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // ---- 数据获取 (TanStack Query) ----
  const {
    data: news,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<NewsDetail>({
    queryKey: ["news-detail", id],
    queryFn: () => getNewsDetail(id!),
    enabled: !!id,
  });

  // ---- 没有 id 参数 ----
  if (!id) {
    return (
      <div className="min-h-screen bg-steel-canvas flex flex-col">
        <PageHeader title="资讯详情" onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center">
          <ErrorState message="缺少资讯 ID" />
        </div>
      </div>
    );
  }

  // ---- 加载中 ----
  if (isLoading) {
    return (
      <div className="min-h-screen bg-steel-canvas flex flex-col">
        <PageHeader title="资讯详情" onBack={() => navigate(-1)} />
        <div className="flex-1">
          <div className="max-w-[720px] mx-auto px-4 py-6">
            <LoadingSkeleton variant="text" count={8} />
          </div>
        </div>
      </div>
    );
  }

  // ---- 错误 / 无数据 ----
  if (isError || !news) {
    return (
      <div className="min-h-screen bg-steel-canvas flex flex-col">
        <PageHeader title="资讯详情" onBack={() => navigate(-1)} />
        <div className="flex-1 flex items-center justify-center">
          <ErrorState
            message={error instanceof Error ? error.message : "加载失败"}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // 主内容渲染
  // ============================================================

  return (
    <div className="min-h-screen bg-steel-canvas flex flex-col">
      <PageHeader title="资讯详情" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto px-4 py-6">
          {/* ---- 标题 ---- */}
          <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink mb-3">
            {news.title}
          </h1>

          {/* ---- 元信息行 ---- */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {news.source && (
              <span className="inline-flex items-center gap-1 text-[12px] leading-[1.5] text-steel-muted">
                <Newspaper className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                {news.source}
              </span>
            )}

            {news.published_at && (
              <span className="inline-flex items-center gap-1 text-[12px] leading-[1.5] text-steel-placeholder">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                {formatTime(news.published_at)}
              </span>
            )}

            {news.category && (
              <span className="rounded-sm border border-steel-line bg-steel-surface px-2 py-0.5 text-[11px] leading-[1.5] tracking-[0.18em] uppercase text-steel-muted">
                {news.category}
              </span>
            )}
          </div>

          {/* ---- 分割线 ---- */}
          <hr className="border-t border-steel-line mb-6" />

          {/* ---- 正文 ---- */}
          <div className="text-[15px] leading-[1.6] text-steel-body whitespace-pre-wrap">
            {news.content || "暂无详细内容"}
          </div>

          {/* ---- 阅读原文按钮 ---- */}
          {news.source_url && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() =>
                  window.open(news.source_url, "_blank", "noopener,noreferrer")
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-steel-line px-4 py-2 text-[13px] leading-[1.5] text-steel-ink hover:bg-steel-surface transition-colors duration-150"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                阅读原文
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
