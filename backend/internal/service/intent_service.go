package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type IntentService struct {
	intentRepo *repository.IntentRepository
}

func NewIntentService(intentRepo *repository.IntentRepository) *IntentService {
	return &IntentService{intentRepo: intentRepo}
}

func (s *IntentService) List(ctx context.Context) ([]model.Intent, error) {
	return s.intentRepo.FindAll(ctx)
}

func (s *IntentService) Create(ctx context.Context, intent *model.Intent) error {
	return s.intentRepo.Create(ctx, intent)
}

func (s *IntentService) Update(ctx context.Context, intent *model.Intent) error {
	return s.intentRepo.Update(ctx, intent)
}

func (s *IntentService) Delete(ctx context.Context, id uint) error {
	return s.intentRepo.Delete(ctx, id)
}

func (s *IntentService) Stats(ctx context.Context) (map[string]interface{}, error) {
	intents, err := s.intentRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	activeCount := 0
	for _, i := range intents {
		if i.IsActive {
			activeCount++
		}
	}

	return map[string]interface{}{
		"total":  len(intents),
		"active": activeCount,
	}, nil
}
