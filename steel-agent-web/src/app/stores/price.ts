import { create } from "zustand";

export type PriceViewMode = "list" | "trend" | "compare";

interface PriceStore {
  selectedCategory: string;
  selectedRegion: string;
  selectedSpec: string;
  viewMode: PriceViewMode;
  days: number;
  setCategory: (category: string) => void;
  setRegion: (region: string) => void;
  setSpec: (spec: string) => void;
  setViewMode: (mode: PriceViewMode) => void;
  setDays: (days: number) => void;
  resetFilters: () => void;
}

export const usePriceStore = create<PriceStore>((set) => ({
  selectedCategory: "",
  selectedRegion: "",
  selectedSpec: "",
  viewMode: "list",
  days: 30,

  setCategory: (category) =>
    set({ selectedCategory: category, selectedRegion: "", selectedSpec: "" }),

  setRegion: (region) => set({ selectedRegion: region }),

  setSpec: (spec) => set({ selectedSpec: spec }),

  setViewMode: (viewMode) => set({ viewMode }),

  setDays: (days) => set({ days }),

  resetFilters: () => set({ selectedRegion: "", selectedSpec: "" }),
}));
