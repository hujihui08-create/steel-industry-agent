package model

import "time"

type AdminNotification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	AdminID   *uint     `gorm:"index" json:"admin_id"`
	Type      string    `gorm:"size:50;not null" json:"type"`
	Title     string    `gorm:"size:200;not null" json:"title"`
	Content   string    `gorm:"type:text" json:"content"`
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

func (AdminNotification) TableName() string {
	return "admin_notifications"
}
