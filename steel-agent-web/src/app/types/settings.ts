// ============================================================
// 用户设置相关 TypeScript 类型定义
// 对应后端 /api/v1/settings/* 接口
// ============================================================

/** 用户偏好设置 */
export interface UserSettings {
  notifications_enabled: boolean;
  alerts_enabled: boolean;
  theme: 'light' | 'dark' | 'system';
}

/** 更新设置请求（部分字段可选） */
export interface SettingsUpdateData {
  notifications_enabled?: boolean;
  alerts_enabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
}
