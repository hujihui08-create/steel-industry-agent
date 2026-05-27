package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupMiddlewareTestDB(t *testing.T) *gorm.DB {
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

func TestApiCallLog_Middleware_RecordsCall(t *testing.T) {
	db := setupMiddlewareTestDB(t)
	repo := repository.NewApiCallLogRepository(db)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(ApiCallLog(repo))
	router.GET("/api/v1/prices/latest", func(c *gin.Context) {
		c.JSON(200, gin.H{"data": "test"})
	})
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Make an API v1 call
	req, _ := http.NewRequest("GET", "/api/v1/prices/latest", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// Verify the call was logged
	ctx := context.Background()
	_, _, _, err := repo.Overview(ctx)
	if err != nil {
		t.Fatalf("Overview failed: %v", err)
	}
	// Overview only counts today's, but our entry should be there
	// Let's check via EndpointStats
	stats, err := repo.EndpointStats(ctx)
	if err != nil {
		t.Fatalf("EndpointStats failed: %v", err)
	}
	if len(stats) == 0 {
		t.Error("expected at least 1 endpoint stat entry")
	}
	if len(stats) > 0 && stats[0].APIPath != "/api/v1/prices/latest" {
		t.Errorf("expected APIPath '/api/v1/prices/latest', got '%s'", stats[0].APIPath)
	}

	// Non-API paths should NOT be logged
	req2, _ := http.NewRequest("GET", "/health", nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	// Stats should still be the same count (health path not logged)
	stats2, _ := repo.EndpointStats(ctx)
	if len(stats2) != len(stats) {
		t.Errorf("expected same stats count after health call, got %d vs %d", len(stats2), len(stats))
	}
}

func TestApiCallLog_Middleware_NonApiPath(t *testing.T) {
	db := setupMiddlewareTestDB(t)
	repo := repository.NewApiCallLogRepository(db)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(ApiCallLog(repo))
	router.GET("/status", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	req, _ := http.NewRequest("GET", "/status", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	// Verify no logs were created (path doesn't start with /api/v1/)
	ctx := context.Background()
	stats, err := repo.EndpointStats(ctx)
	if err != nil {
		t.Fatalf("EndpointStats failed: %v", err)
	}
	if len(stats) != 0 {
		t.Errorf("expected 0 stats for non-API path, got %d", len(stats))
	}
}
