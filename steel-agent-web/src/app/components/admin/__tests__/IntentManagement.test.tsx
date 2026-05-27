// ============================================================
// IntentManagement 单元测试
//
// 覆盖场景：
//   1. 编辑表单正确追踪意图 ID
//   2. 编辑提交使用 formData.id
//   3. 添加提交调用 createIntent
//   4. 必填字段为空时显示错误
// ============================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// Mock -- 必须在 import 组件之前
// ============================================================

// 1) Mock 后端 API
vi.mock("@/app/api/admin", () => ({
  getIntents: vi.fn(),
  createIntent: vi.fn(),
  updateIntent: vi.fn(),
  deleteIntent: vi.fn(),
  getIntentStats: vi.fn(),
  testIntent: vi.fn(),
}));

// 2) Mock shadcn/ui Select 组件（使用原生 HTML select 避免 Radix 对空 value 的报错）
vi.mock("@/components/ui/select", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // SelectTrigger / SelectValue / SelectContent 在原生 <select> 中无意义，透传子节点
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SelectTrigger = ({ children, ..._props }: any) =>
    React.createElement(React.Fragment, null, children);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SelectValue = ({ placeholder, ..._props }: any) =>
    React.createElement(React.Fragment, null, placeholder);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SelectContent = ({ children, ..._props }: any) =>
    React.createElement(React.Fragment, null, children);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SelectItem = ({ value, children, ..._props }: any) =>
    React.createElement("option", { value: value ?? "" }, children);

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

import { IntentManagement } from "@/app/components/admin/IntentManagement";
import {
  getIntents,
  createIntent,
  updateIntent,
  getIntentStats,
} from "@/app/api/admin";
import type { Intent } from "@/app/types/admin";

// ============================================================
// Helpers
// ============================================================

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function makeIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    id: "1",
    code: "price_query",
    name: "查询价格",
    keywords: "价格,报价",
    entities: ["category", "region"],
    template: "",
    priority: 10,
    status: "enabled",
    toolName: "",
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe("IntentManagement - Add/Edit Form", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 mock 返回空列表
    vi.mocked(getIntents).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    vi.mocked(getIntentStats).mockResolvedValue([]);
    vi.mocked(createIntent).mockResolvedValue(undefined);
    vi.mocked(updateIntent).mockResolvedValue(undefined);
  });

  // =======================================================================
  // 1. Edit form tracks intent ID
  // =======================================================================

  it("should set formData.id when clicking the edit button", async () => {
    // Arrange: getIntents 返回一条意图
    vi.mocked(getIntents).mockResolvedValue({
      items: [
        makeIntent({
          id: "10",
          code: "price_query",
          name: "查询价格",
          keywords: "价格,报价",
          status: "enabled",
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const user = userEvent.setup();
    renderWithRouter(<IntentManagement />);

    // 等待意图名称出现
    await waitFor(() => {
      expect(screen.getByText("查询价格")).toBeInTheDocument();
    });

    // Act: 点击编辑按钮（Pencil 图标，aria-label="编辑意图 查询价格"）
    const editBtn = screen.getByLabelText("编辑意图 查询价格");
    await user.click(editBtn);

    // Assert: 弹窗标题为"编辑意图"
    await waitFor(() => {
      expect(screen.getByText("编辑意图")).toBeInTheDocument();
    });

    // 编辑模式下，意图编码字段应该被禁用（disabled），且值为 "price_query"
    const codeInput = screen.getByDisplayValue("price_query");
    expect(codeInput).toBeInTheDocument();
    expect(codeInput).toBeDisabled();

    // 意图名称字段应该预填 "查询价格"
    const nameInput = screen.getByDisplayValue("查询价格");
    expect(nameInput).toBeInTheDocument();

    // 触发关键词字段应该预填 "价格,报价"
    const keywordsInput = screen.getByDisplayValue("价格,报价");
    expect(keywordsInput).toBeInTheDocument();
  });

  // =======================================================================
  // 2. Submit edit uses formData.id
  // =======================================================================

  it("should call updateIntent with the correct id when submitting edit", async () => {
    // Arrange: 列表包含意图 id="10"
    vi.mocked(getIntents).mockResolvedValue({
      items: [
        makeIntent({
          id: "10",
          code: "price_query",
          name: "查询价格",
          keywords: "价格,报价",
          status: "enabled",
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    const user = userEvent.setup();
    renderWithRouter(<IntentManagement />);

    await waitFor(() => {
      expect(screen.getByText("查询价格")).toBeInTheDocument();
    });

    // 点击编辑按钮
    await user.click(screen.getByLabelText("编辑意图 查询价格"));

    // 等待编辑弹窗出现
    await waitFor(() => {
      expect(screen.getByText("编辑意图")).toBeInTheDocument();
    });

    // 编辑模式 code 被禁用，但我们可以修改 name
    const nameInput = screen.getByDisplayValue("查询价格");
    await user.clear(nameInput);
    await user.type(nameInput, "查询钢材价格");

    // 修改 keywords
    const keywordsInput = screen.getByDisplayValue("价格,报价");
    await user.clear(keywordsInput);
    await user.type(keywordsInput, "价格,报价,市场价");

    // Act: 点击"确定"提交
    await user.click(screen.getByText("确定"));

    // Assert: updateIntent 被调用，且传入的 id 为 "10"
    await waitFor(() => {
      expect(updateIntent).toHaveBeenCalledTimes(1);
      expect(updateIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "10",
          code: "price_query",
          name: "查询钢材价格",
          keywords: "价格,报价,市场价",
        }),
      );
    });

    // createIntent 不应该被调用
    expect(createIntent).not.toHaveBeenCalled();
  });

  // =======================================================================
  // 3. Submit add calls createIntent
  // =======================================================================

  it("should call createIntent when submitting a new intent", async () => {
    vi.mocked(getIntents).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const user = userEvent.setup();
    renderWithRouter(<IntentManagement />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "意图管理" })).toBeInTheDocument();
    });

    // Act: 点击"添加意图"按钮
    await user.click(screen.getByText("添加意图"));

    // 等待添加弹窗出现（用 role="heading" 避免匹配按钮）
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "添加意图" })).toBeInTheDocument();
    });

    // 填写必填字段
    // code
    const codeInput = screen.getByPlaceholderText("如: query_price");
    await user.type(codeInput, "test_intent");

    // name
    const nameInput = screen.getByPlaceholderText("如: 查询价格");
    await user.type(nameInput, "测试意图");

    // keywords
    const keywordsInput = screen.getByPlaceholderText("逗号分隔，如: 价格、多少钱、报价");
    await user.type(keywordsInput, "测试");

    // 点击"确定"提交
    await user.click(screen.getByText("确定"));

    // Assert: createIntent 被调用
    await waitFor(() => {
      expect(createIntent).toHaveBeenCalledTimes(1);
      expect(createIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "test_intent",
          name: "测试意图",
          keywords: "测试",
        }),
      );
    });

    // updateIntent 不应该被调用
    expect(updateIntent).not.toHaveBeenCalled();
  });

  // =======================================================================
  // 4. Empty required fields show errors
  // =======================================================================

  it("should show validation errors when required fields are empty", async () => {
    vi.mocked(getIntents).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    const user = userEvent.setup();
    renderWithRouter(<IntentManagement />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "意图管理" })).toBeInTheDocument();
    });

    // 点击"添加意图"
    await user.click(screen.getByText("添加意图"));

    // 等待添加弹窗出现（用 role="heading" 避免匹配按钮）
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "添加意图" })).toBeInTheDocument();
    });

    // 不填写任何字段，直接点击"确定"
    await user.click(screen.getByText("确定"));

    // Assert: 三个必填字段的错误信息都出现
    await waitFor(() => {
      expect(screen.getByText("意图编码不能为空")).toBeInTheDocument();
      expect(screen.getByText("意图名称不能为空")).toBeInTheDocument();
      expect(screen.getByText("触发关键词不能为空")).toBeInTheDocument();
    });

    // createIntent 和 updateIntent 都不应该被调用
    expect(createIntent).not.toHaveBeenCalled();
    expect(updateIntent).not.toHaveBeenCalled();
  });
});
