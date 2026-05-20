package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// NotificationService handles notification business logic.
type NotificationService struct {
	repo *repository.NotificationRepository
}

// NewNotificationService creates a new NotificationService.
func NewNotificationService(repo *repository.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

// GetList returns notifications for the given user.
func (s *NotificationService) GetList(ctx context.Context, userID uint, limit, offset int) ([]model.Notification, error) {
	return s.repo.FindByUserID(userID, limit, offset)
}

// MarkAsRead marks a notification as read.
func (s *NotificationService) MarkAsRead(ctx context.Context, id uint) error {
	return s.repo.MarkAsRead(id)
}

// SettingsService handles user settings business logic.
type SettingsService struct {
	repo *repository.SettingsRepository
}

// NewSettingsService creates a new SettingsService.
func NewSettingsService(repo *repository.SettingsRepository) *SettingsService {
	return &SettingsService{repo: repo}
}

// GetSettings returns settings for the given user.
func (s *SettingsService) GetSettings(ctx context.Context, userID uint) (*model.UserSettings, error) {
	return s.repo.FindByUserID(userID)
}

// UpdateSettings updates user settings.
func (s *SettingsService) UpdateSettings(ctx context.Context, settings *model.UserSettings) error {
	return s.repo.Save(settings)
}
