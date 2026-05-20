export interface KnowledgeItem {
  id: number;
  type: 'standard' | 'grade' | 'term' | 'tool';
  title: string;
  content: string;
  keywords: string;
  standard_no: string;
  category: string;
  status: string;
  vector_id: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface GradeCompareResult {
  grades: GradeCompareItem[];
}

export interface GradeCompareItem {
  grade: string;
  yield_strength?: string;
  tensile_strength?: string;
  elongation?: string;
  application?: string;
  standard?: string;
}

export interface WeightCalculateRequest {
  category: string;
  spec: string;
  quantity: number;
}

export interface WeightCalculateResult {
  weight: number;
  unit: string;
  formula?: string;
}

export interface UnitConvertRequest {
  value: number;
  from: string;
  to: string;
}

export interface UnitConvertResult {
  result: number;
  from_unit: string;
  to_unit: string;
}

export interface KnowledgeStats {
  total: number;
  vectorized: number;
  pending: number;
  failed: number;
  vector_dimension: number;
}

export interface RAGSearchRequest {
  query: string;
  top_k?: number;
  threshold?: number;
  type_filter?: string;
}

export interface RAGSearchResult {
  rank: number;
  score: number;
  document_id: number;
  document_title: string;
  chunk_index: number;
  chunk_content: string;
}

export interface RAGSearchHistory {
  id: number;
  query: string;
  top_k: number;
  threshold: number;
  result_count: number;
  duration_ms: number;
  created_at: string;
}

export interface RAGConfig {
  embedding_model: string;
  embedding_api_key: string;
  embedding_base_url: string;
  chunk_method: string;
  chunk_size: number;
  chunk_overlap: number;
  default_top_k: number;
  default_threshold: number;
  search_mode: string;
  hybrid_weight: number;
  query_rewrite_enabled: boolean;
  rerank_enabled: boolean;
  cache_enabled: boolean;
  max_recall: number;
}

export interface KnowledgeChunk {
  chunk_index: number;
  chunk_content: string;
  vector_id: string;
}

export interface KnowledgeDetail {
  document: KnowledgeItem;
  chunks: KnowledgeChunk[];
}
