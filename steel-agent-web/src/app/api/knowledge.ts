import apiClient from "./client";
import type { ApiResponse } from "@/app/types/api";
import type {
  KnowledgeItem,
  WeightCalculateRequest,
  WeightCalculateResult,
  UnitConvertRequest,
  UnitConvertResult,
} from "@/app/types/knowledge";

export async function searchKnowledge(keyword: string, limit = 10, offset = 0): Promise<KnowledgeItem[]> {
  const { data } = await apiClient.get<ApiResponse<KnowledgeItem[]>>("/knowledge/search", {
    params: { keyword, limit, offset },
  });
  return data.data;
}

export async function getStandardList(limit = 10, offset = 0): Promise<KnowledgeItem[]> {
  const { data } = await apiClient.get<ApiResponse<KnowledgeItem[]>>("/standards", {
    params: { limit, offset },
  });
  return data.data;
}

export async function getStandardDetail(id: number): Promise<KnowledgeItem> {
  const { data } = await apiClient.get<ApiResponse<KnowledgeItem>>(`/standards/${id}`);
  return data.data;
}

export async function getTermList(limit = 10, offset = 0): Promise<KnowledgeItem[]> {
  const { data } = await apiClient.get<ApiResponse<KnowledgeItem[]>>("/terms", {
    params: { limit, offset },
  });
  return data.data;
}

export async function getTermDetail(id: number): Promise<KnowledgeItem> {
  const { data } = await apiClient.get<ApiResponse<KnowledgeItem>>(`/terms/${id}`);
  return data.data;
}

export async function compareGrades(grade1: string, grade2: string): Promise<KnowledgeItem[]> {
  const { data } = await apiClient.get<ApiResponse<KnowledgeItem[]>>("/grades/compare", {
    params: { grade1, grade2 },
  });
  return data.data;
}

export async function calculateWeight(params: WeightCalculateRequest): Promise<WeightCalculateResult> {
  const { data } = await apiClient.post<ApiResponse<WeightCalculateResult>>("/tools/weight", params);
  return data.data;
}

export async function convertUnit(params: UnitConvertRequest): Promise<UnitConvertResult> {
  const { data } = await apiClient.post<ApiResponse<UnitConvertResult>>("/tools/convert", params);
  return data.data;
}
