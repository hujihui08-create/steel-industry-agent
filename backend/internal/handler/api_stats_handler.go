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

// apiStatsService defines the interface for API call statistics queries.
type apiStatsService interface {
	GetOverview(ctx context.Context) (*service.OverviewData, error)
	GetEndpointStats(ctx context.Context) ([]model.EndpointStat, error)
	GetModelStats(ctx context.Context) ([]model.ModelStat, error)
	GetUserStats(ctx context.Context) ([]model.UserStat, error)
	GetTrend(ctx context.Context, days int) ([]model.TrendPoint, error)
}

// ApiStatsHandler handles HTTP requests for API call statistics.
type ApiStatsHandler struct {
	apiStatsService apiStatsService
}

// NewApiStatsHandler creates a new ApiStatsHandler.
func NewApiStatsHandler(apiStatsService *service.ApiCallLogService) *ApiStatsHandler {
	return &ApiStatsHandler{apiStatsService: apiStatsService}
}

// Overview returns today's API call overview statistics.
func (h *ApiStatsHandler) Overview(c *gin.Context) {
	data, err := h.apiStatsService.GetOverview(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, data)
}

// EndpointStats returns call statistics grouped by API endpoint.
func (h *ApiStatsHandler) EndpointStats(c *gin.Context) {
	stats, err := h.apiStatsService.GetEndpointStats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, stats)
}

// ModelStats returns token usage statistics grouped by model.
func (h *ApiStatsHandler) ModelStats(c *gin.Context) {
	stats, err := h.apiStatsService.GetModelStats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, stats)
}

// UserStats returns API usage statistics grouped by user.
func (h *ApiStatsHandler) UserStats(c *gin.Context) {
	stats, err := h.apiStatsService.GetUserStats(c.Request.Context())
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, stats)
}

// Trend returns daily API call trends.
func (h *ApiStatsHandler) Trend(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "7")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 7
	}

	points, err := h.apiStatsService.GetTrend(c.Request.Context(), days)
	if err != nil {
		response.Error(c, errors.CodeInternalError, err.Error())
		return
	}
	response.Success(c, points)
}
