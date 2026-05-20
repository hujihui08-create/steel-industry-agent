// ============================================================
// 管理后台 Mock API 函数封装
// 对应后端 /api/v1/admin/* 接口
// 每个函数模拟 300-500ms 网络延迟
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

const mockBackupOverview: BackupOverview = {
  dbSize: "2.3 GB",
  fileCount: 15,
  lastBackup: "2026-05-17 03:00:00",
  autoBackupEnabled: true,
  autoBackupTime: "03:00",
  retentionDays: 30,
};

let mockBackupSettings = {
  backupTime: "03:00",
  retentionDays: 30,
  storagePath: "/data/backups/",
};

const mockBackupRecords: BackupRecord[] = [
  { id: "bak-001", timestamp: "2026-05-17 03:00:00", fileSize: "2.3 GB", type: "auto", status: "success" },
  { id: "bak-002", timestamp: "2026-05-16 03:00:00", fileSize: "2.3 GB", type: "auto", status: "success" },
  { id: "bak-003", timestamp: "2026-05-15 14:30:00", fileSize: "2.2 GB", type: "manual", status: "success" },
  { id: "bak-004", timestamp: "2026-05-15 03:00:00", fileSize: "2.2 GB", type: "auto", status: "success" },
  { id: "bak-005", timestamp: "2026-05-14 03:00:00", fileSize: "2.2 GB", type: "auto", status: "failed" },
  { id: "bak-006", timestamp: "2026-05-13 03:00:00", fileSize: "2.1 GB", type: "auto", status: "success" },
  { id: "bak-007", timestamp: "2026-05-12 16:00:00", fileSize: "2.1 GB", type: "manual", status: "success" },
  { id: "bak-008", timestamp: "2026-05-12 03:00:00", fileSize: "2.1 GB", type: "auto", status: "success" },
  { id: "bak-009", timestamp: "2026-05-11 03:00:00", fileSize: "2.0 GB", type: "auto", status: "success" },
  { id: "bak-010", timestamp: "2026-05-10 03:00:00", fileSize: "2.0 GB", type: "auto", status: "success" },
  { id: "bak-011", timestamp: "2026-05-09 03:00:00", fileSize: "1.9 GB", type: "auto", status: "success" },
  { id: "bak-012", timestamp: "2026-05-08 11:00:00", fileSize: "1.9 GB", type: "manual", status: "success" },
  { id: "bak-013", timestamp: "2026-05-08 03:00:00", fileSize: "1.9 GB", type: "auto", status: "failed" },
  { id: "bak-014", timestamp: "2026-05-07 03:00:00", fileSize: "1.8 GB", type: "auto", status: "success" },
  { id: "bak-015", timestamp: "2026-05-06 03:00:00", fileSize: "1.8 GB", type: "auto", status: "success" },
];

// -----------------------------------------------------------
// 获取备份概览
// -----------------------------------------------------------
export async function getBackupOverview(): Promise<BackupOverview> {
  await delay();
  return { ...mockBackupOverview };
}

// -----------------------------------------------------------
// 获取备份记录（分页）
// -----------------------------------------------------------
export async function getBackupRecords(
  page = 1,
  pageSize = 10,
): Promise<PaginatedResponse<BackupRecord>> {
  await delay();
  return paginate([...mockBackupRecords], page, pageSize);
}

// -----------------------------------------------------------
// 手动触发备份
// -----------------------------------------------------------
export async function triggerBackup(): Promise<BackupRecord> {
  // 模拟较长延迟（2-5秒）
  await new Promise((r) => setTimeout(r, 2000 + Math.random() * 3000));

  const now = new Date();
  const ts = now
    .toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/\//g, "-");
  const newRecord: BackupRecord = {
    id: `bak-${String(mockBackupRecords.length + 1).padStart(3, "0")}`,
    timestamp: ts,
    fileSize: mockBackupOverview.dbSize,
    type: "manual",
    status: "success",
  };
  mockBackupRecords.unshift(newRecord);

  // 更新概览
  mockBackupOverview.fileCount += 1;
  mockBackupOverview.lastBackup = ts;

  return { ...newRecord };
}

// -----------------------------------------------------------
// 恢复备份
// -----------------------------------------------------------
export async function restoreBackup(
  _backupId: string,
): Promise<void> {
  // 模拟较长延迟（4-8秒）
  await new Promise((r) => setTimeout(r, 4000 + Math.random() * 4000));
}

// -----------------------------------------------------------
// 下载备份文件
// -----------------------------------------------------------
export async function downloadBackup(_backupId: string): Promise<Blob> {
  await delay();
  const record = mockBackupRecords.find((r) => r.id === _backupId);
  const header = `-- 钢铁行业Agent 数据库备份
-- 备份时间: ${record?.timestamp ?? "-"}
-- 文件大小: ${record?.fileSize ?? "-"}
-- 备份类型: ${record?.type === "auto" ? "自动" : "手动"}
`;
  return createTextBlob(header + "\n-- SQL dump content...\n");
}

// -----------------------------------------------------------
// 获取自动备份设置
// -----------------------------------------------------------
export async function getAutoBackupSettings(): Promise<{
  backupTime: string;
  retentionDays: number;
  storagePath: string;
}> {
  await delay();
  return { ...mockBackupSettings };
}

// -----------------------------------------------------------
// 保存自动备份设置
// -----------------------------------------------------------
export async function saveAutoBackupSettings(
  settings: {
    backupTime: string;
    retentionDays: number;
    storagePath: string;
  },
): Promise<void> {
  await delay();
  mockBackupSettings = { ...settings };
  mockBackupOverview.autoBackupTime = settings.backupTime;
  mockBackupOverview.retentionDays = settings.retentionDays;
}

// -----------------------------------------------------------
// 工具函数：模拟网络延迟 300-500ms
// -----------------------------------------------------------
function delay(ms?: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms ?? (300 + Math.random() * 200)));
}

// -----------------------------------------------------------
// 工具函数：模拟分页
// -----------------------------------------------------------
function paginate<T>(items: T[], page = 1, pageSize = 10): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

