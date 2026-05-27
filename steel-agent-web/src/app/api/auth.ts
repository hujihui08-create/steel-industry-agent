// ============================================================
// 认证 API 函数封装
// 所有请求通过 apiClient 发送，自动附带 Token 并处理刷新
// ============================================================

import apiClient from "@/app/api/client";
import type {
  ApiResponse,
  LoginByCodeRequest,
  LoginByPasswordRequest,
  LoginResponseData,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponseData,
  SendSmsCodeRequest,
} from "@/app/types/api";

// -----------------------------------------------------------
// 发送短信验证码
// POST /api/v1/auth/sms-code
// -----------------------------------------------------------

export async function sendSmsCode(phone: string): Promise<void> {
  const payload: SendSmsCodeRequest = { phone };
  await apiClient.post<ApiResponse<null>>("/auth/sms-code", payload);
}

// -----------------------------------------------------------
// 验证码登录
// POST /api/v1/auth/login
// -----------------------------------------------------------

export async function loginByCode(
  phone: string,
  code: string,
): Promise<LoginResponseData> {
  const payload: LoginByCodeRequest = { phone, code };
  const { data } = await apiClient.post<ApiResponse<LoginResponseData>>(
    "/auth/login",
    payload,
  );
  if (!data?.data?.access_token) {
    throw new Error(data.message || "登录失败，未获取到有效的访问令牌");
  }
  return data.data;
}

// -----------------------------------------------------------
// 密码登录
// POST /api/v1/auth/login-password
// -----------------------------------------------------------

export async function loginByPassword(
  phone: string,
  password: string,
): Promise<LoginResponseData> {
  const payload: LoginByPasswordRequest = { phone, password };
  const { data } = await apiClient.post<ApiResponse<LoginResponseData>>(
    "/auth/login-password",
    payload,
  );
  if (!data?.data?.access_token) {
    throw new Error(data.message || "登录失败，未获取到有效的访问令牌");
  }
  return data.data;
}

// -----------------------------------------------------------
// 用户注册
// POST /api/v1/auth/register
// 返回登录响应（access_token + refresh_token）
// -----------------------------------------------------------

export async function register(
  payload: RegisterRequest,
): Promise<LoginResponseData> {
  const { data } = await apiClient.post<ApiResponse<LoginResponseData>>(
    "/auth/register",
    payload,
  );
  if (!data?.data?.access_token) {
    throw new Error(data.message || "注册失败，未获取到有效的访问令牌");
  }
  return data.data;
}

// -----------------------------------------------------------
// 刷新 Token
// POST /api/v1/auth/refresh
// -----------------------------------------------------------

export async function refreshToken(
  token: string,
): Promise<RefreshTokenResponseData> {
  const payload: RefreshTokenRequest = { refresh_token: token };
  const { data } = await apiClient.post<
    ApiResponse<RefreshTokenResponseData>
  >("/auth/refresh", payload);
  if (!data?.data?.access_token) {
    throw new Error(data.message || "令牌刷新失败");
  }
  return data.data;
}
