package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// CacheService provides caching operations backed by Redis with automatic DB fallback
// when Redis becomes unavailable.
type CacheService struct {
	db             *gorm.DB
	redisClient    redis.UniversalClient
	redisAvailable atomic.Bool
}

// NewCacheService creates a new CacheService with the given DB and Redis client.
// Starts a background goroutine that attempts to recover Redis connectivity.
func NewCacheService(db *gorm.DB, redisClient redis.UniversalClient) *CacheService {
	s := &CacheService{
		db:             db,
		redisClient:    redisClient,
		redisAvailable: atomic.Bool{},
	}
	s.redisAvailable.Store(true)
	go s.recoverRedis()
	return s
}

// recoverRedis periodically pings Redis to detect recovery.
func (s *CacheService) recoverRedis() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if s.redisAvailable.Load() {
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		err := s.redisClient.Ping(ctx).Err()
		cancel()

		if err == nil {
			s.redisAvailable.Store(true)
			slog.Info("Redis connection recovered")
		}
	}
}

// -- Price Cache --------------------------------------------------------------

// SetPriceCache caches the latest price data for a given category.
// key: price:latest:{category}, TTL: 30 minutes.
func (s *CacheService) SetPriceCache(ctx context.Context, category string, data interface{}) error {
	key := fmt.Sprintf("price:latest:%s", category)
	return s.set(ctx, key, data, 30*time.Minute)
}

// GetPriceCache retrieves the cached latest price data for a given category.
// Returns an empty string if the key does not exist or Redis is unavailable.
func (s *CacheService) GetPriceCache(ctx context.Context, category string) (string, error) {
	key := fmt.Sprintf("price:latest:%s", category)
	return s.get(ctx, key)
}

// -- Trend Cache --------------------------------------------------------------

// SetTrendCache caches the price trend data for a given category and day range.
// key: price:trend:{category}:{days}, TTL: 1 hour.
func (s *CacheService) SetTrendCache(ctx context.Context, category string, days int, data interface{}) error {
	key := fmt.Sprintf("price:trend:%s:%d", category, days)
	return s.set(ctx, key, data, time.Hour)
}

// GetTrendCache retrieves the cached price trend data for a given category and day range.
// Returns an empty string if the key does not exist or Redis is unavailable.
func (s *CacheService) GetTrendCache(ctx context.Context, category string, days int) (string, error) {
	key := fmt.Sprintf("price:trend:%s:%d", category, days)
	return s.get(ctx, key)
}

// -- Hot Prices Cache ---------------------------------------------------------

// SetHotPrices caches the hot / popular prices data.
// key: price:hot, TTL: 10 minutes.
func (s *CacheService) SetHotPrices(ctx context.Context, data interface{}) error {
	return s.set(ctx, "price:hot", data, 10*time.Minute)
}

// GetHotPrices retrieves the cached hot prices data.
// Returns an empty string if the key does not exist or Redis is unavailable.
func (s *CacheService) GetHotPrices(ctx context.Context) (string, error) {
	return s.get(ctx, "price:hot")
}

// -- Price Compare Cache ------------------------------------------------------

// SetPriceCompareCache caches the cross-region price comparison data.
// key: price:compare:{category}:{regions}, TTL: 30 minutes.
func (s *CacheService) SetPriceCompareCache(ctx context.Context, category, regions string, data interface{}) error {
	key := fmt.Sprintf("price:compare:%s:%s", category, regions)
	return s.set(ctx, key, data, 30*time.Minute)
}

// GetPriceCompareCache retrieves the cached price comparison data.
// Returns an empty string if the key does not exist or Redis is unavailable.
func (s *CacheService) GetPriceCompareCache(ctx context.Context, category, regions string) (string, error) {
	key := fmt.Sprintf("price:compare:%s:%s", category, regions)
	return s.get(ctx, key)
}

// -- News Cache ---------------------------------------------------------------

// SetNewsCache caches the latest steel industry news.
// key: news:latest, TTL: 15 minutes.
func (s *CacheService) SetNewsCache(ctx context.Context, data interface{}) error {
	return s.set(ctx, "news:latest", data, 15*time.Minute)
}

