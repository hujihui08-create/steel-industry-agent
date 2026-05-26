package repository

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupSteelPriceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.SteelPrice{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func seedSteelPrices(t *testing.T, db *gorm.DB, prices []*model.SteelPrice) {
	t.Helper()
	for _, p := range prices {
		if err := db.Create(p).Error; err != nil {
			t.Fatalf("failed to seed steel price: %v", err)
		}
	}
}

func mustParseDate(t *testing.T, s string) time.Time {
	t.Helper()
	parsed, err := time.Parse("2006-01-02", s)
	if err != nil {
		t.Fatalf("failed to parse date %q: %v", s, err)
	}
	return parsed
}

// ---------------- Create ----------------

func TestSteelPriceRepo_Create(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	price := &model.SteelPrice{
		Category:  "螺纹钢",
		Spec:      "HRB400E 20mm",
		Price:     3950.00,
		Change:    12.00,
		ChangePct: 0.31,
		Region:    "上海",
		Source:    "我的钢铁网",
		PriceDate: mustParseDate(t, "2026-05-26"),
	}
	if err := repo.Create(ctx, price); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if price.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}
}

// ---------------- FindByID ----------------

func TestSteelPriceRepo_FindByID(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{
			Category:  "螺纹钢",
			Spec:      "HRB400E 20mm",
			Price:     3950.00,
			Region:    "上海",
			Source:    "我的钢铁网",
			PriceDate: mustParseDate(t, "2026-05-26"),
		},
	})

	found, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Fatalf("FindByID failed: %v", err)
	}
	if found.Category != "螺纹钢" {
		t.Errorf("expected category '螺纹钢', got '%s'", found.Category)
	}
	if found.Price != 3950.00 {
		t.Errorf("expected price 3950.00, got %.2f", found.Price)
	}

	_, err = repo.FindByID(ctx, 999)
	if err == nil {
		t.Error("expected error for non-existent ID")
	}
}

// ---------------- FindAll ----------------

func TestSteelPriceRepo_FindAll(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-24")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-25")},
		{Category: "冷轧", Spec: "SPCC 1.0mm", Price: 4520, Region: "广州", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "中厚板", Spec: "Q235B 20mm", Price: 4100, Region: "北京", PriceDate: mustParseDate(t, "2026-05-23")},
	})

	tests := []struct {
		name   string
		limit  int
		offset int
		want   int
	}{
		{"all records", 10, 0, 4},
		{"limit 2", 2, 0, 2},
		{"offset 2", 10, 2, 2},
		{"limit 1 offset 1", 1, 1, 1},
		{"beyond range", 10, 10, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prices, err := repo.FindAll(ctx, tt.limit, tt.offset)
			if err != nil {
				t.Fatalf("FindAll failed: %v", err)
			}
			if len(prices) != tt.want {
				t.Errorf("expected %d records, got %d", tt.want, len(prices))
			}
		})
	}
}

// ---------------- FindByCategory ----------------

func TestSteelPriceRepo_FindByCategory(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "螺纹钢", Spec: "HRB400E 22mm", Price: 3970, Region: "北京", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	prices, err := repo.FindByCategory(ctx, "螺纹钢")
	if err != nil {
		t.Fatalf("FindByCategory failed: %v", err)
	}
	if len(prices) != 2 {
		t.Errorf("expected 2 records for 螺纹钢, got %d", len(prices))
	}
	for _, p := range prices {
		if p.Category != "螺纹钢" {
			t.Errorf("expected category '螺纹钢', got '%s'", p.Category)
		}
	}

	// Non-existent category
	prices, err = repo.FindByCategory(ctx, "不锈钢")
	if err != nil {
		t.Fatalf("FindByCategory for non-existent category failed: %v", err)
	}
	if len(prices) != 0 {
		t.Errorf("expected 0 records for 不锈钢, got %d", len(prices))
	}
}

// ---------------- FindByRegion ----------------

