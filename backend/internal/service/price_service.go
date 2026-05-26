package service

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"
)

// PriceService handles steel price business logic.
type PriceService struct {
	priceRepo    *repository.SteelPriceRepository
	newsRepo     *repository.NewsRepository
	cacheService *CacheService
}

// NewPriceService creates a new PriceService with the given price and news repositories and cache service.
func NewPriceService(priceRepo *repository.SteelPriceRepository, newsRepo *repository.NewsRepository, cacheService *CacheService) *PriceService {
	return &PriceService{priceRepo: priceRepo, newsRepo: newsRepo, cacheService: cacheService}
}

// GetLatestPrice returns the most recent price for the given category.
// It first checks Redis cache; on miss, queries the database and writes back to cache.
func (s *PriceService) GetLatestPrice(ctx context.Context, category string) (*model.SteelPrice, error) {
	// 1. Try Redis cache first
	if s.cacheService != nil {
		cached, err := s.cacheService.GetPriceCache(ctx, category)
		if err != nil {
			log.Printf("[PriceService] cache read error for category=%s: %v", category, err)
		} else if cached != "" {
			var price model.SteelPrice
			if err := json.Unmarshal([]byte(cached), &price); err == nil {
				return &price, nil
			}
			log.Printf("[PriceService] cache unmarshal error for category=%s: %v", category, err)
		}
	}

	// 2. Cache miss — query database
	price, err := s.priceRepo.FindLatest(ctx, category)
	if err != nil {
		return nil, err
	}

	// 3. Write back to cache (best effort)
	if s.cacheService != nil {
		if err := s.cacheService.SetPriceCache(ctx, category, price); err != nil {
			log.Printf("[PriceService] cache write error for category=%s: %v", category, err)
		}
	}

	return price, nil
}

// GetPriceTrend returns historical price data for the specified number of days.
// It first checks Redis cache; on miss, queries the database and writes back to cache.
func (s *PriceService) GetPriceTrend(ctx context.Context, category string, days int) ([]model.SteelPrice, error) {
	// 1. Try Redis cache first
	if s.cacheService != nil {
		cached, err := s.cacheService.GetTrendCache(ctx, category, days)
		if err != nil {
			log.Printf("[PriceService] trend cache read error for category=%s days=%d: %v", category, days, err)
		} else if cached != "" {
			var prices []model.SteelPrice
			if err := json.Unmarshal([]byte(cached), &prices); err == nil {
				return prices, nil
			}
			log.Printf("[PriceService] trend cache unmarshal error for category=%s days=%d: %v", category, days, err)
		}
	}

	// 2. Cache miss — query database
	end := time.Now()
	start := end.AddDate(0, 0, -days)
	prices, err := s.priceRepo.FindByDateRange(ctx, category, start, end)
	if err != nil {
		return nil, err
	}

	// 3. Write back to cache (best effort)
	if s.cacheService != nil {
		if err := s.cacheService.SetTrendCache(ctx, category, days, prices); err != nil {
			log.Printf("[PriceService] trend cache write error for category=%s days=%d: %v", category, days, err)
		}
	}

	return prices, nil
}

