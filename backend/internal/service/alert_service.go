package service

import (
	"context"
	"fmt"
	"log"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// AlertService handles price alert business logic.
type AlertService struct {
	alertRepo    *repository.PriceAlertRepository
	priceRepo    *repository.SteelPriceRepository
	notifRepo    *repository.NotificationRepository
}

// NewAlertService creates a new AlertService with the given repositories.
func NewAlertService(
	alertRepo *repository.PriceAlertRepository,
	priceRepo *repository.SteelPriceRepository,
	notifRepo *repository.NotificationRepository,
) *AlertService {
	return &AlertService{
		alertRepo: alertRepo,
		priceRepo: priceRepo,
		notifRepo: notifRepo,
	}
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

// CheckAndTriggerAlerts fetches all active alerts, compares each against the
// latest price of its category, and creates a notification when the condition
// is met. Triggered alerts are deactivated to prevent duplicate notifications.
func (s *AlertService) CheckAndTriggerAlerts(ctx context.Context) {
	alerts, err := s.alertRepo.FindAllActive(ctx)
	if err != nil {
		log.Printf("[AlertCheck] 获取活跃预警失败: %v", err)
		return
	}

	if len(alerts) == 0 {
		return
	}

	log.Printf("[AlertCheck] 检查 %d 个活跃预警...", len(alerts))
	triggeredCount := 0

	for _, alert := range alerts {
		price, err := s.priceRepo.FindLatest(ctx, alert.Category)
		if err != nil {
			continue
		}

		isTriggered := false
		currentPrice := price.Price

		switch alert.Condition {
		case "above":
			isTriggered = currentPrice >= alert.TargetPrice
		case "below":
			isTriggered = currentPrice <= alert.TargetPrice
		}

		if !isTriggered {
			continue
		}

		direction := "达到或超过"
		if alert.Condition == "below" {
			direction = "降至或低于"
		}

		notif := &model.Notification{
			UserID:  alert.UserID,
			Type:    "alert",
			Title:   fmt.Sprintf("价格预警触发：%s", alert.Category),
			Summary: fmt.Sprintf("%s 当前价格 ¥%.2f %s目标价 ¥%.2f", alert.Category, currentPrice, direction, alert.TargetPrice),
			Content: fmt.Sprintf("您设置的「%s」价格预警已触发。当前价格 ¥%.2f，%s预警价 ¥%.2f。",
				alert.Category, currentPrice, direction, alert.TargetPrice),
		}

		if err := s.notifRepo.Create(ctx, notif); err != nil {
			log.Printf("[AlertCheck] 创建通知失败: alert_id=%d, err=%v", alert.ID, err)
			continue
		}

		if err := s.alertRepo.Deactivate(ctx, alert.ID); err != nil {
			log.Printf("[AlertCheck] 取消激活预警失败: alert_id=%d, err=%v", alert.ID, err)
		}

		log.Printf("[AlertCheck] 预警触发: user_id=%d, category=%s, current=%.2f, target=%.2f",
			alert.UserID, alert.Category, currentPrice, alert.TargetPrice)
		triggeredCount++
	}

	log.Printf("[AlertCheck] 检查完成，触发 %d 个预警", triggeredCount)
}
