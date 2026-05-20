package model

import "time"

// CrawlerSource represents a configured data source for the crawler.
type CrawlerSource struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	SourceName    string     `gorm:"size:100;not null" json:"source_name"`
	SourceType    string     `gorm:"size:20;not null" json:"source_type"`
	SourceURL     string     `gorm:"size:500;not null" json:"source_url"`
	CrawlRule     string     `gorm:"type:jsonb" json:"crawl_rule"`
	CrawlInterval int        `gorm:"default:1800" json:"crawl_interval"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`
	LastCrawlAt   *time.Time `json:"last_crawl_at"`
	LastSuccessAt *time.Time `json:"last_success_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// TableName returns the database table name for CrawlerSource.
func (CrawlerSource) TableName() string {
	return "crawler_sources"
}
