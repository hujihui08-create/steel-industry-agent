package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type AdminLogService struct {
	adminLogRepo *repository.AdminLogRepository
}

func NewAdminLogService(adminLogRepo *repository.AdminLogRepository) *AdminLogService {
	return &AdminLogService{adminLogRepo: adminLogRepo}
}

func (s *AdminLogService) List(ctx context.Context, limit int) ([]model.AdminLog, error) {
	return s.adminLogRepo.FindRecent(ctx, limit)
}

func (s *AdminLogService) GetByID(ctx context.Context, id uint) (*model.AdminLog, error) {
	logs, err := s.adminLogRepo.FindRecent(ctx, 1000)
	if err != nil {
		return nil, err
	}
	for _, l := range logs {
		if l.ID == id {
			return &l, nil
		}
	}
	return nil, nil
}
