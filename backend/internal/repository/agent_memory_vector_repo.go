package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// AgentMemoryVectorRepository provides data access for semantic memory embeddings.
type AgentMemoryVectorRepository struct {
	db *gorm.DB
}

// NewAgentMemoryVectorRepository creates a new AgentMemoryVectorRepository.
func NewAgentMemoryVectorRepository(db *gorm.DB) *AgentMemoryVectorRepository {
	return &AgentMemoryVectorRepository{db: db}
}

// Create inserts a new agent memory embedding record.
func (r *AgentMemoryVectorRepository) Create(ctx context.Context, memory *model.AgentMemoryEmbedding) error {
	return r.db.WithContext(ctx).Create(memory).Error
}

// VectorSearch executes a pgvector cosine similarity search, returning
// memory embeddings that match the given query vector above the threshold.
// The embedding parameter should be a pgvector-compatible string (e.g. "[0.1,0.2,...]").
func (r *AgentMemoryVectorRepository) VectorSearch(
	ctx context.Context,
	userID uint,
	embedding string,
	threshold float64,
	topK int,
) ([]model.AgentMemoryEmbedding, error) {
	var rows []model.AgentMemoryEmbedding
	err := r.db.WithContext(ctx).Raw(
		`SELECT id, user_id, content, created_at,
		        1 - (embedding <=> $1::vector) AS similarity
		 FROM agent_memory_embeddings
		 WHERE user_id = $2
		   AND embedding IS NOT NULL
		   AND 1 - (embedding <=> $3::vector) >= $4
		 ORDER BY similarity DESC
		 LIMIT $5`,
		embedding, userID, embedding, threshold, topK,
	).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// DeleteExpired deletes memory embedding records older than maxAge.
// Returns the number of deleted records.
func (r *AgentMemoryVectorRepository) DeleteExpired(ctx context.Context, maxAge time.Duration) (int64, error) {
	cutoff := time.Now().Add(-maxAge)
	result := r.db.WithContext(ctx).
		Where("created_at < ?", cutoff).
		Delete(&model.AgentMemoryEmbedding{})
	return result.RowsAffected, result.Error
}
