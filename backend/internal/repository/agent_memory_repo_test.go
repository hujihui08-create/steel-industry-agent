package repository

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupAgentMemoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.AgentMemory{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestAgentMemoryRepo_Create(t *testing.T) {
	db := setupAgentMemoryTestDB(t)
	repo := NewAgentMemoryRepository(db)
	ctx := context.Background()

	memory := &model.AgentMemory{
		UserID:     1,
		SessionID:  100,
		Key:        "user_preference",
		Value:      `{"language":"zh","theme":"dark"}`,
		AccessedAt: time.Now(),
	}
	if err := repo.Create(ctx, memory); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if memory.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}
	if memory.UserID != 1 {
		t.Errorf("expected UserID 1, got %d", memory.UserID)
	}
	if memory.Key != "user_preference" {
		t.Errorf("expected Key 'user_preference', got '%s'", memory.Key)
	}
}

func TestAgentMemoryRepo_FindByUserAndKey(t *testing.T) {
	db := setupAgentMemoryTestDB(t)
	repo := NewAgentMemoryRepository(db)
	ctx := context.Background()

	baseTime := time.Date(2026, 7, 1, 10, 0, 0, 0, time.UTC)

	// Create 3 records with same user_id and key, different accessed_at
	for i := 0; i < 3; i++ {
		memory := &model.AgentMemory{
			UserID:     2,
			SessionID:  200,
			Key:        "search_history",
			Value:      "query_" + string(rune('a'+i)),
			AccessedAt: baseTime.Add(time.Duration(i) * time.Hour),
		}
		if err := repo.Create(ctx, memory); err != nil {
			t.Fatalf("Create %d failed: %v", i, err)
		}
	}

	// Also create a record with different key to ensure filtering works
	otherMemory := &model.AgentMemory{
		UserID:     2,
		SessionID:  200,
		Key:        "other_key",
		Value:      "other_value",
		AccessedAt: baseTime.Add(24 * time.Hour),
	}
	if err := repo.Create(ctx, otherMemory); err != nil {
		t.Fatalf("Create other failed: %v", err)
	}

	results, err := repo.FindByUserAndKey(ctx, 2, "search_history")
	if err != nil {
		t.Fatalf("FindByUserAndKey failed: %v", err)
	}
	if len(results) != 3 {
		t.Errorf("expected 3 results, got %d", len(results))
	}

	// Verify DESC ordering by accessed_at
	for i := 1; i < len(results); i++ {
		if results[i].AccessedAt.After(results[i-1].AccessedAt) {
			t.Errorf("results not in DESC order at index %d: %v > %v",
				i, results[i-1].AccessedAt, results[i].AccessedAt)
		}
	}

	// Verify all results match the key
	for _, r := range results {
		if r.Key != "search_history" {
			t.Errorf("expected Key 'search_history', got '%s'", r.Key)
		}
	}
}

func TestAgentMemoryRepo_UpsertByUserAndKey_NewRecord(t *testing.T) {
	db := setupAgentMemoryTestDB(t)
	repo := NewAgentMemoryRepository(db)
	ctx := context.Background()

	err := repo.UpsertByUserAndKey(ctx, 3, "new_key", "new_value")
	if err != nil {
		t.Fatalf("UpsertByUserAndKey failed: %v", err)
	}

	results, err := repo.FindByUserAndKey(ctx, 3, "new_key")
	if err != nil {
		t.Fatalf("FindByUserAndKey failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Value != "new_value" {
		t.Errorf("expected Value 'new_value', got '%s'", results[0].Value)
	}
	if results[0].UserID != 3 {
		t.Errorf("expected UserID 3, got %d", results[0].UserID)
	}
	if results[0].ID == 0 {
		t.Error("expected ID to be assigned")
	}
}

func TestAgentMemoryRepo_UpsertByUserAndKey_ExistingRecord(t *testing.T) {
	db := setupAgentMemoryTestDB(t)
	repo := NewAgentMemoryRepository(db)
	ctx := context.Background()

	// First create a record
	err := repo.UpsertByUserAndKey(ctx, 4, "existing_key", "original_value")
	if err != nil {
		t.Fatalf("first UpsertByUserAndKey failed: %v", err)
	}

	results, err := repo.FindByUserAndKey(ctx, 4, "existing_key")
	if err != nil {
		t.Fatalf("FindByUserAndKey failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	originalAccessedAt := results[0].AccessedAt

	// Wait a tiny bit so new AccessedAt differs
	time.Sleep(10 * time.Millisecond)

	// Upsert again with different value
	err = repo.UpsertByUserAndKey(ctx, 4, "existing_key", "updated_value")
	if err != nil {
		t.Fatalf("second UpsertByUserAndKey failed: %v", err)
	}

	results, err = repo.FindByUserAndKey(ctx, 4, "existing_key")
	if err != nil {
		t.Fatalf("FindByUserAndKey after upsert failed: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected still 1 result, got %d", len(results))
	}

	updated := results[0]
	if updated.Value != "updated_value" {
		t.Errorf("expected Value 'updated_value', got '%s'", updated.Value)
	}
	if !updated.AccessedAt.After(originalAccessedAt) {
		t.Error("expected AccessedAt to be updated (newer)")
	}
}

func TestAgentMemoryRepo_DeleteExpired(t *testing.T) {
	db := setupAgentMemoryTestDB(t)
	repo := NewAgentMemoryRepository(db)
	ctx := context.Background()

	oldTime := time.Now().Add(-48 * time.Hour)
	recentTime := time.Now().Add(-1 * time.Hour)

	// Create 2 old records
	for i := 0; i < 2; i++ {
		memory := &model.AgentMemory{
			UserID:     5,
			SessionID:  300,
			Key:        "expired_key",
			Value:      "old_data",
			AccessedAt: oldTime,
		}
		if err := repo.Create(ctx, memory); err != nil {
			t.Fatalf("Create old record %d failed: %v", i, err)
		}
	}

	// Create 1 recent record
	recentMemory := &model.AgentMemory{
		UserID:     5,
		SessionID:  300,
		Key:        "recent_key",
		Value:      "recent_data",
		AccessedAt: recentTime,
	}
	if err := repo.Create(ctx, recentMemory); err != nil {
		t.Fatalf("Create recent record failed: %v", err)
	}

	// Delete records older than 24 hours
	deleted, err := repo.DeleteExpired(ctx, 24*time.Hour)
	if err != nil {
		t.Fatalf("DeleteExpired failed: %v", err)
	}
	if deleted != 2 {
		t.Errorf("expected 2 deleted records, got %d", deleted)
	}

	// Verify recent record still exists
	results, err := repo.FindByUserAndKey(ctx, 5, "recent_key")
	if err != nil {
		t.Fatalf("FindByUserAndKey failed: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 remaining record, got %d", len(results))
	}
	if results[0].Value != "recent_data" {
		t.Errorf("expected Value 'recent_data', got '%s'", results[0].Value)
	}

	// Verify expired records are gone
	expiredResults, err := repo.FindByUserAndKey(ctx, 5, "expired_key")
	if err != nil {
		t.Fatalf("FindByUserAndKey for expired failed: %v", err)
	}
	if len(expiredResults) != 0 {
		t.Errorf("expected 0 expired records remaining, got %d", len(expiredResults))
	}
}
