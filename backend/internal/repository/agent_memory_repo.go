package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// AgentMemoryRepository provides data access for agent memory entries.
type AgentMemoryRepository struct {
	db *gorm.DB
}

// NewAgentMemoryRepository creates a new AgentMemoryRepository with the given database connection.
func NewAgentMemoryRepository(db *gorm.DB) *AgentMemoryRepository {
	return &AgentMemoryRepository{db: db}
}

// Create inserts a new agent memory record.
func (r *AgentMemoryRepository) Create(ctx context.Context, memory *model.AgentMemory) error {
	return r.db.WithContext(ctx).Create(memory).Error
}

// FindByUserAndKey finds all memory entries for a user by key, ordered by accessed_at descending.
func (r *AgentMemoryRepository) FindByUserAndKey(ctx context.Context, userID uint, key string) ([]model.AgentMemory, error) {
	var memories []model.AgentMemory
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND key = ?", userID, key).
		Order("accessed_at DESC").
		Find(&memories).Error
	if err != nil {
		return nil, err
	}
	return memories, nil
}

// Update saves changes to an existing agent memory record.
func (r *AgentMemoryRepository) Update(ctx context.Context, memory *model.AgentMemory) error {
	return r.db.WithContext(ctx).Save(memory).Error
}

// DeleteExpired deletes memory entries where accessed_at is older than the given duration.
// Returns the number of deleted records.
func (r *AgentMemoryRepository) DeleteExpired(ctx context.Context, olderThan time.Duration) (int64, error) {
	cutoff := time.Now().Add(-olderThan)
	result := r.db.WithContext(ctx).
		Where("accessed_at < ?", cutoff).
		Delete(&model.AgentMemory{})
	return result.RowsAffected, result.Error
}

// UpsertByUserAndKey updates accessed_at and value if a record with the given user_id and key
// combination already exists, otherwise creates a new record.
func (r *AgentMemoryRepository) UpsertByUserAndKey(ctx context.Context, userID uint, key string, value string) error {
	var existing model.AgentMemory
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND key = ?", userID, key).
		First(&existing).Error

	if err == nil {
		// Record exists: update accessed_at and value
		existing.Value = value
		existing.AccessedAt = time.Now()
		return r.db.WithContext(ctx).Save(&existing).Error
	}

	if err == gorm.ErrRecordNotFound {
		// No existing record: create a new one
		memory := &model.AgentMemory{
			UserID:     userID,
			Key:        key,
			Value:      value,
			AccessedAt: time.Now(),
		}
		return r.db.WithContext(ctx).Create(memory).Error
	}

	return err
}
