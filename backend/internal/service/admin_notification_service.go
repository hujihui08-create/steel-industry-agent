package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type AdminNotificationService struct {
	adminNotifRepo *repository.AdminNotificationRepository
}

func NewAdminNotificationService(adminNotifRepo *repository.AdminNotificationRepository) *AdminNotificationService {
	return &AdminNotificationService{adminNotifRepo: adminNotifRepo}
}

func (s *AdminNotificationService) ListByAdmin(ctx context.Context, adminID uint, page, pageSize int) ([]model.AdminNotification, int64, error) {
	offset := (page - 1) * pageSize
	notifs, err := s.adminNotifRepo.ListByAdminID(ctx, adminID, offset, pageSize)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.adminNotifRepo.CountUnread(ctx, adminID)
	if err != nil {
		return nil, 0, err
	}
	return notifs, total, nil
}

func (s *AdminNotificationService) Create(ctx context.Context, adminID *uint, notifType, title, content string) error {
	notif := model.AdminNotification{
		AdminID: adminID,
		Type:    notifType,
		Title:   title,
		Content: content,
	}
	return s.adminNotifRepo.Create(ctx, &notif)
}

func (s *AdminNotificationService) MarkAsRead(ctx context.Context, id uint) error {
	return s.adminNotifRepo.MarkAsRead(ctx, id)
}

func (s *AdminNotificationService) MarkAllAsRead(ctx context.Context, adminID uint) error {
	return s.adminNotifRepo.MarkAllAsRead(ctx, adminID)
}

func (s *AdminNotificationService) CountUnread(ctx context.Context, adminID uint) (int64, error) {
	return s.adminNotifRepo.CountUnread(ctx, adminID)
}

func (s *AdminNotificationService) Broadcast(ctx context.Context, notifType, title, content string) error {
	return s.Create(ctx, nil, notifType, title, content)
}
