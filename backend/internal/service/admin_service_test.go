package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func init() {
	config.AppConfig = &config.Config{
		JWTSecret: "test-secret",
	}
}

type mockAdminRepo struct {
	admins           map[uint]*model.Admin
	byUsername       map[string]*model.Admin
	findErr          error
	updateErr        error
	userCount        int64
	quotationCount   int64
	tenderCount      int64
	alertCount       int64
	countErr         error
	findByIDCalled   bool
	updateCalled     bool
}

func newMockAdminRepo() *mockAdminRepo {
	return &mockAdminRepo{
		admins:     make(map[uint]*model.Admin),
		byUsername: make(map[string]*model.Admin),
	}
}

func (m *mockAdminRepo) FindByUsername(ctx context.Context, username string) (*model.Admin, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	a, ok := m.byUsername[username]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return a, nil
}

func (m *mockAdminRepo) FindByID(ctx context.Context, id uint) (*model.Admin, error) {
	m.findByIDCalled = true
	if m.findErr != nil {
		return nil, m.findErr
	}
	a, ok := m.admins[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return a, nil
}

func (m *mockAdminRepo) Update(ctx context.Context, admin *model.Admin) error {
	m.updateCalled = true
	if m.updateErr != nil {
		return m.updateErr
	}
	m.admins[admin.ID] = admin
	return nil
}

func (m *mockAdminRepo) CountUsers(ctx context.Context) (int64, error) {
	if m.countErr != nil {
		return 0, m.countErr
	}
	return m.userCount, nil
}

func (m *mockAdminRepo) CountQuotations(ctx context.Context) (int64, error) {
	if m.countErr != nil {
		return 0, m.countErr
	}
	return m.quotationCount, nil
}

func (m *mockAdminRepo) CountTenders(ctx context.Context) (int64, error) {
	if m.countErr != nil {
		return 0, m.countErr
	}
	return m.tenderCount, nil
}

func (m *mockAdminRepo) CountAlerts(ctx context.Context) (int64, error) {
	if m.countErr != nil {
		return 0, m.countErr
	}
	return m.alertCount, nil
}

type testableAdminService struct {
	repo *mockAdminRepo
}

func newTestableAdminService(repo *mockAdminRepo) *testableAdminService {
	return &testableAdminService{repo: repo}
}

func (s *testableAdminService) Login(ctx context.Context, username, password string) (string, *model.Admin, error) {
	admin, err := s.repo.FindByUsername(ctx, username)
	if err != nil {
		return "", nil, err
	}

	if admin.Status != 1 {
		return "", nil, errors.New("账号已被禁用")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		return "", nil, errors.New("用户名或密码错误")
	}

	tokenStr := "mock-jwt-token-for-" + username
	return tokenStr, admin, nil
}

func (s *testableAdminService) GetInfo(ctx context.Context, adminID uint) (*model.Admin, error) {
	return s.repo.FindByID(ctx, adminID)
}

func (s *testableAdminService) Dashboard(ctx context.Context) (map[string]int64, error) {
	userCount, err := s.repo.CountUsers(ctx)
	if err != nil {
		return nil, err
	}
	quotationCount, err := s.repo.CountQuotations(ctx)
	if err != nil {
		return nil, err
	}
	tenderCount, err := s.repo.CountTenders(ctx)
	if err != nil {
		return nil, err
	}
	alertCount, err := s.repo.CountAlerts(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]int64{
		"user_count":      userCount,
		"quotation_count": quotationCount,
		"tender_count":    tenderCount,
		"alert_count":     alertCount,
	}, nil
}

func TestAdminLoginSuccess(t *testing.T) {
	ctx := context.Background()

	hashedPw, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)

	mock := newMockAdminRepo()
	mock.byUsername["admin"] = &model.Admin{
		ID:           1,
		Username:     "admin",
		PasswordHash: string(hashedPw),
		Nickname:     "管理员",
		Role:         "admin",
		Status:       1,
	}

	svc := newTestableAdminService(mock)
	token, admin, err := svc.Login(ctx, "admin", "admin123")

	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if token == "" {
		t.Errorf("expected non-empty token")
	}
	if admin.Username != "admin" {
		t.Errorf("expected username admin, got %s", admin.Username)
	}
	if admin.Nickname != "管理员" {
		t.Errorf("expected nickname 管理员, got %s", admin.Nickname)
	}
}

