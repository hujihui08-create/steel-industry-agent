import { useState, useEffect, useCallback } from "react";
import { Search, BookOpen, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useKnowledgeStore } from "@/app/stores/knowledgeStore";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/app/components/shared/LoadingSkeleton";
import { ErrorState } from "@/app/components/shared/ErrorState";
import { EmptyState } from "@/app/components/shared/EmptyState";
import { PageHeader } from "@/app/components/shared/PageHeader";

type TabKey = "standard" | "term";

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("standard");
  const [searchInput, setSearchInput] = useState("");
  const navigate = useNavigate();

  const {
    searchQuery,
    searchResults,
    standardList,
    termList,
    isLoading,
    error,
    setSearchQuery,
    searchKnowledge,
    fetchStandardList,
    fetchTermList,
    clearError,
  } = useKnowledgeStore();

  useEffect(() => {
    if (activeTab === "standard" && standardList.length === 0) {
      fetchStandardList();
    }
    if (activeTab === "term" && termList.length === 0) {
      fetchTermList();
    }
  }, [activeTab, standardList.length, termList.length, fetchStandardList, fetchTermList]);

  const handleSearch = useCallback(() => {
    const trimmed = searchInput.trim();
    if (trimmed) {
      setSearchQuery(trimmed);
      searchKnowledge(trimmed);
    }
  }, [searchInput, setSearchQuery, searchKnowledge]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  const displayList = searchQuery ? searchResults : activeTab === "standard" ? standardList : termList;

  return (
    <div className="min-h-screen bg-steel-canvas">
      <PageHeader title="知识库" onBack={() => navigate(-1)} />

      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-steel-placeholder"
            strokeWidth={1.75}
          />
          <Input
            placeholder="搜索标准、术语、牌号..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 h-11 rounded-xl border-steel-line text-[15px] placeholder:text-steel-placeholder"
          />
        </div>
      </div>

      {!searchQuery && (
        <div className="px-4 pb-4">
          <div className="flex bg-steel-surface rounded-full p-1 border border-steel-line">
            {(["standard", "term"] as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-full text-[14px] leading-[1.5] transition-colors duration-150 ${
                  activeTab === tab
                    ? "bg-steel-ink text-white"
                    : "text-steel-muted hover:text-steel-ink"
                }`}
              >
                {tab === "standard" ? (
                  <FileText className="size-3.5" strokeWidth={1.75} />
                ) : (
                  <BookOpen className="size-3.5" strokeWidth={1.75} />
                )}
                {tab === "standard" ? "标准" : "术语"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-8">
        {isLoading && <LoadingSkeleton variant="list" count={5} />}
        {error && (
          <ErrorState message={error} onRetry={() => { clearError(); fetchStandardList(); fetchTermList(); }} />
        )}
        {!isLoading && !error && displayList.length === 0 && (
          <EmptyState
            title="暂无内容"
            description={searchQuery ? "未找到相关结果，请尝试其他关键词" : "知识库正在建设中"}
          />
        )}
        {!isLoading && !error && displayList.length > 0 && (
          <div className="space-y-2">
            {displayList.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/knowledge/${item.id}`)}
                className="w-full text-left rounded-xl border border-steel-line bg-white p-4 transition-colors duration-150 hover:border-steel-ink/30"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {item.type === "standard" ? (
                      <FileText className="size-4 text-steel-muted" strokeWidth={1.75} />
                    ) : (
                      <BookOpen className="size-4 text-steel-muted" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {item.standard_no && (
                        <span className="text-[11px] text-steel-muted font-mono shrink-0">
                          {item.standard_no}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[11px] leading-[1.5] text-steel-muted px-1.5 py-0.5 rounded border border-steel-line">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="text-[15px] leading-[1.6] font-medium text-steel-ink truncate">
                      {item.title}
                    </div>
                    <div className="text-[13px] leading-[1.6] text-steel-body mt-1 line-clamp-2">
                      {typeof item.content === "string"
                        ? item.content
                        : JSON.stringify(item.content)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
