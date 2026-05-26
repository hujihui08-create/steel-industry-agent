package repository

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupCategoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.Category{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func seedCategories(t *testing.T, db *gorm.DB, categories []model.Category) {
	t.Helper()
	for i := range categories {
		if err := db.Create(&categories[i]).Error; err != nil {
			t.Fatalf("failed to seed category: %v", err)
		}
	}
}

func TestCategoryRepo_FindAll(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
		{Name: "热卷", Type: "spot", Status: "enabled", SortOrder: 2},
		{Name: "螺纹钢期货", Type: "futures", Status: "disabled", SortOrder: 3},
	})

	categories, err := repo.FindAll(ctx, "", "", nil)
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	if len(categories) != 3 {
		t.Errorf("expected 3 categories, got %d", len(categories))
	}
	if categories[0].Name != "螺纹钢" {
		t.Errorf("expected first category '螺纹钢', got '%s'", categories[0].Name)
	}
}

func TestCategoryRepo_FindAll_TypeFilter(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
		{Name: "螺纹钢期货", Type: "futures", Status: "enabled", SortOrder: 2},
	})

	spotCategories, err := repo.FindAll(ctx, "spot", "", nil)
	if err != nil {
		t.Fatalf("FindAll with spot filter failed: %v", err)
	}
	if len(spotCategories) != 1 {
		t.Errorf("expected 1 spot category, got %d", len(spotCategories))
	}
	if spotCategories[0].Type != "spot" {
		t.Errorf("expected type 'spot', got '%s'", spotCategories[0].Type)
	}

	futuresCategories, err := repo.FindAll(ctx, "futures", "", nil)
	if err != nil {
		t.Fatalf("FindAll with futures filter failed: %v", err)
	}
	if len(futuresCategories) != 1 {
		t.Errorf("expected 1 futures category, got %d", len(futuresCategories))
	}
}

func TestCategoryRepo_FindAll_StatusFilter(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
		{Name: "热卷", Type: "spot", Status: "disabled", SortOrder: 2},
	})

	enabled, err := repo.FindAll(ctx, "", "enabled", nil)
	if err != nil {
		t.Fatalf("FindAll with enabled filter failed: %v", err)
	}
	if len(enabled) != 1 {
		t.Errorf("expected 1 enabled category, got %d", len(enabled))
	}

	disabled, err := repo.FindAll(ctx, "", "disabled", nil)
	if err != nil {
		t.Fatalf("FindAll with disabled filter failed: %v", err)
	}
	if len(disabled) != 1 {
		t.Errorf("expected 1 disabled category, got %d", len(disabled))
	}
}

func TestCategoryRepo_FindByID(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
	})

	found, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Fatalf("FindByID failed: %v", err)
	}
	if found.Name != "螺纹钢" {
		t.Errorf("expected name '螺纹钢', got '%s'", found.Name)
	}

	_, err = repo.FindByID(ctx, 999)
	if err == nil {
		t.Error("expected error for non-existent ID")
	}
}

func TestCategoryRepo_FindByNameAndType(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
		{Name: "螺纹钢", Type: "futures", Status: "enabled", SortOrder: 2},
	})

	found, err := repo.FindByNameAndType(ctx, "螺纹钢", "spot", nil)
	if err != nil {
		t.Fatalf("FindByNameAndType failed: %v", err)
	}
	if found.Type != "spot" {
		t.Errorf("expected type 'spot', got '%s'", found.Type)
	}

	futuresFound, err := repo.FindByNameAndType(ctx, "螺纹钢", "futures", nil)
	if err != nil {
		t.Fatalf("FindByNameAndType for futures failed: %v", err)
	}
	if futuresFound.Type != "futures" {
		t.Errorf("expected type 'futures', got '%s'", futuresFound.Type)
	}

	_, err = repo.FindByNameAndType(ctx, "不存在的品种", "spot", nil)
	if err == nil {
		t.Error("expected error for non-existent category")
	}
}

