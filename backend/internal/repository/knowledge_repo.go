package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

type KnowledgeRepository struct {
	db *gorm.DB
}

func NewKnowledgeRepository(db *gorm.DB) *KnowledgeRepository {
	return &KnowledgeRepository{db: db}
}

func (r *KnowledgeRepository) Create(ctx context.Context, k *model.Knowledge) error {
	if k.Status == "" {
		k.Status = model.KnowledgeStatusPending
	}
	return r.db.WithContext(ctx).Create(k).Error
}

func (r *KnowledgeRepository) Update(ctx context.Context, k *model.Knowledge) error {
	return r.db.WithContext(ctx).Save(k).Error
}

func (r *KnowledgeRepository) FindByID(ctx context.Context, id uint) (*model.Knowledge, error) {
	var k model.Knowledge
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&k).Error
	if err != nil {
		return nil, err
	}
	return &k, nil
}

func (r *KnowledgeRepository) FindAll(ctx context.Context, limit, offset int) ([]model.Knowledge, error) {
	var knowledge []model.Knowledge
	err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&knowledge).Error
	return knowledge, err
}

func (r *KnowledgeRepository) FindByType(ctx context.Context, knowledgeType string) ([]model.Knowledge, error) {
	var knowledge []model.Knowledge
	err := r.db.WithContext(ctx).Where("type = ?", knowledgeType).Find(&knowledge).Error
	return knowledge, err
}

// Search uses LIKE-based keyword matching against keywords and title columns.
// For semantic vector search, use VectorSearch instead.
func (r *KnowledgeRepository) Search(ctx context.Context, keyword string) ([]model.Knowledge, error) {
	var knowledge []model.Knowledge
	err := r.db.WithContext(ctx).Where("keywords LIKE ? OR title LIKE ?", "%"+keyword+"%", "%"+keyword+"%").Find(&knowledge).Error
	return knowledge, err
}

// VectorSearch executes a pgvector cosine similarity search using the given
// embedding vector string. Returns knowledge entries ordered by similarity descending.
func (r *KnowledgeRepository) VectorSearch(ctx context.Context, queryVector string, threshold float64, topK int) ([]model.Knowledge, error) {
	var rows []model.Knowledge
	err := r.db.WithContext(ctx).Raw(
		`SELECT id, type, title, content, keywords, standard_no, category, status,
		        created_at, updated_at,
		        1 - (embedding <=> $1::vector) AS similarity
		 FROM knowledge_base
		 WHERE embedding IS NOT NULL
		   AND status = 'vectorized'
		   AND 1 - (embedding <=> $1::vector) >= $2
		 ORDER BY similarity DESC
		 LIMIT $3`,
		queryVector, threshold, topK,
	).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// ListWithFilter returns paginated knowledge entries with optional filters.
func (r *KnowledgeRepository) ListWithFilter(ctx context.Context, knowledgeType, status, category, keyword string, limit, offset int) ([]model.Knowledge, int64, error) {
	query := r.db.WithContext(ctx).Model(&model.Knowledge{})

	if knowledgeType != "" {
		query = query.Where("type = ?", knowledgeType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if keyword != "" {
		query = query.Where("keywords LIKE ? OR title LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var knowledge []model.Knowledge
	err := query.Order("id DESC").Limit(limit).Offset(offset).Find(&knowledge).Error
	return knowledge, total, err
}

// Delete removes a knowledge entry by ID.
func (r *KnowledgeRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.Knowledge{}, id).Error
}

// UpdateStatus updates the status of a knowledge entry.
func (r *KnowledgeRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	return r.db.WithContext(ctx).Model(&model.Knowledge{}).Where("id = ?", id).Update("status", status).Error
}

// UpdateVectorInfo updates vector_id and chunk_count for a knowledge entry.
func (r *KnowledgeRepository) UpdateVectorInfo(ctx context.Context, id uint, vectorID string, chunkCount int) error {
	return r.db.WithContext(ctx).Model(&model.Knowledge{}).Where("id = ?", id).
		Updates(map[string]interface{}{"vector_id": vectorID, "chunk_count": chunkCount}).Error
}

// GetStats returns aggregated knowledge base statistics.
func (r *KnowledgeRepository) GetStats(ctx context.Context) (*model.KnowledgeStats, error) {
	var stats model.KnowledgeStats

	err := r.db.WithContext(ctx).Model(&model.Knowledge{}).Count(&stats.Total).Error
	if err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).Model(&model.Knowledge{}).Where("status = ?", model.KnowledgeStatusVectorized).Count(&stats.Vectorized).Error
	if err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).Model(&model.Knowledge{}).Where("status = ?", model.KnowledgeStatusPending).Count(&stats.Pending).Error
	if err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).Model(&model.Knowledge{}).Where("status = ?", model.KnowledgeStatusFailed).Count(&stats.Failed).Error
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// SaveSearchHistory records a vector search test to history.
func (r *KnowledgeRepository) SaveSearchHistory(ctx context.Context, h *model.RAGSearchHistory) error {
	return r.db.WithContext(ctx).Create(h).Error
}

// GetSearchHistory returns paginated search history records.
func (r *KnowledgeRepository) GetSearchHistory(ctx context.Context, limit, offset int) ([]model.RAGSearchHistory, int64, error) {
	var total int64
	if err := r.db.WithContext(ctx).Model(&model.RAGSearchHistory{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var history []model.RAGSearchHistory
	err := r.db.WithContext(ctx).Order("id DESC").Limit(limit).Offset(offset).Find(&history).Error
	return history, total, err
}

// GetRAGConfig retrieves the current RAG configuration from the database.
// Returns nil if the table is empty or doesn't exist.
func (r *KnowledgeRepository) GetRAGConfig(ctx context.Context) (*model.RAGConfig, error) {
	var cfg model.RAGConfig
	err := r.db.WithContext(ctx).First(&cfg).Error
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

// SaveRAGConfig persists the RAG configuration to the database.
func (r *KnowledgeRepository) SaveRAGConfig(ctx context.Context, cfg *model.RAGConfig) error {
	var existing model.RAGConfig
	err := r.db.WithContext(ctx).First(&existing).Error
	if err != nil {
		// No existing row, create one
		return r.db.WithContext(ctx).Create(cfg).Error
	}
	// Update existing row
	return r.db.WithContext(ctx).Model(&existing).Updates(cfg).Error
}
