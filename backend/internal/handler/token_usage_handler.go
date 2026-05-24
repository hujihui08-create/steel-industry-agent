package handler

import (
	"context"

	"steel-agent-backend/internal/model"
	"steel-agent-backend/internal/service"
	"steel-agent-backend/pkg/errors"
	"steel-agent-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

type tokenUsageService interface {
	Create(ctx context.Context, usage *model.TokenUsage) error
	GetDailyUsage(ctx context.Context, userID uint) (int64, error)
}

type TokenUsageHandler struct {
	tokenUsageService tokenUsageService
}

func NewTokenUsageHandler(tokenUsageService *service.TokenUsageService) *TokenUsageHandler {
	return &TokenUsageHandler{tokenUsageService: tokenUsageService}
}

func (h *TokenUsageHandler) GetDailyUsage(c *gin.Context) {
	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint)

	total, err := h.tokenUsageService.GetDailyUsage(c.Request.Context(), userID)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}

	response.Success(c, map[string]interface{}{
		"daily_tokens": total,
	})
}
