import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { QuotationCard } from "@/app/components/Cards/QuotationCard";

describe("QuotationCard", () => {
  it("should render eyebrow QUOTATION", () => {
    render(
      <QuotationCard
        items={[{ label: "材料费", value: 385000 }]}
        total={385000}
      />,
    );

    expect(screen.getByText("QUOTATION")).toBeInTheDocument();
  });

  it("should render all line items with labels and formatted values", () => {
    render(
      <QuotationCard
        items={[
          { label: "材料费", value: 385000 },
          { label: "运费", value: 3500 },
        ]}
        total={388500}
      />,
    );

    expect(screen.getByText("材料费")).toBeInTheDocument();
    expect(screen.getByText("¥385,000")).toBeInTheDocument();
    expect(screen.getByText("运费")).toBeInTheDocument();
    expect(screen.getByText("¥3,500")).toBeInTheDocument();
  });

  it("should render total row", () => {
    render(
      <QuotationCard
        items={[{ label: "材料费", value: 385000 }]}
        total={444070}
      />,
    );

    expect(screen.getByText("¥444,070")).toBeInTheDocument();
    expect(screen.getByText("合计")).toBeInTheDocument();
  });

  it("should call onSave when save button clicked", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <QuotationCard
        items={[{ label: "材料费", value: 385000 }]}
        total={385000}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByText("保存"));

    expect(onSave).toHaveBeenCalledOnce();
  });

  it("should call onShare when share button clicked", async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();

    render(
      <QuotationCard
        items={[{ label: "材料费", value: 385000 }]}
        total={385000}
        onShare={onShare}
      />,
    );

    await user.click(screen.getByText("分享"));

    expect(onShare).toHaveBeenCalledOnce();
  });

  it("should call onRecalculate when recalculate button clicked", async () => {
    const onRecalculate = vi.fn();
    const user = userEvent.setup();

    render(
      <QuotationCard
        items={[{ label: "材料费", value: 385000 }]}
        total={385000}
        onRecalculate={onRecalculate}
      />,
    );

    await user.click(screen.getByText("重新计算"));

    expect(onRecalculate).toHaveBeenCalledOnce();
  });

  it("should show save success feedback", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(
      <QuotationCard
        items={[{ label: "材料费", value: 385000 }]}
        total={385000}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByText("保存"));

    expect(screen.getByText("已保存")).toBeInTheDocument();
    expect(screen.queryByText("保存")).not.toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText("保存")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should NOT render action pills when no handlers provided", () => {
    render(
      <QuotationCard
        items={[{ label: "材料费", value: 385000 }]}
        total={385000}
      />,
    );

    expect(screen.queryByText("保存")).not.toBeInTheDocument();
    expect(screen.queryByText("分享")).not.toBeInTheDocument();
    expect(screen.queryByText("重新计算")).not.toBeInTheDocument();
  });
});
