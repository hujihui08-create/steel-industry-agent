package model

import "time"

// ScheduledTask represents a scheduled background task configuration.
type ScheduledTask struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	Name        string     `gorm:"size:50;not null;uniqueIndex" json:"name"`
	Description string     `gorm:"size:200" json:"description"`
	CronExpr    string     `gorm:"size:100" json:"cron_expr"`
	Status      string     `gorm:"size:20;not null;default:'running'" json:"status"`
	LastRunAt   *time.Time `json:"last_run_at"`
	NextRunAt   *time.Time `json:"next_run_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// TableName returns the database table name for ScheduledTask.
func (ScheduledTask) TableName() string {
	return "scheduled_tasks"
}