// GetNewsCache retrieves the cached news data.
// Returns an empty string if the key does not exist or Redis is unavailable.
func (s *CacheService) GetNewsCache(ctx context.Context) (string, error) {
	return s.get(ctx, "news:latest")
}

// -- Tender Cache -------------------------------------------------------------

// SetTenderCache caches the latest tender information.
// key: tender:latest, TTL: 30 minutes.
func (s *CacheService) SetTenderCache(ctx context.Context, data interface{}) error {
	return s.set(ctx, "tender:latest", data, 30*time.Minute)
}

// GetTenderCache retrieves the cached tender data.
// Returns an empty string if the key does not exist or Redis is unavailable.
func (s *CacheService) GetTenderCache(ctx context.Context) (string, error) {
	return s.get(ctx, "tender:latest")
}

// -- Cache Invalidation -------------------------------------------------------

// InvalidatePriceCache removes the price:latest:{category} and price:hot keys.
// Silently succeeds when Redis is unavailable (no-op).
func (s *CacheService) InvalidatePriceCache(ctx context.Context, category string) error {
	if s.redisClient == nil {
		return nil
	}
	keys := []string{
		fmt.Sprintf("price:latest:%s", category),
		"price:hot",
	}
	err := s.redisClient.Del(ctx, keys...).Err()
	if err != nil && s.redisAvailable.Load() {
		s.redisAvailable.Store(false)
		slog.Warn("Redis unavailable, cache invalidation skipped",
			"category", category,
			"error", err,
		)
	}
	// Never fail the caller because of cache invalidation failure
	return nil
}

// DeletePriceCache removes all cached price data for a given category,
// including latest, trend, and compare caches. It supersedes InvalidatePriceCache.
func (s *CacheService) DeletePriceCache(ctx context.Context, category string) error {
	if s.redisClient == nil || !s.redisAvailable.Load() {
		return nil
	}

	// Collect all known exact keys
	keys := []string{
		fmt.Sprintf("price:latest:%s", category),
		"price:hot",
	}

	// Scan for trend keys: price:trend:{category}:*
	s.collectKeys(ctx, &keys, fmt.Sprintf("price:trend:%s:*", category), 50)

	// Scan for compare keys: price:compare:{category}:*
	s.collectKeys(ctx, &keys, fmt.Sprintf("price:compare:%s:*", category), 50)

	if len(keys) == 0 {
		return nil
	}

	err := s.redisClient.Del(ctx, keys...).Err()
	if err != nil && s.redisAvailable.Load() {
		s.redisAvailable.Store(false)
		slog.Warn("Redis unavailable, price cache deletion skipped",
			"category", category,
			"error", err,
		)
	}
	// Never fail the caller because of cache invalidation failure
	return nil
}

// collectKeys scans Redis for keys matching pattern and appends them to the slice.
func (s *CacheService) collectKeys(ctx context.Context, keys *[]string, pattern string, count int64) {
	var cursor uint64
	for {
		scannedKeys, nextCursor, err := s.redisClient.Scan(ctx, cursor, pattern, count).Result()
		if err != nil {
			break
		}
		*keys = append(*keys, scannedKeys...)
		if nextCursor == 0 {
			break
		}
		cursor = nextCursor
	}
}

// -- Internal helpers ---------------------------------------------------------

func (s *CacheService) set(ctx context.Context, key string, data interface{}, ttl time.Duration) error {
	if s.redisClient == nil {
		return nil
	}
	payload, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("cache marshal: %w", err)
	}

	err = s.redisClient.Set(ctx, key, payload, ttl).Err()
	if err != nil {
		s.redisAvailable.Store(false)
		slog.Warn("Redis set failed, cache write skipped",
			"key", key,
			"error", err,
		)
		// Don't block the caller on cache write failure
		return nil
	}
	return nil
}

func (s *CacheService) get(ctx context.Context, key string) (string, error) {
	if s.redisClient == nil || !s.redisAvailable.Load() {
		return "", fmt.Errorf("redis unavailable")
	}

	val, err := s.redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		s.redisAvailable.Store(false)
		slog.Warn("Redis get failed, falling back to database",
			"key", key,
			"error", err,
		)
		return "", fmt.Errorf("cache get: %w", err)
	}
	return val, nil
}
