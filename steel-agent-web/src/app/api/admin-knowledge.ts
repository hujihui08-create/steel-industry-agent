import { adminApiClient } from "./client";
import type { ApiResponse } from "@/app/types/api";
import type {
  KnowledgeItem,
  KnowledgeStats,
  KnowledgeDetail,
  RAGSearchRequest,
  RAGSearchResult,
  RAGSearchHistory,
  RAGConfig,
} from "@/app/types/knowledge";

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
}

export interface KnowledgeListParams {
  type?: string;
  status?: string;
  category?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export async function adminListKnowledge(params: KnowledgeListParams): Promise<PaginatedResponse<KnowledgeItem>> {
  const { data } = await adminApiClient.get<ApiResponse<PaginatedResponse<KnowledgeItem>>>("/admin/knowledge", { params });
  return data.data;
}

export async function adminCreateKnowledge(body: {
  type: string;
  title: string;
  category?: string;
  standard_no?: string;
  content?: string;
  keywords?: string;
  vectorize?: boolean;
}): Promise<KnowledgeItem> {
  const { data } = await adminApiClient.post<ApiResponse<KnowledgeItem>>("/admin/knowledge", body);
  return data.data;
}

export async function adminUpdateKnowledge(id: number, body: {
  type?: string;
  title?: string;
  category?: string;
  standard_no?: string;
  content?: string;
  keywords?: string;
}): Promise<void> {
  await adminApiClient.put(`/admin/knowledge/${id}`, body);
}

export async function adminDeleteKnowledge(id: number): Promise<void> {
  await adminApiClient.delete(`/admin/knowledge/${id}`);
}

export async function adminGetKnowledgeDetail(id: number): Promise<KnowledgeDetail> {
  const { data } = await adminApiClient.get<ApiResponse<KnowledgeDetail>>(`/admin/knowledge/${id}`);
  return data.data;
}

export async function adminGetKnowledgeStats(): Promise<KnowledgeStats> {
  const { data } = await adminApiClient.get<ApiResponse<KnowledgeStats>>("/admin/knowledge/stats");
  return data.data;
}

export async function adminTriggerVectorization(id: number): Promise<void> {
  await adminApiClient.post(`/admin/knowledge/${id}/vectorize`);
}

export async function adminBatchImport(body: {
  files: { file_name: string; content: string }[];
  auto_vectorize?: boolean;
}): Promise<{ imported_ids: number[]; count: number }> {
  const { data } = await adminApiClient.post<ApiResponse<{ imported_ids: number[]; count: number }>>(
    "/admin/knowledge/batch-import",
    body
  );
  return data.data;
}

export async function adminUploadFiles(
  files: File[],
  autoVectorize = true
): Promise<{ imported_ids: number[]; count: number }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("auto_vectorize", String(autoVectorize));

  const { data } = await adminApiClient.post<ApiResponse<{ imported_ids: number[]; count: number }>>(
    "/admin/knowledge/batch-import",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data.data;
}

export async function adminTestSearch(params: RAGSearchRequest): Promise<RAGSearchResult[]> {
  const { data } = await adminApiClient.post<ApiResponse<RAGSearchResult[]>>("/admin/rag/test-search", params);
  return data.data;
}

export async function adminGetSearchHistory(limit = 20, offset = 0): Promise<PaginatedResponse<RAGSearchHistory>> {
  const { data } = await adminApiClient.get<ApiResponse<PaginatedResponse<RAGSearchHistory>>>("/admin/rag/search-history", {
    params: { limit, offset },
  });
  return data.data;
}

export async function adminGetRAGConfig(): Promise<RAGConfig> {
  const { data } = await adminApiClient.get<ApiResponse<RAGConfig>>("/admin/rag/config");
  return data.data;
}

export async function adminUpdateRAGConfig(config: RAGConfig): Promise<RAGConfig> {
  const { data } = await adminApiClient.put<ApiResponse<RAGConfig>>("/admin/rag/config", config);
  return data.data;
}
