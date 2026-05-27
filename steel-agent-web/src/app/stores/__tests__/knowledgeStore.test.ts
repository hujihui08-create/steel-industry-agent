// ============================================================
// knowledgeStore 单元测试
//
// 覆盖场景：
//   1. 初始状态
//   2. 设置搜索关键词
//   3. 设置搜索结果
//   4. 设置搜索中状态
//   5. 清除错误
//   6. loading 计数器机制
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useKnowledgeStore } from "@/app/stores/knowledgeStore";

// Mock API module to prevent real HTTP calls
vi.mock("@/app/api/knowledge", () => ({
  searchKnowledge: vi.fn().mockResolvedValue([]),
  getStandardList: vi.fn().mockResolvedValue([]),
  getTermList: vi.fn().mockResolvedValue([]),
  getStandardDetail: vi.fn().mockResolvedValue(null),
  getTermDetail: vi.fn().mockResolvedValue(null),
  compareGrades: vi.fn().mockResolvedValue([]),
}));

describe("knowledgeStore", () => {
  beforeEach(() => {
    useKnowledgeStore.setState({
      searchQuery: "",
      searchResults: [],
      standardList: [],
      termList: [],
      selectedStandard: null,
      selectedTerm: null,
      compareResults: [],
      _loadingCount: 0,
      isLoading: false,
      error: null,
    });
  });

  it("should have correct initial state", () => {
    const state = useKnowledgeStore.getState();
    expect(state.searchQuery).toBe("");
    expect(state.searchResults).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("sets search query", () => {
    useKnowledgeStore.getState().setSearchQuery("螺纹钢");
    expect(useKnowledgeStore.getState().searchQuery).toBe("螺纹钢");
  });

  it("clears error", () => {
    useKnowledgeStore.setState({ error: "Something went wrong" });
    useKnowledgeStore.getState().clearError();
    expect(useKnowledgeStore.getState().error).toBeNull();
  });

  it("_startLoading increments counter and sets isLoading=true", () => {
    useKnowledgeStore.getState()._startLoading();
    const state = useKnowledgeStore.getState();
    expect(state._loadingCount).toBe(1);
    expect(state.isLoading).toBe(true);
  });

  it("_endLoading decrements counter and sets isLoading=false when count reaches 0", () => {
    useKnowledgeStore.getState()._startLoading();
    useKnowledgeStore.getState()._endLoading();
    const state = useKnowledgeStore.getState();
    expect(state._loadingCount).toBe(0);
    expect(state.isLoading).toBe(false);
  });

  it("_endLoading keeps isLoading=true when multiple operations are pending", () => {
    useKnowledgeStore.getState()._startLoading();
    useKnowledgeStore.getState()._startLoading();
    useKnowledgeStore.getState()._endLoading();
    const state = useKnowledgeStore.getState();
    expect(state._loadingCount).toBe(1);
    expect(state.isLoading).toBe(true);
  });

  it("sets search results via setState", () => {
    const results = [{ id: "1", title: "螺纹钢标准", type: "standard" }];
    useKnowledgeStore.setState({ searchResults: results as any });
    expect(useKnowledgeStore.getState().searchResults).toHaveLength(1);
    expect(useKnowledgeStore.getState().searchResults[0].title).toBe("螺纹钢标准");
  });
});