// -----------------------------------------------------------
// 工具函数：模拟 Blob 导出
// -----------------------------------------------------------
function createTextBlob(content: string): Blob {
  return new Blob([content], { type: "text/plain;charset=utf-8" });
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
// Dashboard 仪表盘
// ============================================================

// -----------------------------------------------------------
// 获取仪表盘核心指标
// -----------------------------------------------------------
export async function getDashboardStats(): Promise<DashboardStats> {
  await delay();
  return {
    totalUsers: 3284,
    totalUsersChange: 156,
    totalUsersChangePct: 4.98,
    todayActive: 847,
    todayActiveChange: -23,
    todayActiveChangePct: -2.64,
    totalConversations: 25631,
    totalConversationsChange: 3102,
    totalConversationsChangePct: 13.76,
    aiCalls: 89420,
    aiCallsChange: 12350,
    aiCallsChangePct: 16.02,
  };
}

// -----------------------------------------------------------
// 获取趋势数据
// -----------------------------------------------------------
export async function getTrendData(
  period: "today" | "7days" | "30days",
): Promise<TrendDataPoint[]> {
  await delay();

  if (period === "today") {
    // 今日24小时数据
    return [
      { date: "00:00", users: 12, conversations: 45 },
      { date: "02:00", users: 8, conversations: 28 },
      { date: "04:00", users: 5, conversations: 15 },
      { date: "06:00", users: 23, conversations: 89 },
      { date: "08:00", users: 156, conversations: 432 },
      { date: "10:00", users: 278, conversations: 691 },
      { date: "12:00", users: 215, conversations: 587 },
      { date: "14:00", users: 312, conversations: 823 },
      { date: "16:00", users: 289, conversations: 756 },
      { date: "18:00", users: 198, conversations: 612 },
      { date: "20:00", users: 145, conversations: 421 },
      { date: "22:00", users: 67, conversations: 198 },
    ];
  }

  if (period === "7days") {
    return [
      { date: "05-11", users: 682, conversations: 2850 },
      { date: "05-12", users: 710, conversations: 3012 },
      { date: "05-13", users: 756, conversations: 3245 },
      { date: "05-14", users: 801, conversations: 3410 },
      { date: "05-15", users: 823, conversations: 3680 },
      { date: "05-16", users: 847, conversations: 3821 },
      { date: "05-17", users: 798, conversations: 3613 },
    ];
  }

  // 30days
  return [
    { date: "04-18", users: 598, conversations: 2340 },
    { date: "04-21", users: 612, conversations: 2456 },
    { date: "04-24", users: 645, conversations: 2610 },
    { date: "04-27", users: 668, conversations: 2750 },
    { date: "04-30", users: 701, conversations: 2910 },
    { date: "05-03", users: 723, conversations: 3080 },
    { date: "05-06", users: 756, conversations: 3245 },
    { date: "05-09", users: 789, conversations: 3401 },
    { date: "05-12", users: 710, conversations: 3012 },
    { date: "05-15", users: 823, conversations: 3680 },
    { date: "05-17", users: 847, conversations: 3821 },
  ];
}

// -----------------------------------------------------------
// 获取 Bad Case 统计
// -----------------------------------------------------------
export async function getBadCaseStats(): Promise<BadCaseStats> {
  await delay();
  return {
    pending: 12,
    fixing: 5,
    fixed: 89,
    verified: 156,
  };
}

// -----------------------------------------------------------
// 获取工具健康状态（8 个工具，全部 normal）
// -----------------------------------------------------------
export async function getToolHealth(): Promise<ToolHealth[]> {
  await delay();
  return [
    { name: "query_steel_price", displayName: "查询钢材价格", status: "normal" },
    { name: "get_price_trend", displayName: "获取价格走势", status: "normal" },
    { name: "calculate_quotation", displayName: "计算报价", status: "normal" },
    { name: "search_knowledge", displayName: "搜索知识库", status: "normal" },
    { name: "query_tender", displayName: "查询招标信息", status: "normal" },
    { name: "set_price_alert", displayName: "设置价格预警", status: "normal" },
    { name: "convert_unit", displayName: "单位换算", status: "normal" },
    { name: "calculate_weight", displayName: "重量计算", status: "normal" },
  ];
}

// -----------------------------------------------------------
// 获取最近操作日志（最新 5 条）
// -----------------------------------------------------------
export async function getRecentLogs(): Promise<OperationLog[]> {
  await delay();
  return [
    {
      id: "log-20260517-001",
      timestamp: "2026-05-17 10:30:25",
      operator: "系统管理员",
      operatorAccount: "admin",
      actionType: "system_config",
      summary: "更新 Agent 系统提示词",
      ip: "192.168.1.100",
      detail: { field: "systemPrompt", reason: "优化钢材规格识别准确率" },
    },
    {
      id: "log-20260517-002",
      timestamp: "2026-05-17 09:45:12",
      operator: "运营人员A",
      operatorAccount: "operator_a",
      actionType: "badcase_fix",
      summary: "标记 Bad Case #BC-2026-0052 为已修复",
      ip: "192.168.1.101",
      detail: { badCaseId: "BC-2026-0052", newStatus: "fixed" },
    },
    {
      id: "log-20260517-003",
      timestamp: "2026-05-17 09:30:00",
      operator: "数据管理员B",
      operatorAccount: "data_b",
      actionType: "data_import",
      summary: "导入螺纹钢上海地区价格数据 1,280 条",
      ip: "192.168.1.102",
      detail: { category: "螺纹钢", region: "上海", count: 1280 },
    },
    {
      id: "log-20260517-004",
      timestamp: "2026-05-17 08:15:33",
      operator: "系统管理员",
      operatorAccount: "admin",
      actionType: "user_disable",
      summary: "禁用移动端用户 138****5678",
      ip: "192.168.1.100",
      detail: { userId: 2047, reason: "违规使用" },
    },
    {
      id: "log-20260517-005",
      timestamp: "2026-05-17 07:00:05",
      operator: "系统自动",
      operatorAccount: "system",
      actionType: "data_backup",
      summary: "自动备份完成，数据库大小 2.3 GB",
      ip: "127.0.0.1",
      detail: { size: "2.3 GB", type: "auto", fileCount: 3 },
    },
  ];
}

// ============================================================
// Agent 配置
// ============================================================

// -----------------------------------------------------------
// 获取 Agent 全局配置
// -----------------------------------------------------------
export async function getAgentConfig(): Promise<AgentConfig> {
  const res = await apiClient.get<ApiResponse<AgentConfig>>("/admin/agent-config");
  return res.data.data!;
}

// -----------------------------------------------------------
// 保存 Agent 配置
// -----------------------------------------------------------
export async function saveAgentConfig(config: AgentConfig): Promise<void> {
  const res = await apiClient.put<ApiResponse<null>>("/admin/agent-config", config);
  if (res.data.code !== 200) {
    throw new Error(res.data.message || "保存失败");
  }
}

// -----------------------------------------------------------
// 获取 Prompt 版本历史
// -----------------------------------------------------------
export async function getPromptVersions(): Promise<PromptVersion[]> {
  const res = await apiClient.get<ApiResponse<PromptVersion[]>>("/admin/agent-config/prompt-versions");
  return res.data.data!;
}

// -----------------------------------------------------------
// 测试模型连接
// -----------------------------------------------------------
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
// 意图管理
// ============================================================

const mockIntents: Intent[] = [
  {
    id: "intent-001",
    code: "query_price",
    name: "查询价格",
    keywords: "价格、多少钱、报价、价位、行情",
    entities: ["category", "spec", "region"],
    template: "查询{category}{spec}在{region}的最新价格",
    priority: 1,
    status: "enabled",
  },
  {
    id: "intent-002",
    code: "price_trend",
    name: "价格走势",
    keywords: "走势、趋势、涨跌、变化、波动",
    entities: ["category", "spec", "region", "days"],
    template: "查询{category}最近{days}天的价格走势",
    priority: 2,
    status: "enabled",
  },
  {
    id: "intent-003",
    code: "calculate_quote",
    name: "计算报价",
    keywords: "报价、计算、多少钱、总价、成本",
    entities: ["category", "spec", "quantity", "region"],
    template: "计算{category}{spec}的报价，数量{quantity}，地区{region}",
    priority: 3,
    status: "enabled",
  },
  {
    id: "intent-004",
    code: "search_knowledge",
    name: "知识查询",
    keywords: "标准、规格、牌号、定义、什么是",
    entities: ["query", "type"],
    template: "搜索知识库：{query}，类型{type}",
    priority: 4,
    status: "enabled",
  },
  {
    id: "intent-005",
    code: "query_tender",
    name: "招标查询",
    keywords: "招标、采购、投标、中标、公告",
    entities: ["keyword", "region", "status"],
    template: "查询招标信息：{keyword}，地区{region}",
    priority: 5,
    status: "enabled",
  },
  {
    id: "intent-006",
    code: "set_alert",
    name: "设置预警",
    keywords: "预警、提醒、通知、到达、超过",
    entities: ["category", "target_price", "condition"],
    template: "设置{category}价格预警，目标价{target_price}，条件{condition}",
    priority: 6,
    status: "enabled",
  },
  {
    id: "intent-007",
    code: "unit_convert",
    name: "单位换算",
    keywords: "换算、转换、等于、吨、千克、公斤",
    entities: ["value", "from_unit", "to_unit"],
    template: "将{value}从{from_unit}换算为{to_unit}",
    priority: 7,
    status: "enabled",
  },
  {
    id: "intent-008",
    code: "weight_calc",
    name: "重量计算",
    keywords: "重量、多重、理论重量、米重",
    entities: ["spec", "length", "quantity"],
    template: "计算规格{spec}的理论重量，长度{length}，数量{quantity}",
    priority: 8,
    status: "disabled",
  },
];

// -----------------------------------------------------------
// 获取意图列表
// -----------------------------------------------------------
export async function getIntents(filter?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}): Promise<PaginatedResponse<Intent>> {
  await delay();
  let items = [...mockIntents];
  if (filter?.keyword) {
    const kw = filter.keyword.toLowerCase();
    items = items.filter(
      (i) =>
        i.name.includes(kw) ||
        i.code.includes(kw) ||
        i.keywords.includes(kw),
    );
  }
  if (filter?.status && filter.status !== "all") {
    items = items.filter((i) => i.status === filter.status);
  }
  return paginate(items, filter?.page ?? 1, filter?.pageSize ?? 10);
}

