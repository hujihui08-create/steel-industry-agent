// ============================================================
// 管理后台 API 函数封装
// 对应后端 /api/v1/admin/* 接口
// ============================================================

import apiClient from "./client";
import type { ApiResponse } from "@/app/types/api";
import type {
  CrawlerSource, CrawlerLog, CrawlStatus, CrawlerSourceFormData,
  DashboardStats, TrendDataPoint, BadCaseStats, ToolHealth,
  AgentConfig, PromptVersion, Intent, IntentStats, IntentTestResult,
  BadCase, MobileUser, AdminUser, AdminRole, AdminUserStatus, OperationLog,
  SystemSettings, BackupRecord, BackupOverview, PaginatedResponse,
  Category, PublicCategories
} from "@/app/types/admin";

// ============================================================
// 数据备份
// ============================================================

export async function getBackupOverview(): Promise<BackupOverview> {
  const { data } = await apiClient.get<ApiResponse<BackupOverview>>("/admin/backup/overview");
  return data.data!;
}

export async function getBackupRecords(
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<BackupRecord>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<BackupRecord>>>(
    "/admin/backup/records",
    { params: { page, page_size: pageSize } },
  );
  return data.data!;
}

export async function triggerBackup(): Promise<BackupRecord> {
  const { data } = await apiClient.post<ApiResponse<BackupRecord>>("/admin/backup/trigger");
  return data.data!;
}

export async function restoreBackup(backupId: string): Promise<void> {
  await apiClient.post(`/admin/backup/restore/${backupId}`);
}

export async function downloadBackup(backupId: string): Promise<Blob> {
  const res = await apiClient.get(`/admin/backup/download/${backupId}`, {
    responseType: "blob",
  });
  return res.data;
}

export async function getAutoBackupSettings(): Promise<{
  backupTime: string;
  retentionDays: number;
  storagePath: string;
}> {
  const { data } = await apiClient.get<ApiResponse<{
    backupTime: string;
    retentionDays: number;
    storagePath: string;
  }>>("/admin/backup/settings");
  return data.data!;
}

export async function saveAutoBackupSettings(
  settings: { backupTime: string; retentionDays: number; storagePath: string },
): Promise<void> {
  await apiClient.put("/admin/backup/settings", settings);
}

// ============================================================
// 爬虫管理（对接真实后端 API）
// ============================================================

export async function getCrawlerSources(): Promise<CrawlerSource[]> {
  const { data } = await apiClient.get<ApiResponse<CrawlerSource[]>>("/admin/crawler/sources");
  return data.data ?? [];
}

export async function createCrawlerSource(form: CrawlerSourceFormData): Promise<CrawlerSource> {
  const { data } = await apiClient.post<ApiResponse<CrawlerSource>>("/admin/crawler/sources", form);
  if (!data?.data) throw new Error(data?.message || "创建失败");
  return data.data;
}

export async function updateCrawlerSource(id: number, form: Partial<CrawlerSourceFormData>): Promise<CrawlerSource> {
  const { data } = await apiClient.put<ApiResponse<CrawlerSource>>(`/admin/crawler/sources/${id}`, form);
  if (!data?.data) throw new Error(data?.message || "更新失败");
  return data.data;
}

