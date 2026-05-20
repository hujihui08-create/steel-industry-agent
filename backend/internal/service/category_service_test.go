package service

import (
	"context"
	"testing"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupCategorySvcTestDB(t *testing.T) (*gorm.DB, *CategoryService) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.Category{}, &model.SteelPrice{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	categoryRepo := repository.NewCategoryRepository(db)
	priceRepo := repository.NewSteelPriceRepository(db)
	svc := NewCategoryService(categoryRepo, priceRepo)
	return db, svc
}

func seedCategorySvcData(t *testing.T, db *gorm.DB) {
	t.Helper()
	categories := []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
		{Name: "热卷", Type: "spot", Status: "enabled", SortOrder: 2},
		{Name: "冷轧", Type: "spot", Status: "disabled", SortOrder: 3},
		{Name: "螺纹钢期货", Type: "futures", Status: "enabled", SortOrder: 4},
	}
	for i := range categories {
		if err := db.Create(&categories[i]).Error; err != nil {
			t.Fatalf("failed to seed category: %v", err)
		}
	}
}

func TestCategoryService_ListCategories(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	categories, err := svc.ListCategories(ctx, "", "")
	if err != nil {
		t.Fatalf("ListCategories failed: %v", err)
	}
	if len(categories) != 4 {
		t.Errorf("expected 4 categories, got %d", len(categories))
	}
}

func TestCategoryService_ListCategories_TypeFilter(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	spot, err := svc.ListCategories(ctx, "spot", "")
	if err != nil {
		t.Fatalf("ListCategories with spot filter failed: %v", err)
	}
	if len(spot) != 3 {
		t.Errorf("expected 3 spot categories, got %d", len(spot))
	}
}

func TestCategoryService_CreateCategory(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	created, err := svc.CreateCategory(ctx, CreateCategoryRequest{
		Name:      "镀锌板",
		Type:      "spot",
		SortOrder: 5,
	})
	if err != nil {
		t.Fatalf("CreateCategory failed: %v", err)
	}
	if created.ID == 0 {
		t.Error("expected ID to be assigned")
	}
	if created.Status != "enabled" {
		t.Errorf("expected status 'enabled', got '%s'", created.Status)
	}
}

func TestCategoryService_CreateCategory_Duplicate(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	_, err := svc.CreateCategory(ctx, CreateCategoryRequest{
		Name:      "螺纹钢",
		Type:      "spot",
		SortOrder: 99,
	})
	if err == nil {
		t.Error("expected duplicate error, got nil")
	}
}

func TestCategoryService_CreateCategory_DifferentType(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	created, err := svc.CreateCategory(ctx, CreateCategoryRequest{
		Name:      "螺纹钢",
		Type:      "futures",
		SortOrder: 5,
	})
	if err != nil {
		t.Fatalf("CreateCategory with different type should succeed: %v", err)
	}
	if created.ID == 0 {
		t.Error("expected ID to be assigned")
	}
}

func TestCategoryService_UpdateCategory(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	categories, _ := svc.ListCategories(ctx, "", "")
	updated, err := svc.UpdateCategory(ctx, categories[0].ID, UpdateCategoryRequest{
		Name:      "螺纹钢(更新)",
		SortOrder: 10,
	})
	if err != nil {
		t.Fatalf("UpdateCategory failed: %v", err)
	}
	if updated.Name != "螺纹钢(更新)" {
		t.Errorf("expected name '螺纹钢(更新)', got '%s'", updated.Name)
	}
}

func TestCategoryService_UpdateCategory_NotFound(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	_, err := svc.UpdateCategory(ctx, 999, UpdateCategoryRequest{Name: "不存在"})
	if err == nil {
		t.Error("expected error for non-existent category")
	}
}

func TestCategoryService_DeleteCategory(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	categories, _ := svc.ListCategories(ctx, "", "")
	if err := svc.DeleteCategory(ctx, categories[0].ID); err != nil {
		t.Fatalf("DeleteCategory failed: %v", err)
	}

	all, _ := svc.ListCategories(ctx, "", "")
	if len(all) != 3 {
		t.Errorf("expected 3 categories after delete, got %d", len(all))
	}
}

func TestCategoryService_DeleteCategory_NotFound(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	err := svc.DeleteCategory(ctx, 999)
	if err == nil {
		t.Error("expected error for non-existent category")
	}
}

func TestCategoryService_DeleteCategory_WithPrices(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	price := &model.SteelPrice{
		Category:  "螺纹钢",
		Spec:      "HRB400E 20mm",
		Price:     3850,
		Change:    12,
		ChangePct: 0.31,
		Region:    "上海",
		Source:    "test",
	}
	if err := db.Create(price).Error; err != nil {
		t.Fatalf("failed to create test price: %v", err)
	}

	categories, _ := svc.ListCategories(ctx, "", "")
	var rebarID uint
	for _, c := range categories {
		if c.Name == "螺纹钢" {
			rebarID = c.ID
			break
		}
	}

	err := svc.DeleteCategory(ctx, rebarID)
	if err == nil {
		t.Error("expected error when deleting category with associated prices")
	}
}

func TestCategoryService_ToggleCategory(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	categories, _ := svc.ListCategories(ctx, "", "")
	toggled, err := svc.ToggleCategory(ctx, categories[0].ID)
	if err != nil {
		t.Fatalf("ToggleCategory failed: %v", err)
	}
	if toggled.Status != "disabled" {
		t.Errorf("expected status 'disabled', got '%s'", toggled.Status)
	}

	toggled, err = svc.ToggleCategory(ctx, categories[0].ID)
	if err != nil {
		t.Fatalf("ToggleCategory second call failed: %v", err)
	}
	if toggled.Status != "enabled" {
		t.Errorf("expected status 'enabled', got '%s'", toggled.Status)
	}
}

func TestCategoryService_GetEnabledCategories(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	resp, err := svc.GetEnabledCategories(ctx)
	if err != nil {
		t.Fatalf("GetEnabledCategories failed: %v", err)
	}
	if len(resp.Spot) != 2 {
		t.Errorf("expected 2 enabled spot categories, got %d", len(resp.Spot))
	}
	if len(resp.Futures) != 1 {
		t.Errorf("expected 1 enabled futures category, got %d", len(resp.Futures))
	}
	if resp.Futures[0].Name != "螺纹钢期货" {
		t.Errorf("expected '螺纹钢期货', got '%s'", resp.Futures[0].Name)
	}
}

func TestCategoryService_GetEnabledCategoryNames(t *testing.T) {
	db, svc := setupCategorySvcTestDB(t)
	seedCategorySvcData(t, db)
	ctx := context.Background()

	names, err := svc.GetEnabledCategoryNames(ctx)
	if err != nil {
		t.Fatalf("GetEnabledCategoryNames failed: %v", err)
	}
	if len(names) != 3 {
		t.Errorf("expected 3 enabled category names, got %d", len(names))
	}

	enabledSet := make(map[string]bool, len(names))
	for _, n := range names {
		enabledSet[n] = true
	}
	if !enabledSet["螺纹钢"] || !enabledSet["热卷"] || !enabledSet["螺纹钢期货"] {
		t.Errorf("unexpected enabled names: %v", names)
	}
}
