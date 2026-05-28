package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"steel-agent-backend/internal/config"
	"steel-agent-backend/internal/model"
	"steel-agent-backend/pkg/validate"

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

	// Mobile user CRUD support
	users       map[uint]*model.User
	mobileRoles map[uint]*model.MobileRole
	byPhone     map[string]*model.User
	nextUserID  uint
}

func newMockAdminRepo() *mockAdminRepo {
	return &mockAdminRepo{
		admins:      make(map[uint]*model.Admin),
		byUsername:  make(map[string]*model.Admin),
		users:       make(map[uint]*model.User),
		mobileRoles: make(map[uint]*model.MobileRole),
		byPhone:     make(map[string]*model.User),
		nextUserID:  1,
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

func (m *mockAdminRepo) CreateMobileUser(ctx context.Context, user *model.User) error {
	user.ID = m.nextUserID
	m.nextUserID++
	m.users[user.ID] = user
	m.byPhone[user.Phone] = user
	return nil
}

func (m *mockAdminRepo) UpdateMobileUser(ctx context.Context, user *model.User) error {
	m.users[user.ID] = user
	m.byPhone[user.Phone] = user
	return nil
}

func (m *mockAdminRepo) DeleteMobileUser(ctx context.Context, id uint) error {
	user := m.users[id]
	delete(m.byPhone, user.Phone)
	delete(m.users, id)
	return nil
}

func (m *mockAdminRepo) FindUserByPhone(ctx context.Context, phone string) (*model.User, error) {
	if user, ok := m.byPhone[phone]; ok {
		return user, nil
	}
	return nil, gorm.ErrRecordNotFound
}

func (m *mockAdminRepo) FindMobileRoleByID(ctx context.Context, id uint) (*model.MobileRole, error) {
	if role, ok := m.mobileRoles[id]; ok {
		return role, nil
	}
	return nil, gorm.ErrRecordNotFound
}

func (m *mockAdminRepo) FindUserByID(ctx context.Context, id uint) (*model.User, error) {
	if user, ok := m.users[id]; ok {
		return user, nil
	}
	return nil, gorm.ErrRecordNotFound
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

func (s *testableAdminService) CreateMobileUser(ctx context.Context, phone, nickname, company, password string, roleID uint, region string) (*model.User, error) {
	if !validate.ValidatePhone(phone) {
		return nil, errors.New("手机号格式不正确")
	}

	existing, err := s.repo.FindUserByPhone(ctx, phone)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("该手机号已注册")
	}

	role, err := s.repo.FindMobileRoleByID(ctx, roleID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("所选角色不存在")
		}
		return nil, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Phone:        phone,
		PasswordHash: string(hashedPassword),
		Nickname:     nickname,
		Company:      company,
		Role:         role.Name,
		RoleID:       roleID,
		Region:       region,
		Status:       1,
	}

	if err := s.repo.CreateMobileUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *testableAdminService) UpdateMobileUser(ctx context.Context, id uint, nickname, company string, roleID uint, region string, status int) (*model.User, error) {
	user, err := s.repo.FindUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}

	user.Nickname = nickname
	user.Company = company
	user.Region = region
	user.Status = status

	if roleID > 0 {
		role, err := s.repo.FindMobileRoleByID(ctx, roleID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("所选角色不存在")
			}
			return nil, err
		}
		user.RoleID = roleID
		user.Role = role.Name
	}

	if err := s.repo.UpdateMobileUser(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *testableAdminService) DeleteMobileUser(ctx context.Context, id uint) error {
	_, err := s.repo.FindUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return err
	}

	return s.repo.DeleteMobileUser(ctx, id)
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

// =============================================================================
// CreateMobileUser Tests
// =============================================================================

func TestCreateMobileUser_Success(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	// Seed a mobile role
	mock.mobileRoles[1] = &model.MobileRole{ID: 1, Name: "采购员", RoleType: "mobile", Status: 1}
	svc := newTestableAdminService(mock)

	user, err := svc.CreateMobileUser(ctx, "13800138000", "测试用户", "测试公司", "password123", 1, "上海")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if user.Phone != "13800138000" {
		t.Errorf("expected phone 13800138000, got %s", user.Phone)
	}
	if user.Nickname != "测试用户" {
		t.Errorf("expected Nickname '测试用户', got '%s'", user.Nickname)
	}
	if user.Company != "测试公司" {
		t.Errorf("expected Company '测试公司', got '%s'", user.Company)
	}
	if user.RoleID != 1 {
		t.Errorf("expected RoleID 1, got %d", user.RoleID)
	}
	if user.Role != "采购员" {
		t.Errorf("expected Role '采购员', got '%s'", user.Role)
	}
	if user.Region != "上海" {
		t.Errorf("expected Region '上海', got '%s'", user.Region)
	}
	if user.Status != 1 {
		t.Errorf("expected Status 1, got %d", user.Status)
	}
	if user.ID == 0 {
		t.Error("expected user ID to be assigned")
	}
	// Verify password was hashed (not plaintext)
	if user.PasswordHash == "password123" {
		t.Error("password should be hashed, not stored as plaintext")
	}
}

