// ============================================================
// 报价单相关 TypeScript 类型定义
// 对应后端 /api/v1/quotations/* 接口
// ============================================================

/** 报价单 */
export interface Quotation {
  id: number;
  title: string;
  user_id?: number;
  customer_name: string;
  category: string;
  spec: string;
  quantity: number;
  unit: string;
  material_cost: number;
  process_cost: number;
  freight_cost: number;
  tax_cost: number;
  total_price: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  delivery_location: string;
  created_at: string;
  updated_at?: string;
}
