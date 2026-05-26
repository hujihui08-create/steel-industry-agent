package repository

import (
	"context"
	"errors"

	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// AdminSettingsRepository provides data access for the admin_settings table.
type AdminSettingsRepository struct {
	db *gorm.DB
}

// NewAdminSettingsRepository creates a new AdminSettingsRepository with the given database connection.
func NewAdminSettingsRepository(db *gorm.DB) *AdminSettingsRepository {
	return &AdminSettingsRepository{db: db}
}

// Get returns the single admin settings row. Returns nil when no row exists yet.
func (r *AdminSettingsRepository) Get(ctx context.Context) (*model.AdminSettings, error) {
	var settings model.AdminSettings
	err := r.db.WithContext(ctx).First(&settings).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &settings, nil
}

// Save persists the admin settings. Creates a new row when ID is zero, updates otherwise.
func (r *AdminSettingsRepository) Save(ctx context.Context, settings *model.AdminSettings) error {
	if settings.ID == 0 {
		return r.db.WithContext(ctx).Create(settings).Error
	}
	return r.db.WithContext(ctx).Save(settings).Error
}
