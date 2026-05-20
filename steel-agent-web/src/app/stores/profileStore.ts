// ============================================================
// 用户资料 Zustand 状态管理
// 管理用户资料获取与更新
// ============================================================

import { create } from "zustand";
import type { UserProfile, ProfileUpdateData } from "@/app/types/user";
import { getProfile, updateProfile } from "@/app/api/users";

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  clearProfile: () => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await getProfile();
      set({ profile, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "获取用户资料失败";
      set({ error: message, isLoading: false });
    }
  },

  updateProfile: async (data: ProfileUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await updateProfile(data);
      set({ profile, isLoading: false });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "更新用户资料失败";
      set({ error: message, isLoading: false });
    }
  },

  clearProfile: () => set({ profile: null }),

  reset: () =>
    set({
      profile: null,
      isLoading: false,
      error: null,
    }),
}));
