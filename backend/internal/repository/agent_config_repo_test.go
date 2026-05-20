package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupAgentConfigTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.AgentConfig{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestAgentConfigRepo_FindAll(t *testing.T) {
	db := setupAgentConfigTestDB(t)
	repo := NewAgentConfigRepository(db)
	ctx := context.Background()

	// Insert 3 config entries
	for i := 0; i < 3; i++ {
		cfg := &model.AgentConfig{
			ConfigKey:   "key_" + string(rune('A'+i)),
			ConfigValue: "",
			Description: "description " + string(rune('A'+i)),
			IsActive:    true,
		}
		if err := repo.Create(ctx, cfg); err != nil {
			t.Fatalf("failed to create config: %v", err)
		}
	}

	configs, err := repo.FindAll(ctx)
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	if len(configs) != 3 {
		t.Errorf("expected 3 configs, got %d", len(configs))
	}
}

func TestAgentConfigRepo_FindByKey(t *testing.T) {
	db := setupAgentConfigTestDB(t)
	repo := NewAgentConfigRepository(db)
	ctx := context.Background()

	cfg := &model.AgentConfig{
		ConfigKey:   "test_key",
		ConfigValue: "",
		Description: "a test config",
		IsActive:    true,
	}
	if err := repo.Create(ctx, cfg); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Find by the key
	found, err := repo.FindByKey(ctx, "test_key")
	if err != nil {
		t.Fatalf("FindByKey failed: %v", err)
	}
	if found.ConfigKey != "test_key" {
		t.Errorf("expected config_key 'test_key', got '%s'", found.ConfigKey)
	}
	if found.Description != "a test config" {
		t.Errorf("expected description 'a test config', got '%s'", found.Description)
	}

	// Find non-existent key
	_, err = repo.FindByKey(ctx, "non_existent")
	if err == nil {
		t.Errorf("expected error for non-existent key, got nil")
	}
}

func TestAgentConfigRepo_Create(t *testing.T) {
	db := setupAgentConfigTestDB(t)
	repo := NewAgentConfigRepository(db)
	ctx := context.Background()

	cfg := &model.AgentConfig{
		ConfigKey:   "create_test",
		ConfigValue: "",
		Description: "created config",
		IsActive:    true,
	}
	err := repo.Create(ctx, cfg)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if cfg.ID == 0 {
		t.Errorf("expected ID to be assigned after Create, got 0")
	}
}

func TestAgentConfigRepo_Update(t *testing.T) {
	db := setupAgentConfigTestDB(t)
	repo := NewAgentConfigRepository(db)
	ctx := context.Background()

	cfg := &model.AgentConfig{
		ConfigKey:   "update_test",
		ConfigValue: "",
		Description: "original desc",
		IsActive:    true,
	}
	if err := repo.Create(ctx, cfg); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Update description and config_value
	cfg.Description = "updated desc"
	cfg.ConfigValue = "new_value"
	if err := repo.Update(ctx, cfg); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// Verify the update persisted
	found, err := repo.FindByKey(ctx, "update_test")
	if err != nil {
		t.Fatalf("FindByKey after update failed: %v", err)
	}
	if found.Description != "updated desc" {
		t.Errorf("expected description 'updated desc', got '%s'", found.Description)
	}
	if found.ConfigValue != "new_value" {
		t.Errorf("expected config_value 'new_value', got '%s'", found.ConfigValue)
	}
}

func TestAgentConfigRepo_Delete(t *testing.T) {
	db := setupAgentConfigTestDB(t)
	repo := NewAgentConfigRepository(db)
	ctx := context.Background()

	cfg := &model.AgentConfig{
		ConfigKey:   "delete_test",
		ConfigValue: "",
		Description: "to be deleted",
		IsActive:    true,
	}
	if err := repo.Create(ctx, cfg); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Delete it
	if err := repo.Delete(ctx, cfg.ID); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Verify it's gone
	_, err := repo.FindByKey(ctx, "delete_test")
	if err == nil {
		t.Errorf("expected error after delete, got nil -- record still exists")
	}
}