// -----------------------------------------------------------
// 创建意图
// -----------------------------------------------------------
export async function createIntent(_intent: Intent): Promise<void> {
  await delay();
}

// -----------------------------------------------------------
// 更新意图
// -----------------------------------------------------------
export async function updateIntent(_intent: Intent): Promise<void> {
  await delay();
}

// -----------------------------------------------------------
// 删除意图
// -----------------------------------------------------------
export async function deleteIntent(_id: string): Promise<void> {
  await delay();
}

// -----------------------------------------------------------
// 获取意图调用统计
// -----------------------------------------------------------
export async function getIntentStats(): Promise<IntentStats[]> {
  await delay();
  return [
    {
      name: "查询价格",
      code: "query_price",
      todayCalls: 1245,
      hitRate: 0.962,
      avgResponseTime: 1.23,
    },
    {
      name: "价格走势",
      code: "price_trend",
      todayCalls: 678,
      hitRate: 0.948,
      avgResponseTime: 2.15,
    },
    {
      name: "计算报价",
      code: "calculate_quote",
      todayCalls: 432,
      hitRate: 0.91,
      avgResponseTime: 3.42,
    },
    {
      name: "知识查询",
      code: "search_knowledge",
      todayCalls: 289,
      hitRate: 0.875,
      avgResponseTime: 1.89,
    },
    {
      name: "招标查询",
      code: "query_tender",
      todayCalls: 156,
      hitRate: 0.824,
      avgResponseTime: 2.56,
    },
  ];
}

