import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { PriceAlert } from "@/app/types/alert";

export interface CreateAlertParams {
  category: string;
  spec: string;
  region: string;
  target_price: number;
  condition: 'above' | 'below';
}

export type UpdateAlertParams = Partial<CreateAlertParams>;

export async function getAlertList(): Promise<PriceAlert[]> {
  const { data } = await apiClient.get<ApiResponse<PriceAlert[]>>("/alerts");
  if (!data?.data) throw new Error(data?.message || "获取预警列表失败");
  return data.data;
}

export async function createAlert(params: CreateAlertParams): Promise<PriceAlert> {
  const { data } = await apiClient.post<ApiResponse<PriceAlert>>("/alerts", params);
  if (!data?.data) throw new Error(data?.message || "创建预警失败");
  return data.data;
}

export async function updateAlert(id: number, params: UpdateAlertParams): Promise<PriceAlert> {
  const { data } = await apiClient.put<ApiResponse<PriceAlert>>(`/alerts/${id}`, params);
  if (!data?.data) throw new Error(data?.message || "更新预警失败");
  return data.data;
}

export async function deleteAlert(id: number): Promise<void> {
  await apiClient.delete(`/alerts/${id}`);
}
