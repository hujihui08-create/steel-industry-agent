// ============================================================
// Alert API 函数单元测试
// 使用 vitest mock apiClient 模块
// ============================================================

import {
  getAlertList,
  createAlert,
  updateAlert,
  deleteAlert,
} from "@/app/api/alerts";
import type { PriceAlert } from "@/app/types/alert";

// -----------------------------------------------------------
// Mock apiClient 模块
// -----------------------------------------------------------

vi.mock("@/app/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from "@/app/api/client";

const mockedGet = apiClient.get as ReturnType<typeof vi.fn>;
const mockedPost = apiClient.post as ReturnType<typeof vi.fn>;
const mockedPut = apiClient.put as ReturnType<typeof vi.fn>;
const mockedDelete = apiClient.delete as ReturnType<typeof vi.fn>;

// -----------------------------------------------------------
// Setup: 每个测试前清除 mock
// -----------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------
// 工厂函数
// -----------------------------------------------------------

function makeAlert(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: 1,
    category: "螺纹钢",
    spec: "HRB400E 20mm",
    region: "上海",
    target_price: 5000,
    condition: "above",
    is_active: true,
    created_at: "2026-05-26 10:00:00",
    ...overrides,
  };
}

describe("alerts API", () => {
  // =========================================================
  // 1. getAlertList
  // =========================================================
  describe("getAlertList", () => {
    it("should GET /alerts and return PriceAlert array", async () => {
      const alertList = [makeAlert(), makeAlert({ id: 2, category: "热卷" })];

      mockedGet.mockResolvedValue({
        data: { code: 200, message: "success", data: alertList },
      });

      const result = await getAlertList();

      expect(mockedGet).toHaveBeenCalledTimes(1);
      expect(mockedGet).toHaveBeenCalledWith("/alerts");
      expect(result).toEqual(alertList);
      expect(result).toHaveLength(2);
    });

    it("should throw fallback when data is null and message is empty", async () => {
      mockedGet.mockResolvedValue({
        data: { code: 200, message: "", data: null },
      });

      await expect(getAlertList()).rejects.toThrow("获取预警列表失败");
    });

    it("should throw API message when data is null but message exists", async () => {
      mockedGet.mockResolvedValue({
        data: { code: 500, message: "服务端错误", data: null },
      });

      await expect(getAlertList()).rejects.toThrow("服务端错误");
    });
  });

  // =========================================================
  // 2. createAlert
  // =========================================================
  describe("createAlert", () => {
    const createParams = {
      category: "螺纹钢",
      spec: "HRB400E 20mm",
      region: "上海",
      target_price: 5000,
      condition: "above" as const,
    };

    it("should POST /alerts with params and return PriceAlert", async () => {
      const alert = makeAlert();

      mockedPost.mockResolvedValue({
        data: { code: 200, message: "success", data: alert },
      });

      const result = await createAlert(createParams);

      expect(mockedPost).toHaveBeenCalledTimes(1);
      expect(mockedPost).toHaveBeenCalledWith("/alerts", createParams);
      expect(result).toEqual(alert);
      expect(result.id).toBe(1);
      expect(result.category).toBe("螺纹钢");
    });

    it("should throw when created data is null", async () => {
      mockedPost.mockResolvedValue({
        data: { code: 500, message: "创建失败", data: null },
      });

      await expect(createAlert(createParams)).rejects.toThrow("创建失败");
    });
  });

  // =========================================================
  // 3. updateAlert
  // =========================================================
  describe("updateAlert", () => {
    const updateParams = {
      target_price: 5200,
      condition: "below" as const,
    };

    it("should PUT /alerts/:id with update params and return PriceAlert", async () => {
      const updatedAlert = makeAlert({ target_price: 5200, condition: "below" });

      mockedPut.mockResolvedValue({
        data: { code: 200, message: "success", data: updatedAlert },
      });

      const result = await updateAlert(1, updateParams);

      expect(mockedPut).toHaveBeenCalledTimes(1);
      expect(mockedPut).toHaveBeenCalledWith("/alerts/1", updateParams);
      expect(result).toEqual(updatedAlert);
      expect(result.target_price).toBe(5200);
      expect(result.condition).toBe("below");
    });

    it("should PUT /alerts/2 with partial params", async () => {
      const partialParams = { region: "北京" };
      const updatedAlert = makeAlert({ id: 2, region: "北京" });

      mockedPut.mockResolvedValue({
        data: { code: 200, message: "success", data: updatedAlert },
      });

      const result = await updateAlert(2, partialParams);

      expect(mockedPut).toHaveBeenCalledTimes(1);
      expect(mockedPut).toHaveBeenCalledWith("/alerts/2", partialParams);
      expect(result.region).toBe("北京");
    });

    it("should throw when updated data is null", async () => {
      mockedPut.mockResolvedValue({
        data: { code: 404, message: "预警不存在", data: null },
      });

      await expect(updateAlert(999, updateParams)).rejects.toThrow(
        "预警不存在",
      );
    });
  });

  // =========================================================
  // 4. deleteAlert
  // =========================================================
  describe("deleteAlert", () => {
    it("should DELETE /alerts/:id", async () => {
      mockedDelete.mockResolvedValue({
        data: { code: 200, message: "success" },
      });

      await deleteAlert(1);

      expect(mockedDelete).toHaveBeenCalledTimes(1);
      expect(mockedDelete).toHaveBeenCalledWith("/alerts/1");
    });

    it("should DELETE /alerts/3 for a different id", async () => {
      mockedDelete.mockResolvedValue({
        data: { code: 200, message: "success" },
      });

      await deleteAlert(3);

      expect(mockedDelete).toHaveBeenCalledTimes(1);
      expect(mockedDelete).toHaveBeenCalledWith("/alerts/3");
    });
  });

  // =========================================================
  // 5. Error propagation
  // =========================================================
  describe("error propagation", () => {
    it("getAlertList should propagate network errors", async () => {
      mockedGet.mockRejectedValue(new Error("Network error"));

      await expect(getAlertList()).rejects.toThrow("Network error");
    });

    it("createAlert should propagate network errors", async () => {
      mockedPost.mockRejectedValue(new Error("Network error"));

      await expect(
        createAlert({
          category: "螺纹钢",
          spec: "HRB400E 20mm",
          region: "上海",
          target_price: 5000,
          condition: "above",
        }),
      ).rejects.toThrow("Network error");
    });

    it("updateAlert should propagate network errors", async () => {
      mockedPut.mockRejectedValue(new Error("Network error"));

      await expect(
        updateAlert(1, { target_price: 5000 }),
      ).rejects.toThrow("Network error");
    });

    it("deleteAlert should propagate network errors", async () => {
      mockedDelete.mockRejectedValue(new Error("Network error"));

      await expect(deleteAlert(1)).rejects.toThrow("Network error");
    });

    it("createAlert should throw business error message from API", async () => {
      mockedPost.mockResolvedValue({
        data: {
          code: 40001,
          message: "参数错误",
          data: null,
        },
      });

      await expect(
        createAlert({
          category: "",
          spec: "",
          region: "",
          target_price: -1,
          condition: "above",
        }),
      ).rejects.toThrow("参数错误");
    });

    it("updateAlert should throw business error message from API", async () => {
      mockedPut.mockResolvedValue({
        data: {
          code: 40002,
          message: "预警不存在",
          data: null,
        },
      });

      await expect(
        updateAlert(404, { target_price: 5000 }),
      ).rejects.toThrow("预警不存在");
    });

    it("should fallback to default message when API message is empty", async () => {
      mockedPost.mockResolvedValue({
        data: {
          code: 500,
          message: "",
          data: null,
        },
      });

      await expect(
        createAlert({
          category: "螺纹钢",
          spec: "HRB400E 20mm",
          region: "上海",
          target_price: 5000,
          condition: "above",
        }),
      ).rejects.toThrow("创建预警失败");
    });
  });
});
