import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuickSelectChips } from "@/app/components/Chat/QuickSelectChips";

describe("QuickSelectChips", () => {
  const defaultOptions = ["螺纹钢", "热卷", "冷轧"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 基础渲染
  // =========================================================================

  it("should render all options", () => {
    render(
      <QuickSelectChips options={["A", "B", "C"]} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "C" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("should render label when provided", () => {
    render(
      <QuickSelectChips
        options={defaultOptions}
        label="选择品种"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("选择品种")).toBeInTheDocument();
  });

  it("should not render label when not provided", () => {
    render(
      <QuickSelectChips options={defaultOptions} onSelect={vi.fn()} />,
    );

    expect(screen.queryByText("选择品种")).not.toBeInTheDocument();
  });

  // =========================================================================
  // 交互行为
  // =========================================================================

  it("should call onSelect with clicked option", async () => {
    const onSelect = vi.fn();

    render(
      <QuickSelectChips options={["A", "B", "C"]} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "B" }));

    expect(onSelect).toHaveBeenCalledWith("B");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // 选中样式
  // =========================================================================

  it("should apply selected style to selectedValue", () => {
    render(
      <QuickSelectChips
        options={["A", "B", "C"]}
        selectedValue="B"
        onSelect={vi.fn()}
      />,
    );

    const buttonB = screen.getByRole("button", { name: "B" });
    const buttonA = screen.getByRole("button", { name: "A" });
    const buttonC = screen.getByRole("button", { name: "C" });

    expect(buttonB.className).toContain("bg-steel-ink");
    expect(buttonA.className).not.toContain("bg-steel-ink");
    expect(buttonC.className).not.toContain("bg-steel-ink");
  });

  // =========================================================================
  // 禁用状态
  // =========================================================================

  it("should disable all chips when disabled=true", () => {
    render(
      <QuickSelectChips
        options={["A", "B", "C"]}
        disabled
        onSelect={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button.className).toContain("pointer-events-none");
      expect(button).toBeDisabled();
    }
  });

  // =========================================================================
  // 内部锁定状态
  // =========================================================================

  it("should lock after clicking when managed internally", async () => {
    const onSelect = vi.fn();

    render(
      <QuickSelectChips options={["A", "B", "C"]} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "A" }));

    expect(onSelect).toHaveBeenCalledWith("A");
    expect(onSelect).toHaveBeenCalledTimes(1);

    const buttonB = screen.getByRole("button", { name: "B" });
    expect(buttonB.className).toContain("pointer-events-none");
    expect(buttonB).toBeDisabled();

    fireEvent.click(buttonB);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
