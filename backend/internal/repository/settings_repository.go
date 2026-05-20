package repository

import (
	"steel-agent-backend/internal/model"

	"gorm.io/gorm"
)

// SettingsRepository handles user settings database operations.
type SettingsRepository struct {
	db *gorm.DB
}

// NewSettingsRepository creates a new SettingsRepository.
func NewSettingsRepository(db *gorm.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

// FindByUserID returns settings for a user, creating defaults if none exist.
func (r *SettingsRepository) FindByUserID(userID uint) (*model.UserSettings, error) {
	var settings model.UserSettings
	err := r.db.Where("user_id = ?", userID).First(&settings).Error
	if err == gorm.ErrRecordNotFound {
		settings = model.UserSettings{
			UserID:               userID,
			NotificationsEnabled: true,
			Theme:                "system",
		}
		if createErr := r.db.Create(&settings).Error; createErr != nil {
			return nil, createErr
		}
		return &settings, nil
	}
	return &settings, err
}

// Save updates user settings.
func (r *SettingsRepository) Save(settings *model.UserSettings) error {
	return r.db.Save(settings).Error
}
