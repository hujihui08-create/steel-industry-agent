import React, { useState, useCallback, useEffect } from "react";
import { Search, RotateCcw, Copy, ThumbsUp, ThumbsDown, Eye, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdminPageShell } from "./AdminPageShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminEmpty } from "./AdminEmpty";
import { AdminLoading } from "./AdminLoading";
import { showSuccessToast, showErrorToast } from "./AdminToast";
import * as adminKnowledgeApi from "@/app/api/admin-knowledge";
import type { RAGSearchResult, RAGSearchHistory } from "@/app/types/knowledge";

export default function VectorSearchTest() {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [typeFilter, setTypeFilter] = useState("");

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RAGSearchResult[]>([]);

  const [history, setHistory] = useState<RAGSearchHistory[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await adminKnowledgeApi.adminGetSearchHistory(10, (historyPage - 1) * 10);
      setHistory(res.list);
      setHistoryTotal(res.total);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await adminKnowledgeApi.adminTestSearch({
        query: query.trim(),
        top_k: topK,
        threshold,
        type_filter: typeFilter || undefined,
      });
      setResults(res);
      loadHistory();
    } catch {
      showErrorToast("检索失败，请重试");
    } finally {
      setSearching(false);
    }
  }, [query, topK, threshold, typeFilter, loadHistory]);

  const handleRetest = useCallback(
    (item: RAGSearchHistory) => {
      setQuery(item.query);
      setTopK(item.top_k);
      setThreshold(item.threshold);
    },
    [],
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showSuccessToast("已复制到剪贴板");
    });
  }, []);

  return (
    <AdminPageShell
      title="向量检索测试"
      breadcrumbs={[
        { label: "首页", path: "/admin" },
        { label: "数据管理" },
        { label: "向量检索测试" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">
          {/* 检索测试区 */}
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-[14px] leading-[1.5] font-medium text-[#0A0A0A]">
              检索测试
            </h3>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  placeholder="输入查询文本，如：Q235B的力学性能..."
                  className={cn(
                    "w-full h-9 pl-7 pr-3 rounded-md",
                    "border border-[#E5E5E5]",
                    "bg-white",
                    "text-[13px] leading-[1.5] text-[#404040]",
                    "placeholder:text-[#A3A3A3]",
                    "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/5",
                    "transition-colors duration-150",
                  )}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="search-topk" className="text-[12px] text-[#737373] whitespace-nowrap">Top-K</label>
                <input
                  id="search-topk"
                  type="number"
                  min={1}
                  max={50}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className={cn(
                    "w-16 h-8 px-2 rounded-md",
                    "border border-[#E5E5E5]",
                    "bg-white",
                    "text-[13px] text-center text-[#404040]",
                    "outline-none focus:border-[#0A0A0A]",
                    "transition-colors duration-150",
                  )}
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="search-threshold" className="text-[12px] text-[#737373] whitespace-nowrap">阈值</label>
                <input
                  id="search-threshold"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className={cn(
                    "w-20 h-8 px-2 rounded-[10px]",
                    "border border-[#E5E5E5]",
                    "bg-white",
                    "text-[13px] text-center text-[#404040]",
                    "outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#0A0A0A]/10",
                    "transition-colors duration-150",
                  )}
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="search-type" className="text-[12px] text-[#737373] whitespace-nowrap">类型</label>
                <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
                  <SelectTrigger id="search-type" className="h-8 w-[100px] rounded-[10px] border-[#E5E5E5] bg-white text-[13px] text-[#404040] focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A]/10">
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent className="border-[#E5E5E5] rounded-[10px]">
                    <SelectItem value="all" className="text-[13px]">全部</SelectItem>
                    <SelectItem value="standard" className="text-[13px]">标准</SelectItem>
                    <SelectItem value="grade" className="text-[13px]">牌号</SelectItem>
                    <SelectItem value="term" className="text-[13px]">术语</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className={cn(
                  "h-8 px-4 rounded-full ml-auto",
                  "bg-[#0A0A0A] text-white",
                  "text-[13px] leading-[1.5]",
                  "hover:bg-[#404040]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-150",
                  "gap-1.5",
                )}
              >
                {searching ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={14} strokeWidth={1.75} />
                )}
                执行检索
              </Button>
            </div>
          </div>

          {/* 检索结果 */}
          {searching ? (
            <AdminLoading />
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] leading-[1.5] font-medium text-[#0A0A0A]">
                  检索结果
                </h3>
                <span className="text-[12px] text-[#737373]">({results.length} 条)</span>
              </div>
              {results.map((item) => (
                <div
                  key={item.rank}
                  className={cn(
                    "bg-white border border-[#E5E5E5] rounded-lg p-4",
                    "flex flex-col gap-3",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "inline-flex items-center justify-center",
                        "w-6 h-6 rounded-full",
                        "bg-[#0A0A0A] text-white text-[12px] font-medium tabular-nums",
                      )}>
                        {item.rank}
                      </span>
                      <span className="text-[14px] leading-[1.5] font-medium text-[#0A0A0A]">
                        {item.document_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#737373]">相关性</span>
                        <div className="w-16 h-1.5 rounded-full bg-[#E5E5E5] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0A0A0A] transition-all duration-300"
                            style={{ width: `${(item.score * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-[12px] tabular-nums text-[#0A0A0A] font-medium">
                          {(item.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[13px] leading-[1.6] text-[#404040] bg-[#FAFAFA] rounded-md p-3">
                    {item.chunk_content}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.chunk_content)}
                      className={cn(
                        "inline-flex items-center gap-1",
                        "h-7 px-2.5 rounded-full",
                        "border border-[#E5E5E5]",
                        "text-[12px] text-[#404040]",
                        "hover:bg-[#FAFAFA] hover:border-[#0A0A0A]",
                        "transition-colors duration-150",
                      )}
                    >
                      <Copy size={12} strokeWidth={1.75} />
                      复制
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* 检索历史 */}
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-[14px] leading-[1.5] font-medium text-[#0A0A0A]">
              检索历史
            </h3>

            {historyLoading ? (
              <AdminLoading />
            ) : history.length === 0 ? (
              <AdminEmpty
                title="暂无检索历史"
                description="执行向量检索测试后，历史记录会出现在这里"
              />
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleRetest(item)}
                    className={cn(
                      "text-left p-3 rounded-md",
                      "border border-[#E5E5E5]",
                      "hover:bg-[#FAFAFA]",
                      "transition-colors duration-150",
                      "outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]/10",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] leading-[1.5] text-[#404040] line-clamp-1 font-medium">
                        {item.query}
                      </span>
                      <ChevronRight size={14} strokeWidth={1.75} className="text-[#A3A3A3] shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-[#A3A3A3]">
                        Top-{item.top_k} / 阈值 {item.threshold}
                      </span>
                      <span className="text-[11px] text-[#A3A3A3]">
                        {item.result_count} 结果
                      </span>
                      <span className="text-[11px] text-[#A3A3A3]">
                        {item.duration_ms}ms
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
