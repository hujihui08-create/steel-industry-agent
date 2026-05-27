package repository

import (
	"context"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

type EntityConfigRepository struct {
	db *gorm.DB
}

func NewEntityConfigRepository(db *gorm.DB) *EntityConfigRepository {
	return &EntityConfigRepository{db: db}
}

func (r *EntityConfigRepository) FindByType(ctx context.Context, entityType string) ([]model.EntityConfig, error) {
	var configs []model.EntityConfig
	err := r.db.WithContext(ctx).Where("entity_type = ?", entityType).Order("id ASC").Find(&configs).Error
	return configs, err
}

func (r *EntityConfigRepository) Create(ctx context.Context, config *model.EntityConfig) error {
	return r.db.WithContext(ctx).Create(config).Error
}

func (r *EntityConfigRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.EntityConfig{}, id).Error
}
