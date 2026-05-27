package handler

import (
	"context"
	"strconv"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// loginLogService defines the interface for login log business operations.
type loginLogService interface {
	List(ctx context.Context, userType string, page, pageSize int) ([]model.LoginLog, int64, error)
	Stats(ctx context.Context) (todayTotal, todaySuccess, todayFailure int64, err error)
}

// LoginLogHandler handles login log HTTP requests.
type LoginLogHandler struct {
	loginLogService loginLogService
}

// NewLoginLogHandler creates a new LoginLogHandler with the given login log service.
func NewLoginLogHandler(loginLogService *service.LoginLogService) *LoginLogHandler {
	return &LoginLogHandler{loginLogService: loginLogService}
}

// List returns a paginated list of login logs.
func (h *LoginLogHandler) List(c *gin.Context) {
	userType := c.Query("user_type")
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "10")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}

	logs, total, err := h.loginLogService.List(c.Request.Context(), userType, page, pageSize)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]interface{}{
		"list":      logs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Stats returns today's login statistics.
func (h *LoginLogHandler) Stats(c *gin.Context) {
	todayTotal, todaySuccess, todayFailure, err := h.loginLogService.Stats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]interface{}{
		"today_total":   todayTotal,
		"today_success": todaySuccess,
		"today_failure": todayFailure,
	})
}
