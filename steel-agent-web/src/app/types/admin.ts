// ============================================================
// 管理后台 TypeScript 类型定义
// 对应后端 /api/v1/admin/* 接口
// ============================================================

// ============================================================
// 管理员用户
// ============================================================

/** 后台管理员账户 */
export interface AdminUser {
  id: number;
  username: string;
  nickname: string;
  role: AdminRole;
  status: AdminUserStatus;
  lastLoginAt: string;
  createdAt: string;
}

export type AdminRole = 'super_admin' | 'operator' | 'data_admin' | 'viewer';
export type AdminUserStatus = 'active' | 'disabled';

// ============================================================
// 移动端用户
// ============================================================

/** 移动端普通用户 */
export interface MobileUser {
  id: number;
  phone: string;
  nickname: string;
  company: string;
  role: string;
  region: string;
  status: MobileUserStatus;
  registeredAt: string;
  lastLoginAt: string;
  deviceInfo?: string;
  stats?: MobileUserStats;
}

export type MobileUserStatus = 'active' | 'disabled';

/** 移动端用户使用统计 */
export interface MobileUserStats {
  totalConversations: number;
  totalQuotations: number;
  savedTenders: number;
  priceAlerts: number;
  aiCalls: number;
  positiveRate: number;
}

// ============================================================
// 仪表盘
// ============================================================

/** 仪表盘核心指标 */
export interface DashboardStats {
  totalUsers: number;
  totalUsersChange: number;
  totalUsersChangePct: number;
  todayActive: number;
  todayActiveChange: number;
  todayActiveChangePct: number;
  totalConversations: number;
  totalConversationsChange: number;
  totalConversationsChangePct: number;
  aiCalls: number;
  aiCallsChange: number;
  aiCallsChangePct: number;
}

/** 趋势数据点 */
export interface TrendDataPoint {
  date: string;
  users: number;
  conversations: number;
}

/** Bad Case 统计 */
export interface BadCaseStats {
  pending: number;
  fixing: number;
  fixed: number;
  verified: number;
}

/** 工具健康状态 */
export interface ToolHealth {
  name: string;
  displayName: string;
  status: ToolHealthStatus;
}

export type ToolHealthStatus = 'normal' | 'degraded' | 'down';

// ============================================================
// Agent 配置
// ============================================================

/** Agent 全局配置 */
export interface AgentConfig {
  primaryModel: string;
  backupModel: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  timeout: number;
  contextTurns: number;
  systemPrompt: string;
  welcomeMessage: string;
  quickCommands: QuickCommand[];
  hallucinationRules: HallucinationRule[];
  disclaimer: string;
  forceToolForData: boolean;
  useTemplateForChat: boolean;
  models: ModelConfig[];
}

/** 快捷指令 */
export interface QuickCommand {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  order: number;
}

/** 幻觉防控规则 */
export interface HallucinationRule {
  id: string;
  category: string;
  minPrice: number;
  maxPrice: number;
}

/** Prompt 版本记录 */
export interface PromptVersion {
  version: string;
  editor: string;
  editedAt: string;
  isCurrent: boolean;
  content: string;
}

/** AI 模型配置条目 */
export interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}

// ============================================================
// 意图管理
// ============================================================

/** 意图定义 */
export interface Intent {
  id: string;
  code: string;
  name: string;
  keywords: string;
  entities: string[];
  template: string;
  priority: number;
  status: IntentStatus;
  toolName?: string;
}

export type IntentStatus = 'enabled' | 'disabled';

/** 意图调用统计 */
export interface IntentStats {
  name: string;
  code: string;
  todayCalls: number;
  hitRate: number;
  avgResponseTime: number;
}

/** 意图测试结果 */
export interface IntentTestResult {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  matchType: string;
  tool: string;
  params: Record<string, unknown>;
}

/** 意图测试历史 */
export interface IntentTestHistory {
  text: string;
  result: string;
  confidence: number;
  matchType: string;
  timestamp: string;
}

// ============================================================
// Bad Case
// ============================================================

/** 不良案例 */
export interface BadCase {
  id: number;
  case_no: string;
  user_query: string;
  ai_response: string;
  correct_response: string;
  error_type: string;
  status: BadCaseStatus;
  fix_solution: string;
  conversation_id: number | null;
  reported_by: number | null;
  created_at: string;
  fixed_at: string | null;
  verified_at: string | null;
}

export type BadCaseStatus = 'pending' | 'fixing' | 'fixed' | 'verified';

/** Bad Case 统计（后端 /admin/bad-cases/statistics 返回的原始格式） */
export interface BadCaseStatisticsResponse {
  status_counts: {
    pending: number;
    fixing: number;
    fixed: number;
    verified: number;
  };
  daily_trend: BadCaseDailyTrend[];
  fix_rate: number;
  avg_fix_days: number;
}

export interface BadCaseDailyTrend {
  date: string;
  count: number;
}

/** Bad Case 筛选参数 */
export interface BadCaseFilter {
  page?: number;
  page_size?: number;
  error_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  keyword?: string;
}

/** Bad Case 导入结果 */
export interface BadCaseImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

