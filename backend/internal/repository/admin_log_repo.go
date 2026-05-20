package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// AdminLogRepository provides data access for admin audit logs.
type AdminLogRepository struct {
	db *gorm.DB
}

// NewAdminLogRepository creates a new AdminLogRepository with the given database connection.
func NewAdminLogRepository(db *gorm.DB) *AdminLogRepository {
	return &AdminLogRepository{db: db}
}

// Create inserts a new admin log entry.
func (r *AdminLogRepository) Create(ctx context.Context, log *model.AdminLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// FindByAdminID retrieves audit logs for a specific admin, ordered by created_at descending.
func (r *AdminLogRepository) FindByAdminID(ctx context.Context, adminID uint, limit int) ([]model.AdminLog, error) {
	if limit <= 0 {
		limit = 50
	}
	var logs []model.AdminLog
	err := r.db.WithContext(ctx).Where("admin_id = ?", adminID).
		Order("created_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}

// FindRecent retrieves the most recent admin audit logs across all admins.
func (r *AdminLogRepository) FindRecent(ctx context.Context, limit int) ([]model.AdminLog, error) {
	if limit <= 0 {
		limit = 50
	}
	var logs []model.AdminLog
	err := r.db.WithContext(ctx).Order("created_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}