// -----------------------------------------------------------
// 意图测试
// -----------------------------------------------------------
export async function testIntent(text: string): Promise<IntentTestResult> {
  await delay();

  // 根据输入文字简单模拟意图识别
  if (text.includes("价格") && !text.includes("走势")) {
    return {
      intent: "query_price",
      confidence: 0.96,
      entities: { category: "螺纹钢", spec: "HRB400E 20mm", region: "上海" },
      matchType: "exact_keyword",
      tool: "query_steel_price",
      params: { category: "螺纹钢", spec: "HRB400E 20mm", region: "上海" },
    };
  }
  if (text.includes("走势") || text.includes("趋势")) {
    return {
      intent: "price_trend",
      confidence: 0.93,
      entities: { category: "热卷", days: "30" },
      matchType: "exact_keyword",
      tool: "get_price_trend",
      params: { category: "热卷", days: 30 },
    };
  }
  if (text.includes("报价") || text.includes("计算")) {
    return {
      intent: "calculate_quote",
      confidence: 0.89,
      entities: { category: "螺纹钢", spec: "HRB400E 20mm", quantity: "100", region: "上海" },
      matchType: "fuzzy",
      tool: "calculate_quotation",
      params: { category: "螺纹钢", spec: "HRB400E 20mm", quantity: 100, region: "上海" },
    };
  }
  if (text.includes("招标") || text.includes("采购")) {
    return {
      intent: "query_tender",
      confidence: 0.91,
      entities: { keyword: "螺纹钢", region: "华东" },
      matchType: "exact_keyword",
      tool: "query_tender",
      params: { keyword: "螺纹钢", region: "华东" },
    };
  }

  return {
    intent: "search_knowledge",
    confidence: 0.72,
    entities: {},
    matchType: "fallback",
    tool: "search_knowledge",
    params: { query: text },
  };
}

// ============================================================
// Bad Case 管理
// ============================================================

const mockBadCases: BadCase[] = [
  {
    id: "BC-2026-0052",
    userQuestion: "螺纹钢HRB400E 20mm 上海今天什么价？",
    aiResponse: "根据查询，螺纹钢HRB400E 20mm 上海地区今日报价为¥3,650/吨。数据来源：我的钢铁网 2026-05-17 10:00。",
    errorType: "price_inaccurate",
    status: "fixed",
    reportedBy: "运营人员A",
    reportedAt: "2026-05-17 09:30:00",
    conversationId: "conv-e8a1b2c3",
    messageId: "msg-d4e5f6a7",
    correctResponse: "螺纹钢HRB400E 20mm 上海地区今日实际报价为¥3,850/吨。已更正数据源同步频率。",
    fixPlan: "更新数据源同步频率为每小时一次，修正价格映射逻辑",
    fixerName: "运营人员A",
    fixedAt: "2026-05-17 09:45:12",
    verificationResult: "",
  },
  {
    id: "BC-2026-0051",
    userQuestion: "热卷Q235B 5.75mm 最近一个月走势怎么样？",
    aiResponse: "热卷Q235B 5.75mm 近30天价格在¥3,800-¥4,200之间波动，整体呈上涨趋势。",
    errorType: "missing_data",
    status: "verified",
    reportedBy: "用户反馈",
    reportedAt: "2026-05-16 14:20:00",
    conversationId: "conv-a1b2c3d4",
    messageId: "msg-e5f6a7b8",
    correctResponse: "热卷Q235B 5.75mm 近30天价格走势：最高¥4,250（5月10日），最低¥3,820（4月18日），当前¥4,180。上涨+9.4%。",
    fixPlan: "补充价格走势数据图表展示，增加最高最低标注",
    fixerName: "数据管理员B",
    fixedAt: "2026-05-16 16:00:00",
    verificationResult: "已通过验证，走势图数据完整准确",
  },
  {
    id: "BC-2026-0050",
    userQuestion: "帮我计算100吨螺纹钢的报价，送到杭州",
    aiResponse: "好的，螺纹钢100吨报价计算如下：材料成本¥385,000 + 加工费¥15,000 + 运费¥3,200 + 税费¥46,944 = 总计¥450,144。",
    errorType: "calculation_error",
    status: "fixed",
    reportedBy: "运营人员A",
    reportedAt: "2026-05-16 11:00:00",
    conversationId: "conv-f1e2d3c4",
    messageId: "msg-b5a6c7d8",
    correctResponse: "螺纹钢100吨报价：材料¥385,000 + 加工费¥12,000 + 运费¥3,200 + 税费(13%)¥52,026 = 总计¥452,226。修正了加工费和税费计算。",
    fixPlan: "修正报价模板中加工费参数和税率计算逻辑",
    fixerName: "运营人员A",
    fixedAt: "2026-05-16 15:30:00",
    verificationResult: "已验证通过",
  },
  {
    id: "BC-2026-0049",
    userQuestion: "Q345B和Q355B有什么区别？",
    aiResponse: "抱歉，我暂时无法回答这个问题。建议您咨询专业技术人员。",
    errorType: "refuse_answer",
    status: "pending",
    reportedBy: "用户反馈",
    reportedAt: "2026-05-16 08:45:00",
    conversationId: "conv-c9d8e7f6",
    messageId: "msg-a5b4c3d2",
    correctResponse: "",
    fixPlan: "",
    fixerName: "",
    fixedAt: "",
    verificationResult: "",
  },
  {
    id: "BC-2026-0048",
    userQuestion: "冷轧板DC01 1.0mm 广州价格",
    aiResponse: "冷轧板DC01 1.0mm 广州地区价格为¥999,999/吨。",
    errorType: "data_anomaly",
    status: "fixing",
    reportedBy: "系统自动检测",
    reportedAt: "2026-05-15 18:00:00",
    conversationId: "conv-a7b8c9d0",
    messageId: "msg-e1f2a3b4",
    correctResponse: "",
    fixPlan: "定位数据源异常值，修复价格采集脚本中的解析逻辑",
    fixerName: "数据管理员B",
    fixedAt: "",
    verificationResult: "",
  },
  {
    id: "BC-2026-0047",
    userQuestion: "帮我查下HRB500E的价格",
    aiResponse: "HRB500E螺纹钢上海地区报价¥4,200/吨。",
    errorType: "data_anomaly",
    status: "verified",
    reportedBy: "用户反馈",
    reportedAt: "2026-05-15 10:30:00",
    conversationId: "conv-b2c3d4e5",
    messageId: "msg-f6a7b8c9",
    correctResponse: "HRB500E螺纹钢上海地区报价¥4,350/吨。已更新规格对照表。",
    fixPlan: "更新HRB500E规格价格对照表",
    fixerName: "数据管理员B",
    fixedAt: "2026-05-15 14:00:00",
    verificationResult: "验证通过，价格已更正",
  },
];

