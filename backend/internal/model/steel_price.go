package model

import "time"

// SteelPrice represents a steel price data record.
type SteelPrice struct {
	ID        uint      `gorm:"column:id;primaryKey" json:"id"`
	Category  string    `gorm:"column:category" json:"category"`
	Spec      string    `gorm:"column:spec" json:"spec"`
	Price     float64   `gorm:"column:price" json:"price"`
	Change    float64   `gorm:"column:change" json:"change"`
	ChangePct float64   `gorm:"column:change_pct" json:"change_pct"`
	Region    string    `gorm:"column:region" json:"region"`
	Source    string    `gorm:"column:source" json:"source"`
	PriceDate time.Time `gorm:"column:price_date" json:"price_date"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName returns the database table name for SteelPrice.
func (SteelPrice) TableName() string {
	return "steel_prices"
}
