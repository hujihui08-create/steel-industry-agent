import { create } from "zustand";
import type { AuthStorageState } from "@/app/types/api";
import { AUTH_STORAGE_KEY } from "@/app/config";

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
    version: 0,
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
    const currentState = useAuthStore.getState();
    writeStorage(currentState);
  },

  hydrate: () => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthStorageState;
        const access_token = parsed.state?.access_token ?? null;
        const refresh_token = parsed.state?.refresh_token ?? null;

        if (access_token && refresh_token && typeof access_token === "string" && typeof refresh_token === "string") {
          set({ access_token, refresh_token, isAuthenticated: true, isHydrated: true });
          return;
        }
      }
    } catch {
      // localStorage 数据损坏，视为未登录
    }
    set({ isHydrated: true });
  },
}));
