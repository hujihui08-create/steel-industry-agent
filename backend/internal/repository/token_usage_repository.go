package repository

import (
	"context"
	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

type TokenUsageRepository struct {
	db *gorm.DB
}

func NewTokenUsageRepository(db *gorm.DB) *TokenUsageRepository {
	return &TokenUsageRepository{db: db}
}

func (r *TokenUsageRepository) Create(ctx context.Context, usage *model.TokenUsage) error {
	return r.db.WithContext(ctx).Create(usage).Error
}

func (r *TokenUsageRepository) GetDailyUsage(ctx context.Context, userID uint) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).Model(&model.TokenUsage{}).
		Where("user_id = ? AND created_at >= CURRENT_DATE", userID).
		Select("COALESCE(SUM(total_tokens), 0)").
		Scan(&total).Error
	return total, err
}
