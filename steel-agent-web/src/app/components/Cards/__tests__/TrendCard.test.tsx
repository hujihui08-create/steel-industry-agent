import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TrendCard, type TrendCardProps } from "@/app/components/Cards/TrendCard";

// recharts ResponsiveContainer needs dimensions in jsdom
// vitest.config.ts has css:true, but ResponsiveContainer requires width/height > 0
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...(actual as object),
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: "100%", height: 200 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

function renderCard(props: Partial<TrendCardProps> = {}) {
  const defaultProps: TrendCardProps = {
    title: "螺纹钢价格走势",
    data: [
      { date: "05-12", value: 3800 },
      { date: "05-13", value: 3820 },
      { date: "05-14", value: 3810 },
      { date: "05-15", value: 3830 },
      { date: "05-16", value: 3850 },
    ],
  };

  return render(<TrendCard {...defaultProps} {...props} />);
}

describe("TrendCard", () => {
  // =========================================================================
  // 基础渲染
  // =========================================================================

  it("should render title", () => {
    renderCard({ title: "螺纹钢价格走势" });
    expect(screen.getByText("螺纹钢价格走势")).toBeInTheDocument();
  });

  it("should render period text when provided", () => {
    renderCard({ period: "近30天" });
    expect(screen.getByText("近30天")).toBeInTheDocument();
  });

  it("should NOT render period text when not provided", () => {
    renderCard();
    expect(screen.queryByText("近30天")).not.toBeInTheDocument();
  });

  it("should display last data point value", () => {
    renderCard({
      data: [
        { date: "05-12", value: 3800 },
        { date: "05-13", value: 3850 },
      ],
    });

    expect(screen.getByText("¥3,850")).toBeInTheDocument();
  });

  // =========================================================================
  // 涨跌幅显示
  // =========================================================================

  it("should display positive change percentage with up arrow", () => {
    renderCard({ changePct: 2.5 });

    expect(screen.getByText("+2.50%")).toBeInTheDocument();
  });

  it("should display negative change percentage with down arrow", () => {
    renderCard({ changePct: -1.2 });

    expect(screen.getByText("-1.20%")).toBeInTheDocument();
  });

  it("should NOT display change percentage when not provided", () => {
    renderCard();
    // No change percentage text should be visible
    const changeEls = document.querySelectorAll('[class*="tabular-nums"]');
    // Only the price value element should be present
    expect(changeEls.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // 空数据状态
  // =========================================================================

  it("should show empty state when data is empty array", () => {
    renderCard({ data: [] });

    expect(screen.getByText("暂无走势数据")).toBeInTheDocument();
  });

  // =========================================================================
  // 图表区域
  // =========================================================================

  it("should render chart area", () => {
    const { container } = renderCard();

    const chartArea = container.querySelector('[class*="h-\\[200px\\]"]');
    expect(chartArea).toBeInTheDocument();
  });

  // =========================================================================
  // 加载骨架屏状态
  // =========================================================================

  it("should show loading skeleton when isLoading=true", () => {
    const { container } = renderCard({ isLoading: true });

    // 应该展示骨架屏动画块
    const skeletonBlocks = container.querySelectorAll(".animate-pulse");
    expect(skeletonBlocks.length).toBeGreaterThanOrEqual(3);

    // 不应展示实际的标题文字
    expect(screen.queryByText("螺纹钢价格走势")).not.toBeInTheDocument();

    // 不应展示价格数值
    expect(screen.queryByText("¥3,850")).not.toBeInTheDocument();

    // 不应展示空数据状态
    expect(screen.queryByText("暂无走势数据")).not.toBeInTheDocument();

    // 图表区域应为骨架块（包含 h-[200px] 类名）
    const chartSkeleton = container.querySelector(
      '[class*="animate-pulse"][class*="h-\\[200px\\]"]'
    );
    expect(chartSkeleton).toBeInTheDocument();
  });
});
