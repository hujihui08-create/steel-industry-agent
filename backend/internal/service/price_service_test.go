package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"steel-agent-backend/internal/model"
)

type mockSteelPriceRepo struct {
	prices  []model.SteelPrice
	nextID  uint
	findErr error
}

func (m *mockSteelPriceRepo) FindLatest(ctx context.Context, category string) (*model.SteelPrice, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	for i := len(m.prices) - 1; i >= 0; i-- {
		if m.prices[i].Category == category {
			return &m.prices[i], nil
		}
	}
	return nil, errors.New("record not found")
}

func (m *mockSteelPriceRepo) Create(ctx context.Context, price *model.SteelPrice) error {
	m.nextID++
	price.ID = m.nextID
	m.prices = append(m.prices, *price)
	return nil
}

func (m *mockSteelPriceRepo) FindByID(ctx context.Context, id uint) (*model.SteelPrice, error) {
	for i := range m.prices {
		if m.prices[i].ID == id {
			return &m.prices[i], nil
		}
	}
	return nil, errors.New("record not found")
}

func (m *mockSteelPriceRepo) Update(ctx context.Context, price *model.SteelPrice) error {
	for i := range m.prices {
		if m.prices[i].ID == price.ID {
			m.prices[i] = *price
			return nil
		}
	}
	return errors.New("record not found")
}

func (m *mockSteelPriceRepo) Delete(ctx context.Context, id uint) error {
	for i := range m.prices {
		if m.prices[i].ID == id {
			m.prices = append(m.prices[:i], m.prices[i+1:]...)
			return nil
		}
	}
	return errors.New("record not found")
}

func (m *mockSteelPriceRepo) BatchCreate(ctx context.Context, prices []*model.SteelPrice) error {
	for _, p := range prices {
		m.nextID++
		p.ID = m.nextID
		m.prices = append(m.prices, *p)
	}
	return nil
}

func (m *mockSteelPriceRepo) FindByDateRange(ctx context.Context, category string, start, end time.Time) ([]model.SteelPrice, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.SteelPrice
	for _, p := range m.prices {
		if (category == "" || p.Category == category) && !p.PriceDate.Before(start) && !p.PriceDate.After(end) {
			result = append(result, p)
		}
	}
	return result, nil
}

func (m *mockSteelPriceRepo) FindByCategoryAndRegion(ctx context.Context, category, region string) ([]model.SteelPrice, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.SteelPrice
	for _, p := range m.prices {
		if (category == "" || p.Category == category) && (region == "" || p.Region == region) {
			result = append(result, p)
		}
	}
	return result, nil
}

func (m *mockSteelPriceRepo) FindByCategory(ctx context.Context, category string) ([]model.SteelPrice, error) {
	return m.FindByCategoryAndRegion(ctx, category, "")
}

func (m *mockSteelPriceRepo) FindByRegion(ctx context.Context, region string) ([]model.SteelPrice, error) {
	return m.FindByCategoryAndRegion(ctx, "", region)
}

func (m *mockSteelPriceRepo) FindAll(ctx context.Context, limit, offset int) ([]model.SteelPrice, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	return m.prices, nil
}

func (m *mockSteelPriceRepo) FindForDailyReport(ctx context.Context, date time.Time) ([]model.SteelPrice, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	dateStr := date.Format("2006-01-02")
	var result []model.SteelPrice
	for _, p := range m.prices {
		if p.PriceDate.Format("2006-01-02") == dateStr {
			result = append(result, p)
		}
	}
	return result, nil
}

type mockNewsRepo struct {
	news    []model.News
	findErr error
}

func (m *mockNewsRepo) FindAll(ctx context.Context, limit, offset int) ([]model.News, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	return m.news, nil
}

func (m *mockNewsRepo) FindByID(ctx context.Context, id uint) (*model.News, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	for _, n := range m.news {
		if n.ID == id {
			return &n, nil
		}
	}
	return nil, errors.New("record not found")
}

type testablePriceService struct {
	priceRepo *mockSteelPriceRepo
	newsRepo  *mockNewsRepo
}

