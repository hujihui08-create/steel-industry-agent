package repository

import (
	"context"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// NotificationRepository handles notification database operations.
type NotificationRepository struct {
	db *gorm.DB
}

// NewNotificationRepository creates a new NotificationRepository.
func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

// FindByUserID returns notifications for a user ordered by creation time descending.
func (r *NotificationRepository) FindByUserID(userID uint, limit, offset int) ([]model.Notification, error) {
	var notifications []model.Notification
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error
	return notifications, err
}

// MarkAsRead marks a notification as read by ID.
func (r *NotificationRepository) MarkAsRead(id uint) error {
	return r.db.Model(&model.Notification{}).Where("id = ?", id).Update("is_read", true).Error
}

// Create inserts a new notification record.
func (r *NotificationRepository) Create(ctx context.Context, n *model.Notification) error {
	return r.db.WithContext(ctx).Create(n).Error
}
