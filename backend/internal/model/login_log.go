package model

import "time"

// LoginLog represents a login attempt record, tracking both admin and mobile user logins.
type LoginLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserType   string    `gorm:"size:20;not null;index" json:"user_type"` // "admin" or "mobile"
	AdminID    *uint     `json:"admin_id"`
	UserID     *uint     `json:"user_id"`
	LoginType  string    `gorm:"size:20;not null" json:"login_type"` // "success" or "failure"
	FailReason string    `gorm:"size:255" json:"fail_reason"`
	IPAddress  string    `gorm:"size:50" json:"ip_address"`
	UserAgent  string    `gorm:"size:500" json:"user_agent"`
	CreatedAt  time.Time `json:"created_at"`
}

// TableName returns the database table name for LoginLog.
func (LoginLog) TableName() string {
	return "login_logs"
}