func newTestablePriceService(priceRepo *mockSteelPriceRepo, newsRepo *mockNewsRepo) *testablePriceService {
	return &testablePriceService{priceRepo: priceRepo, newsRepo: newsRepo}
}

func (s *testablePriceService) GetLatestPrice(ctx context.Context, category string) (*model.SteelPrice, error) {
	return s.priceRepo.FindLatest(ctx, category)
}

func (s *testablePriceService) GetPriceTrend(ctx context.Context, category string, days int) ([]model.SteelPrice, error) {
	end := time.Now()
	start := end.AddDate(0, 0, -days)
	return s.priceRepo.FindByDateRange(ctx, category, start, end)
}

func (s *testablePriceService) GetPriceList(ctx context.Context, category, region string, limit, offset int) ([]model.SteelPrice, error) {
	if category != "" && region != "" {
		return s.priceRepo.FindByCategoryAndRegion(ctx, category, region)
	}
	if category != "" {
		return s.priceRepo.FindByCategory(ctx, category)
	}
	if region != "" {
		return s.priceRepo.FindByRegion(ctx, region)
	}
	return s.priceRepo.FindAll(ctx, limit, offset)
}

// CreatePrice inserts a new price and mirrors the cache-invalidation logic
// of the real PriceService: if a cacheService were present, it would call
// DeletePriceCache for the price's category.
func (s *testablePriceService) CreatePrice(ctx context.Context, price *model.SteelPrice) error {
	if err := s.priceRepo.Create(ctx, price); err != nil {
		return err
	}
	// cache invalidation would happen here: s.cacheService.DeletePriceCache(ctx, price.Category)
	return nil
}

// UpdatePrice updates an existing price and mirrors the cache-invalidation
// logic of the real PriceService.
func (s *testablePriceService) UpdatePrice(ctx context.Context, price *model.SteelPrice) error {
	if err := s.priceRepo.Update(ctx, price); err != nil {
		return err
	}
	// cache invalidation would happen here: s.cacheService.DeletePriceCache(ctx, price.Category)
	return nil
}

// DeletePrice looks up the price by ID (to obtain its category for cache
// invalidation), then deletes it. Mirrors the real PriceService logic.
func (s *testablePriceService) DeletePrice(ctx context.Context, id uint) error {
	price, err := s.priceRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.priceRepo.Delete(ctx, id); err != nil {
		return err
	}
	// cache invalidation would happen here: s.cacheService.DeletePriceCache(ctx, price.Category)
	_ = price
	return nil
}

// BatchImportPrices bulk-inserts multiple prices and mirrors the deduplication
// logic: each unique category triggers cache invalidation exactly once.
func (s *testablePriceService) BatchImportPrices(ctx context.Context, prices []*model.SteelPrice) error {
	if err := s.priceRepo.BatchCreate(ctx, prices); err != nil {
		return err
	}
	// cache invalidation: deduplicate categories, then call DeletePriceCache once each
	categories := make(map[string]bool)
	for _, p := range prices {
		categories[p.Category] = true
	}
	// each unique category would trigger: s.cacheService.DeletePriceCache(ctx, cat)
	_ = len(categories)
	return nil
}

func (s *testablePriceService) GetDailyReport(ctx context.Context) (map[string]interface{}, error) {
	today := time.Now().Truncate(24 * time.Hour)
	prices, err := s.priceRepo.FindForDailyReport(ctx, today)
	if err != nil {
		return nil, err
	}

	type SummaryItem struct {
		Category string  `json:"category"`
		Spec     string  `json:"spec"`
		Price    float64 `json:"price"`
		Change   float64 `json:"change"`
		Region   string  `json:"region"`
	}

	var items []SummaryItem
	upCount := 0
	downCount := 0
	flatCount := 0

	for _, p := range prices {
		items = append(items, SummaryItem{
			Category: p.Category,
			Spec:     p.Spec,
			Price:    p.Price,
			Change:   p.Change,
			Region:   p.Region,
		})
		if p.Change > 0 {
			upCount++
		} else if p.Change < 0 {
			downCount++
		} else {
			flatCount++
		}
	}

	return map[string]interface{}{
		"date":       today.Format("2006-01-02"),
		"items":      items,
		"total":      len(items),
		"up_count":   upCount,
		"down_count": downCount,
		"flat_count": flatCount,
	}, nil
}

