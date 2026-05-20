// ============================================================
// API 通用类型定义
// 遵循后端统一响应格式: { code, message, data }
// ============================================================

/** 通用 API 响应包装 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// -----------------------------------------------------------
// 认证相关
// -----------------------------------------------------------

/** 发送短信验证码请求 */
export interface SendSmsCodeRequest {
  phone: string;
}

/** 验证码登录请求 */
export interface LoginByCodeRequest {
  phone: string;
  code: string;
}

/** 密码登录请求 */
export interface LoginByPasswordRequest {
  phone: string;
  password: string;
}

/** 登录响应数据 */
export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
}

/** 用户注册请求 */
export interface RegisterRequest {
  phone: string;
  code: string;
  password: string;
  nickname?: string;
  company?: string;
}

/** 刷新 Token 请求 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/** 刷新 Token 响应数据 */
export interface RefreshTokenResponseData {
  access_token: string;
  refresh_token: string;
}

// -----------------------------------------------------------
// Auth Store 持久化结构 (Zustand persist)
// localStorage key: "auth-storage"
// -----------------------------------------------------------

/** Zustand persist 存储的完整结构 */
export interface AuthStorageState {
  state: {
    access_token: string | null;
    refresh_token: string | null;
    isAuthenticated: boolean;
  };
  version: number;
}
