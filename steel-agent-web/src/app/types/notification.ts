// ============================================================
// 通知消息相关 TypeScript 类型定义
// 对应后端 /api/v1/notifications/* 接口
// ============================================================

/** 通知消息 */
export interface Notification {
  id: string;
  type: 'alert' | 'system' | 'news' | 'price';
  title: string;
  summary: string;
  content: string;
  is_read: boolean;
  created_at: string;
}
