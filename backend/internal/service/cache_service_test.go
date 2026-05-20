package service

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// mockRedisClient is an in-memory Redis mock that implements redis.UniversalClient.
// It implements Set, Get, Del using a map. The embedded nil redis.UniversalClient
// dispatches all other methods to nil (they will panic if called, but the
// CacheService only calls Set, Get, and Del).
type mockRedisClient struct {
	redis.UniversalClient
	data map[string]string
	mu   sync.RWMutex
}

func newMockRedisClient() *mockRedisClient {
	return &mockRedisClient{data: make(map[string]string)}
}

func (m *mockRedisClient) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.StatusCmd {
	m.mu.Lock()
	defer m.mu.Unlock()
	b, _ := value.([]byte)
	m.data[key] = string(b)
	return redis.NewStatusCmd(ctx)
}

func (m *mockRedisClient) Get(ctx context.Context, key string) *redis.StringCmd {
	m.mu.RLock()
	defer m.mu.RUnlock()
	cmd := redis.NewStringCmd(ctx)
	if v, ok := m.data[key]; ok {
		cmd.SetVal(v)
	} else {
		cmd.SetErr(redis.Nil)
	}
	return cmd
}

func (m *mockRedisClient) Del(ctx context.Context, keys ...string) *redis.IntCmd {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, k := range keys {
		delete(m.data, k)
	}
	cmd := redis.NewIntCmd(ctx)
	cmd.SetVal(int64(len(keys)))
	return cmd
}

func newTestCacheService(t *testing.T) *CacheService {
	t.Helper()
	svc := &CacheService{
		db:          nil,
		redisClient: newMockRedisClient(),
	}
	svc.redisAvailable.Store(true)
	return svc
}

// -- Price Cache tests --------------------------------------------------------

func TestSetPriceCache_GetPriceCache(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	type priceData struct {
		Category string  `json:"category"`
		Price    float64 `json:"price"`
		Region   string  `json:"region"`
	}

	expected := priceData{Category: "螺纹钢", Price: 3850, Region: "上海"}
	if err := svc.SetPriceCache(ctx, "螺纹钢", expected); err != nil {
		t.Fatalf("SetPriceCache failed: %v", err)
	}

	got, err := svc.GetPriceCache(ctx, "螺纹钢")
	if err != nil {
		t.Fatalf("GetPriceCache failed: %v", err)
	}
	if got == "" {
		t.Fatal("expected cached data, got empty string")
	}

	var actual priceData
	if err := json.Unmarshal([]byte(got), &actual); err != nil {
		t.Fatalf("failed to unmarshal cached data: %v", err)
	}
	if actual != expected {
		t.Errorf("expected %+v, got %+v", expected, actual)
	}
}

func TestSetPriceCache_DifferentKeys(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	svc.SetPriceCache(ctx, "螺纹钢", "数据A")
	svc.SetPriceCache(ctx, "热卷", "数据B")

	a, _ := svc.GetPriceCache(ctx, "螺纹钢")
	b, _ := svc.GetPriceCache(ctx, "热卷")

	if a != `"数据A"` {
		t.Errorf("expected 数据A for 螺纹钢, got %s", a)
	}
	if b != `"数据B"` {
		t.Errorf("expected 数据B for 热卷, got %s", b)
	}
}

// -- Trend Cache tests --------------------------------------------------------

func TestSetTrendCache_GetTrendCache(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	trend := []float64{3800, 3820, 3850}
	if err := svc.SetTrendCache(ctx, "螺纹钢", 7, trend); err != nil {
		t.Fatalf("SetTrendCache failed: %v", err)
	}

	got, err := svc.GetTrendCache(ctx, "螺纹钢", 7)
	if err != nil {
		t.Fatalf("GetTrendCache failed: %v", err)
	}
	if got == "" {
		t.Fatal("expected cached data, got empty string")
	}
}

func TestSetTrendCache_DifferentDays(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	svc.SetTrendCache(ctx, "热卷", 7, "7天趋势")
	svc.SetTrendCache(ctx, "热卷", 30, "30天趋势")

	t7, _ := svc.GetTrendCache(ctx, "热卷", 7)
	t30, _ := svc.GetTrendCache(ctx, "热卷", 30)

	if t7 != `"7天趋势"` {
		t.Errorf("expected 7天趋势, got %s", t7)
	}
	if t30 != `"30天趋势"` {
		t.Errorf("expected 30天趋势, got %s", t30)
	}
}

// -- Hot Prices Cache tests ---------------------------------------------------

func TestSetHotPrices_GetHotPrices(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	hot := map[string]float64{"螺纹钢": 3850, "热卷": 4200}
	if err := svc.SetHotPrices(ctx, hot); err != nil {
		t.Fatalf("SetHotPrices failed: %v", err)
	}

	got, err := svc.GetHotPrices(ctx)
	if err != nil {
		t.Fatalf("GetHotPrices failed: %v", err)
	}
	if got == "" {
		t.Fatal("expected cached data, got empty string")
	}
}

// -- Price Compare Cache tests ------------------------------------------------

