package repository

import (
	"context"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"steel-agent-backend/internal/model"
)

func setupApiCallLogTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&model.ApiCallLog{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	return db
}

func TestApiCallLogRepo_Create(t *testing.T) {
	db := setupApiCallLogTestDB(t)
	repo := NewApiCallLogRepository(db)
	ctx := context.Background()

	log := &model.ApiCallLog{
		APIPath:    "/api/v1/prices/latest",
		Method:     "GET",
		StatusCode: 200,
		DurationMs: 45,
		IPAddress:  "127.0.0.1",
	}
	if err := repo.Create(ctx, log); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if log.ID == 0 {
		t.Error("expected ID to be assigned after Create")
	}
	if log.APIPath != "/api/v1/prices/latest" {
		t.Errorf("expected APIPath '/api/v1/prices/latest', got '%s'", log.APIPath)
	}
}

func TestApiCallLogRepo_Overview(t *testing.T) {
	db := setupApiCallLogTestDB(t)
	repo := NewApiCallLogRepository(db)
	ctx := context.Background()

	// Overview on empty table
	total, avgDuration, errorRate, err := repo.Overview(ctx)
	if err != nil {
		t.Fatalf("Overview on empty table failed: %v", err)
	}
	if total != 0 {
		t.Errorf("expected total 0, got %d", total)
	}
	if errorRate != 0 {
		t.Errorf("expected errorRate 0, got %f", errorRate)
	}
	_ = avgDuration

	// Insert some logs
	uid := uint(1)
	logs := []model.ApiCallLog{
		{APIPath: "/api/v1/prices/latest", Method: "GET", StatusCode: 200, DurationMs: 50, IPAddress: "127.0.0.1"},
		{APIPath: "/api/v1/prices/trend", Method: "GET", StatusCode: 200, DurationMs: 100, IPAddress: "127.0.0.2"},
		{APIPath: "/api/v1/admin/users", Method: "GET", StatusCode: 500, DurationMs: 200, UserID: &uid, IPAddress: "127.0.0.3"},
	}
	for i := range logs {
		if err := repo.Create(ctx, &logs[i]); err != nil {
			t.Fatalf("Create log %d failed: %v", i, err)
		}
	}

	// Now test overview
	total, avgDuration, errorRate, err = repo.Overview(ctx)
	if err != nil {
		t.Fatalf("Overview failed: %v", err)
	}
	if total != 3 {
		t.Errorf("expected total 3, got %d", total)
	}
	if avgDuration <= 0 {
		t.Errorf("expected avgDuration > 0, got %f", avgDuration)
	}
	if errorRate <= 0 {
		t.Errorf("expected errorRate > 0, got %f", errorRate)
	}
}

func TestApiCallLogRepo_EndpointStats(t *testing.T) {
	db := setupApiCallLogTestDB(t)
	repo := NewApiCallLogRepository(db)
	ctx := context.Background()

	// Empty table
	stats, err := repo.EndpointStats(ctx)
	if err != nil {
		t.Fatalf("EndpointStats on empty table failed: %v", err)
	}
	if len(stats) != 0 {
		t.Errorf("expected 0 stats, got %d", len(stats))
	}

	// Insert logs for different endpoints
	uid := uint(1)
	logs := []model.ApiCallLog{
		{APIPath: "/api/v1/prices/latest", Method: "GET", StatusCode: 200, DurationMs: 50, IPAddress: "127.0.0.1"},
		{APIPath: "/api/v1/prices/latest", Method: "GET", StatusCode: 200, DurationMs: 60, IPAddress: "127.0.0.1"},
		{APIPath: "/api/v1/prices/trend", Method: "GET", StatusCode: 500, DurationMs: 100, UserID: &uid, IPAddress: "127.0.0.2"},
	}
	for i := range logs {
		if err := repo.Create(ctx, &logs[i]); err != nil {
			t.Fatalf("Create log %d failed: %v", i, err)
		}
	}

	stats, err = repo.EndpointStats(ctx)
	if err != nil {
		t.Fatalf("EndpointStats failed: %v", err)
	}
	if len(stats) != 2 {
		t.Errorf("expected 2 endpoint stats, got %d", len(stats))
	}
	// Should be ordered by call_count DESC, so first entry should be /api/v1/prices/latest
	if stats[0].CallCount != 2 {
		t.Errorf("expected first endpoint to have call_count 2, got %d", stats[0].CallCount)
	}
}

func TestApiCallLogRepo_EndpointStats_WithDateRange(t *testing.T) {
	db := setupApiCallLogTestDB(t)
	repo := NewApiCallLogRepository(db)
	ctx := context.Background()

	// Create logs with explicit created_at
	now := time.Now()
	log1 := &model.ApiCallLog{
		APIPath: "/api/v1/prices/latest", Method: "GET", StatusCode: 200,
		DurationMs: 50, IPAddress: "127.0.0.1", CreatedAt: now,
	}
	log2 := &model.ApiCallLog{
		APIPath: "/api/v1/prices/latest", Method: "GET", StatusCode: 200,
		DurationMs: 60, IPAddress: "127.0.0.1", CreatedAt: now.Add(-48 * time.Hour),
	}
	log3 := &model.ApiCallLog{
		APIPath: "/api/v1/prices/trend", Method: "GET", StatusCode: 500,
		DurationMs: 100, IPAddress: "127.0.0.2", CreatedAt: now,
	}
	db.Create(log1)
	db.Create(log2)
	db.Create(log3)

	// EndpointStats returns all data regardless of date
	stats, err := repo.EndpointStats(ctx)
	if err != nil {
		t.Fatalf("EndpointStats failed: %v", err)
	}
	if len(stats) < 2 {
		t.Errorf("expected at least 2 endpoint stats, got %d", len(stats))
	}
}
