package middleware

import (
	"net/http"

	"steel-agent-backend/internal/repository"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

func RequireRole(adminRepo *repository.AdminRepository, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get("user_id")
		if !exists {
			response.Error(c, errors.CodeAuthFailed, "未提供认证信息")
			c.Abort()
			return
		}

		adminID, ok := userIDVal.(uint)
		if !ok {
			response.Error(c, errors.CodeAuthFailed, "认证信息无效")
			c.Abort()
			return
		}

		admin, err := adminRepo.FindByID(c.Request.Context(), adminID)
		if err != nil {
			response.Error(c, errors.CodeAuthFailed, "管理员账号不存在")
			c.Abort()
			return
		}

		if admin.Role == "viewer" {
			if c.Request.Method == http.MethodGet {
				c.Next()
				return
			}
			response.Error(c, errors.CodeForbidden, "只读观察员不可执行写操作")
			c.Abort()
			return
		}

		for _, role := range allowedRoles {
			if admin.Role == role {
				c.Next()
				return
			}
		}

		response.Error(c, errors.CodeForbidden, "无权限访问")
		c.Abort()
	}
}