// -----------------------------------------------------------
// 获取 Bad Case 列表
// -----------------------------------------------------------
export async function getBadCases(filter?: {
  page?: number;
  pageSize?: number;
  status?: string;
  errorType?: string;
  keyword?: string;
}): Promise<PaginatedResponse<BadCase>> {
  await delay();
  let items = [...mockBadCases];
  if (filter?.status && filter.status !== "all") {
    items = items.filter((b) => b.status === filter.status);
  }
  if (filter?.errorType && filter.errorType !== "all") {
    items = items.filter((b) => b.errorType === filter.errorType);
  }
  if (filter?.keyword) {
    const kw = filter.keyword.toLowerCase();
    items = items.filter(
      (b) =>
        b.userQuestion.includes(kw) ||
        b.aiResponse.includes(kw) ||
        b.errorType.includes(kw),
    );
  }
  return paginate(items, filter?.page ?? 1, filter?.pageSize ?? 10);
}

// -----------------------------------------------------------
// 获取 Bad Case 详情
// -----------------------------------------------------------
export async function getBadCaseDetail(id: string): Promise<BadCase> {
  await delay();
  const item = mockBadCases.find((b) => b.id === id);
  if (!item) throw new Error("Bad Case 不存在");
  return { ...item };
}

// -----------------------------------------------------------
// 更新 Bad Case 状态
// -----------------------------------------------------------
export async function updateBadCaseStatus(
  _id: string,
  _status: string,
  _fixPlan?: string,
): Promise<void> {
  await delay();
}

// -----------------------------------------------------------
// 导出 Bad Case
// -----------------------------------------------------------
export async function exportBadCases(_filter: any): Promise<Blob> {
  await delay();
  const header = "ID,用户问题,AI回复,错误类型,状态,报告人,报告时间,修正方案\n";
  const rows = mockBadCases
    .map(
      (b) =>
        `${b.id},${b.userQuestion},${b.aiResponse},${b.errorType},${b.status},${b.reportedBy},${b.reportedAt},${b.fixPlan}`,
    )
    .join("\n");
  return createTextBlob(header + rows);
}

// ============================================================
// 移动端用户管理
// ============================================================

const mockMobileUsers: MobileUser[] = [
  {
    id: 1001,
    phone: "138****1234",
    nickname: "张建国",
    company: "上海建工集团",
    role: "buyer",
    region: "上海",
    status: "active",
    registeredAt: "2026-03-15 09:20:00",
    lastLoginAt: "2026-05-17 10:12:33",
    deviceInfo: "iPhone 16 Pro · iOS 19.2",
  },
  {
    id: 1002,
    phone: "139****5678",
    nickname: "李明远",
    company: "杭州钢铁贸易有限公司",
    role: "seller",
    region: "浙江",
    status: "active",
    registeredAt: "2026-03-20 14:30:00",
    lastLoginAt: "2026-05-17 09:58:00",
    deviceInfo: "Xiaomi 15 · Android 15",
  },
  {
    id: 1003,
    phone: "136****9012",
    nickname: "王海峰",
    company: "广州钢材市场经营部",
    role: "buyer",
    region: "广东",
    status: "active",
    registeredAt: "2026-04-02 11:15:00",
    lastLoginAt: "2026-05-16 18:30:00",
    deviceInfo: "HUAWEI Mate 70 · HarmonyOS 5",
  },
  {
    id: 1004,
    phone: "137****3456",
    nickname: "赵雪梅",
    company: "北京首钢物资公司",
    role: "analyst",
    region: "北京",
    status: "active",
    registeredAt: "2026-04-10 08:00:00",
    lastLoginAt: "2026-05-17 08:05:00",
    deviceInfo: "iPhone 15 · iOS 18.3",
  },
  {
    id: 1005,
    phone: "135****7890",
    nickname: "陈志强",
    company: "武汉钢铁采购中心",
    role: "buyer",
    region: "湖北",
    status: "disabled",
    registeredAt: "2026-04-15 16:45:00",
    lastLoginAt: "2026-05-10 14:20:00",
    deviceInfo: "OPPO Find X8 · Android 15",
  },
  {
    id: 1006,
    phone: "133****2345",
    nickname: "刘伟东",
    company: "南京钢铁联合有限公司",
    role: "seller",
    region: "江苏",
    status: "active",
    registeredAt: "2026-04-22 10:00:00",
    lastLoginAt: "2026-05-17 07:30:00",
    deviceInfo: "vivo X200 · Android 15",
  },
  {
    id: 1007,
    phone: "132****6789",
    nickname: "周丽华",
    company: "重庆钢铁股份有限公司",
    role: "analyst",
    region: "重庆",
    status: "active",
    registeredAt: "2026-05-01 13:00:00",
    lastLoginAt: "2026-05-16 16:45:00",
    deviceInfo: "Samsung Galaxy S25 · Android 15",
  },
  {
    id: 1008,
    phone: "131****0123",
    nickname: "吴建国",
    company: "天津钢管集团",
    role: "buyer",
    region: "天津",
    status: "disabled",
    registeredAt: "2026-05-05 09:30:00",
    lastLoginAt: "2026-05-12 11:00:00",
    deviceInfo: "HONOR Magic7 · Android 15",
  },
];

// -----------------------------------------------------------
// 获取移动端用户列表
// -----------------------------------------------------------
export async function getMobileUsers(filter?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  role?: string;
}): Promise<PaginatedResponse<MobileUser>> {
  await delay();
  let items = [...mockMobileUsers];
  if (filter?.keyword) {
    const kw = filter.keyword.toLowerCase();
    items = items.filter(
      (u) =>
        u.nickname.includes(kw) ||
        u.company.includes(kw) ||
        u.phone.includes(kw),
    );
  }
  if (filter?.status && filter.status !== "all") {
    items = items.filter((u) => u.status === filter.status);
  }
  if (filter?.role && filter.role !== "all") {
    items = items.filter((u) => u.role === filter.role);
  }
  return paginate(items, filter?.page ?? 1, filter?.pageSize ?? 10);
}

