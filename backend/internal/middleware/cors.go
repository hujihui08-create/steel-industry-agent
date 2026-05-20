package middleware

import (
	"time"

	"steel-agent-backend/internal/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS returns a Gin middleware that configures Cross-Origin Resource Sharing
// based on the application configuration. In development mode or when no
// allowed origins are configured, it defaults to allowing all origins.
func CORS() gin.HandlerFunc {
	allowedOrigins := config.AppConfig.CORSAllowedOrigins
	if len(allowedOrigins) == 0 || config.AppConfig.APPEnv == "development" {
		allowedOrigins = []string{"*"}
	}

	return cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}
