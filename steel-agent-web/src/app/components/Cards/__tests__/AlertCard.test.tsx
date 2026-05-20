import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { AlertCard, AlertCardProps } from "@/app/components/Cards/AlertCard";

function renderCard(props: Partial<AlertCardProps> = {}) {
  const defaultProps: AlertCardProps = {
    category: "螺纹钢",
    spec: "HRB400E 20mm",
    region: "上海",
    targetPrice: 4000,
    condition: "above",
  };

  return render(<AlertCard {...defaultProps} {...props} />);
}

describe("AlertCard", () => {
  // =========================================================================
  // 基础渲染
  // =========================================================================

  it("should render eyebrow ALERT", () => {
    renderCard();
    expect(screen.getByText("ALERT")).toBeInTheDocument();
  });

  it("should render category and spec in title", () => {
    renderCard({ category: "螺纹钢", spec: "HRB400E 20mm" });
    expect(screen.getByText("螺纹钢 HRB400E 20mm")).toBeInTheDocument();
  });

  it("should render all detail rows", () => {
    renderCard({
      category: "螺纹钢",
      spec: "HRB400E 20mm",
      region: "上海",
      targetPrice: 4000,
    });

    expect(screen.getByText("品种")).toBeInTheDocument();
    expect(screen.getByText("规格")).toBeInTheDocument();
    expect(screen.getByText("地区")).toBeInTheDocument();
    expect(screen.getByText("目标价格")).toBeInTheDocument();
    expect(screen.getByText("条件")).toBeInTheDocument();
  });

  it("should show above condition icon and text", () => {
    renderCard({ condition: "above", targetPrice: 4000 });
    // conditionText renders "价格 ≥ ¥4,000"
    expect(screen.getByText(/价格 ≥ ¥4,000/)).toBeInTheDocument();
  });

  it("should show below condition icon and text", () => {
    renderCard({ condition: "below", targetPrice: 3800 });
    expect(screen.getByText(/价格 ≤ ¥3,800/)).toBeInTheDocument();
  });

  it("should render notify method when provided", () => {
    renderCard({ notifyMethod: "App推送" });
    expect(screen.getByText("通知方式")).toBeInTheDocument();
    expect(screen.getByText("App推送")).toBeInTheDocument();
  });

  it("should NOT show triggered section by default", () => {
    renderCard();
    expect(screen.queryByText(/当前价格/)).not.toBeInTheDocument();
  });

  it("should show triggered section with warn styling", () => {
    renderCard({ isTriggered: true, currentPrice: 4050 });
    // "当前价格 ¥4,050" — formatPrice uses toLocaleString which produces ¥4,050
    expect(screen.getByText(/当前价格 ¥4,050/)).toBeInTheDocument();
  });

  // =========================================================================
  // 交互行为
  // =========================================================================

  it("should call onModify when modify button clicked", async () => {
    const onModify = vi.fn();
    renderCard({ onModify });

    const modifyButton = screen.getByText("修改条件");
    await userEvent.click(modifyButton);

    expect(onModify).toHaveBeenCalledTimes(1);
  });

  it("should call onViewAll when view all button clicked", async () => {
    const onViewAll = vi.fn();
    renderCard({ onViewAll });

    const viewAllButton = screen.getByText("查看我的预警");
    await userEvent.click(viewAllButton);

    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // 边界情况
  // =========================================================================

  it("should NOT render action buttons when callbacks are not provided", () => {
    renderCard();
    expect(screen.queryByText("修改条件")).not.toBeInTheDocument();
    expect(screen.queryByText("查看我的预警")).not.toBeInTheDocument();
  });

  it("should NOT show notify method row when notifyMethod is not provided", () => {
    renderCard();
    expect(screen.queryByText("通知方式")).not.toBeInTheDocument();
  });

  it("should show triggered section with triggeredAt when both are provided", () => {
    renderCard({
      isTriggered: true,
      currentPrice: 4050,
      triggeredAt: "05-17 14:30",
    });
    // "当前价格 ¥4,050 · 05-17 14:30"
    expect(
      screen.getByText(/当前价格 ¥4,050 · 05-17 14:30/),
    ).toBeInTheDocument();
  });

  it("should display '已触发' badge when isTriggered is true", () => {
    renderCard({ isTriggered: true, currentPrice: 4050 });
    expect(screen.getByText("已触发")).toBeInTheDocument();
  });
});
