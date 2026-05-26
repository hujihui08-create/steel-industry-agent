import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PriceImportDialog from "@/app/components/admin/PriceImportDialog";

function renderDialog(open: boolean, onClose = vi.fn(), onImport = vi.fn().mockResolvedValue(undefined)) {
  return render(
    <PriceImportDialog open={open} onClose={onClose} onImport={onImport} />,
  );
}

/** 向 textarea 填入 JSON 文本（绕过 userEvent.type 对大括号的特殊解析） */
function fillTextarea(jsonText: string) {
  const textarea = screen.getByRole("textbox");
  fireEvent.change(textarea, { target: { value: jsonText } });
}

const VALID_JSON = `[
  {"category":"螺纹钢","spec":"HRB400E","price":3850,"change":12,"change_pct":0.31,"region":"上海","source":"我的钢铁网","price_date":"2026-05-26"},
  {"category":"热卷","spec":"5.5mm","price":4200,"change":-5,"change_pct":-0.12,"region":"北京","source":"兰格","price_date":"2026-05-26"}
]`;

describe("PriceImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 有效 JSON 解析预览
  // =========================================================================

  it("parses valid JSON and shows preview table", async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderDialog(true, vi.fn(), onImport);

    // 确认对话框已渲染
    expect(screen.getByText("批量导入价格")).toBeInTheDocument();

    // 填入有效的 JSON
    fillTextarea(VALID_JSON);

    // 点击"解析预览"按钮
    await user.click(screen.getByRole("button", { name: "解析预览" }));

    // 断言：预览表格出现（findByRole 自带异步等待）
    const table = await screen.findByRole("table");
    expect(table).toBeInTheDocument();

    // 断言：表格列标题存在
    expect(screen.getByText("品种")).toBeInTheDocument();
    expect(screen.getByText("规格")).toBeInTheDocument();
    expect(screen.getByText("地区")).toBeInTheDocument();
    expect(screen.getByText("价格")).toBeInTheDocument();

    // 断言：数据行内容存在（2 行数据）
    expect(screen.getByText("螺纹钢")).toBeInTheDocument();
    expect(screen.getByText("热卷")).toBeInTheDocument();

    // 断言：有 2 条待导入的提示
    expect(screen.getByText((content, element) => {
      return element?.textContent === "共2 条待导入" || element?.textContent === "共 2 条待导入";
    })).toBeInTheDocument();
  });

  // =========================================================================
  // 无效 JSON 报错
  // =========================================================================

  it("shows error for invalid JSON", async () => {
    const user = userEvent.setup();

    renderDialog(true);

    // 填入无效的 JSON
    fillTextarea("{bad json");

    // 点击"解析预览"按钮
    await user.click(screen.getByRole("button", { name: "解析预览" }));

    // 断言：显示 JSON 解析失败的错误信息
    await waitFor(() => {
      const errorEl = screen.getByText(/JSON 解析失败/);
      expect(errorEl).toBeInTheDocument();
    });

    // 确认没有显示预览表格
    expect(screen.queryByText("条待导入")).not.toBeInTheDocument();
  });

  // =========================================================================
  // JSON 数组项缺少必填字段
  // =========================================================================

  it("shows error when JSON array items missing required fields", async () => {
    const user = userEvent.setup();

    renderDialog(true);

    // 填入缺少 category 的 JSON
    fillTextarea(`[{"price":3850,"region":"上海","price_date":"2026-05-26"}]`);

    // 点击"解析预览"按钮
    await user.click(screen.getByRole("button", { name: "解析预览" }));

    // 断言：显示缺少必填字段的错误信息
    await waitFor(() => {
      const errorEl = screen.getByText(/缺少有效的 category 字段/);
      expect(errorEl).toBeInTheDocument();
    });

    // 确认没有显示预览表格
    expect(screen.queryByText("条待导入")).not.toBeInTheDocument();
  });

  // =========================================================================
  // 点击导入按钮时调用 onImport
  // =========================================================================

  it("calls onImport when import button is clicked", async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderDialog(true, onClose, onImport);

    // 填入有效的 JSON 并解析
    fillTextarea(VALID_JSON);

    await user.click(screen.getByRole("button", { name: "解析预览" }));

    // 等待预览表格出现
    await screen.findByRole("table");

    // 确认导入按钮存在
    const importBtn = screen.getByRole("button", { name: "导入 2 条" });
    expect(importBtn).toBeInTheDocument();

    // 点击导入按钮
    await user.click(importBtn);

    // 断言：onImport 被调用，且参数为解析后的数组
    await waitFor(() => {
      expect(onImport).toHaveBeenCalledTimes(1);
    });

    const calledData = onImport.mock.calls[0][0];
    expect(calledData).toHaveLength(2);
    expect(calledData[0]).toMatchObject({
      category: "螺纹钢",
      price: 3850,
      region: "上海",
    });
    expect(calledData[1]).toMatchObject({
      category: "热卷",
      price: 4200,
      region: "北京",
    });
  });
});