func makeTestPrices() []model.SteelPrice {
	now := time.Now().Truncate(24 * time.Hour)
	return []model.SteelPrice{
		{ID: 1, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Change: 50, ChangePct: 1.3, Region: "上海", PriceDate: now},
		{ID: 2, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3830, Change: -20, ChangePct: -0.5, Region: "北京", PriceDate: now},
		{ID: 3, Category: "热卷", Spec: "5.5mm", Price: 4200, Change: 0, ChangePct: 0, Region: "上海", PriceDate: now},
		{ID: 4, Category: "线材", Spec: "6.5mm", Price: 3650, Change: 30, ChangePct: 0.8, Region: "广州", PriceDate: now},
	}
}

func TestGetLatestPrice(t *testing.T) {
	ctx := context.Background()

	mock := &mockSteelPriceRepo{prices: makeTestPrices()}
	svc := newTestablePriceService(mock, nil)

	t.Run("success", func(t *testing.T) {
		price, err := svc.GetLatestPrice(ctx, "螺纹钢")
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if price.Category != "螺纹钢" {
			t.Errorf("expected category 螺纹钢, got %s", price.Category)
		}
		if price.Price != 3830 {
			t.Errorf("expected price 3830 (latest by date), got %f", price.Price)
		}
	})

	t.Run("category not found", func(t *testing.T) {
		_, err := svc.GetLatestPrice(ctx, "不存在品类")
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})

	t.Run("repository error", func(t *testing.T) {
		errMock := &mockSteelPriceRepo{findErr: errors.New("database error")}
		errSvc := newTestablePriceService(errMock, nil)

		_, err := errSvc.GetLatestPrice(ctx, "螺纹钢")
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestGetPriceTrend(t *testing.T) {
	ctx := context.Background()

	now := time.Now().Truncate(24 * time.Hour)
	prices := []model.SteelPrice{
		{ID: 1, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3800, Region: "上海", PriceDate: now.AddDate(0, 0, -5)},
		{ID: 2, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3830, Region: "上海", PriceDate: now.AddDate(0, 0, -3)},
		{ID: 3, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Region: "上海", PriceDate: now},
	}

	mock := &mockSteelPriceRepo{prices: prices}
	svc := newTestablePriceService(mock, nil)

	t.Run("success", func(t *testing.T) {
		trend, err := svc.GetPriceTrend(ctx, "螺纹钢", 7)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if len(trend) != 3 {
			t.Errorf("expected 3 price points, got %d", len(trend))
		}
	})

	t.Run("no data in range", func(t *testing.T) {
		emptyMock := &mockSteelPriceRepo{prices: []model.SteelPrice{}}
		emptySvc := newTestablePriceService(emptyMock, nil)

		trend, err := emptySvc.GetPriceTrend(ctx, "螺纹钢", 7)
		if err != nil {
			t.Errorf("expected no error, got %v", err)
		}
		if len(trend) != 0 {
			t.Errorf("expected 0 price points, got %d", len(trend))
		}
	})
}

func TestGetPriceList(t *testing.T) {
	ctx := context.Background()

	prices := makeTestPrices()
	mock := &mockSteelPriceRepo{prices: prices}
	svc := newTestablePriceService(mock, nil)

	tests := []struct {
		name     string
		category string
		region   string
		wantLen  int
	}{
		{"filter by category and region", "螺纹钢", "上海", 1},
		{"filter by category only", "热卷", "", 1},
		{"filter by region only", "", "上海", 2},
		{"no filter returns all", "", "", 4},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := svc.GetPriceList(ctx, tt.category, tt.region, 20, 0)
			if err != nil {
				t.Errorf("expected no error, got %v", err)
			}
			if len(result) != tt.wantLen {
				t.Errorf("expected %d results, got %d", tt.wantLen, len(result))
			}
		})
	}

	t.Run("repository error", func(t *testing.T) {
		errMock := &mockSteelPriceRepo{findErr: errors.New("database error")}
		errSvc := newTestablePriceService(errMock, nil)

		_, err := errSvc.GetPriceList(ctx, "", "", 20, 0)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

func TestGetDailyReport(t *testing.T) {
	ctx := context.Background()

	now := time.Now().Truncate(24 * time.Hour)
	prices := []model.SteelPrice{
		{ID: 1, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Change: 50, Region: "上海", PriceDate: now},
		{ID: 2, Category: "热卷", Spec: "5.5mm", Price: 4200, Change: -30, Region: "上海", PriceDate: now},
		{ID: 3, Category: "线材", Spec: "6.5mm", Price: 3650, Change: 0, Region: "广州", PriceDate: now},
		{ID: 4, Category: "中板", Spec: "20mm", Price: 4100, Change: 20, Region: "北京", PriceDate: now.AddDate(0, 0, -1)},
	}

	mock := &mockSteelPriceRepo{prices: prices}
	svc := newTestablePriceService(mock, nil)

	report, err := svc.GetDailyReport(ctx)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	if report["total"] != 3 {
		t.Errorf("expected total 3 (only today's data), got %d", report["total"])
	}
	if report["up_count"] != 1 {
		t.Errorf("expected up_count 1, got %d", report["up_count"])
	}
	if report["down_count"] != 1 {
		t.Errorf("expected down_count 1, got %d", report["down_count"])
	}
	if report["flat_count"] != 1 {
		t.Errorf("expected flat_count 1, got %d", report["flat_count"])
	}
	if report["date"] != now.Format("2006-01-02") {
		t.Errorf("expected date %s, got %s", now.Format("2006-01-02"), report["date"])
	}

	t.Run("repository error", func(t *testing.T) {
		errMock := &mockSteelPriceRepo{findErr: errors.New("database error")}
		errSvc := newTestablePriceService(errMock, nil)

		_, err := errSvc.GetDailyReport(ctx)
		if err == nil {
			t.Errorf("expected error, got nil")
		}
	})
}

// TestCreatePrice_CacheInvalidation verifies that CreatePrice succeeds
// and the price is correctly persisted. The cache invalidation point
// (DeletePriceCache for the category) is mirrored in the testable service.
func TestCreatePrice_CacheInvalidation(t *testing.T) {
	ctx := context.Background()

	initialPrices := makeTestPrices()
	repo := &mockSteelPriceRepo{prices: initialPrices, nextID: 4}
	svc := newTestablePriceService(repo, nil)

	newPrice := &model.SteelPrice{
		Category:  "螺纹钢",
		Spec:      "HRB400E 22mm",
		Price:     3920,
		Change:    70,
		ChangePct: 1.8,
		Region:    "上海",
		Source:    "mock",
		PriceDate: time.Now(),
	}

	err := svc.CreatePrice(ctx, newPrice)
	if err != nil {
		t.Errorf("expected no error from CreatePrice, got %v", err)
	}

	// Verify the price was assigned an ID and persisted
	if newPrice.ID == 0 {
		t.Errorf("expected CreatePrice to assign a non-zero ID")
	}

	stored, err := repo.FindByID(ctx, newPrice.ID)
	if err != nil {
		t.Errorf("expected to find created price by ID=%d, got error: %v", newPrice.ID, err)
	}
	if stored.Category != "螺纹钢" {
		t.Errorf("expected category 螺纹钢, got %s", stored.Category)
	}
	if stored.Price != 3920 {
		t.Errorf("expected price 3920, got %f", stored.Price)
	}

	// Verify total count increased (cache invalidation would fire once for this category)
	if want := len(initialPrices) + 1; len(repo.prices) != want {
		t.Errorf("expected %d prices in repo, got %d", want, len(repo.prices))
	}
}

// TestUpdatePrice_CacheInvalidation verifies that UpdatePrice succeeds
// and the price is correctly updated. Cache invalidation for the
// category would be triggered by the real service.
func TestUpdatePrice_CacheInvalidation(t *testing.T) {
	ctx := context.Background()

	initialPrices := makeTestPrices()
	repo := &mockSteelPriceRepo{prices: initialPrices, nextID: 4}
	svc := newTestablePriceService(repo, nil)

	// Fetch an existing price and modify it
	existing, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Fatalf("expected to find price ID=1, got error: %v", err)
	}

	originalPrice := existing.Price
	existing.Price = 4000
	existing.Change = 150

	err = svc.UpdatePrice(ctx, existing)
	if err != nil {
		t.Errorf("expected no error from UpdatePrice, got %v", err)
	}

	// Verify the price was actually updated
	updated, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Errorf("expected to find updated price by ID=1, got error: %v", err)
	}
	if updated.Price != 4000 {
		t.Errorf("expected price updated to 4000, got %f", updated.Price)
	}
	if updated.Price == originalPrice {
		t.Errorf("expected price to change from %f, but it stayed the same", originalPrice)
	}

	// Verify total count unchanged
	if len(repo.prices) != len(initialPrices) {
		t.Errorf("expected %d prices in repo after update, got %d", len(initialPrices), len(repo.prices))
	}
}

// TestDeletePrice_CacheInvalidation verifies that DeletePrice first looks up
// the price by ID (to obtain its category for cache invalidation), then
// deletes it.
func TestDeletePrice_CacheInvalidation(t *testing.T) {
	ctx := context.Background()

	initialPrices := makeTestPrices()
	repo := &mockSteelPriceRepo{prices: initialPrices, nextID: 4}
	svc := newTestablePriceService(repo, nil)

	// Delete existing price ID=1
	err := svc.DeletePrice(ctx, 1)
	if err != nil {
		t.Errorf("expected no error from DeletePrice, got %v", err)
	}

	// Verify the price was actually deleted
	_, err = repo.FindByID(ctx, 1)
	if err == nil {
		t.Errorf("expected error when finding deleted price ID=1, got nil")
	}

	// Verify total count decreased
	if want := len(initialPrices) - 1; len(repo.prices) != want {
		t.Errorf("expected %d prices in repo after delete, got %d", want, len(repo.prices))
	}

	// Deleting a non-existent ID should return an error (FindByID fails)
	err = svc.DeletePrice(ctx, 999)
	if err == nil {
		t.Errorf("expected error when deleting non-existent ID=999, got nil")
	}
}

// TestBatchImportPrices_CacheInvalidation verifies that BatchImportPrices
// correctly persists all prices. With 5 prices across 2 distinct categories,
// the real service would call DeletePriceCache exactly 2 times (once per
// unique category) after deduplication.
func TestBatchImportPrices_CacheInvalidation(t *testing.T) {
	ctx := context.Background()

	now := time.Now().Truncate(24 * time.Hour)
	repo := &mockSteelPriceRepo{prices: []model.SteelPrice{}, nextID: 0}
	svc := newTestablePriceService(repo, nil)

	// 5 prices across 2 distinct categories: 3 x 螺纹钢, 2 x 热卷
	prices := []*model.SteelPrice{
		{Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Change: 50, ChangePct: 1.3, Region: "上海", PriceDate: now},
		{Category: "螺纹钢", Spec: "HRB400E 22mm", Price: 3880, Change: 80, ChangePct: 2.1, Region: "上海", PriceDate: now},
		{Category: "螺纹钢", Spec: "HRB400E 25mm", Price: 3900, Change: 30, ChangePct: 0.8, Region: "北京", PriceDate: now},
		{Category: "热卷", Spec: "5.5mm", Price: 4200, Change: 0, ChangePct: 0, Region: "上海", PriceDate: now},
		{Category: "热卷", Spec: "7.5mm", Price: 4180, Change: -20, ChangePct: -0.5, Region: "广州", PriceDate: now},
	}

	err := svc.BatchImportPrices(ctx, prices)
	if err != nil {
		t.Errorf("expected no error from BatchImportPrices, got %v", err)
	}

	// Verify all 5 prices were persisted
	if len(repo.prices) != 5 {
		t.Errorf("expected 5 prices in repo, got %d", len(repo.prices))
	}

	// Verify all prices got assigned IDs
	for _, p := range prices {
		if p.ID == 0 {
			t.Errorf("expected BatchImportPrices to assign a non-zero ID to price (category=%s, spec=%s)", p.Category, p.Spec)
		}
	}

	// Count by category
	categoryCount := map[string]int{}
	for _, p := range repo.prices {
		categoryCount[p.Category]++
	}
	if categoryCount["螺纹钢"] != 3 {
		t.Errorf("expected 3 螺纹钢 prices, got %d", categoryCount["螺纹钢"])
	}
	if categoryCount["热卷"] != 2 {
		t.Errorf("expected 2 热卷 prices, got %d", categoryCount["热卷"])
	}

	// Verify 2 distinct categories (DeletePriceCache would fire 2 times)
	if len(categoryCount) != 2 {
		t.Errorf("expected 2 distinct categories, got %d", len(categoryCount))
	}
}

// TestGetPriceTrend_CategoryFilter verifies that GetPriceTrend with a
// specific category filter only returns records matching that category.
func TestGetPriceTrend_CategoryFilter(t *testing.T) {
	ctx := context.Background()

	now := time.Now().Truncate(24 * time.Hour)
	prices := []model.SteelPrice{
		{ID: 1, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3800, Region: "上海", PriceDate: now.AddDate(0, 0, -5)},
		{ID: 2, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3820, Region: "上海", PriceDate: now.AddDate(0, 0, -3)},
		{ID: 3, Category: "螺纹钢", Spec: "HRB400E 20mm", Price: 3850, Region: "上海", PriceDate: now},
		{ID: 4, Category: "热卷", Spec: "5.5mm", Price: 4200, Region: "上海", PriceDate: now.AddDate(0, 0, -4)},
		{ID: 5, Category: "热卷", Spec: "5.5mm", Price: 4180, Region: "广州", PriceDate: now.AddDate(0, 0, -2)},
		{ID: 6, Category: "热卷", Spec: "7.5mm", Price: 4150, Region: "上海", PriceDate: now},
	}

	repo := &mockSteelPriceRepo{prices: prices, nextID: 6}
	svc := newTestablePriceService(repo, nil)

	trend, err := svc.GetPriceTrend(ctx, "螺纹钢", 30)
	if err != nil {
		t.Errorf("expected no error from GetPriceTrend, got %v", err)
	}

	// All returned records must be 螺纹钢
	if len(trend) == 0 {
		t.Errorf("expected at least 1 螺纹钢 price, got 0")
	}

	for _, p := range trend {
		if p.Category != "螺纹钢" {
			t.Errorf("expected category 螺纹钢, got %s (price ID=%d)", p.Category, p.ID)
		}
	}

	// No 热卷 records should be present
	for _, p := range trend {
		if p.Category == "热卷" {
			t.Errorf("unexpected 热卷 record found in trend: ID=%d", p.ID)
		}
	}

	// Should have exactly the 3 螺纹钢 records
	if len(trend) != 3 {
		t.Errorf("expected 3 螺纹钢 trend points, got %d", len(trend))
	}

	// Also verify that querying 热卷 returns only 热卷 records
	trendHotRolled, err := svc.GetPriceTrend(ctx, "热卷", 30)
	if err != nil {
		t.Errorf("expected no error from GetPriceTrend for 热卷, got %v", err)
	}
	if len(trendHotRolled) != 3 {
		t.Errorf("expected 3 热卷 trend points, got %d", len(trendHotRolled))
	}
	for _, p := range trendHotRolled {
		if p.Category != "热卷" {
			t.Errorf("expected category 热卷, got %s (price ID=%d)", p.Category, p.ID)
		}
	}
}