export async function deleteCrawlerSource(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/crawler/sources/${id}`);
  if (data.code !== 200) throw new Error(data.message || "删除失败");
}

export async function getCrawlerLogs(sourceId?: number, limit = 50): Promise<CrawlerLog[]> {
  const params: Record<string, string | number> = { limit };
  if (sourceId !== undefined) params.source_id = sourceId;
  const { data } = await apiClient.get<ApiResponse<CrawlerLog[]>>("/admin/crawler/logs", { params });
  return data.data ?? [];
}

export async function triggerCrawl(sourceId: number): Promise<void> {
  const { data } = await apiClient.post<ApiResponse<null>>(`/admin/crawler/trigger/${sourceId}`);
  if (data.code !== 200) throw new Error(data.message || "触发失败");
}

export async function getCrawlStatus(): Promise<Record<number, CrawlStatus>> {
  const { data } = await apiClient.get<ApiResponse<Record<number, CrawlStatus>>>("/admin/crawler/status");
  return data.data ?? {};
}

// ============================================================
// Dashboard 仪表盘（对接真实后端 API）
// ============================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<ApiResponse<{
    user_count: number;
    quotation_count: number;
    tender_count: number;
    alert_count: number;
    today_active?: number;
    total_conversations?: number;
    ai_calls?: number;
  }>>("/admin/dashboard");
  const s = data.data!;
  return {
    totalUsers: s.user_count,
    totalUsersChange: 0,
    totalUsersChangePct: 0,
    todayActive: s.today_active ?? 0,
    todayActiveChange: 0,
    todayActiveChangePct: 0,
    totalConversations: s.total_conversations ?? 0,
    totalConversationsChange: 0,
    totalConversationsChangePct: 0,
    aiCalls: s.ai_calls ?? 0,
    aiCallsChange: 0,
    aiCallsChangePct: 0,
  };
}

export async function getTrendData(
  period: "today" | "7days" | "30days",
): Promise<TrendDataPoint[]> {
  const { data } = await apiClient.get<ApiResponse<TrendDataPoint[]>>(
    "/admin/dashboard/trend",
    { params: { period } },
  );
  return data.data ?? [];
}

export async function getBadCaseStats(): Promise<BadCaseStats> {
  const { data } = await apiClient.get<ApiResponse<BadCaseStats>>("/admin/badcases/stats");
  return data.data!;
}

export async function getToolHealth(): Promise<ToolHealth[]> {
  const { data } = await apiClient.get<ApiResponse<ToolHealth[]>>("/admin/debug/tool/health");
  return data.data ?? [];
}

export async function getRecentLogs(): Promise<OperationLog[]> {
  const { data } = await apiClient.get<ApiResponse<OperationLog[]>>(
    "/admin/logs",
    { params: { page_size: 5 } },
  );
  return data.data ?? [];
}

// ============================================================
// Agent 配置（对接真实后端 API）
// ============================================================

export async function getAgentConfig(): Promise<AgentConfig> {
  const res = await apiClient.get<ApiResponse<AgentConfig>>("/admin/agent-config");
  return res.data.data!;
}

export async function saveAgentConfig(config: AgentConfig): Promise<void> {
  const res = await apiClient.put<ApiResponse<null>>("/admin/agent-config", config);
  if (res.data.code !== 200) {
    throw new Error(res.data.message || "保存失败");
  }
}

export async function getPromptVersions(): Promise<PromptVersion[]> {
  const res = await apiClient.get<ApiResponse<PromptVersion[]>>("/admin/agent-config/prompt-versions");
  return res.data.data!;
}

export async function testModelConnection(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>(
    "/admin/agent-config/test-connection",
    params,
  );
  return res.data.data!;
}

// ============================================================
// 意图管理（对接真实后端 API）
// ============================================================

export async function getIntents(filter?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}): Promise<PaginatedResponse<Intent>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Intent>>>(
    "/admin/intents",
    { params: { page: filter?.page, page_size: filter?.pageSize, keyword: filter?.keyword, status: filter?.status } },
  );
  return data.data!;
}

export async function createIntent(intent: Intent): Promise<void> {
  await apiClient.post("/admin/intents", intent);
}

export async function updateIntent(intent: Intent): Promise<void> {
  await apiClient.put(`/admin/intents/${intent.id}`, intent);
}

export async function deleteIntent(id: string): Promise<void> {
  await apiClient.delete(`/admin/intents/${id}`);
}

export async function getIntentStats(): Promise<IntentStats[]> {
  const { data } = await apiClient.get<ApiResponse<IntentStats[]>>("/admin/intents/stats");
  return data.data ?? [];
}

export async function testIntent(text: string): Promise<IntentTestResult> {
  const { data } = await apiClient.post<ApiResponse<IntentTestResult>>(
    "/admin/debug/intent",
    { text },
  );
  return data.data!;
}

// ============================================================
// Bad Case 管理（对接真实后端 API）
// ============================================================

export async function getBadCases(filter?: {
  page?: number;
  pageSize?: number;
  status?: string;
  errorType?: string;
  keyword?: string;
}): Promise<PaginatedResponse<BadCase>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<BadCase>>>(
    "/admin/badcases",
    { params: { page: filter?.page, page_size: filter?.pageSize, status: filter?.status, error_type: filter?.errorType, keyword: filter?.keyword } },
  );
  return data.data!;
}

export async function getBadCaseDetail(id: string): Promise<BadCase> {
  const { data } = await apiClient.get<ApiResponse<BadCase>>(`/admin/badcases/${id}`);
  return data.data!;
}

export async function updateBadCaseStatus(
  id: string,
  status: string,
  fixPlan?: string,
): Promise<void> {
  await apiClient.put(`/admin/badcases/${id}`, { status, fix_plan: fixPlan });
}

export async function exportBadCases(filter: any): Promise<Blob> {
  const res = await apiClient.get("/admin/badcases/export", {
    params: filter,
    responseType: "blob",
  });
  return res.data;
}

// ============================================================
// 移动端用户管理（对接真实后端 API）
// ============================================================

export async function getMobileUsers(filter?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  role?: string;
}): Promise<PaginatedResponse<MobileUser>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<MobileUser>>>(
    "/admin/mobile-users",
    { params: { page: filter?.page, page_size: filter?.pageSize, keyword: filter?.keyword, status: filter?.status, role: filter?.role } },
  );
  return data.data!;
}

export async function getMobileUserDetail(id: number): Promise<MobileUser> {
  const { data } = await apiClient.get<ApiResponse<MobileUser>>(`/admin/mobile-users/${id}`);
  return data.data!;
}

export async function disableMobileUser(id: number): Promise<void> {
  await apiClient.put(`/admin/mobile-users/${id}/disable`);
}

export async function enableMobileUser(id: number): Promise<void> {
  await apiClient.put(`/admin/mobile-users/${id}/enable`);
}

export async function exportMobileUsers(filter: any): Promise<Blob> {
  const res = await apiClient.get("/admin/mobile-users/export", {
    params: filter,
    responseType: "blob",
  });
  return res.data;
}

// ============================================================
// 管理员用户管理（对接真实后端 API）
// ============================================================

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<ApiResponse<AdminUser[]>>("/admin/users");
  if (!data?.data) {
    throw new Error(data?.message || "获取管理员列表失败");
  }
  return data.data;
}

export async function createAdminUser(params: {
  username: string;
  nickname: string;
  password: string;
  role: AdminRole;
}): Promise<AdminUser> {
  const { data } = await apiClient.post<ApiResponse<AdminUser>>("/admin/users", params);
  if (!data?.data) {
    throw new Error(data?.message || "创建管理员失败");
  }
  return data.data;
}

export async function updateAdminUser(
  id: number,
  params: { nickname?: string; role?: AdminRole; status?: AdminUserStatus },
): Promise<AdminUser> {
  const { data } = await apiClient.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, params);
  if (!data?.data) {
    throw new Error(data?.message || "更新管理员失败");
  }
  return data.data;
}

export async function deleteAdminUser(id: number): Promise<void> {
  const { data } = await apiClient.delete<ApiResponse<null>>(`/admin/users/${id}`);
  if (data.code !== 200) {
    throw new Error(data.message || "删除管理员失败");
  }
}

export async function getAdminNotifications(params?: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<{ id: number; title: string; content: string; type: string; is_read: boolean; created_at: string }>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<{ id: number; title: string; content: string; type: string; is_read: boolean; created_at: string }>>>("/admin/notifications", { params });
  if (!data?.data) {
    throw new Error(data?.message || "获取通知列表失败");
  }
  return data.data;
}

export async function markNotificationRead(id: number): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<null>>(`/admin/notifications/${id}/read`);
  if (data.code !== 200) {
    throw new Error(data.message || "标记已读失败");
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data } = await apiClient.put<ApiResponse<null>>("/admin/notifications/read-all");
  if (data.code !== 200) {
    throw new Error(data.message || "全部标记已读失败");
  }
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const { data } = await apiClient.get<ApiResponse<{ count: number }>>("/admin/notifications/unread-count");
  if (!data?.data) {
    throw new Error(data?.message || "获取未读数量失败");
  }
  return data.data;
}

// ============================================================
// 操作日志（对接真实后端 API）
// ============================================================

export async function getOperationLogs(filter?: {
  page?: number;
  pageSize?: number;
  operator?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<OperationLog>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<OperationLog>>>(
    "/admin/logs",
    { params: { page: filter?.page, page_size: filter?.pageSize, operator: filter?.operator, action_type: filter?.actionType, start_date: filter?.startDate, end_date: filter?.endDate } },
  );
  return data.data!;
}

export async function getOperationLogDetail(id: string): Promise<OperationLog> {
  const { data } = await apiClient.get<ApiResponse<OperationLog>>(`/admin/logs/${id}`);
  return data.data!;
}

export async function exportOperationLogs(filter?: {
  operator?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Blob> {
  const res = await apiClient.get("/admin/logs/export", {
    params: filter,
    responseType: "blob",
  });
  return res.data;
}

// ============================================================
// 系统设置（对接真实后端 API）
// ============================================================

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await apiClient.get<ApiResponse<SystemSettings>>("/admin/settings");
  return data.data!;
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  await apiClient.put("/admin/settings", settings);
}

export async function uploadLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ApiResponse<{ url: string }>>("/admin/settings/upload-logo", formData);
  return data.data!.url;
}

export async function testEmail(): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>("/admin/settings/test-email");
  return data.data!;
}

// ============================================================
// 品种管理（Category）
// ============================================================

export async function getCategories(params?: { type?: string; status?: string }): Promise<Category[]> {
  const query = new URLSearchParams();
  if (params?.type) query.set("type", params.type);
  if (params?.status) query.set("status", params.status);
  const res = await apiClient.get<ApiResponse<Category[]>>(`/admin/categories?${query.toString()}`);
  if (res.data.code !== 200) throw new Error(res.data.message || "加载失败");
  return res.data.data ?? [];
}

export async function createCategory(data: { name: string; type: string; sort_order: number }): Promise<Category> {
  const res = await apiClient.post<ApiResponse<Category>>("/admin/categories", data);
  if (res.data.code !== 200) throw new Error(res.data.message || "创建失败");
  return res.data.data!;
}

export async function updateCategory(id: number, data: { name: string; type: string; status: string; sort_order: number }): Promise<void> {
  const res = await apiClient.put<ApiResponse<null>>(`/admin/categories/${id}`, data);
  if (res.data.code !== 200) throw new Error(res.data.message || "更新失败");
}

export async function deleteCategory(id: number): Promise<void> {
  const res = await apiClient.delete<ApiResponse<null>>(`/admin/categories/${id}`);
  if (res.data.code !== 200) throw new Error(res.data.message || "删除失败");
}

export async function toggleCategory(id: number): Promise<Category> {
  const res = await apiClient.patch<ApiResponse<Category>>(`/admin/categories/${id}/toggle`);
  if (res.data.code !== 200) throw new Error(res.data.message || "切换失败");
  return res.data.data!;
}

export async function getPublicCategories(): Promise<PublicCategories> {
  const res = await fetch("/api/v1/categories");
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.message || "获取失败");
  return data.data;
}
