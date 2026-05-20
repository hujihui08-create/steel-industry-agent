// ============================================================
// 价格走势相关 TypeScript 类型定义
// 对应后端 /api/v1/prices/trend 接口
// ============================================================

/** 走势图数据点 */
export interface TrendDataPoint {
  price_date: string;
  price: number;
  category: string;
  spec: string;
  region: string;
  change: number;
  change_pct: number;
}

/** 走势查询参数 */
export interface TrendQueryParams {
  category: string;
  spec?: string;
  region?: string;
  days?: number;
}