func TestSteelPriceRepo_FindByRegion(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "冷轧", Spec: "SPCC 1.0mm", Price: 4520, Region: "广州", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	prices, err := repo.FindByRegion(ctx, "上海")
	if err != nil {
		t.Fatalf("FindByRegion failed: %v", err)
	}
	if len(prices) != 2 {
		t.Errorf("expected 2 records for 上海, got %d", len(prices))
	}

	prices, err = repo.FindByRegion(ctx, "深圳")
	if err != nil {
		t.Fatalf("FindByRegion for non-existent region failed: %v", err)
	}
	if len(prices) != 0 {
		t.Errorf("expected 0 records for 深圳, got %d", len(prices))
	}
}

// ---------------- FindByDateRange ----------------

func TestSteelPriceRepo_FindByDateRange(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3900, Region: "上海", PriceDate: mustParseDate(t, "2026-05-24")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3930, Region: "上海", PriceDate: mustParseDate(t, "2026-05-25")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-25")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3880, Region: "上海", PriceDate: mustParseDate(t, "2026-05-23")},
	})

	t.Run("all categories in range", func(t *testing.T) {
		start := mustParseDate(t, "2026-05-24")
		end := mustParseDate(t, "2026-05-26")
		prices, err := repo.FindByDateRange(ctx, "", start, end)
		if err != nil {
			t.Fatalf("FindByDateRange failed: %v", err)
		}
		if len(prices) != 4 {
			t.Errorf("expected 4 records, got %d", len(prices))
		}
	})

	t.Run("category filtered in range", func(t *testing.T) {
		start := mustParseDate(t, "2026-05-24")
		end := mustParseDate(t, "2026-05-26")
		prices, err := repo.FindByDateRange(ctx, "螺纹钢", start, end)
		if err != nil {
			t.Fatalf("FindByDateRange with category failed: %v", err)
		}
		if len(prices) != 3 {
			t.Errorf("expected 3 螺纹钢 records, got %d", len(prices))
		}
		for _, p := range prices {
			if p.Category != "螺纹钢" {
				t.Errorf("expected category '螺纹钢', got '%s'", p.Category)
			}
		}
	})

	t.Run("no matching date range", func(t *testing.T) {
		start := mustParseDate(t, "2026-01-01")
		end := mustParseDate(t, "2026-01-31")
		prices, err := repo.FindByDateRange(ctx, "", start, end)
		if err != nil {
			t.Fatalf("FindByDateRange on empty range failed: %v", err)
		}
		if len(prices) != 0 {
			t.Errorf("expected 0 records, got %d", len(prices))
		}
	})

	t.Run("order by price_date ASC", func(t *testing.T) {
		start := mustParseDate(t, "2026-05-23")
		end := mustParseDate(t, "2026-05-26")
		prices, err := repo.FindByDateRange(ctx, "螺纹钢", start, end)
		if err != nil {
			t.Fatalf("FindByDateRange failed: %v", err)
		}
		for i := 1; i < len(prices); i++ {
			if prices[i].PriceDate.Before(prices[i-1].PriceDate) {
				t.Errorf("expected ASC order by price_date, got out of order at index %d", i)
			}
		}
	})
}

// ---------------- FindLatest ----------------

func TestSteelPriceRepo_FindLatest(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3900, Region: "上海", PriceDate: mustParseDate(t, "2026-05-24")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3930, Region: "上海", PriceDate: mustParseDate(t, "2026-05-25")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	latest, err := repo.FindLatest(ctx, "螺纹钢")
	if err != nil {
		t.Fatalf("FindLatest failed: %v", err)
	}
	if latest.Price != 3950.00 {
		t.Errorf("expected latest price 3950.00, got %.2f", latest.Price)
	}
	expectedDate := mustParseDate(t, "2026-05-26")
	if !latest.PriceDate.Equal(expectedDate) {
		t.Errorf("expected price_date %v, got %v", expectedDate, latest.PriceDate)
	}

	_, err = repo.FindLatest(ctx, "不锈钢")
	if err == nil {
		t.Error("expected error for non-existent category")
	}
}

// ---------------- FindByCategoryAndRegion ----------------

