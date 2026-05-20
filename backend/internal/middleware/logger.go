package middleware

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger returns a Gin middleware that logs every request as structured
// JSON via log/slog. Log level is chosen based on the HTTP status code:
//   - 5xx → ERROR
//   - 4xx → WARN
//   - 2xx / 3xx → INFO
func Logger() gin.HandlerFunc {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		requestID, _ := c.Get("request_id")
		clientIP := c.ClientIP()

		attrs := []slog.Attr{
			slog.String("request_id", fmt.Sprint(requestID)),
			slog.String("method", method),
			slog.String("path", path),
			slog.Int("status", status),
			slog.String("latency", latency.String()),
			slog.Float64("latency_ms", float64(latency.Microseconds())/1000),
			slog.String("client_ip", clientIP),
			slog.String("user_agent", c.Request.UserAgent()),
		}

		switch {
		case status >= 500:
			logger.LogAttrs(c.Request.Context(), slog.LevelError, "request", attrs...)
		case status >= 400:
			logger.LogAttrs(c.Request.Context(), slog.LevelWarn, "request", attrs...)
		default:
			logger.LogAttrs(c.Request.Context(), slog.LevelInfo, "request", attrs...)
		}
	}
}
