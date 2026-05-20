package model

import "time"

// UserFavorite represents a user's favorited tender.
type UserFavorite struct {
	UserID    uint      `gorm:"column:user_id;primaryKey"`
	TenderID  uint      `gorm:"column:tender_id;primaryKey"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

// TableName returns the database table name for UserFavorite.
func (UserFavorite) TableName() string {
	return "user_favorites"
}
