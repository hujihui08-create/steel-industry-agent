package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

type UserCertificationRepository struct {
	db *gorm.DB
}

func NewUserCertificationRepository(db *gorm.DB) *UserCertificationRepository {
	return &UserCertificationRepository{db: db}
}

func (r *UserCertificationRepository) Create(ctx context.Context, c *model.UserCertification) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *UserCertificationRepository) FindLatestByUserID(ctx context.Context, userID uint) (*model.UserCertification, error) {
	var cert model.UserCertification
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").First(&cert).Error
	if err != nil {
		return nil, err
	}
	return &cert, nil
}

func (r *UserCertificationRepository) FindByID(ctx context.Context, id uint) (*model.UserCertification, error) {
	var cert model.UserCertification
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&cert).Error
	if err != nil {
		return nil, err
	}
	return &cert, nil
}

func (r *UserCertificationRepository) FindAll(ctx context.Context, status string, limit, offset int) ([]model.UserCertification, int64, error) {
	var certs []model.UserCertification
	var total int64

	query := r.db.WithContext(ctx).Model(&model.UserCertification{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&certs).Error
	return certs, total, err
}

func (r *UserCertificationRepository) UpdateStatus(ctx context.Context, id uint, status string, remark string, reviewedBy uint) error {
	updates := map[string]interface{}{
		"status":      status,
		"remark":      remark,
		"reviewed_by": reviewedBy,
	}
	return r.db.WithContext(ctx).Model(&model.UserCertification{}).Where("id = ?", id).Updates(updates).Error
}