func TestCreateMobileUser_DuplicatePhone(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	mock.mobileRoles[1] = &model.MobileRole{ID: 1, Name: "采购员", RoleType: "mobile", Status: 1}
	// Pre-create a user with the same phone
	mock.byPhone["13800138000"] = &model.User{ID: 1, Phone: "13800138000"}
	svc := newTestableAdminService(mock)

	_, err := svc.CreateMobileUser(ctx, "13800138000", "测试", "公司", "password", 1, "")
	if err == nil {
		t.Fatal("expected error for duplicate phone, got nil")
	}
	if err.Error() != "该手机号已注册" {
		t.Errorf("expected '该手机号已注册', got '%s'", err.Error())
	}
}

func TestCreateMobileUser_InvalidPhone(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	svc := newTestableAdminService(mock)

	testCases := []struct {
		phone string
		desc  string
	}{
		{"", "empty phone"},
		{"12345", "too short"},
		{"1380013800", "10 digits"},
		{"23800138000", "doesn't start with 1"},
		{"138001380001", "12 digits"},
	}
	for _, tc := range testCases {
		t.Run(tc.desc, func(t *testing.T) {
			_, err := svc.CreateMobileUser(ctx, tc.phone, "", "", "pass", 1, "")
			if err == nil {
				t.Errorf("expected error for %s, got nil", tc.desc)
			}
		})
	}
}

func TestCreateMobileUser_RoleNotFound(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	// Don't seed any roles
	svc := newTestableAdminService(mock)

	_, err := svc.CreateMobileUser(ctx, "13800138000", "", "", "pass", 999, "")
	if err == nil {
		t.Fatal("expected error for non-existent role, got nil")
	}
	if err.Error() != "所选角色不存在" {
		t.Errorf("expected '所选角色不存在', got '%s'", err.Error())
	}
}

// =============================================================================
// UpdateMobileUser Tests
// =============================================================================

func TestUpdateMobileUser_Success(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	mock.mobileRoles[2] = &model.MobileRole{ID: 2, Name: "销售经理", RoleType: "mobile", Status: 1}
	existingUser := &model.User{
		ID: 1, Phone: "13800138000", Nickname: "旧昵称", Company: "旧公司",
		RoleID: 1, Role: "采购员", Region: "北京", Status: 1,
	}
	mock.users[1] = existingUser
	mock.byPhone["13800138000"] = existingUser
	svc := newTestableAdminService(mock)

	updated, err := svc.UpdateMobileUser(ctx, 1, "新昵称", "新公司", 2, "上海", 1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if updated.Nickname != "新昵称" {
		t.Errorf("expected Nickname '新昵称', got '%s'", updated.Nickname)
	}
	if updated.Company != "新公司" {
		t.Errorf("expected Company '新公司', got '%s'", updated.Company)
	}
	if updated.RoleID != 2 {
		t.Errorf("expected RoleID 2, got %d", updated.RoleID)
	}
	if updated.Role != "销售经理" {
		t.Errorf("expected Role '销售经理', got '%s'", updated.Role)
	}
	if updated.Region != "上海" {
		t.Errorf("expected Region '上海', got '%s'", updated.Region)
	}
}

func TestUpdateMobileUser_NotFound(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	svc := newTestableAdminService(mock)

	_, err := svc.UpdateMobileUser(ctx, 999, "昵称", "", 0, "", 1)
	if err == nil {
		t.Fatal("expected error for non-existent user, got nil")
	}
	if err.Error() != "用户不存在" {
		t.Errorf("expected '用户不存在', got '%s'", err.Error())
	}
}

// =============================================================================
// DeleteMobileUser Tests
// =============================================================================

func TestDeleteMobileUser_Success(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	mock.users[1] = &model.User{ID: 1, Phone: "13800138000"}
	mock.byPhone["13800138000"] = mock.users[1]
	svc := newTestableAdminService(mock)

	err := svc.DeleteMobileUser(ctx, 1)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	// Verify user was deleted from repo
	if _, exists := mock.users[1]; exists {
		t.Error("user should have been deleted from users map")
	}
	if _, exists := mock.byPhone["13800138000"]; exists {
		t.Error("user should have been deleted from byPhone map")
	}
}

func TestDeleteMobileUser_NotFound(t *testing.T) {
	ctx := context.Background()
	mock := newMockAdminRepo()
	svc := newTestableAdminService(mock)

	err := svc.DeleteMobileUser(ctx, 999)
	if err == nil {
		t.Fatal("expected error for non-existent user, got nil")
	}
	if err.Error() != "用户不存在" {
		t.Errorf("expected '用户不存在', got '%s'", err.Error())
	}
}
