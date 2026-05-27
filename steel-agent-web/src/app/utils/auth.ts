// ============================================================
// Token 存储工具函数（共享模块）
// - 从 localStorage 读取/更新/清除认证 Token
// - 供 apiClient、chat、admin-debug 等模块共用
// ============================================================

import { AUTH_STORAGE_KEY } from "@/app/config";
import type { AuthStorageState } from "@/app/types/api";

export function getStoredTokens(): {
  access_token: string | null;
  refresh_token: string | null;
} {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { access_token: null, refresh_token: null };
    const parsed: AuthStorageState = JSON.parse(raw);
    return {
      access_token: parsed.state?.access_token ?? null,
      refresh_token: parsed.state?.refresh_token ?? null,
    };
  } catch {
    return { access_token: null, refresh_token: null };
  }
}

export function updateStoredTokens(
  access_token: string,
  refresh_token: string,
): void {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed: AuthStorageState = JSON.parse(raw);
    if (!parsed.state) return;
    parsed.state.access_token = access_token;
    parsed.state.refresh_token = refresh_token;
    parsed.state.isAuthenticated = true;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // 静默失败：解析/写入异常时不影响用户体验
  }
}

export function clearStoredAuth(): void {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed: AuthStorageState = JSON.parse(raw);
    if (!parsed.state) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    parsed.state.access_token = null;
    parsed.state.refresh_token = null;
    parsed.state.isAuthenticated = false;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
