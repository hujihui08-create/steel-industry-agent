package model

import "time"

// CrawlerLog represents a single crawl execution log entry.
type CrawlerLog struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	SourceID     uint       `gorm:"index" json:"source_id"`
	Status       string     `gorm:"size:20;not null" json:"status"`
	ItemsCrawled int        `gorm:"default:0" json:"items_crawled"`
	ErrorMessage string     `gorm:"type:text" json:"error_message"`
	StartedAt    *time.Time `json:"started_at"`
	FinishedAt   *time.Time `json:"finished_at"`
}

// TableName returns the database table name for CrawlerLog.
func (CrawlerLog) TableName() string {
	return "crawler_logs"
}
