package service

import (
	"context"
	"errors"
	"testing"

	"steel-agent-backend/internal/model"
)

type mockAlertRepo struct {
	alerts      []model.PriceAlert
	createErr   error
	findErr     error
	updateErr   error
	deleteErr   error
	createCalls int
	updateCalls int
	deleteCalls int
}

func (m *mockAlertRepo) Create(ctx context.Context, alert *model.PriceAlert) error {
	m.createCalls++
	if m.createErr != nil {
		return m.createErr
	}
	m.alerts = append(m.alerts, *alert)
	return nil
}

func (m *mockAlertRepo) FindByUserID(ctx context.Context, userID uint) ([]model.PriceAlert, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.PriceAlert
	for _, a := range m.alerts {
		if a.UserID == userID {
			result = append(result, a)
		}
	}
	return result, nil
}

func (m *mockAlertRepo) Update(ctx context.Context, alert *model.PriceAlert) error {
	m.updateCalls++
	return m.updateErr
}

func (m *mockAlertRepo) Delete(ctx context.Context, id uint) error {
	m.deleteCalls++
	return m.deleteErr
}

type testableAlertService struct {
	repo *mockAlertRepo
}

func newTestableAlertService(repo *mockAlertRepo) *testableAlertService {
	return &testableAlertService{repo: repo}
}

func (s *testableAlertService) CreateAlert(ctx context.Context, alert *model.PriceAlert) error {
	return s.repo.Create(ctx, alert)
}

func (s *testableAlertService) GetAlertList(ctx context.Context, userID uint) ([]model.PriceAlert, error) {
	return s.repo.FindByUserID(ctx, userID)
}

func (s *testableAlertService) UpdateAlert(ctx context.Context, alert *model.PriceAlert) error {
	return s.repo.Update(ctx, alert)
}

func (s *testableAlertService) DeleteAlert(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}

func TestCreateAlert(t *testing.T) {
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		repo := &mockAlertRepo{}
		svc := newTestableAlertService(repo)

		alert := &model.PriceAlert{
			UserID:      1,
			Category:    "螺纹钢",
			Spec:        "HRB400E 20mm",
			TargetPrice: 3800,
			Condition:   "below",
			IsActive:    true,
		}

		err := svc.CreateAlert(ctx, alert)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if len(repo.alerts) != 1 {
			t.Errorf("expected 1 alert stored, got %d", len(repo.alerts))
		}
		if repo.alerts[0].Category != "螺纹钢" {
			t.Errorf("expected category 螺纹钢, got %s", repo.alerts[0].Category)
		}
	})

	t.Run("repository error", func(t *testing.T) {
		repo := &mockAlertRepo{createErr: errors.New("database error")}
		svc := newTestableAlertService(repo)

		err := svc.CreateAlert(ctx, &model.PriceAlert{})
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestGetAlertList(t *testing.T) {
	ctx := context.Background()

	t.Run("success with alerts", func(t *testing.T) {
		repo := &mockAlertRepo{
			alerts: []model.PriceAlert{
				{ID: 1, UserID: 1, Category: "螺纹钢", TargetPrice: 3800},
				{ID: 2, UserID: 1, Category: "热卷", TargetPrice: 4200},
				{ID: 3, UserID: 2, Category: "线材", TargetPrice: 3600},
			},
		}
		svc := newTestableAlertService(repo)

		alerts, err := svc.GetAlertList(ctx, 1)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if len(alerts) != 2 {
			t.Errorf("expected 2 alerts for user 1, got %d", len(alerts))
		}
	})

	t.Run("success empty list", func(t *testing.T) {
		repo := &mockAlertRepo{}
		svc := newTestableAlertService(repo)

		alerts, err := svc.GetAlertList(ctx, 99)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if len(alerts) != 0 {
			t.Errorf("expected 0 alerts, got %d", len(alerts))
		}
	})

	t.Run("repository error", func(t *testing.T) {
		repo := &mockAlertRepo{findErr: errors.New("database error")}
		svc := newTestableAlertService(repo)

		_, err := svc.GetAlertList(ctx, 1)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestUpdateAlert(t *testing.T) {
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		repo := &mockAlertRepo{}
		svc := newTestableAlertService(repo)

		err := svc.UpdateAlert(ctx, &model.PriceAlert{ID: 1, TargetPrice: 4000})
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if repo.updateCalls != 1 {
			t.Errorf("expected 1 update call, got %d", repo.updateCalls)
		}
	})

	t.Run("repository error", func(t *testing.T) {
		repo := &mockAlertRepo{updateErr: errors.New("not found")}
		svc := newTestableAlertService(repo)

		err := svc.UpdateAlert(ctx, &model.PriceAlert{ID: 999})
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestDeleteAlert(t *testing.T) {
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		repo := &mockAlertRepo{}
		svc := newTestableAlertService(repo)

		err := svc.DeleteAlert(ctx, 1)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if repo.deleteCalls != 1 {
			t.Errorf("expected 1 delete call, got %d", repo.deleteCalls)
		}
	})

	t.Run("repository error", func(t *testing.T) {
		repo := &mockAlertRepo{deleteErr: errors.New("not found")}
		svc := newTestableAlertService(repo)

		err := svc.DeleteAlert(ctx, 999)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}
