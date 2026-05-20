package handler

import (
	"context"
	"net/http"
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// HealthHandler provides health check endpoints for liveness, readiness,
// and overall application health.
type HealthHandler struct {
	db          *gorm.DB
	redisClient redis.UniversalClient
	startTime   time.Time
	version     string
}

// NewHealthHandler creates a new HealthHandler instance.
func NewHealthHandler(db *gorm.DB, redisClient redis.UniversalClient, version string) *HealthHandler {
	return &HealthHandler{
		db:          db,
		redisClient: redisClient,
		startTime:   time.Now(),
		version:     version,
	}
}

// Liveness responds to GET /live with a simple alive status.
// This endpoint is used by orchestrators to determine if the process
// itself is running.
func (h *HealthHandler) Liveness(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
	})
}

// Readiness responds to GET /ready and checks whether the application
// can serve traffic by probing its dependencies (database and Redis).
// Returns 200 when all checks pass, 503 otherwise.
func (h *HealthHandler) Readiness(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 3*time.Second)
	defer cancel()

	checks := make(map[string]string)
	allReady := true

	// Database check
	if sqlDB, err := h.db.DB(); err != nil {
		checks["database"] = "unavailable"
		allReady = false
	} else if err := sqlDB.PingContext(ctx); err != nil {
		checks["database"] = "unavailable"
		allReady = false
	} else {
		checks["database"] = "ok"
	}

	// Redis check
	if h.redisClient != nil {
		if err := h.redisClient.Ping(ctx).Err(); err != nil {
			checks["redis"] = "unavailable"
			allReady = false
		} else {
			checks["redis"] = "ok"
		}
	} else {
		checks["redis"] = "degraded"
	}

	resp := gin.H{
		"status": "ready",
		"checks": checks,
	}

	if !allReady {
		resp["status"] = "not_ready"
		c.JSON(http.StatusServiceUnavailable, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Health responds to GET /health with detailed application health
// information including uptime, version, and memory statistics.
func (h *HealthHandler) Health(c *gin.Context) {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	uptime := time.Since(h.startTime).Seconds()

	c.JSON(http.StatusOK, gin.H{
		"status":         "healthy",
		"version":        h.version,
		"uptime_seconds": int64(uptime),
		"go_version":     runtime.Version(),
		"goroutines":     runtime.NumGoroutine(),
		"memory": gin.H{
			"alloc_mb":       float64(mem.Alloc) / 1024 / 1024,
			"total_alloc_mb": float64(mem.TotalAlloc) / 1024 / 1024,
		},
	})
}
