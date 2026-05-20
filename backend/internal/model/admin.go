package model

import "time"

// Admin represents an admin user of the platform.
type Admin struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	Username      string     `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
	PasswordHash  string     `gorm:"type:varchar(255);not null" json:"-"`
	Nickname      string     `gorm:"type:varchar(50)" json:"nickname"`
	Role          string     `gorm:"type:varchar(20);default:operator" json:"role"`
	Status        int        `gorm:"type:smallint;default:1" json:"status"`
	LoginAttempts int        `gorm:"type:int;default:0" json:"login_attempts"`
	LockedUntil   *time.Time `json:"locked_until"`
	LastLoginAt   *time.Time `json:"last_login_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// TableName returns the database table name for Admin.
func (Admin) TableName() string {
	return "admins"
}