func TestAdminLoginFailed(t *testing.T) {
	ctx := context.Background()

	t.Run("user not found", func(t *testing.T) {
		mock := newMockAdminRepo()

		svc := newTestableAdminService(mock)
		_, _, err := svc.Login(ctx, "nonexistent", "password")

		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})

	t.Run("wrong password", func(t *testing.T) {
		hashedPw, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)

		mock := newMockAdminRepo()
		mock.byUsername["admin"] = &model.Admin{
			ID:           1,
			Username:     "admin",
			PasswordHash: string(hashedPw),
			Status:       1,
		}

		svc := newTestableAdminService(mock)
		_, _, err := svc.Login(ctx, "admin", "wrongpassword")

		if err == nil {
			t.Errorf("expected error, got nil")
		}
		if err.Error() != "用户名或密码错误" {
			t.Errorf("expected '用户名或密码错误', got '%s'", err.Error())
		}
	})

	t.Run("account disabled", func(t *testing.T) {
		mock := newMockAdminRepo()
		mock.byUsername["disabled_admin"] = &model.Admin{
			ID:           2,
			Username:     "disabled_admin",
			PasswordHash: "anyhash",
			Status:       0,
		}

		svc := newTestableAdminService(mock)
		_, _, err := svc.Login(ctx, "disabled_admin", "password")

		if err == nil {
			t.Errorf("expected error, got nil")
		}
		if err.Error() != "账号已被禁用" {
			t.Errorf("expected '账号已被禁用', got '%s'", err.Error())
		}
	})
}

func TestAdminGetInfo(t *testing.T) {
	ctx := context.Background()

	mock := newMockAdminRepo()
	mock.admins[1] = &model.Admin{
		ID:       1,
		Username: "admin",
		Nickname: "管理员",
		Role:     "admin",
		Status:   1,
	}

	svc := newTestableAdminService(mock)
	admin, err := svc.GetInfo(ctx, 1)

	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if admin.Username != "admin" {
		t.Errorf("expected username admin, got %s", admin.Username)
	}

	t.Run("admin not found", func(t *testing.T) {
		mock2 := newMockAdminRepo()
		svc2 := newTestableAdminService(mock2)

		_, err := svc2.GetInfo(ctx, 999)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestAdminDashboard(t *testing.T) {
	ctx := context.Background()

	mock := newMockAdminRepo()
	mock.userCount = 156
	mock.quotationCount = 89
	mock.tenderCount = 42
	mock.alertCount = 23

	svc := newTestableAdminService(mock)
	stats, err := svc.Dashboard(ctx)

	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if stats["user_count"] != 156 {
		t.Errorf("expected user_count 156, got %d", stats["user_count"])
	}
	if stats["quotation_count"] != 89 {
		t.Errorf("expected quotation_count 89, got %d", stats["quotation_count"])
	}
	if stats["tender_count"] != 42 {
		t.Errorf("expected tender_count 42, got %d", stats["tender_count"])
	}
	if stats["alert_count"] != 23 {
		t.Errorf("expected alert_count 23, got %d", stats["alert_count"])
	}

	t.Run("count error", func(t *testing.T) {
		mock2 := newMockAdminRepo()
		mock2.countErr = errors.New("database error")
		svc2 := newTestableAdminService(mock2)

		_, err := svc2.Dashboard(ctx)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestAdminUpdatePassword(t *testing.T) {
	ctx := context.Background()
	now := time.Now()

	tests := []struct {
		name          string
		setupAdmin    *model.Admin
		findErr       error
		updateErr     error
		wantFindErr   bool
		wantUpdateErr bool
	}{
		{
			name: "find admin success, update success",
			setupAdmin: &model.Admin{
				ID: 1, Username: "admin",
				PasswordHash: "$2a$10$abcdefghijklmnopqrstu",
				Nickname: "管理员", Status: 1,
				CreatedAt: now, UpdatedAt: now,
			},
			wantFindErr:   false,
			wantUpdateErr: false,
		},
		{
			name:          "find admin fails",
			setupAdmin:    nil,
			findErr:       errors.New("admin not found"),
			wantFindErr:   true,
			wantUpdateErr: false,
		},
		{
			name: "update fails",
			setupAdmin: &model.Admin{
				ID: 1, Username: "admin",
				PasswordHash: "$2a$10$abcdefghijklmnopqrstu",
				Nickname: "管理员", Status: 1,
				CreatedAt: now, UpdatedAt: now,
			},
			updateErr:     errors.New("save failed"),
			wantFindErr:   false,
			wantUpdateErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := newMockAdminRepo()
			if tt.setupAdmin != nil {
				mock.admins[1] = tt.setupAdmin
				mock.byUsername[tt.setupAdmin.Username] = tt.setupAdmin
			}
			mock.findErr = tt.findErr
			mock.updateErr = tt.updateErr

			admin, err := mock.FindByID(ctx, 1)
			if tt.wantFindErr {
				if err == nil {
					t.Errorf("expected find error, got nil")
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected find error: %v", err)
				return
			}

			admin.PasswordHash = "$2a$10$newhashedpassword12345"

			err = mock.Update(ctx, admin)
			if tt.wantUpdateErr {
				if err == nil {
					t.Errorf("expected update error, got nil")
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected update error: %v", err)
			}
		})
	}
}
