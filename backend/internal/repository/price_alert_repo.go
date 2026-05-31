package repository

import (
	"context"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// PriceAlertRepository provides data access for price alerts.
type PriceAlertRepository struct {
	db *gorm.DB
}

// NewPriceAlertRepository creates a new PriceAlertRepository with the given database connection.
func NewPriceAlertRepository(db *gorm.DB) *PriceAlertRepository {
	return &PriceAlertRepository{db: db}
}

// Create inserts a new price alert.
func (r *PriceAlertRepository) Create(ctx context.Context, a *model.PriceAlert) error {
	return r.db.WithContext(ctx).Create(a).Error
}

// Update saves changes to an existing price alert.
func (r *PriceAlertRepository) Update(ctx context.Context, a *model.PriceAlert) error {
	return r.db.WithContext(ctx).Save(a).Error
}

// FindByID finds a price alert by its primary key ID.
func (r *PriceAlertRepository) FindByID(ctx context.Context, id uint) (*model.PriceAlert, error) {
	var a model.PriceAlert
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// FindByUserID finds all price alerts for the given user.
func (r *PriceAlertRepository) FindByUserID(ctx context.Context, userID uint) ([]model.PriceAlert, error) {
	var alerts []model.PriceAlert
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&alerts).Error
	return alerts, err
}

// Delete deletes a price alert by its ID.
func (r *PriceAlertRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.PriceAlert{}).Error
}

// FindAllActive returns all currently active price alerts.
func (r *PriceAlertRepository) FindAllActive(ctx context.Context) ([]model.PriceAlert, error) {
	var alerts []model.PriceAlert
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Find(&alerts).Error
	return alerts, err
}

// Deactivate sets is_active = false for a price alert.
func (r *PriceAlertRepository) Deactivate(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&model.PriceAlert{}).Where("id = ?", id).Update("is_active", false).Error
}
