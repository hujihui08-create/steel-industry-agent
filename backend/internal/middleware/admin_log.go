package middleware

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func AdminLog(adminLogRepo *repository.AdminLogRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		method := c.Request.Method
		if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
			c.Next()
			return
		}

		userIDVal, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}
		adminID, ok := userIDVal.(uint)
		if !ok {
			c.Next()
			return
		}

		action := method

		targetType := extractAdminTargetType(c.Request.URL.Path)

		var targetID uint
		if idStr := c.Param("id"); idStr != "" {
			if id, err := strconv.ParseUint(idStr, 10, 64); err == nil {
				targetID = uint(id)
			}
		}

		ip := c.ClientIP()
		if forwarded := c.Request.Header.Get("X-Forwarded-For"); forwarded != "" {
			ip = forwarded
		}

		var detail string
		if c.Request.Body != nil {
			bodyBytes, err := io.ReadAll(c.Request.Body)
			if err == nil {
				detail = string(bodyBytes)
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		}

		logEntry := &model.AdminLog{
			AdminID:    adminID,
			Action:     action,
			TargetType: targetType,
			TargetID:   targetID,
			Detail:     detail,
			IPAddress:  ip,
		}

		if err := adminLogRepo.Create(c.Request.Context(), logEntry); err != nil {
			log.Printf("failed to create admin log: %v", err)
		}

		c.Next()
	}
}

func extractAdminTargetType(path string) string {
	segments := strings.Split(strings.Trim(path, "/"), "/")

	adminIdx := -1
	for i, seg := range segments {
		if seg == "admin" {
			adminIdx = i
			break
		}
	}

	if adminIdx != -1 && adminIdx+1 < len(segments) {
		return segments[adminIdx+1]
	}

	if len(segments) >= 2 {
		return segments[len(segments)-2]
	}

	if len(segments) >= 1 {
		return segments[len(segments)-1]
	}

	return ""
}
