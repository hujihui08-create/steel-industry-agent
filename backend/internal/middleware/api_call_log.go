package middleware

import (
	"strings"
	"time"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// ApiCallLog returns a Gin middleware that records each /api/v1/* request
// into the api_call_logs table for monitoring and statistics.
func ApiCallLog(repo *repository.ApiCallLogRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only log API v1 paths.
		if !strings.HasPrefix(c.Request.URL.Path, "/api/v1/") {
			c.Next()
			return
		}

		start := time.Now()

		// Process the request.
		c.Next()

		// Record after the request completes.
		log := &model.ApiCallLog{
			APIPath:    c.Request.URL.Path,
			Method:     c.Request.Method,
			StatusCode: c.Writer.Status(),
			DurationMs: int(time.Since(start).Milliseconds()),
			IPAddress:  c.ClientIP(),
		}

		// Attach user ID if present in context.
		if userIDVal, exists := c.Get("user_id"); exists {
			if uid, ok := userIDVal.(uint); ok {
				log.UserID = &uid
			}
		}

		// Best-effort: log creation failure should not affect the response.
		_ = repo.Create(c.Request.Context(), log)
	}
}
