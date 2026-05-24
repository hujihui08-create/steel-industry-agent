package model

import "time"

// User represents a registered user of the steel agent platform.
type User struct {
	ID           uint      `gorm:"column:id;primaryKey" json:"id"`
	Phone        string    `gorm:"column:phone;uniqueIndex" json:"phone"`
	PasswordHash string    `gorm:"column:password_hash" json:"-"`
	Nickname     string    `gorm:"column:nickname" json:"nickname"`
	Company      string    `gorm:"column:company" json:"company"`
	Role         string    `gorm:"column:role" json:"role"`
	Region       string    `gorm:"column:region" json:"region"`
	Status       int       `gorm:"column:status;default:1" json:"status"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
}

// TableName returns the database table name for User.
func (User) TableName() string {
	return "users"
}
