// ============================================================
// ApiStats 单元测试
//
// 覆盖场景：
//   1. 概览统计卡片渲染（今日调用量 / 平均响应时间 / 错误率 / Token消耗）
//   2. 时间范围切换按钮渲染
//   3. 详情 Tab 渲染（按接口 / 按模型 / 按用户）
//   4. API 调用验证
// ============================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// Mock -- 必须在 import 组件之前
// ============================================================

vi.mock("@/app/api/admin", () => ({
  getApiStatsOverview: vi.fn(),
  getApiEndpointStats: vi.fn(),
  getApiModelStats: vi.fn(),
  getApiUserStats: vi.fn(),
  getApiTrend: vi.fn(),
}));

// Mock recharts ResponsiveContainer (jsdom 不支持 SVG 尺寸计算)
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...(actual as object),
    ResponsiveContainer: ({ children }: any) =>
      React.createElement("div", { "data-testid": "responsive-container" }, children),
  };
});

import { ApiStats } from "@/app/components/admin/ApiStats";
import {
  getApiStatsOverview,
  getApiEndpointStats,
  getApiModelStats,
  getApiUserStats,
  getApiTrend,
} from "@/app/api/admin";
import type {
  ApiCallOverview,
  ApiEndpointStat,
  ApiTrendPoint,
} from "@/app/types/admin";

// ============================================================
// Helpers
// ============================================================

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function makeOverview(overrides: Partial<ApiCallOverview> = {}): ApiCallOverview {
  return {
    today_total: 15230,
    today_tokens: 450000,
    avg_duration_ms: 245,
    error_rate: 0.02,
    ...overrides,
  } as ApiCallOverview;
}

function makeEndpointStat(overrides: Partial<ApiEndpointStat> = {}): ApiEndpointStat {
  return {
    api_path: "/api/v1/chat/completions",
    call_count: 8000,
    avg_duration_ms: 320,
    error_count: 80,
    error_rate: 0.01,
    ...overrides,
  } as ApiEndpointStat;
}

function makeTrendPoint(overrides: Partial<ApiTrendPoint> = {}): ApiTrendPoint {
  return {
    date: "05-17",
    call_count: 2100,
    avg_duration_ms: 230,
    ...overrides,
  } as ApiTrendPoint;
}

// ============================================================
// Tests
// ============================================================

describe("ApiStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title as heading", async () => {
    vi.mocked(getApiStatsOverview).mockResolvedValue(makeOverview());
    vi.mocked(getApiTrend).mockResolvedValue([]);
    vi.mocked(getApiEndpointStats).mockResolvedValue([]);
    vi.mocked(getApiModelStats).mockResolvedValue([]);
    vi.mocked(getApiUserStats).mockResolvedValue([]);

    renderWithRouter(<ApiStats />);
    expect(await screen.findByRole("heading", { name: "API 调用统计" })).toBeInTheDocument();
  });

  it("renders overview stat card labels", async () => {
    vi.mocked(getApiStatsOverview).mockResolvedValue(
      makeOverview({
        today_total: 15230,
        today_tokens: 450000,
        avg_duration_ms: 245,
        error_rate: 0.02,
      }),
    );
    vi.mocked(getApiTrend).mockResolvedValue([
      makeTrendPoint({ date: "05-17", call_count: 2100 }),
    ]);
    vi.mocked(getApiEndpointStats).mockResolvedValue([
      makeEndpointStat({ api_path: "/api/v1/chat/completions", call_count: 8000 }),
    ]);
    vi.mocked(getApiModelStats).mockResolvedValue([]);
    vi.mocked(getApiUserStats).mockResolvedValue([]);

    renderWithRouter(<ApiStats />);

    await waitFor(() => {
      expect(screen.getByText("今日调用量")).toBeInTheDocument();
    });
    expect(screen.getByText("平均响应时间")).toBeInTheDocument();
    expect(screen.getAllByText("错误率").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Token 消耗")).toBeInTheDocument();
  });

  it("renders time range toggle buttons", async () => {
    vi.mocked(getApiStatsOverview).mockResolvedValue(makeOverview());
    vi.mocked(getApiTrend).mockResolvedValue([makeTrendPoint()]);
    vi.mocked(getApiEndpointStats).mockResolvedValue([]);
    vi.mocked(getApiModelStats).mockResolvedValue([]);
    vi.mocked(getApiUserStats).mockResolvedValue([]);

    renderWithRouter(<ApiStats />);

    await waitFor(() => {
      expect(screen.getByText("7天")).toBeInTheDocument();
    });
    expect(screen.getByText("30天")).toBeInTheDocument();
  });

  it("renders detail tabs (endpoint/model/user)", async () => {
    vi.mocked(getApiStatsOverview).mockResolvedValue(makeOverview());
    vi.mocked(getApiTrend).mockResolvedValue([makeTrendPoint()]);
    vi.mocked(getApiEndpointStats).mockResolvedValue([makeEndpointStat()]);
    vi.mocked(getApiModelStats).mockResolvedValue([]);
    vi.mocked(getApiUserStats).mockResolvedValue([]);

    renderWithRouter(<ApiStats />);

    await waitFor(() => {
      expect(screen.getByText("按接口")).toBeInTheDocument();
    });
    expect(screen.getByText("按模型")).toBeInTheDocument();
    expect(screen.getByText("按用户")).toBeInTheDocument();
  });

  it("renders endpoint table with data", async () => {
    vi.mocked(getApiStatsOverview).mockResolvedValue(makeOverview());
    vi.mocked(getApiTrend).mockResolvedValue([makeTrendPoint()]);
    vi.mocked(getApiEndpointStats).mockResolvedValue([
      makeEndpointStat({ api_path: "/api/v1/chat/completions", call_count: 8000 }),
      makeEndpointStat({ api_path: "/api/v1/prices/latest", call_count: 3500 }),
    ]);
    vi.mocked(getApiModelStats).mockResolvedValue([]);
    vi.mocked(getApiUserStats).mockResolvedValue([]);

    renderWithRouter(<ApiStats />);

    await waitFor(() => {
      expect(screen.getByText("/api/v1/chat/completions")).toBeInTheDocument();
    });
    expect(screen.getByText("/api/v1/prices/latest")).toBeInTheDocument();
  });

  it("calls all API functions on mount", async () => {
    vi.mocked(getApiStatsOverview).mockResolvedValue(makeOverview());
    vi.mocked(getApiTrend).mockResolvedValue([makeTrendPoint()]);
    vi.mocked(getApiEndpointStats).mockResolvedValue([]);
    vi.mocked(getApiModelStats).mockResolvedValue([]);
    vi.mocked(getApiUserStats).mockResolvedValue([]);

    renderWithRouter(<ApiStats />);

    await waitFor(() => {
      expect(getApiStatsOverview).toHaveBeenCalled();
      expect(getApiTrend).toHaveBeenCalled();
      expect(getApiEndpointStats).toHaveBeenCalled();
      expect(getApiModelStats).toHaveBeenCalled();
      expect(getApiUserStats).toHaveBeenCalled();
    });
  });
});
