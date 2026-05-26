package repository

import (
	"context"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// LoginLogRepository provides data access for login log records.
type LoginLogRepository struct {
	db *gorm.DB
}

// NewLoginLogRepository creates a new LoginLogRepository with the given database connection.
func NewLoginLogRepository(db *gorm.DB) *LoginLogRepository {
	return &LoginLogRepository{db: db}
}

// Create inserts a new login log entry.
func (r *LoginLogRepository) Create(ctx context.Context, log *model.LoginLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// FindRecent retrieves paginated login logs filtered by user type, ordered by created_at descending.
func (r *LoginLogRepository) FindRecent(ctx context.Context, userType string, page, pageSize int) ([]model.LoginLog, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	query := r.db.WithContext(ctx).Model(&model.LoginLog{})
	if userType != "" {
		query = query.Where("user_type = ?", userType)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var logs []model.LoginLog
	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// Stats returns today's login counts grouped by login_type.
func (r *LoginLogRepository) Stats(ctx context.Context) (todayTotal, todaySuccess, todayFailure int64, err error) {
	type row struct {
		LoginType string `gorm:"column:login_type"`
		Count     int64  `gorm:"column:cnt"`
	}
	var rows []row

	if err := r.db.WithContext(ctx).Model(&model.LoginLog{}).
		Select("login_type, COUNT(*) AS cnt").
		Where("DATE(created_at) = CURRENT_DATE").
		Group("login_type").Find(&rows).Error; err != nil {
		return 0, 0, 0, err
	}

	for _, r := range rows {
		todayTotal += r.Count
		if r.LoginType == "success" {
			todaySuccess = r.Count
		} else if r.LoginType == "failure" {
			todayFailure = r.Count
		}
	}

	return todayTotal, todaySuccess, todayFailure, nil
}
