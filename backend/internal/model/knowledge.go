package model

import "time"

const (
	KnowledgeStatusPending   = "pending"
	KnowledgeStatusVectorized = "vectorized"
	KnowledgeStatusFailed    = "failed"
)

// Knowledge represents a knowledge base entry such as a standard or terminology term.
type Knowledge struct {
	ID         uint      `gorm:"column:id;primaryKey" json:"id"`
	Type       string    `gorm:"column:type" json:"type"`
	Title      string    `gorm:"column:title" json:"title"`
	Content    string    `gorm:"column:content" json:"content"`
	Keywords   string    `gorm:"column:keywords" json:"keywords"`
	StandardNo string    `gorm:"column:standard_no" json:"standard_no"`
	Category   string    `gorm:"column:category" json:"category"`
	Embedding  string    `gorm:"column:embedding" json:"embedding"`
	Status     string    `gorm:"column:status;default:pending" json:"status"`
	VectorID   string    `gorm:"column:vector_id" json:"vector_id"`
	ChunkCount int       `gorm:"column:chunk_count;default:0" json:"chunk_count"`
	Similarity float64   `gorm:"-" json:"similarity"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName returns the database table name for Knowledge.
func (Knowledge) TableName() string {
	return "knowledge_base"
}

// KnowledgeStats holds aggregated statistics for the knowledge base.
type KnowledgeStats struct {
	Total          int64  `json:"total"`
	Vectorized     int64  `json:"vectorized"`
	Pending        int64  `json:"pending"`
	Failed         int64  `json:"failed"`
	VectorDimension int   `json:"vector_dimension"`
}

// KnowledgeChunk represents a vector chunk of a knowledge document.
type KnowledgeChunk struct {
	ChunkIndex int    `json:"chunk_index"`
	ChunkContent string `json:"chunk_content"`
	VectorID   string `json:"vector_id"`
}

// RAGSearchRequest is the request for vector search testing.
type RAGSearchRequest struct {
	Query     string `json:"query" binding:"required"`
	TopK      int    `json:"top_k"`
	Threshold float64 `json:"threshold"`
	TypeFilter string `json:"type_filter"`
}

// RAGSearchResult is a single result from vector search.
type RAGSearchResult struct {
	Rank       int     `json:"rank"`
	Score      float64 `json:"score"`
	DocumentID uint    `json:"document_id"`
	DocumentTitle string `json:"document_title"`
	ChunkIndex int     `json:"chunk_index"`
	ChunkContent string `json:"chunk_content"`
}

// RAGSearchHistory is a record of a past vector search test.
type RAGSearchHistory struct {
	ID         uint    `gorm:"primaryKey" json:"id"`
	Query      string  `gorm:"column:query" json:"query"`
	TopK       int     `gorm:"column:top_k" json:"top_k"`
	Threshold  float64 `gorm:"column:threshold" json:"threshold"`
	ResultCount int    `gorm:"column:result_count" json:"result_count"`
	DurationMs int64   `gorm:"column:duration_ms" json:"duration_ms"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName returns the database table name for RAGSearchHistory.
func (RAGSearchHistory) TableName() string {
	return "rag_search_history"
}

// RAGConfig holds the retrieval configuration.
type RAGConfig struct {
	ID                  uint      `gorm:"column:id;primaryKey" json:"id"`
	EmbeddingModel      string    `gorm:"column:embedding_model" json:"embedding_model"`
	EmbeddingAPIKey     string    `gorm:"column:embedding_api_key" json:"embedding_api_key"`
	EmbeddingBaseURL    string    `gorm:"column:embedding_base_url" json:"embedding_base_url"`
	ChunkMethod         string    `gorm:"column:chunk_method" json:"chunk_method"`
	ChunkSize           int       `gorm:"column:chunk_size" json:"chunk_size"`
	ChunkOverlap        int       `gorm:"column:chunk_overlap" json:"chunk_overlap"`
	DefaultTopK         int       `gorm:"column:default_top_k" json:"default_top_k"`
	DefaultThreshold    float64   `gorm:"column:default_threshold" json:"default_threshold"`
	SearchMode          string    `gorm:"column:search_mode" json:"search_mode"`
	HybridWeight        float64   `gorm:"column:hybrid_weight" json:"hybrid_weight"`
	QueryRewriteEnabled bool      `gorm:"column:query_rewrite_enabled" json:"query_rewrite_enabled"`
	RerankEnabled       bool      `gorm:"column:rerank_enabled" json:"rerank_enabled"`
	CacheEnabled        bool      `gorm:"column:cache_enabled" json:"cache_enabled"`
	MaxRecall           int       `gorm:"column:max_recall" json:"max_recall"`
	CreatedAt           time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt           time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName returns the database table name for RAGConfig.
func (RAGConfig) TableName() string {
	return "rag_config"
}
