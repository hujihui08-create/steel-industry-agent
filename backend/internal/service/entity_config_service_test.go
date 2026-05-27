package service

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// setupEntityConfigTestDB creates an in-memory SQLite database and
// auto-migrates the EntityConfig model. Used by all tests in this file.
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

// setupEntityConfigSvc bootstraps a test DB, seeds it with regions, and returns
// a fully wired EntityConfigService.
func setupEntityConfigSvc(t *testing.T, regions []string) *EntityConfigService {
	t.Helper()
	db := setupEntityConfigTestDB(t)
	repo := repository.NewEntityConfigRepository(db)

	// Seed region data
	for _, r := range regions {
		if err := repo.Create(context.Background(), &model.EntityConfig{
			EntityType:  "region",
			EntityValue: r,
		}); err != nil {
			t.Fatalf("seed region '%s' failed: %v", r, err)
		}
	}

	return NewEntityConfigService(repo)
}

// ---------------------------------------------------------------------------
// GetRegions
// ---------------------------------------------------------------------------

func TestEntityConfigService_GetRegions(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{"上海", "北京", "广州"})
	ctx := context.Background()

	regions, err := svc.GetRegions(ctx)
	if err != nil {
		t.Fatalf("GetRegions failed: %v", err)
	}
	if len(regions) != 3 {
		t.Errorf("expected 3 regions, got %d", len(regions))
	}
	if regions[0] != "上海" {
		t.Errorf("expected '上海', got '%s'", regions[0])
	}
	if regions[2] != "广州" {
		t.Errorf("expected '广州', got '%s'", regions[2])
	}
}

func TestEntityConfigService_GetRegions_Empty(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{})
	ctx := context.Background()

	regions, err := svc.GetRegions(ctx)
	if err != nil {
		t.Fatalf("GetRegions failed: %v", err)
	}
	if len(regions) != 0 {
		t.Errorf("expected 0 regions, got %d", len(regions))
	}
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

func TestEntityConfigService_List(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{"上海", "北京", "广州"})
	ctx := context.Background()

	configs, err := svc.List(ctx, "region")
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(configs) != 3 {
		t.Errorf("expected 3 configs, got %d", len(configs))
	}
}

func TestEntityConfigService_List_EmptyType(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{"上海"})
	ctx := context.Background()

	// "" should default to "region"
	configs, err := svc.List(ctx, "")
	if err != nil {
		t.Fatalf("List with empty type failed: %v", err)
	}
	if len(configs) != 1 {
		t.Errorf("expected 1 config, got %d", len(configs))
	}
}

func TestEntityConfigService_List_NonExistentType(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{"上海"})
	ctx := context.Background()

	configs, err := svc.List(ctx, "nonexistent")
	if err != nil {
		t.Fatalf("List for non-existent type failed: %v", err)
	}
	if len(configs) != 0 {
		t.Errorf("expected 0 configs for non-existent type, got %d", len(configs))
	}
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

func TestEntityConfigService_Create(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{})
	ctx := context.Background()

	config, err := svc.Create(ctx, "region", "西安")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if config.EntityType != "region" {
		t.Errorf("expected entity_type 'region', got '%s'", config.EntityType)
	}
	if config.EntityValue != "西安" {
		t.Errorf("expected entity_value '西安', got '%s'", config.EntityValue)
	}
	if config.ID == 0 {
		t.Errorf("expected ID to be assigned after Create, got 0")
	}
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

func TestEntityConfigService_Delete(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{"上海"})
	ctx := context.Background()

	configs, _ := svc.List(ctx, "region")
	id := configs[0].ID

	if err := svc.Delete(ctx, id); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Verify it's gone
	remaining, err := svc.List(ctx, "region")
	if err != nil {
		t.Fatalf("List after delete failed: %v", err)
	}
	if len(remaining) != 0 {
		t.Errorf("expected 0 after delete, got %d", len(remaining))
	}
}

func TestEntityConfigService_Delete_NonExistent(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{})
	ctx := context.Background()

	// GORM Delete with a non-existent ID does NOT return an error –
	// it simply executes the DELETE with zero rows affected.
	err := svc.Delete(ctx, 999)
	if err != nil {
		t.Fatalf("Delete non-existent should not error: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Edge cases – delete all and recreate
// ---------------------------------------------------------------------------

func TestEntityConfigService_Create_Duplicate(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{"上海"})
	ctx := context.Background()

	// Create a duplicate region (allowed at DB level – no unique constraint on value)
	config, err := svc.Create(ctx, "region", "上海")
	if err != nil {
		t.Fatalf("Create duplicate failed: %v", err)
	}
	if config.EntityValue != "上海" {
		t.Errorf("expected '上海', got '%s'", config.EntityValue)
	}

	// Both should appear in list
	configs, err := svc.List(ctx, "region")
	if err != nil {
		t.Fatalf("List after duplicate failed: %v", err)
	}
	if len(configs) != 2 {
		t.Errorf("expected 2 (1 original + 1 duplicate), got %d", len(configs))
	}
}

// ---------------------------------------------------------------------------
// Delete with ID 0 (invalid) – GORM gracefully handles this
// ---------------------------------------------------------------------------

func TestEntityConfigService_Delete_ZeroID(t *testing.T) {
	svc := setupEntityConfigSvc(t, []string{"上海"})
	ctx := context.Background()

	// GORM treats ID=0 as "delete all" in some modes, but with a model
	// type it acts as a no-op. Either way no error is returned.
	err := svc.Delete(ctx, 0)
	if err != nil {
		t.Fatalf("Delete with ID 0 should not error: %v", err)
	}
	// The existing record should still be present
	configs, err := svc.List(ctx, "region")
	if err != nil {
		t.Fatalf("List after Delete(0) failed: %v", err)
	}
	if len(configs) != 1 {
		t.Errorf("expected 1 after Delete(0), got %d", len(configs))
	}
}
