// ============================================================
// PriceBoard 页面测试
// ============================================================

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// -----------------------------------------------------------
// vi.hoisted: 在 vi.mock 提升前定义可变的 mock 引用
// -----------------------------------------------------------
const { mockNavigate, mockUseQueryImpl } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseQueryImpl: vi.fn(),
}));

// -----------------------------------------------------------
// Mock react-router-dom
// -----------------------------------------------------------
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// -----------------------------------------------------------
// Mock @tanstack/react-query — useQuery 返回可配置结果
// -----------------------------------------------------------
vi.mock("@tanstack/react-query", () => ({
  useQuery: mockUseQueryImpl,
}));

// -----------------------------------------------------------
// Mock sonner (PriceCard 依赖)
// -----------------------------------------------------------
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// -----------------------------------------------------------
// Mock alertStore (PriceCard 依赖)
// -----------------------------------------------------------
vi.mock("@/app/stores/alertStore", () => ({
  useAlertStore: () => ({
    createAlert: vi.fn().mockResolvedValue({}),
  }),
}));

// -----------------------------------------------------------
// 辅助: 创建默认 useQuery 返回值
// -----------------------------------------------------------
function defaultQueryReturn(overrides: Record<string, any> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

// -----------------------------------------------------------
// 辅助: 根据 queryKey 返回不同 mock 数据
// -----------------------------------------------------------
type QueryKeyConfig = Record<string, Record<string, any>>;

function setupUseQuery(keys: QueryKeyConfig) {
  mockUseQueryImpl.mockImplementation(({ queryKey }: any) => {
    const key = queryKey?.[0] as string;
    if (keys[key]) {
      return defaultQueryReturn(keys[key]);
    }
    return defaultQueryReturn();
  });
}

// -----------------------------------------------------------
// 测试数据
// -----------------------------------------------------------
const mockPriceItem = {
  id: 1,
  category: "螺纹钢",
  spec: "HRB400E",
  price: 3850,
  change: 12,
  change_pct: 0.31,
  region: "上海",
  source: "我的钢铁网",
  price_date: "2026-05-26",
};

const mockListData = {
  items: [mockPriceItem],
  total: 1,
  limit: 20,
  offset: 0,
};

// -----------------------------------------------------------
// 测试套件
// -----------------------------------------------------------

describe("PriceBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryImpl.mockReset();
  });

  // =========================================================================
  // Test 1: 渲染品种 Tab 和筛选栏
  // =========================================================================
  it("renders category tabs and filter bar", async () => {
    setupUseQuery({
      "price-list": { data: undefined, isLoading: false },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    render(<PriceBoard />);

    const categories = ["螺纹钢", "热卷", "冷轧", "中厚板", "镀锌板", "彩涂板", "不锈钢", "型钢", "管材"];
    for (const cat of categories) {
      expect(screen.getByRole("button", { name: cat })).toBeInTheDocument();
    }

    // 筛选栏: 区域下拉, 规格输入, 查询按钮
    expect(screen.getByRole("combobox", { name: "区域筛选" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "规格型号" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查询" })).toBeInTheDocument();

    // 视图切换: 列表/走势/对比 (sm 下只显示图标, 文字是 hidden)
    // 视图按钮存在即可
    expect(screen.getByText("列表")).toBeInTheDocument();
    expect(screen.getByText("走势")).toBeInTheDocument();
    expect(screen.getByText("对比")).toBeInTheDocument();
  });

  // =========================================================================
  // Test 2: 点击品种 Tab 切换选中态
  // =========================================================================
  it("clicking a category tab selects it", async () => {
    setupUseQuery({
      "price-list": { data: undefined, isLoading: false },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    render(<PriceBoard />);

    const rebarBtns = screen.getAllByRole("button", { name: "螺纹钢" });
    expect(rebarBtns.length).toBeGreaterThanOrEqual(1);
    expect(rebarBtns[0].className).toContain("bg-steel-ink");

    const hotRolledBtn = screen.getByRole("button", { name: "热卷" });
    fireEvent.click(hotRolledBtn);

    // "热卷" 变为激活态
    expect(hotRolledBtn.className).toContain("bg-steel-ink");
    // "螺纹钢" 变为非激活态
    expect(rebarBtns[0].className).toContain("text-steel-body");
  });

  // =========================================================================
  // Test 3: 加载中显示骨架屏
  // =========================================================================
  it("shows loading skeleton when data is loading", async () => {
    setupUseQuery({
      "price-list": { data: undefined, isLoading: true, isError: false },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    const { container } = render(<PriceBoard />);

    // LoadingSkeleton variant="card" count={3} 渲染动画骨架条
    // LoadingSkeleton 包含 .animate-pulse 元素
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    // 不应显示价格数据
    expect(screen.queryByText(/¥/)).not.toBeInTheDocument();
    // 不应显示空态
    expect(screen.queryByText("暂无价格数据")).not.toBeInTheDocument();
  });

  // =========================================================================
  // Test 4: API 失败显示错误状态
  // =========================================================================
  it("shows error state when API fails", async () => {
    const mockRefetch = vi.fn();
    setupUseQuery({
      "price-list": {
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("网络错误"),
        refetch: mockRefetch,
      },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    render(<PriceBoard />);

    // ErrorState 显示错误消息
    expect(screen.getByText("网络错误")).toBeInTheDocument();

    // 重试按钮存在
    const retryBtn = screen.getByRole("button", { name: "重试" });
    expect(retryBtn).toBeInTheDocument();

    // 点击重试应调用 refetch
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  // =========================================================================
  // Test 5: 数据加载后渲染 PriceCard 列表
  // =========================================================================
  it("renders PriceCard list when data is loaded", async () => {
    setupUseQuery({
      "price-list": { data: mockListData, isLoading: false, isError: false },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    render(<PriceBoard />);

    // PriceCard 渲染: 应包含 "PRICE" eyebrow
    // 注意: "螺纹钢" 同时出现在 CategoryTabs 按钮和 PriceCard 标题中
    //       "上海" 同时出现在区域下拉选项和 PriceCard 价格行中
    expect(screen.getByText("PRICE")).toBeInTheDocument();
    expect(screen.getAllByText("螺纹钢")).toHaveLength(2); // tab + card title
    expect(screen.getAllByText("上海")).toHaveLength(2);   // select option + price row

    // 价格格式化: ¥3,850
    expect(screen.getByText("¥3,850")).toBeInTheDocument();

    // 涨跌: +12 (+0.31%)
    expect(screen.getByText("+12 (+0.31%)")).toBeInTheDocument();

    // 来源
    expect(screen.getByText("数据来源: 我的钢铁网")).toBeInTheDocument();

    // 操作按钮
    expect(screen.getByText("查看走势")).toBeInTheDocument();
    expect(screen.getByText("设置预警")).toBeInTheDocument();
  });

  // =========================================================================
  // Test 6: 视图模式切换 (列表 → 走势)
  // =========================================================================
  it("view mode switching from list to trend works", async () => {
    setupUseQuery({
      "price-list": { data: mockListData, isLoading: false },
      // trend 视图的 query 也需要 mock
      "price-trend": {
        data: [{ price_date: "2026-05-20", price: 3850 }],
        isLoading: true,
      },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    render(<PriceBoard />);

    // 默认 list 模式: PriceCard 可见
    expect(screen.getByText("¥3,850")).toBeInTheDocument();

    // 点击 "走势" 按钮
    const trendBtn = screen.getByRole("button", { name: "走势" });
    fireEvent.click(trendBtn);

    // trend 模式激活: trendBtn 应获得激活样式
    expect(trendBtn.className).toContain("bg-steel-ink");

    // trendLoading=true 时应显示 TrendCard 骨架 (isLoading)
    // TrendCard 的 isLoading 态渲染 "暂无数据" 占位
    // 或者有 animate-pulse 骨架
    // 此时不应再显示 PriceCard 的内容
    expect(screen.queryByText("¥3,850")).not.toBeInTheDocument();
  });

  // =========================================================================
  // Test 7: 空数据状态
  // =========================================================================
  it("shows empty state when no price data", async () => {
    setupUseQuery({
      "price-list": {
        data: { items: [], total: 0, limit: 20, offset: 0 },
        isLoading: false,
        isError: false,
      },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    render(<PriceBoard />);

    expect(screen.getByText("暂无价格数据")).toBeInTheDocument();
  });

  // =========================================================================
  // Test 8: 对比视图 switch
  // =========================================================================
  it("view mode switching to compare works", async () => {
    setupUseQuery({
      "price-list": { data: mockListData, isLoading: false },
      "price-compare": { data: {}, isLoading: true },
    });

    const PriceBoardModule = await import("@/app/pages/PriceBoard");
    const PriceBoard = PriceBoardModule.default;
    render(<PriceBoard />);

    // 点击 "对比"
    const compareBtn = screen.getByRole("button", { name: "对比" });
    fireEvent.click(compareBtn);

    // 对比按钮变为激活态
    expect(compareBtn.className).toContain("bg-steel-ink");

    // 列表内容消失
    expect(screen.queryByText("¥3,850")).not.toBeInTheDocument();
  });
});
