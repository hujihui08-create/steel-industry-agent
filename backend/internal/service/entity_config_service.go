package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type EntityConfigService struct {
	repo *repository.EntityConfigRepository
}

func NewEntityConfigService(repo *repository.EntityConfigRepository) *EntityConfigService {
	return &EntityConfigService{repo: repo}
}

func (s *EntityConfigService) GetRegions(ctx context.Context) ([]string, error) {
	configs, err := s.repo.FindByType(ctx, "region")
	if err != nil {
		return nil, err
	}
	regions := make([]string, len(configs))
	for i, c := range configs {
		regions[i] = c.EntityValue
	}
	return regions, nil
}

func (s *EntityConfigService) List(ctx context.Context, entityType string) ([]model.EntityConfig, error) {
	if entityType == "" {
		entityType = "region"
	}
	return s.repo.FindByType(ctx, entityType)
}

func (s *EntityConfigService) Create(ctx context.Context, entityType, entityValue string) (*model.EntityConfig, error) {
	config := &model.EntityConfig{
		EntityType:  entityType,
		EntityValue: entityValue,
	}
	if err := s.repo.Create(ctx, config); err != nil {
		return nil, err
	}
	return config, nil
}

func (s *EntityConfigService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}
