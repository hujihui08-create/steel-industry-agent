package model

import "time"

type UserFeedback struct {
	ID        uint      `gorm:"column:id;primaryKey" json:"id"`
	UserID    uint      `gorm:"column:user_id" json:"user_id"`
	Type      string    `gorm:"column:type" json:"type"`
	Content   string    `gorm:"column:content" json:"content"`
	Contact   string    `gorm:"column:contact" json:"contact"`
	Status    string    `gorm:"column:status" json:"status"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

func (UserFeedback) TableName() string {
	return "user_feedbacks"
}