// -----------------------------------------------------------
// 获取移动端用户详情（含使用统计）
// -----------------------------------------------------------
export async function getMobileUserDetail(id: number): Promise<MobileUser> {
  await delay();
  const user = mockMobileUsers.find((u) => u.id === id);
  if (!user) throw new Error("用户不存在");
  return {
    ...user,
    stats: {
      totalConversations: 156,
      totalQuotations: 23,
      savedTenders: 8,
      priceAlerts: 5,
      aiCalls: 342,
      positiveRate: 0.87,
    },
  };
}

// -----------------------------------------------------------
// 禁用移动端用户
// -----------------------------------------------------------
export async function disableMobileUser(_id: number): Promise<void> {
  await delay();
}

// -----------------------------------------------------------
// 启用移动端用户
// -----------------------------------------------------------
export async function enableMobileUser(_id: number): Promise<void> {
  await delay();
}

// -----------------------------------------------------------
// 导出移动端用户
// -----------------------------------------------------------
export async function exportMobileUsers(_filter: any): Promise<Blob> {
  await delay();
  const header = "ID,手机号,昵称,公司,角色,地区,状态,注册时间,最后登录\n";
  const rows = mockMobileUsers
    .map(
      (u) =>
        `${u.id},${u.phone},${u.nickname},${u.company},${u.role},${u.region},${u.status},${u.registeredAt},${u.lastLoginAt}`,
    )
    .join("\n");
  return createTextBlob(header + rows);
}

// ============================================================
// 管理员用户管理
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
// 操作日志
// ============================================================

const ACTION_TYPE_LABELS: Record<string, string> = {
  system_config: "修改配置",
  data_operation: "数据操作",
  user_management: "用户管理",
  system_task: "系统任务",
  login: "登录",
  quality_management: "质量管理",
};

