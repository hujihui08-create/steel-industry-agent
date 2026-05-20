package model

import "time"

// AdminLog represents an audit log entry recording admin user actions.
type AdminLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	AdminID    uint      `gorm:"index;not null" json:"admin_id"`
	Action     string    `gorm:"size:50;not null" json:"action"`
	TargetType string    `gorm:"size:50" json:"target_type"`
	TargetID   uint      `json:"target_id"`
	Detail     string    `gorm:"type:jsonb" json:"detail"`
	IPAddress  string    `gorm:"size:50" json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
}

// TableName returns the database table name for AdminLog.
func (AdminLog) TableName() string {
	return "admin_logs"
}
