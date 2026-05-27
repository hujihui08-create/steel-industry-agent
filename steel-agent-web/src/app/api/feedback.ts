import { adminApiClient } from "./client";
import type { ApiResponse } from "@/app/types/api";

export interface FeedbackData {
  id: number;
  user_id: number;
  type: string;
  content: string;
  contact: string;
  status: string;
  created_at: string;
}

export interface SubmitFeedbackParams {
  type: string;
  content: string;
  contact?: string;
}

export interface FeedbackListResponse {
  list: FeedbackData[];
  total: number;
}

export async function submitFeedback(params: SubmitFeedbackParams): Promise<FeedbackData> {
  const { data } = await adminApiClient.post<ApiResponse<FeedbackData>>(
    "/feedback",
    params,
  );
  if (data.code !== 200) throw new Error(data.message || "提交反馈失败");
  return data.data;
}

export async function getFeedbackList(
  type?: string,
  limit = 20,
  offset = 0,
): Promise<FeedbackListResponse> {
  const { data } = await adminApiClient.get<ApiResponse<FeedbackListResponse>>(
    "/admin/feedbacks",
    { params: { type, limit, offset } },
  );
  if (data.code !== 200) throw new Error(data.message || "获取反馈列表失败");
  return data.data;
}

export async function getFeedbackDetail(id: number): Promise<FeedbackData> {
  const { data } = await adminApiClient.get<ApiResponse<FeedbackData>>(
    `/admin/feedbacks/${id}`,
  );
  if (data.code !== 200) throw new Error(data.message || "获取反馈详情失败");
  return data.data;
}
