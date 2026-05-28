package repository

import (
	"context"
	"testing"

	"steel-agent-backend/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupMobileRoleRepo(t *testing.T) (*MobileRoleRepository, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	if err := db.AutoMigrate(&model.MobileRole{}, &model.Admin{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	repo := NewMobileRoleRepository(db)
	return repo, db
}

func TestFindAll_NoFilter(t *testing.T) {
	repo, db := setupMobileRoleRepo(t)
	ctx := context.Background()

	db.Create(&model.MobileRole{Name: "管理员角色", RoleType: "admin", Status: 1, Permissions: model.PermissionMap{"dashboard": true}})
	db.Create(&model.MobileRole{Name: "移动端角色", RoleType: "mobile", Status: 1, Permissions: model.PermissionMap{"price": true}})

	roles, err := repo.FindAll(ctx, "")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(roles) != 2 {
		t.Errorf("expected 2 roles, got %d", len(roles))
	}
}

func TestFindAll_AdminFilter(t *testing.T) {
	repo, db := setupMobileRoleRepo(t)
	ctx := context.Background()

	db.Create(&model.MobileRole{Name: "管理员角色", RoleType: "admin", Status: 1, Permissions: model.PermissionMap{}})
	db.Create(&model.MobileRole{Name: "移动端角色1", RoleType: "mobile", Status: 1, Permissions: model.PermissionMap{}})
	db.Create(&model.MobileRole{Name: "移动端角色2", RoleType: "mobile", Status: 1, Permissions: model.PermissionMap{}})

	roles, err := repo.FindAll(ctx, "admin")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(roles) != 1 {
		t.Errorf("expected 1 admin role, got %d", len(roles))
	}
	if roles[0].RoleType != "admin" {
		t.Errorf("expected role_type 'admin', got '%s'", roles[0].RoleType)
	}
	if roles[0].Name != "管理员角色" {
		t.Errorf("expected name '管理员角色', got '%s'", roles[0].Name)
	}
}

func TestFindAll_MobileFilter(t *testing.T) {
	repo, db := setupMobileRoleRepo(t)
	ctx := context.Background()

	db.Create(&model.MobileRole{Name: "管理员1", RoleType: "admin", Status: 1, Permissions: model.PermissionMap{}})
	db.Create(&model.MobileRole{Name: "管理员2", RoleType: "admin", Status: 1, Permissions: model.PermissionMap{}})
	db.Create(&model.MobileRole{Name: "移动端用户", RoleType: "mobile", Status: 1, Permissions: model.PermissionMap{}})

	roles, err := repo.FindAll(ctx, "mobile")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(roles) != 1 {
		t.Errorf("expected 1 mobile role, got %d", len(roles))
	}
	if roles[0].RoleType != "mobile" {
		t.Errorf("expected role_type 'mobile', got '%s'", roles[0].RoleType)
	}
	if roles[0].Name != "移动端用户" {
		t.Errorf("expected name '移动端用户', got '%s'", roles[0].Name)
	}
}

func TestFindAll_EmptyResult(t *testing.T) {
	repo, _ := setupMobileRoleRepo(t)
	ctx := context.Background()

	roles, err := repo.FindAll(ctx, "nonexistent")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(roles) != 0 {
		t.Errorf("expected 0 roles, got %d", len(roles))
	}
}

func TestDelete_AdminRoleWithAssociatedAdmins(t *testing.T) {
	repo, db := setupMobileRoleRepo(t)
	ctx := context.Background()

	role := &model.MobileRole{Name: "超级管理员", RoleType: "admin", Status: 1, Permissions: model.PermissionMap{}}
	db.Create(role)

	admin := &model.Admin{
		Username: "admin",
		Role:     "超级管理员",
		Status:   1,
	}
	db.Create(admin)

	err := repo.Delete(ctx, role.ID)
	if err == nil {
		t.Fatal("expected error when deleting admin role with associated admins")
	}
	if err.Error() != "该角色下有关联管理员，无法删除" {
		t.Errorf("expected '该角色下有关联管理员，无法删除', got '%s'", err.Error())
	}

	// Verify role still exists
	var count int64
	db.Model(&model.MobileRole{}).Where("id = ?", role.ID).Count(&count)
	if count != 1 {
		t.Errorf("role should still exist, count = %d", count)
	}
}

func TestDelete_AdminRoleNoAssociatedAdmins(t *testing.T) {
	repo, db := setupMobileRoleRepo(t)
	ctx := context.Background()

	role := &model.MobileRole{Name: "运营管理员", RoleType: "admin", Status: 1, Permissions: model.PermissionMap{}}
	db.Create(role)

	err := repo.Delete(ctx, role.ID)
	if err != nil {
		t.Fatalf("expected no error when no associated admins, got %v", err)
	}

	var count int64
	db.Model(&model.MobileRole{}).Where("id = ?", role.ID).Count(&count)
	if count != 0 {
		t.Error("role should have been deleted")
	}
}

func TestDelete_MobileRole(t *testing.T) {
	repo, db := setupMobileRoleRepo(t)
	ctx := context.Background()

	role := &model.MobileRole{Name: "采购员", RoleType: "mobile", Status: 1, Permissions: model.PermissionMap{}}
	db.Create(role)

	err := repo.Delete(ctx, role.ID)
	if err != nil {
		t.Fatalf("expected no error for mobile role deletion, got %v", err)
	}

	var count int64
	db.Model(&model.MobileRole{}).Where("id = ?", role.ID).Count(&count)
	if count != 0 {
		t.Error("role should have been deleted")
	}
}

func TestDelete_NonExistentRole(t *testing.T) {
	repo, _ := setupMobileRoleRepo(t)
	ctx := context.Background()

	err := repo.Delete(ctx, 9999)
	if err == nil {
		t.Fatal("expected error when deleting non-existent role")
	}
}
