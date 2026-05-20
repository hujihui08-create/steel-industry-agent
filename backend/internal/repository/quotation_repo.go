package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// QuotationRepository provides data access for quotation records.
type QuotationRepository struct {
	db *gorm.DB
}

// NewQuotationRepository creates a new QuotationRepository with the given database connection.
func NewQuotationRepository(db *gorm.DB) *QuotationRepository {
	return &QuotationRepository{db: db}
}

// Create inserts a new quotation record.
func (r *QuotationRepository) Create(ctx context.Context, q *model.Quotation) error {
	return r.db.WithContext(ctx).Create(q).Error
}

// FindByID finds a quotation record by its primary key ID.
func (r *QuotationRepository) FindByID(ctx context.Context, id uint) (*model.Quotation, error) {
	var q model.Quotation
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&q).Error
	if err != nil {
		return nil, err
	}
	return &q, nil
}

// FindAll returns a paginated list of all quotation records.
func (r *QuotationRepository) FindAll(ctx context.Context, limit, offset int) ([]model.Quotation, error) {
	var quotations []model.Quotation
	err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&quotations).Error
	return quotations, err
}

// FindByUserID finds all quotations belonging to the given user.
func (r *QuotationRepository) FindByUserID(ctx context.Context, userID uint) ([]model.Quotation, error) {
	var quotations []model.Quotation
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&quotations).Error
	return quotations, err
}

// Update saves changes to an existing quotation record.
func (r *QuotationRepository) Update(ctx context.Context, q *model.Quotation) error {
	return r.db.WithContext(ctx).Save(q).Error
}

// Delete deletes a quotation by its ID.
func (r *QuotationRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.Quotation{}).Error
}