/** Bad Case 验证结果 */
export interface BadCaseVerifyResult {
  original_reply: string;
  current_reply: string;
  verified_at: string;
  similarity: number;
  verdict: 'fixed' | 'likely_fixed' | 'still_broken';
  verdict_reason: string;
}

// ============================================================
// 操作日志
// ============================================================

/** 操作日志 */
export interface OperationLog {
  id: string;
  timestamp: string;
  operator: string;
  operatorAccount: string;
  actionType: string;
  summary: string;
  ip: string;
  detail: Record<string, unknown>;
}

// ============================================================
// 系统设置
// ============================================================

/** 系统设置 */
export interface SystemSettings {
  siteName: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  emailEnabled: boolean;
  smtpServer: string;
  smtpPort: number;
  smtpEncryption: SmtpEncryption;
  smtpEmail: string;
  smtpPassword: string;
  smsEnabled: boolean;
  smsProvider: string;
  smsAccessKey: string;
  smsSignature: string;
  sessionTimeout: number;
  loginLockCount: number;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
}

export type SmtpEncryption = 'SSL' | 'TLS' | 'none';

// ============================================================
// 数据备份
// ============================================================

/** 备份记录 */
export interface BackupRecord {
  id: string;
  timestamp: string;
  fileSize: string;
  type: BackupType;
  status: BackupStatus;
}

export type BackupType = 'auto' | 'manual';
export type BackupStatus = 'success' | 'failed';

/** 备份概览 */
export interface BackupOverview {
  dbSize: string;
  fileCount: number;
  lastBackup: string;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  retentionDays: number;
}

// ============================================================
// 爬虫管理
// ============================================================

/** 爬虫数据源 */
export interface CrawlerSource {
  id: number;
  source_name: string;
  source_type: string;
  source_url: string;
  crawl_rule: string;
  crawl_interval: number;
  is_active: boolean;
  last_crawl_at: string | null;
  last_success_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 爬虫采集日志 */
export interface CrawlerLog {
  id: number;
  source_id: number;
  status: string;
  items_crawled: number;
  error_message: string;
  started_at: string | null;
  finished_at: string | null;
}

/** 采集状态 */
export interface CrawlStatus {
  source_id: number;
  source_name: string;
  source_type: string;
  source_url: string;
  is_active: boolean;
  is_running: boolean;
  last_crawl_at: string | null;
  last_success_at: string | null;
  next_crawl_at: string | null;
}

/** 数据源表单数据 */
export interface CrawlerSourceFormData {
  source_name: string;
  source_type: string;
  source_url: string;
  crawl_rule: string;
  crawl_interval: number;
  is_active: boolean;
}

// ============================================================
// 品种管理
// ============================================================

export interface Category {
  id: number;
  name: string;
  type: 'spot' | 'futures';
  status: 'enabled' | 'disabled';
  sort_order: number;
  parent_id?: number | null;
  children?: Category[];
  contract_code?: string;
  exchange?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicCategories {
  spot: Category[];
  futures: Category[];
}

// ============================================================
// 通用分页 / 筛选
// ============================================================

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 通用筛选参数 */
export interface BaseFilterParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// 移动端角色管理
// ============================================================

export interface MobileRole {
  id: number
  name: string
  description: string
  permissions: Record<string, boolean>
  status: number
  user_count: number
  created_at: string
  updated_at: string
}

export interface RetentionStatItem {
  value: number
  change: number
}

export interface RetentionStats {
  day1: RetentionStatItem
  day7: RetentionStatItem
  day30: RetentionStatItem
}

// ============================================================
// 登录日志
// ============================================================

export interface LoginLogEntry {
  id: number;
  user_type: 'admin' | 'mobile';
  admin_id: number | null;
  user_id: number | null;
  login_type: 'success' | 'failure';
  fail_reason: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface LoginLogStats {
  today_total: number;
  today_success: number;
  today_failure: number;
}

// ============================================================
// API 调用统计
// ============================================================

export interface ApiCallOverview {
  today_total: number;
  avg_duration_ms: number;
  error_rate: number;
  today_tokens: number;
}

export interface ApiEndpointStat {
  api_path: string;
  call_count: number;
  avg_duration_ms: number;
  error_count: number;
  error_rate: number;
}

export interface ApiModelStat {
  model: string;
  call_count: number;
  total_tokens: number;
}

export interface ApiUserStat {
  user_id: number;
  call_count: number;
  total_tokens: number;
}

export interface ApiTrendPoint {
  date: string;
  call_count: number;
  avg_duration_ms: number;
}

// ============================================================
// 定时任务管理
// ============================================================

export interface ScheduledTask {
  id: number;
  name: string;
  description: string;
  cron_expr: string;
  status: 'running' | 'paused';
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskExecutionLog {
  id: number;
  task_id: number;
  started_at: string;
  finished_at: string | null;
  status: 'success' | 'failed';
  result_detail: string;
  error_message: string;
}

// ============================================================
// 菜单管理
// ============================================================

export interface MenuNode {
  id: number;
  parent_id: number | null;
  name: string;
  icon: string;
  path: string;
  sort_order: number;
  visible_roles: string;
  status: number;
  children?: MenuNode[];
  created_at: string;
  updated_at: string;
}