func TestSteelPriceRepo_FindByCategoryAndRegion(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3960, Region: "北京", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3860, Region: "广州", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	t.Run("both category and region", func(t *testing.T) {
		prices, err := repo.FindByCategoryAndRegion(ctx, "螺纹钢", "上海")
		if err != nil {
			t.Fatalf("FindByCategoryAndRegion failed: %v", err)
		}
		if len(prices) != 1 {
			t.Errorf("expected 1 record, got %d", len(prices))
		}
	})

	t.Run("only category", func(t *testing.T) {
		prices, err := repo.FindByCategoryAndRegion(ctx, "热卷", "")
		if err != nil {
			t.Fatalf("FindByCategoryAndRegion with only category failed: %v", err)
		}
		if len(prices) != 2 {
			t.Errorf("expected 2 records, got %d", len(prices))
		}
	})

	t.Run("only region", func(t *testing.T) {
		prices, err := repo.FindByCategoryAndRegion(ctx, "", "北京")
		if err != nil {
			t.Fatalf("FindByCategoryAndRegion with only region failed: %v", err)
		}
		if len(prices) != 1 {
			t.Errorf("expected 1 record, got %d", len(prices))
		}
	})

	t.Run("both empty returns all", func(t *testing.T) {
		prices, err := repo.FindByCategoryAndRegion(ctx, "", "")
		if err != nil {
			t.Fatalf("FindByCategoryAndRegion with no filters failed: %v", err)
		}
		if len(prices) != 4 {
			t.Errorf("expected all 4 records, got %d", len(prices))
		}
	})
}

// ---------------- FindForDailyReport ----------------

func TestSteelPriceRepo_FindForDailyReport(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "冷轧", Spec: "SPCC 1.0mm", Price: 4520, Region: "广州", PriceDate: mustParseDate(t, "2026-05-25")},
	})

	prices, err := repo.FindForDailyReport(ctx, mustParseDate(t, "2026-05-26"))
	if err != nil {
		t.Fatalf("FindForDailyReport failed: %v", err)
	}
	if len(prices) != 2 {
		t.Errorf("expected 2 records for 2026-05-26, got %d", len(prices))
	}

	prices, err = repo.FindForDailyReport(ctx, mustParseDate(t, "2026-01-01"))
	if err != nil {
		t.Fatalf("FindForDailyReport on empty date failed: %v", err)
	}
	if len(prices) != 0 {
		t.Errorf("expected 0 records, got %d", len(prices))
	}
}

// ---------------- FindForWeeklyReport ----------------

func TestSteelPriceRepo_FindForWeeklyReport(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3900, Region: "上海", PriceDate: mustParseDate(t, "2026-05-19")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3910, Region: "上海", PriceDate: mustParseDate(t, "2026-05-20")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3930, Region: "上海", PriceDate: mustParseDate(t, "2026-05-23")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-25")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3960, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3820, Region: "上海", PriceDate: mustParseDate(t, "2026-05-23")},
	})

	start := mustParseDate(t, "2026-05-20")
	end := mustParseDate(t, "2026-05-25")
	prices, err := repo.FindForWeeklyReport(ctx, start, end)
	if err != nil {
		t.Fatalf("FindForWeeklyReport failed: %v", err)
	}
	if len(prices) != 4 {
		t.Errorf("expected 4 records in range 05-20 to 05-25, got %d", len(prices))
	}

	start = mustParseDate(t, "2026-04-01")
	end = mustParseDate(t, "2026-04-30")
	prices, err = repo.FindForWeeklyReport(ctx, start, end)
	if err != nil {
		t.Fatalf("FindForWeeklyReport on empty range failed: %v", err)
	}
	if len(prices) != 0 {
		t.Errorf("expected 0 records, got %d", len(prices))
	}
}

// ---------------- Count ----------------

func TestSteelPriceRepo_Count(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	count, err := repo.Count(ctx)
	if err != nil {
		t.Fatalf("Count on empty table failed: %v", err)
	}
	if count != 0 {
		t.Errorf("expected count 0, got %d", count)
	}

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "冷轧", Spec: "SPCC 1.0mm", Price: 4520, Region: "广州", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	count, err = repo.Count(ctx)
	if err != nil {
		t.Fatalf("Count after seed failed: %v", err)
	}
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	}
}

