package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupQuotationTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.Quotation{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestQuotationRepo_Create(t *testing.T) {
	db := setupQuotationTestDB(t)
	repo := NewQuotationRepository(db)
	ctx := context.Background()

	q := &model.Quotation{
		UserID:       1,
		Title:        "螺纹钢报价单",
		CustomerName: "测试客户",
		Category:     "螺纹钢",
		Spec:         "HRB400E 20mm",
		Quantity:     100,
		Unit:         "吨",
		TotalPrice:   385000,
		Status:       "draft",
	}
	if err := repo.Create(ctx, q); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if q.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}
	if q.UserID != 1 {
		t.Errorf("expected UserID 1, got %d", q.UserID)
	}
}

func TestQuotationRepo_FindByID(t *testing.T) {
	db := setupQuotationTestDB(t)
	repo := NewQuotationRepository(db)
	ctx := context.Background()

	q := &model.Quotation{
		UserID:     1,
		Category:   "热卷",
		Spec:       "5.5mm",
		Quantity:   200,
		TotalPrice: 840000,
		Status:     "draft",
	}
	if err := repo.Create(ctx, q); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	found, err := repo.FindByID(ctx, q.ID)
	if err != nil {
		t.Fatalf("FindByID failed: %v", err)
	}
	if found.Category != "热卷" {
		t.Errorf("expected category '热卷', got '%s'", found.Category)
	}
	if found.TotalPrice != 840000 {
		t.Errorf("expected TotalPrice 840000, got %.0f", found.TotalPrice)
	}

	_, err = repo.FindByID(ctx, 999)
	if err == nil {
		t.Error("expected error for non-existent ID")
	}
}

func TestQuotationRepo_FindByUserID(t *testing.T) {
	db := setupQuotationTestDB(t)
	repo := NewQuotationRepository(db)
	ctx := context.Background()

	// Create quotations for user 1
	for i := 0; i < 3; i++ {
		q := &model.Quotation{
			UserID:     1,
			Category:   "螺纹钢",
			TotalPrice: float64((i + 1) * 100000),
			Status:     "draft",
		}
		if err := repo.Create(ctx, q); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	// Create one for user 2
	q2 := &model.Quotation{
		UserID:     2,
		Category:   "冷轧",
		TotalPrice: 450000,
		Status:     "sent",
	}
	if err := repo.Create(ctx, q2); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Find by user 1
	results, err := repo.FindByUserID(ctx, 1)
	if err != nil {
		t.Fatalf("FindByUserID failed: %v", err)
	}
	if len(results) != 3 {
		t.Errorf("expected 3 quotations for user 1, got %d", len(results))
	}
	for _, r := range results {
		if r.UserID != 1 {
			t.Errorf("expected UserID 1, got %d", r.UserID)
		}
	}

	// No quotations for user 999
	results, err = repo.FindByUserID(ctx, 999)
	if err != nil {
		t.Fatalf("FindByUserID failed: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 quotations for unknown user, got %d", len(results))
	}
}

func TestQuotationRepo_UpdateStatus(t *testing.T) {
	db := setupQuotationTestDB(t)
	repo := NewQuotationRepository(db)
	ctx := context.Background()

	q := &model.Quotation{
		UserID:     1,
		Category:   "螺纹钢",
		TotalPrice: 385000,
		Status:     "draft",
	}
	if err := repo.Create(ctx, q); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Update status
	q.Status = "sent"
	if err := repo.Update(ctx, q); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// Verify update
	found, err := repo.FindByID(ctx, q.ID)
	if err != nil {
		t.Fatalf("FindByID after update failed: %v", err)
	}
	if found.Status != "sent" {
		t.Errorf("expected status 'sent', got '%s'", found.Status)
	}
}
