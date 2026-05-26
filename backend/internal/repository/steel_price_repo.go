package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// SteelPriceRepository provides data access for steel price records.
type SteelPriceRepository struct {
	db *gorm.DB
}

// NewSteelPriceRepository creates a new SteelPriceRepository with the given database connection.
func NewSteelPriceRepository(db *gorm.DB) *SteelPriceRepository {
	return &SteelPriceRepository{db: db}
}

// Create inserts a new steel price record.
func (r *SteelPriceRepository) Create(ctx context.Context, price *model.SteelPrice) error {
	return r.db.WithContext(ctx).Create(price).Error
}

// FindByID finds a steel price record by its primary key ID.
func (r *SteelPriceRepository) FindByID(ctx context.Context, id uint) (*model.SteelPrice, error) {
	var price model.SteelPrice
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&price).Error
	if err != nil {
		return nil, err
	}
	return &price, nil
}

// FindAll returns a paginated list of all steel price records.
func (r *SteelPriceRepository) FindAll(ctx context.Context, limit, offset int) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&prices).Error
	return prices, err
}

// FindByCategory finds steel prices by category.
func (r *SteelPriceRepository) FindByCategory(ctx context.Context, category string) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	err := r.db.WithContext(ctx).Where("category = ?", category).Find(&prices).Error
	return prices, err
}

// FindByRegion finds steel price records by region.
func (r *SteelPriceRepository) FindByRegion(ctx context.Context, region string) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	err := r.db.WithContext(ctx).Where("region = ?", region).Find(&prices).Error
	return prices, err
}

// FindByDateRange finds steel price records within a given date range, optionally filtered by category.
func (r *SteelPriceRepository) FindByDateRange(ctx context.Context, category string, start, end time.Time) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	query := r.db.WithContext(ctx).Where("price_date >= ? AND price_date <= ?", start, end)
	if category != "" {
		query = query.Where("category = ?", category)
	}
	err := query.Order("price_date ASC").Find(&prices).Error
	return prices, err
}

// FindLatest finds the most recent steel price for the given category.
func (r *SteelPriceRepository) FindLatest(ctx context.Context, category string) (*model.SteelPrice, error) {
	var price model.SteelPrice
	err := r.db.WithContext(ctx).Where("category = ?", category).Order("price_date DESC").First(&price).Error
	if err != nil {
		return nil, err
	}
	return &price, nil
}

// FindByCategoryAndRegion finds steel price records filtered by category and/or region.
func (r *SteelPriceRepository) FindByCategoryAndRegion(ctx context.Context, category, region string) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	query := r.db.WithContext(ctx)
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if region != "" {
		query = query.Where("region = ?", region)
	}
	err := query.Order("price_date DESC").Find(&prices).Error
	return prices, err
}

// FindForDailyReport finds steel prices for a specific date for daily reporting.
func (r *SteelPriceRepository) FindForDailyReport(ctx context.Context, date time.Time) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	err := r.db.WithContext(ctx).Where("price_date = ?", date).Find(&prices).Error
	return prices, err
}

// FindForWeeklyReport finds steel prices within a date range for weekly reporting.
func (r *SteelPriceRepository) FindForWeeklyReport(ctx context.Context, start, end time.Time) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	err := r.db.WithContext(ctx).Where("price_date BETWEEN ? AND ?", start, end).Find(&prices).Error
	return prices, err
}

// Count returns the total number of steel price records.
func (r *SteelPriceRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.SteelPrice{}).Count(&count).Error
	return count, err
}

// Update saves changes to an existing steel price record.
func (r *SteelPriceRepository) Update(ctx context.Context, price *model.SteelPrice) error {
	return r.db.WithContext(ctx).Save(price).Error
}

// Delete removes a steel price record by its primary key ID.
func (r *SteelPriceRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.SteelPrice{}, id).Error
}

// BatchCreate inserts multiple steel price records in batches of 100.
func (r *SteelPriceRepository) BatchCreate(ctx context.Context, prices []*model.SteelPrice) error {
	return r.db.WithContext(ctx).CreateInBatches(prices, 100).Error
}

// FindBySpec searches steel price records by spec with pagination.
func (r *SteelPriceRepository) FindBySpec(ctx context.Context, spec string, limit, offset int) ([]model.SteelPrice, error) {
	var prices []model.SteelPrice
	err := r.db.WithContext(ctx).Where("spec = ?", spec).Limit(limit).Offset(offset).Order("price_date DESC").Find(&prices).Error
	return prices, err
}

// FindByCategoryWithPagination returns a paginated list of steel price records
// filtered by category, spec, and region, along with the total matching count.
func (r *SteelPriceRepository) FindByCategoryWithPagination(ctx context.Context, category, spec, region string, limit, offset int) ([]model.SteelPrice, int64, error) {
	var prices []model.SteelPrice
	var count int64
	query := r.db.WithContext(ctx).Model(&model.SteelPrice{})
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if spec != "" {
		query = query.Where("spec = ?", spec)
	}
	if region != "" {
		query = query.Where("region = ?", region)
	}
	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}
	err := query.Order("price_date DESC").Limit(limit).Offset(offset).Find(&prices).Error
	return prices, count, err
}
