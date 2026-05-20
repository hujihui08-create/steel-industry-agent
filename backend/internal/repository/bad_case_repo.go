package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

// BadCaseRepository provides data access for bad case records.
type BadCaseRepository struct {
	db *gorm.DB
}

// NewBadCaseRepository creates a new BadCaseRepository with the given database connection.
func NewBadCaseRepository(db *gorm.DB) *BadCaseRepository {
	return &BadCaseRepository{db: db}
}

// FindAll retrieves all bad case records ordered by created_at descending.
func (r *BadCaseRepository) FindAll(ctx context.Context) ([]model.BadCase, error) {
	var cases []model.BadCase
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&cases).Error
	return cases, err
}

// FindByID finds a bad case record by its primary key ID.
func (r *BadCaseRepository) FindByID(ctx context.Context, id uint) (*model.BadCase, error) {
	var badCase model.BadCase
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&badCase).Error
	if err != nil {
		return nil, err
	}
	return &badCase, nil
}

// Create inserts a new bad case record.
func (r *BadCaseRepository) Create(ctx context.Context, badCase *model.BadCase) error {
	return r.db.WithContext(ctx).Create(badCase).Error
}

// Update saves changes to an existing bad case record.
func (r *BadCaseRepository) Update(ctx context.Context, badCase *model.BadCase) error {
	return r.db.WithContext(ctx).Save(badCase).Error
}

// UpdateStatus updates the status of a bad case record.
// If status is "fixed", sets fixed_at to now.
// If status is "verified", sets verified_at to now.
func (r *BadCaseRepository) UpdateStatus(ctx context.Context, id uint, status string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	switch status {
	case "fixed":
		now := time.Now()
		updates["fixed_at"] = now
	case "verified":
		now := time.Now()
		updates["verified_at"] = now
	}
	return r.db.WithContext(ctx).Model(&model.BadCase{}).Where("id = ?", id).Updates(updates).Error
}
