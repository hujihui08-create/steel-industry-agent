// ============================================================
// 价格预警相关 TypeScript 类型定义
// 对应后端 /api/v1/alerts/* 接口
// ============================================================

/** 价格预警 */
export interface PriceAlert {
  id: number;
  category: string;
  spec: string;
  region: string;
  target_price: number;
  condition: 'above' | 'below';
  is_active: boolean;
  created_at: string;
}