// ---------------- Update ----------------

func TestSteelPriceRepo_Update(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Change: 0, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	found, _ := repo.FindByID(ctx, 1)
	found.Price = 4000.00
	found.Change = 50.00
	found.ChangePct = 1.27
	if err := repo.Update(ctx, found); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	updated, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Fatalf("FindByID after update failed: %v", err)
	}
	if updated.Price != 4000.00 {
		t.Errorf("expected price 4000.00, got %.2f", updated.Price)
	}
	if updated.Change != 50.00 {
		t.Errorf("expected change 50.00, got %.2f", updated.Change)
	}
	if updated.ChangePct != 1.27 {
		t.Errorf("expected change_pct 1.27, got %.2f", updated.ChangePct)
	}
}

// ---------------- Delete ----------------

func TestSteelPriceRepo_Delete(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	if err := repo.Delete(ctx, 1); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, err := repo.FindByID(ctx, 1)
	if err == nil {
		t.Error("expected error after delete, record should not exist")
	}

	count, _ := repo.Count(ctx)
	if count != 0 {
		t.Errorf("expected count 0 after delete, got %d", count)
	}
}

// ---------------- BatchCreate ----------------

func TestSteelPriceRepo_BatchCreate(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	prices := []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "冷轧", Spec: "SPCC 1.0mm", Price: 4520, Region: "广州", PriceDate: mustParseDate(t, "2026-05-26")},
	}
	if err := repo.BatchCreate(ctx, prices); err != nil {
		t.Fatalf("BatchCreate failed: %v", err)
	}

	for _, p := range prices {
		if p.ID == 0 {
			t.Errorf("expected ID to be assigned for %s, got 0", p.Category)
		}
	}

	count, _ := repo.Count(ctx)
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	}
}

// ---------------- FindBySpec ----------------

func TestSteelPriceRepo_FindBySpec(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-24")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3960, Region: "北京", PriceDate: mustParseDate(t, "2026-05-25")},
		{Category: "螺纹钢", Spec: "HRB400E 22mm", Price: 3970, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
	})

	prices, err := repo.FindBySpec(ctx, "HRB400E 20mm", 10, 0)
	if err != nil {
		t.Fatalf("FindBySpec failed: %v", err)
	}
	if len(prices) != 2 {
		t.Errorf("expected 2 records for HRB400E 20mm, got %d", len(prices))
	}
	for _, p := range prices {
		if p.Spec != "HRB400E 20mm" {
			t.Errorf("expected spec 'HRB400E 20mm', got '%s'", p.Spec)
		}
	}

	// Verify DESC order by price_date
	for i := 1; i < len(prices); i++ {
		if prices[i].PriceDate.After(prices[i-1].PriceDate) {
			t.Errorf("expected DESC order by price_date, got out of order at index %d", i)
		}
	}

	// Non-existent spec
	prices, err = repo.FindBySpec(ctx, "NONEXIST", 10, 0)
	if err != nil {
		t.Fatalf("FindBySpec for non-existent spec failed: %v", err)
	}
	if len(prices) != 0 {
		t.Errorf("expected 0 records, got %d", len(prices))
	}
}

// ---------------- FindByCategoryWithPagination ----------------

