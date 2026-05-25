// ============================================================
// AI 对话相关 TypeScript 类型定义
// 对应后端 /api/v1/chat/* 接口
// ============================================================

/** 对话会话 */
export interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  model: string;
  message_count: number;
  context: ChatContext | null;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

/** 对话上下文 */
export interface ChatContext {
  intent: string;
  entities: Record<string, string>;
  last_query: string;
  turn_count: number;
}

/** 招标列表卡片 - 单项目 */
export interface TenderCardItem {
  id: number | string;
  title: string;
  budget: number;
  region: string;
  deadline: string;
  status: string;
}

/** 招标列表卡片数据 */
export interface TenderListCardData {
  title?: string;
  subtitle?: string;
  items: TenderCardItem[];
  total_count?: number;
  is_reminder?: boolean;
  source?: string;
  sourceTime?: string;
}

/** 招标详情卡片数据 */
export interface TenderDetailCardData {
  id: number | string;
  title: string;
  bidding_company?: string;
  budget: number;
  region: string;
  category: string;
  deadline: string;
  bid_deadline: string;
  description?: string;
  items?: Array<{
    name: string;
    spec?: string;
    quantity?: string;
  }>;
  source_url?: string;
  is_favorited?: boolean;
}

/** 富媒体卡片附件 */
export interface CardAttachment {
  type: 'price' | 'trend' | 'news' | 'compare' | 'quotation' | 'table' | 'quick_select' | 'alert' | 'tender_list' | 'tender_detail';
  data: Record<string, unknown>;
}

/** 快速选择选项数据 */
export interface QuickSelectData {
  options: string[];
  label?: string;
  single?: boolean;
}

/** 价格预警卡片数据 */
export interface AlertCardData {
  id?: string;
  category: string;
  spec: string;
  region: string;
  target_price: number;
  condition: 'above' | 'below';
  notify_method?: string;
  is_active?: boolean;
  is_triggered?: boolean;
  current_price?: number;
  triggered_at?: string;
}

/** 对话消息 */
export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  created_at: string;
  is_edited?: boolean;
  parent_message_id?: number;
  branch_id?: string;
  attachments?: CardAttachment[];
}

/** AI 对话请求 */
export interface ChatCompletionsRequest {
  session_id: number;
  content: string;
}

/** SSE 流式数据块 */
export interface StreamChunk {
  content?: string;
  error?: string;
}

/** AI 回复反馈 */
export interface AIFeedback {
  message_id: number;
  is_helpful: boolean;
  comment?: string;
  error_type?: string;
}

/** 快捷指令 */
export interface QuickCommand {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

/** 停止生成请求 */
export interface ChatStopRequest {
  session_id: number;
}

/** 继续生成请求 */
export interface ChatContinueRequest {
  session_id: number;
  partial_content: string;
}

/** 默认快捷指令列表 */
export const DEFAULT_QUICK_COMMANDS: QuickCommand[] = [
  { id: 'price', label: '查价格', icon: 'DollarSign', prompt: '查价格' },
  { id: 'quote', label: '算报价', icon: 'Calculator', prompt: '算报价' },
  { id: 'tender', label: '看招标', icon: 'FileText', prompt: '看招标' },
  { id: 'trend', label: '查走势', icon: 'TrendingUp', prompt: '查走势' },
  { id: 'alert', label: '设预警', icon: 'Bell', prompt: '设预警' },
];
