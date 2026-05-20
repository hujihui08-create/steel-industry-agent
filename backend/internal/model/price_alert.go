package model

import "time"

// PriceAlert represents a user's price alert configuration.
type PriceAlert struct {
	ID          uint      `gorm:"column:id;primaryKey" json:"id"`
	UserID      uint      `gorm:"column:user_id" json:"user_id"`
	Category    string    `gorm:"column:category" json:"category"`
	Spec        string    `gorm:"column:spec" json:"spec"`
	Region      string    `gorm:"column:region" json:"region"`
	TargetPrice float64   `gorm:"column:target_price" json:"target_price"`
	Condition   string    `gorm:"column:condition" json:"condition"`
	IsActive    bool      `gorm:"column:is_active" json:"is_active"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName returns the database table name for PriceAlert.
func (PriceAlert) TableName() string {
	return "price_alerts"
}
