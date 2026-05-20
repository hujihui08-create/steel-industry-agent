// ============================================================
// Auth API 函数单元测试
// 使用 vitest mock apiClient 模块
// ============================================================

import {
  sendSmsCode,
  loginByCode,
  loginByPassword,
  refreshToken,
} from "@/app/api/auth";

// -----------------------------------------------------------
// Mock apiClient 模块
// -----------------------------------------------------------

vi.mock("@/app/api/client", () => ({
  default: {
    post: vi.fn(),
  },
}));

import apiClient from "@/app/api/client";

const mockedPost = apiClient.post as ReturnType<typeof vi.fn>;

// -----------------------------------------------------------
// Setup: 每个测试前清除 mock
// -----------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------
// 测试用例
// -----------------------------------------------------------

describe("auth API", () => {
  // -----------------------------------------------------------
  // 1. sendSmsCode：应 POST /auth/sms-code 并携带 { phone }
  // -----------------------------------------------------------
  it("sendSmsCode should POST to /auth/sms-code with phone payload", async () => {
    mockedPost.mockResolvedValue({
      data: { code: 200, message: "success", data: null },
    });

    await sendSmsCode("13800138000");

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith("/auth/sms-code", {
      phone: "13800138000",
    });
  });

  // -----------------------------------------------------------
  // 2. loginByCode：应 POST /auth/login 并返回 token 数据
  // -----------------------------------------------------------
  it("loginByCode should POST to /auth/login and return token data", async () => {
    mockedPost.mockResolvedValue({
      data: {
        code: 200,
        message: "success",
        data: { access_token: "at1", refresh_token: "rt1" },
      },
    });

    const result = await loginByCode("13800138000", "123456");

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith("/auth/login", {
      phone: "13800138000",
      code: "123456",
    });
    expect(result).toEqual({ access_token: "at1", refresh_token: "rt1" });
  });

  // -----------------------------------------------------------
  // 3. loginByPassword：应 POST /auth/login-password 并返回 token 数据
  // -----------------------------------------------------------
  it("loginByPassword should POST to /auth/login-password and return token data", async () => {
    mockedPost.mockResolvedValue({
      data: {
        code: 200,
        message: "success",
        data: { access_token: "at2", refresh_token: "rt2" },
      },
    });

    const result = await loginByPassword("13800138000", "pass123");

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith("/auth/login-password", {
      phone: "13800138000",
      password: "pass123",
    });
    expect(result).toEqual({ access_token: "at2", refresh_token: "rt2" });
  });

  // -----------------------------------------------------------
  // 4. refreshToken：应 POST /auth/refresh
  // -----------------------------------------------------------
  it("refreshToken should POST to /auth/refresh and return new tokens", async () => {
    mockedPost.mockResolvedValue({
      data: {
        code: 200,
        message: "success",
        data: { access_token: "newAt", refresh_token: "newRt" },
      },
    });

    const result = await refreshToken("old_rt");

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith("/auth/refresh", {
      refresh_token: "old_rt",
    });
    expect(result).toEqual({ access_token: "newAt", refresh_token: "newRt" });
  });

  // -----------------------------------------------------------
  // 5. 异常传播：网络错误应正常抛出
  // -----------------------------------------------------------
  describe("error propagation", () => {
    it("sendSmsCode should propagate network errors", async () => {
      mockedPost.mockRejectedValue(new Error("Network error"));

      await expect(sendSmsCode("13800138000")).rejects.toThrow(
        "Network error",
      );
    });

    it("loginByCode should propagate network errors", async () => {
      mockedPost.mockRejectedValue(new Error("Network error"));

      await expect(loginByCode("13800138000", "123456")).rejects.toThrow(
        "Network error",
      );
    });

    it("loginByPassword should propagate network errors", async () => {
      mockedPost.mockRejectedValue(new Error("Network error"));

      await expect(
        loginByPassword("13800138000", "pass123"),
      ).rejects.toThrow("Network error");
    });

    it("refreshToken should propagate network errors", async () => {
      mockedPost.mockRejectedValue(new Error("Network error"));

      await expect(refreshToken("old_rt")).rejects.toThrow("Network error");
    });
  });

  // -----------------------------------------------------------
  // 6. loginByCode：API 返回业务错误码时应抛出错误
  // -----------------------------------------------------------
  it("loginByCode should throw on API-level error response", async () => {
    mockedPost.mockResolvedValue({
      data: {
        code: 40001,
        message: "参数错误",
        data: null,
      },
    });

    await expect(
      loginByCode("13800138000", "123456"),
    ).rejects.toThrow("参数错误");

    expect(mockedPost).toHaveBeenCalledTimes(1);
  });
});
