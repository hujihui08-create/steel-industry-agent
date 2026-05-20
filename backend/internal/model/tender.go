package model

import "time"

// Tender represents a procurement tender record.
type Tender struct {
	ID          uint      `gorm:"column:id;primaryKey" json:"id"`
	Title       string    `gorm:"column:title" json:"title"`
	Region      string    `gorm:"column:region" json:"region"`
	Category    string    `gorm:"column:category" json:"category"`
	Budget      float64   `gorm:"column:budget" json:"budget"`
	Deadline    time.Time `gorm:"column:deadline" json:"deadline"`
	BidDeadline time.Time `gorm:"column:bid_deadline" json:"bid_deadline"`
	Status      string    `gorm:"column:status" json:"status"`
	SourceURL   string    `gorm:"column:source_url" json:"source_url"`
	Description string    `gorm:"column:description" json:"description"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName returns the database table name for Tender.
func (Tender) TableName() string {
	return "tenders"
}
