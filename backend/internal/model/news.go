package model

import "time"

// News represents a steel industry news article.
type News struct {
	ID          uint      `gorm:"column:id;primaryKey" json:"id"`
	Title       string    `gorm:"column:title" json:"title"`
	Summary     string    `gorm:"column:summary" json:"summary"`
	Content     string    `gorm:"column:content" json:"content"`
	Source      string    `gorm:"column:source" json:"source"`
	SourceURL   string    `gorm:"column:source_url" json:"source_url"`
	Category    string    `gorm:"column:category" json:"category"`
	PublishedAt time.Time `gorm:"column:published_at" json:"published_at"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName returns the database table name for News.
func (News) TableName() string {
	return "news"
}
