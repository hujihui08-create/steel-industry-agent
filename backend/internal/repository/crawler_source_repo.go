package repository

import (
	"steel-agent-backend/internal/model"
	"time"

	"gorm.io/gorm"
)

// CrawlerSourceRepository provides data access for crawler source configurations.
type CrawlerSourceRepository struct {
	db *gorm.DB
}

// NewCrawlerSourceRepository creates a new CrawlerSourceRepository with the given database connection.
func NewCrawlerSourceRepository(db *gorm.DB) *CrawlerSourceRepository {
	return &CrawlerSourceRepository{db: db}
}

// FindAll retrieves all crawler sources ordered by ID ascending.
func (r *CrawlerSourceRepository) FindAll() ([]model.CrawlerSource, error) {
	var sources []model.CrawlerSource
	err := r.db.Order("id ASC").Find(&sources).Error
	return sources, err
}

// FindByID finds a crawler source by its primary key ID.
func (r *CrawlerSourceRepository) FindByID(id uint) (*model.CrawlerSource, error) {
	var source model.CrawlerSource
	err := r.db.First(&source, id).Error
	if err != nil {
		return nil, err
	}
	return &source, nil
}

// FindActive retrieves all active crawler sources.
func (r *CrawlerSourceRepository) FindActive() ([]model.CrawlerSource, error) {
	var sources []model.CrawlerSource
	err := r.db.Where("is_active = ?", true).Find(&sources).Error
	return sources, err
}

// Create inserts a new crawler source.
func (r *CrawlerSourceRepository) Create(source *model.CrawlerSource) error {
	return r.db.Create(source).Error
}

// Update saves changes to an existing crawler source.
// Uses explicit field list so that zero values (e.g. is_active = false) are written correctly.
func (r *CrawlerSourceRepository) Update(source *model.CrawlerSource) error {
	return r.db.Model(source).Select("source_name", "source_type", "source_url", "crawl_rule", "crawl_interval", "is_active").Updates(source).Error
}

// UpdateLastCrawl updates the last crawl timestamp for the given source.
func (r *CrawlerSourceRepository) UpdateLastCrawl(id uint) error {
	now := time.Now()
	return r.db.Model(&model.CrawlerSource{}).Where("id = ?", id).Update("last_crawl_at", now).Error
}

// UpdateLastSuccess updates the last successful crawl timestamp for the given source.
func (r *CrawlerSourceRepository) UpdateLastSuccess(id uint) error {
	now := time.Now()
	return r.db.Model(&model.CrawlerSource{}).Where("id = ?", id).Update("last_success_at", now).Error
}

// Delete removes a crawler source by its primary key ID.
func (r *CrawlerSourceRepository) Delete(id uint) error {
	return r.db.Delete(&model.CrawlerSource{}, id).Error
}
