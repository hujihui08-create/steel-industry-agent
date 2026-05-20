// ============================================================
// 资讯新闻相关 TypeScript 类型定义
// 对应后端 /api/v1/news/* 接口
// ============================================================

/** 资讯详情 */
export interface NewsDetail {
  id: string;
  title: string;
  content: string;
  source: string;
  source_url: string;
  category: string;
  published_at: string;
}
