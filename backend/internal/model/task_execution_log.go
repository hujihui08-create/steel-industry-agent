package model

import "time"

// TaskExecutionLog represents a single execution record of a scheduled task.
type TaskExecutionLog struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	TaskID       uint       `gorm:"index;not null" json:"task_id"`
	StartedAt    time.Time  `json:"started_at"`
	FinishedAt   *time.Time `json:"finished_at"`
	Status       string     `gorm:"size:20;not null" json:"status"`
	ResultDetail string     `gorm:"type:text" json:"result_detail"`
	ErrorMessage string     `gorm:"type:text" json:"error_message"`
	CreatedAt    time.Time  `json:"created_at"`
}

// TableName returns the database table name for TaskExecutionLog.
func (TaskExecutionLog) TableName() string {
	return "task_execution_logs"
}
