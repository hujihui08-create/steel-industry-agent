package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type TokenUsageService struct {
	tokenUsageRepo *repository.TokenUsageRepository
}

func NewTokenUsageService(tokenUsageRepo *repository.TokenUsageRepository) *TokenUsageService {
	return &TokenUsageService{tokenUsageRepo: tokenUsageRepo}
}

func (s *TokenUsageService) Create(ctx context.Context, usage *model.TokenUsage) error {
	return s.tokenUsageRepo.Create(ctx, usage)
}

func (s *TokenUsageService) GetDailyUsage(ctx context.Context, userID uint) (int64, error) {
	return s.tokenUsageRepo.GetDailyUsage(ctx, userID)
}
