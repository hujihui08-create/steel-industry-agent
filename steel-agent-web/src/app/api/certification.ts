import apiClient from "./client";
import type { ApiResponse } from "@/app/types/api";

export interface CertificationData {
  id: number;
  user_id: number;
  company_name: string;
  credit_code: string;
  contact_name: string;
  contact_phone: string;
  status: string;
  remark: string;
  created_at: string;
}

export interface SubmitCertificationParams {
  company_name: string;
  credit_code: string;
  contact_name: string;
  contact_phone: string;
}

export interface CertificationListResponse {
  list: CertificationData[];
  total: number;
}

export async function submitCertification(params: SubmitCertificationParams): Promise<CertificationData> {
  const { data } = await apiClient.post<ApiResponse<CertificationData>>(
    "/users/certification",
    params,
  );
  if (data.code !== 200) throw new Error(data.message || "提交认证失败");
  return data.data;
}

export async function getMyCertification(): Promise<CertificationData | null> {
  const { data } = await apiClient.get<ApiResponse<CertificationData | null>>(
    "/users/certification",
  );
  if (data.code !== 200) throw new Error(data.message || "获取认证状态失败");
  return data.data;
}

export async function getCertificationList(
  status?: string,
  limit = 20,
  offset = 0,
): Promise<CertificationListResponse> {
  const { data } = await apiClient.get<ApiResponse<CertificationListResponse>>(
    "/admin/certifications",
    { params: { status, limit, offset } },
  );
  if (data.code !== 200) throw new Error(data.message || "获取认证列表失败");
  return data.data;
}

export async function approveCertification(id: number): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<null>>(
    `/admin/certifications/${id}/approve`,
  );
  if (data.code !== 200) throw new Error(data.message || "审核失败");
}

export async function rejectCertification(id: number, remark: string): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<null>>(
    `/admin/certifications/${id}/reject`,
    { remark },
  );
  if (data.code !== 200) throw new Error(data.message || "驳回失败");
}
