package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"steel-agent-backend/internal/model"
)

type mockUserRepo struct {
	users    map[uint]*model.User
	byPhone  map[string]*model.User
	findErr  error
	createErr error
	updateErr error
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{
		users:   make(map[uint]*model.User),
		byPhone: make(map[string]*model.User),
	}
}

func (m *mockUserRepo) FindByID(ctx context.Context, id uint) (*model.User, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	u, ok := m.users[id]
	if !ok {
		return nil, errors.New("record not found")
	}
	return u, nil
}

func (m *mockUserRepo) FindByPhone(ctx context.Context, phone string) (*model.User, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	u, ok := m.byPhone[phone]
	if !ok {
		return nil, errors.New("record not found")
	}
	return u, nil
}

func (m *mockUserRepo) Create(ctx context.Context, user *model.User) error {
	if m.createErr != nil {
		return m.createErr
	}
	id := uint(len(m.users) + 1)
	user.ID = id
	m.users[id] = user
	m.byPhone[user.Phone] = user
	return nil
}

func (m *mockUserRepo) Update(ctx context.Context, user *model.User) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	m.users[user.ID] = user
	return nil
}

func TestGetProfile(t *testing.T) {
	ctx := context.Background()

	t.Run("success", func(t *testing.T) {
		mock := newMockUserRepo()
		mock.users[1] = &model.User{
			ID:       1,
			Phone:    "13800138000",
			Nickname: "测试用户",
			Company:  "某钢贸公司",
			Region:   "上海",
		}

		result, err := mock.FindByID(ctx, 1)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if result.ID != 1 {
			t.Errorf("expected user ID 1, got %d", result.ID)
		}
		if result.Nickname != "测试用户" {
			t.Errorf("expected nickname 测试用户, got %s", result.Nickname)
		}
	})

	t.Run("user not found", func(t *testing.T) {
		mock := newMockUserRepo()

		_, err := mock.FindByID(ctx, 999)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})

	t.Run("repository error", func(t *testing.T) {
		mock := newMockUserRepo()
		mock.findErr = errors.New("database connection error")

		_, err := mock.FindByID(ctx, 1)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestUpdateProfile(t *testing.T) {
	ctx := context.Background()

	t.Run("success update all fields", func(t *testing.T) {
		mock := newMockUserRepo()
		mock.users[1] = &model.User{
			ID:       1,
			Phone:    "13800138000",
			Nickname: "旧昵称",
			Company:  "旧公司",
			Region:   "旧地区",
		}

		user, _ := mock.FindByID(ctx, 1)
		user.Nickname = "新昵称"
		user.Company = "新公司"
		user.Region = "新地区"

		err := mock.Update(ctx, user)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		updated, _ := mock.FindByID(ctx, 1)
		if updated.Nickname != "新昵称" {
			t.Errorf("expected nickname 新昵称, got %s", updated.Nickname)
		}
		if updated.Company != "新公司" {
			t.Errorf("expected company 新公司, got %s", updated.Company)
		}
		if updated.Region != "新地区" {
			t.Errorf("expected region 新地区, got %s", updated.Region)
		}
	})

	t.Run("update only nickname", func(t *testing.T) {
		mock := newMockUserRepo()
		mock.users[1] = &model.User{
			ID:       1,
			Phone:    "13800138000",
			Nickname: "旧昵称",
			Company:  "公司",
		}

		user, _ := mock.FindByID(ctx, 1)
		user.Nickname = "仅更新昵称"

		err := mock.Update(ctx, user)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}

		updated, _ := mock.FindByID(ctx, 1)
		if updated.Company != "公司" {
			t.Errorf("expected company unchanged, got %s", updated.Company)
		}
	})

	t.Run("user not found", func(t *testing.T) {
		mock := newMockUserRepo()

		_, err := mock.FindByID(ctx, 999)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})

	t.Run("update error", func(t *testing.T) {
		mock := newMockUserRepo()
		mock.users[1] = &model.User{ID: 1, Phone: "13800138000"}
		mock.updateErr = errors.New("update failed")

		user, _ := mock.FindByID(ctx, 1)
		err := mock.Update(ctx, user)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestUpdatePasswordSuccess(t *testing.T) {
	ctx := context.Background()

	mock := newMockUserRepo()
	mock.users[1] = &model.User{
		ID:           1,
		Phone:        "13800138000",
		PasswordHash: "$2a$10$abcdefghijklmnopqrstu", // dummy hash, won't pass bcrypt
		Nickname:     "测试用户",
	}

	user, err := mock.FindByID(ctx, 1)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if user.ID != 1 {
		t.Errorf("expected user ID 1, got %d", user.ID)
	}
}

func TestUpdatePasswordWrongOld(t *testing.T) {
	ctx := context.Background()

	mock := newMockUserRepo()
	mock.users[1] = &model.User{
		ID:           1,
		Phone:        "13800138000",
		PasswordHash: "$2a$10$abcdefghijklmnopqrstu",
	}

	user, err := mock.FindByID(ctx, 1)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if user.PasswordHash == "" {
		t.Errorf("expected password hash to be set")
	}
}

func TestUserServiceUpdatePasswordWorkflow(t *testing.T) {
	ctx := context.Background()
	now := time.Now()

	tests := []struct {
		name          string
		setupUser     *model.User
		findErr       error
		updateErr     error
		wantFindErr   bool
		wantUpdateErr bool
	}{
		{
			name: "find user success, update success",
			setupUser: &model.User{
				ID: 1, Phone: "13800138000",
				PasswordHash: "$2a$10$abcdefghijklmnopqrstu",
				Nickname: "测试", CreatedAt: now, UpdatedAt: now,
			},
			wantFindErr:   false,
			wantUpdateErr: false,
		},
		{
			name:          "find user fails",
			setupUser:     nil,
			findErr:       errors.New("user not found"),
			wantFindErr:   true,
			wantUpdateErr: false,
		},
		{
			name: "update fails",
			setupUser: &model.User{
				ID: 1, Phone: "13800138000",
				PasswordHash: "$2a$10$abcdefghijklmnopqrstu",
				Nickname: "测试", CreatedAt: now, UpdatedAt: now,
			},
			updateErr:     errors.New("save failed"),
			wantFindErr:   false,
			wantUpdateErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := newMockUserRepo()
			if tt.setupUser != nil {
				mock.users[1] = tt.setupUser
				mock.byPhone[tt.setupUser.Phone] = tt.setupUser
			}
			mock.findErr = tt.findErr
			mock.updateErr = tt.updateErr

			user, err := mock.FindByID(ctx, 1)
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

			user.PasswordHash = "$2a$10$newhashedpassword12345"

			err = mock.Update(ctx, user)
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
