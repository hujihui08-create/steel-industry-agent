// ============================================================
// 招标信息相关 TypeScript 类型定义
// 对应后端 /api/v1/tenders/* 接口
// ============================================================

/** 招标详情 */
export interface TenderDetail {
  id: string;
  title: string;
  status: 'open' | 'closed' | 'won' | 'lost';
  budget: number;
  description: string;
  deadline: string;
  bid_deadline: string;
  source_url: string;
  region: string;
  category: string;
}
