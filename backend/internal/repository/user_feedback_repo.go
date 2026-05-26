package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

type UserFeedbackRepository struct {
	db *gorm.DB
}

func NewUserFeedbackRepository(db *gorm.DB) *UserFeedbackRepository {
	return &UserFeedbackRepository{db: db}
}

func (r *UserFeedbackRepository) Create(ctx context.Context, f *model.UserFeedback) error {
	return r.db.WithContext(ctx).Create(f).Error
}

func (r *UserFeedbackRepository) FindByID(ctx context.Context, id uint) (*model.UserFeedback, error) {
	var f model.UserFeedback
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&f).Error
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *UserFeedbackRepository) FindAll(ctx context.Context, feedbackType string, limit, offset int) ([]model.UserFeedback, int64, error) {
	var feedbacks []model.UserFeedback
	var total int64

	query := r.db.WithContext(ctx).Model(&model.UserFeedback{})
	if feedbackType != "" {
		query = query.Where("type = ?", feedbackType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&feedbacks).Error
	return feedbacks, total, err
}
