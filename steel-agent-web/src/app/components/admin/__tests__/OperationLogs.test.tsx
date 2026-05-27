// ============================================================
// OperationLogs 单元测试
//
// 覆盖场景：
//   1. 表格列头渲染
//   2. 筛选栏渲染
//   3. 数据行渲染
//   4. 导出按钮渲染
// ============================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// Mock -- 必须在 import 组件之前
// ============================================================

vi.mock("@/app/api/admin", () => ({
  getOperationLogs: vi.fn(),
  getOperationLogDetail: vi.fn(),
  exportOperationLogs: vi.fn(),
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

// Mock shadcn/ui Dialog
vi.mock("@/components/ui/dialog", () => {
  const Dialog = ({ children, open, ..._props }: any) =>
    open ? React.createElement("div", { "data-testid": "dialog" }, children) : null;
  const DialogContent = ({ children, ..._props }: any) =>
    React.createElement("div", null, children);
  const DialogHeader = ({ children, ..._props }: any) =>
    React.createElement("div", null, children);
  const DialogTitle = ({ children, ..._props }: any) =>
    React.createElement("h2", null, children);
  return { Dialog, DialogContent, DialogHeader, DialogTitle };
});

import { OperationLogs } from "@/app/components/admin/OperationLogs";
import { getOperationLogs } from "@/app/api/admin";
import type { OperationLog } from "@/app/types/admin";

// ============================================================
// Helpers
// ============================================================

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function makeLog(overrides: Partial<OperationLog> = {}): OperationLog {
  return {
    id: "1",
    timestamp: "2026-05-17 10:30:25",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "system_config",
    summary: "修改了系统设置",
    ip: "192.168.1.100",
    detail: { changed: "siteName" },
    ...overrides,
  } as OperationLog;
}

// ============================================================
// Tests
// ============================================================

describe("OperationLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title as heading", async () => {
    vi.mocked(getOperationLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<OperationLogs />);
    expect(await screen.findByRole("heading", { name: "操作日志" })).toBeInTheDocument();
  });

  it("renders filter bar with operator and action type selects", async () => {
    vi.mocked(getOperationLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<OperationLogs />);
    await screen.findByRole("heading", { name: "操作日志" });
    expect(screen.getByText("操作人")).toBeInTheDocument();
    expect(screen.getByText("操作类型")).toBeInTheDocument();
  });

  it("renders table data rows when data is loaded", async () => {
    vi.mocked(getOperationLogs).mockResolvedValue({
      items: [
        makeLog({ id: "1", summary: "修改了系统设置" }),
        makeLog({ id: "2", summary: "添加了新用户" }),
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<OperationLogs />);

    await waitFor(() => {
      expect(screen.getByText("修改了系统设置")).toBeInTheDocument();
    });
    expect(screen.getByText("添加了新用户")).toBeInTheDocument();
  });

  it("renders search button", async () => {
    vi.mocked(getOperationLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<OperationLogs />);
    await screen.findByRole("heading", { name: "操作日志" });
    expect(screen.getByText("搜索")).toBeInTheDocument();
  });

  it("renders export button in actions", async () => {
    vi.mocked(getOperationLogs).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    renderWithRouter(<OperationLogs />);
    await screen.findByRole("heading", { name: "操作日志" });
    expect(screen.getByText("导出日志")).toBeInTheDocument();
  });
});