const mockOperationLogs: OperationLog[] = [
  {
    id: "log-20260517-001",
    timestamp: "2026-05-17 10:30:25",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "system_config",
    summary: "更新 Agent 系统提示词",
    ip: "192.168.1.100",
    detail: {
      target: "agent_configs",
      action: "update",
      key: "system_prompt",
      old_value: "你是一个钢铁行业智能助手。规则：\n1. 价格数据优先通过工具查询\n2. 不确定时建议用户咨询专业分析师",
      new_value: "你是一个钢铁行业智能助手。重要规则：\n1. 所有价格数据必须通过工具调用获取，禁止编造\n2. 如果不确定，明确告知用户\"我需要查询一下\"\n3. 涉及交易决策时，必须附加免责声明\n4. 结论先行，数据优先，来源可追溯\n5. 数字格式：价格用千分位+单位（¥3,850/吨），涨跌用符号+百分比（+12 +0.31%）",
    },
  },
  {
    id: "log-20260517-002",
    timestamp: "2026-05-17 10:15:00",
    operator: "运营人员A",
    operatorAccount: "operator_a",
    actionType: "quality_management",
    summary: "标记 Bad Case #BC-2026-0052 为已修复",
    ip: "192.168.1.101",
    detail: {
      target: "bad_cases",
      action: "update",
      bad_case_id: "BC-2026-0052",
      old_status: "fixing",
      new_status: "fixed",
      fix_plan: "更新数据源同步频率为每小时一次，修正价格映射逻辑",
    },
  },
  {
    id: "log-20260517-003",
    timestamp: "2026-05-17 09:45:12",
    operator: "数据管理员B",
    operatorAccount: "data_b",
    actionType: "data_operation",
    summary: "导入螺纹钢上海地区价格数据 1,280 条",
    ip: "192.168.1.102",
    detail: {
      target: "steel_prices",
      action: "import",
      category: "螺纹钢",
      spec: "HRB400E 20mm",
      region: "上海",
      count: 1280,
      source: "我的钢铁网",
    },
  },
  {
    id: "log-20260517-004",
    timestamp: "2026-05-17 09:30:00",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "user_management",
    summary: "禁用移动端用户 138****5678",
    ip: "192.168.1.100",
    detail: {
      target: "users",
      action: "disable",
      user_id: 2047,
      phone: "138****5678",
      reason: "违规使用",
    },
  },
  {
    id: "log-20260517-005",
    timestamp: "2026-05-17 08:15:33",
    operator: "运营人员A",
    operatorAccount: "operator_a",
    actionType: "system_config",
    summary: "修改 Agent 温度参数",
    ip: "192.168.1.101",
    detail: {
      target: "agent_configs",
      action: "update",
      key: "temperature",
      old_value: "0.3",
      new_value: "0.1",
    },
  },
  {
    id: "log-20260517-006",
    timestamp: "2026-05-17 07:00:05",
    operator: "系统",
    operatorAccount: "system",
    actionType: "system_task",
    summary: "自动备份完成，数据库大小 2.3 GB",
    ip: "127.0.0.1",
    detail: {
      target: "database",
      action: "backup",
      size: "2.3 GB",
      type: "auto",
      file_count: 3,
      duration_seconds: 45,
    },
  },
  {
    id: "log-20260516-007",
    timestamp: "2026-05-16 17:50:20",
    operator: "数据管理员B",
    operatorAccount: "data_b",
    actionType: "data_operation",
    summary: "手动触发价格采集任务",
    ip: "192.168.1.102",
    detail: {
      target: "crawler_tasks",
      action: "trigger",
      source: "我的钢铁网",
      categories: ["螺纹钢", "热卷", "冷轧"],
      status: "success",
    },
  },
  {
    id: "log-20260516-008",
    timestamp: "2026-05-16 16:30:00",
    operator: "运营人员A",
    operatorAccount: "operator_a",
    actionType: "quality_management",
    summary: "验证 Bad Case #BC-2026-0047 修复结果",
    ip: "192.168.1.101",
    detail: {
      target: "bad_cases",
      action: "verify",
      bad_case_id: "BC-2026-0047",
      result: "通过",
    },
  },
  {
    id: "log-20260516-009",
    timestamp: "2026-05-16 15:00:12",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "user_management",
    summary: "添加管理员运营人员D",
    ip: "192.168.1.100",
    detail: {
      target: "admin_users",
      action: "create",
      username: "operator_d",
      role: "operator",
    },
  },
  {
    id: "log-20260516-010",
    timestamp: "2026-05-16 14:20:35",
    operator: "运营人员A",
    operatorAccount: "operator_a",
    actionType: "system_config",
    summary: "添加快捷指令「设预警」",
    ip: "192.168.1.101",
    detail: {
      target: "agent_configs",
      action: "update",
      key: "quick_commands",
      added: { id: "qc-6", icon: "Bell", label: "设预警", prompt: "帮我设置价格预警" },
    },
  },
  {
    id: "log-20260516-011",
    timestamp: "2026-05-16 12:05:00",
    operator: "系统",
    operatorAccount: "system",
    actionType: "system_task",
    summary: "定时价格采集完成：热卷 Q235B 全国 2,450 条",
    ip: "127.0.0.1",
    detail: {
      target: "crawler_tasks",
      action: "scheduled_run",
      category: "热卷",
      spec: "Q235B",
      region: "全国",
      count: 2450,
      source: "钢联数据",
    },
  },
  {
    id: "log-20260516-012",
    timestamp: "2026-05-16 10:45:18",
    operator: "数据管理员B",
    operatorAccount: "data_b",
    actionType: "data_operation",
    summary: "更新标准库 GB/T 1499.2-2024 螺纹钢标准",
    ip: "192.168.1.102",
    detail: {
      target: "knowledge_base",
      action: "update",
      type: "standard",
      standard_no: "GB/T 1499.2-2024",
      title: "钢筋混凝土用钢 第2部分：热轧带肋钢筋",
    },
  },
  {
    id: "log-20260515-013",
    timestamp: "2026-05-15 18:00:00",
    operator: "系统",
    operatorAccount: "system",
    actionType: "system_task",
    summary: "系统自动检测到异常价格数据：冷轧板 DC01 广州 ¥999,999/吨",
    ip: "127.0.0.1",
    detail: {
      target: "steel_prices",
      action: "anomaly_detection",
      category: "冷轧",
      spec: "DC01 1.0mm",
      region: "广州",
      price: 999999,
      threshold: 10000,
    },
  },
  {
    id: "log-20260515-014",
    timestamp: "2026-05-15 16:30:00",
    operator: "运营人员A",
    operatorAccount: "operator_a",
    actionType: "login",
    summary: "管理员登录",
    ip: "192.168.1.101",
    detail: {
      target: "admin_auth",
      action: "login",
      username: "operator_a",
      browser: "Chrome 132",
      os: "Windows 11",
    },
  },
  {
    id: "log-20260515-015",
    timestamp: "2026-05-15 14:00:25",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "user_management",
    summary: "启用移动端用户 131****0123",
    ip: "192.168.1.100",
    detail: {
      target: "users",
      action: "enable",
      user_id: 1008,
      phone: "131****0123",
    },
  },
  {
    id: "log-20260515-016",
    timestamp: "2026-05-15 11:20:00",
    operator: "数据管理员B",
    operatorAccount: "data_b",
    actionType: "data_operation",
    summary: "导入新版牌号对照表 HRB400E ↔ SD400 共 156 条",
    ip: "192.168.1.102",
    detail: {
      target: "knowledge_base",
      action: "import",
      type: "grade",
      count: 156,
      primary_standard: "GB/T 1499.2-2024",
      mappings: ["HRB400E ↔ SD400", "HRB500E ↔ SD500"],
    },
  },
  {
    id: "log-20260514-017",
    timestamp: "2026-05-14 17:45:00",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "system_config",
    summary: "调整 AI 模型配置：后备模型改为 qwen-turbo",
    ip: "192.168.1.100",
    detail: {
      target: "agent_configs",
      action: "update",
      key: "model_config",
      old_value: { primary_model: "gpt-4o-mini", backup_model: "gpt-3.5-turbo" },
      new_value: { primary_model: "gpt-4o-mini", backup_model: "qwen-turbo" },
    },
  },
  {
    id: "log-20260514-018",
    timestamp: "2026-05-14 15:10:30",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "login",
    summary: "管理员登录",
    ip: "192.168.1.100",
    detail: {
      target: "admin_auth",
      action: "login",
      username: "admin",
      browser: "Chrome 132",
      os: "macOS 15.4",
    },
  },
  {
    id: "log-20260514-019",
    timestamp: "2026-05-14 10:00:00",
    operator: "系统",
    operatorAccount: "system",
    actionType: "system_task",
    summary: "每日数据同步完成：价格 12,450 条、招标 48 条、资讯 156 条",
    ip: "127.0.0.1",
    detail: {
      target: "data_sync",
      action: "daily_sync",
      prices_count: 12450,
      tenders_count: 48,
      news_count: 156,
      duration_seconds: 120,
      status: "success",
    },
  },
  {
    id: "log-20260513-020",
    timestamp: "2026-05-13 16:20:15",
    operator: "运营人员A",
    operatorAccount: "operator_a",
    actionType: "quality_management",
    summary: "添加 Bad Case: Q345B与Q355B区别拒答问题",
    ip: "192.168.1.101",
    detail: {
      target: "bad_cases",
      action: "create",
      bad_case_id: "BC-2026-0049",
      error_type: "refuse_answer",
      user_question: "Q345B和Q355B有什么区别？",
    },
  },
  {
    id: "log-20260513-021",
    timestamp: "2026-05-13 14:00:00",
    operator: "数据管理员B",
    operatorAccount: "data_b",
    actionType: "data_operation",
    summary: "更新螺纹钢全国价格基准",
    ip: "192.168.1.102",
    detail: {
      target: "steel_prices",
      action: "batch_update",
      category: "螺纹钢",
      regions: ["上海", "北京", "广州", "武汉", "成都"],
      count: 5,
      source: "我的钢铁网 2026-05-13 13:30",
    },
  },
  {
    id: "log-20260513-022",
    timestamp: "2026-05-13 09:00:05",
    operator: "系统",
    operatorAccount: "system",
    actionType: "system_task",
    summary: "自动备份完成，数据库大小 2.1 GB",
    ip: "127.0.0.1",
    detail: {
      target: "database",
      action: "backup",
      size: "2.1 GB",
      type: "auto",
      file_count: 3,
      duration_seconds: 38,
    },
  },
  {
    id: "log-20260512-023",
    timestamp: "2026-05-12 17:30:00",
    operator: "系统管理员",
    operatorAccount: "admin",
    actionType: "user_management",
    summary: "重置管理员 data_b 的密码",
    ip: "192.168.1.100",
    detail: {
      target: "admin_users",
      action: "reset_password",
      username: "data_b",
    },
  },
  {
    id: "log-20260512-024",
    timestamp: "2026-05-12 11:15:40",
    operator: "运营人员A",
    operatorAccount: "operator_a",
    actionType: "system_config",
    summary: "修改开场白欢迎语",
    ip: "192.168.1.101",
    detail: {
      target: "agent_configs",
      action: "update",
      key: "welcome_message",
      old_value: "你好，我是钢铁小助手，有什么可以帮你？",
      new_value: "您好，我是钢铁行业智能助手。可以帮您查价格、算报价、看招标、搜知识。请告诉我您需要什么帮助？",
    },
  },
];

