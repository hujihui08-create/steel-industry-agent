package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"steel-agent-backend/internal/model"
)

// ScheduledTaskRepository provides data access for scheduled task configurations.
type ScheduledTaskRepository struct {
	db *gorm.DB
}

// NewScheduledTaskRepository creates a new ScheduledTaskRepository with the given database connection.
func NewScheduledTaskRepository(db *gorm.DB) *ScheduledTaskRepository {
	return &ScheduledTaskRepository{db: db}
}

// Upsert inserts or updates a scheduled task based on its name (unique index).
func (r *ScheduledTaskRepository) Upsert(ctx context.Context, task *model.ScheduledTask) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "name"}},
		DoUpdates: clause.AssignmentColumns([]string{"description", "cron_expr", "status", "updated_at"}),
	}).Create(task).Error
}

// FindAll retrieves all scheduled tasks ordered by ID ascending.
func (r *ScheduledTaskRepository) FindAll(ctx context.Context) ([]model.ScheduledTask, error) {
	var tasks []model.ScheduledTask
	err := r.db.WithContext(ctx).Order("id ASC").Find(&tasks).Error
	return tasks, err
}

// FindByName retrieves a scheduled task by its unique name.
func (r *ScheduledTaskRepository) FindByName(ctx context.Context, name string) (*model.ScheduledTask, error) {
	var task model.ScheduledTask
	err := r.db.WithContext(ctx).Where("name = ?", name).First(&task).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}

// UpdateStatus updates the status, last_run_at, and next_run_at fields of a scheduled task.
func (r *ScheduledTaskRepository) UpdateStatus(ctx context.Context, id uint, status string, lastRunAt, nextRunAt *time.Time) error {
	updates := map[string]interface{}{
		"status":      status,
		"last_run_at": lastRunAt,
		"next_run_at": nextRunAt,
	}
	return r.db.WithContext(ctx).Model(&model.ScheduledTask{}).Where("id = ?", id).Updates(updates).Error
}
