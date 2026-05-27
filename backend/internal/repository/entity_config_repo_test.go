package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupEntityConfigTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.EntityConfig{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestEntityConfigRepo_FindByType(t *testing.T) {
	db := setupEntityConfigTestDB(t)
	repo := NewEntityConfigRepository(db)
	ctx := context.Background()

	regions := []*model.EntityConfig{
		{EntityType: "region", EntityValue: "上海"},
		{EntityType: "region", EntityValue: "北京"},
		{EntityType: "region", EntityValue: "广州"},
		{EntityType: "other", EntityValue: "extra"},
	}
	for _, r := range regions {
		if err := repo.Create(ctx, r); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	result, err := repo.FindByType(ctx, "region")
	if err != nil {
		t.Fatalf("FindByType failed: %v", err)
	}
	if len(result) != 3 {
		t.Errorf("expected 3 region configs, got %d", len(result))
	}
	if result[0].EntityValue != "上海" {
		t.Errorf("expected first region '上海', got '%s'", result[0].EntityValue)
	}
}

func TestEntityConfigRepo_Create(t *testing.T) {
	db := setupEntityConfigTestDB(t)
	repo := NewEntityConfigRepository(db)
	ctx := context.Background()

	config := &model.EntityConfig{
		EntityType: "region", EntityValue: "西安",
	}
	if err := repo.Create(ctx, config); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if config.ID == 0 {
		t.Errorf("expected ID to be set after create")
	}

	result, err := repo.FindByType(ctx, "region")
	if err != nil {
		t.Fatalf("FindByType failed: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("expected 1 config, got %d", len(result))
	}
}

func TestEntityConfigRepo_Delete(t *testing.T) {
	db := setupEntityConfigTestDB(t)
	repo := NewEntityConfigRepository(db)
	ctx := context.Background()

	config := &model.EntityConfig{
		EntityType: "region", EntityValue: "深圳",
	}
	if err := repo.Create(ctx, config); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if err := repo.Delete(ctx, config.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	result, err := repo.FindByType(ctx, "region")
	if err != nil {
		t.Fatalf("FindByType failed: %v", err)
	}
	if len(result) != 0 {
		t.Errorf("expected 0 configs after delete, got %d", len(result))
	}
}
