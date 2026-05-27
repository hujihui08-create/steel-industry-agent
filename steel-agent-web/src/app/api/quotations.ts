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
  process_cost: number;
  freight_cost: number;
  tax_cost: number;
  total_price: number;
  unit_price: number;
};

export type CreateQuotationParams = {
  title?: string;
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
  id: number | string,
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

export async function updateQuotation(
  id: number,
  data: Partial<CreateQuotationParams>,
): Promise<Quotation> {
  const { data: res } = await apiClient.put<ApiResponse<Quotation>>(
    `/quotations/${id}`,
    data,
  );
  if (!res?.data) throw new Error(res?.message || "更新报价单失败");
  return res.data;
}

export async function deleteQuotation(id: number): Promise<void> {
  await apiClient.delete(`/quotations/${id}`);
}

export async function exportQuotationPDF(id: number): Promise<void> {
  const response = await apiClient.get<Blob>(`/quotations/${id}/pdf`, {
    responseType: "blob",
  });

  const contentType = String(response.headers["content-type"] ?? "");
  if (!contentType.includes("application/pdf") && !contentType.includes("application/octet-stream")) {
    throw new Error("返回的不是有效的 PDF 文件");
  }

  const url = window.URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quotation_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
