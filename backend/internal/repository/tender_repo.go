package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// TenderRepository provides data access for tender records.
type TenderRepository struct {
	db *gorm.DB
}

// NewTenderRepository creates a new TenderRepository with the given database connection.
func NewTenderRepository(db *gorm.DB) *TenderRepository {
	return &TenderRepository{db: db}
}

// Create inserts a new tender record.
func (r *TenderRepository) Create(ctx context.Context, t *model.Tender) error {
	return r.db.WithContext(ctx).Create(t).Error
}

// FindByID finds a tender by its primary key ID.
func (r *TenderRepository) FindByID(ctx context.Context, id uint) (*model.Tender, error) {
	var t model.Tender
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// FindAll returns a paginated list of all tender records.
func (r *TenderRepository) FindAll(ctx context.Context, limit, offset int) ([]model.Tender, error) {
	var tenders []model.Tender
	err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&tenders).Error
	return tenders, err
}

// FindByDeadlineRange finds tenders within a given deadline date range.
func (r *TenderRepository) FindByDeadlineRange(ctx context.Context, start, end time.Time) ([]model.Tender, error) {
	var tenders []model.Tender
	err := r.db.WithContext(ctx).Where("deadline BETWEEN ? AND ?", start, end).Find(&tenders).Error
	return tenders, err
}

// FindByRegion finds tenders by region.
func (r *TenderRepository) FindByRegion(ctx context.Context, region string) ([]model.Tender, error) {
	var tenders []model.Tender
	err := r.db.WithContext(ctx).Where("region = ?", region).Find(&tenders).Error
	return tenders, err
}

// FindByCategory finds tenders by category.
func (r *TenderRepository) FindByCategory(ctx context.Context, category string) ([]model.Tender, error) {
	var tenders []model.Tender
	err := r.db.WithContext(ctx).Where("category = ?", category).Find(&tenders).Error
	return tenders, err
}

// FindByStatus finds tenders filtered by status.
func (r *TenderRepository) FindByStatus(ctx context.Context, status string) ([]model.Tender, error) {
	var tenders []model.Tender
	err := r.db.WithContext(ctx).Where("status = ?", status).Find(&tenders).Error
	return tenders, err
}

// FindByIDs finds tenders by a list of primary key IDs using a single batch query.
func (r *TenderRepository) FindByIDs(ctx context.Context, ids []uint) ([]model.Tender, error) {
	if len(ids) == 0 {
		return []model.Tender{}, nil
	}
	var tenders []model.Tender
	err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&tenders).Error
	return tenders, err
}
