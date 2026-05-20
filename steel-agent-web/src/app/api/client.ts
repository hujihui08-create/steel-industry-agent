// ============================================================
// Axios 实例配置
// - baseURL: /api/v1（通过 Vite proxy 代理到后端）
// - 请求拦截器：自动附加 Bearer Token
// - 响应拦截器：401 自动刷新 Token + 请求队列防并发
// ============================================================

import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse, AuthStorageState } from "@/app/types/api";
import { API_BASE_URL, API_TIMEOUT, AUTH_STORAGE_KEY, REFRESH_PATH } from "@/app/config";

// -----------------------------------------------------------
// Token 存储工具函数
// -----------------------------------------------------------

function getStoredTokens(): {
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

function updateStoredTokens(
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

function clearStoredAuth(): void {
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

// -----------------------------------------------------------
// 请求队列类型
// -----------------------------------------------------------

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// -----------------------------------------------------------
// 创建 Axios 实例
// -----------------------------------------------------------

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// -----------------------------------------------------------
// 请求拦截器：附加 Bearer Token
// -----------------------------------------------------------

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { access_token } = getStoredTokens();
    if (access_token && config.headers) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// -----------------------------------------------------------
// 响应拦截器：401 自动刷新 Token
// -----------------------------------------------------------

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else if (token) {
      item.resolve(token);
    } else {
      item.reject(new Error("Token refresh returned null"));
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse | undefined;
    if (data && typeof data === "object" && "code" in data && data.code !== 200) {
      return Promise.reject(new Error(data.message || "请求失败"));
    }
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 非 401 错误直接抛出
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // 已经是重试请求 / 或是刷新 Token 请求本身 → 不再重试
    if (originalRequest?._retry || originalRequest?.url === REFRESH_PATH) {
      clearStoredAuth();
      return Promise.reject(error);
    }

    // 无原始请求信息，无法重试
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 当前正在刷新 → 将请求加入队列等待
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // 尝试刷新 Token
    const { refresh_token } = getStoredTokens();

    if (!refresh_token) {
      clearStoredAuth();
      return Promise.reject(error);
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { data: refreshResponse } = await axios.post<
        ApiResponse<{ access_token: string; refresh_token: string }>
      >(API_BASE_URL + REFRESH_PATH, { refresh_token });

      if (!refreshResponse?.data?.access_token || !refreshResponse?.data?.refresh_token) {
        throw new Error("Refresh response missing tokens");
      }

      const newAccessToken = refreshResponse.data.access_token;
      const newRefreshToken = refreshResponse.data.refresh_token;

      updateStoredTokens(newAccessToken, newRefreshToken);

      // 处理队列中的请求
      processQueue(null, newAccessToken);

      // 重试原请求
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearStoredAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// -----------------------------------------------------------
// 导出
// -----------------------------------------------------------

export default apiClient;
