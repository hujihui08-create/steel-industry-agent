// ============================================================
// 管理后台 API 函数封装
// 对应后端 /api/v1/admin/* 接口
// ============================================================

import apiClient from "./client";
import type { ApiResponse } from "@/app/types/api";
import type {
  CrawlerSource, CrawlerLog, CrawlStatus, CrawlerSourceFormData,
  DashboardStats, TrendDataPoint, BadCaseStats, BadCaseStatisticsResponse, ToolHealth,
  AgentConfig, PromptVersion, Intent, IntentStats, IntentTestResult,
  BadCase, BadCaseFilter, BadCaseImportResult, BadCaseVerifyResult, MobileUser, AdminUser, AdminRole, AdminUserStatus, OperationLog,
  SystemSettings, BackupRecord, BackupOverview, PaginatedResponse,
  Category, PublicCategories, MobileRole, RetentionStats
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
// 采集数据查看（价格 / 资讯 / 招标）
// ============================================================

export async function getAdminPrices(params: {
  category?: string;
  region?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { data } = await apiClient.get<ApiResponse<any[]>>("/admin/prices", { params });
  return data.data ?? [];
}

export async function getAdminNews(params: {
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { data } = await apiClient.get<ApiResponse<any[]>>("/admin/news", { params });
  return data.data ?? [];
}

export async function getAdminTenders(params: {
  region?: string;
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { data } = await apiClient.get<ApiResponse<any[]>>("/admin/tenders", { params });
  return data.data ?? [];
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
  const s = data.data;
  if (!s) {
    return {
      totalUsers: 0,
      totalUsersChange: 0,
      totalUsersChangePct: 0,
      todayActive: 0,
      todayActiveChange: 0,
      todayActiveChangePct: 0,
      totalConversations: 0,
      totalConversationsChange: 0,
      totalConversationsChangePct: 0,
      aiCalls: 0,
      aiCallsChange: 0,
      aiCallsChangePct: 0,
    };
  }
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
  const { data } = await apiClient.get<ApiResponse<BadCaseStatisticsResponse>>("/admin/bad-cases/statistics");
  const raw = data.data;
  if (!raw) {
    return { pending: 0, fixing: 0, fixed: 0, verified: 0 };
  }
  if ("status_counts" in raw && raw.status_counts) {
    return {
      pending: raw.status_counts.pending ?? 0,
      fixing: raw.status_counts.fixing ?? 0,
      fixed: raw.status_counts.fixed ?? 0,
      verified: raw.status_counts.verified ?? 0,
    };
  }
  if ("pending" in raw || "fixing" in raw) {
    return {
      pending: (raw as unknown as BadCaseStats).pending ?? 0,
      fixing: (raw as unknown as BadCaseStats).fixing ?? 0,
      fixed: (raw as unknown as BadCaseStats).fixed ?? 0,
      verified: (raw as unknown as BadCaseStats).verified ?? 0,
    };
  }
  return { pending: 0, fixing: 0, fixed: 0, verified: 0 };
}

export async function getToolHealth(): Promise<ToolHealth[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<{ tools: ToolHealth[]; summary: unknown }>>("/admin/debug/tool/health");
    const result = data.data;
    if (!result) return getDefaultToolHealth();
    if (Array.isArray(result)) return result as unknown as ToolHealth[];
    if (typeof result === "object" && "tools" in result) {
      return result.tools as ToolHealth[];
    }
    return getDefaultToolHealth();
  } catch {
    return getDefaultToolHealth();
  }
}

function getDefaultToolHealth(): ToolHealth[] {
  return [
    { name: "query_steel_price", displayName: "价格查询", status: "normal" },
    { name: "calculate_quotation", displayName: "报价计算", status: "normal" },
    { name: "search_knowledge", displayName: "知识检索", status: "normal" },
    { name: "query_tender", displayName: "招标查询", status: "normal" },
    { name: "get_price_trend", displayName: "价格走势", status: "normal" },
    { name: "set_price_alert", displayName: "价格预警", status: "normal" },
    { name: "convert_unit", displayName: "单位换算", status: "normal" },
    { name: "calculate_weight", displayName: "重量计算", status: "normal" },
    { name: "search_news", displayName: "资讯搜索", status: "normal" },
    { name: "get_news_detail", displayName: "资讯详情", status: "normal" },
  ];
}

export async function getRecentLogs(): Promise<OperationLog[]> {
  const { data } = await apiClient.get<ApiResponse<OperationLog[]>>(
    "/admin/logs",
    { params: { page_size: 5 } },
  );
  const raw = data.data;
  if (!raw) return [];
  let logs: any[] = [];
  if (Array.isArray(raw)) logs = raw as any[];
  else if (typeof raw === "object" && "list" in raw) {
    logs = (raw as unknown as { list: any[] }).list;
  }

  return logs.map((log: any) => ({
    id: String(log.id ?? ""),
    timestamp: log.created_at ?? "",
    operator: log.admin_id ? `管理员#${log.admin_id}` : "-",
    operatorAccount: log.admin_id ? String(log.admin_id) : "-",
    actionType: log.action ?? "unknown",
    summary: log.target_type ? `${log.action} ${log.target_type}` : (log.action ?? ""),
    ip: log.ip_address ?? "-",
    detail: typeof log.detail === "string" ? JSON.parse(log.detail || "{}") : (log.detail ?? {}),
  })) as OperationLog[];
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

function mapIntentFromAPI(raw: Record<string, unknown>): Intent {
  const keywords = raw.keywords;
  const keywordsStr = Array.isArray(keywords)
    ? (keywords as string[]).filter(Boolean).join(",")
    : (typeof keywords === "string" ? keywords : "");
  return {
    id: String(raw.id ?? ""),
    code: (raw.intent_code as string) ?? "",
    name: (raw.intent_name as string) ?? "",
    keywords: keywordsStr,
    entities: [],
    template: (raw.reply_template as string) ?? "",
    priority: (raw.priority as number) ?? 0,
    status: (raw.is_active as boolean) ? "enabled" : "disabled",
  };
}

function mapIntentToAPI(intent: Intent): Record<string, unknown> {
  return {
    intent_code: intent.code,
    intent_name: intent.name,
    keywords: intent.keywords
      ? intent.keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      : [],
    reply_template: intent.template,
    priority: intent.priority,
    is_active: intent.status === "enabled",
  };
}

export async function getIntents(filter?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}): Promise<PaginatedResponse<Intent>> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(
    "/admin/intents",
    { params: { page: filter?.page, page_size: filter?.pageSize, keyword: filter?.keyword, status: filter?.status } },
  );
  const raw = data.data;
  if (!raw) {
    return { items: [], total: 0, page: filter?.page ?? 1, pageSize: filter?.pageSize ?? 10 };
  }
  if (Array.isArray(raw)) {
    const items = (raw as Record<string, unknown>[]).map(mapIntentFromAPI);
    return { items, total: items.length, page: filter?.page ?? 1, pageSize: filter?.pageSize ?? 10 };
  }
  if (typeof raw === "object" && "items" in raw) {
    const r = raw as { items: Record<string, unknown>[]; total: number; page: number; pageSize: number };
    return {
      items: (r.items ?? []).map(mapIntentFromAPI),
      total: r.total ?? 0,
      page: r.page ?? filter?.page ?? 1,
      pageSize: r.pageSize ?? filter?.pageSize ?? 10,
    };
  }
  if (typeof raw === "object" && "list" in raw) {
    const r = raw as { list: Record<string, unknown>[]; total: number; page: number; page_size: number };
    return {
      items: (r.list ?? []).map(mapIntentFromAPI),
      total: r.total ?? 0,
      page: r.page ?? filter?.page ?? 1,
      pageSize: r.page_size ?? filter?.pageSize ?? 10,
    };
  }
  return { items: [], total: 0, page: filter?.page ?? 1, pageSize: filter?.pageSize ?? 10 };
}

export async function createIntent(intent: Intent): Promise<void> {
  await apiClient.post("/admin/intents", mapIntentToAPI(intent));
}

export async function updateIntent(intent: Intent): Promise<void> {
  await apiClient.put(`/admin/intents/${intent.id}`, mapIntentToAPI(intent));
}

export async function deleteIntent(id: string): Promise<void> {
  await apiClient.delete(`/admin/intents/${id}`);
}

export async function getIntentStats(): Promise<IntentStats[]> {
  const { data } = await apiClient.get<ApiResponse<unknown>>("/admin/intents/stats");
  const raw = data.data;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return (raw as Record<string, unknown>[]).map((item) => ({
      name: (item.name as string) ?? (item.intent_name as string) ?? "",
      code: (item.code as string) ?? (item.intent_code as string) ?? "",
      todayCalls: (item.today_calls as number) ?? (item.todayCalls as number) ?? 0,
      hitRate: (item.hit_rate as number) ?? (item.hitRate as number) ?? 0,
      avgResponseTime: (item.avg_response_time as number) ?? (item.avgResponseTime as number) ?? 0,
    })) as IntentStats[];
  }
  if (typeof raw === "object" && "list" in raw) {
    return ((raw as Record<string, unknown>).list as Record<string, unknown>[]).map((item) => ({
      name: (item.name as string) ?? (item.intent_name as string) ?? "",
      code: (item.code as string) ?? (item.intent_code as string) ?? "",
      todayCalls: (item.today_calls as number) ?? (item.todayCalls as number) ?? 0,
      hitRate: (item.hit_rate as number) ?? (item.hitRate as number) ?? 0,
      avgResponseTime: (item.avg_response_time as number) ?? (item.avgResponseTime as number) ?? 0,
    })) as IntentStats[];
  }
  return [];
}

function mapTestResultFromAPI(raw: Record<string, unknown>): IntentTestResult {
  const intentObj = (raw.intent as Record<string, unknown>) ?? {};
  const entitiesArr = (raw.entities as Array<Record<string, string>>) ?? [];
  const entities: Record<string, string> = {};
  for (const e of entitiesArr) {
    if (e.key && e.value) entities[e.key] = e.value;
  }
  return {
    intent: (intentObj.name as string) ?? (intentObj.code as string) ?? "unknown",
    confidence: (intentObj.confidence as number) ?? 0,
    entities,
    matchType: (raw.match_method as string) ?? (raw.matchType as string) ?? "keyword",
    tool: (raw.tool as string) ?? "",
    params: (raw.params as Record<string, unknown>) ?? {},
  };
}

export async function testIntent(text: string): Promise<IntentTestResult> {
  const { data } = await apiClient.post<ApiResponse<unknown>>(
    "/admin/debug/intent",
    { text },
  );
  if (!data?.data) throw new Error(data?.message || "意图测试失败");
  return mapTestResultFromAPI(data.data as Record<string, unknown>);
}

// ============================================================
// Bad Case 管理（对接真实后端 API）
// ============================================================

export async function getBadCases(filter?: BadCaseFilter): Promise<PaginatedResponse<BadCase>> {
  const { data } = await apiClient.get<ApiResponse<PaginatedResponse<BadCase>>>(
    "/admin/bad-cases",
    { params: filter },
  );
  return data.data!;
}

export async function getBadCaseDetail(id: string | number): Promise<BadCase> {
  const { data } = await apiClient.get<ApiResponse<BadCase>>(`/admin/bad-cases/${id}`);
  return data.data!;
}

export async function createBadCase(params: {
  user_query: string;
  ai_response: string;
  error_type: string;
  correct_response?: string;
}): Promise<BadCase> {
  const { data } = await apiClient.post<ApiResponse<BadCase>>("/admin/bad-cases", params);
  return data.data!;
}

export async function updateBadCase(
  id: string | number,
  params: Partial<BadCase>,
): Promise<void> {
  await apiClient.put(`/admin/bad-cases/${id}`, params);
}

export async function deleteBadCase(id: string | number): Promise<void> {
  await apiClient.delete(`/admin/bad-cases/${id}`);
}

export async function importBadCases(file: File): Promise<BadCaseImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<ApiResponse<BadCaseImportResult>>(
    "/admin/bad-cases/import",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data!;
}

export async function exportBadCases(filter?: BadCaseFilter): Promise<Blob> {
  const res = await apiClient.get("/admin/bad-cases/export", {
    params: filter,
    responseType: "blob",
  });
  return res.data;
}

export async function verifyBadCase(id: string | number): Promise<BadCaseVerifyResult> {
  const { data } = await apiClient.post<ApiResponse<BadCaseVerifyResult>>(
    `/admin/bad-cases/${id}/verify`,
  );
  return data.data!;
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
  const raw = data.data!;
  if (Array.isArray(raw)) {
    return { items: raw, total: raw.length, page: filter?.page ?? 1, pageSize: filter?.pageSize ?? 10 };
  }
  if (raw && typeof raw === "object" && "items" in raw) {
    return raw as unknown as PaginatedResponse<MobileUser>;
  }
  if (raw && typeof raw === "object" && "list" in raw) {
    const r = raw as unknown as { list: MobileUser[]; total: number; page: number; page_size: number };
    return { items: r.list, total: r.total, page: r.page, pageSize: r.page_size };
  }
  return { items: [], total: 0, page: filter?.page ?? 1, pageSize: filter?.pageSize ?? 10 };
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

function mapAdminLogToOperationLog(log: any): OperationLog {
  return {
    id: String(log.id ?? ""),
    timestamp: log.created_at ?? "",
    operator: log.admin_id ? `管理员#${log.admin_id}` : "-",
    operatorAccount: log.admin_id ? String(log.admin_id) : "-",
    actionType: log.action ?? "unknown",
    summary: log.target_type ? `${log.action} ${log.target_type}` : (log.action ?? ""),
    ip: log.ip_address ?? "-",
    detail: typeof log.detail === "string" ? JSON.parse(log.detail || "{}") : (log.detail ?? {}),
  };
}

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
  const raw = data.data!;
  if (Array.isArray(raw)) {
    return { items: (raw as any[]).map(mapAdminLogToOperationLog), total: raw.length, page: filter?.page ?? 1, pageSize: filter?.pageSize ?? 20 };
  }
  if (raw && typeof raw === "object" && "items" in raw) {
    const r = raw as unknown as { items: any[]; total: number; page: number; pageSize: number };
    return { items: r.items.map(mapAdminLogToOperationLog), total: r.total, page: r.page, pageSize: r.pageSize };
  }
  if (raw && typeof raw === "object" && "list" in raw) {
    const r = raw as unknown as { list: any[]; total: number; page: number; page_size: number };
    return { items: r.list.map(mapAdminLogToOperationLog), total: r.total, page: r.page, pageSize: r.page_size };
  }
  return { items: [], total: 0, page: filter?.page ?? 1, pageSize: filter?.pageSize ?? 20 };
}

export async function getOperationLogDetail(id: string): Promise<OperationLog> {
  const { data } = await apiClient.get<ApiResponse<any>>(`/admin/logs/${id}`);
  return mapAdminLogToOperationLog(data.data!);
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

// ============================================================
// 角色与权限管理
// ============================================================

export async function getMobileRoles(): Promise<MobileRole[]> {
  const { data } = await apiClient.get<ApiResponse<MobileRole[]>>('/admin/mobile-roles')
  return data.data!
}

export async function createMobileRole(
  params: { name: string; description?: string; status?: number },
): Promise<MobileRole> {
  const { data } = await apiClient.post<ApiResponse<MobileRole>>('/admin/mobile-roles', params)
  return data.data!
}

export async function updateMobileRole(
  id: number,
  params: { name?: string; description?: string; status?: number },
): Promise<MobileRole> {
  const { data } = await apiClient.put<ApiResponse<MobileRole>>(`/admin/mobile-roles/${id}`, params)
  return data.data!
}

export async function deleteMobileRole(id: number): Promise<void> {
  await apiClient.delete(`/admin/mobile-roles/${id}`)
}

export async function getRolePermissions(): Promise<MobileRole[]> {
  const { data } = await apiClient.get<ApiResponse<MobileRole[]>>('/admin/mobile-roles/permissions')
  return data.data!
}

export async function saveRolePermissions(
  roleId: number,
  permissions: Record<string, boolean>,
): Promise<void> {
  await apiClient.put('/admin/mobile-roles/permissions', {
    role_id: roleId,
    permissions,
  })
}

export async function getRetentionStats(): Promise<RetentionStats> {
  const { data } = await apiClient.get<ApiResponse<RetentionStats>>('/admin/mobile-users/retention')
  return data.data!
}