func TestSteelPriceRepo_FindByCategoryWithPagination(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	seedSteelPrices(t, db, []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3950, Region: "上海", PriceDate: mustParseDate(t, "2026-05-24")},
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3960, Region: "北京", PriceDate: mustParseDate(t, "2026-05-25")},
		{Category: "螺纹钢", Spec: "HRB400E 22mm", Price: 3970, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "热卷", Spec: "Q235B 5.75mm", Price: 3850, Region: "上海", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "冷轧", Spec: "SPCC 1.0mm", Price: 4520, Region: "广州", PriceDate: mustParseDate(t, "2026-05-26")},
		{Category: "螺纹钢", Spec: "HRB400E 25mm", Price: 3980, Region: "上海", PriceDate: mustParseDate(t, "2026-05-23")},
	})

	t.Run("all filters empty", func(t *testing.T) {
		prices, count, err := repo.FindByCategoryWithPagination(ctx, "", "", "", 10, 0)
		if err != nil {
			t.Fatalf("FindByCategoryWithPagination failed: %v", err)
		}
		if count != 6 {
			t.Errorf("expected total count 6, got %d", count)
		}
		if len(prices) != 6 {
			t.Errorf("expected 6 records, got %d", len(prices))
		}
	})

	t.Run("filter by category", func(t *testing.T) {
		prices, count, err := repo.FindByCategoryWithPagination(ctx, "螺纹钢", "", "", 10, 0)
		if err != nil {
			t.Fatalf("FindByCategoryWithPagination by category failed: %v", err)
		}
		if count != 4 {
			t.Errorf("expected total count 4 for 螺纹钢, got %d", count)
		}
		if len(prices) != 4 {
			t.Errorf("expected 4 records, got %d", len(prices))
		}
	})

	t.Run("filter by category and region", func(t *testing.T) {
		prices, count, err := repo.FindByCategoryWithPagination(ctx, "螺纹钢", "", "上海", 10, 0)
		if err != nil {
			t.Fatalf("FindByCategoryWithPagination by category+region failed: %v", err)
		}
		if count != 3 {
			t.Errorf("expected total count 3 for 螺纹钢+上海, got %d", count)
		}
		if len(prices) != 3 {
			t.Errorf("expected 3 records, got %d", len(prices))
		}
	})

	t.Run("filter by category, spec and region", func(t *testing.T) {
		prices, count, err := repo.FindByCategoryWithPagination(ctx, "螺纹钢", "HRB400E 20mm", "上海", 10, 0)
		if err != nil {
			t.Fatalf("FindByCategoryWithPagination by all filters failed: %v", err)
		}
		if count != 1 {
			t.Errorf("expected total count 1, got %d", count)
		}
		if len(prices) != 1 {
			t.Errorf("expected 1 record, got %d", len(prices))
		}
	})

	t.Run("pagination limit 2 offset 1", func(t *testing.T) {
		prices, count, err := repo.FindByCategoryWithPagination(ctx, "螺纹钢", "", "", 2, 1)
		if err != nil {
			t.Fatalf("FindByCategoryWithPagination with pagination failed: %v", err)
		}
		if count != 4 {
			t.Errorf("expected total count 4 (unaffected by pagination), got %d", count)
		}
		if len(prices) != 2 {
			t.Errorf("expected 2 records with limit 2 offset 1, got %d", len(prices))
		}
	})

	t.Run("no match returns zero", func(t *testing.T) {
		_, count, err := repo.FindByCategoryWithPagination(ctx, "不锈钢", "", "", 10, 0)
		if err != nil {
			t.Fatalf("FindByCategoryWithPagination for non-existent category failed: %v", err)
		}
		if count != 0 {
			t.Errorf("expected total count 0, got %d", count)
		}
	})
}

// ---------------- Edge Cases ----------------

func TestSteelPriceRepo_EmptyTable(t *testing.T) {
	db := setupSteelPriceTestDB(t)
	repo := NewSteelPriceRepository(db)
	ctx := context.Background()

	prices, err := repo.FindAll(ctx, 10, 0)
	if err != nil {
		t.Fatalf("FindAll on empty table failed: %v", err)
	}
	if len(prices) != 0 {
		t.Errorf("expected 0 records, got %d", len(prices))
	}

	prices, err = repo.FindByCategory(ctx, "螺纹钢")
	if err != nil {
		t.Fatalf("FindByCategory on empty table failed: %v", err)
	}
	if len(prices) != 0 {
		t.Errorf("expected 0 records, got %d", len(prices))
	}

	count, err := repo.Count(ctx)
	if err != nil {
		t.Fatalf("Count on empty table failed: %v", err)
	}
	if count != 0 {
		t.Errorf("expected count 0, got %d", count)
	}
}