func TestCategoryRepo_FindEnabled(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
		{Name: "热卷", Type: "spot", Status: "enabled", SortOrder: 2},
		{Name: "冷轧", Type: "spot", Status: "disabled", SortOrder: 3},
	})

	enabled, err := repo.FindEnabled(ctx)
	if err != nil {
		t.Fatalf("FindEnabled failed: %v", err)
	}
	if len(enabled) != 2 {
		t.Errorf("expected 2 enabled categories, got %d", len(enabled))
	}
	for _, c := range enabled {
		if c.Status != "enabled" {
			t.Errorf("category '%s' has unexpected status '%s'", c.Name, c.Status)
		}
	}
}

func TestCategoryRepo_FindEnabledNames(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
		{Name: "热卷", Type: "spot", Status: "enabled", SortOrder: 2},
		{Name: "冷轧", Type: "spot", Status: "disabled", SortOrder: 3},
	})

	names, err := repo.FindEnabledNames(ctx)
	if err != nil {
		t.Fatalf("FindEnabledNames failed: %v", err)
	}
	if len(names) != 2 {
		t.Errorf("expected 2 enabled names, got %d", len(names))
	}
	if names[0] != "螺纹钢" || names[1] != "热卷" {
		t.Errorf("unexpected names: %v", names)
	}
}

func TestCategoryRepo_Create(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	category := &model.Category{
		Name:      "镀锌板",
		Type:      "spot",
		Status:    "enabled",
		SortOrder: 5,
	}
	if err := repo.Create(ctx, category); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if category.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}

	found, err := repo.FindByID(ctx, category.ID)
	if err != nil {
		t.Fatalf("FindByID after create failed: %v", err)
	}
	if found.Name != "镀锌板" {
		t.Errorf("expected name '镀锌板', got '%s'", found.Name)
	}
}

func TestCategoryRepo_Update(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
	})

	found, _ := repo.FindByID(ctx, 1)
	found.Name = "螺纹钢(更新)"
	found.SortOrder = 10
	if err := repo.Update(ctx, found); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	updated, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Fatalf("FindByID after update failed: %v", err)
	}
	if updated.Name != "螺纹钢(更新)" {
		t.Errorf("expected name '螺纹钢(更新)', got '%s'", updated.Name)
	}
	if updated.SortOrder != 10 {
		t.Errorf("expected sort_order 10, got %d", updated.SortOrder)
	}
}

func TestCategoryRepo_Delete(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
	})

	if err := repo.Delete(ctx, 1); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, err := repo.FindByID(ctx, 1)
	if err == nil {
		t.Error("expected error after delete, record should not exist")
	}
}

func TestCategoryRepo_ToggleStatus(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	seedCategories(t, db, []model.Category{
		{Name: "螺纹钢", Type: "spot", Status: "enabled", SortOrder: 1},
	})

	toggled, err := repo.ToggleStatus(ctx, 1)
	if err != nil {
		t.Fatalf("ToggleStatus failed: %v", err)
	}
	if toggled.Status != "disabled" {
		t.Errorf("expected status 'disabled', got '%s'", toggled.Status)
	}

	toggled, err = repo.ToggleStatus(ctx, 1)
	if err != nil {
		t.Fatalf("ToggleStatus second call failed: %v", err)
	}
	if toggled.Status != "enabled" {
		t.Errorf("expected status 'enabled', got '%s'", toggled.Status)
	}
}

func TestCategoryRepo_ToggleStatus_NotFound(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	_, err := repo.ToggleStatus(ctx, 999)
	if err == nil {
		t.Error("expected error for non-existent category ID")
	}
}

func TestCategoryRepo_EmptyTable(t *testing.T) {
	db := setupCategoryTestDB(t)
	repo := NewCategoryRepository(db)
	ctx := context.Background()

	all, err := repo.FindAll(ctx, "", "", nil)
	if err != nil {
		t.Fatalf("FindAll on empty table failed: %v", err)
	}
	if len(all) != 0 {
		t.Errorf("expected 0 categories, got %d", len(all))
	}

	enabled, err := repo.FindEnabled(ctx)
	if err != nil {
		t.Fatalf("FindEnabled on empty table failed: %v", err)
	}
	if len(enabled) != 0 {
		t.Errorf("expected 0 enabled categories, got %d", len(enabled))
	}

	names, err := repo.FindEnabledNames(ctx)
	if err != nil {
		t.Fatalf("FindEnabledNames on empty table failed: %v", err)
	}
	if len(names) != 0 {
		t.Errorf("expected 0 names, got %d", len(names))
	}
}
