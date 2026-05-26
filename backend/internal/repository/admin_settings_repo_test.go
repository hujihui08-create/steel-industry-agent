package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupAdminSettingsTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.AdminSettings{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestAdminSettingsRepo_Get_EmptyDB(t *testing.T) {
	db := setupAdminSettingsTestDB(t)
	repo := NewAdminSettingsRepository(db)
	ctx := context.Background()

	settings, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if settings != nil {
		t.Errorf("expected nil settings when DB is empty, got %+v", settings)
	}
}

func TestAdminSettingsRepo_Save_Create(t *testing.T) {
	db := setupAdminSettingsTestDB(t)
	repo := NewAdminSettingsRepository(db)
	ctx := context.Background()

	// Save a new record
	settings := &model.AdminSettings{
		SettingsData: model.SettingsMap{"siteName": "test"},
	}
	if err := repo.Save(ctx, settings); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Get and verify
	found, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get after Save failed: %v", err)
	}
	if found == nil {
		t.Fatalf("expected non-nil settings after Save, got nil")
	}
	if found.SettingsData["siteName"] != "test" {
		t.Errorf("expected siteName 'test', got '%v'", found.SettingsData["siteName"])
	}
}

func TestAdminSettingsRepo_Save_Update(t *testing.T) {
	db := setupAdminSettingsTestDB(t)
	repo := NewAdminSettingsRepository(db)
	ctx := context.Background()

	// Save initial record
	settings := &model.AdminSettings{
		SettingsData: model.SettingsMap{"siteName": "test"},
	}
	if err := repo.Save(ctx, settings); err != nil {
		t.Fatalf("Save initial failed: %v", err)
	}

	// Update with new data (old siteName should be gone)
	settings.SettingsData = model.SettingsMap{"siteName": "updated"}
	if err := repo.Save(ctx, settings); err != nil {
		t.Fatalf("Save update failed: %v", err)
	}

	// Get and verify
	found, err := repo.Get(ctx)
	if err != nil {
		t.Fatalf("Get after update failed: %v", err)
	}
	if found == nil {
		t.Fatalf("expected non-nil settings after update, got nil")
	}
	if found.SettingsData["siteName"] != "updated" {
		t.Errorf("expected siteName 'updated', got '%v'", found.SettingsData["siteName"])
	}
}
