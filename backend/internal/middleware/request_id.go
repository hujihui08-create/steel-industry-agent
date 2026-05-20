package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestID is a middleware that injects a unique request ID into every
// request context. If the incoming request already carries an X-Request-ID
// header, that value is reused; otherwise a new UUIDv4 is generated.
// The request ID is stored via c.Set("request_id", ...) and also written
// back in the X-Request-ID response header.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}
