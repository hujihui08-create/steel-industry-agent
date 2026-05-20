package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// AgentConfigRepository provides data access for agent configuration entries.
type AgentConfigRepository struct {
	db *gorm.DB
}

// NewAgentConfigRepository creates a new AgentConfigRepository with the given database connection.
func NewAgentConfigRepository(db *gorm.DB) *AgentConfigRepository {
	return &AgentConfigRepository{db: db}
}

// FindAll retrieves all agent configuration entries ordered by ID ascending.
func (r *AgentConfigRepository) FindAll(ctx context.Context) ([]model.AgentConfig, error) {
	var configs []model.AgentConfig
	err := r.db.WithContext(ctx).Order("id ASC").Find(&configs).Error
	return configs, err
}

// FindByKey finds an agent configuration entry by its unique key.
func (r *AgentConfigRepository) FindByKey(ctx context.Context, key string) (*model.AgentConfig, error) {
	var config model.AgentConfig
	err := r.db.WithContext(ctx).Where("config_key = ?", key).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// Create inserts a new agent configuration entry.
func (r *AgentConfigRepository) Create(ctx context.Context, config *model.AgentConfig) error {
	return r.db.WithContext(ctx).Create(config).Error
}

// Update saves changes to an existing agent configuration entry.
func (r *AgentConfigRepository) Update(ctx context.Context, config *model.AgentConfig) error {
	return r.db.WithContext(ctx).Save(config).Error
}

// Delete removes an agent configuration entry by its ID.
func (r *AgentConfigRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.AgentConfig{}).Error
}
