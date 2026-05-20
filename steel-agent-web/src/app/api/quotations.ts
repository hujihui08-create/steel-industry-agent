import apiClient from "@/app/api/client";
import type { ApiResponse } from "@/app/types/api";
import type { Quotation } from "@/app/types/quotation";

export type CalculateQuotationParams = {
  category: string;
  spec: string;
  quantity: number;
  unit?: string;
  region: string;
};

export type CalculateQuotationResult = {
  material_cost: number;
  freight_cost: number;
  tax_cost: number;
  total_price: number;
  category: string;
  spec: string;
  quantity: number;
  region: string;
};

export type CreateQuotationParams = {
  category: string;
  spec: string;
  quantity: number;
  unit?: string;
  region: string;
  material_cost: number;
  freight_cost: number;
  tax_cost: number;
  total_price: number;
  customer_name?: string;
  delivery_location?: string;
};

export async function getQuotationList(): Promise<Quotation[]> {
  const { data } = await apiClient.get<ApiResponse<Quotation[]>>(
    "/quotations",
  );
  if (!data?.data) throw new Error(data?.message || "获取报价列表失败");
  return data.data;
}

export async function getQuotationDetail(
  id: string,
): Promise<Quotation> {
  const { data } = await apiClient.get<ApiResponse<Quotation>>(
    `/quotations/${id}`,
  );
  if (!data?.data) throw new Error(data?.message || "获取报价详情失败");
  return data.data;
}

export async function calculateQuotation(
  params: CalculateQuotationParams,
): Promise<CalculateQuotationResult> {
  const { data } = await apiClient.post<ApiResponse<CalculateQuotationResult>>(
    "/quotations/calculate",
    params,
  );
  if (!data?.data) throw new Error(data?.message || "报价计算失败");
  return data.data;
}

export async function createQuotation(
  payload: CreateQuotationParams,
): Promise<Quotation> {
  const { data } = await apiClient.post<ApiResponse<Quotation>>(
    "/quotations",
    payload,
  );
  if (!data?.data) throw new Error(data?.message || "创建报价单失败");
  return data.data;
}
