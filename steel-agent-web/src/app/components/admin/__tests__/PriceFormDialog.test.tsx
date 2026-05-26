import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PriceFormDialog from "@/app/components/admin/PriceFormDialog";
import type { PriceFormData } from "@/app/components/admin/PriceFormDialog";

describe("PriceFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Test 1: renders in create mode with empty form and default date
  // =========================================================================

  it("renders in create mode with empty form and default date", () => {
    const today = new Date().toISOString().slice(0, 10);

    render(
      <PriceFormDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    // dialog title
    expect(screen.getByText("新增价格")).toBeInTheDocument();

    // placeholder text on inputs
    expect(screen.getByPlaceholderText("如：螺纹钢")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("如：HRB400E 20mm")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("如：上海")).toBeInTheDocument();

    // price_date defaults to today
    const dateInput = screen.getByDisplayValue(today);
    expect(dateInput).toBeInTheDocument();

    // save button text is "创建"
    expect(screen.getByText("创建")).toBeInTheDocument();
  });

  // =========================================================================
  // Test 2: renders in edit mode with prefilled fields
  // =========================================================================

  it("renders in edit mode with prefilled fields", () => {
    const initialData: PriceFormData = {
      category: "螺纹钢",
      spec: "HRB400E",
      price: 3850,
      change: 12,
      change_pct: 0.31,
      region: "上海",
      source: "我的钢铁网",
      price_date: "2026-05-26",
    };

    render(
      <PriceFormDialog
        open={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialData={initialData}
      />,
    );

    // dialog title
    expect(screen.getByText("编辑价格")).toBeInTheDocument();

    // category input value
    const categoryInput = screen.getByDisplayValue("螺纹钢");
    expect(categoryInput).toBeInTheDocument();

    // price input value
    const priceInput = screen.getByDisplayValue("3850");
    expect(priceInput).toBeInTheDocument();

    // spec input value
    expect(screen.getByDisplayValue("HRB400E")).toBeInTheDocument();

    // region input value
    expect(screen.getByDisplayValue("上海")).toBeInTheDocument();

    // save button text is "更新"
    expect(screen.getByText("更新")).toBeInTheDocument();
  });

  // =========================================================================
  // Test 3: shows validation error when required fields are empty
  // =========================================================================

  it("shows validation error when required fields are empty", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <PriceFormDialog
        open={true}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    // click save without filling required fields
    await user.click(screen.getByText("创建"));

    await waitFor(() => {
      expect(screen.getByText("品种不能为空")).toBeInTheDocument();
      expect(screen.getByText("价格不能为空")).toBeInTheDocument();
    });

    // onSave should not have been called
    expect(onSave).not.toHaveBeenCalled();
  });

  // =========================================================================
  // Test 4: calls onSave with form data on submit
  // =========================================================================

  it("calls onSave with form data on submit", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <PriceFormDialog
        open={true}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    // fill category
    await user.type(screen.getByPlaceholderText("如：螺纹钢"), "螺纹钢");

    // fill price (first of three inputs with placeholder="0")
    const priceInput = screen.getAllByPlaceholderText("0")[0];
    await user.clear(priceInput);
    await user.type(priceInput, "3850");

    // fill region
    await user.type(screen.getByPlaceholderText("如：上海"), "上海");

    // fill price_date (type=date input)
    const dateInput = screen.getByDisplayValue(
      new Date().toISOString().slice(0, 10),
    );
    await user.clear(dateInput);
    await user.type(dateInput, "2026-05-26");

    // click save
    await user.click(screen.getByText("创建"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "螺纹钢",
          price: 3850,
          region: "上海",
          price_date: "2026-05-26",
        }),
      );
    });
  });

  // =========================================================================
  // Test 5: calls onClose when dialog is closed
  // =========================================================================

  it("calls onClose when cancel button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <PriceFormDialog
        open={true}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    await user.click(screen.getByText("取消"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Radix close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <PriceFormDialog
        open={true}
        onClose={onClose}
        onSave={vi.fn()}
      />,
    );

    // Radix UI Dialog renders a close button with sr-only "Close"
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
