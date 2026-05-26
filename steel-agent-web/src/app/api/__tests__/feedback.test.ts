// ============================================================
// Feedback API 函数单元测试
// ============================================================

import {
  submitFeedback,
  getFeedbackList,
  getFeedbackDetail,
  type FeedbackData,
} from "@/app/api/feedback";

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

beforeEach(() => {
  vi.clearAllMocks();
});

function makeFeedback(overrides: Partial<FeedbackData> = {}): FeedbackData {
  return {
    id: 1,
    user_id: 1,
    type: "bug",
    content: "页面加载报错",
    contact: "user@example.com",
    status: "unread",
    created_at: "2026-05-26 10:00:00",
    ...overrides,
  };
}

describe("feedback API", () => {
  describe("submitFeedback", () => {
    it("should POST /feedback with params and return FeedbackData", async () => {
      const f = makeFeedback();

      mockedPost.mockResolvedValue({
        data: { code: 200, message: "success", data: f },
      });

      const result = await submitFeedback({
        type: "bug",
        content: "页面加载报错",
        contact: "user@example.com",
      });

      expect(mockedPost).toHaveBeenCalledTimes(1);
      expect(mockedPost).toHaveBeenCalledWith("/feedback", {
        type: "bug",
        content: "页面加载报错",
        contact: "user@example.com",
      });
      expect(result).toEqual(f);
      expect(result.type).toBe("bug");
      expect(result.status).toBe("unread");
    });

    it("should allow optional contact", async () => {
      const f = makeFeedback({ type: "suggestion", contact: "" });

      mockedPost.mockResolvedValue({
        data: { code: 200, message: "success", data: f },
      });

      const result = await submitFeedback({
        type: "suggestion",
        content: "建议优化加载速度",
      });

      expect(mockedPost).toHaveBeenCalledWith("/feedback", {
        type: "suggestion",
        content: "建议优化加载速度",
      });
      expect(result.type).toBe("suggestion");
    });

    it("should throw on API error", async () => {
      mockedPost.mockResolvedValue({
        data: { code: 40001, message: "参数错误", data: null },
      });

      await expect(
        submitFeedback({ type: "", content: "" })
      ).rejects.toThrow("参数错误");
    });

    it("should propagate network errors", async () => {
      mockedPost.mockRejectedValue(new Error("Network error"));

      await expect(
        submitFeedback({ type: "bug", content: "test" })
      ).rejects.toThrow("Network error");
    });
  });

  describe("getFeedbackList", () => {
    it("should GET /admin/feedbacks and return paginated list", async () => {
      const list = [makeFeedback(), makeFeedback({ id: 2, type: "suggestion" })];

      mockedGet.mockResolvedValue({
        data: {
          code: 200,
          message: "success",
          data: { list, total: 2 },
        },
      });

      const result = await getFeedbackList();

      expect(mockedGet).toHaveBeenCalledWith("/admin/feedbacks", {
        params: { type: undefined, limit: 20, offset: 0 },
      });
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should pass type filter", async () => {
      mockedGet.mockResolvedValue({
        data: {
          code: 200,
          message: "success",
          data: { list: [], total: 0 },
        },
      });

      await getFeedbackList("bug", 10, 0);

      expect(mockedGet).toHaveBeenCalledWith("/admin/feedbacks", {
        params: { type: "bug", limit: 10, offset: 0 },
      });
    });

    it("should pass pagination params", async () => {
      mockedGet.mockResolvedValue({
        data: {
          code: 200,
          message: "success",
          data: { list: [], total: 0 },
        },
      });

      await getFeedbackList(undefined, 50, 100);

      expect(mockedGet).toHaveBeenCalledWith("/admin/feedbacks", {
        params: { type: undefined, limit: 50, offset: 100 },
      });
    });
  });

  describe("getFeedbackDetail", () => {
    it("should GET /admin/feedbacks/:id and return detail", async () => {
      const f = makeFeedback({
        type: "question",
        content: "如何使用API？",
        contact: "test@example.com",
      });

      mockedGet.mockResolvedValue({
        data: { code: 200, message: "success", data: f },
      });

      const result = await getFeedbackDetail(1);

      expect(mockedGet).toHaveBeenCalledTimes(1);
      expect(mockedGet).toHaveBeenCalledWith("/admin/feedbacks/1");
      expect(result).toEqual(f);
      expect(result.content).toBe("如何使用API？");
    });

    it("should throw on error", async () => {
      mockedGet.mockResolvedValue({
        data: { code: 404, message: "反馈不存在", data: null },
      });

      await expect(getFeedbackDetail(999)).rejects.toThrow("反馈不存在");
    });

    it("should propagate network errors", async () => {
      mockedGet.mockRejectedValue(new Error("Network error"));

      await expect(getFeedbackDetail(1)).rejects.toThrow("Network error");
    });
  });
});
