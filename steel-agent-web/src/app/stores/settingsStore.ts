// ============================================================
// 用户设置 Zustand 状态管理
// 管理用户偏好设置获取与更新
// ============================================================

import { create } from "zustand";
import type { UserSettings, SettingsUpdateData } from "@/app/types/settings";
import { getSettings, updateSettings } from "@/app/api/settings";

interface SettingsState {
  settings: UserSettings | null;
  isLoading: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (data: SettingsUpdateData) => Promise<void>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await getSettings();
      set({ settings, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "获取设置失败";
      set({ error: message, isLoading: false });
    }
  },

  updateSettings: async (data: SettingsUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const settings = await updateSettings(data);
      set({ settings, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "更新设置失败";
      set({ error: message, isLoading: false });
    }
  },

  reset: () =>
    set({
      settings: null,
      isLoading: false,
      error: null,
    }),
}));
