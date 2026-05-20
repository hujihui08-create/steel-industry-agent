package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// AlertService handles price alert business logic.
type AlertService struct {
	alertRepo *repository.PriceAlertRepository
}

// NewAlertService creates a new AlertService with the given price alert repository.
func NewAlertService(alertRepo *repository.PriceAlertRepository) *AlertService {
	return &AlertService{alertRepo: alertRepo}
}

// CreateAlert creates a new price alert for a user.
func (s *AlertService) CreateAlert(ctx context.Context, alert *model.PriceAlert) error {
	return s.alertRepo.Create(ctx, alert)
}

// GetAlertList returns all price alerts for the given user.
func (s *AlertService) GetAlertList(ctx context.Context, userID uint) ([]model.PriceAlert, error) {
	return s.alertRepo.FindByUserID(ctx, userID)
}

// UpdateAlert updates an existing price alert.
func (s *AlertService) UpdateAlert(ctx context.Context, alert *model.PriceAlert) error {
	return s.alertRepo.Update(ctx, alert)
}

// DeleteAlert deletes a price alert by its ID.
func (s *AlertService) DeleteAlert(ctx context.Context, id uint) error {
	return s.alertRepo.Delete(ctx, id)
}
