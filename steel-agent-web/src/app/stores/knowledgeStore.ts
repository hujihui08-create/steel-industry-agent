import { create } from "zustand";
import type { KnowledgeItem } from "@/app/types/knowledge";
import * as knowledgeApi from "@/app/api/knowledge";

// Module-level AbortController for searchKnowledge debounce/cancel
let searchAbortController: AbortController | null = null;

interface KnowledgeStore {
  searchQuery: string;
  searchResults: KnowledgeItem[];
  standardList: KnowledgeItem[];
  termList: KnowledgeItem[];
  selectedStandard: KnowledgeItem | null;
  selectedTerm: KnowledgeItem | null;
  compareResults: KnowledgeItem[];
  // Loading counter prevents premature isLoading=false when
  // multiple async operations are in flight concurrently.
  _loadingCount: number;
  isLoading: boolean;
  error: string | null;

  _startLoading: () => void;
  _endLoading: () => void;

  setSearchQuery: (query: string) => void;
  searchKnowledge: (keyword: string) => Promise<void>;
  fetchStandardList: () => Promise<void>;
  fetchTermList: () => Promise<void>;
  fetchStandardDetail: (id: number) => Promise<void>;
  fetchTermDetail: (id: number) => Promise<void>;
  compareGrades: (grade1: string, grade2: string) => Promise<void>;
  clearError: () => void;
}

export const useKnowledgeStore = create<KnowledgeStore>((set, get) => ({
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

  _startLoading: () => {
    const count = get()._loadingCount + 1;
    set({ _loadingCount: count, isLoading: true });
  },

  _endLoading: () => {
    const count = Math.max(0, get()._loadingCount - 1);
    set({ _loadingCount: count, isLoading: count > 0 });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  searchKnowledge: async (keyword) => {
    // Cancel any in-flight search
    if (searchAbortController) {
      searchAbortController.abort();
    }
    searchAbortController = new AbortController();
    const { signal } = searchAbortController;

    get()._startLoading();
    set({ error: null, searchQuery: keyword });
    try {
      const results = await knowledgeApi.searchKnowledge(keyword, { signal } as any);
      set({ searchResults: results });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      set({ error: err instanceof Error ? err.message : "搜索失败" });
    } finally {
      if (searchAbortController?.signal === signal) {
        searchAbortController = null;
      }
      get()._endLoading();
    }
  },

  fetchStandardList: async () => {
    get()._startLoading();
    set({ error: null });
    try {
      const list = await knowledgeApi.getStandardList(50, 0);
      set({ standardList: list });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取标准列表失败" });
    } finally {
      get()._endLoading();
    }
  },

  fetchTermList: async () => {
    get()._startLoading();
    set({ error: null });
    try {
      const list = await knowledgeApi.getTermList(50, 0);
      set({ termList: list });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取术语列表失败" });
    } finally {
      get()._endLoading();
    }
  },

  fetchStandardDetail: async (id) => {
    get()._startLoading();
    set({ error: null });
    try {
      const detail = await knowledgeApi.getStandardDetail(id);
      set({ selectedStandard: detail });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取标准详情失败" });
    } finally {
      get()._endLoading();
    }
  },

  fetchTermDetail: async (id) => {
    get()._startLoading();
    set({ error: null });
    try {
      const detail = await knowledgeApi.getTermDetail(id);
      set({ selectedTerm: detail });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取术语详情失败" });
    } finally {
      get()._endLoading();
    }
  },

  compareGrades: async (grade1, grade2) => {
    get()._startLoading();
    set({ error: null });
    try {
      const results = await knowledgeApi.compareGrades(grade1, grade2);
      set({ compareResults: results });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "牌号对比失败" });
    } finally {
      get()._endLoading();
    }
  },

  clearError: () => set({ error: null }),
}));
