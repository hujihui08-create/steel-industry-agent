// ============================================================
// 用户相关 TypeScript 类型定义
// 对应后端 /api/v1/users/* 接口
// ============================================================

/** 用户资料 */
export interface UserProfile {
  id: string;
  phone: string;
  nickname: string;
  company: string;
  region: string;
  role: 'buyer' | 'seller' | 'analyst';
  avatar_url?: string;
  is_verified?: boolean;
}

/** 更新用户资料请求 */
export interface ProfileUpdateData {
  nickname?: string;
  company?: string;
  region?: string;
}
