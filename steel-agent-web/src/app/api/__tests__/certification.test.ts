// ============================================================
// Certification API 函数单元测试
// ============================================================

import {
  submitCertification,
  getMyCertification,
  getCertificationList,
  approveCertification,
  rejectCertification,
  type CertificationData,
} from "@/app/api/certification";

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

beforeEach(() => {
  vi.clearAllMocks();
});

function makeCert(overrides: Partial<CertificationData> = {}): CertificationData {
  return {
    id: 1,
    user_id: 1,
    company_name: "测试钢铁有限公司",
    credit_code: "123456789012345678",
    contact_name: "张三",
    contact_phone: "13800138000",
    status: "pending",
    remark: "",
    created_at: "2026-05-26 10:00:00",
    ...overrides,
  };
}

describe("certification API", () => {
  describe("submitCertification", () => {
    const params = {
      company_name: "测试钢铁有限公司",
      credit_code: "123456789012345678",
      contact_name: "张三",
      contact_phone: "13800138000",
    };

    it("should POST /users/certification and return CertificationData", async () => {
      const cert = makeCert();

      mockedPost.mockResolvedValue({
        data: { code: 200, message: "success", data: cert },
      });

      const result = await submitCertification(params);

      expect(mockedPost).toHaveBeenCalledTimes(1);
      expect(mockedPost).toHaveBeenCalledWith("/users/certification", params);
      expect(result).toEqual(cert);
      expect(result.status).toBe("pending");
    });

    it("should throw when API returns non-200 code", async () => {
      mockedPost.mockResolvedValue({
        data: { code: 40901, message: "您已有认证申请正在处理中", data: null },
      });

      await expect(submitCertification(params)).rejects.toThrow(
        "您已有认证申请正在处理中"
      );
    });

    it("should propagate network errors", async () => {
      mockedPost.mockRejectedValue(new Error("Network error"));

      await expect(submitCertification(params)).rejects.toThrow("Network error");
    });
  });

  describe("getMyCertification", () => {
    it("should GET /users/certification and return CertificationData", async () => {
      const cert = makeCert({ status: "approved" });

      mockedGet.mockResolvedValue({
        data: { code: 200, message: "success", data: cert },
      });

      const result = await getMyCertification();

      expect(mockedGet).toHaveBeenCalledTimes(1);
      expect(mockedGet).toHaveBeenCalledWith("/users/certification");
      expect(result).toEqual(cert);
      expect(result!.status).toBe("approved");
    });

    it("should return null when no certification exists", async () => {
      mockedGet.mockResolvedValue({
        data: { code: 200, message: "success", data: null },
      });

      const result = await getMyCertification();

      expect(result).toBeNull();
    });

    it("should throw on network error", async () => {
      mockedGet.mockRejectedValue(new Error("Network error"));

      await expect(getMyCertification()).rejects.toThrow("Network error");
    });
  });

  describe("getCertificationList", () => {
    it("should GET /admin/certifications with params and return list", async () => {
      const certList = [makeCert(), makeCert({ id: 2, status: "approved" })];

      mockedGet.mockResolvedValue({
        data: {
          code: 200,
          message: "success",
          data: { list: certList, total: 2 },
        },
      });

      const result = await getCertificationList();

      expect(mockedGet).toHaveBeenCalledWith("/admin/certifications", {
        params: { status: undefined, limit: 20, offset: 0 },
      });
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should pass status filter to API", async () => {
      mockedGet.mockResolvedValue({
        data: {
          code: 200,
          message: "success",
          data: { list: [], total: 0 },
        },
      });

      await getCertificationList("pending", 10, 5);

      expect(mockedGet).toHaveBeenCalledWith("/admin/certifications", {
        params: { status: "pending", limit: 10, offset: 5 },
      });
    });
  });

  describe("approveCertification", () => {
    it("should PUT /admin/certifications/:id/approve", async () => {
      mockedPut.mockResolvedValue({
        data: { code: 200, message: "success" },
      });

      await approveCertification(1);

      expect(mockedPut).toHaveBeenCalledTimes(1);
      expect(mockedPut).toHaveBeenCalledWith("/admin/certifications/1/approve");
    });

    it("should throw on failure", async () => {
      mockedPut.mockResolvedValue({
        data: { code: 500, message: "审核失败", data: null },
      });

      await expect(approveCertification(1)).rejects.toThrow("审核失败");
    });
  });

  describe("rejectCertification", () => {
    it("should PUT /admin/certifications/:id/reject with remark", async () => {
      mockedPut.mockResolvedValue({
        data: { code: 200, message: "success" },
      });

      await rejectCertification(1, "营业执照不清晰");

      expect(mockedPut).toHaveBeenCalledTimes(1);
      expect(mockedPut).toHaveBeenCalledWith("/admin/certifications/1/reject", {
        remark: "营业执照不清晰",
      });
    });

    it("should throw on failure", async () => {
      mockedPut.mockResolvedValue({
        data: { code: 500, message: "驳回失败", data: null },
      });

      await expect(rejectCertification(1, "原因")).rejects.toThrow("驳回失败");
    });
  });
});
