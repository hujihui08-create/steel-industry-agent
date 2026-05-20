package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)
// NewsRepository provides data access for news articles.
type NewsRepository struct {
	db *gorm.DB
}

// NewNewsRepository creates a new NewsRepository with the given database connection.
func NewNewsRepository(db *gorm.DB) *NewsRepository {
	return &NewsRepository{db: db}
}

// Create inserts a new news article.
func (r *NewsRepository) Create(ctx context.Context, news *model.News) error {
	return r.db.WithContext(ctx).Create(news).Error
}

// FindAll retrieves all news articles with pagination.
func (r *NewsRepository) FindAll(ctx context.Context, limit, offset int) ([]model.News, error) {
	var news []model.News
	err := r.db.WithContext(ctx).Order("published_at DESC").Limit(limit).Offset(offset).Find(&news).Error
	return news, err
}

// FindByID finds a news article by its primary key ID.
func (r *NewsRepository) FindByID(ctx context.Context, id uint) (*model.News, error) {
	var news model.News
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&news).Error
	if err != nil {
		return nil, err
	}
	return &news, nil
}

// FindByCategory finds news articles by category.
func (r *NewsRepository) FindByCategory(ctx context.Context, category string) ([]model.News, error) {
	var news []model.News
	err := r.db.WithContext(ctx).Where("category = ?", category).Order("published_at DESC").Find(&news).Error
	return news, err
}

// Search searches news articles by keyword (ILIKE on title and summary) and
// optionally filters by category. Results are ordered by published_at DESC.
func (r *NewsRepository) Search(ctx context.Context, keyword, category string, limit int) ([]model.News, error) {
	const defaultLimit = 5
	const maxLimit = 20

	if limit <= 0 {
		limit = defaultLimit
	} else if limit > maxLimit {
		limit = maxLimit
	}

	query := r.db.WithContext(ctx).Model(&model.News{})

	if keyword != "" {
		keywordClause := "%" + keyword + "%"
		query = query.Where(
			"title ILIKE ? OR summary ILIKE ?",
			keywordClause, keywordClause,
		)
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	var news []model.News
	err := query.Order("published_at DESC").Limit(limit).Find(&news).Error
	return news, err
}
