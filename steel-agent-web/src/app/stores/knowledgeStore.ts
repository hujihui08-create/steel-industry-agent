import { create } from "zustand";
import type { KnowledgeItem } from "@/app/types/knowledge";
import * as knowledgeApi from "@/app/api/knowledge";

interface KnowledgeStore {
  searchQuery: string;
  searchResults: KnowledgeItem[];
  standardList: KnowledgeItem[];
  termList: KnowledgeItem[];
  selectedStandard: KnowledgeItem | null;
  selectedTerm: KnowledgeItem | null;
  compareResults: KnowledgeItem[];
  isLoading: boolean;
  error: string | null;

  setSearchQuery: (query: string) => void;
  searchKnowledge: (keyword: string) => Promise<void>;
  fetchStandardList: () => Promise<void>;
  fetchTermList: () => Promise<void>;
  fetchStandardDetail: (id: number) => Promise<void>;
  fetchTermDetail: (id: number) => Promise<void>;
  compareGrades: (grade1: string, grade2: string) => Promise<void>;
  clearError: () => void;
}

export const useKnowledgeStore = create<KnowledgeStore>((set) => ({
  searchQuery: "",
  searchResults: [],
  standardList: [],
  termList: [],
  selectedStandard: null,
  selectedTerm: null,
  compareResults: [],
  isLoading: false,
  error: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  searchKnowledge: async (keyword) => {
    set({ isLoading: true, error: null, searchQuery: keyword });
    try {
      const results = await knowledgeApi.searchKnowledge(keyword);
      set({ searchResults: results, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "搜索失败", isLoading: false });
    }
  },

  fetchStandardList: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await knowledgeApi.getStandardList(50, 0);
      set({ standardList: list, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取标准列表失败", isLoading: false });
    }
  },

  fetchTermList: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await knowledgeApi.getTermList(50, 0);
      set({ termList: list, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取术语列表失败", isLoading: false });
    }
  },

  fetchStandardDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const detail = await knowledgeApi.getStandardDetail(id);
      set({ selectedStandard: detail, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取标准详情失败", isLoading: false });
    }
  },

  fetchTermDetail: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const detail = await knowledgeApi.getTermDetail(id);
      set({ selectedTerm: detail, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "获取术语详情失败", isLoading: false });
    }
  },

  compareGrades: async (grade1, grade2) => {
    set({ isLoading: true, error: null });
    try {
      const results = await knowledgeApi.compareGrades(grade1, grade2);
      set({ compareResults: results, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "牌号对比失败", isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
