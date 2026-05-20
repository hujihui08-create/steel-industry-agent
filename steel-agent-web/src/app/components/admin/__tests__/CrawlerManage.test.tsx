import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CrawlerManage from "@/app/components/admin/CrawlerManage";
import type { CrawlerSource, CrawlStatus, CrawlerLog } from "@/app/types/admin";

vi.mock("@/app/api/admin", () => ({
  getCrawlerSources: vi.fn(),
  createCrawlerSource: vi.fn(),
  updateCrawlerSource: vi.fn(),
  deleteCrawlerSource: vi.fn(),
  getCrawlerLogs: vi.fn(),
  triggerCrawl: vi.fn(),
  getCrawlStatus: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

import * as adminApi from "@/app/api/admin";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function mockResolved<T>(
  fn: ReturnType<typeof vi.fn>,
  value: T,
) {
  fn.mockResolvedValue(value);
}

function mockRejected(fn: ReturnType<typeof vi.fn>, message: string) {
  fn.mockRejectedValue(new Error(message));
}

function makeSource(overrides: Partial<CrawlerSource> = {}): CrawlerSource {
  return {
    id: 1,
    source_name: "我的钢铁网",
    source_type: "price",
    source_url: "https://www.mysteel.com/",
    crawl_rule: '{"container":"table"}',
    crawl_interval: 1800,
    is_active: true,
    last_crawl_at: "2026-05-20T10:00:00Z",
    last_success_at: "2026-05-20T09:30:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-05-20T10:00:00Z",
    ...overrides,
  };
}

function makeStatus(overrides: Partial<CrawlStatus> = {}): CrawlStatus {
  return {
    source_id: 1,
    source_name: "我的钢铁网",
    source_type: "price",
    source_url: "https://www.mysteel.com/",
    is_active: true,
    is_running: false,
    last_crawl_at: "2026-05-20T10:00:00Z",
    last_success_at: "2026-05-20T09:30:00Z",
    next_crawl_at: "2026-05-20T10:30:00Z",
    ...overrides,
  };
}

function makeLog(overrides: Partial<CrawlerLog> = {}): CrawlerLog {
  return {
    id: 101,
    source_id: 1,
    status: "success",
    items_crawled: 120,
    error_message: "",
    started_at: "2026-05-20T10:00:00Z",
    finished_at: "2026-05-20T10:05:00Z",
    ...overrides,
  };
}

describe("CrawlerManage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 加载状态
  // =========================================================================

  it("should show skeleton cards while loading", () => {
    mockResolved(adminApi.getCrawlerSources, []);
    mockResolved(adminApi.getCrawlStatus, {});

    renderWithRouter(<CrawlerManage />);

    expect(screen.getByText("数据爬虫管理")).toBeInTheDocument();
  });

  // =========================================================================
  // 空数据状态
  // =========================================================================

  it("should show empty state when no sources exist", async () => {
    mockResolved(adminApi.getCrawlerSources, []);
    mockResolved(adminApi.getCrawlStatus, {});

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("暂无数据源")).toBeInTheDocument();
    });
    expect(screen.getByText("点击添加数据源开始配置")).toBeInTheDocument();
  });

  // =========================================================================
  // 错误状态
  // =========================================================================

  it("should show error message and retry button on load failure", async () => {
    mockRejected(adminApi.getCrawlerSources, "网络连接失败");
    mockResolved(adminApi.getCrawlStatus, {});

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("网络连接失败")).toBeInTheDocument();
    });
    expect(screen.getByText("重试")).toBeInTheDocument();
  });

  // =========================================================================
  // 正常数据展示
  // =========================================================================

  it("should display source cards with info", async () => {
    const sources: CrawlerSource[] = [
      makeSource({ id: 1, source_name: "我的钢铁网" }),
      makeSource({ id: 2, source_name: "钢联数据", source_type: "tender" }),
    ];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1, is_running: false }),
      2: makeStatus({ source_id: 2, is_active: false, is_running: false }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("我的钢铁网")).toBeInTheDocument();
      expect(screen.getByText("钢联数据")).toBeInTheDocument();
    });
  });

  it("should show idle status for active non-running source", async () => {
    const sources = [makeSource({ id: 1, is_active: true })];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1, is_running: false }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("空闲")).toBeInTheDocument();
    });
  });

  it("should show 采集中 for running source with pulse animation", async () => {
    const sources = [makeSource({ id: 1, is_active: true })];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1, is_running: true }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("采集中")).toBeInTheDocument();
    });
  });

  it("should show 已停用 for inactive source", async () => {
    const sources = [makeSource({ id: 1, is_active: false })];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1, is_active: false, is_running: false }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      const items = screen.getAllByText("已停用");
      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should show 暂停 button for active source", async () => {
    const sources = [makeSource({ id: 1, is_active: true })];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1 }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("暂停")).toBeInTheDocument();
    });
  });

  it("should show 启用 button for inactive source", async () => {
    const sources = [makeSource({ id: 1, is_active: false })];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1, is_active: false }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("启用")).toBeInTheDocument();
    });
  });

  it("should show crawl frequency text", async () => {
    const sources = [makeSource({ id: 1, crawl_interval: 1800 })];
    const statusMap: Record<number, CrawlStatus> = { 1: makeStatus() };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("采集频率：每 30 分钟")).toBeInTheDocument();
    });
  });

  it("should show second-based frequency for intervals < 60s", async () => {
    const sources = [makeSource({ id: 1, crawl_interval: 45 })];
    const statusMap: Record<number, CrawlStatus> = { 1: makeStatus() };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("采集频率：每 45 秒")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 状态筛选
  // =========================================================================

  it("should filter by status tabs", async () => {
    const sources: CrawlerSource[] = [
      makeSource({ id: 1, source_name: "ActiveSource", is_active: true }),
      makeSource({ id: 2, source_name: "InactiveSource", is_active: false }),
    ];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1 }),
      2: makeStatus({ source_id: 2, is_active: false }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    const user = userEvent.setup();
    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("ActiveSource")).toBeInTheDocument();
      expect(screen.getByText("InactiveSource")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "已停用" }));

    await waitFor(() => {
      expect(screen.queryByText("ActiveSource")).not.toBeInTheDocument();
      expect(screen.getByText("InactiveSource")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 标题栏按钮
  // =========================================================================

  it("should render 添加数据源 button", async () => {
    mockResolved(adminApi.getCrawlerSources, []);
    mockResolved(adminApi.getCrawlStatus, {});

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("添加数据源")).toBeInTheDocument();
    });
  });

  it("should render refresh button with aria-label", async () => {
    mockResolved(adminApi.getCrawlerSources, []);
    mockResolved(adminApi.getCrawlStatus, {});

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByLabelText("刷新")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 面包屑
  // =========================================================================

  it("should show breadcrumbs", async () => {
    mockResolved(adminApi.getCrawlerSources, []);
    mockResolved(adminApi.getCrawlStatus, {});

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("首页")).toBeInTheDocument();
      expect(screen.getByText("数据管理")).toBeInTheDocument();
      expect(screen.getByText("爬虫管理")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 立即采集按钮状态
  // =========================================================================

  it("should disable 立即采集 when source is running", async () => {
    const sources = [makeSource({ id: 1, is_active: true })];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1, is_running: true }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("采集中…")).toBeInTheDocument();
    });

    const btn = screen.getByText("采集中…").closest("button");
    expect(btn).toBeDisabled();
  });

  it("should disable 立即采集 when source is inactive", async () => {
    const sources = [makeSource({ id: 1, is_active: false })];
    const statusMap: Record<number, CrawlStatus> = {
      1: makeStatus({ source_id: 1, is_active: false }),
    };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      const btn = screen.getByText("立即采集").closest("button");
      expect(btn).toBeDisabled();
    });
  });

  // =========================================================================
  // 日志 Drawer
  // =========================================================================

  it("should open log drawer when clicking 日志", async () => {
    const sources = [makeSource({ id: 1, source_name: "我的钢铁网" })];
    const statusMap: Record<number, CrawlStatus> = { 1: makeStatus() };
    const logs: CrawlerLog[] = [
      makeLog({ id: 101, status: "success", items_crawled: 120 }),
      makeLog({ id: 102, status: "failed", items_crawled: 0, error_message: "超时" }),
    ];

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);
    mockResolved(adminApi.getCrawlerLogs, logs);

    const user = userEvent.setup();
    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("我的钢铁网")).toBeInTheDocument();
    });

    await user.click(screen.getByText("日志"));

    await waitFor(() => {
      expect(screen.getByText("采集日志 - 我的钢铁网")).toBeInTheDocument();
      expect(screen.getByText("采集 120 条")).toBeInTheDocument();
      expect(screen.getByText("超时")).toBeInTheDocument();
    });
  });

  it("should show empty log state", async () => {
    const sources = [makeSource({ id: 1, source_name: "我的钢铁网" })];
    const statusMap: Record<number, CrawlStatus> = { 1: makeStatus() };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);
    mockResolved(adminApi.getCrawlerLogs, []);

    const user = userEvent.setup();
    renderWithRouter(<CrawlerManage />);

    await waitFor(() => {
      expect(screen.getByText("我的钢铁网")).toBeInTheDocument();
    });

    await user.click(screen.getByText("日志"));

    await waitFor(() => {
      expect(screen.getByText("暂无采集记录")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 日志展开详情
  // =========================================================================

  it("should toggle log detail on click", async () => {
    const sources = [makeSource({ id: 1, source_name: "我的钢铁网" })];
    const statusMap: Record<number, CrawlStatus> = { 1: makeStatus() };
    const logs: CrawlerLog[] = [
      makeLog({
        id: 101,
        status: "success",
        items_crawled: 120,
        started_at: "2026-05-20T10:00:00Z",
        finished_at: "2026-05-20T10:05:00Z",
      }),
    ];

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);
    mockResolved(adminApi.getCrawlerLogs, logs);

    const user = userEvent.setup();
    renderWithRouter(<CrawlerManage />);

    await waitFor(() => expect(screen.getByText("我的钢铁网")).toBeInTheDocument());
    await user.click(screen.getByText("日志"));
    await waitFor(() => expect(screen.getByText("采集 120 条")).toBeInTheDocument());

    await user.click(screen.getByText("采集 120 条").closest("button")!);

    await waitFor(() => {
      expect(screen.getByText("开始时间")).toBeInTheDocument();
      expect(screen.getByText("结束时间")).toBeInTheDocument();
      expect(screen.getByText("120 条")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 删除确认弹窗
  // =========================================================================

  it("should open delete confirmation dialog", async () => {
    const sources = [makeSource({ id: 1, source_name: "我的钢铁网" })];
    const statusMap: Record<number, CrawlStatus> = { 1: makeStatus() };

    mockResolved(adminApi.getCrawlerSources, sources);
    mockResolved(adminApi.getCrawlStatus, statusMap);

    const user = userEvent.setup();
    renderWithRouter(<CrawlerManage />);

    await waitFor(() => expect(screen.getByText("我的钢铁网")).toBeInTheDocument());

    await user.click(screen.getByLabelText("删除"));

    await waitFor(() => {
      expect(screen.getByText("删除数据源")).toBeInTheDocument();
      expect(screen.getByText("确定删除该数据源？删除后将停止自动采集")).toBeInTheDocument();
    });
  });
});
