package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

type AdminNotificationRepository struct {
	db *gorm.DB
}

func NewAdminNotificationRepository(db *gorm.DB) *AdminNotificationRepository {
	return &AdminNotificationRepository{db: db}
}

func (r *AdminNotificationRepository) ListByAdminID(ctx context.Context, adminID uint, offset, limit int) ([]model.AdminNotification, error) {
	if limit <= 0 {
		limit = 20
	}
	var notifs []model.AdminNotification
	err := r.db.WithContext(ctx).Where("admin_id = ? OR admin_id IS NULL", adminID).
		Order("created_at DESC").Offset(offset).Limit(limit).Find(&notifs).Error
	return notifs, err
}

func (r *AdminNotificationRepository) Create(ctx context.Context, notif *model.AdminNotification) error {
	return r.db.WithContext(ctx).Create(notif).Error
}

func (r *AdminNotificationRepository) MarkAsRead(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&model.AdminNotification{}).Where("id = ?", id).
		Update("is_read", true).Error
}

func (r *AdminNotificationRepository) MarkAllAsRead(ctx context.Context, adminID uint) error {
	return r.db.WithContext(ctx).Model(&model.AdminNotification{}).
		Where("admin_id = ? OR admin_id IS NULL", adminID).
		Update("is_read", true).Error
}

func (r *AdminNotificationRepository) CountUnread(ctx context.Context, adminID uint) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.AdminNotification{}).
		Where("(admin_id = ? OR admin_id IS NULL) AND is_read = ?", adminID, false).Count(&count).Error
	return count, err
}
