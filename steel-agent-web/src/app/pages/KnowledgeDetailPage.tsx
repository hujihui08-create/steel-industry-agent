import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, BookOpen, Tag } from "lucide-react";
import { getStandardDetail, getTermDetail } from "@/app/api/knowledge";
import type { KnowledgeItem } from "@/app/types/knowledge";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numericId = Number(id);

  const {
    data: item,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["knowledge-detail", numericId],
    queryFn: async (): Promise<KnowledgeItem> => {
      try {
        const standardResult = await getStandardDetail(numericId);
        if (standardResult.type === "standard") {
          return standardResult;
        }
        throw new Error("Type mismatch");
      } catch {
        return getTermDetail(numericId);
      }
    },
    enabled: !!id && !isNaN(numericId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-steel-canvas">
        <PageHeader title="知识详情" onBack={() => navigate(-1)} />
        <div className="max-w-[720px] mx-auto px-4 py-6">
          <LoadingSkeleton variant="card" count={2} />
        </div>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="min-h-screen bg-steel-canvas">
        <PageHeader title="知识详情" onBack={() => navigate(-1)} />
        <ErrorState
          message={
            error instanceof Error ? error.message : "未找到该知识条目"
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isStandard = item.type === "standard";
  const pageTitle = isStandard ? "标准详情" : "术语详情";

  const keywords = item.keywords
    ? item.keywords
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  const contentLabel = isStandard ? "标准内容" : "术语解释";

  return (
    <div className="min-h-screen bg-steel-canvas">
      <PageHeader title={pageTitle} onBack={() => navigate(-1)} />

      <main className="max-w-[720px] mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          {isStandard ? (
            <FileText className="size-4 text-steel-muted" strokeWidth={1.75} />
          ) : (
            <BookOpen className="size-4 text-steel-muted" strokeWidth={1.75} />
          )}

          {isStandard && item.standard_no && (
            <span className="text-[11px] text-steel-muted font-mono">
              {item.standard_no}
            </span>
          )}

          {item.category && (
            <span className="text-[11px] leading-[1.5] text-steel-muted px-1.5 py-0.5 rounded border border-steel-line">
              {item.category}
            </span>
          )}
        </div>

        <h1 className="text-[24px] leading-[1.3] font-medium text-steel-ink mb-6">
          {item.title}
        </h1>

        {!isStandard && (
          <div className="mb-6">
            <p className="text-[12px] leading-[1.5] text-steel-muted mb-1">
              英文名称
            </p>
            <p className="text-[15px] leading-[1.6] text-steel-body">
              暂无英文名
            </p>
          </div>
        )}

        <div className="mb-6">
          <p className="text-[12px] leading-[1.5] text-steel-muted mb-2">
            {contentLabel}
          </p>
          <div className="bg-steel-surface rounded-xl p-4">
            {typeof item.content === "string" ? (
              <p className="text-[15px] leading-[1.6] text-steel-body whitespace-pre-wrap">
                {item.content}
              </p>
            ) : (
              <pre className="text-[15px] leading-[1.6] text-steel-body whitespace-pre-wrap font-mono overflow-x-auto">
                {JSON.stringify(item.content, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {keywords.length > 0 && (
          <div>
            <p className="text-[12px] leading-[1.5] text-steel-muted mb-2">
              关键词
            </p>
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 text-[11px] leading-[1.5] text-steel-muted px-1.5 py-0.5 rounded border border-steel-line"
                >
                  <Tag className="size-3" strokeWidth={1.75} />
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
