package repository

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupTenderTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.Tender{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestTenderRepo_Create(t *testing.T) {
	db := setupTenderTestDB(t)
	repo := NewTenderRepository(db)
	ctx := context.Background()

	tender := &model.Tender{
		Title:       "5000吨螺纹钢采购招标",
		Region:      "上海",
		Category:    "螺纹钢",
		Budget:      20000000,
		Deadline:    time.Now().AddDate(0, 0, 30),
		BidDeadline: time.Now().AddDate(0, 0, 35),
		Status:      "open",
		SourceURL:   "https://example.com/tender/1",
		Description: "需要采购HRB400E规格螺纹钢",
	}
	if err := repo.Create(ctx, tender); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if tender.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}
	if tender.Title != "5000吨螺纹钢采购招标" {
		t.Errorf("expected title '5000吨螺纹钢采购招标', got '%s'", tender.Title)
	}
}

func TestTenderRepo_FindByRegion(t *testing.T) {
	db := setupTenderTestDB(t)
	repo := NewTenderRepository(db)
	ctx := context.Background()

	// Create tenders in different regions
	regions := []string{"上海", "北京", "上海", "广州"}
	for i, region := range regions {
		tender := &model.Tender{
			Title:       "招标项目",
			Region:      region,
			Category:    "螺纹钢",
			Status:      "open",
			Deadline:    time.Now().AddDate(0, 0, 30),
			BidDeadline: time.Now().AddDate(0, 0, 35),
		}
		if err := repo.Create(ctx, tender); err != nil {
			t.Fatalf("Create tender %d failed: %v", i, err)
		}
	}

	// Find by 上海
	results, err := repo.FindByRegion(ctx, "上海")
	if err != nil {
		t.Fatalf("FindByRegion failed: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("expected 2 tenders in 上海, got %d", len(results))
	}
	for _, r := range results {
		if r.Region != "上海" {
			t.Errorf("expected region '上海', got '%s'", r.Region)
		}
	}

	// Find non-existent region
	results, err = repo.FindByRegion(ctx, "深圳")
	if err != nil {
		t.Fatalf("FindByRegion for non-existent region failed: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 tenders in 深圳, got %d", len(results))
	}
}

func TestTenderRepo_FindByCategory(t *testing.T) {
	db := setupTenderTestDB(t)
	repo := NewTenderRepository(db)
	ctx := context.Background()

	// Create tenders in different categories
	categories := []string{"螺纹钢", "热卷", "螺纹钢", "冷轧"}
	for i, category := range categories {
		tender := &model.Tender{
			Title:       "招标项目",
			Region:      "上海",
			Category:    category,
			Status:      "open",
			Deadline:    time.Now().AddDate(0, 0, 30),
			BidDeadline: time.Now().AddDate(0, 0, 35),
		}
		if err := repo.Create(ctx, tender); err != nil {
			t.Fatalf("Create tender %d failed: %v", i, err)
		}
	}

	// Find by 螺纹钢
	results, err := repo.FindByCategory(ctx, "螺纹钢")
	if err != nil {
		t.Fatalf("FindByCategory failed: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("expected 2 tenders for 螺纹钢, got %d", len(results))
	}
	for _, r := range results {
		if r.Category != "螺纹钢" {
			t.Errorf("expected category '螺纹钢', got '%s'", r.Category)
		}
	}

	// Find non-existent category
	results, err = repo.FindByCategory(ctx, "不锈钢")
	if err != nil {
		t.Fatalf("FindByCategory for non-existent category failed: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 tenders for 不锈钢, got %d", len(results))
	}
}
