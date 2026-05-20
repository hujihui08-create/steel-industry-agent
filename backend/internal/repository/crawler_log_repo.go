package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// CrawlerLogRepository provides data access for crawler execution logs.
type CrawlerLogRepository struct {
	db *gorm.DB
}

// NewCrawlerLogRepository creates a new CrawlerLogRepository with the given database connection.
func NewCrawlerLogRepository(db *gorm.DB) *CrawlerLogRepository {
	return &CrawlerLogRepository{db: db}
}

// Create inserts a new crawler log entry.
func (r *CrawlerLogRepository) Create(ctx context.Context, log *model.CrawlerLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// FindBySourceID retrieves crawler logs for a specific source, ordered by started_at DESC.
func (r *CrawlerLogRepository) FindBySourceID(ctx context.Context, sourceID uint, limit int) ([]model.CrawlerLog, error) {
	if limit <= 0 {
		limit = 50
	}
	var logs []model.CrawlerLog
	err := r.db.WithContext(ctx).Where("source_id = ?", sourceID).
		Order("started_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}

// FindRecent retrieves the most recent crawler logs across all sources.
func (r *CrawlerLogRepository) FindRecent(ctx context.Context, limit int) ([]model.CrawlerLog, error) {
	if limit <= 0 {
		limit = 50
	}
	var logs []model.CrawlerLog
	err := r.db.WithContext(ctx).Order("started_at DESC").Limit(limit).Find(&logs).Error
	return logs, err
}

// UpdateStatus updates the status, items crawled count, and error message of a log entry.
// If status is "success" or "failed", finished_at is also set to the current time.
func (r *CrawlerLogRepository) UpdateStatus(ctx context.Context, id uint, status string, itemsCrawled int, errorMessage string) error {
	updates := map[string]interface{}{
		"status":        status,
		"items_crawled": itemsCrawled,
		"error_message": errorMessage,
	}
	if status == "success" || status == "failed" {
		now := time.Now()
		updates["finished_at"] = now
	}
	return r.db.WithContext(ctx).Model(&model.CrawlerLog{}).Where("id = ?", id).Updates(updates).Error
}
