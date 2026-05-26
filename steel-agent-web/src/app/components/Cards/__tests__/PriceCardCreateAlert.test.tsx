import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PriceCard } from "@/app/components/Cards/PriceCard";
import type { PriceItem } from "@/app/components/Cards/PriceCard";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useAlertStore
const mockCreateAlert = vi.fn();
vi.mock("@/app/stores/alertStore", () => ({
  useAlertStore: () => ({
    createAlert: mockCreateAlert,
  }),
}));

import { toast } from "sonner";

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultPrices: PriceItem[] = [
  { region: "上海", price: 4000, change: 50, changePct: 1.27 },
];

function renderCard(prices: PriceItem[] = defaultPrices) {
  return render(
    <PriceCard title="螺纹钢 HRB400E 20mm" prices={prices} source="Wind" />
  );
}

describe("PriceCard - createAlert via 设置预警 button", () => {
  // =========================================================================
  // 1. 基础渲染
  // =========================================================================

  it("should render 设置预警 button when prices exist", () => {
    renderCard();
    expect(screen.getByText("设置预警")).toBeInTheDocument();
  });

  // =========================================================================
  // 2. createAlert 调用参数
  // =========================================================================

  it("should call createAlert with correct params on click", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByText("设置预警"));

    expect(mockCreateAlert).toHaveBeenCalledTimes(1);
    expect(mockCreateAlert).toHaveBeenCalledWith({
      category: "螺纹钢 HRB400E 20mm",
      spec: "",
      region: "上海",
      target_price: 4000,
      condition: "above",
    });
  });

  // =========================================================================
  // 3. 成功 toast
  // =========================================================================

  it("should show success toast when createAlert resolves", async () => {
    const user = userEvent.setup();
    mockCreateAlert.mockResolvedValueOnce(undefined);
    renderCard();

    await user.click(screen.getByText("设置预警"));

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("预警设置成功");
    });
  });

  // =========================================================================
  // 4. Error toast — Error instance
  // =========================================================================

  it("should show error toast with message when createAlert rejects with Error", async () => {
    const user = userEvent.setup();
    mockCreateAlert.mockRejectedValueOnce(new Error("创建失败"));
    renderCard();

    await user.click(screen.getByText("设置预警"));

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("创建失败");
    });
  });

  // =========================================================================
  // 5. Error toast — non-Error rejection
  // =========================================================================

  it("should show default error message when createAlert rejects with non-Error", async () => {
    const user = userEvent.setup();
    mockCreateAlert.mockRejectedValueOnce("string error");
    renderCard();

    await user.click(screen.getByText("设置预警"));

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("创建预警失败");
    });
  });

  // =========================================================================
  // 6. prices 为空时不渲染按钮
  // =========================================================================

  it("should NOT render 设置预警 button when prices is empty", () => {
    renderCard([]);
    expect(screen.queryByText("设置预警")).not.toBeInTheDocument();
  });
});
