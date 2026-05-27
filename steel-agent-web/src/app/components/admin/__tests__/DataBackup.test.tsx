// ============================================================
// DataBackup 单元测试
//
// 覆盖场景：
//   1. 概览信息卡渲染
//   2. 备份记录表格渲染（含成功状态徽标）
//   3. 立即备份按钮渲染
//   4. 自动备份设置按钮渲染
//   5. API 调用验证
// ============================================================

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ============================================================
// Mock -- 必须在 import 组件之前
// ============================================================

vi.mock("@/app/api/admin", () => ({
  getBackupOverview: vi.fn(),
  getBackupRecords: vi.fn(),
  triggerBackup: vi.fn(),
  restoreBackup: vi.fn(),
  downloadBackup: vi.fn(),
  getAutoBackupSettings: vi.fn(),
  saveAutoBackupSettings: vi.fn(),
}));

import { DataBackup } from "@/app/components/admin/DataBackup";
import {
  getBackupOverview,
  getBackupRecords,
} from "@/app/api/admin";
import type { BackupOverview, BackupRecord } from "@/app/types/admin";

// ============================================================
// Helpers
// ============================================================

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function makeBackupOverview(overrides: Partial<BackupOverview> = {}): BackupOverview {
  return {
    dbSize: "256 MB",
    fileCount: 12,
    lastBackup: "2026-05-17 03:00:00",
    autoBackupEnabled: true,
    autoBackupTime: "03:00",
    retentionDays: 30,
    ...overrides,
  } as BackupOverview;
}

function makeBackupRecord(overrides: Partial<BackupRecord> = {}): BackupRecord {
  return {
    id: "1",
    timestamp: "2026-05-17 03:00:00",
    fileSize: "128 MB",
    type: "auto",
    status: "success",
    ...overrides,
  } as BackupRecord;
}

// ============================================================
// Tests
// ============================================================

describe("DataBackup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page title as heading", async () => {
    vi.mocked(getBackupOverview).mockResolvedValue(makeBackupOverview());
    vi.mocked(getBackupRecords).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderWithRouter(<DataBackup />);
    expect(await screen.findByRole("heading", { name: "数据备份" })).toBeInTheDocument();
  });

  it("renders overview cards with backup data", async () => {
    vi.mocked(getBackupOverview).mockResolvedValue(
      makeBackupOverview({
        dbSize: "256 MB",
        fileCount: 12,
        autoBackupEnabled: true,
        autoBackupTime: "03:00",
      }),
    );
    vi.mocked(getBackupRecords).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderWithRouter(<DataBackup />);

    await waitFor(() => {
      expect(screen.getByText(/256 MB/)).toBeInTheDocument();
    });
    expect(screen.getByText(/已启用/)).toBeInTheDocument();
  });

  it("renders backup records table with status badge", async () => {
    vi.mocked(getBackupOverview).mockResolvedValue(makeBackupOverview());
    vi.mocked(getBackupRecords).mockResolvedValue({
      items: [
        makeBackupRecord({ id: "1", status: "success" }),
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });

    renderWithRouter(<DataBackup />);

    await waitFor(() => {
      expect(screen.getByText("成功")).toBeInTheDocument();
    });
  });

  it("renders action buttons", async () => {
    vi.mocked(getBackupOverview).mockResolvedValue(makeBackupOverview());
    vi.mocked(getBackupRecords).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderWithRouter(<DataBackup />);
    await screen.findByRole("heading", { name: "数据备份" });
    expect(screen.getAllByText("立即备份").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("自动备份设置")).toBeInTheDocument();
  });

  it("calls getBackupOverview on mount", async () => {
    vi.mocked(getBackupOverview).mockResolvedValue(makeBackupOverview());
    vi.mocked(getBackupRecords).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderWithRouter(<DataBackup />);
    await waitFor(() => {
      expect(getBackupOverview).toHaveBeenCalledTimes(1);
    });
  });

  it("calls getBackupRecords on mount", async () => {
    vi.mocked(getBackupOverview).mockResolvedValue(makeBackupOverview());
    vi.mocked(getBackupRecords).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    renderWithRouter(<DataBackup />);
    await waitFor(() => {
      expect(getBackupRecords).toHaveBeenCalledWith(1, 10);
    });
  });
});