// GetPriceList returns a paginated list of steel prices with optional category and region filters.
func (s *PriceService) GetPriceList(ctx context.Context, category, region string, limit, offset int) ([]model.SteelPrice, error) {
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

// ComparePrices returns the latest prices for multiple categories.
func (s *PriceService) ComparePrices(ctx context.Context, categories []string) (map[string]*model.SteelPrice, error) {
	result := make(map[string]*model.SteelPrice)
	for _, category := range categories {
		price, err := s.priceRepo.FindLatest(ctx, category)
		if err != nil {
			continue
		}
		result[category] = price
	}
	return result, nil
}

// GetNewsList returns a paginated list of steel industry news.
func (s *PriceService) GetNewsList(ctx context.Context, limit, offset int) ([]model.News, error) {
	return s.newsRepo.FindAll(ctx, limit, offset)
}

// GetNewsDetail returns detailed information for a specific news article.
func (s *PriceService) GetNewsDetail(ctx context.Context, id uint) (*model.News, error) {
	return s.newsRepo.FindByID(ctx, id)
}

// GetDailyReport returns a daily summary report of steel prices.
func (s *PriceService) GetDailyReport(ctx context.Context) (map[string]interface{}, error) {
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

// CreatePrice inserts a new steel price record and invalidates related caches.
func (s *PriceService) CreatePrice(ctx context.Context, price *model.SteelPrice) error {
	if err := s.priceRepo.Create(ctx, price); err != nil {
		return err
	}
	if s.cacheService != nil {
		s.cacheService.DeletePriceCache(ctx, price.Category)
	}
	return nil
}

// UpdatePrice updates an existing steel price record and invalidates related caches.
func (s *PriceService) UpdatePrice(ctx context.Context, price *model.SteelPrice) error {
	if err := s.priceRepo.Update(ctx, price); err != nil {
		return err
	}
	if s.cacheService != nil {
		s.cacheService.DeletePriceCache(ctx, price.Category)
	}
	return nil
}

// DeletePrice removes a steel price record by its ID after looking up its category,
// and invalidates related caches.
func (s *PriceService) DeletePrice(ctx context.Context, id uint) error {
	price, err := s.priceRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.priceRepo.Delete(ctx, id); err != nil {
		return err
	}
	if s.cacheService != nil {
		s.cacheService.DeletePriceCache(ctx, price.Category)
	}
	return nil
}

// BatchImportPrices bulk-inserts multiple steel price records and invalidates
// the caches for each affected category.
func (s *PriceService) BatchImportPrices(ctx context.Context, prices []*model.SteelPrice) error {
	if err := s.priceRepo.BatchCreate(ctx, prices); err != nil {
		return err
	}
	if s.cacheService != nil {
		categories := make(map[string]bool)
		for _, p := range prices {
			if !categories[p.Category] {
				categories[p.Category] = true
				s.cacheService.DeletePriceCache(ctx, p.Category)
			}
		}
	}
	return nil
}

// GetPriceListWithCount returns a paginated list of steel prices with optional
// category, spec, and region filters, along with the total matching count.
func (s *PriceService) GetPriceListWithCount(ctx context.Context, category, spec, region string, limit, offset int) ([]model.SteelPrice, int64, error) {
	return s.priceRepo.FindByCategoryWithPagination(ctx, category, spec, region, limit, offset)
}

// GetWeeklyReport returns a weekly steel price trend summary grouped by category.
func (s *PriceService) GetWeeklyReport(ctx context.Context) (map[string]interface{}, error) {
	end := time.Now().Truncate(24 * time.Hour)
	start := end.AddDate(0, 0, -7)

	prices, err := s.priceRepo.FindForWeeklyReport(ctx, start, end)
	if err != nil {
		return nil, err
	}

	categoryMap := make(map[string][]model.SteelPrice)
	for _, p := range prices {
		categoryMap[p.Category] = append(categoryMap[p.Category], p)
	}

	type CategoryTrend struct {
		Category    string  `json:"category"`
		StartPrice  float64 `json:"start_price"`
		EndPrice    float64 `json:"end_price"`
		HighPrice   float64 `json:"high_price"`
		LowPrice    float64 `json:"low_price"`
		AvgPrice    float64 `json:"avg_price"`
		TotalChange float64 `json:"total_change"`
	}

	var trends []CategoryTrend
	for cat, catPrices := range categoryMap {
		if len(catPrices) == 0 {
			continue
		}
		startPrice := catPrices[0].Price
		endPrice := catPrices[len(catPrices)-1].Price
		high := catPrices[0].Price
		low := catPrices[0].Price
		sum := 0.0
		for _, p := range catPrices {
			sum += p.Price
			if p.Price > high {
				high = p.Price
			}
			if p.Price < low {
				low = p.Price
			}
		}
		trends = append(trends, CategoryTrend{
			Category:    cat,
			StartPrice:  startPrice,
			EndPrice:    endPrice,
			HighPrice:   high,
			LowPrice:    low,
			AvgPrice:    sum / float64(len(catPrices)),
			TotalChange: endPrice - startPrice,
		})
	}

	return map[string]interface{}{
		"start_date": start.Format("2006-01-02"),
		"end_date":   end.Format("2006-01-02"),
		"trends":     trends,
	}, nil
}