func TestSetPriceCompareCache_GetPriceCompareCache(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	compare := map[string]float64{"上海": 3850, "北京": 3830}
	if err := svc.SetPriceCompareCache(ctx, "螺纹钢", "上海,北京", compare); err != nil {
		t.Fatalf("SetPriceCompareCache failed: %v", err)
	}

	got, err := svc.GetPriceCompareCache(ctx, "螺纹钢", "上海,北京")
	if err != nil {
		t.Fatalf("GetPriceCompareCache failed: %v", err)
	}
	if got == "" {
		t.Fatal("expected cached data, got empty string")
	}
}

// -- News Cache tests ---------------------------------------------------------

func TestSetNewsCache_GetNewsCache(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	news := []string{"钢铁价格周报", "螺纹钢市场分析"}
	if err := svc.SetNewsCache(ctx, news); err != nil {
		t.Fatalf("SetNewsCache failed: %v", err)
	}

	got, err := svc.GetNewsCache(ctx)
	if err != nil {
		t.Fatalf("GetNewsCache failed: %v", err)
	}
	if got == "" {
		t.Fatal("expected cached data, got empty string")
	}
}

// -- Tender Cache tests -------------------------------------------------------

func TestSetTenderCache_GetTenderCache(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	tenders := []string{"招标项目A", "招标项目B"}
	if err := svc.SetTenderCache(ctx, tenders); err != nil {
		t.Fatalf("SetTenderCache failed: %v", err)
	}

	got, err := svc.GetTenderCache(ctx)
	if err != nil {
		t.Fatalf("GetTenderCache failed: %v", err)
	}
	if got == "" {
		t.Fatal("expected cached data, got empty string")
	}
}

// -- Cache Miss tests ---------------------------------------------------------

func TestGetCache_Miss(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	tests := []struct {
		name string
		fn   func() (string, error)
	}{
		{"price miss", func() (string, error) { return svc.GetPriceCache(ctx, "不存在品类") }},
		{"trend miss", func() (string, error) { return svc.GetTrendCache(ctx, "不存在品类", 7) }},
		{"hot prices miss", func() (string, error) { return svc.GetHotPrices(ctx) }},
		{"news miss", func() (string, error) { return svc.GetNewsCache(ctx) }},
		{"tender miss", func() (string, error) { return svc.GetTenderCache(ctx) }},
		{"compare miss", func() (string, error) { return svc.GetPriceCompareCache(ctx, "不存在", "上海") }},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.fn()
			if err != nil {
				t.Errorf("expected no error, got %v", err)
			}
			if got != "" {
				t.Errorf("expected empty string for cache miss, got %q", got)
			}
		})
	}
}

// -- Invalidation tests -------------------------------------------------------

func TestInvalidatePriceCache(t *testing.T) {
	ctx := context.Background()
	svc := newTestCacheService(t)

	// Write price:latest:螺纹钢 and price:hot.
	svc.SetPriceCache(ctx, "螺纹钢", "价格数据")
	svc.SetHotPrices(ctx, "热门数据")

	// Verify both exist.
	if v, _ := svc.GetPriceCache(ctx, "螺纹钢"); v == "" {
		t.Fatal("price:latest:螺纹钢 should exist before invalidation")
	}
	if v, _ := svc.GetHotPrices(ctx); v == "" {
		t.Fatal("price:hot should exist before invalidation")
	}

	// Invalidate.
	if err := svc.InvalidatePriceCache(ctx, "螺纹钢"); err != nil {
		t.Fatalf("InvalidatePriceCache failed: %v", err)
	}

	// Verify both are gone.
	if v, _ := svc.GetPriceCache(ctx, "螺纹钢"); v != "" {
		t.Errorf("price:latest:螺纹钢 should be empty after invalidation, got %q", v)
	}
	if v, _ := svc.GetHotPrices(ctx); v != "" {
		t.Errorf("price:hot should be empty after invalidation, got %q", v)
	}

	// Other keys should not be affected.
	svc.SetPriceCache(ctx, "热卷", "热卷数据")
	svc.SetHotPrices(ctx, "新热门数据")
	svc.SetPriceCache(ctx, "螺纹钢", "新价格数据")

	// Invalidate 螺纹钢 - should delete price:latest:螺纹钢 AND price:hot,
	// but keep price:latest:热卷 untouched.
	if err := svc.InvalidatePriceCache(ctx, "螺纹钢"); err != nil {
		t.Fatalf("InvalidatePriceCache failed: %v", err)
	}

	// price:latest:螺纹钢 should be deleted (invalidation targets it).
	if v, _ := svc.GetPriceCache(ctx, "螺纹钢"); v != "" {
		t.Errorf("price:latest:螺纹钢 should be deleted by invalidation, got %q", v)
	}
	// price:hot should also be deleted.
	if v, _ := svc.GetHotPrices(ctx); v != "" {
		t.Errorf("price:hot should be deleted by invalidation, got %q", v)
	}
	// price:latest:热卷 should NOT be affected.
	if v, _ := svc.GetPriceCache(ctx, "热卷"); v == "" {
		t.Error("price:latest:热卷 should not be affected by 螺纹钢 invalidation")
	}
}
