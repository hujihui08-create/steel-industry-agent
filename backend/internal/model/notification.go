package model

import "time"

// Notification represents a user notification message.
type Notification struct {
	ID        uint      `gorm:"column:id;primaryKey" json:"id"`
	UserID    uint      `gorm:"column:user_id;index" json:"user_id"`
	Type      string    `gorm:"column:type" json:"type"`
	Title     string    `gorm:"column:title" json:"title"`
	Summary   string    `gorm:"column:summary" json:"summary"`
	Content   string    `gorm:"column:content" json:"content"`
	IsRead    bool      `gorm:"column:is_read;default:false" json:"is_read"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName returns the database table name for Notification.
func (Notification) TableName() string {
	return "notifications"
}

// UserSettings represents user preferences stored as a key-value table.
type UserSettings struct {
	ID                   uint `gorm:"column:id;primaryKey" json:"id"`
	UserID               uint `gorm:"column:user_id;uniqueIndex" json:"user_id"`
	NotificationsEnabled bool `gorm:"column:notifications_enabled;default:true" json:"notifications_enabled"`
	Theme                string `gorm:"column:theme;default:system" json:"theme"`
}

// TableName returns the database table name for UserSettings.
func (UserSettings) TableName() string {
	return "user_settings"
}
