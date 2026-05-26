import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API module BEFORE importing the store
vi.mock("@/app/api/settings", () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getPublicConfig: vi.fn(),
}));

import { useSettingsStore } from "../settingsStore";
import { getPublicConfig } from "@/app/api/settings";

describe("settingsStore - loadSiteConfig", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useSettingsStore.getState().reset();
    vi.clearAllMocks();
  });

  it("loads public config into siteConfig on success", async () => {
    const mockConfig = {
      siteName: "测试站",
      logoUrl: "/logo.png",
      contactEmail: "test@test.com",
      contactPhone: "400-888-8888",
    };
    vi.mocked(getPublicConfig).mockResolvedValue(mockConfig);

    await useSettingsStore.getState().loadSiteConfig();

    const state = useSettingsStore.getState();
    expect(state.siteConfig).toEqual(mockConfig);
    expect(state.siteConfig?.siteName).toBe("测试站");
  });

  it("keeps siteConfig null when public config API fails", async () => {
    vi.mocked(getPublicConfig).mockRejectedValue(new Error("Network error"));

    await useSettingsStore.getState().loadSiteConfig();

    const state = useSettingsStore.getState();
    expect(state.siteConfig).toBeNull();
  });
});
