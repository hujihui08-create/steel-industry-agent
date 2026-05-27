package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupUserTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestUserRepo_Create(t *testing.T) {
	db := setupUserTestDB(t)
	repo := NewUserRepository(db)
	ctx := context.Background()

	user := &model.User{
		Phone:        "13800138000",
		PasswordHash: "$2a$10$hashedpassword",
		Nickname:     "测试用户",
		Company:      "钢铁贸易公司",
		Role:         "user",
		Region:       "上海",
		Status:       1,
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if user.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}
	if user.Phone != "13800138000" {
		t.Errorf("expected phone '13800138000', got '%s'", user.Phone)
	}
}

func TestUserRepo_FindByPhone(t *testing.T) {
	db := setupUserTestDB(t)
	repo := NewUserRepository(db)
	ctx := context.Background()

	user := &model.User{
		Phone:        "13800138000",
		PasswordHash: "$2a$10$hash",
		Nickname:     "测试用户",
		Role:         "user",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	found, err := repo.FindByPhone(ctx, "13800138000")
	if err != nil {
		t.Fatalf("FindByPhone failed: %v", err)
	}
	if found.ID != user.ID {
		t.Errorf("expected ID %d, got %d", user.ID, found.ID)
	}
	if found.Nickname != "测试用户" {
		t.Errorf("expected nickname '测试用户', got '%s'", found.Nickname)
	}

	_, err = repo.FindByPhone(ctx, "13900000000")
	if err == nil {
		t.Error("expected error for non-existent phone")
	}
}

func TestUserRepo_Update(t *testing.T) {
	db := setupUserTestDB(t)
	repo := NewUserRepository(db)
	ctx := context.Background()

	user := &model.User{
		Phone:        "13800138000",
		PasswordHash: "$2a$10$hash",
		Nickname:     "原始昵称",
		Role:         "user",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	user.Nickname = "更新后的昵称"
	user.Company = "新公司名称"
	if err := repo.Update(ctx, user); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// Find by ID to verify
	found, err := repo.FindByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("FindByID after update failed: %v", err)
	}
	if found.Nickname != "更新后的昵称" {
		t.Errorf("expected nickname '更新后的昵称', got '%s'", found.Nickname)
	}
	if found.Company != "新公司名称" {
		t.Errorf("expected company '新公司名称', got '%s'", found.Company)
	}
}
