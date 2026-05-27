// ============================================================
// LoginLogs 单元测试
//
// 覆盖场景：
//   1. 统计卡片渲染（今日登录 / 成功 / 失败 / 失败率）
//   2. 数据行（登录成功/失败）渲染
//   3. 筛选下拉框渲染
//   4. API 调用验证
// ============================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// Mock -- 必须在 import 组件之前
// ============================================================

vi.mock("@/app/api/admin", () => ({
  getLoginLogs: vi.fn(),
  getLoginLogStats: vi.fn(),
}));

// Mock shadcn/ui Select
vi.mock("@/components/ui/select", () => {
  const Select = ({ children, value, onValueChange, ..._props }: any) =>
    React.createElement(
      "select",
      {
        value: value ?? "",
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
          onValueChange?.(e.target.value),
        "data-testid": "select",
      },
      children,
    );
  const SelectTrigger = ({ children, ..._props }: any) =>
    React.createElement(React.Fragment, null, children);
  const SelectValue = ({ placeholder, ..._props }: any) =>
    React.createElement(React.Fragment, null, placeholder);
  const SelectContent = ({ children, ..._props }: any) =>
    React.createElement(React.Fragment, null, children);
  const SelectItem = ({ value, children, ..._props }: any) =>
    React.createElement("option", { value: value ?? "" }, children);
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

import { LoginLogs } from "@/app/components/admin/LoginLogs";
import { getLoginLogs, getLoginLogStats } from "@/app/api/admin";
import type { LoginLogEntry, LoginLogStats } from "@/app/types/admin";

// ============================================================
// Helpers
// ============================================================

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function makeStats(overrides: Partial<LoginLogStats> = {}): LoginLogStats {
  return {
    today_total: 120,
    today_success: 115,
    today_failure: 5,
    today_failure_rate: 0.04,
    ...overrides,
  } as LoginLogStats;
}

function makeLogEntry(overrides: Partial<LoginLogEntry> = {}): LoginLogEntry {
  return {
    id: 1,
    user_type: "admin",
    admin_id: 101,
    user_id: 0,
    login_type: "success",
    fail_reason: "",
    ip_address: "192.168.1.100",
    created_at: "2026-05-17T10:30:25",
    ...overrides,
  } as LoginLogEntry;
}

// ============================================================
// Tests
// ============================================================

describe("LoginLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title as heading", async () => {
    vi.mocked(getLoginLogStats).mockResolvedValue(makeStats());
    vi.mocked(getLoginLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<LoginLogs />);
    expect(await screen.findByRole("heading", { name: "登录日志" })).toBeInTheDocument();
  });

  it("renders stat cards with data", async () => {
    vi.mocked(getLoginLogStats).mockResolvedValue(
      makeStats({
        today_total: 120,
        today_success: 115,
        today_failure: 5,
        today_failure_rate: 0.04,
      }),
    );
    vi.mocked(getLoginLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<LoginLogs />);

    await waitFor(() => {
      expect(screen.getByText("120")).toBeInTheDocument();
    });
    expect(screen.getByText("今日登录总数")).toBeInTheDocument();
    expect(screen.getByText("成功登录")).toBeInTheDocument();
    expect(screen.getByText("失败登录")).toBeInTheDocument();
    expect(screen.getByText("失败率")).toBeInTheDocument();
  });

  it("renders log table with success and failure entries", async () => {
    vi.mocked(getLoginLogStats).mockResolvedValue(makeStats());
    vi.mocked(getLoginLogs).mockResolvedValue({
      items: [
        makeLogEntry({ id: 1, login_type: "success" }),
        makeLogEntry({ id: 2, login_type: "failure", fail_reason: "密码错误" }),
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<LoginLogs />);

    await waitFor(() => {
      expect(screen.getByText("密码错误")).toBeInTheDocument();
    });
  });

  it("renders user type filter select", async () => {
    vi.mocked(getLoginLogStats).mockResolvedValue(makeStats());
    vi.mocked(getLoginLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<LoginLogs />);
    await screen.findByRole("heading", { name: "登录日志" });
    expect(screen.getByText("用户类型")).toBeInTheDocument();
  });

  it("calls getLoginLogStats on mount", async () => {
    vi.mocked(getLoginLogStats).mockResolvedValue(makeStats());
    vi.mocked(getLoginLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<LoginLogs />);
    await waitFor(() => {
      expect(getLoginLogStats).toHaveBeenCalledTimes(1);
    });
  });
});
