package service

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

type BadCaseService struct {
	badCaseRepo *repository.BadCaseRepository
}

func NewBadCaseService(badCaseRepo *repository.BadCaseRepository) *BadCaseService {
	return &BadCaseService{badCaseRepo: badCaseRepo}
}

func (s *BadCaseService) List(ctx context.Context) ([]model.BadCase, error) {
	return s.badCaseRepo.FindAll(ctx)
}

func (s *BadCaseService) GetByID(ctx context.Context, id uint) (*model.BadCase, error) {
	return s.badCaseRepo.FindByID(ctx, id)
}

func (s *BadCaseService) Create(ctx context.Context, badCase *model.BadCase) error {
	return s.badCaseRepo.Create(ctx, badCase)
}

func (s *BadCaseService) Update(ctx context.Context, badCase *model.BadCase) error {
	return s.badCaseRepo.Update(ctx, badCase)
}

func (s *BadCaseService) UpdateStatus(ctx context.Context, id uint, status string) error {
	return s.badCaseRepo.UpdateStatus(ctx, id, status)
}

func (s *BadCaseService) Stats(ctx context.Context) (map[string]interface{}, error) {
	cases, err := s.badCaseRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	pending := 0
	fixed := 0
	verified := 0
	for _, c := range cases {
		switch c.Status {
		case "pending":
			pending++
		case "fixed":
			fixed++
		case "verified":
			verified++
		}
	}

	return map[string]interface{}{
		"total":    len(cases),
		"pending":  pending,
		"fixed":    fixed,
		"verified": verified,
	}, nil
}
