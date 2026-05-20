import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PriceCard, type PriceCardProps } from "@/app/components/Cards/PriceCard";

function renderCard(props: Partial<PriceCardProps> = {}) {
  const defaultProps: PriceCardProps = {
    title: "螺纹钢 HRB400E",
    prices: [
      { region: "上海", price: 3850, change: 50, changePct: 1.32 },
      { region: "北京", price: 3820, change: -30, changePct: -0.78 },
    ],
  };

  return render(<PriceCard {...defaultProps} {...props} />);
}

describe("PriceCard", () => {
  // =========================================================================
  // 基础渲染
  // =========================================================================

  it("should render eyebrow PRICE by default", () => {
    renderCard();
    expect(screen.getByText("PRICE")).toBeInTheDocument();
  });

  it("should render custom eyebrow when provided", () => {
    renderCard({ eyebrow: "CUSTOM" });
    expect(screen.getByText("CUSTOM")).toBeInTheDocument();
  });

  it("should render title", () => {
    renderCard({ title: "螺纹钢 HRB400E" });
    expect(screen.getByText("螺纹钢 HRB400E")).toBeInTheDocument();
  });

  it("should render region names for all prices", () => {
    renderCard({
      prices: [
        { region: "上海", price: 3850, change: 50, changePct: 1.32 },
        { region: "北京", price: 3820, change: -30, changePct: -0.78 },
        { region: "广州", price: 3900, change: 0, changePct: 0 },
      ],
    });

    expect(screen.getByText("上海")).toBeInTheDocument();
    expect(screen.getByText("北京")).toBeInTheDocument();
    expect(screen.getByText("广州")).toBeInTheDocument();
  });

  it("should format prices with ¥ and thousands separator", () => {
    renderCard({
      prices: [{ region: "上海", price: 3850, change: 50, changePct: 1.32 }],
    });

    expect(screen.getByText("¥3,850")).toBeInTheDocument();
  });

  // =========================================================================
  // 涨跌颜色与图标
  // =========================================================================

  it("should display up arrow and steel-up color for positive change", () => {
    const { container } = renderCard({
      prices: [{ region: "上海", price: 4000, change: 100, changePct: 2.5 }],
    });

    // Change text should contain + prefix
    expect(screen.getByText("+100 (+2.5%)")).toBeInTheDocument();

    // The change text element should have steel-up class
    const changeSpan = screen.getByText("+100 (+2.5%)");
    expect(changeSpan.className).toContain("text-steel-up");
  });

  it("should display down arrow and steel-down color for negative change", () => {
    renderCard({
      prices: [{ region: "北京", price: 3820, change: -30, changePct: -0.78 }],
    });

    // For negative values: change: -30, changePct: -0.78 => "-30 (-0.78%)"
    expect(screen.getByText("-30 (-0.78%)")).toBeInTheDocument();

    const changeSpan = screen.getByText("-30 (-0.78%)");
    expect(changeSpan.className).toContain("text-steel-down");
  });

  it("should display minus icon and muted color for zero change", () => {
    renderCard({
      prices: [{ region: "广州", price: 3900, change: 0, changePct: 0 }],
    });

    expect(screen.getByText("+0 (+0%)")).toBeInTheDocument();
  });

  // =========================================================================
  // 来源与时间
  // =========================================================================

  it("should render source footer when provided", () => {
    renderCard({ source: "Wind 终端" });
    expect(screen.getByText("数据来源: Wind 终端")).toBeInTheDocument();
  });

  it("should NOT render source footer when not provided", () => {
    renderCard();
    expect(screen.queryByText(/数据来源/)).not.toBeInTheDocument();
  });

  it("should render source time in header when provided", () => {
    renderCard({ sourceTime: "14:32" });
    expect(screen.getByText("14:32")).toBeInTheDocument();
  });

  // =========================================================================
  // 操作按钮
  // =========================================================================

  it("should render view trend button when onViewTrend is provided", () => {
    const onViewTrend = vi.fn();
    renderCard({ onViewTrend });
    expect(screen.getByText("查看走势")).toBeInTheDocument();
  });

  it("should call onViewTrend when view trend button clicked", async () => {
    const onViewTrend = vi.fn();
    const user = userEvent.setup();
    renderCard({ onViewTrend });

    await user.click(screen.getByText("查看走势"));
    expect(onViewTrend).toHaveBeenCalledOnce();
  });

  it("should render set alert button when onSetAlert is provided", () => {
    const onSetAlert = vi.fn();
    renderCard({ onSetAlert });
    expect(screen.getByText("设置预警")).toBeInTheDocument();
  });

  it("should call onSetAlert when set alert button clicked", async () => {
    const onSetAlert = vi.fn();
    const user = userEvent.setup();
    renderCard({ onSetAlert });

    await user.click(screen.getByText("设置预警"));
    expect(onSetAlert).toHaveBeenCalledOnce();
  });

  it("should NOT render action buttons when callbacks not provided", () => {
    renderCard();
    expect(screen.queryByText("查看走势")).not.toBeInTheDocument();
    expect(screen.queryByText("设置预警")).not.toBeInTheDocument();
  });
});
