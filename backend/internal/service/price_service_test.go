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

func (m *mockSteelPriceRepo) FindByDateRange(ctx context.Context, start, end time.Time) ([]model.SteelPrice, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	var result []model.SteelPrice
	for _, p := range m.prices {
		if !p.PriceDate.Before(start) && !p.PriceDate.After(end) {
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
	return s.priceRepo.FindByDateRange(ctx, start, end)
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