// -----------------------------------------------------------
// 获取操作日志列表（支持筛选 + 分页）
// -----------------------------------------------------------
export async function getOperationLogs(filter?: {
  page?: number;
  pageSize?: number;
  operator?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<OperationLog>> {
  await delay(400 + Math.random() * 300);
  let items = [...mockOperationLogs];

  if (filter?.operator && filter.operator !== "all") {
    items = items.filter((log) => log.operatorAccount === filter.operator);
  }

  if (filter?.actionType && filter.actionType !== "all") {
    items = items.filter((log) => log.actionType === filter.actionType);
  }

  if (filter?.startDate) {
    items = items.filter((log) => log.timestamp >= filter.startDate!);
  }

  if (filter?.endDate) {
    // endDate 是日期字符串如 "2026-05-17"，需要匹配到当天 23:59:59
    const endDateTime = filter.endDate + " 23:59:59";
    items = items.filter((log) => log.timestamp <= endDateTime);
  }

  // 默认按时间倒序
  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return paginate(items, filter?.page ?? 1, filter?.pageSize ?? 20);
}

// -----------------------------------------------------------
// 获取单条操作日志详情
// -----------------------------------------------------------
export async function getOperationLogDetail(id: string): Promise<OperationLog> {
  await delay(200 + Math.random() * 200);
  const item = mockOperationLogs.find((log) => log.id === id);
  if (!item) throw new Error("日志不存在");
  return { ...item, detail: { ...item.detail } };
}

// -----------------------------------------------------------
// 导出操作日志为 CSV
// -----------------------------------------------------------
export async function exportOperationLogs(filter?: {
  operator?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Blob> {
  await delay(500 + Math.random() * 500);
  let items = [...mockOperationLogs];

  if (filter?.operator && filter.operator !== "all") {
    items = items.filter((log) => log.operatorAccount === filter.operator);
  }
  if (filter?.actionType && filter.actionType !== "all") {
    items = items.filter((log) => log.actionType === filter.actionType);
  }
  if (filter?.startDate) {
    items = items.filter((log) => log.timestamp >= filter.startDate!);
  }
  if (filter?.endDate) {
    const endDateTime = filter.endDate + " 23:59:59";
    items = items.filter((log) => log.timestamp <= endDateTime);
  }

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const typeLabel = (t: string) => ACTION_TYPE_LABELS[t] ?? t;

  const header = "ID,时间,操作人,操作人账号,操作类型,操作内容,IP地址\n";
  const rows = items
    .map(
      (log) =>
        `${log.id},${log.timestamp},${log.operator},${log.operatorAccount},${typeLabel(log.actionType)},${log.summary},${log.ip}`,
    )
    .join("\n");

  // CSV BOM for Excel Chinese support
  const BOM = "\uFEFF";
  return createTextBlob(BOM + header + rows);
}

// ============================================================
// 系统设置
// ============================================================

// -----------------------------------------------------------
// Mock: 系统设置默认值
// -----------------------------------------------------------
const mockSystemSettings: SystemSettings = {
  siteName: "钢铁行业Agent管理后台",
  logoUrl: "",
  contactEmail: "admin@steel-agent.com",
  contactPhone: "400-888-8888",
  emailEnabled: false,
  smtpServer: "smtp.exmail.qq.com",
  smtpPort: 465,
  smtpEncryption: "SSL",
  smtpEmail: "noreply@steel-agent.com",
  smtpPassword: "",
  smsEnabled: false,
  smsProvider: "阿里云短信",
  smsAccessKey: "",
  smsSignature: "钢铁Agent",
  sessionTimeout: 30,
  loginLockCount: 5,
  ipWhitelistEnabled: false,
  ipWhitelist: [],
};

// -----------------------------------------------------------
// 获取系统设置
// -----------------------------------------------------------
export async function getSystemSettings(): Promise<SystemSettings> {
  await delay();
  return { ...mockSystemSettings, ipWhitelist: [...mockSystemSettings.ipWhitelist] };
}

// -----------------------------------------------------------
// 保存系统设置
// -----------------------------------------------------------
export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  await delay(800); // 稍长的延迟模拟保存
  Object.assign(mockSystemSettings, settings);
}

// -----------------------------------------------------------
// 上传 Logo（Mock）
// -----------------------------------------------------------
export async function uploadLogo(_file: File): Promise<string> {
  await delay(600);
  // 返回一个 mock URL
  return "/uploads/logo/steel-agent-logo.png";
}

// -----------------------------------------------------------
// 测试邮件发送
// -----------------------------------------------------------
export async function testEmail(): Promise<{ success: boolean; message: string }> {
  await delay(1200); // 测试邮件可能稍慢
  return {
    success: true,
    message: "测试邮件已发送至 admin@steel-agent.com，请检查收件箱",
  };
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