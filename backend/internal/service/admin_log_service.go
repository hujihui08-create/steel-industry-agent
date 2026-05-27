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
	return s.adminLogRepo.FindByID(ctx, id)
}
