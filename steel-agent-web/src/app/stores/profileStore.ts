// ============================================================
// 用户资料 Zustand 状态管理
// 管理用户资料获取与更新
// ============================================================

import { create } from "zustand";
import type { UserProfile, ProfileUpdateData } from "@/app/types/user";
import { getProfile, updateProfile } from "@/app/api/users";

interface ProfileState {
  profile: UserProfile | null;
  // Loading counter prevents premature isLoading=false when
  // multiple async operations are in flight concurrently.
  _loadingCount: number;
  isLoading: boolean;
  error: string | null;

  _startLoading: () => void;
  _endLoading: () => void;

  fetchProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  clearProfile: () => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
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

  fetchProfile: async () => {
    get()._startLoading();
    set({ error: null });
    try {
      const profile = await getProfile();
      set({ profile });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "获取用户资料失败";
      set({ error: message });
    } finally {
      get()._endLoading();
    }
  },

  updateProfile: async (data: ProfileUpdateData) => {
    get()._startLoading();
    set({ error: null });
    try {
      const profile = await updateProfile(data);
      set({ profile });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "更新用户资料失败";
      set({ error: message });
    } finally {
      get()._endLoading();
    }
  },

  clearProfile: () => set({ profile: null }),

  reset: () =>
    set({
      profile: null,
      _loadingCount: 0,
      isLoading: false,
      error: null,
    }),
}));
