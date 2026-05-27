// ============================================================
// SystemSettings 单元测试
//
// 覆盖场景：
//   1. 三个设置区块（基础设置 / 通知配置 / 安全设置）渲染
//   2. Mock API 数据回填到表单字段
//   3. 保存按钮渲染
// ============================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// Mock -- 必须在 import 组件之前
// ============================================================

vi.mock("@/app/api/admin", () => ({
  getSystemSettings: vi.fn().mockResolvedValue({
    siteName: "Test Site",
    logoUrl: "",
    contactEmail: "test@test.com",
    contactPhone: "400-000-0000",
    emailEnabled: false,
    smtpServer: "",
    smtpPort: 465,
    smtpEncryption: "SSL",
    smtpEmail: "",
    smtpPassword: "",
    smsEnabled: false,
    smsProvider: "阿里云短信",
    smsAccessKey: "",
    smsSignature: "",
    sessionTimeout: 30,
    loginLockCount: 5,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
  }),
  saveSystemSettings: vi.fn().mockResolvedValue(undefined),
  uploadLogo: vi.fn().mockResolvedValue("/uploads/test.png"),
  testEmail: vi.fn().mockResolvedValue({ success: true, message: "发送成功" }),
}));

// Mock shadcn/ui Switch（原生 checkbox 替代）
vi.mock("@/components/ui/switch", () => {
  const Switch = ({ checked, onCheckedChange, ..._props }: any) =>
    React.createElement("input", {
      type: "checkbox",
      checked,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        onCheckedChange?.(e.target.checked),
      "data-testid": "switch",
    });
  return { Switch };
});

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

// Mock shadcn/ui Dialog（防止 Radix 在 jsdom 中报错）
vi.mock("@/components/ui/dialog", () => {
  const Dialog = ({ children, open, ..._props }: any) =>
    open ? React.createElement("div", { "data-testid": "dialog" }, children) : null;
  const DialogContent = ({ children, ..._props }: any) =>
    React.createElement("div", null, children);
  const DialogHeader = ({ children, ..._props }: any) =>
    React.createElement("div", null, children);
  const DialogTitle = ({ children, ..._props }: any) =>
    React.createElement("h2", null, children);
  const DialogDescription = ({ children, ..._props }: any) =>
    React.createElement("p", null, children);
  return { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription };
});

import SystemSettingsPage from "@/app/components/admin/SystemSettings";
import { getSystemSettings } from "@/app/api/admin";

// ============================================================
// Helpers
// ============================================================

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// ============================================================
// Tests
// ============================================================

describe("SystemSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders three setting sections", async () => {
    renderWithRouter(<SystemSettingsPage />);
    expect(await screen.findByText("基础设置")).toBeInTheDocument();
    expect(screen.getByText("通知配置")).toBeInTheDocument();
    expect(screen.getByText("安全设置")).toBeInTheDocument();
  });

  it("loads and displays site name from API", async () => {
    renderWithRouter(<SystemSettingsPage />);
    const input = await screen.findByDisplayValue("Test Site");
    expect(input).toBeInTheDocument();
  });

  it("loads and displays contact email from API", async () => {
    renderWithRouter(<SystemSettingsPage />);
    const input = await screen.findByDisplayValue("test@test.com");
    expect(input).toBeInTheDocument();
  });

  it("loads and displays contact phone from API", async () => {
    renderWithRouter(<SystemSettingsPage />);
    const input = await screen.findByDisplayValue("400-000-0000");
    expect(input).toBeInTheDocument();
  });

  it("calls getSystemSettings on mount", async () => {
    renderWithRouter(<SystemSettingsPage />);
    await waitFor(() => {
      expect(getSystemSettings).toHaveBeenCalledTimes(1);
    });
  });

  it("shows save settings button", async () => {
    renderWithRouter(<SystemSettingsPage />);
    expect(await screen.findByText("保存设置")).toBeInTheDocument();
  });

  it("displays section icons", async () => {
    const { container } = renderWithRouter(<SystemSettingsPage />);
    await screen.findByText("基础设置");
    // 三个区块标题都在
    expect(container.querySelectorAll("h2")).toHaveLength(3);
  });
});
