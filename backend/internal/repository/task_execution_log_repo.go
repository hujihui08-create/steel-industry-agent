package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// TaskExecutionLogRepository provides data access for task execution log entries.
type TaskExecutionLogRepository struct {
	db *gorm.DB
}

// NewTaskExecutionLogRepository creates a new TaskExecutionLogRepository with the given database connection.
func NewTaskExecutionLogRepository(db *gorm.DB) *TaskExecutionLogRepository {
	return &TaskExecutionLogRepository{db: db}
}

// Create inserts a new task execution log entry.
func (r *TaskExecutionLogRepository) Create(ctx context.Context, log *model.TaskExecutionLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// UpdateStatus updates the status, finished_at, result_detail, and error_message of a log entry.
func (r *TaskExecutionLogRepository) UpdateStatus(ctx context.Context, id uint, status, resultDetail, errorMessage string) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status":        status,
		"finished_at":   now,
		"result_detail": resultDetail,
		"error_message": errorMessage,
	}
	return r.db.WithContext(ctx).Model(&model.TaskExecutionLog{}).Where("id = ?", id).Updates(updates).Error
}

// FindByTaskID retrieves execution logs for a specific task, ordered by started_at DESC.
func (r *TaskExecutionLogRepository) FindByTaskID(ctx context.Context, taskID uint, limit int) ([]model.TaskExecutionLog, error) {
	if limit <= 0 {
		limit = 50
	}
	var logs []model.TaskExecutionLog
	err := r.db.WithContext(ctx).Where("task_id = ?", taskID).
		Order("started_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}
