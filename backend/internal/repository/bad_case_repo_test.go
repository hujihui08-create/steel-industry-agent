package repository

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupBadCaseTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.BadCase{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestBadCaseRepo_FindAll(t *testing.T) {
	db := setupBadCaseTestDB(t)
	repo := NewBadCaseRepository(db)
	ctx := context.Background()

	// Insert 3 bad cases
	for i := 0; i < 3; i++ {
		bc := &model.BadCase{
			UserQuery:  "test query " + string(rune('A'+i)),
			AIResponse: "test response " + string(rune('A'+i)),
			ErrorType:  "hallucination",
			Status:     "pending",
		}
		if err := repo.Create(ctx, bc); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	cases, err := repo.FindAll(ctx)
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	if len(cases) != 3 {
		t.Errorf("expected 3 bad cases, got %d", len(cases))
	}
}

func TestBadCaseRepo_FindByID(t *testing.T) {
	db := setupBadCaseTestDB(t)
	repo := NewBadCaseRepository(db)
	ctx := context.Background()

	bc := &model.BadCase{
		UserQuery:  "find by id query",
		AIResponse: "find by id response",
		ErrorType:  "incorrect_data",
		Status:     "pending",
	}
	if err := repo.Create(ctx, bc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Find by valid ID
	found, err := repo.FindByID(ctx, bc.ID)
	if err != nil {
		t.Fatalf("FindByID failed: %v", err)
	}
	if found.UserQuery != "find by id query" {
		t.Errorf("expected UserQuery 'find by id query', got '%s'", found.UserQuery)
	}
	if found.Status != "pending" {
		t.Errorf("expected Status 'pending', got '%s'", found.Status)
	}

	// Find non-existent ID
	_, err = repo.FindByID(ctx, 9999)
	if err == nil {
		t.Errorf("expected error for non-existent ID, got nil")
	}
}

func TestBadCaseRepo_Create(t *testing.T) {
	db := setupBadCaseTestDB(t)
	repo := NewBadCaseRepository(db)
	ctx := context.Background()

	correctResp := "correct answer"
	bc := &model.BadCase{
		UserQuery:       "create test query",
		AIResponse:      "create test response",
		CorrectResponse: &correctResp,
		ErrorType:       "formatting",
		Status:          "pending",
	}
	err := repo.Create(ctx, bc)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if bc.ID == 0 {
		t.Errorf("expected ID to be assigned after Create, got 0")
	}
}

func TestBadCaseRepo_Update(t *testing.T) {
	db := setupBadCaseTestDB(t)
	repo := NewBadCaseRepository(db)
	ctx := context.Background()

	bc := &model.BadCase{
		UserQuery:  "update test query",
		AIResponse: "update test response",
		ErrorType:  "hallucination",
		Status:     "pending",
	}
	if err := repo.Create(ctx, bc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Update fields
	bc.FixSolution = "added prompt constraint"
	bc.ErrorType = "data_issue"
	if err := repo.Update(ctx, bc); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// Verify the update
	found, err := repo.FindByID(ctx, bc.ID)
	if err != nil {
		t.Fatalf("FindByID after update failed: %v", err)
	}
	if found.FixSolution != "added prompt constraint" {
		t.Errorf("expected FixSolution 'added prompt constraint', got '%s'", found.FixSolution)
	}
	if found.ErrorType != "data_issue" {
		t.Errorf("expected ErrorType 'data_issue', got '%s'", found.ErrorType)
	}
}

func TestBadCaseRepo_UpdateStatus(t *testing.T) {
	db := setupBadCaseTestDB(t)
	repo := NewBadCaseRepository(db)
	ctx := context.Background()

	bc := &model.BadCase{
		UserQuery:  "status test query",
		AIResponse: "status test response",
		ErrorType:  "incomplete",
		Status:     "pending",
	}
	if err := repo.Create(ctx, bc); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Update to "fixed" -- should set fixed_at
	if err := repo.UpdateStatus(ctx, bc.ID, "fixed"); err != nil {
		t.Fatalf("UpdateStatus to fixed failed: %v", err)
	}

	found, err := repo.FindByID(ctx, bc.ID)
	if err != nil {
		t.Fatalf("FindByID after UpdateStatus to fixed failed: %v", err)
	}
	if found.Status != "fixed" {
		t.Errorf("expected status 'fixed', got '%s'", found.Status)
	}
	if found.FixedAt == nil {
		t.Errorf("expected fixed_at to be set when status is 'fixed', got nil")
	}
	if time.Since(*found.FixedAt) > 5*time.Second {
		t.Errorf("expected fixed_at to be recent, got %v", *found.FixedAt)
	}

	// Update to "verified" -- should set verified_at
	if err := repo.UpdateStatus(ctx, bc.ID, "verified"); err != nil {
		t.Fatalf("UpdateStatus to verified failed: %v", err)
	}

	found2, err := repo.FindByID(ctx, bc.ID)
	if err != nil {
		t.Fatalf("FindByID after UpdateStatus to verified failed: %v", err)
	}
	if found2.Status != "verified" {
		t.Errorf("expected status 'verified', got '%s'", found2.Status)
	}
	if found2.VerifiedAt == nil {
		t.Errorf("expected verified_at to be set when status is 'verified', got nil")
	}
	if time.Since(*found2.VerifiedAt) > 5*time.Second {
		t.Errorf("expected verified_at to be recent, got %v", *found2.VerifiedAt)
	}
}
