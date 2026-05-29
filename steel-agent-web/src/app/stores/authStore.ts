import { create } from "zustand";
import type { AuthStorageState } from "@/app/types/api";
import { AUTH_STORAGE_KEY, AUTH_VERSION } from "@/app/config";

interface AuthState {
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

function writeStorage(state: AuthState): void {
  const data: AuthStorageState = {
    state: {
      access_token: state.access_token,
      refresh_token: state.refresh_token,
      isAuthenticated: state.isAuthenticated,
    },
    version: AUTH_VERSION,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export const useAuthStore = create<AuthState>((set) => ({
  access_token: null,
  refresh_token: null,
  isAuthenticated: false,
  isHydrated: false,

  setTokens: (access_token: string, refresh_token: string) => {
    set({ access_token, refresh_token, isAuthenticated: true });
    const currentState = useAuthStore.getState();
    writeStorage(currentState);
  },

  logout: () => {
    set({ access_token: null, refresh_token: null, isAuthenticated: false });
    try {
      writeStorage(useAuthStore.getState());
    } catch {
      // 静默失败 - 已清除内存中的 token
    }
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthStorageState;
        if (parsed.version !== AUTH_VERSION) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          set({ isHydrated: true });
          return;
        }
        const access_token = parsed.state?.access_token ?? null;
        const refresh_token = parsed.state?.refresh_token ?? null;

        if (access_token && refresh_token && typeof access_token === "string" && typeof refresh_token === "string") {
          set({ access_token, refresh_token, isAuthenticated: true, isHydrated: true });
          writeStorage(useAuthStore.getState());
          return;
        }
      }
    } catch {
      // localStorage 数据损坏，视为未登录
    }
    set({ isHydrated: true });
  },
}));
